// functions/index.js
//
// PARKED 2026-07-15: deleteAccount below was never deployed — 2nd-gen
// Cloud Functions require the Blaze plan, and the decision this session was
// to defer Blaze until a cross-user feature (leaderboard) actually needs
// server-side enforcement. Account deletion was migrated to fully
// client-side (app/utils/deleteAccount.js), which required relaxing the
// `bets` delete rule in firestore.rules. See docs/sessions/DECISIONS.md for
// the trade-off and the re-tightening trigger.
// Revive this function (and re-tighten the delete rule) when the
// leaderboard ships. Nothing below has bit-rotted — it's unwired, not
// broken; deploying it again is the fix when that day comes.
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Firestore batch writes cap at 500 ops; stay under that per commit.
const BATCH_SIZE = 400;

// Firestore doesn't cascade-delete subcollections, so a collection ref is
// walked doc-by-doc: each doc's own subcollections are deleted first (depth
// first), then the docs in this collection are deleted in batches.
async function deleteCollectionRecursive(collectionRef) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;

  for (const docSnap of snapshot.docs) {
    const subcollections = await docSnap.ref.listCollections();
    for (const subcollectionRef of subcollections) {
      await deleteCollectionRecursive(subcollectionRef);
    }
  }

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + BATCH_SIZE).forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

// Deletes users/{uid} and every subcollection under it (bets, stats, and
// anything added later) — listCollections() rather than a hardcoded list, so
// this doesn't silently miss a subcollection added in a future session.
async function deleteUserData(uid) {
  const userDocRef = db.collection('users').doc(uid);
  const subcollections = await userDocRef.listCollections();

  for (const subcollectionRef of subcollections) {
    await deleteCollectionRecursive(subcollectionRef);
  }

  await userDocRef.delete();
}

exports.deleteAccount = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be signed in to delete your account.'
      );
    }

    const uid = context.auth.uid;

    // Firestore data goes first. If this fails partway, the Auth account is
    // still alive and the user can retry deletion — better than an
    // Auth-deleted account with orphaned Firestore data nobody can reach.
    try {
      await deleteUserData(uid);
    } catch (err) {
      console.error(`deleteAccount: Firestore wipe failed for uid=${uid}`, err);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to delete your account data. Please try again.'
      );
    }

    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      console.error(
        `deleteAccount: Auth user deletion failed for uid=${uid} (Firestore data already wiped)`,
        err
      );
      throw new functions.https.HttpsError(
        'internal',
        'Your data was deleted, but removing your sign-in failed. Please contact support.'
      );
    }

    return { success: true };
  });
