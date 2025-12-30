import { format, subDays } from 'date-fns';

// Common foods with realistic nutrition
const breakfastFoods = [
  { name: 'Oatmeal with Berries', calories: 320, protein: 12, carbs: 54, fat: 6 },
  { name: 'Greek Yogurt Parfait', calories: 280, protein: 18, carbs: 32, fat: 8 },
  { name: 'Scrambled Eggs (2)', calories: 180, protein: 14, carbs: 2, fat: 12 },
  { name: 'Avocado Toast', calories: 350, protein: 10, carbs: 30, fat: 22 },
  { name: 'Protein Smoothie', calories: 340, protein: 28, carbs: 42, fat: 6 },
  { name: 'Banana & Peanut Butter', calories: 290, protein: 8, carbs: 34, fat: 16 },
  { name: 'Whole Grain Cereal', calories: 260, protein: 8, carbs: 48, fat: 4 },
  { name: 'Egg White Omelette', calories: 220, protein: 24, carbs: 6, fat: 10 },
  { name: 'Overnight Oats', calories: 380, protein: 14, carbs: 58, fat: 10 },
  { name: 'Cottage Cheese & Fruit', calories: 240, protein: 22, carbs: 20, fat: 6 },
];

const lunchFoods = [
  { name: 'Grilled Chicken Salad', calories: 420, protein: 38, carbs: 18, fat: 22 },
  { name: 'Turkey Sandwich', calories: 480, protein: 32, carbs: 42, fat: 18 },
  { name: 'Quinoa Bowl', calories: 520, protein: 18, carbs: 62, fat: 20 },
  { name: 'Tuna Wrap', calories: 440, protein: 30, carbs: 38, fat: 18 },
  { name: 'Chicken Caesar Wrap', calories: 560, protein: 34, carbs: 40, fat: 28 },
  { name: 'Veggie Stir Fry', calories: 380, protein: 14, carbs: 48, fat: 16 },
  { name: 'Grilled Salmon Salad', calories: 480, protein: 36, carbs: 16, fat: 30 },
  { name: 'Black Bean Burrito', calories: 540, protein: 22, carbs: 68, fat: 18 },
  { name: 'Chicken Soup', calories: 320, protein: 26, carbs: 28, fat: 12 },
  { name: 'Mediterranean Bowl', calories: 460, protein: 20, carbs: 52, fat: 20 },
];

const dinnerFoods = [
  { name: 'Grilled Chicken Breast', calories: 380, protein: 42, carbs: 8, fat: 18 },
  { name: 'Salmon with Vegetables', calories: 520, protein: 40, carbs: 22, fat: 30 },
  { name: 'Lean Beef Steak', calories: 480, protein: 44, carbs: 4, fat: 32 },
  { name: 'Shrimp Stir Fry', calories: 420, protein: 34, carbs: 36, fat: 16 },
  { name: 'Turkey Meatballs & Pasta', calories: 580, protein: 36, carbs: 58, fat: 22 },
  { name: 'Baked Cod with Rice', calories: 440, protein: 38, carbs: 42, fat: 12 },
  { name: 'Chicken Fajitas', calories: 520, protein: 38, carbs: 42, fat: 22 },
  { name: 'Pork Tenderloin', calories: 460, protein: 40, carbs: 18, fat: 26 },
  { name: 'Vegetable Curry', calories: 420, protein: 14, carbs: 52, fat: 20 },
  { name: 'Grilled Tilapia', calories: 360, protein: 36, carbs: 16, fat: 18 },
];

