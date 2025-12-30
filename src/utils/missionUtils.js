export const ALL_MISSIONS = [
  { id: 'fuel_intake', name: 'Fuel Intake', desc: 'Log at least 3 meals', goal: 3, xp: 150 },
  { id: 'hydration_sync', name: 'Hydration Sync', desc: 'Reach your water target', goal: 'dynamic_water', xp: 200 },
  { id: 'protein_protocol', name: 'Protein Protocol', desc: 'Reach 90% protein target', goal: 'dynamic_protein', xp: 250 },
  { id: 'precision_sync', name: 'Precision Sync', desc: 'Stay within 100 cal of target', goal: 1, xp: 300 },
  { id: 'physical_link', name: 'Physical Link', desc: 'Log at least one activity', goal: 1, xp: 150 },
  { id: 'early_bird', name: 'Early Bird', desc: 'Log breakfast before 9AM', goal: 1, xp: 200 },
  { id: 'green_sync', name: 'Green Sync', desc: 'Log a vegetable-rich meal', goal: 1, xp: 150 },
  { id: 'night_owl', name: 'Night Owl', desc: 'Log activity after 8PM', goal: 1, xp: 200 },
  { id: 'water_streak', name: 'Hydro Surge', desc: 'Drink 1000ml in one go', goal: 1, xp: 100 },
  { id: 'macro_balance', name: 'Macro Balance', desc: 'Log P, C, and F in one day', goal: 3, xp: 200 },
  { id: 'fiber_boost', name: 'Fiber Boost', desc: 'Log oats or whole grains', goal: 1, xp: 150 },
  { id: 'recovery_mode', name: 'Recovery Mode', desc: 'Log a post-workout snack', goal: 1, xp: 150 },
  { id: 'steady_state', name: 'Steady State', desc: 'Log 2+ activities', goal: 2, xp: 300 },
  { id: 'iron_will', name: 'Iron Will', desc: 'No snacks logged today', goal: 1, xp: 250 },
  { id: 'mega_hydration', name: 'Aqua Master', desc: 'Reach 4000ml water', goal: 4000, xp: 400 },
  { id: 'pro_sync', name: 'Pro Sync', desc: 'Log 5+ items total', goal: 5, xp: 250 },
  { id: 'vitamin_hit', name: 'Vitamin Hit', desc: 'Log fruit with breakfast', goal: 1, xp: 200 },
  { id: 'lean_machine', name: 'Lean Machine', desc: 'Stay under fat target', goal: 1, xp: 200 },
  { id: 'carb_load', name: 'Carb Load', desc: 'Reach 80% carb target', goal: 'dynamic_carbs', xp: 200 },
  { id: 'consistency_check', name: 'Deep Sync', desc: 'Log for 3 days straight', goal: 1, xp: 500 },
  // New Missions to reach 30
  { id: 'sugar_watch', name: 'Sugar Watch', desc: 'Keep sugar below 30g', goal: 1, xp: 200 },
  { id: 'morning_movement', name: 'Morning Link', desc: 'Log activity before 10AM', goal: 1, xp: 200 },
  { id: 'caffeine_sync', name: 'Caffeine Sync', desc: 'Log your morning caffeine', goal: 1, xp: 100 },
  { id: 'home_cook', name: 'Home Protocol', desc: 'Log a home-cooked meal', goal: 1, xp: 150 },
  { id: 'omega_hit', name: 'Omega Hit', desc: 'Log fish, nuts, or seeds', goal: 1, xp: 150 },
  { id: 'sodium_guard', name: 'Sodium Guard', desc: 'Stay under 2300mg sodium', goal: 1, xp: 200 },
  { id: 'veggie_streak', name: 'Veggie Streak', desc: 'Log veggies with 2 meals', goal: 2, xp: 250 },
  { id: 'hydration_master', name: 'Hydro Master', desc: 'Log water 5+ times', goal: 5, xp: 200 },
  { id: 'protein_snack', name: 'Power Snack', desc: 'Log a high-protein snack', goal: 1, xp: 150 },
  { id: 'mindful_finish', name: 'Mindful Finish', desc: 'Log dinner before 8PM', goal: 1, xp: 150 }
];

export const CORE_MISSION_IDS = ['fuel_intake', 'hydration_sync', 'protein_protocol'];

