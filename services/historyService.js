// services/historyService.js
import {
  collection, addDoc, getDocs, doc,
  updateDoc, query, where, orderBy,
  limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const HISTORY_COLLECTION = 'itemHistory';

// ─── Track item usage (called every time a user adds an item) ─────────────────

export const trackItemUsage = async (userId, itemName, category) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId',   '==', userId),
    where('itemName', '==', itemName),
    where('category', '==', category)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Already tracked — increment
    const docRef = doc(db, HISTORY_COLLECTION, snapshot.docs[0].id);
    await updateDoc(docRef, {
      usageCount: snapshot.docs[0].data().usageCount + 1,
      lastUsed: serverTimestamp(),
    });
  } else {
    // First time — create record
    await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      itemName,
      category,
      usageCount: 1,
      lastUsed: serverTimestamp(),
    });
  }
};

// ─── Top items for a single category (AddItemsScreen suggestions) ─────────────

export const getFrequentItems = async (userId, category, limitCount = 6) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId',   '==', userId),
    where('category', '==', category),
    orderBy('usageCount', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Top items across ALL categories (SmartSuggestions — frequently brought) ──

export const getAllFrequentItems = async (userId, limitCount = 10) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId', '==', userId),
    orderBy('usageCount', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Full history — every item ever tracked, sorted by usage (no cap) ─────────
// Used by SmartSuggestionsScreen "Full History" list.

export const getAllItemHistory = async (userId) => {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where('userId', '==', userId),
    orderBy('usageCount', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Top items per category — for the "You might need for X" sections ─────────
// Returns an object keyed by categoryId, each value an array of item names.

export const getFrequentItemsByCategory = async (userId, categories, limitPerCat = 5) => {
  const result = {};
  await Promise.all(
    categories.map(async (catId) => {
      const items = await getFrequentItems(userId, catId, limitPerCat);
      if (items.length > 0) {
        result[catId] = items.map((i) => i.itemName);
      }
    })
  );
  return result;
};