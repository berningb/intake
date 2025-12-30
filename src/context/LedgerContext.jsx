import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { db, storage, IS_MOCK_MODE } from '../config/firebase';
import { useAuth } from './AuthContext';
import { format, subDays } from 'date-fns';
import { generateMockLedgers, generateMockRoutines } from '../utils/mockData';

const LedgerContext = createContext(undefined);

export function useLedger() {
  const context = useContext(LedgerContext);
  if (context === undefined) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}

export function LedgerProvider({ children }) {
  const { currentUser, userData, isGuest } = useAuth();
  // A user is only in mock mode if they are a guest OR if global mock mode is on AND they aren't a real logged-in user
  const isEffectivelyMock = isGuest || (IS_MOCK_MODE && (!currentUser || currentUser.email === 'mock@example.com'));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentLedger, setCurrentLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const mockLedgersRef = useRef([]);
  const mockRoutinesRef = useRef([]);

  const dateString = format(currentDate, 'yyyy-MM-dd');

  // Generate mock data once for guest or mock users
  useEffect(() => {
    if (isEffectivelyMock && currentUser && userData) {
      if (mockLedgersRef.current.length === 0) {
        // Only load from localStorage if we are in global mock mode and NOT a guest
        const shouldLoadFromStorage = IS_MOCK_MODE && !isGuest;
        
        if (shouldLoadFromStorage) {
          const saved = localStorage.getItem('intake_mock_ledgers');
          if (saved) {
            try {
              mockLedgersRef.current = JSON.parse(saved).map((l) => ({
                ...l,
                foods: (l.foods || []).map((f) => ({ ...f, timestamp: new Date(f.timestamp) })),
                activities: (l.activities || []).map((a) => ({ ...a, timestamp: new Date(a.timestamp) }))
              }));
            } catch (e) {
              console.error('Error parsing saved mock ledgers:', e);
            }
          }
        }
        
        // If nothing was loaded or we shouldn't load, generate fresh random data
        if (mockLedgersRef.current.length === 0) {
        mockLedgersRef.current = generateMockLedgers(
          currentUser.uid, 
          60, 
          { 
            calories: userData.dailyMetrics?.calories || 2000, 
            protein: userData.dailyMetrics?.protein || 150,
            waterTarget: userData.preferences?.waterTarget || 2500
          }
        );
        }
      }

      if (mockRoutinesRef.current.length === 0) {
        const shouldLoadFromStorage = IS_MOCK_MODE && !isGuest;
        
        if (shouldLoadFromStorage) {
          const saved = localStorage.getItem('intake_mock_routines');
          if (saved) {
            try {
              mockRoutinesRef.current = JSON.parse(saved).map((r) => ({
                ...r,
                createdAt: new Date(r.createdAt)
              }));
            } catch (e) {
              console.error('Error parsing saved mock routines:', e);
            }
          }
        }
        
        if (mockRoutinesRef.current.length === 0) {
          mockRoutinesRef.current = generateMockRoutines(currentUser.uid);
        }
        setRoutines(mockRoutinesRef.current);
      }
    }
  }, [isEffectivelyMock, currentUser, userData, isGuest]);

  // Persistent storage for mock data (only for non-guest mock users)
  useEffect(() => {
    if (IS_MOCK_MODE && !isGuest && currentUser && mockLedgersRef.current.length > 0) {
      localStorage.setItem('intake_mock_ledgers', JSON.stringify(mockLedgersRef.current));
      localStorage.setItem('intake_mock_routines', JSON.stringify(mockRoutinesRef.current));
    }
  }, [currentLedger, routines, IS_MOCK_MODE, isGuest, currentUser]);

  const fetchLedger = useCallback(async () => {
    if (!currentUser) {
      setCurrentLedger(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Use mock data for guest or mock users
    if (isEffectivelyMock) {
      const mockLedger = mockLedgersRef.current.find(l => l.date === dateString);
      if (mockLedger) {
        setCurrentLedger(mockLedger);
      } else {
        // Create empty ledger for dates not in mock data
        const newLedger = {
          id: `${currentUser.uid}_${dateString}`,
          userId: currentUser.uid,
          date: dateString,
          foods: [],
          activities: [],
          wins: [],
          water: 0
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
        wins: data.wins || [],
        water: data.water || 0
      });
    } else {
      // Create empty ledger for the day
      const newLedger = {
        id: `${currentUser.uid}_${dateString}`,
        userId: currentUser.uid,
        date: dateString,
        foods: [],
        activities: [],
        wins: [],
        water: 0
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

    if (isEffectivelyMock) {
      setRoutines(mockRoutinesRef.current);
      return;
    }

    try {
      const q = query(
        collection(db, 'routines'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedRoutines = [];
      snapshot.forEach((doc) => {
        fetchedRoutines.push({ ...doc.data(), id: doc.id });
      });
      setRoutines(fetchedRoutines);
    } catch (error) {
      console.error('Error fetching routines:', error);
    }
  }, [currentUser, isGuest]);

  useEffect(() => {
    refreshRoutines();
  }, [refreshRoutines]);

  async function addRoutine(routine) {
    if (!currentUser) return;

    const newRoutine = {
      ...routine,
      id: isEffectivelyMock ? `mock_routine_${Date.now()}` : '', // Will be set by Firebase for non-guests
      userId: currentUser.uid,
      createdAt: new Date()
    };

    if (isEffectivelyMock) {
      mockRoutinesRef.current = [...mockRoutinesRef.current, newRoutine];
      setRoutines(mockRoutinesRef.current);
      return;
    }

    const docRef = await addDoc(collection(db, 'routines'), newRoutine);
    setRoutines([...routines, { ...newRoutine, id: docRef.id }]);
  }

  async function deleteRoutine(routineId) {
    if (!currentUser) return;

    if (isEffectivelyMock) {
      mockRoutinesRef.current = mockRoutinesRef.current.filter(r => r.id !== routineId);
      setRoutines(mockRoutinesRef.current);
      return;
    }

    await deleteDoc(doc(db, 'routines', routineId));
    setRoutines(routines.filter(r => r.id !== routineId));
  }

  async function addFoodEntry(food) {
    if (!currentUser || !currentLedger) return;

    const newFood = {
      ...food,
      id: `food_${Date.now()}`,
      userId: currentUser.uid,
      date: dateString,
      timestamp: new Date()
    };

    // For guest or mock users, just update local state
    if (isEffectivelyMock) {
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

  async function removeFoodEntry(foodId) {
    if (!currentUser || !currentLedger) return;

    const foodToRemove = currentLedger.foods.find(f => f.id === foodId);
    if (!foodToRemove) return;

    // For guest or mock users, just update local state
    if (isEffectivelyMock) {
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

  async function updateFoodEntry(foodId, updates) {
    if (!currentUser || !currentLedger) return;

    const updatedFoods = currentLedger.foods.map(f =>
      f.id === foodId ? { ...f, ...updates } : f
    );

    // For guest or mock users, just update local state
    if (isEffectivelyMock) {
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

  async function addActivityEntry(activity) {
    if (!currentUser || !currentLedger) return;

    const newActivity = {
      ...activity,
      id: `activity_${Date.now()}`,
      userId: currentUser.uid,
      date: dateString,
      timestamp: new Date()
    };

    if (isEffectivelyMock) {
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

  async function removeActivityEntry(activityId) {
    if (!currentUser || !currentLedger) return;

    const activityToRemove = currentLedger.activities.find(a => a.id === activityId);
    if (!activityToRemove) return;

    if (isEffectivelyMock) {
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

  async function uploadFoodImage(file) {
    if (!currentUser) throw new Error('Not authenticated');

    // For guest or mock users, create a local blob URL
    if (isEffectivelyMock) {
      return URL.createObjectURL(file);
    }

    const fileName = `food_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `food-images/${currentUser.uid}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  function getTotals() {
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

  function evaluateFood(nutrition) {
    const totals = getTotals();
    const metrics = userData?.dailyMetrics || { calories: 2000 };

    const caloriesTarget = metrics.calories || 2000;
    const caloriesRemaining = caloriesTarget - totals.calories;
    const caloriesAfterMeal = caloriesRemaining - nutrition.calories;

    let level = 'good';
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

  async function addWin(win) {
    if (!currentUser || !currentLedger) return;

    if (isEffectivelyMock) {
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

  async function removeWin(win) {
    if (!currentUser || !currentLedger) return;

    if (isEffectivelyMock) {
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

  async function getLedgersForDateRange(startDate, endDate) {
    const result = new Map();
    
    if (!currentUser) return result;

    // For guest or mock users, filter mock ledgers
    if (isEffectivelyMock) {
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
        const data = doc.data();
        result.set(data.date, data);
      });
    } catch (error) {
      console.error('Error fetching ledgers:', error);
    }

    return result;
  }

  async function updateWater(amount) {
    if (!currentUser || !currentLedger) return;

    const newWater = Math.max(0, (currentLedger.water || 0) + amount);

    if (isEffectivelyMock) {
      const updatedLedger = {
        ...currentLedger,
        water: newWater
      };
      setCurrentLedger(updatedLedger);
      const idx = mockLedgersRef.current.findIndex(l => l.id === currentLedger.id);
      if (idx >= 0) mockLedgersRef.current[idx] = updatedLedger;
      return;
    }

    const ledgerRef = doc(db, 'ledgers', currentLedger.id);
    await updateDoc(ledgerRef, {
      water: newWater
    });

    setCurrentLedger({
      ...currentLedger,
      water: newWater
    });
  }

  function getConsumptionStats() {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), i);
      return format(d, 'yyyy-MM-dd');
    });

    const stats = {
      protein: { avgEntries: 3 },
      carbs: { avgEntries: 3 },
      fat: { avgEntries: 3 },
      water: { avgEntries: 8 }
    };

    if (isEffectivelyMock && mockLedgersRef.current.length > 0) {
      const relevantLedgers = mockLedgersRef.current.filter(l => last30Days.includes(l.date));
      if (relevantLedgers.length > 0) {
        // Calculate average entries that contribute to each macro
        const proteinCounts = relevantLedgers.map(l => l.foods.filter(f => (f.finalNutrition?.protein || 0) > 5).length);
        const carbCounts = relevantLedgers.map(l => l.foods.filter(f => (f.finalNutrition?.carbs || 0) > 5).length);
        const fatCounts = relevantLedgers.map(l => l.foods.filter(f => (f.finalNutrition?.fat || 0) > 2).length);
        
        stats.protein.avgEntries = Math.max(2, Math.round(proteinCounts.reduce((a, b) => a + b, 0) / relevantLedgers.length));
        stats.carbs.avgEntries = Math.max(2, Math.round(carbCounts.reduce((a, b) => a + b, 0) / relevantLedgers.length));
        stats.fat.avgEntries = Math.max(2, Math.round(fatCounts.reduce((a, b) => a + b, 0) / relevantLedgers.length));
        // Water is usually tracked in fixed increments, default 8 is good for ~250ml per glass
      }
    }
    // Note: For real Firebase users, we'd need a separate fetch or use the existing history cache
    return stats;
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
    refreshRoutines,
    updateWater,
    getConsumptionStats
  };

  return (
    <LedgerContext.Provider value={value}>
      {children}
    </LedgerContext.Provider>
  );
}