export function shuffleArray(array, seed) {
  const shuffled = [...array];
  
  // LCG (Linear Congruential Generator) for better determinism with a seed
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
    return seed;
  };

  // Mix the seed a few times before starting
  for (let i = 0; i < 5; i++) next();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getDailyMissions(dateStr, userId = 'default', userData = {}, ledger = {}, totals = {}) {
  const getHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Combine Date and User ID for a stable daily seed
  const dateSeed = getHash(dateStr);
  const userSeed = getHash(userId || 'guest');
  
  const combinedSeed = dateSeed ^ userSeed;

  const waterTarget = userData.preferences?.waterTarget || 2500;
  const calorieTarget = userData.dailyMetrics?.calories || 2000;
  const proteinTarget = userData.dailyMetrics?.protein || 150;
  const carbTarget = userData.dailyMetrics?.carbs || 250;

  const coreMissions = ALL_MISSIONS.filter(m => CORE_MISSION_IDS.includes(m.id));
  const rotationMissions = ALL_MISSIONS.filter(m => !CORE_MISSION_IDS.includes(m.id));
  
  // Use the combined seed to shuffle
  const selectedRotation = shuffleArray(rotationMissions, combinedSeed).slice(0, 5);
  const dailyPool = [...coreMissions, ...selectedRotation];
  
  return dailyPool.map(m => {
    let goal = m.goal;
    let current = 0;

    // Resolve dynamic goals
    if (goal === 'dynamic_water') goal = waterTarget;
    else if (goal === 'dynamic_protein') goal = Math.round(proteinTarget * 0.9);
    else if (goal === 'dynamic_carbs') goal = Math.round(carbTarget * 0.8);

    // Calculate current progress
    switch (m.id) {
      case 'fuel_intake': current = ledger.foods?.length || 0; break;
      case 'hydration_sync': current = ledger.water || 0; break;
      case 'protein_protocol': current = Math.round(totals.protein || 0); break;
      case 'precision_sync': current = Math.abs((totals.calories || 0) - calorieTarget) <= 100 && (totals.calories || 0) > 0 ? 1 : 0; break;
      case 'physical_link': current = ledger.activities?.length || 0; break;
      case 'early_bird': current = ledger.foods?.some(f => new Date(f.timestamp).getHours() < 9) ? 1 : 0; break;
      case 'green_sync': current = ledger.foods?.some(f => f.name.toLowerCase().includes('salad') || f.name.toLowerCase().includes('veggie')) ? 1 : 0; break;
      case 'night_owl': current = ledger.activities?.some(a => new Date(a.timestamp).getHours() >= 20) ? 1 : 0; break;
      case 'water_streak': current = (ledger.water || 0) >= 1000 ? 1 : 0; break;
      case 'macro_balance': current = ((totals.protein > 0 ? 1 : 0) + (totals.carbs > 0 ? 1 : 0) + (totals.fat > 0 ? 1 : 0)); break;
      case 'fiber_boost': current = ledger.foods?.some(f => f.name.toLowerCase().includes('oat') || f.name.toLowerCase().includes('grain')) ? 1 : 0; break;
      case 'recovery_mode': current = (ledger.foods?.length > 0 && ledger.activities?.length > 0) ? 1 : 0; break;
      case 'steady_state': current = ledger.activities?.length || 0; break;
      case 'iron_will': current = (ledger.foods?.length > 0 && !ledger.foods?.some(f => f.name.toLowerCase().includes('snack'))) ? 1 : 0; break;
      case 'mega_hydration': current = ledger.water || 0; break;
      case 'pro_sync': current = (ledger.foods?.length || 0) + (ledger.activities?.length || 0); break;
      case 'vitamin_hit': current = ledger.foods?.some(f => (f.name.toLowerCase().includes('fruit') || f.name.toLowerCase().includes('berry')) && new Date(f.timestamp).getHours() < 11) ? 1 : 0; break;
      case 'lean_machine': current = userData.dailyMetrics?.fat && (totals.fat || 0) < userData.dailyMetrics.fat ? 1 : 0; break;
      case 'carb_load': current = totals.carbs || 0; break;
      case 'consistency_check': current = 1; break; // Simplified for now
      default: current = 0;
    }

    return {
      ...m,
      goal,
      current,
      completed: (ledger.completedMissions || []).includes(m.id)
    };
  });
}

