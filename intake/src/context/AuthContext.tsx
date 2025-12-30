import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  linkWithPopup,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, DailyMetrics, UserPreferences } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  upgradeGuestAccount: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  async function fetchUserData(uid: string) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUserData({
        ...data,
        id: uid,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as User);
    }
    return userDoc.exists();
  }

  async function createUserProfile(user: FirebaseUser, isGuestUser: boolean = false) {
    const defaultPreferences: UserPreferences = {
      dietaryRestrictions: [],
      activityLevel: 'moderate'
    };

    const defaultMetrics: DailyMetrics = {
      calories: 2000
    };

    const newUser: Omit<User, 'id'> = {
      email: user.email || '',
      displayName: isGuestUser ? 'Guest' : (user.displayName || ''),
      preferences: defaultPreferences,
      dailyMetrics: defaultMetrics,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), newUser);
    setUserData({ ...newUser, id: user.uid });
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    setIsGuest(false);
    const userExists = await fetchUserData(result.user.uid);
    
    if (!userExists) {
      await createUserProfile(result.user, false);
    }
  }

  async function continueAsGuest() {
    const result = await signInAnonymously(auth);
    setIsGuest(true);
    const userExists = await fetchUserData(result.user.uid);
    
    if (!userExists) {
      await createUserProfile(result.user, true);
    }
  }

  async function upgradeGuestAccount() {
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
    } catch (error: any) {
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
    await signOut(auth);
    setUserData(null);
    setIsGuest(false);
  }

  async function updateUserData(data: Partial<User>) {
    if (!currentUser) return;
    
    const updatedData = {
      ...data,
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', currentUser.uid), updatedData, { merge: true });
    
    if (userData) {
      setUserData({ ...userData, ...updatedData });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsGuest(user.isAnonymous);
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
        setIsGuest(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    isGuest,
    signInWithGoogle,
    continueAsGuest,
    upgradeGuestAccount,
    logout,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
