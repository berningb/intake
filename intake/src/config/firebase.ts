import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDKsLxIxhaYkq7FyO7QV_Yi0r1orivuIOI",
  authDomain: "intake-1d2d2.firebaseapp.com",
  projectId: "intake-1d2d2",
  storageBucket: "intake-1d2d2.firebasestorage.app",
  messagingSenderId: "1047446841038",
  appId: "1:1047446841038:web:8f8fa30d84dfd9d10c929f",
  measurementId: "G-SQNCJN4R9F"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
