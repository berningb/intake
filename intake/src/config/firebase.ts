import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDKsLxIxhaYkq7FyO7QV_Yi0r1orivuIOI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "intake-1d2d2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "intake-1d2d2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "intake-1d2d2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1047446841038",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1047446841038:web:8f8fa30d84dfd9d10c929f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SQNCJN4R9F"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
