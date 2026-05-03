// services/historyService.js
import {
  collection, addDoc, getDocs, doc,
  updateDoc, query, where, orderBy,
  limit, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const HISTORY_COLLECTION = 'itemHistory';

// Track item usage (for smart suggestions)
export const trackItemUsage = async (userId, itemName, category) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId', '==', userId),
    where('itemName', '==', itemName),
    where('category', '==', category)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Item exists — increment usage count
    const docRef = doc(db, HISTORY_COLLECTION, snapshot.docs[0].id);
    await updateDoc(docRef, {
      usageCount: snapshot.docs[0].data().usageCount + 1,
      lastUsed: serverTimestamp(),
    });
  } else {
    // New item — create history record
    await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      itemName,
      category,
      usageCount: 1,
      lastUsed: serverTimestamp(),
    });
  }
};

// Get frequently used items for a category (Smart Suggestions)
export const getFrequentItems = async (userId, category, limitCount = 6) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId', '==', userId),
    where('category', '==', category),
    orderBy('usageCount', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get all frequently used items (for Smart Suggestions screen)
export const getAllFrequentItems = async (userId, limitCount = 10) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId', '==', userId),
    orderBy('usageCount', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};