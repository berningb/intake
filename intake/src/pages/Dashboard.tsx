import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, BarChart2 } from 'lucide-react';
import { DayView } from '../components/DayView';
import { History } from './History';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'today' ? styles.active : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <Calendar size={18} />
          <span>Today</span>
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <BarChart2 size={18} />
          <span>History</span>
        </button>
      </div>

      <div className={styles.tabContent}>
        <AnimatePresence>
          {activeTab === 'today' ? (
            <DayView key="today" />
          ) : (
            <History key="history" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
