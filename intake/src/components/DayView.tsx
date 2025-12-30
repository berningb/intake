import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Beef, Wheat, Droplets, Plus, Trash2, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useNavigate } from 'react-router-dom';
import styles from './DayView.module.css';

import { DayViewProps } from '../types';
import { Scan } from '../pages/Scan';

export function DayView({ onClose, isModal = false }: DayViewProps) {
  const { userData } = useAuth();
  const { currentDate, setCurrentDate, currentLedger, loading, getTotals, removeFoodEntry, removeActivityEntry } = useLedger();
  const navigate = useNavigate();
  
  const [showScan, setShowScan] = useState(false);
  
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isModal]);

  const totals = getTotals();
  const metrics = userData?.dailyMetrics || { calories: 2000 };

  // Determine food quality based on protein-to-calorie ratio and nutritional balance
  const getFoodQuality = (nutrition: { calories: number; protein: number; carbs: number; fat: number }) => {
    if (!nutrition.calories || nutrition.calories === 0) return 'neutral';
    
    const proteinCalRatio = (nutrition.protein * 4) / nutrition.calories; // Protein cals / total cals
    const fatCalRatio = (nutrition.fat * 9) / nutrition.calories;
    
    // High protein foods (>25% of calories from protein) = good
    if (proteinCalRatio >= 0.25 && fatCalRatio < 0.5) return 'good';
    
    // Very high fat (>60% cals from fat) or high calories with almost no protein
    if (fatCalRatio >= 0.6 || (nutrition.calories > 400 && proteinCalRatio < 0.1)) return 'bad';
    
    // Moderate protein or slightly high fat = caution
    if (proteinCalRatio < 0.2 || fatCalRatio > 0.4) return 'caution';
    
    return 'neutral';
  };

  const changeDate = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    setCurrentDate(newDate);
  };

  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const caloriePercent = metrics.calories 
    ? Math.min(100, (totals.calories / metrics.calories) * 100) 
    : 0;

  // Determine overall day status
  const getDayStatus = () => {
    if (!currentLedger?.foods || currentLedger.foods.length === 0) {
      return { status: 'empty', label: 'No meals logged', icon: null, description: 'Start tracking to see your progress!' };
    }
    
    const proteinTarget = metrics.protein || 150;
    const calorieTarget = metrics.calories || 2000;
    const calorieDiff = (totals.calories - calorieTarget) / calorieTarget;
    const hitProtein = totals.protein >= proteinTarget * 0.9;
    
    if (Math.abs(calorieDiff) <= 0.1 && hitProtein) {
      return { status: 'good', label: 'Perfect Balance', icon: CheckCircle, description: 'You hit your calorie target and got enough protein!' };
    } else if (calorieDiff > 0.1) {
      return { status: 'over', label: 'Over Target', icon: XCircle, description: `You are ${Math.round(calorieDiff * 100)}% over your calorie budget.` };
    } else if (calorieDiff < -0.2) {
      return { status: 'under', label: 'Under Target', icon: AlertCircle, description: 'You still have plenty of room for more nutrients today.' };
    } else if (!hitProtein) {
      return { status: 'caution', label: 'Low Protein', icon: AlertCircle, description: 'Calories are okay, but try to get more protein.' };
    } else {
      return { status: 'good', label: 'On Track', icon: CheckCircle, description: 'You are doing great so far!' };
    }
  };

  const dayStatus = getDayStatus();

  const getMacroPercent = (current: number, target?: number) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: isModal ? 0 : 10, x: isModal ? 20 : 0 },
    show: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.03
      }
    },
    exit: { 
      opacity: 0, 
      y: isModal ? 0 : -10,
      x: isModal ? 20 : 0,
      transition: { duration: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const content = (
    <motion.div 
      key="content"
      className={`${styles.dayView} ${isModal ? styles.modal : ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <motion.header className={styles.header} variants={itemVariants}>
        <div className={styles.headerTop}>
          <div className={styles.greeting}>
            <h1>{format(currentDate, 'MMMM d, yyyy')}</h1>
            <p className={styles.tagline}>
              {isToday ? "Today's Progress" : "Viewing Past Performance"}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className={styles.closeBtn}>
              <X size={24} />
            </button>
          )}
        </div>
        
        <div className={styles.dateNav}>
          <button onClick={() => changeDate(-1)} className={styles.dateBtn}>
            <ChevronLeft size={20} />
          </button>
          <div className={styles.datePickerContainer}>
            <button 
              className={styles.dateDisplay}
              onClick={() => document.getElementById('day-view-date-picker')?.showPicker()}
            >
              {isToday ? 'Today' : format(currentDate, 'EEE, MMM d')}
            </button>
            <input 
              type="date" 
              id="day-view-date-picker"
              className={styles.hiddenDatePicker}
              value={format(currentDate, 'yyyy-MM-dd')}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                const date = new Date(e.target.value);
                const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
                setCurrentDate(adjustedDate);
              }}
            />
          </div>
          <button 
            onClick={() => changeDate(1)} 
            className={styles.dateBtn}
            disabled={isToday}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </motion.header>

      <motion.section className={styles.summaryCard} variants={itemVariants}>
        <div className={styles.calorieMain}>
          <div className={styles.calorieRing}>
            <svg viewBox="0 0 100 100" className={styles.ringChart}>
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--color-bg-accent)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={caloriePercent > 100 ? 'var(--color-error)' : 'var(--color-primary)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${caloriePercent * 2.64} 264`}
                className={styles.ringProgress}
              />
            </svg>
            <div className={styles.calorieText}>
              <span className={styles.calorieValue}>{Math.round(totals.calories)}</span>
              <span className={styles.calorieLabel}>/ {metrics.calories || '---'} CAL</span>
            </div>
          </div>
          
          <div className={styles.calorieInfo}>
            <Flame className={styles.flameIcon} />
            <div>
              <span className={styles.remaining}>
                {metrics.calories ? Math.max(0, metrics.calories - totals.calories) : '---'}
              </span>
              <span className={styles.remainingLabel}>calories remaining</span>
            </div>
          </div>
          
          {dayStatus.icon && (
            <div className={`${styles.dayStatus} ${styles[dayStatus.status]}`}>
              <div className={styles.statusHeader}>
                <dayStatus.icon size={20} />
                <span>{dayStatus.label}</span>
              </div>
              <p className={styles.statusDescription}>{dayStatus.description}</p>
            </div>
          )}
        </div>

        <div className={styles.macros}>
          <div className={styles.macroItem}>
            <div className={styles.macroHeader}>
              <Beef size={16} />
              <span>Protein</span>
            </div>
            <div className={styles.macroBar}>
              <div 
                className={styles.macroProgress} 
                style={{ 
                  width: `${getMacroPercent(totals.protein, metrics.protein)}%`,
                  background: 'var(--color-primary)'
                }} 
              />
            </div>
            <span className={styles.macroValue}>
              {Math.round(totals.protein)}g / {metrics.protein || '---'}g
            </span>
          </div>
          
          <div className={styles.macroItem}>
            <div className={styles.macroHeader}>
              <Wheat size={16} />
              <span>Carbs</span>
            </div>
            <div className={styles.macroBar}>
              <div 
                className={styles.macroProgress}
                style={{ 
                  width: `${getMacroPercent(totals.carbs, metrics.carbs)}%`,
                  background: 'var(--color-secondary)'
                }} 
              />
            </div>
            <span className={styles.macroValue}>
              {Math.round(totals.carbs)}g / {metrics.carbs || '---'}g
            </span>
          </div>
          
          <div className={styles.macroItem}>
            <div className={styles.macroHeader}>
              <Droplets size={16} />
              <span>Fat</span>
            </div>
            <div className={styles.macroBar}>
              <div 
                className={styles.macroProgress}
                style={{ 
                  width: `${getMacroPercent(totals.fat, metrics.fat)}%`,
                  background: 'var(--color-warning)'
                }} 
              />
            </div>
            <span className={styles.macroValue}>
              {Math.round(totals.fat)}g / {metrics.fat || '---'}g
            </span>
          </div>
        </div>
      </motion.section>

      <motion.section className={styles.ledgerSection} variants={itemVariants}>
        <div className={styles.sectionHeader}>
          <h2>Meals</h2>
          <div className={styles.headerActions}>
            <button className={styles.addBtn} onClick={() => setShowScan(true)}>
              <Plus size={18} />
              Search & Scan
            </button>
          </div>
        </div>

        {(!currentLedger?.foods || currentLedger.foods.length === 0) ? (
          <div className={styles.emptyState}>
            <p>No meals logged yet</p>
            <button className="btn-primary" onClick={() => setShowScan(true)}>
              Log your first meal
            </button>
          </div>
        ) : (
          <div className={styles.foodList}>
            {currentLedger.foods.map((food, index) => {
              const nutrition = food.finalNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
              const quality = getFoodQuality(nutrition);
              return (
                <motion.div 
                  key={food.id} 
                  className={`${styles.foodItem} ${styles[quality]}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {food.imageUrl && (
                    <img src={food.imageUrl} alt={food.name} className={styles.foodImage} />
                  )}
                  <div className={styles.foodInfo}>
                    <span className={styles.foodName}>{food.name}</span>
                    <span className={styles.foodMeta}>
                      {food.portionDescription && `${food.portionDescription} • `}
                      {nutrition.calories} CAL
                    </span>
                  </div>
                  <div className={styles.foodNutrition}>
                    <span>{nutrition.protein}g P</span>
                    <span>{nutrition.carbs}g C</span>
                    <span>{nutrition.fat}g F</span>
                  </div>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => removeFoodEntry(food.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {currentLedger?.activities && currentLedger.activities.length > 0 && (
        <motion.section className={styles.ledgerSection} variants={itemVariants}>
          <div className={styles.sectionHeader}>
            <h2>Activities</h2>
          </div>
          <div className={styles.foodList}>
            {currentLedger.activities.map((activity, index) => (
              <motion.div 
                key={activity.id} 
                className={styles.foodItem}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={styles.foodInfo}>
                  <span className={styles.foodName}>{activity.routineName || activity.type}</span>
                  <span className={styles.foodMeta}>
                    {activity.exercises.filter(e => e.completed).length}/{activity.exercises.length} exercises
                    {activity.duration && ` • ${activity.duration} min`}
                  </span>
                </div>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => removeActivityEntry(activity.id)}
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      <AnimatePresence>
        {showScan && (
          <Scan 
            isModal={true} 
            onClose={() => setShowScan(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  const mainContent = (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div 
          key="loading"
          className={styles.loading}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div className={styles.skeleton} style={{ width: '200px', height: '32px' }} />
          <div className={styles.skeleton} style={{ width: '100%', height: '200px', marginTop: '24px' }} />
        </motion.div>
      ) : content}
    </AnimatePresence>
  );

  if (isModal) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
          {mainContent}
        </div>
      </div>
    );
  }

  return mainContent;
}
