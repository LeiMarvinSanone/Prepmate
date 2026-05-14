// services/checklistService.js
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query,
  where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';

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
  try {
    // Scope queries to the signed-in user so Firestore security rules
    // that require user ownership are satisfied and queries don't fail
    // with "Missing or insufficient permissions".
    const uid = auth?.currentUser?.uid || null;
    const baseFilters = [where('eventId', '==', eventId)];
    if (uid) baseFilters.push(where('userId', '==', uid));

    const q = query(
      collection(db, ITEMS_COLLECTION),
      ...baseFilters,
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    // Some Firestore setups can reject composite queries or ordering if
    // indexes are missing or documents lack the ordered field. Fall back
    // to a simpler query without ordering so the UI still shows items.
    console.warn('Ordered checklist query failed, retrying without order:', err);
    const uid = auth?.currentUser?.uid || null;
    const baseFilters = [where('eventId', '==', eventId)];
    if (uid) baseFilters.push(where('userId', '==', uid));

    const q2 = query(
      collection(db, ITEMS_COLLECTION),
      ...baseFilters
    );
    const snapshot2 = await getDocs(q2);
    return snapshot2.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
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