// app/utils/deleteAccount.js
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { GoogleAuthProvider, reauthenticateWithCredential, deleteUser, signOut } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth, db } from '../firebase';

// Firestore batch writes cap at 500 ops; stay under that per commit.
const BATCH_SIZE = 450;

// Every subcollection the client actually writes to under users/{uid}. The
// client SDK has no listCollections() (that's Admin-only), so this can't be
// derived at runtime — it's kept in sync by hand. When adding a new
// subcollection, check app/utils/storage.js for every `collection(db,
// 'users', uid, ...)` call and add it here.
//
// 'stats' is deliberately excluded: per storage.js (getStats has no
// matching setter) and firestore.rules (`stats/{statId}` is `allow write:
// if false`), it has never been written by the client — only a future
// server-side writer could create it, and the client couldn't delete it
// even if it existed.
const USER_SUBCOLLECTIONS = ['profile', 'bets'];

async function reauthenticateWithGoogle(user) {
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();

  if (result.type === 'cancelled') {
    throw new Error('REAUTH_CANCELLED');
  }

  const idToken = result.data?.idToken;
  if (!idToken) {
    throw new Error('NO_ID_TOKEN');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  await reauthenticateWithCredential(user, credential);
}

async function deleteSubcollection(uid, subcollectionName) {
  const snapshot = await getDocs(collection(db, 'users', uid, subcollectionName));
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

// Deletes every doc in every subcollection under users/{uid}. Firestore
// doesn't cascade-delete subcollections, and there's no parent users/{uid}
// document to delete alongside them — nothing ever writes one (profile data
// lives at users/{uid}/profile/data, not on the users/{uid} doc itself), and
// firestore.rules grants no access to that bare path anyway.
// Safe to re-run: querying an already-emptied subcollection just returns
// zero docs, so a retry after a partial failure does no harm.
async function deleteUserData(uid) {
  for (const subcollectionName of USER_SUBCOLLECTIONS) {
    await deleteSubcollection(uid, subcollectionName);
  }
}

// Deletes the signed-in user's account: Firestore data, then the Auth user.
// Fully client-side — the original design deleted through a Cloud Function
// (Admin SDK, bypassing rules) specifically to keep the outcome-lock delete
// rule intact, but that path was never deployed (2nd-gen Functions require
// the Blaze plan). Account deletion now goes through firestore.rules
// directly, which is why the `bets` delete rule was relaxed to
// `isOwner(userId)` — see docs/sessions/DECISIONS.md for the trade-off and
// the re-tightening trigger. functions/index.js is left in place, parked.
//
// Re-authenticates with Google first since this is a sensitive operation:
// both `deleteUser()` and a stale session throw auth/requires-recent-login
// otherwise.
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in.');
  }

  try {
    await reauthenticateWithGoogle(user);
  } catch (err) {
    if (err.message === 'REAUTH_CANCELLED' || err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Account deletion cancelled.');
    }
    console.error('deleteAccount: re-authentication failed', err);
    throw new Error('Could not verify your identity. Please sign in again and retry.');
  }

  // Firestore data goes first. If this fails partway, the Auth account is
  // still alive and the user can just retry — deletes are idempotent, so
  // re-running this picks up wherever it left off rather than needing any
  // special partial-failure recovery.
  try {
    await deleteUserData(user.uid);
  } catch (err) {
    console.error('deleteAccount: Firestore wipe failed', err);
    throw new Error('Could not delete your account data. Please try again.');
  }

  try {
    await deleteUser(user);
  } catch (err) {
    console.error('deleteAccount: Auth user deletion failed (Firestore data already wiped)', err);
    throw new Error('Your data was deleted, but removing your sign-in failed. Please contact support.');
  }

  // Only reached after deleteUser() succeeds — a failed deletion leaves the
  // native cache intact so the user can retry without re-picking their
  // account. Unlike regular Sign Out (which deliberately keeps the native
  // cache for the "Continue as X" fast path — see the AuthScreen decision
  // above), a deletion must clear it: otherwise AuthScreen would still
  // offer "Continue as {deleted user}", silently re-registering a new
  // account under a stale cached identity.
  await GoogleSignin.signOut();
  await signOut(auth);
}
