import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Only use mock mode if the API key is missing or the placeholder
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const hasRealConfig = apiKey && apiKey !== 'your_api_key_here';

export const IS_MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || !hasRealConfig;

let app = null;
let auth = null;
let db = null;
let storage = null;

if (hasRealConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// Minimal mocks only if Firebase failed to initialize
if (!auth) {
  auth = { 
    onAuthStateChanged: (cb) => { 
      const saved = localStorage.getItem('intake_mock_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        cb(parsed.currentUser);
      } else {
        cb(null);
      }
      return () => {}; 
    },
    signOut: () => {
      localStorage.removeItem('intake_mock_user');
      return Promise.resolve();
    }
  };
}

if (!db) db = {};
if (!storage) storage = {};

export { auth, db, storage };
export default app;
