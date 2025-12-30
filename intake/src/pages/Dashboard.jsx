import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, BarChart2, Layout as LayoutIcon } from 'lucide-react';
import { DayView } from '../components/DayView';
import { History } from './History';
import { Overview } from './Overview';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="max-w-[1000px] w-full mx-auto">
      <div className="flex gap-md mb-xl bg-bg-card p-[6px] rounded-md border border-gray-800 w-fit">
        <button 
          className={`flex items-center gap-sm py-sm px-xl rounded-sm font-display font-bold text-[0.75rem] uppercase tracking-[0.1em] transition-colors duration-150 ease-out hover:text-white hover:bg-white/5 ${activeTab === 'today' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent text-gray-500'}`}
          onClick={() => setActiveTab('today')}
        >
          <Calendar size={18} />
          <span>Today</span>
        </button>
        <button 
          className={`flex items-center gap-sm py-sm px-xl rounded-sm font-display font-bold text-[0.75rem] uppercase tracking-[0.1em] transition-colors duration-150 ease-out hover:text-white hover:bg-white/5 ${activeTab === 'overview' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent text-gray-500'}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutIcon size={18} />
          <span>Overview</span>
        </button>
        <button 
          className={`flex items-center gap-sm py-sm px-xl rounded-sm font-display font-bold text-[0.75rem] uppercase tracking-[0.1em] transition-colors duration-150 ease-out hover:text-white hover:bg-white/5 ${activeTab === 'history' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent text-gray-500'}`}
          onClick={() => setActiveTab('history')}
        >
          <BarChart2 size={18} />
          <span>History</span>
        </button>
      </div>

      <div className="w-full">
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
