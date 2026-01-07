import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  linkWithPopup,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, IS_MOCK_MODE } from '../config/firebase';

const MOCK_USER_DATA = {
  id: 'mock-user-123',
  email: 'mock@example.com',
  displayName: 'Mock Pilot',
  xp: 8500,
  preferences: {
    dietaryRestrictions: [],
    activityLevel: 'moderate'
  },
  dailyMetrics: {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 80
  },
  onboardingComplete: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const AuthContext = createContext(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [lastXpGain, setLastXpGain] = useState(null);

  async function fetchUserData(uid) {
    // If db is not initialized (mock mode or init failed), skip fetch
    if (!db || Object.keys(db).length === 0) return false;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          ...data,
          id: uid,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      }
      return userDoc.exists();
    } catch (error) {
      console.error("Error fetching user data:", error);
      return false;
    }
  }

  async function createUserProfile(user, isGuestUser = false) {
    const defaultPreferences = {
      dietaryRestrictions: [],
      activityLevel: 'moderate'
    };

    const defaultMetrics = {
      calories: 2000
    };

    const newUser = {
      email: user.email || '',
      displayName: isGuestUser ? 'Guest' : (user.displayName || ''),
      xp: 0,
      preferences: defaultPreferences,
      dailyMetrics: defaultMetrics,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), newUser);
    setUserData({ ...newUser, id: user.uid });
  }

  async function signInWithGoogle() {
    // If we have a real auth object (connected to Firebase), try real sign-in
    if (auth && auth.app) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        setIsGuest(false);
        const userExists = await fetchUserData(result.user.uid);
        
        if (!userExists) {
          await createUserProfile(result.user, false);
        }
        return;
      } catch (error) {
        console.error("Real Google Sign-In failed:", error);
        throw error;
      }
    }
    
    // If we're here, it means Firebase isn't configured at all
    // In mock mode, we fallback to the mock pilot for previewing
    if (IS_MOCK_MODE) {
      setCurrentUser({ uid: 'mock-user-123', email: 'mock@example.com', displayName: 'Mock Pilot' });
      setUserData(MOCK_USER_DATA);
      setIsGuest(false);
      return;
    }

    throw new Error("Firebase is not configured. Please add your credentials to a .env file.");
  }

  async function continueAsGuest() {
    // Try real anonymous sign-in if connected to Firebase
    if (auth && auth.app) {
      try {
        const result = await signInAnonymously(auth);
        setIsGuest(true);
        const userExists = await fetchUserData(result.user.uid);
        
        if (!userExists) {
          await createUserProfile(result.user, true);
        }
        return;
      } catch (error) {
        console.error("Real Guest Sign-In failed:", error);
        if (!IS_MOCK_MODE) throw error;
      }
    }

    // Fallback to mock guest with a unique ID per session
    // This ensures that "refreshing" as a guest provides a new experience/bounties
    // Using a timestamp + random to guarantee uniqueness even with rapid refreshes
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const guestData = { 
      ...MOCK_USER_DATA, 
      id: guestId, 
      displayName: 'Guest Pilot',
      xp: 450
    };
    setCurrentUser({ uid: guestId, email: '', displayName: 'Guest Pilot' });
    setUserData(guestData);
    setIsGuest(true);
  }

  async function upgradeGuestAccount() {
    if (IS_MOCK_MODE) {
      setIsGuest(false);
      setUserData({ ...userData, displayName: 'Mock Pilot', email: 'mock@example.com' });
      return;
    }
    if (!currentUser || !currentUser.isAnonymous) return;
    
    try {
      const result = await linkWithPopup(currentUser, googleProvider);
      setIsGuest(false);
      
      // Update user profile with Google info
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        updatedAt: new Date()
      }, { merge: true });
      
      if (userData) {
        setUserData({
          ...userData,
          email: result.user.email || '',
          displayName: result.user.displayName || ''
        });
      }
    } catch (error) {
      // If account already exists, sign in with Google instead
      if (error.code === 'auth/credential-already-in-use') {
        await signOut(auth);
        await signInWithGoogle();
      } else {
        throw error;
      }
    }
  }

  async function logout() {
    if (auth && typeof auth.signOut === 'function') {
      await auth.signOut();
    } else if (auth && auth.app) {
      await signOut(auth);
    }
    
    // Always clear local state
    setCurrentUser(null);
    setUserData(null);
    setIsGuest(false);
    localStorage.removeItem('intake_mock_user');
  }

  async function updateUserData(data) {
    if (!currentUser) return;
    
    const updatedData = {
      ...data,
      updatedAt: new Date()
    };

    if (!IS_MOCK_MODE) {
      await setDoc(doc(db, 'users', currentUser.uid), updatedData, { merge: true });
    }
    
    if (userData) {
      setUserData({ ...userData, ...updatedData });
    }
  }

  async function addXP(amount) {
    if (!currentUser || !userData) return;
    
    const currentXP = userData.xp || 0;
    const newXP = currentXP + amount;
    
    setLastXpGain({ amount, timestamp: Date.now() });
    setTimeout(() => setLastXpGain(null), 3000);
    
    await updateUserData({ xp: newXP });
    return newXP;
  }

  useEffect(() => {
    // Handle both real Firebase auth and mock auth
    const handleAuthChange = async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          setIsGuest(user.isAnonymous);
          await fetchUserData(user.uid);
        } else if (IS_MOCK_MODE) {
          const savedMockUser = localStorage.getItem('intake_mock_user');
          if (savedMockUser) {
            const parsed = JSON.parse(savedMockUser);
            
            // CRITICAL: If the saved user is a guest, ignore it and force a clean state
            if (parsed.isGuest) {
              localStorage.removeItem('intake_mock_user');
              setCurrentUser(null);
              setUserData(null);
              setIsGuest(false);
            } else {
              setCurrentUser(parsed.currentUser);
              setUserData({
                ...parsed.userData,
                createdAt: new Date(parsed.userData.createdAt),
                updatedAt: new Date(parsed.userData.updatedAt)
              });
              setIsGuest(false);
            }
          } else {
            setCurrentUser(null);
            setUserData(null);
            setIsGuest(false);
          }
        } else {
          setCurrentUser(null);
          setUserData(null);
          setIsGuest(false);
        }
      } catch (error) {
        console.error("Auth state change handler failed:", error);
        // Ensure we don't get stuck in loading state even on error
        setCurrentUser(null);
        setUserData(null);
        setIsGuest(false);
      } finally {
        setLoading(false);
      }
    };

    // If it's a real Firebase auth object, use the standard listener
    // If it's our mock object, it will have its own onAuthStateChanged method
    let unsubscribe;
    if (auth && typeof auth.onAuthStateChanged === 'function' && !auth.app) {
      // This is our mock auth object from firebase.js
      unsubscribe = auth.onAuthStateChanged(handleAuthChange);
    } else {
      // This is a real Firebase auth object
      unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    }

    return unsubscribe;
  }, []);

  // Save mock state to localStorage (only for non-guest users in mock mode)
  useEffect(() => {
    if (IS_MOCK_MODE && !loading) {
      if (currentUser && !isGuest) {
        localStorage.setItem('intake_mock_user', JSON.stringify({
          currentUser: { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName },
          userData,
          isGuest
        }));
      } else if (!currentUser) {
        localStorage.removeItem('intake_mock_user');
      }
      // Guests intentionally do not save to localStorage so they reset on refresh
    }
  }, [currentUser, userData, isGuest, loading]);

  useEffect(() => {
    if (userData?.preferences?.theme) {
      document.documentElement.setAttribute('data-theme', userData.preferences.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [userData?.preferences?.theme]);

  const value = {
    currentUser,
    userData,
    loading,
    isGuest,
    signInWithGoogle,
    continueAsGuest,
    upgradeGuestAccount,
    logout,
    updateUserData,
    addXP,
    lastXpGain
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
