import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, BarChart2, Layout as LayoutIcon } from 'lucide-react';
import { DayView } from '../components/DayView';
import { History } from './History';
import { Overview } from './Overview';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'overview'>('today');

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
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutIcon size={18} />
          <span>Overview</span>
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
        <AnimatePresence mode="wait">
          {activeTab === 'today' ? (
            <DayView key="today" />
          ) : activeTab === 'overview' ? (
            <Overview key="overview" />
          ) : (
            <History key="history" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
