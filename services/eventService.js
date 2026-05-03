// services/eventService.js
import {
  collection, addDoc, getDocs, getDoc,
  doc, updateDoc, deleteDoc, query,
  where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const EVENTS_COLLECTION = 'events';

// Create a new event
export const createEvent = async (userId, eventData) => {
  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    userId,
    ...eventData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// Get all events for a user
export const getUserEvents = async (userId) => {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get events by category
export const getEventsByCategory = async (userId, category) => {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where('userId', '==', userId),
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get single event
export const getEvent = async (eventId) => {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// Update event
export const updateEvent = async (eventId, eventData) => {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(docRef, {
    ...eventData,
    updatedAt: serverTimestamp(),
  });
};

// Delete event
export const deleteEvent = async (eventId) => {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await deleteDoc(docRef);
};

// Search events by name
export const searchEvents = async (userId, searchTerm) => {
  const events = await getUserEvents(userId);
  return events.filter((event) =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};