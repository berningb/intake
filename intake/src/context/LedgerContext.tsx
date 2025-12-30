import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from './AuthContext';
import { DayLedger, FoodEntry, ActivityEntry, NutritionInfo, FoodDecision, DecisionLevel, Routine } from '../types';
import { format } from 'date-fns';
import { generateMockLedgers, generateMockRoutines } from '../utils/mockData';

interface LedgerContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  currentLedger: DayLedger | null;
  loading: boolean;
  addFoodEntry: (food: Omit<FoodEntry, 'id' | 'userId' | 'date' | 'timestamp'>) => Promise<void>;
  removeFoodEntry: (foodId: string) => Promise<void>;
  updateFoodEntry: (foodId: string, updates: Partial<FoodEntry>) => Promise<void>;
  addActivityEntry: (activity: Omit<ActivityEntry, 'id' | 'userId' | 'date' | 'timestamp'>) => Promise<void>;
  removeActivityEntry: (activityId: string) => Promise<void>;
  uploadFoodImage: (file: File) => Promise<string>;
  evaluateFood: (nutrition: NutritionInfo) => FoodDecision;
  getTotals: () => NutritionInfo;
  addWin: (win: string) => Promise<void>;
  removeWin: (win: string) => Promise<void>;
  getLedgersForDateRange: (startDate: string, endDate: string) => Promise<Map<string, DayLedger>>;
  routines: Routine[];
  addRoutine: (routine: Omit<Routine, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  refreshRoutines: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export function useLedger() {
  const context = useContext(LedgerContext);
  if (context === undefined) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}

interface LedgerProviderProps {
  children: ReactNode;
}

export function LedgerProvider({ children }: LedgerProviderProps) {
  const { currentUser, userData, isGuest } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentLedger, setCurrentLedger] = useState<DayLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const mockLedgersRef = useRef<DayLedger[]>([]);
  const mockRoutinesRef = useRef<Routine[]>([]);

  const dateString = format(currentDate, 'yyyy-MM-dd');

  // Generate mock data once for guest users
  useEffect(() => {
    if (isGuest && currentUser && userData) {
      if (mockLedgersRef.current.length === 0) {
        mockLedgersRef.current = generateMockLedgers(
          currentUser.uid, 
          60, 
          { 
            calories: userData.dailyMetrics?.calories || 2000, 
            protein: userData.dailyMetrics?.protein || 150 
          }
        );
      }
      if (mockRoutinesRef.current.length === 0) {
        mockRoutinesRef.current = generateMockRoutines(currentUser.uid);
        setRoutines(mockRoutinesRef.current);
      }
    }
  }, [isGuest, currentUser, userData]);

  const fetchLedger = useCallback(async () => {
    if (!currentUser) {
      setCurrentLedger(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Use mock data for guest users
    if (isGuest) {
      const mockLedger = mockLedgersRef.current.find(l => l.date === dateString);
      if (mockLedger) {
        setCurrentLedger(mockLedger);
      } else {
        // Create empty ledger for dates not in mock data
        const newLedger: DayLedger = {
          id: `${currentUser.uid}_${dateString}`,
          userId: currentUser.uid,
          date: dateString,
          foods: [],
          activities: [],
          wins: []
        };
        mockLedgersRef.current.push(newLedger);
        setCurrentLedger(newLedger);
      }
      setLoading(false);
      return;
    }

    // Firebase for authenticated users
    const ledgerRef = doc(db, 'ledgers', `${currentUser.uid}_${dateString}`);
    const ledgerDoc = await getDoc(ledgerRef);

    if (ledgerDoc.exists()) {
      const data = ledgerDoc.data();
      setCurrentLedger({
        ...data,
        id: ledgerDoc.id,
        foods: data.foods || [],
        activities: data.activities || [],
        wins: data.wins || []
      } as DayLedger);
    } else {
      // Create empty ledger for the day
      const newLedger: DayLedger = {
        id: `${currentUser.uid}_${dateString}`,
        userId: currentUser.uid,
        date: dateString,
        foods: [],
        activities: [],
        wins: []
      };
      await setDoc(ledgerRef, newLedger);
      setCurrentLedger(newLedger);
    }
    setLoading(false);
  }, [currentUser, dateString, isGuest]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const refreshRoutines = useCallback(async () => {
    if (!currentUser) {
      setRoutines([]);
      return;
    }

    if (isGuest) {
      setRoutines(mockRoutinesRef.current);
      return;
    }

    try {
      const q = query(
        collection(db, 'routines'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedRoutines: Routine[] = [];
      snapshot.forEach((doc) => {
        fetchedRoutines.push({ ...doc.data(), id: doc.id } as Routine);
      });
      setRoutines(fetchedRoutines);
    } catch (error) {
      console.error('Error fetching routines:', error);
    }
  }, [currentUser, isGuest]);

  useEffect(() => {
    refreshRoutines();
  }, [refreshRoutines]);

  async function addRoutine(routine: Omit<Routine, 'id' | 'userId' | 'createdAt'>) {
    if (!currentUser) return;

    const newRoutine: Routine = {
      ...routine,
      id: isGuest ? `mock_routine_${Date.now()}` : '', // Will be set by Firebase for non-guests
      userId: currentUser.uid,
      createdAt: new Date()
    };

    if (isGuest) {
      mockRoutinesRef.current = [...mockRoutinesRef.current, newRoutine];
      setRoutines(mockRoutinesRef.current);
      return;
    }

    const docRef = await addDoc(collection(db, 'routines'), newRoutine);
    setRoutines([...routines, { ...newRoutine, id: docRef.id }]);
  }

  async function deleteRoutine(routineId: string) {
    if (!currentUser) return;

    if (isGuest) {
      mockRoutinesRef.current = mockRoutinesRef.current.filter(r => r.id !== routineId);
      setRoutines(mockRoutinesRef.current);
      return;
    }

    await deleteDoc(doc(db, 'routines', routineId));
    setRoutines(routines.filter(r => r.id !== routineId));
  }

  async function addFoodEntry(food: Omit<FoodEntry, 'id' | 'userId' | 'date' | 'timestamp'>) {
    if (!currentUser || !currentLedger) return;

    const newFood: FoodEntry = {
      ...food,
      id: `food_${Date.now()}`,
      userId: currentUser.uid,
      date: dateString,
      timestamp: new Date()
    };

    // For guest users, just update local state
    if (isGuest) {
      const updatedLedger = {
        ...currentLedger,
        foods: [...currentLedger.foods, newFood]
      };
      setCurrentLedger(updatedLedger);
      // Update mock ledgers ref
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      foods: arrayUnion(newFood)
    });

    setCurrentLedger({
      ...currentLedger,
      foods: [...currentLedger.foods, newFood]
    });
  }

  async function removeFoodEntry(foodId: string) {
    if (!currentUser || !currentLedger) return;

    const foodToRemove = currentLedger.foods.find(f => f.id === foodId);
    if (!foodToRemove) return;

    // For guest users, just update local state
    if (isGuest) {
      const updatedLedger = {
        ...currentLedger,
        foods: currentLedger.foods.filter(f => f.id !== foodId)
      };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      foods: arrayRemove(foodToRemove)
    });

    setCurrentLedger({
      ...currentLedger,
      foods: currentLedger.foods.filter(f => f.id !== foodId)
    });
  }

  async function updateFoodEntry(foodId: string, updates: Partial<FoodEntry>) {
    if (!currentUser || !currentLedger) return;

    const updatedFoods = currentLedger.foods.map(f =>
      f.id === foodId ? { ...f, ...updates } : f
    );

    // For guest users, just update local state
    if (isGuest) {
      const updatedLedger = { ...currentLedger, foods: updatedFoods };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, { foods: updatedFoods });

    setCurrentLedger({
      ...currentLedger,
      foods: updatedFoods
    });
  }

  async function addActivityEntry(activity: Omit<ActivityEntry, 'id' | 'userId' | 'date' | 'timestamp'>) {
    if (!currentUser || !currentLedger) return;

    const newActivity: ActivityEntry = {
      ...activity,
      id: `activity_${Date.now()}`,
      userId: currentUser.uid,
      date: dateString,
      timestamp: new Date()
    };

    if (isGuest) {
      const updatedLedger = {
        ...currentLedger,
        activities: [...currentLedger.activities, newActivity]
      };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      activities: arrayUnion(newActivity)
    });

    setCurrentLedger({
      ...currentLedger,
      activities: [...currentLedger.activities, newActivity]
    });
  }

  async function removeActivityEntry(activityId: string) {
    if (!currentUser || !currentLedger) return;

    const activityToRemove = currentLedger.activities.find(a => a.id === activityId);
    if (!activityToRemove) return;

    if (isGuest) {
      const updatedLedger = {
        ...currentLedger,
        activities: currentLedger.activities.filter(a => a.id !== activityId)
      };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      activities: arrayRemove(activityToRemove)
    });

    setCurrentLedger({
      ...currentLedger,
      activities: currentLedger.activities.filter(a => a.id !== activityId)
    });
  }

  async function uploadFoodImage(file: File): Promise<string> {
    if (!currentUser) throw new Error('Not authenticated');

    // For guest users, create a local blob URL
    if (isGuest) {
      return URL.createObjectURL(file);
    }

    const fileName = `food_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `food-images/${currentUser.uid}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  function getTotals(): NutritionInfo {
    if (!currentLedger) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    return currentLedger.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.finalNutrition?.calories || 0),
        protein: acc.protein + (food.finalNutrition?.protein || 0),
        carbs: acc.carbs + (food.finalNutrition?.carbs || 0),
        fat: acc.fat + (food.finalNutrition?.fat || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  function evaluateFood(nutrition: NutritionInfo): FoodDecision {
    const totals = getTotals();
    const metrics = userData?.dailyMetrics || { calories: 2000 };

    const caloriesTarget = metrics.calories || 2000;
    const caloriesRemaining = caloriesTarget - totals.calories;
    const caloriesAfterMeal = caloriesRemaining - nutrition.calories;

    let level: DecisionLevel = 'good';
    let message = '';

    const percentOfRemaining = (nutrition.calories / caloriesRemaining) * 100;
    const percentOfDaily = (nutrition.calories / caloriesTarget) * 100;

    if (caloriesAfterMeal < 0) {
      level = 'exceeds';
      message = `This would put you ${Math.abs(caloriesAfterMeal).toFixed(0)} calories over your daily target.`;
    } else if (percentOfRemaining > 75 || caloriesAfterMeal < 200) {
      level = 'caution';
      message = `This fits, but leaves only ${caloriesAfterMeal.toFixed(0)} calories for the rest of your day.`;
    } else {
      level = 'good';
      message = `This fits well within your daily budget. You'll have ${caloriesAfterMeal.toFixed(0)} calories remaining.`;
    }

    return {
      level,
      message,
      breakdown: {
        calories: { remaining: caloriesRemaining, afterMeal: caloriesAfterMeal },
        ...(metrics.protein && {
          protein: {
            remaining: metrics.protein - totals.protein,
            afterMeal: metrics.protein - totals.protein - nutrition.protein
          }
        }),
        ...(metrics.carbs && {
          carbs: {
            remaining: metrics.carbs - totals.carbs,
            afterMeal: metrics.carbs - totals.carbs - nutrition.carbs
          }
        }),
        ...(metrics.fat && {
          fat: {
            remaining: metrics.fat - totals.fat,
            afterMeal: metrics.fat - totals.fat - nutrition.fat
          }
        })
      }
    };
  }

  async function addWin(win: string) {
    if (!currentUser || !currentLedger) return;

    if (isGuest) {
      const updatedLedger = {
        ...currentLedger,
        wins: [...(currentLedger.wins || []), win]
      };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      wins: arrayUnion(win)
    });

    setCurrentLedger({
      ...currentLedger,
      wins: [...(currentLedger.wins || []), win]
    });
  }

  async function removeWin(win: string) {
    if (!currentUser || !currentLedger) return;

    if (isGuest) {
      const updatedLedger = {
        ...currentLedger,
        wins: (currentLedger.wins || []).filter(w => w !== win)
      };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      wins: arrayRemove(win)
    });

    setCurrentLedger({
      ...currentLedger,
      wins: (currentLedger.wins || []).filter(w => w !== win)
    });
  }

  async function getLedgersForDateRange(startDate: string, endDate: string): Promise<Map<string, DayLedger>> {
    const result = new Map<string, DayLedger>();
    
    if (!currentUser) return result;

    // For guest users, filter mock ledgers
    if (isGuest) {
      mockLedgersRef.current.forEach(ledger => {
        if (ledger.date >= startDate && ledger.date <= endDate) {
          result.set(ledger.date, ledger);
        }
      });
      return result;
    }

    // For authenticated users, query Firebase
    try {
      const q = query(
        collection(db, 'ledgers'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data() as DayLedger;
        result.set(data.date, data);
      });
    } catch (error) {
      console.error('Error fetching ledgers:', error);
    }

    return result;
  }

  const value = {
    currentDate,
    setCurrentDate,
    currentLedger,
    loading,
    addFoodEntry,
    removeFoodEntry,
    updateFoodEntry,
    addActivityEntry,
    removeActivityEntry,
    uploadFoodImage,
    evaluateFood,
    getTotals,
    addWin,
    removeWin,
    getLedgersForDateRange,
    routines,
    addRoutine,
    deleteRoutine,
    refreshRoutines
  };

  return (
    <LedgerContext.Provider value={value}>
      {children}
    </LedgerContext.Provider>
  );
}

