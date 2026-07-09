// app/utils/storage.js
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

function deriveUsername(user) {
  const candidate =
    user.displayName || (user.email ? user.email.split('@')[0] : null) || user.phoneNumber;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'Player';
}

export async function getUserProfile(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'profile', 'data'));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('getUserProfile failed', err);
    throw err;
  }
}

export async function createUserProfile(user) {
  try {
    const profileData = {
      username: deriveUsername(user),
      joinedAt: serverTimestamp(),
      quitModeOn: false,
      weeklyBudget: 0,
    };
    await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), profileData);
  } catch (err) {
    console.error('createUserProfile failed', err);
    throw err;
  }
}

export async function getBets(userId) {
  try {
    const betsQuery = query(collection(db, 'users', userId, 'bets'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(betsQuery);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getBets failed', err);
    throw err;
  }
}

export async function addBet(userId, betData) {
  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'bets'), {
      ...betData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('addBet failed', err);
    throw err;
  }
}

export async function updateBet(userId, betId, updates) {
  try {
    await updateDoc(doc(db, 'users', userId, 'bets', betId), updates);
  } catch (err) {
    console.error('updateBet failed', err);
    throw err;
  }
}

export async function deleteBet(userId, betId) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'bets', betId));
  } catch (err) {
    console.error('deleteBet failed', err);
    throw err;
  }
}

export async function getStats(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'stats', 'data'));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('getStats failed', err);
    throw err;
  }
}
