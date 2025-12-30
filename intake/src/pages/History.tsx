import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Beef, Wheat, Droplets, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { DayLedger } from '../types';
import { DayView } from '../components/DayView';
import styles from './History.module.css';

export function History() {
  const { currentUser, userData } = useAuth();
  const { setCurrentDate, getLedgersForDateRange } = useLedger();
  const [ledgers, setLedgers] = useState<Map<string, DayLedger>>(new Map());
  const [, setLoading] = useState(true);
  const [showDayView, setShowDayView] = useState(false);
  const [activeToggle, setActiveToggle] = useState<'good' | 'bad' | null>(null);

  const target = userData?.dailyMetrics?.calories || 2000;
  const proteinTarget = userData?.dailyMetrics?.protein || 150;

  // Helper functions moved up to avoid initialization errors
  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const ledger = ledgers.get(dateStr);
    if (!ledger || !ledger.foods) return { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
    
    return ledger.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.finalNutrition?.calories || 0),
        protein: acc.protein + (food.finalNutrition?.protein || 0),
        carbs: acc.carbs + (food.finalNutrition?.carbs || 0),
        fat: acc.fat + (food.finalNutrition?.fat || 0),
        meals: acc.meals + 1,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    );
  };

  const isDayGood = (data: { calories: number; protein: number; meals: number }) => {
    if (data.meals === 0) return null; // No data
    const calorieDiff = Math.abs(data.calories - target) / target;
    const hitProtein = data.protein >= proteinTarget * 0.9;
    
    // Match the matrix logic: A "Target Hit" is any day that is "Good" (Dim Cyan) or "Perfect" (Solid Cyan)
    // Matrix "Good" is within 15% calories OR hit protein
    return calorieDiff <= 0.15 || hitProtein;
  };

  const getHeatmapColor = (data: { calories: number; protein: number; meals: number }) => {
    if (data.meals === 0) return 'var(--color-bg-accent)';
    
    const calorieDiff = (data.calories - target) / target;
    const hitProtein = data.protein >= proteinTarget * 0.9;
    
    if (Math.abs(calorieDiff) <= 0.1 && hitProtein) {
      return 'var(--color-primary)'; 
    }
    
    if (Math.abs(calorieDiff) <= 0.15 || hitProtein) {
      return 'rgba(0, 242, 255, 0.4)'; 
    }
    
    if (calorieDiff > 0.15) {
      return 'var(--color-secondary)'; 
    }
    
    if (calorieDiff < -0.15) {
      return 'rgba(0, 242, 255, 0.15)'; 
    }
    
    return 'rgba(255, 255, 0, 0.2)'; 
  };

  // Fetch last 105 days (15 weeks) for the trend matrix
  const matrixDays = useMemo(() => eachDayOfInterval({ 
    start: subDays(new Date(), 104), 
    end: new Date() 
  }), []);

  // Pre-calculate matrix data
  const matrixData = useMemo(() => {
    return matrixDays.map(day => {
      const data = getDayData(day);
      return {
        day,
        data,
        color: getHeatmapColor(data),
        isToday: isSameDay(day, new Date()),
        hasData: data.meals > 0
      };
    });
  }, [ledgers, matrixDays, target, proteinTarget]);

  // Calculate stats for last 30 days
  const stats = useMemo(() => {
    const last30 = eachDayOfInterval({ 
      start: subDays(new Date(), 29), 
      end: new Date() 
    });
    const data = last30.map(d => getDayData(d));
    const daysWithData = data.filter(d => d.calories > 0);
    const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);
    const totalProtein = data.reduce((sum, d) => sum + d.protein, 0);
    const totalCarbs = data.reduce((sum, d) => sum + d.carbs, 0);
    const totalFat = data.reduce((sum, d) => sum + d.fat, 0);
    const avgCalories = daysWithData.length > 0 ? Math.round(totalCalories / daysWithData.length) : 0;
    
    let streak = 0;
    for (let i = last30.length - 1; i >= 0; i--) {
      if (getDayData(last30[i]).meals > 0) streak++;
      else break;
    }

    const goodDays = daysWithData.filter(d => isDayGood(d) === true).length;
    const badDays = daysWithData.filter(d => isDayGood(d) === false).length;

    const last7 = data.slice(-7).reduce((sum, d) => sum + d.calories, 0) / 7;
    const prev7 = data.slice(-14, -7).reduce((sum, d) => sum + d.calories, 0) / 7;
    const trend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

    return {
      totalCalories,
      avgCalories,
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      daysTracked: daysWithData.length,
      streak,
      goodDays,
      badDays,
      trend: Math.round(trend),
    };
  }, [ledgers, target, proteinTarget]);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      setLoading(true);
      const startStr = format(subDays(new Date(), 110), 'yyyy-MM-dd');
      const endStr = format(new Date(), 'yyyy-MM-dd');
      try {
        const result = await getLedgersForDateRange(startStr, endStr);
        setLedgers(result);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser, getLedgersForDateRange]);

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setShowDayView(true);
  };

  const historyVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.1,
        staggerChildren: 0.05
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.1 }
    }
  };

  const matrixContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.005 
      }
    }
  };

  const pixelVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    show: { 
      opacity: 1, 
      scale: 1,
      filter: "brightness(1)",
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    }
  };

  return (
    <motion.div 
      className={styles.history}
      variants={historyVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <section className={styles.statsGrid}>
        <button 
          className={`${styles.statCard} ${styles.good} ${activeToggle === 'good' ? styles.active : ''}`}
          onClick={() => setActiveToggle(activeToggle === 'good' ? null : 'good')}
        >
          <div className={styles.statIcon}><CheckCircle size={20} /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.goodDays}</span>
            <span className={styles.statLabel}>Target Hit</span>
          </div>
        </button>
        <button 
          className={`${styles.statCard} ${styles.bad} ${activeToggle === 'bad' ? styles.active : ''}`}
          onClick={() => setActiveToggle(activeToggle === 'bad' ? null : 'bad')}
        >
          <div className={styles.statIcon}><XCircle size={20} /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.badDays}</span>
            <span className={styles.statLabel}>Off Target</span>
          </div>
        </button>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            {stats.trend > 0 ? <TrendingUp size={20} /> : stats.trend < 0 ? <TrendingDown size={20} /> : <Minus size={20} />}
          </div>
          <div className={styles.statContent}>
            <span className={`${styles.statValue} ${stats.trend > 0 ? styles.up : stats.trend < 0 ? styles.down : ''}`}>
              {stats.trend > 0 ? '+' : ''}{stats.trend}%
            </span>
            <span className={styles.statLabel}>Trend</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.streak}</span>
            <span className={styles.statLabel}>Streak</span>
          </div>
        </div>
      </section>

      <section className={styles.matrixSection}>
        <div className={styles.matrixHeader}>
          <h2>Activity Matrix</h2>
          <span className={styles.matrixSub}>Last 15 Weeks</span>
        </div>
        
        <motion.div 
          className={styles.matrixGrid}
          variants={matrixContainerVariants}
          initial="hidden"
          animate="show"
        >
          {matrixData.map(({ day, data, color, isToday, hasData }, i) => {
            const isGood = isDayGood(data) === true;
            const isBad = isDayGood(data) === false;
            const isHighlighted = (activeToggle === 'good' && isGood) || (activeToggle === 'bad' && isBad);
            const isDimmed = activeToggle && !isHighlighted;
            
            // Override color when toggled - use slightly more muted versions
            const displayColor = isHighlighted 
              ? (activeToggle === 'good' ? '#22c55e' : '#ef4444')
              : color;

            const isToggled = activeToggle !== null;

            return (
              <motion.button
                key={format(day, 'yyyy-MM-dd')}
                className={`${styles.pixel} ${isToday ? styles.pixelToday : ''} ${isHighlighted ? styles.pixelHighlighted : ''}`}
                style={{ 
                  background: displayColor,
                  boxShadow: (!isToggled && hasData && Math.abs((data.calories - target)/target) <= 0.1) ? '0 0 8px var(--color-primary-glow)' : 'none'
                }}
                custom={i}
                variants={pixelVariants}
                animate={isHighlighted ? {
                  scale: [1, 1.15, 1.1],
                  opacity: 1,
                  filter: "brightness(1)",
                  boxShadow: activeToggle === 'good' 
                    ? ['0 0 5px rgba(34, 197, 94, 0.2)', '0 0 12px rgba(34, 197, 94, 0.4)', '0 0 8px rgba(34, 197, 94, 0.3)'] 
                    : ['0 0 5px rgba(239, 68, 68, 0.2)', '0 0 12px rgba(239, 68, 68, 0.4)', '0 0 8px rgba(239, 68, 68, 0.3)'],
                  zIndex: 10,
                  transition: {
                    scale: { duration: 0.2 },
                    boxShadow: { 
                      repeat: Infinity, 
                      duration: 2,
                      repeatType: "reverse" 
                    }
                  }
                } : isDimmed ? {
                  opacity: 0.2,
                  scale: 0.9,
                  filter: "brightness(1)",
                  transition: { duration: 0.2 }
                } : 'show'}
                onClick={() => handleDayClick(day)}
                whileHover={{ scale: 1.2, zIndex: 10, transition: { duration: 0.1 } }}
                title={`${format(day, 'MMM d')}: ${data.calories} CAL`}
              >
                {format(day, 'd')}
              </motion.button>
            );
          })}
        </motion.div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div style={{ background: 'var(--color-bg-accent)', border: '1px solid var(--color-gray-800)' }} />
            <span>No Log</span>
          </div>
          <div className={styles.legendItem}>
            <div style={{ background: 'var(--color-primary)' }} />
            <span>Perfect</span>
          </div>
          <div className={styles.legendItem}>
            <div style={{ background: 'rgba(0, 242, 255, 0.4)' }} />
            <span>Good</span>
          </div>
          <div className={styles.legendItem}>
            <div style={{ background: 'var(--color-secondary)' }} />
            <span>Over</span>
          </div>
          <div className={styles.legendItem}>
            <div style={{ background: 'rgba(0, 242, 255, 0.15)' }} />
            <span>Under</span>
          </div>
        </div>
      </section>

      <section className={styles.macroSection}>
        <h2>Macro Consumption</h2>
        <div className={styles.macroGrid}>
          <div className={styles.macroCard}>
            <Beef size={24} />
            <span className={styles.macroValue}>{stats.totalProtein.toLocaleString()}g</span>
            <span className={styles.macroLabel}>Protein</span>
            <span className={styles.macroAvg}>30-day avg</span>
          </div>
          <div className={styles.macroCard}>
            <Wheat size={24} />
            <span className={styles.macroValue}>{stats.totalCarbs.toLocaleString()}g</span>
            <span className={styles.macroLabel}>Carbs</span>
            <span className={styles.macroAvg}>30-day avg</span>
          </div>
          <div className={styles.macroCard}>
            <Droplets size={24} />
            <span className={styles.macroValue}>{stats.totalFat.toLocaleString()}g</span>
            <span className={styles.macroLabel}>Fat</span>
            <span className={styles.macroAvg}>30-day avg</span>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showDayView && (
          <DayView 
            isModal={true} 
            onClose={() => setShowDayView(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
