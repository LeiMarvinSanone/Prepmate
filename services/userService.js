// services/userService.js
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Create or update user document in Firestore
export const createUserDocument = async (user) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || '',
      email: user.email || '',
      createdAt: serverTimestamp(),
    });
  }
};

// Get user document
export const getUserDocument = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
};