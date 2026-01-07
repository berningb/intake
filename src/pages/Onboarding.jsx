import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Scale, Ruler, Target, Activity, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Onboarding() {
  const navigate = useNavigate();
  const { updateUserData } = useAuth();
  const [step, setStep] = useState('welcome');
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState({
    age: 25,
    gender: 'male',
    weight: 70,
    height: 170,
    activityLevel: 'moderate',
    goal: 'maintain'
  });

  const [targets, setTargets] = useState(null);
  
  // Unit preferences
  const [useMetricWeight, setUseMetricWeight] = useState(true);
  const [useMetricHeight, setUseMetricHeight] = useState(true);

  // Conversion helpers
  const kgToLbs = (kg) => Math.round(kg * 2.20462);
  const lbsToKg = (lbs) => lbs / 2.20462;
  const cmToFeetInches = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };
  const feetInchesToCm = (feet, inches) => (feet * 12 + inches) * 2.54;

  // Get display values based on unit preference
  const displayWeight = useMetricWeight ? stats.weight : kgToLbs(stats.weight);
  const displayHeight = useMetricHeight ? stats.height : cmToFeetInches(stats.height);

  const handleWeightChange = (value) => {
    const weightInKg = useMetricWeight ? value : lbsToKg(value);
    setStats({ ...stats, weight: weightInKg });
  };

  const handleHeightChange = (feet, inches) => {
    const heightInCm = feetInchesToCm(feet, inches);
    setStats({ ...stats, height: heightInCm });
  };

  const steps = ['welcome', 'basics', 'body', 'activity', 'goal', 'results'];
  const currentIndex = steps.indexOf(step);

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const calculateTargets = () => {
    // Mifflin-St Jeor Equation for BMR
    let bmr;
    if (stats.gender === 'male') {
      bmr = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age + 5;
    } else {
      bmr = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age - 161;
    }

    // Calculate TDEE
    const tdee = bmr * activityMultipliers[stats.activityLevel];

    // Adjust calories based on goal
    let calories;
    switch (stats.goal) {
      case 'lose':
        calories = tdee - 500; // 500 calorie deficit
        break;
      case 'gain':
        calories = tdee + 300; // 300 calorie surplus
        break;
      default:
        calories = tdee;
    }

    // Calculate macros
    const protein = Math.round(stats.weight * 1.8);
    const fatCalories = calories * 0.27;
    const fat = Math.round(fatCalories / 9);
    const proteinCalories = protein * 4;
    const carbCalories = calories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4);

    return {
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee)
    };
  };

  const handleNext = () => {
    if (step === 'goal') {
      const calculated = calculateTargets();
      setTargets(calculated);
      setStep('results');
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex < steps.length) {
        setStep(steps[nextIndex]);
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    if (!targets) return;
    
    setLoading(true);
    try {
      await updateUserData({
        dailyMetrics: {
          calories: targets.calories,
          protein: targets.protein,
          carbs: targets.carbs,
          fat: targets.fat
        },
        preferences: {
          dietaryRestrictions: [],
          activityLevel: stats.activityLevel
        },
        onboardingComplete: true
      });
      navigate('/');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: {
      x: 50,
      opacity: 0
    },
    center: {
      x: 0,
      opacity: 1
    },
    exit: {
      x: -50,
      opacity: 0
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await updateUserData({
        onboardingComplete: true,
        dailyMetrics: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 70
        }
      });
      navigate('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-md sm:p-lg bg-bg-deep relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at:10%_10%,rgba(0,242,255,0.05)_0%,transparent_50%),radial-gradient(circle_at:90%_90%,rgba(255,0,255,0.05)_0%,transparent_50%)] before:pointer-events-none px-4 sm:px-lg">
      <div className="bg-bg-card rounded-md pt-[4rem] sm:pt-[8rem] px-[1.25rem] sm:px-[2rem] pb-[3rem] sm:pb-[4.5rem] w-full max-w-[480px] min-h-[480px] sm:min-h-[520px] border border-gray-800 relative z-10 flex flex-col shadow-card max-sm:p-md max-sm:min-h-auto max-sm:border-none max-sm:bg-transparent max-sm:shadow-none">
        {/* Progress */}
        {step !== 'welcome' && (
          <div className="flex justify-center gap-2 mb-[2.5rem] sm:mb-[3rem]">
            {steps.slice(1).map((s, i) => (
              <div 
                key={s} 
                className={`h-[4px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${steps.indexOf(s) <= currentIndex ? 'bg-primary w-[20px] sm:w-[24px] shadow-neon' : 'bg-gray-800 w-[8px] sm:w-[10px]'}`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Welcome */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              className="flex-1 flex flex-col items-center justify-center text-center"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-sm flex items-center justify-center mb-xl border bg-primary/10 color-primary shadow-[0_0_20px_rgba(0,242,255,0.1)] border-primary">
                <Sparkles size={40} className="text-primary" />
              </div>
              <h1 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Welcome to Intake</h1>
              <p className="text-gray-400 mb-lg sm:mb-xl text-[0.85rem] sm:text-[0.9rem]">Let's personalize your nutrition targets based on your body and goals.</p>
              <p className="text-[0.65rem] sm:text-[0.75rem] text-gray-600 font-display uppercase tracking-[0.1em]">This takes about 1 minute</p>
            </motion.div>
          )}

          {/* Basics - Age & Gender */}
          {step === 'basics' && (
            <motion.div
              key="basics"
              className="flex-1 flex flex-col items-center justify-center text-center"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <h2 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">The Basics</h2>
              <p className="text-gray-400 mb-xl text-[0.85rem] sm:text-[0.9rem]">Tell us a bit about yourself</p>

              <div className="w-full mb-lg sm:mb-xl text-left">
                <label className="block text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Age</label>
                <div className="flex items-center gap-md">
                  <input
                    type="number"
                    value={stats.age}
                    onChange={(e) => setStats({...stats, age: Number(e.target.value)})}
                    min={13}
                    max={100}
                    className="flex-1 p-4 text-[1.25rem] sm:text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                  />
                  <span className="text-gray-500 font-display uppercase tracking-[0.1em] text-[0.65rem] sm:text-[0.7rem]">years</span>
                </div>
              </div>

              <div className="w-full mb-0 text-left">
                <label className="block text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Gender</label>
                <div className="flex gap-sm sm:gap-md">
                  <button
                    className={`flex-1 p-3 sm:p-4 rounded-sm font-extrabold font-display uppercase transition-all duration-fast text-[0.75rem] sm:text-[0.85rem] ${stats.gender === 'male' ? 'bg-primary/5 text-primary border-primary shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-bg-accent border border-gray-800 text-gray-500'}`}
                    onClick={() => setStats({...stats, gender: 'male'})}
                  >
                    Male
                  </button>
                  <button
                    className={`flex-1 p-3 sm:p-4 rounded-sm font-extrabold font-display uppercase transition-all duration-fast text-[0.75rem] sm:text-[0.85rem] ${stats.gender === 'female' ? 'bg-primary/5 text-primary border-primary shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-bg-accent border border-gray-800 text-gray-500'}`}
                    onClick={() => setStats({...stats, gender: 'female'})}
                  >
                    Female
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Body - Weight & Height */}
          {step === 'body' && (
            <motion.div
              key="body"
              className="flex-1 flex flex-col items-center justify-center text-center"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <h2 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Your Body</h2>
              <p className="text-gray-400 mb-xl text-[0.85rem] sm:text-[0.9rem]">For metabolic calculation</p>

              <div className="w-full mb-lg sm:mb-xl text-left">
                <label className="block text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Weight</label>
                <div className="flex items-center gap-sm sm:gap-md">
                  <input
                    type="number"
                    value={Math.round(displayWeight)}
                    onChange={(e) => handleWeightChange(Number(e.target.value))}
                    min={useMetricWeight ? 30 : 66}
                    max={useMetricWeight ? 300 : 660}
                    className="flex-1 p-4 text-[1.25rem] sm:text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                  />
                  <div className="flex gap-[2px] bg-bg-accent rounded-sm p-[4px] border border-gray-800 shrink-0">
                    <button
                      className={`py-[6px] px-[8px] sm:px-[12px] text-[0.6rem] sm:text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${useMetricWeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                      onClick={() => setUseMetricWeight(true)}
                    >
                      kg
                    </button>
                    <button
                      className={`py-[6px] px-[8px] sm:px-[12px] text-[0.6rem] sm:text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${!useMetricWeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                      onClick={() => setUseMetricWeight(false)}
                    >
                      lbs
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full mb-0 text-left">
                <label className="block text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Height</label>
                {useMetricHeight ? (
                  <div className="flex items-center gap-sm sm:gap-md">
                    <input
                      type="number"
                      value={Math.round(stats.height)}
                      onChange={(e) => setStats({...stats, height: Number(e.target.value)})}
                      min={100}
                      max={250}
                      className="flex-1 p-4 text-[1.25rem] sm:text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                    />
                    <div className="flex gap-[2px] bg-bg-accent rounded-sm p-[4px] border border-gray-800 shrink-0">
                      <button
                        className={`py-[6px] px-[8px] sm:px-[12px] text-[0.6rem] sm:text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(true)}
                      >
                        cm
                      </button>
                      <button
                        className={`py-[6px] px-[8px] sm:px-[12px] text-[0.6rem] sm:text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${!useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(false)}
                      >
                        ft/in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-sm sm:gap-md">
                    <div className="flex-1 flex items-center gap-xs sm:gap-md">
                      <input
                        type="number"
                        value={displayHeight.feet}
                        onChange={(e) => handleHeightChange(
                          Number(e.target.value),
                          displayHeight.inches
                        )}
                        min={3}
                        max={8}
                        className="flex-1 p-4 text-[1.25rem] sm:text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                      />
                      <span className="text-gray-500 font-display uppercase tracking-[0.1em] text-[0.6rem] sm:text-[0.7rem]">ft</span>
                    </div>
                    <div className="flex-1 flex items-center gap-xs sm:gap-md">
                      <input
                        type="number"
                        value={displayHeight.inches}
                        onChange={(e) => handleHeightChange(
                          displayHeight.feet,
                          Number(e.target.value)
                        )}
                        min={0}
                        max={11}
                        className="flex-1 p-4 text-[1.25rem] sm:text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                      />
                      <span className="text-gray-500 font-display uppercase tracking-[0.1em] text-[0.6rem] sm:text-[0.7rem]">in</span>
                    </div>
                    <div className="flex gap-[2px] bg-bg-accent rounded-sm p-[4px] border border-gray-800 shrink-0">
                      <button
                        className={`py-[6px] px-[8px] sm:px-[12px] text-[0.6rem] sm:text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(true)}
                      >
                        cm
                      </button>
                      <button
                        className={`py-[6px] px-[8px] sm:px-[12px] text-[0.6rem] sm:text-[0.65rem] font-display uppercase rounded-xs transition-all duration-fast ${!useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(false)}
                      >
                        ft/in
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Activity Level */}
          {step === 'activity' && (
            <motion.div
              key="activity"
              className="flex-1 flex flex-col items-center justify-center text-center"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <h2 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Activity Level</h2>
              <p className="text-gray-400 mb-xl text-[0.85rem] sm:text-[0.9rem]">How active are you typical week?</p>

              <div className="w-full flex flex-col gap-sm">
                {[
                  { value: 'sedentary', label: 'Sedentary', desc: 'Little exercise' },
                  { value: 'light', label: 'Light', desc: '1-3 days/week' },
                  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
                  { value: 'active', label: 'Active', desc: '6-7 days/week' },
                  { value: 'very_active', label: 'Pro', desc: 'Elite athlete' }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`flex flex-col items-start p-md sm:p-lg bg-bg-accent border rounded-sm text-left transition-all duration-fast relative hover:border-gray-500 ${stats.activityLevel === option.value ? 'bg-primary/5 border-primary' : 'border-gray-800'}`}
                    onClick={() => setStats({...stats, activityLevel: option.value})}
                  >
                    <span className="font-extrabold font-display uppercase tracking-[0.05em] text-white mb-1 text-[0.75rem] sm:text-[0.85rem]">{option.label}</span>
                    <span className="text-[0.65rem] sm:text-[0.75rem] text-gray-500">{option.desc}</span>
                    {stats.activityLevel === option.value && <Check size={18} className="absolute right-md sm:right-lg top-1/2 -translate-y-1/2 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Goal */}
          {step === 'goal' && (
            <motion.div
              key="goal"
              className="flex-1 flex flex-col items-center justify-center text-center"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <h2 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Your Goal</h2>
              <p className="text-gray-400 mb-xl text-[0.85rem] sm:text-[0.9rem]">What are you looking to achieve?</p>

              <div className="w-full grid grid-cols-1 gap-sm sm:gap-md">
                <button
                  className={`flex items-center gap-md p-md bg-bg-accent border rounded-md transition-all duration-fast hover:border-gray-500 ${stats.goal === 'lose' ? 'bg-primary/5 border-primary' : 'border-gray-800'}`}
                  onClick={() => setStats({...stats, goal: 'lose'})}
                >
                  <span className="text-[1.5rem] sm:text-[2rem] shrink-0">📉</span>
                  <div className="text-left min-w-0">
                    <span className="block font-extrabold font-display uppercase text-white text-[0.85rem] sm:text-[0.9rem]">Lose Weight</span>
                    <span className="block text-[0.65rem] sm:text-[0.75rem] text-gray-500 truncate">Deficit for fat loss</span>
                  </div>
                </button>

                <button
                  className={`flex items-center gap-md p-md bg-bg-accent border rounded-md transition-all duration-fast hover:border-gray-500 ${stats.goal === 'maintain' ? 'bg-primary/5 border-primary' : 'border-gray-800'}`}
                  onClick={() => setStats({...stats, goal: 'maintain'})}
                >
                  <span className="text-[1.5rem] sm:text-[2rem] shrink-0">⚖️</span>
                  <div className="text-left min-w-0">
                    <span className="block font-extrabold font-display uppercase text-white text-[0.85rem] sm:text-[0.9rem]">Maintain</span>
                    <span className="block text-[0.65rem] sm:text-[0.75rem] text-gray-500 truncate">Stay current weight</span>
                  </div>
                </button>

                <button
                  className={`flex items-center gap-md p-md bg-bg-accent border rounded-md transition-all duration-fast hover:border-gray-500 ${stats.goal === 'gain' ? 'bg-primary/5 border-primary' : 'border-gray-800'}`}
                  onClick={() => setStats({...stats, goal: 'gain'})}
                >
                  <span className="text-[1.5rem] sm:text-[2rem] shrink-0">💪</span>
                  <div className="text-left min-w-0">
                    <span className="block font-extrabold font-display uppercase text-white text-[0.85rem] sm:text-[0.9rem]">Build Muscle</span>
                    <span className="block text-[0.65rem] sm:text-[0.75rem] text-gray-500 truncate">Surplus for gains</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {step === 'results' && targets && (
            <motion.div
              key="results"
              className="flex-1 flex flex-col items-center justify-center text-center"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <h2 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Your Plan</h2>
              <p className="text-gray-400 mb-lg sm:mb-xl text-[0.85rem] sm:text-[0.9rem]">Based on your stats</p>

              <div className="w-full bg-bg-accent rounded-md p-md sm:p-[2rem] mb-lg border border-gray-800">
                <div className="text-center mb-md sm:mb-xl pb-md sm:pb-xl border-b border-gray-800">
                  <span className="block font-display text-[2.5rem] sm:text-[3.5rem] font-black text-primary leading-none shadow-neon">{targets.calories}</span>
                  <span className="block text-[0.65rem] sm:text-[0.75rem] font-display uppercase tracking-[0.2em] text-gray-500 mt-2">daily calories</span>
                </div>

                <div className="grid grid-cols-3 gap-sm sm:gap-md text-center">
                  <div className="flex flex-col min-w-0">
                    <span className="font-display text-[1rem] sm:text-[1.5rem] font-black text-white">{targets.protein}g</span>
                    <span className="text-[0.55rem] sm:text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em] mt-1 truncate">Protein</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display text-[1rem] sm:text-[1.5rem] font-black text-white">{targets.carbs}g</span>
                    <span className="text-[0.55rem] sm:text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em] mt-1 truncate">Carbs</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display text-[1rem] sm:text-[1.5rem] font-black text-white">{targets.fat}g</span>
                    <span className="text-[0.55rem] sm:text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em] mt-1 truncate">Fat</span>
                  </div>
                </div>
              </div>

              <p className="text-[0.6rem] sm:text-[0.7rem] text-gray-700 uppercase tracking-[0.05em] m-0">
                Adjust as you progress.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className={`flex items-center mt-auto pt-[2rem] sm:pt-[3rem] gap-md ${step !== 'welcome' && step !== 'results' ? 'justify-between' : 'justify-center'}`}>
          {step !== 'welcome' && step !== 'results' && (
            <button className="flex items-center gap-xs p-3 sm:px-5 bg-transparent text-gray-500 font-extrabold font-display uppercase tracking-[0.1em] text-[0.65rem] sm:text-[0.7rem] rounded-sm transition-all duration-fast hover:text-white" onClick={handleBack}>
              <ArrowLeft size={18} />
              Back
            </button>
          )}
          
          {step === 'welcome' && (
            <button className="flex items-center gap-sm p-3 px-6 bg-primary text-bg-deep font-extrabold font-display uppercase tracking-[0.1em] text-[0.7rem] sm:text-[0.75rem] rounded-sm shadow-neon transition-all duration-fast hover:bg-white" onClick={handleNext}>
              Get Started
              <ArrowRight size={18} />
            </button>
          )}

          {step !== 'welcome' && step !== 'results' && (
            <button className="flex items-center gap-sm p-3 px-6 bg-primary text-bg-deep font-extrabold font-display uppercase tracking-[0.1em] text-[0.7rem] sm:text-[0.75rem] rounded-sm shadow-neon transition-all duration-fast hover:bg-white" onClick={handleNext}>
              Next
              <ArrowRight size={18} />
            </button>
          )}

          {step === 'results' && (
            <button 
              className="w-full p-4 sm:p-xl bg-secondary text-white font-extrabold font-display uppercase tracking-[0.2em] text-[0.85rem] sm:text-[0.9rem] rounded-sm shadow-[0_0_20px_var(--color-secondary-glow)] transition-all duration-fast hover:bg-white hover:text-secondary disabled:opacity-30" 
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Start Tracking'}
            </button>
          )}
        </div>

        {step === 'welcome' && (
          <button className="block w-full mt-lg p-sm bg-transparent text-gray-700 text-[0.65rem] sm:text-[0.7rem] font-display uppercase tracking-[0.1em] text-center transition-all duration-fast hover:text-gray-500" onClick={handleSkip} disabled={loading}>
            {loading ? 'Initializing...' : 'Skip for now'}
          </button>
        )}
      </div>
    </div>
  );
}
