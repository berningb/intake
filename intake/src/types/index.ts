// User Types
export interface UserPreferences {
  dietaryRestrictions: string[];
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  theme?: 'dark' | 'light';
}

export interface DailyMetrics {
  calories?: number;
  protein?: number; // grams
  carbs?: number; // grams
  fat?: number; // grams
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  preferences: UserPreferences;
  dailyMetrics: DailyMetrics;
  onboardingComplete?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Nutrition Types
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// Food Entry Types
export interface FoodEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  timestamp: Date;
  name: string;
  imageUrl?: string;
  portionDescription?: string;
  nutritionEstimate?: NutritionInfo; // AI-generated
  finalNutrition: NutritionInfo; // User-confirmed or edited
  aiConfidence?: number; // 0-1
  notes?: string;
}

// Activity Types
export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number; // minutes
  completed: boolean;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  exercises: Omit<Exercise, 'completed'>[];
  createdAt: Date;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  date: string;
  timestamp: Date;
  type: 'workout' | 'cardio' | 'yoga' | 'other';
  routineId?: string;
  routineName?: string;
  exercises: Exercise[];
  duration?: number; // minutes
  notes?: string;
}

// Day Ledger Types
export interface DayLedger {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  activities: ActivityEntry[];
  notes?: string;
  wins?: string[];
}

// Decision Types
export type DecisionLevel = 'good' | 'caution' | 'exceeds';

export interface FoodDecision {
  level: DecisionLevel;
  message: string;
  breakdown: {
    calories: { remaining: number; afterMeal: number };
    protein?: { remaining: number; afterMeal: number };
    carbs?: { remaining: number; afterMeal: number };
    fat?: { remaining: number; afterMeal: number };
  };
}

// Component Props
export interface DayViewProps {
  onClose?: () => void;
  isModal?: boolean;
}

// Achievement Types
export interface Achievement {
  id: string;
  userId: string;
  date: string;
  type: 'daily_win' | 'routine_complete' | 'personal_best' | 'streak';
  title: string;
  description?: string;
  value?: number;
}

