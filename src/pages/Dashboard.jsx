import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, BarChart2, Layout as LayoutIcon } from 'lucide-react';
import { DayView } from '../components/DayView';
import { History } from './History';
import { Overview } from './Overview';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="max-w-[1000px] w-full mx-auto overflow-hidden px-1 sm:px-0">
      <div className="flex gap-xs sm:gap-md mb-lg sm:mb-xl bg-bg-card p-[4px] sm:p-[6px] rounded-md border border-gray-800 w-full sm:w-fit overflow-x-auto no-scrollbar">
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center gap-sm py-sm px-md sm:px-xl rounded-sm font-display font-bold text-[0.65rem] sm:text-[0.75rem] uppercase tracking-[0.1em] transition-colors duration-150 ease-out hover:text-white hover:bg-white/5 whitespace-nowrap ${activeTab === 'today' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent text-gray-500'}`}
          onClick={() => setActiveTab('today')}
        >
          <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span>Today</span>
        </button>
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center gap-sm py-sm px-md sm:px-xl rounded-sm font-display font-bold text-[0.65rem] sm:text-[0.75rem] uppercase tracking-[0.1em] transition-colors duration-150 ease-out hover:text-white hover:bg-white/5 whitespace-nowrap ${activeTab === 'overview' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent text-gray-500'}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span>Overview</span>
        </button>
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center gap-sm py-sm px-md sm:px-xl rounded-sm font-display font-bold text-[0.65rem] sm:text-[0.75rem] uppercase tracking-[0.1em] transition-colors duration-150 ease-out hover:text-white hover:bg-white/5 whitespace-nowrap ${activeTab === 'history' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent text-gray-500'}`}
          onClick={() => setActiveTab('history')}
        >
          <BarChart2 size={16} className="sm:w-[18px] sm:h-[18px]" />
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
