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
    <div className="min-h-screen flex items-center justify-center p-lg bg-bg-deep relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_10%_10%,rgba(0,242,255,0.05)_0%,transparent_50%),radial-gradient(circle_at_90%_90%,rgba(255,0,255,0.05)_0%,transparent_50%)] before:pointer-events-none">
      <div className="bg-bg-card rounded-md pt-[8rem] px-[2rem] pb-[4.5rem] w-full max-w-[480px] min-h-[520px] border border-gray-800 relative z-10 flex flex-col shadow-card max-sm:p-xl max-sm:min-h-auto max-sm:border-none max-sm:bg-transparent max-sm:shadow-none">
        {/* Progress */}
        {step !== 'welcome' && (
          <div className="flex justify-center gap-2 mb-[3rem]">
            {steps.slice(1).map((s, i) => (
              <div 
                key={s} 
                className={`h-[4px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${steps.indexOf(s) <= currentIndex ? 'bg-primary w-[24px] shadow-neon' : 'bg-gray-800 w-[10px]'}`}
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
              <div className="w-[80px] h-[80px] rounded-sm flex items-center justify-center mb-xl border bg-primary/10 color-primary shadow-[0_0_20px_rgba(0,242,255,0.1)] border-primary">
                <Sparkles size={48} className="text-primary" />
              </div>
              <h1 className="text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Welcome to Intake</h1>
              <p className="text-gray-400 mb-xl text-[0.9rem]">Let's personalize your nutrition targets based on your body and goals.</p>
              <p className="text-[0.75rem] text-gray-600 font-display uppercase tracking-[0.1em]">This takes about 1 minute</p>
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
              <h2 className="text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">The Basics</h2>
              <p className="text-gray-400 mb-xl text-[0.9rem]">Tell us a bit about yourself</p>

              <div className="w-full mb-xl text-left">
                <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Age</label>
                <div className="flex items-center gap-md">
                  <input
                    type="number"
                    value={stats.age}
                    onChange={(e) => setStats({...stats, age: Number(e.target.value)})}
                    min={13}
                    max={100}
                    className="flex-1 p-[1.25rem] text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                  />
                  <span className="text-gray-500 font-display uppercase tracking-[0.1em] text-[0.7rem]">years</span>
                </div>
              </div>

              <div className="w-full mb-xl text-left">
                <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Gender</label>
                <div className="flex gap-md">
                  <button
                    className={`flex-1 p-4 rounded-sm font-extrabold font-display uppercase transition-all duration-fast ${stats.gender === 'male' ? 'bg-primary/5 text-primary border-primary shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-bg-accent border border-gray-800 text-gray-500'}`}
                    onClick={() => setStats({...stats, gender: 'male'})}
                  >
                    Male
                  </button>
                  <button
                    className={`flex-1 p-4 rounded-sm font-extrabold font-display uppercase transition-all duration-fast ${stats.gender === 'female' ? 'bg-primary/5 text-primary border-primary shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-bg-accent border border-gray-800 text-gray-500'}`}
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
              <div className="w-[80px] h-[80px] rounded-sm flex items-center justify-center mb-xl border border-gray-800 bg-bg-accent text-primary">
                <Scale size={32} />
              </div>
              <h2 className="text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Your Body</h2>
              <p className="text-gray-400 mb-xl text-[0.9rem]">We'll use this to calculate your metabolism</p>

              <div className="w-full mb-xl text-left">
                <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Weight</label>
                <div className="flex items-center gap-md">
                  <input
                    type="number"
                    value={Math.round(displayWeight)}
                    onChange={(e) => handleWeightChange(Number(e.target.value))}
                    min={useMetricWeight ? 30 : 66}
                    max={useMetricWeight ? 300 : 660}
                    className="flex-1 p-[1.25rem] text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                  />
                  <div className="flex gap-[2px] bg-bg-accent rounded-sm p-[4px] border border-gray-800">
                    <button
                      className={`py-[6px] px-[12px] text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${useMetricWeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                      onClick={() => setUseMetricWeight(true)}
                    >
                      kg
                    </button>
                    <button
                      className={`py-[6px] px-[12px] text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${!useMetricWeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                      onClick={() => setUseMetricWeight(false)}
                    >
                      lbs
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full mb-xl text-left">
                <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Height</label>
                {useMetricHeight ? (
                  <div className="flex items-center gap-md">
                    <input
                      type="number"
                      value={Math.round(stats.height)}
                      onChange={(e) => setStats({...stats, height: Number(e.target.value)})}
                      min={100}
                      max={250}
                      className="flex-1 p-[1.25rem] text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                    />
                    <div className="flex gap-[2px] bg-bg-accent rounded-sm p-[4px] border border-gray-800">
                      <button
                        className={`py-[6px] px-[12px] text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(true)}
                      >
                        cm
                      </button>
                      <button
                        className={`py-[6px] px-[12px] text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${!useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(false)}
                      >
                        ft/in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-md">
                    <div className="flex-1 flex items-center gap-md">
                      <input
                        type="number"
                        value={displayHeight.feet}
                        onChange={(e) => handleHeightChange(
                          Number(e.target.value),
                          displayHeight.inches
                        )}
                        min={3}
                        max={8}
                        className="flex-1 p-[1.25rem] text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                      />
                      <span className="text-gray-500 font-display uppercase tracking-[0.1em] text-[0.7rem]">ft</span>
                    </div>
                    <div className="flex-1 flex items-center gap-md">
                      <input
                        type="number"
                        value={displayHeight.inches}
                        onChange={(e) => handleHeightChange(
                          displayHeight.feet,
                          Number(e.target.value)
                        )}
                        min={0}
                        max={11}
                        className="flex-1 p-[1.25rem] text-[1.5rem] font-black text-center bg-bg-accent border border-gray-800 text-white rounded-sm font-display focus:border-primary focus:shadow-neon outline-none"
                      />
                      <span className="text-gray-500 font-display uppercase tracking-[0.1em] text-[0.7rem]">in</span>
                    </div>
                    <div className="flex gap-[2px] bg-bg-accent rounded-sm p-[4px] border border-gray-800">
                      <button
                        className={`py-[6px] px-[12px] text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
                        onClick={() => setUseMetricHeight(true)}
                      >
                        cm
                      </button>
                      <button
                        className={`py-[6px] px-[12px] text-[0.65rem] font-extrabold font-display uppercase rounded-xs transition-all duration-fast ${!useMetricHeight ? 'bg-gray-800 text-primary' : 'bg-transparent text-gray-500'}`}
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
              <div className="w-[80px] h-[80px] rounded-sm flex items-center justify-center mb-xl border border-gray-800 bg-bg-accent text-primary">
                <Activity size={32} />
              </div>
              <h2 className="text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Activity Level</h2>
              <p className="text-gray-400 mb-xl text-[0.9rem]">How active are you on a typical week?</p>

              <div className="w-full flex flex-col gap-sm">
                {[
                  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
                  { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
                  { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
                  { value: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
                  { value: 'very_active', label: 'Extra Active', desc: 'Very hard exercise & physical job' }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`flex flex-col items-start p-lg bg-bg-accent border rounded-sm text-left transition-all duration-fast relative hover:border-gray-500 ${stats.activityLevel === option.value ? 'bg-primary/5 border-primary' : 'border-gray-800'}`}
                    onClick={() => setStats({...stats, activityLevel: option.value})}
                  >
                    <span className="font-extrabold font-display uppercase tracking-[0.05em] text-white mb-1 text-[0.85rem]">{option.label}</span>
                    <span className="text-[0.75rem] text-gray-500">{option.desc}</span>
                    {stats.activityLevel === option.value && <Check size={20} className="absolute right-lg top-1/2 -translate-y-1/2 text-primary drop-shadow-[0_0_5px_var(--color-primary-glow)]" />}
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
              <div className="w-[80px] h-[80px] rounded-sm flex items-center justify-center mb-xl border border-gray-800 bg-bg-accent text-primary">
                <Target size={32} />
              </div>
              <h2 className="text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Your Goal</h2>
              <p className="text-gray-400 mb-xl text-[0.9rem]">What are you looking to achieve?</p>

              <div className="w-full flex flex-col gap-md">
                <button
                  className={`flex flex-col items-center p-xl bg-bg-accent border rounded-md transition-all duration-fast hover:border-gray-500 ${stats.goal === 'lose' ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(0,242,255,0.1)]' : 'border-gray-800'}`}
                  onClick={() => setStats({...stats, goal: 'lose'})}
                >
                  <span className="text-[2rem] mb-md drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">📉</span>
                  <span className="font-extrabold font-display uppercase text-white mb-1 text-[0.9rem]">Lose Weight</span>
                  <span className="text-[0.75rem] text-gray-500">Calorie deficit for fat loss</span>
                </button>

                <button
                  className={`flex flex-col items-center p-xl bg-bg-accent border rounded-md transition-all duration-fast hover:border-gray-500 ${stats.goal === 'maintain' ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(0,242,255,0.1)]' : 'border-gray-800'}`}
                  onClick={() => setStats({...stats, goal: 'maintain'})}
                >
                  <span className="text-[2rem] mb-md drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">⚖️</span>
                  <span className="font-extrabold font-display uppercase text-white mb-1 text-[0.9rem]">Maintain</span>
                  <span className="text-[0.75rem] text-gray-500">Stay at current weight</span>
                </button>

                <button
                  className={`flex flex-col items-center p-xl bg-bg-accent border rounded-md transition-all duration-fast hover:border-gray-500 ${stats.goal === 'gain' ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(0,242,255,0.1)]' : 'border-gray-800'}`}
                  onClick={() => setStats({...stats, goal: 'gain'})}
                >
                  <span className="text-[2rem] mb-md drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">💪</span>
                  <span className="font-extrabold font-display uppercase text-white mb-1 text-[0.9rem]">Build Muscle</span>
                  <span className="text-[0.75rem] text-gray-500">Calorie surplus for gains</span>
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
              <div className="w-[80px] h-[80px] rounded-sm flex items-center justify-center mb-xl border border-success/50 bg-success/10 text-success shadow-[0_0_20px_rgba(57,255,20,0.1)]">
                <Sparkles size={32} />
              </div>
              <h2 className="text-[1.5rem] font-black font-display uppercase tracking-[0.1em] text-white mb-md">Your Personalized Plan</h2>
              <p className="text-gray-400 mb-xl text-[0.9rem]">Based on your stats and goals</p>

              <div className="w-full bg-bg-accent rounded-md p-[2rem] mb-lg border border-gray-800 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)]">
                <div className="text-center mb-xl pb-xl border-b border-gray-800">
                  <span className="block font-display text-[3.5rem] font-black text-primary leading-none shadow-neon">{targets.calories}</span>
                  <span className="block text-[0.75rem] font-display uppercase tracking-[0.2em] text-gray-500 mt-2">daily calories</span>
                </div>

                <div className="grid grid-cols-3 gap-md text-center">
                  <div className="flex flex-col">
                    <span className="font-display text-[1.5rem] font-black text-white">{targets.protein}g</span>
                    <span className="text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em] mt-1">Protein</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-[1.5rem] font-black text-white">{targets.carbs}g</span>
                    <span className="text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em] mt-1">Carbs</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-[1.5rem] font-black text-white">{targets.fat}g</span>
                    <span className="text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em] mt-1">Fat</span>
                  </div>
                </div>

                <div className="mt-xl pt-lg border-t border-gray-800 text-center">
                  <p className="text-[0.75rem] font-display text-gray-600 m-0 uppercase tracking-[0.05em]">BMR: {targets.bmr} CAL • TDEE: {targets.tdee} CAL</p>
                </div>
              </div>

              <p className="text-[0.7rem] text-gray-700 uppercase tracking-[0.05em] m-0">
                These are estimates. Adjust based on your progress and how you feel.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className={`flex items-center mt-auto pt-[3rem] gap-lg ${step !== 'welcome' && step !== 'results' ? 'justify-between' : 'justify-center'}`}>
          {step !== 'welcome' && step !== 'results' && (
            <button className="flex items-center gap-xs p-3 px-5 bg-transparent text-gray-500 font-extrabold font-display uppercase tracking-[0.1em] text-[0.7rem] rounded-sm transition-all duration-fast hover:text-white hover:bg-white/5" onClick={handleBack}>
              <ArrowLeft size={20} />
              Back
            </button>
          )}
          
          {step === 'welcome' && (
            <button className="flex items-center gap-sm p-3 px-6 bg-primary text-bg-deep font-extrabold font-display uppercase tracking-[0.1em] text-[0.75rem] rounded-sm shadow-neon transition-all duration-fast hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:-translate-y-[2px]" onClick={handleNext}>
              Get Started
              <ArrowRight size={20} />
            </button>
          )}

          {step !== 'welcome' && step !== 'results' && (
            <button className="flex items-center gap-sm p-3 px-6 bg-primary text-bg-deep font-extrabold font-display uppercase tracking-[0.1em] text-[0.75rem] rounded-sm shadow-neon transition-all duration-fast hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:-translate-y-[2px]" onClick={handleNext}>
              Continue
              <ArrowRight size={20} />
            </button>
          )}

          {step === 'results' && (
            <button 
              className="w-full p-xl bg-secondary text-white font-extrabold font-display uppercase tracking-[0.2em] text-[0.9rem] rounded-sm shadow-[0_0_20px_var(--color-secondary-glow)] transition-all duration-fast hover:bg-white hover:text-secondary hover:shadow-[0_0_30px_var(--color-secondary-glow)] disabled:opacity-30 disabled:cursor-not-allowed" 
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Start Tracking'}
            </button>
          )}
        </div>

        {step === 'welcome' && (
          <button className="block w-full mt-xl p-sm bg-transparent text-gray-700 text-[0.7rem] font-display uppercase tracking-[0.1em] text-center transition-all duration-fast hover:text-gray-500" onClick={handleSkip} disabled={loading}>
            {loading ? 'Initializing...' : 'Skip for now'}
          </button>
        )}
      </div>
    </div>
  );
}
