// app/utils/storage.js
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function getUserProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId, 'meta', 'profile'));
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(userId, { username }) {
  await setDoc(doc(db, 'users', userId, 'meta', 'profile'), {
    username,
    joinedAt: serverTimestamp(),
    quitModeOn: false,
    weeklyBudget: 0,
  });
}
