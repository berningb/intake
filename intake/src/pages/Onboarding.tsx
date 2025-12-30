import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Scale, Ruler, Target, Activity, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Onboarding.module.css';

type Step = 'welcome' | 'basics' | 'body' | 'activity' | 'goal' | 'results';

interface UserStats {
  age: number;
  gender: 'male' | 'female';
  weight: number; // kg
  height: number; // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
}

interface CalculatedTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

export function Onboarding() {
  const navigate = useNavigate();
  const { updateUserData } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState<UserStats>({
    age: 25,
    gender: 'male',
    weight: 70,
    height: 170,
    activityLevel: 'moderate',
    goal: 'maintain'
  });

  const [targets, setTargets] = useState<CalculatedTargets | null>(null);
  
  // Unit preferences
  const [useMetricWeight, setUseMetricWeight] = useState(true);
  const [useMetricHeight, setUseMetricHeight] = useState(true);

  // Conversion helpers
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
  const lbsToKg = (lbs: number) => lbs / 2.20462;
  const cmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };
  const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;

  // Get display values based on unit preference
  const displayWeight = useMetricWeight ? stats.weight : kgToLbs(stats.weight);
  const displayHeight = useMetricHeight ? stats.height : cmToFeetInches(stats.height);

  const handleWeightChange = (value: number) => {
    const weightInKg = useMetricWeight ? value : lbsToKg(value);
    setStats({ ...stats, weight: weightInKg });
  };

  const handleHeightChange = (feet: number, inches: number) => {
    const heightInCm = feetInchesToCm(feet, inches);
    setStats({ ...stats, height: heightInCm });
  };

  const steps: Step[] = ['welcome', 'basics', 'body', 'activity', 'goal', 'results'];
  const currentIndex = steps.indexOf(step);

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const calculateTargets = (): CalculatedTargets => {
    // Mifflin-St Jeor Equation for BMR
    let bmr: number;
    if (stats.gender === 'male') {
      bmr = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age + 5;
    } else {
      bmr = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age - 161;
    }

    // Calculate TDEE
    const tdee = bmr * activityMultipliers[stats.activityLevel];

    // Adjust calories based on goal
    let calories: number;
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
    // Protein: 1.6-2.2g per kg for active individuals, using 1.8g
    const protein = Math.round(stats.weight * 1.8);
    
    // Fat: 25-30% of calories, using 27%
    const fatCalories = calories * 0.27;
    const fat = Math.round(fatCalories / 9);
    
    // Carbs: remainder
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
      } as any);
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
      } as any);
      navigate('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundPattern}>
        <div className={styles.circle1} />
        <div className={styles.circle2} />
      </div>

      <div className={styles.card}>
        {/* Progress */}
        {step !== 'welcome' && (
          <div className={styles.progress}>
            {steps.slice(1).map((s, i) => (
              <div 
                key={s} 
                className={`${styles.progressDot} ${steps.indexOf(s) <= currentIndex ? styles.active : ''}`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Welcome */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              className={styles.stepContent}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className={styles.welcomeIcon}>
                <Sparkles size={48} />
              </div>
              <h1>Welcome to Intake</h1>
              <p>Let's personalize your nutrition targets based on your body and goals.</p>
              <p className={styles.subtext}>This takes about 1 minute</p>
            </motion.div>
          )}

          {/* Basics - Age & Gender */}
          {step === 'basics' && (
            <motion.div
              key="basics"
              className={styles.stepContent}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <h2>The Basics</h2>
              <p>Tell us a bit about yourself</p>

              <div className={styles.formGroup}>
                <label>Age</label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    value={stats.age}
                    onChange={(e) => setStats({...stats, age: Number(e.target.value)})}
                    min={13}
                    max={100}
                  />
                  <span>years</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Gender</label>
                <div className={styles.toggleGroup}>
                  <button
                    className={`${styles.toggleBtn} ${stats.gender === 'male' ? styles.active : ''}`}
                    onClick={() => setStats({...stats, gender: 'male'})}
                  >
                    Male
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${stats.gender === 'female' ? styles.active : ''}`}
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
              className={styles.stepContent}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className={styles.stepIcon}>
                <Scale size={32} />
              </div>
              <h2>Your Body</h2>
              <p>We'll use this to calculate your metabolism</p>

              <div className={styles.formGroup}>
                <label>Weight</label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    value={Math.round(displayWeight)}
                    onChange={(e) => handleWeightChange(Number(e.target.value))}
                    min={useMetricWeight ? 30 : 66}
                    max={useMetricWeight ? 300 : 660}
                  />
                  <div className={styles.unitToggle}>
                    <button
                      className={`${styles.unitBtn} ${useMetricWeight ? styles.active : ''}`}
                      onClick={() => setUseMetricWeight(true)}
                    >
                      kg
                    </button>
                    <button
                      className={`${styles.unitBtn} ${!useMetricWeight ? styles.active : ''}`}
                      onClick={() => setUseMetricWeight(false)}
                    >
                      lbs
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Height</label>
                {useMetricHeight ? (
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      value={Math.round(stats.height)}
                      onChange={(e) => setStats({...stats, height: Number(e.target.value)})}
                      min={100}
                      max={250}
                    />
                    <div className={styles.unitToggle}>
                      <button
                        className={`${styles.unitBtn} ${useMetricHeight ? styles.active : ''}`}
                        onClick={() => setUseMetricHeight(true)}
                      >
                        cm
                      </button>
                      <button
                        className={`${styles.unitBtn} ${!useMetricHeight ? styles.active : ''}`}
                        onClick={() => setUseMetricHeight(false)}
                      >
                        ft/in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.heightImperial}>
                    <div className={styles.inputWithUnit}>
                      <input
                        type="number"
                        value={(displayHeight as { feet: number; inches: number }).feet}
                        onChange={(e) => handleHeightChange(
                          Number(e.target.value),
                          (displayHeight as { feet: number; inches: number }).inches
                        )}
                        min={3}
                        max={8}
                      />
                      <span>ft</span>
                    </div>
                    <div className={styles.inputWithUnit}>
                      <input
                        type="number"
                        value={(displayHeight as { feet: number; inches: number }).inches}
                        onChange={(e) => handleHeightChange(
                          (displayHeight as { feet: number; inches: number }).feet,
                          Number(e.target.value)
                        )}
                        min={0}
                        max={11}
                      />
                      <span>in</span>
                    </div>
                    <div className={styles.unitToggle}>
                      <button
                        className={`${styles.unitBtn} ${useMetricHeight ? styles.active : ''}`}
                        onClick={() => setUseMetricHeight(true)}
                      >
                        cm
                      </button>
                      <button
                        className={`${styles.unitBtn} ${!useMetricHeight ? styles.active : ''}`}
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
              className={styles.stepContent}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className={styles.stepIcon}>
                <Activity size={32} />
              </div>
              <h2>Activity Level</h2>
              <p>How active are you on a typical week?</p>

              <div className={styles.optionsList}>
                {[
                  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
                  { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
                  { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
                  { value: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
                  { value: 'very_active', label: 'Extra Active', desc: 'Very hard exercise & physical job' }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.optionBtn} ${stats.activityLevel === option.value ? styles.active : ''}`}
                    onClick={() => setStats({...stats, activityLevel: option.value as any})}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    <span className={styles.optionDesc}>{option.desc}</span>
                    {stats.activityLevel === option.value && <Check size={20} className={styles.checkIcon} />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Goal */}
          {step === 'goal' && (
            <motion.div
              key="goal"
              className={styles.stepContent}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className={styles.stepIcon}>
                <Target size={32} />
              </div>
              <h2>Your Goal</h2>
              <p>What are you looking to achieve?</p>

              <div className={styles.goalCards}>
                <button
                  className={`${styles.goalCard} ${stats.goal === 'lose' ? styles.active : ''}`}
                  onClick={() => setStats({...stats, goal: 'lose'})}
                >
                  <span className={styles.goalEmoji}>📉</span>
                  <span className={styles.goalTitle}>Lose Weight</span>
                  <span className={styles.goalDesc}>Calorie deficit for fat loss</span>
                </button>

                <button
                  className={`${styles.goalCard} ${stats.goal === 'maintain' ? styles.active : ''}`}
                  onClick={() => setStats({...stats, goal: 'maintain'})}
                >
                  <span className={styles.goalEmoji}>⚖️</span>
                  <span className={styles.goalTitle}>Maintain</span>
                  <span className={styles.goalDesc}>Stay at current weight</span>
                </button>

                <button
                  className={`${styles.goalCard} ${stats.goal === 'gain' ? styles.active : ''}`}
                  onClick={() => setStats({...stats, goal: 'gain'})}
                >
                  <span className={styles.goalEmoji}>💪</span>
                  <span className={styles.goalTitle}>Build Muscle</span>
                  <span className={styles.goalDesc}>Calorie surplus for gains</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {step === 'results' && targets && (
            <motion.div
              key="results"
              className={styles.stepContent}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className={styles.resultsIcon}>
                <Sparkles size={32} />
              </div>
              <h2>Your Personalized Plan</h2>
              <p>Based on your stats and goals</p>

              <div className={styles.resultsCard}>
                <div className={styles.mainStat}>
                  <span className={styles.mainValue}>{targets.calories}</span>
                  <span className={styles.mainLabel}>daily calories</span>
                </div>

                <div className={styles.macroStats}>
                  <div className={styles.macroStat}>
                    <span className={styles.macroValue}>{targets.protein}g</span>
                    <span className={styles.macroLabel}>Protein</span>
                  </div>
                  <div className={styles.macroStat}>
                    <span className={styles.macroValue}>{targets.carbs}g</span>
                    <span className={styles.macroLabel}>Carbs</span>
                  </div>
                  <div className={styles.macroStat}>
                    <span className={styles.macroValue}>{targets.fat}g</span>
                    <span className={styles.macroLabel}>Fat</span>
                  </div>
                </div>

                <div className={styles.breakdown}>
                  <p>BMR: {targets.bmr} CAL • TDEE: {targets.tdee} CAL</p>
                </div>
              </div>

              <p className={styles.disclaimer}>
                These are estimates. Adjust based on your progress and how you feel.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className={`${styles.navigation} ${step !== 'welcome' && step !== 'results' ? styles.hasBack : ''}`}>
          {step !== 'welcome' && step !== 'results' && (
            <button className={styles.backBtn} onClick={handleBack}>
              <ArrowLeft size={20} />
              Back
            </button>
          )}
          
          {step === 'welcome' && (
            <button className={styles.nextBtn} onClick={handleNext}>
              Get Started
              <ArrowRight size={20} />
            </button>
          )}

          {step !== 'welcome' && step !== 'results' && (
            <button className={styles.nextBtn} onClick={handleNext}>
              Continue
              <ArrowRight size={20} />
            </button>
          )}

          {step === 'results' && (
            <button 
              className={styles.completeBtn} 
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Start Tracking'}
            </button>
          )}
        </div>

        {step === 'welcome' && (
          <button className={styles.skipBtn} onClick={handleSkip} disabled={loading}>
            {loading ? 'Initializing...' : 'Skip for now'}
          </button>
        )}
      </div>
    </div>
  );
}