const snackFoods = [
  { name: 'Protein Bar', calories: 220, protein: 20, carbs: 24, fat: 8 },
  { name: 'Apple with Almond Butter', calories: 260, protein: 6, carbs: 28, fat: 16 },
  { name: 'Greek Yogurt', calories: 140, protein: 14, carbs: 12, fat: 4 },
  { name: 'Mixed Nuts (handful)', calories: 180, protein: 6, carbs: 8, fat: 16 },
  { name: 'Cheese Stick', calories: 80, protein: 6, carbs: 1, fat: 6 },
  { name: 'Hummus & Veggies', calories: 160, protein: 6, carbs: 18, fat: 8 },
  { name: 'Rice Cakes', calories: 120, protein: 2, carbs: 24, fat: 2 },
  { name: 'Hard Boiled Egg', calories: 78, protein: 6, carbs: 1, fat: 5 },
  { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Trail Mix', calories: 200, protein: 6, carbs: 20, fat: 12 },
];

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addVariation(value, percent = 10) {
  const variation = value * (percent / 100);
  return Math.round(value + (Math.random() * variation * 2 - variation));
}

function generateFoodEntry(
  userId,
  date,
  food,
  mealType,
  noVariation = false
) {
  return {
    id: `food_${date}_${mealType}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    date,
    timestamp: new Date(`${date}T${mealType === 'breakfast' ? '08' : mealType === 'lunch' ? '12' : mealType === 'dinner' ? '19' : '15'}:00:00`),
    name: food.name,
    portionDescription: '1 serving',
    finalNutrition: {
      calories: noVariation ? food.calories : addVariation(food.calories),
      protein: noVariation ? food.protein : addVariation(food.protein),
      carbs: noVariation ? food.carbs : addVariation(food.carbs),
      fat: noVariation ? food.fat : addVariation(food.fat),
    },
  };
}

export function generateMockLedgers(userId, days = 60, targets) {
  const ledgers = [];
  const today = new Date();

  // Targets used for "Perfect" days
  const targetCalories = targets?.calories || 2000;
  const targetProtein = targets?.protein || 150;

  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    const dateString = format(date, 'yyyy-MM-dd');
    
    const foods = [];
    
    // Determine if this should be a "Perfect" day (30% chance)
    const isPerfectDay = Math.random() < 0.35;
    
    if (isPerfectDay) {
      // Create a day that hits the targets dynamically
      const p1 = Math.round(targetProtein * 0.3);
      const p2 = Math.round(targetProtein * 0.3);
      const p3 = Math.round(targetProtein * 0.25);
      const p4 = targetProtein - p1 - p2 - p3;

      const c1 = Math.round(targetCalories * 0.22);
      const c2 = Math.round(targetCalories * 0.28);
      const c3 = Math.round(targetCalories * 0.3);
      const c4 = targetCalories - c1 - c2 - c3;

      foods.push(generateFoodEntry(userId, dateString, { name: 'High Protein Breakfast', calories: c1, protein: p1, carbs: 40, fat: 12 }, 'breakfast', true));
      foods.push(generateFoodEntry(userId, dateString, { name: 'Lean Muscle Lunch', calories: c2, protein: p2, carbs: 35, fat: 20 }, 'lunch', true));
      foods.push(generateFoodEntry(userId, dateString, { name: 'Performance Dinner', calories: c3, protein: p3, carbs: 10, fat: 35 }, 'dinner', true));
      foods.push(generateFoodEntry(userId, dateString, { name: 'Recovery Snack', calories: c4, protein: p4, carbs: 20, fat: 10 }, 'snack', true));
    } else {
      // Random generation for other days
      // Breakfast (90% chance)
      if (Math.random() > 0.1) {
        foods.push(generateFoodEntry(userId, dateString, randomFromArray(breakfastFoods), 'breakfast'));
      }
      
      // Lunch (95% chance)
      if (Math.random() > 0.05) {
        foods.push(generateFoodEntry(userId, dateString, randomFromArray(lunchFoods), 'lunch'));
      }
      
      // Dinner (98% chance)
      if (Math.random() > 0.02) {
        foods.push(generateFoodEntry(userId, dateString, randomFromArray(dinnerFoods), 'dinner'));
      }
      
      // Snacks (0-2 per day)
      const numSnacks = Math.floor(Math.random() * 3);
      for (let j = 0; j < numSnacks; j++) {
        foods.push(generateFoodEntry(userId, dateString, randomFromArray(snackFoods), `snack${j}`));
      }
    }

    const water = isPerfectDay 
      ? targets?.waterTarget || 2500 
      : Math.floor(Math.random() * (targets?.waterTarget || 2500) * 1.2);

    ledgers.push({
      id: `${userId}_${dateString}`,
      userId,
      date: dateString,
      foods,
      activities: [],
      wins: [],
      water,
      completedMissions: [],
    });
  }

  return ledgers;
}

export function getMockLedgerForDate(userId, dateString, allLedgers) {
  return allLedgers.find(l => l.date === dateString) || null;
}

export function generateMockRoutines(userId) {
  return [
    {
      id: 'mock_routine_1',
      userId,
      name: 'Push Day (Upper Body)',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: 8 },
        { name: 'Overhead Press', sets: 3, reps: 10 },
        { name: 'Incline Dumbbell Flyes', sets: 3, reps: 12 },
        { name: 'Tricep Pushdowns', sets: 3, reps: 15 },
        { name: 'Lateral Raises', sets: 4, reps: 12 },
      ],
      createdAt: new Date(),
    },
    {
      id: 'mock_routine_2',
      userId,
      name: 'Pull Day (Back & Biceps)',
      exercises: [
        { name: 'Deadlifts', sets: 3, reps: 5 },
        { name: 'Pull-ups', sets: 3, reps: 10 },
        { name: 'Seated Cable Rows', sets: 3, reps: 12 },
        { name: 'Barbell Curls', sets: 3, reps: 10 },
        { name: 'Face Pulls', sets: 3, reps: 15 },
      ],
      createdAt: new Date(),
    },
    {
      id: 'mock_routine_3',
      userId,
      name: 'Leg Day (Power)',
      exercises: [
        { name: 'Back Squats', sets: 5, reps: 5 },
        { name: 'Leg Press', sets: 3, reps: 12 },
        { name: 'Leg Curls', sets: 3, reps: 12 },
        { name: 'Calf Raises', sets: 4, reps: 15 },
        { name: 'Romanian Deadlifts', sets: 3, reps: 10 },
      ],
      createdAt: new Date(),
    }
  ];
}
