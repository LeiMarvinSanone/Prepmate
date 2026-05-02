// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCGlwONhzzYxnQnNrForxZsOdepXHq9DPQ",
  authDomain: "prepmate-866d9.firebaseapp.com",
  projectId: "prepmate-866d9",
  storageBucket: "prepmate-866d9.firebasestorage.app",
  messagingSenderId: "590076820610",
  appId: "1:590076820610:web:33f812cfc26fa40bf3089b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const GOOGLE_WEB_CLIENT_ID = '590076820610-kju8ei59pdurt1qlgab4slcpof1m4dhn.apps.googleusercontent.com';