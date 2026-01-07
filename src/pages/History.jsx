import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Beef, Wheat, Droplets, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { DayView } from '../components/DayView';

export function History() {
  const { currentUser, userData } = useAuth();
  const { setCurrentDate, getLedgersForDateRange } = useLedger();
  const [ledgers, setLedgers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [showDayView, setShowDayView] = useState(false);
  const [activeToggle, setActiveToggle] = useState(null);

  const target = userData?.dailyMetrics?.calories || 2000;
  const proteinTarget = userData?.dailyMetrics?.protein || 150;

  // Helper functions
  const getDayData = (date) => {
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

  const isDayGood = (data) => {
    if (data.meals === 0) return null; // No data
    const calorieDiff = Math.abs(data.calories - target) / target;
    const hitProtein = data.protein >= proteinTarget * 0.9;
    return calorieDiff <= 0.15 || hitProtein;
  };

  const getHeatmapColor = (data) => {
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

  // Pre-calculate matrix data only when ledgers change
  const matrixData = useMemo(() => {
    if (ledgers.size === 0) return [];
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
    if (ledgers.size === 0) return {
      totalCalories: 0, avgCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
      daysTracked: 0, streak: 0, goodDays: 0, badDays: 0, trend: 0
    };
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

  if (loading) {
    return (
      <div className="flex flex-col gap-lg max-w-[1000px] w-full mx-auto">
        <div className="grid grid-cols-4 gap-md max-lg:grid-cols-2 max-sm:grid-cols-1">
          {[1,2,3,4].map(i => <div key={i} className="h-[100px] bg-bg-card border border-gray-800 rounded-md animate-pulse" />)}
        </div>
        <div className="h-[300px] bg-bg-card border border-gray-800 rounded-md animate-pulse mt-xl" />
      </div>
    );
  }

  const handleDayClick = (date) => {
    setCurrentDate(date);
    setShowDayView(true);
  };

  const historyVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1, 
      transition: {
        duration: 0.2,
        staggerChildren: 0.02
      }
    },
    exit: { 
      opacity: 0, 
      transition: { duration: 0.1 }
    }
  };

  const matrixContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0 // We'll use custom delays instead
      }
    }
  };

  const pixelVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    show: (i) => ({ 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: (Math.floor(i / 21) * 0.04) + ((i % 21) * 0.005)
      }
    })
  };

  return (
    <motion.div 
      className="max-w-[1000px] w-full mx-auto px-1 sm:px-0 overflow-hidden"
      variants={historyVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-md mb-lg sm:mb-xl w-full">
        <button 
          className={`bg-bg-card border border-gray-800 rounded-md p-sm sm:p-lg flex items-center gap-2 sm:gap-md transition-all duration-fast cursor-pointer text-left w-full hover:border-primary bg-success/5 border-success ${activeToggle === 'good' ? 'border-2 border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : ''}`}
          onClick={() => setActiveToggle(activeToggle === 'good' ? null : 'good')}
        >
          <div className="w-[32px] h-[32px] sm:w-[44px] sm:h-[44px] rounded-sm bg-success text-bg-deep flex items-center justify-center shrink-0 shadow-success-glow"><CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[1rem] sm:text-[1.25rem] font-black text-white font-display leading-none">{stats.goodDays}</span>
            <span className="text-[0.5rem] sm:text-[0.65rem] text-gray-500 font-display uppercase tracking-[0.1em] truncate">Good</span>
          </div>
        </button>
        <button 
          className={`bg-bg-card border border-gray-800 rounded-md p-sm sm:p-lg flex items-center gap-2 sm:gap-md transition-all duration-fast cursor-pointer text-left w-full hover:border-primary bg-error/5 border-error ${activeToggle === 'bad' ? 'border-2 border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}
          onClick={() => setActiveToggle(activeToggle === 'bad' ? null : 'bad')}
        >
          <div className="w-[32px] h-[32px] sm:w-[44px] sm:h-[44px] rounded-sm bg-error text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,49,49,0.5)]"><XCircle size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[1rem] sm:text-[1.25rem] font-black text-white font-display leading-none">{stats.badDays}</span>
            <span className="text-[0.5rem] sm:text-[0.65rem] text-gray-500 font-display uppercase tracking-[0.1em] truncate">Off</span>
          </div>
        </button>
        <div className="bg-bg-card border border-gray-800 rounded-md p-sm sm:p-lg flex items-center gap-2 sm:gap-md transition-all duration-fast text-left w-full hover:border-primary">
          <div className="w-[32px] h-[32px] sm:w-[44px] sm:h-[44px] rounded-sm bg-bg-accent text-primary flex items-center justify-center shrink-0 border border-white/5">
            {stats.trend > 0 ? <TrendingUp size={16} /> : stats.trend < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className={`text-[1rem] sm:text-[1.25rem] font-black font-display leading-none ${stats.trend > 0 ? 'text-secondary' : stats.trend < 0 ? 'text-primary' : 'text-white'}`}>
              {stats.trend > 0 ? '+' : ''}{stats.trend}%
            </span>
            <span className="text-[0.5rem] sm:text-[0.65rem] text-gray-500 font-display uppercase tracking-[0.1em] truncate">Trend</span>
          </div>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-md p-sm sm:p-lg flex items-center gap-2 sm:gap-md transition-all duration-fast text-left w-full hover:border-primary">
          <div className="w-[32px] h-[32px] sm:w-[44px] sm:h-[44px] rounded-sm bg-bg-accent text-primary flex items-center justify-center shrink-0 border border-white/5 font-display text-[0.8rem] sm:text-sm">🔥</div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[1rem] sm:text-[1.25rem] font-black text-white font-display leading-none">{stats.streak}</span>
            <span className="text-[0.5rem] sm:text-[0.65rem] text-gray-500 font-display uppercase tracking-[0.1em] truncate">Streak</span>
          </div>
        </div>
      </section>

      <section className="bg-bg-card border border-gray-800 rounded-md p-md sm:p-xl mb-xl relative overflow-hidden w-full">
        <div className="flex justify-between items-center mb-lg sm:mb-xl">
          <h2 className="text-[0.7rem] sm:text-[0.8rem] font-extrabold text-white font-display uppercase tracking-[0.1em] m-0">Activity Matrix</h2>
          <span className="text-[0.5rem] sm:text-[0.6rem] text-primary font-display uppercase tracking-[0.1em] opacity-60">Last 15 Weeks</span>
        </div>
        
        <div className="w-full overflow-x-auto no-scrollbar pb-xs touch-pan-x">
          <motion.div 
            className="grid grid-cols-[repeat(21,minmax(22px,1fr))] gap-[4px] sm:gap-[6px] mb-lg min-w-[540px] sm:min-w-0 w-full"
            variants={matrixContainerVariants}
            initial="hidden"
            animate="show"
          >
            {matrixData.map(({ day, data, color, isToday, hasData }, i) => {
              const isGood = isDayGood(data) === true;
              const isBad = isDayGood(data) === false;
              const isHighlighted = (activeToggle === 'good' && isGood) || (activeToggle === 'bad' && isBad);
              const isDimmed = activeToggle && !isHighlighted;
              
              const displayColor = isHighlighted 
                ? (activeToggle === 'good' ? '#22c55e' : '#ef4444')
                : color;

              const isToggled = activeToggle !== null;
              const hasGlow = !isToggled && hasData && Math.abs((data.calories - target)/target) <= 0.1;

              // Determine if background is bright enough to need dark text
              const isBrightBackground = hasData && (
                displayColor === 'var(--color-primary)' || 
                displayColor === 'rgba(0, 242, 255, 0.4)' ||
                displayColor === '#22c55e' ||
                displayColor === 'rgba(255, 255, 0, 0.2)'
              );

              return (
                <motion.button
                  key={format(day, 'yyyy-MM-dd')}
                  className={`aspect-square rounded-[2px] border border-white/[0.03] bg-bg-accent cursor-pointer p-0 flex items-center justify-center font-display text-[0.45rem] sm:text-[0.5rem] font-bold transition-all duration-150 hover:text-white/80 ${isToday ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : ''} ${
                    isBrightBackground 
                      ? 'text-bg-deep' 
                      : isHighlighted 
                        ? 'text-white' 
                        : hasData 
                          ? 'text-white/80' 
                          : 'text-white/10'
                  }`}
                  style={{ 
                    background: displayColor,
                    boxShadow: hasGlow ? '0 0 8px var(--color-primary-glow)' : 'none',
                    opacity: isDimmed ? 0.2 : 1,
                    scale: isDimmed ? 0.9 : 1,
                    zIndex: isHighlighted ? 10 : 1
                  }}
                  variants={pixelVariants}
                  custom={i}
                  onClick={() => handleDayClick(day)}
                  whileHover={{ scale: 1.2, zIndex: 20 }}
                  title={`${format(day, 'MMM d')}: ${data.calories} CAL`}
                >
                  {format(day, 'd')}
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-md gap-y-sm mt-md text-[0.55rem] sm:text-[0.6rem] text-gray-500 font-display uppercase">
          <div className="flex items-center gap-xs">
            <div className="w-[10px] h-[10px] rounded-[2px] border border-gray-800" style={{ background: 'var(--color-bg-accent)' }} />
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[10px] h-[10px] rounded-[2px] border border-current" style={{ background: 'var(--color-primary)' }} />
            <span>Perfect</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[10px] h-[10px] rounded-[2px] border border-current" style={{ background: 'rgba(0, 242, 255, 0.4)' }} />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[10px] h-[10px] rounded-[2px] border border-current" style={{ background: 'var(--color-secondary)' }} />
            <span>Over</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-[10px] h-[10px] rounded-[2px] border border-current" style={{ background: 'rgba(0, 242, 255, 0.15)' }} />
            <span>Under</span>
          </div>
        </div>
      </section>

      <section className="mb-xl w-full">
        <h2 className="text-[0.8rem] font-extrabold mb-lg font-display text-white uppercase tracking-[0.1em]">Macro Consumption</h2>
        <div className="grid grid-cols-3 gap-sm sm:gap-md max-[600px]:grid-cols-1 w-full">
          <div className="bg-bg-card border border-gray-800 rounded-md p-md sm:p-xl flex flex-col items-center text-center gap-xs sm:gap-sm transition-all duration-fast hover:border-primary hover:-translate-y-1 w-full">
            <Beef size={20} className="text-primary mb-xs sm:w-[24px] sm:h-[24px] drop-shadow-[0_0_5px_var(--color-primary-glow)]" />
            <span className="text-[1.25rem] sm:text-[1.5rem] font-black text-white font-display leading-none">{stats.totalProtein.toLocaleString()}g</span>
            <span className="text-[0.6rem] sm:text-[0.7rem] text-gray-300 font-display uppercase tracking-[0.1em]">Protein</span>
            <span className="text-[0.55rem] sm:text-[0.6rem] text-gray-500 font-body">30-day avg</span>
          </div>
          <div className="bg-bg-card border border-gray-800 rounded-md p-md sm:p-xl flex flex-col items-center text-center gap-xs sm:gap-sm transition-all duration-fast hover:border-primary hover:-translate-y-1 w-full">
            <Wheat size={20} className="text-primary mb-xs sm:w-[24px] sm:h-[24px] drop-shadow-[0_0_5px_var(--color-primary-glow)]" />
            <span className="text-[1.25rem] sm:text-[1.5rem] font-black text-white font-display leading-none">{stats.totalCarbs.toLocaleString()}g</span>
            <span className="text-[0.6rem] sm:text-[0.7rem] text-gray-300 font-display uppercase tracking-[0.1em]">Carbs</span>
            <span className="text-[0.55rem] sm:text-[0.6rem] text-gray-500 font-body">30-day avg</span>
          </div>
          <div className="bg-bg-card border border-gray-800 rounded-md p-md sm:p-xl flex flex-col items-center text-center gap-xs sm:gap-sm transition-all duration-fast hover:border-primary hover:-translate-y-1 w-full">
            <Droplets size={20} className="text-primary mb-xs sm:w-[24px] sm:h-[24px] drop-shadow-[0_0_5px_var(--color-primary-glow)]" />
            <span className="text-[1.25rem] sm:text-[1.5rem] font-black text-white font-display leading-none">{stats.totalFat.toLocaleString()}g</span>
            <span className="text-[0.6rem] sm:text-[0.7rem] text-gray-300 font-display uppercase tracking-[0.1em]">Fat</span>
            <span className="text-[0.55rem] sm:text-[0.6rem] text-gray-500 font-body">30-day avg</span>
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
