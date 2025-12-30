import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Beef, Wheat, Droplets, Plus, Trash2, CheckCircle, AlertCircle, XCircle, X, Calendar, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useNavigate } from 'react-router-dom';
import { Scan } from '../pages/Scan';
import { LiquidProgressBar } from './LiquidProgressBar';
import { BountyBoard } from './BountyBoard';

export function DayView({ onClose, isModal = false }) {
  const { userData } = useAuth();
  const { currentDate, setCurrentDate, currentLedger, loading, getTotals, removeFoodEntry, removeActivityEntry, updateWater, getConsumptionStats, getLedgersForDateRange } = useLedger();
  const navigate = useNavigate();
  
  const [showScan, setShowScan] = useState(false);
  const [weekLedgers, setWeekLedgers] = useState(new Map());
  const [stats, setStats] = useState({
    protein: { avgEntries: 3 },
    carbs: { avgEntries: 3 },
    fat: { avgEntries: 2 },
    water: { avgEntries: 8 }
  });

  // Calculate the current week range (Always last 7 days from today)
  const weekDays = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 6);
    return eachDayOfInterval({ start, end: today });
  }, []);

  useEffect(() => {
    async function fetchWeekData() {
      const today = new Date();
      const startStr = format(subDays(today, 6), 'yyyy-MM-dd');
      const endStr = format(today, 'yyyy-MM-dd');
      const data = await getLedgersForDateRange(startStr, endStr);
      setWeekLedgers(data);
    }
    fetchWeekData();
  }, [getLedgersForDateRange]);

  useEffect(() => {
    if (currentLedger) {
      setStats(getConsumptionStats());
    }
  }, [currentLedger, getConsumptionStats]);
  
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
  const getFoodQuality = (nutrition) => {
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

  const changeDate = (delta) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = subDays(today, 6);
    
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    newDate.setHours(0, 0, 0, 0);
    
    if (newDate < minDate || newDate > today) return;
    
    setCurrentDate(newDate);
  };

  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isMinDate = format(currentDate, 'yyyy-MM-dd') === format(subDays(new Date(), 6), 'yyyy-MM-dd');

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

  const getMacroPercent = (current, target) => {
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
      className={`max-w-[900px] w-full mx-auto ${isModal ? 'max-w-[700px] p-xl' : ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <motion.header className="mb-md pb-md border-b border-gray-800" variants={itemVariants}>
        <div className="flex justify-between items-start mb-sm">
          <div className="greeting">
            <h1 className="text-[1.5rem] font-black mb-xs font-display text-white uppercase tracking-[0.1em]">{format(currentDate, 'MMMM d, yyyy')}</h1>
            <p className="text-primary m-0 text-[0.7rem] font-display uppercase tracking-[0.2em] opacity-70">
              {isToday ? "Today's Progress" : "Viewing Past Performance"}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-xs text-gray-500 bg-transparent rounded-sm transition-all duration-fast hover:bg-error/10 hover:text-error">
              <X size={24} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-xs bg-bg-accent p-[4px] rounded-sm border border-gray-800 w-fit">
          <button 
            onClick={() => changeDate(-1)} 
            className="p-xs rounded-xs bg-transparent text-gray-500 flex items-center justify-center transition-all duration-fast hover:bg-gray-800 hover:text-primary disabled:opacity-10"
            disabled={isMinDate}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="relative flex items-center">
            <button 
              className="font-bold min-w-[140px] text-center text-[0.75rem] text-white font-display bg-transparent py-xs px-sm uppercase tracking-[0.05em] hover:bg-white/5"
              onClick={() => document.getElementById('day-view-date-picker')?.showPicker()}
            >
              {isToday ? 'Today' : format(currentDate, 'EEE, MMM d')}
            </button>
            <input 
              type="date" 
              id="day-view-date-picker"
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              value={format(currentDate, 'yyyy-MM-dd')}
              min={format(subDays(new Date(), 6), 'yyyy-MM-dd')}
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
            className="p-xs rounded-xs bg-transparent text-gray-500 flex items-center justify-center transition-all duration-fast hover:bg-gray-800 hover:text-primary disabled:opacity-10 disabled:cursor-not-allowed"
            disabled={isToday}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekly Glance Bar */}
        <div className="flex gap-xs mt-md pb-xs overflow-x-auto no-scrollbar">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const ledger = weekLedgers.get(dateStr);
            const isSelected = isSameDay(day, currentDate);
            const hasData = ledger && ledger.foods.length > 0;
            
            // Calculate simple health score for the day
            let statusColor = 'bg-gray-800'; // No data
            let statusLabel = 'No logs';
            if (hasData) {
              const dayTotals = ledger.foods.reduce((acc, f) => ({
                cal: acc.cal + (f.finalNutrition?.calories || 0),
                p: acc.p + (f.finalNutrition?.protein || 0)
              }), { cal: 0, p: 0 });
              
              const targetCal = metrics.calories || 2000;
              const targetP = metrics.protein || 150;
              const calDiff = (dayTotals.cal - targetCal) / targetCal;
              const hitP = dayTotals.p >= targetP * 0.9;
              
              // Gamified Status Logic:
              if (Math.abs(calDiff) <= 0.1 && hitP) {
                // GOLD/CYAN GLOW: Perfect Balance
                statusColor = 'bg-primary shadow-[0_0_12px_var(--color-primary-glow)] scale-125';
                statusLabel = 'Perfect';
              } else if (calDiff <= 0.1 || hitP) {
                // CYAN: Close to targets or hit protein
                statusColor = 'bg-primary/40';
                statusLabel = 'Good';
              } else if (calDiff > 0.1) {
                // RED/SECONDARY: Over Calories
                statusColor = 'bg-secondary';
                statusLabel = 'Over Limit';
              } else {
                // AMBER/YELLOW: Under everything or slightly off
                statusColor = 'bg-warning/60';
                statusLabel = 'Under';
              }
            }

            return (
              <button
                key={dateStr}
                onClick={() => setCurrentDate(day)}
                title={hasData ? `${statusLabel}: ${Math.round(ledger.foods.reduce((sum, f) => sum + (f.finalNutrition?.calories || 0), 0))} cal` : 'No logs'}
                className={`flex flex-col items-center gap-[6px] min-w-[45px] p-xs rounded-sm border transition-all duration-fast ${
                  isSelected 
                    ? 'bg-primary/10 border-primary/50' 
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <span className={`text-[0.55rem] font-bold font-display uppercase tracking-tighter ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-[0.8rem] font-black font-display ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </span>
                <motion.div 
                  initial={false}
                  animate={hasData ? { scale: [1, 1.2, 1] } : {}}
                  className={`w-[4px] h-[4px] rounded-full transition-all duration-500 ${statusColor}`} 
                />
              </button>
            );
          })}
        </div>

        {/* Status Legend - Semi-transparent micro text */}
        <div className="flex flex-wrap gap-x-md gap-y-xs mt-xs px-xs opacity-50">
          <div className="flex items-center gap-xs">
            <div className="w-[3px] h-[3px] rounded-full bg-primary shadow-[0_0_4px_var(--color-primary-glow)]" />
            <span className="text-[0.5rem] font-display uppercase tracking-widest text-gray-500 font-bold">Perfect</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[3px] h-[3px] rounded-full bg-primary/40" />
            <span className="text-[0.5rem] font-display uppercase tracking-widest text-gray-500 font-bold">Good</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[3px] h-[3px] rounded-full bg-warning/60" />
            <span className="text-[0.5rem] font-display uppercase tracking-widest text-gray-500 font-bold">Under</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[3px] h-[3px] rounded-full bg-secondary" />
            <span className="text-[0.5rem] font-display uppercase tracking-widest text-gray-500 font-bold">Over</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[3px] h-[3px] rounded-full bg-gray-800" />
            <span className="text-[0.5rem] font-display uppercase tracking-widest text-gray-500 font-bold">No Log</span>
          </div>
        </div>
      </motion.header>

      <motion.section className="bg-bg-card rounded-md p-lg border border-gray-800 mb-md relative overflow-hidden" variants={itemVariants}>
        <div className="flex items-center gap-2xl mb-lg pb-lg border-b border-bg-accent max-md:flex-col max-md:gap-xl">
          <div className="relative w-[120px] h-[120px] shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--color-bg-accent)"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={caloriePercent > 100 ? 'var(--color-error)' : 'var(--color-primary)'}
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 264" }}
                animate={{ strokeDasharray: `${caloriePercent * 2.64} 264` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="drop-shadow-[0_0_8px_var(--color-primary-glow)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                key={totals.calories}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display text-[2rem] font-black text-white leading-none shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              >
                {Math.round(totals.calories)}
              </motion.span>
              <span className="text-[0.6rem] font-display uppercase tracking-[0.1em] text-gray-500 mt-[2px]">/ {metrics.calories || '---'} CAL</span>
            </div>
          </div>
          
          <div className="flex flex-1 items-center gap-md max-md:w-full max-md:justify-center">
            <Flame className="w-[32px] h-[32px] text-primary drop-shadow-[0_0_5px_var(--color-primary-glow)]" />
            <div>
              <span className="block font-display text-[1.5rem] font-black text-white leading-[1.1] tracking-[-0.02em]">
                {metrics.calories ? Math.max(0, metrics.calories - totals.calories) : '---'}
              </span>
              <span className="block font-display text-[0.6rem] uppercase tracking-[0.2em] text-gray-500">calories remaining</span>
            </div>
          </div>
          
          {dayStatus.icon && (
            <div className={`flex flex-col gap-xs p-md rounded-sm ml-auto min-w-[200px] border border-white/5 bg-white/2 max-md:ml-0 max-md:w-full ${
              dayStatus.status === 'good' ? 'text-success border-success/20 bg-success/5' :
              dayStatus.status === 'caution' ? 'text-warning border-warning/20 bg-warning/5' :
              dayStatus.status === 'over' ? 'text-error border-error/20 bg-error/5' :
              dayStatus.status === 'under' ? 'text-primary border-primary/20 bg-primary/5' : ''
            }`}>
              <div className="flex items-center gap-sm font-display font-black text-[0.75rem] uppercase tracking-[0.1em]">
                <dayStatus.icon size={20} />
                <span>{dayStatus.label}</span>
              </div>
              <p className="text-[0.7rem] m-0 opacity-60 leading-[1.5] text-gray-300">{dayStatus.description}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-xl max-md:grid-cols-2 max-md:gap-md">
          <LiquidProgressBar 
            label="Protein"
            current={totals.protein}
            target={metrics.protein}
            percentage={getMacroPercent(totals.protein, metrics.protein)}
            icon={Beef}
            colorClass="from-cyan-600 to-cyan-400"
            glowColor="rgba(0, 242, 255, 0.4)"
            segments={stats.protein.avgEntries}
          />
          
          <LiquidProgressBar 
            label="Carbs"
            current={totals.carbs}
            target={metrics.carbs}
            percentage={getMacroPercent(totals.carbs, metrics.carbs)}
            icon={Wheat}
            colorClass="from-amber-500 to-amber-300"
            glowColor="rgba(245, 158, 11, 0.4)"
            segments={stats.carbs.avgEntries}
          />
          
          <LiquidProgressBar 
            label="Fat"
            current={totals.fat}
            target={metrics.fat}
            percentage={getMacroPercent(totals.fat, metrics.fat)}
            icon={FlaskConical}
            colorClass="from-rose-600 to-rose-400"
            glowColor="rgba(225, 29, 72, 0.4)"
            segments={stats.fat.avgEntries}
          />

          <LiquidProgressBar 
            label="Water"
            current={currentLedger?.water || 0}
            target={userData?.preferences?.waterTarget || 2500}
            percentage={((currentLedger?.water || 0) / (userData?.preferences?.waterTarget || 2500)) * 100}
            icon={Droplets}
            colorClass="from-blue-600 to-blue-400"
            glowColor="rgba(59, 130, 246, 0.4)"
            unit="ml"
            onIncrease={() => updateWater(250)}
            onDecrease={() => updateWater(-250)}
            segments={stats.water.avgEntries}
          />
        </div>
      </motion.section>

      <motion.div variants={itemVariants} className="mb-lg">
        <BountyBoard />
      </motion.div>

      <motion.section className="bg-bg-card rounded-md p-xl border border-gray-800 mb-lg" variants={itemVariants}>
        <div className="flex justify-between items-center mb-md">
          <h2 className="text-[0.9rem] font-black text-white font-display uppercase tracking-[0.1em]">Meals</h2>
          <div className="flex gap-sm">
            <button className="flex items-center gap-sm py-[6px] px-md bg-transparent text-primary border border-primary rounded-xs font-extrabold font-display text-[0.65rem] uppercase tracking-[0.1em] transition-all duration-fast hover:bg-primary hover:text-bg-deep hover:shadow-neon" onClick={() => setShowScan(true)}>
              <Plus size={18} />
              Search & Scan
            </button>
          </div>
        </div>

        {(!currentLedger?.foods || currentLedger.foods.length === 0) ? (
          <div className="text-center p-xl text-gray-500 font-display text-[0.75rem] uppercase tracking-[0.1em]">
            <p className="mb-md">No meals logged yet</p>
            <button className="btn-primary" onClick={() => setShowScan(true)}>
              Log your first meal
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-md max-h-[500px] overflow-y-auto pr-xs scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {currentLedger.foods.map((food, index) => {
              const nutrition = food.finalNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
              const quality = getFoodQuality(nutrition);
              return (
                <motion.div 
                  key={food.id} 
                  className={`flex items-center gap-md p-md bg-bg-card rounded-sm transition-all duration-fast border border-gray-800 relative hover:border-primary hover:bg-primary/3 hover:translate-x-1 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gray-700 ${
                    quality === 'good' ? 'before:bg-success' :
                    quality === 'caution' ? 'before:bg-warning' :
                    quality === 'bad' ? 'before:bg-error' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {food.imageUrl && (
                    <img src={food.imageUrl} alt={food.name} className="w-[48px] h-[48px] rounded-xs object-cover shrink-0 border border-gray-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-white font-display text-[0.85rem] mb-[2px] uppercase tracking-[0.05em]">{food.name}</span>
                    <span className="text-[0.65rem] text-gray-500 font-display uppercase tracking-[0.05em]">
                      {food.portionDescription && `${food.portionDescription} • `}
                      {nutrition.calories} CAL
                    </span>
                  </div>
                  <div className="flex gap-md font-display font-extrabold text-[0.75rem] text-primary max-md:hidden">
                    <span className="whitespace-nowrap">{nutrition.protein}g P</span>
                    <span className="whitespace-nowrap">{nutrition.carbs}g C</span>
                    <span className="whitespace-nowrap">{nutrition.fat}g F</span>
                  </div>
                  <button 
                    className="p-xs bg-transparent text-gray-700 rounded-xs opacity-30 transition-all duration-fast hover:opacity-100 hover:text-error hover:bg-error/10"
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
        <motion.section className="bg-bg-card rounded-md p-xl border border-gray-800 mb-lg" variants={itemVariants}>
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-[0.9rem] font-black text-white font-display uppercase tracking-[0.1em]">Activities</h2>
          </div>
          <div className="flex flex-col gap-md">
            {currentLedger.activities.map((activity, index) => (
              <motion.div 
                key={activity.id} 
                className="flex items-center gap-md p-md bg-bg-card rounded-sm transition-all duration-fast border border-gray-800 relative hover:border-primary hover:bg-primary/3 hover:translate-x-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex-1 min-w-0">
                  <span className="block font-bold text-white font-display text-[0.85rem] mb-[2px] uppercase tracking-[0.05em]">{activity.routineName || activity.type}</span>
                  <span className="text-[0.65rem] text-gray-500 font-display uppercase tracking-[0.05em]">
                    {activity.exercises.filter(e => e.completed).length}/{activity.exercises.length} exercises
                    {activity.duration && ` • ${activity.duration} min`}
                  </span>
                </div>
                <button 
                  className="p-xs bg-transparent text-gray-700 rounded-xs opacity-30 transition-all duration-fast hover:opacity-100 hover:text-error hover:bg-error/10"
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
          className="flex flex-col gap-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div className="bg-[linear-gradient(90deg,var(--color-bg-accent)_25%,var(--color-bg-card)_50%,var(--color-bg-accent)_75%)] bg-[length:200%_100%] animate-[skeleton-loading_1.5s_infinite] rounded-md w-[200px] h-[32px]" />
          <div className="bg-[linear-gradient(90deg,var(--color-bg-accent)_25%,var(--color-bg-card)_50%,var(--color-bg-accent)_75%)] bg-[length:200%_100%] animate-[skeleton-loading_1.5s_infinite] rounded-md w-full h-[200px] mt-[24px]" />
        </motion.div>
      ) : content}
    </AnimatePresence>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-[8px] z-[1000] flex justify-end" onClick={onClose}>
        <div className="w-full max-w-[700px] h-full bg-bg-deep overflow-y-auto shadow-[-10px_0_50px_rgba(0,0,0,0.5)] border-l border-gray-800" onClick={e => e.stopPropagation()}>
          {mainContent}
        </div>
      </div>
    );
  }

  return mainContent;
}
