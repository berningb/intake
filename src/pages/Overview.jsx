import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Flame, Beef, Wheat, Droplets, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';

export function Overview() {
  const { userData } = useAuth();
  const { getLedgersForDateRange } = useLedger();
  const [ledgers, setLedgers] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const calorieTarget = userData?.dailyMetrics?.calories || 2000;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const end = new Date();
      const start = subDays(end, 6);
      const result = await getLedgersForDateRange(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setLedgers(result);
      setLoading(false);
    }
    fetchData();
  }, [getLedgersForDateRange]);

  const last7Days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 6);
    return eachDayOfInterval({ start, end });
  }, []);

  const chartData = useMemo(() => {
    return last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const ledger = ledgers.get(dateStr);
      
      const totals = ledger?.foods.reduce(
        (acc, food) => ({
          calories: acc.calories + (food.finalNutrition?.calories || 0),
          protein: acc.protein + (food.finalNutrition?.protein || 0),
          carbs: acc.carbs + (food.finalNutrition?.carbs || 0),
          fat: acc.fat + (food.finalNutrition?.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

      return {
        date: dateStr,
        label: format(day, 'EEE'),
        ...totals
      };
    });
  }, [ledgers, last7Days]);

  const maxCalories = Math.max(...chartData.map(d => d.calories), calorieTarget, 1000);

  if (loading) {
    return (
      <div className="flex flex-col gap-xl p-md">
        <div className="bg-[linear-gradient(90deg,var(--color-bg-card)_25%,var(--color-bg-accent)_50%,var(--color-bg-card)_75%)] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-md border border-gray-800 h-[300px]" />
        <div className="bg-[linear-gradient(90deg,var(--color-bg-card)_25%,var(--color-bg-accent)_50%,var(--color-bg-card)_75%)] bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-md border border-gray-800 h-[200px] mt-[24px]" />
      </div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col gap-lg sm:gap-[3rem] p-md max-w-[800px] mx-auto overflow-x-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Calorie Trend Chart */}
      <section className="bg-bg-card border border-gray-800 rounded-md p-md sm:p-xl shadow-card">
        <div className="flex justify-between items-center mb-lg sm:mb-xl">
          <div className="flex items-center gap-md">
            <Flame size={18} className="text-primary" />
            <h2 className="font-display text-[1rem] sm:text-[1.25rem] uppercase tracking-[0.1em] m-0 text-white whitespace-nowrap">Calorie Trend</h2>
          </div>
          <div className="flex items-center gap-xs py-[4px] px-[10px] bg-primary/10 border border-primary/20 rounded-full text-primary font-display text-[0.55rem] sm:text-[0.65rem] uppercase tracking-[0.05em] whitespace-nowrap">
            <Target size={12} className="shrink-0" />
            <span>Target: {calorieTarget}</span>
          </div>
        </div>

        <div className="w-full aspect-[4/3] sm:aspect-[7/3] mt-md overflow-x-auto no-scrollbar">
          <div className="min-w-[400px] h-full sm:min-w-0">
            <svg viewBox="0 0 700 300" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <line 
                  key={i}
                  x1="40" 
                  y1={30 + (240 * (1 - p))} 
                  x2="680" 
                  y2={30 + (240 * (1 - p))} 
                  stroke="var(--color-gray-800)" 
                  strokeDasharray="4 4"
                />
              ))}

              {/* Target line */}
              <line 
                x1="40" 
                y1={30 + (240 * (1 - calorieTarget / maxCalories))} 
                x2="680" 
                y2={30 + (240 * (1 - calorieTarget / maxCalories))} 
                stroke="var(--color-primary)" 
                strokeWidth="2"
                opacity="0.3"
              />

              {/* Area under the line */}
              <path
                d={`
                  M 40 270
                  ${chartData.map((d, i) => {
                    const x = 40 + (i * 106);
                    const y = 30 + (240 * (1 - d.calories / maxCalories));
                    return `L ${x} ${y}`;
                  }).join(' ')}
                  L 680 270
                  Z
                `}
                fill="url(#calorieGradient)"
                opacity="0.1"
              />

              <defs>
                <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>

              {/* Line chart */}
              <path
                d={`
                  M 40 ${30 + (240 * (1 - chartData[0].calories / maxCalories))}
                  ${chartData.map((d, i) => {
                    const x = 40 + (i * 106);
                    const y = 30 + (240 * (1 - d.calories / maxCalories));
                    return `L ${x} ${y}`;
                  }).join(' ')}
                `}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_var(--color-primary-glow)]"
              />

              {/* Data points */}
              {chartData.map((d, i) => {
                const x = 40 + (i * 106);
                const y = 30 + (240 * (1 - d.calories / maxCalories));
                return (
                  <g key={i} className="group cursor-pointer">
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="6" 
                      fill="var(--color-bg-deep)" 
                      stroke="var(--color-primary)" 
                      strokeWidth="3"
                      className="transition-[r] duration-200 group-hover:r-8"
                    />
                    <text x={x} y="295" textAnchor="middle" className="fill-gray-500 text-[12px] font-display uppercase tracking-widest">{d.label}</text>
                    <text x={x} y={y - 15} textAnchor="middle" className="fill-primary text-[10px] font-extrabold font-display opacity-0 transition-opacity duration-200 group-hover:opacity-100">{d.calories}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Macro Breakdown Chart */}
      <section className="bg-bg-card border border-gray-800 rounded-md p-md sm:p-xl shadow-card">
        <div className="flex justify-between items-center mb-xl">
          <div className="flex items-center gap-md">
            <Beef size={18} className="text-primary" />
            <h2 className="font-display text-[1rem] sm:text-[1.25rem] uppercase tracking-[0.1em] m-0 text-white whitespace-nowrap">Macro Breakdown</h2>
          </div>
        </div>

        <div className="flex justify-between items-end h-[180px] sm:h-[200px] gap-sm sm:gap-md mb-xl pb-lg border-b border-gray-800 overflow-x-auto no-scrollbar">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-md min-w-[30px]">
              <span className="text-[0.55rem] sm:text-[0.65rem] font-display text-gray-500 uppercase">{d.label}</span>
              <div className="w-[16px] sm:w-[24px] flex flex-col-reverse bg-bg-accent rounded-full overflow-hidden h-full max-h-[140px] sm:max-h-[160px]">
                <div 
                  className="bg-primary w-full" 
                  style={{ height: `${(d.protein * 4 / maxCalories) * 300}%` }}
                  title={`Protein: ${d.protein}g`}
                />
                <div 
                  className="bg-secondary w-full" 
                  style={{ height: `${(d.carbs * 4 / maxCalories) * 300}%` }}
                  title={`Carbs: ${d.carbs}g`}
                />
                <div 
                  className="bg-warning w-full" 
                  style={{ height: `${(d.fat * 9 / maxCalories) * 300}%` }}
                  title={`Fat: ${d.fat}g`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-x-lg gap-y-sm">
          <div className="flex items-center gap-sm text-[0.6rem] sm:text-[0.7rem] font-display uppercase text-gray-400">
            <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-[2px]" style={{ background: 'var(--color-primary)' }} />
            <span>Protein</span>
          </div>
          <div className="flex items-center gap-sm text-[0.6rem] sm:text-[0.7rem] font-display uppercase text-gray-400">
            <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-[2px]" style={{ background: 'var(--color-secondary)' }} />
            <span>Carbs</span>
          </div>
          <div className="flex items-center gap-sm text-[0.6rem] sm:text-[0.7rem] font-display uppercase text-gray-400">
            <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-[2px]" style={{ background: 'var(--color-warning)' }} />
            <span>Fat</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
