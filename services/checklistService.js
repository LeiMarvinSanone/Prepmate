// services/checklistService.js
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query,
  where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

const ITEMS_COLLECTION = 'checklistItems';

// Add item to checklist
export const addChecklistItem = async (userId, eventId, itemName) => {
  const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
    userId,
    eventId,
    name: itemName,
    isChecked: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Get all items for an event
export const getChecklistItems = async (eventId) => {
  const q = query(
    collection(db, ITEMS_COLLECTION),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Toggle item checked status
export const toggleChecklistItem = async (itemId, currentStatus) => {
  const docRef = doc(db, ITEMS_COLLECTION, itemId);
  await updateDoc(docRef, {
    isChecked: !currentStatus,
  });
};

// Update item name
export const updateChecklistItem = async (itemId, newName) => {
  const docRef = doc(db, ITEMS_COLLECTION, itemId);
  await updateDoc(docRef, { name: newName });
};

// Delete item
export const deleteChecklistItem = async (itemId) => {
  const docRef = doc(db, ITEMS_COLLECTION, itemId);
  await deleteDoc(docRef);
};

// Delete all items for an event (used when deleting event)
export const deleteAllEventItems = async (eventId) => {
  const items = await getChecklistItems(eventId);
  const batch = writeBatch(db);
  items.forEach((item) => {
    batch.delete(doc(db, ITEMS_COLLECTION, item.id));
  });
  await batch.commit();
};

// Get checklist progress
export const getChecklistProgress = (items) => {
  if (items.length === 0) return { checked: 0, total: 0, percentage: 0 };
  const checked = items.filter((item) => item.isChecked).length;
  const total = items.length;
  const percentage = Math.round((checked / total) * 100);
  return { checked, total, percentage };
};