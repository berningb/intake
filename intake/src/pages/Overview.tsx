import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Flame, Beef, Wheat, Droplets, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { DayLedger } from '../types';
import styles from './Overview.module.css';

export function Overview() {
  const { userData } = useAuth();
  const { getLedgersForDateRange } = useLedger();
  const [ledgers, setLedgers] = useState<Map<string, DayLedger>>(new Map());
  const [loading, setLoading] = useState(true);

  const calorieTarget = userData?.dailyMetrics?.calories || 2000;
  const proteinTarget = userData?.dailyMetrics?.protein || 150;
  const carbsTarget = userData?.dailyMetrics?.carbs || 250;
  const fatTarget = userData?.dailyMetrics?.fat || 70;

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
      <div className={styles.loading}>
        <div className={styles.skeleton} style={{ height: '300px' }} />
        <div className={styles.skeleton} style={{ height: '200px', marginTop: '24px' }} />
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.overview}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Calorie Trend Chart */}
      <section className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerTitle}>
            <Flame size={20} className={styles.icon} />
            <h2>Calorie Trend</h2>
          </div>
          <div className={styles.targetBadge}>
            <Target size={14} />
            <span>Target: {calorieTarget}</span>
          </div>
        </div>

        <div className={styles.chartContainer}>
          <svg viewBox="0 0 700 300" className={styles.lineChart}>
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
              className={styles.chartLine}
            />

            {/* Data points */}
            {chartData.map((d, i) => {
              const x = 40 + (i * 106);
              const y = 30 + (240 * (1 - d.calories / maxCalories));
              return (
                <g key={i} className={styles.dataPoint}>
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="6" 
                    fill="var(--color-bg-deep)" 
                    stroke="var(--color-primary)" 
                    strokeWidth="3"
                  />
                  <text x={x} y="295" textAnchor="middle" className={styles.axisLabel}>{d.label}</text>
                  <text x={x} y={y - 15} textAnchor="middle" className={styles.valueLabel}>{d.calories}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* Macro Breakdown Chart */}
      <section className={styles.macroSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerTitle}>
            <Beef size={20} className={styles.icon} />
            <h2>Macro Breakdown</h2>
          </div>
        </div>

        <div className={styles.macroGrid}>
          {chartData.map((d, i) => (
            <div key={i} className={styles.macroDay}>
              <span className={styles.dayLabel}>{d.label}</span>
              <div className={styles.stackedBar}>
                <div 
                  className={styles.barProtein} 
                  style={{ height: `${(d.protein * 4 / maxCalories) * 300}%` }}
                  title={`Protein: ${d.protein}g`}
                />
                <div 
                  className={styles.barCarbs} 
                  style={{ height: `${(d.carbs * 4 / maxCalories) * 300}%` }}
                  title={`Carbs: ${d.carbs}g`}
                />
                <div 
                  className={styles.barFat} 
                  style={{ height: `${(d.fat * 9 / maxCalories) * 300}%` }}
                  title={`Fat: ${d.fat}g`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.macroLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: 'var(--color-primary)' }} />
            <span>Protein</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: 'var(--color-secondary)' }} />
            <span>Carbs</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: 'var(--color-warning)' }} />
            <span>Fat</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

