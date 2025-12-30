import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calendar, Plus, LogOut, Dumbbell, UserPlus, ScanBarcode, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Scan } from '../pages/Scan';
import { ExperienceBar } from './ExperienceBar';
import { BountyBoard } from './BountyBoard';

export function Layout() {
  const { userData, logout, isGuest, upgradeGuestAccount } = useAuth();
  const navigate = useNavigate();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showScan, setShowScan] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUpgrade = async () => {
    try {
      await upgradeGuestAccount();
    } catch (error) {
      console.error('Failed to upgrade account:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-deep">
      <aside className="bg-bg-card border-r border-gray-800 flex flex-col p-lg fixed left-0 top-0 w-[340px] h-screen overflow-y-auto z-50 shadow-[10px_0_30px_rgba(0,0,0,0.5)] max-md:hidden">
        <div className="py-md px-0 pb-xl border-b border-gray-800 mb-lg relative after:content-[''] after:absolute after:-bottom-[1px] after:left-0 after:w-[40px] after:height-[1px] after:bg-primary after:shadow-neon">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-display text-[1.5rem] font-black text-white tracking-[0.1em] uppercase">intake</h1>
            <span className="block text-[0.65rem] font-display text-primary tracking-[0.2em] uppercase mt-xs opacity-80">mindful eating</span>
          </motion.div>
        </div>

        <nav className="flex flex-col gap-sm flex-1">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-md p-md rounded-sm font-display text-[0.8rem] font-semibold uppercase tracking-[0.05em] transition-all duration-fast border border-transparent hover:text-white hover:bg-primary/5 hover:border-primary/20 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary border-primary shadow-[inset_0_0_15px_rgba(0,242,255,0.1)]' : 'text-gray-300'}`}>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/routines" className={({ isActive }) => `flex items-center gap-md p-md rounded-sm font-display text-[0.8rem] font-semibold uppercase tracking-[0.05em] transition-all duration-fast border border-transparent hover:text-white hover:bg-primary/5 hover:border-primary/20 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary border-primary shadow-[inset_0_0_15px_rgba(0,242,255,0.1)]' : 'text-gray-300'}`}>
            <Dumbbell size={20} />
            <span>Routines</span>
          </NavLink>
        </nav>

        <div className="mt-xl">
          <ExperienceBar />
        </div>

        <div className="mt-md mb-xl overflow-y-auto no-scrollbar pr-xs">
          <BountyBoard isSidebar={true} />
        </div>

        <div className="flex flex-col gap-sm pt-lg border-t border-gray-800 mt-auto">
          {isGuest && (
            <button className="flex items-center justify-center gap-xs w-full p-md bg-secondary text-white rounded-sm font-display text-[0.75rem] font-extrabold uppercase tracking-[0.1em] mb-sm transition-all duration-fast shadow-[0_0_10px_var(--color-secondary-glow)] hover:bg-white hover:text-secondary hover:shadow-[0_0_20px_var(--color-secondary-glow)]" onClick={handleUpgrade}>
              <UserPlus size={16} />
              <span>Save Progress</span>
            </button>
          )}
          <div className="flex items-center gap-sm">
            {userData && (
              <button className="flex items-center gap-sm flex-1 min-w-0 bg-transparent border border-transparent p-sm rounded-sm cursor-pointer transition-all duration-fast text-left hover:bg-bg-accent hover:border-gray-800" onClick={() => navigate('/profile')}>
                <div className={`w-[40px] h-[40px] rounded-sm bg-bg-accent border flex items-center justify-center font-display font-extrabold text-[0.9rem] shrink-0 shadow-neon ${isGuest ? 'border-primary text-primary' : 'border-primary text-primary'}`}>
                  {isGuest ? '?' : (userData.displayName?.charAt(0) || userData.email.charAt(0))}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[0.8rem] text-white truncate font-display">{isGuest ? 'Guest' : (userData.displayName || 'User')}</span>
                  <small className="text-gray-500 text-[0.7rem] truncate">{isGuest ? 'Not signed in' : userData.email}</small>
                </div>
              </button>
            )}
            <button className="p-sm rounded-sm bg-transparent text-gray-500 transition-all duration-fast shrink-0 hover:text-error hover:bg-error/10" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-[340px] p-xl min-h-screen bg-bg-deep relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[200px] before:bg-[radial-gradient(circle_at_50%_0%,rgba(0,242,255,0.05)_0%,transparent_70%)] before:pointer-events-none max-md:ml-0 max-md:p-md max-md:pb-[100px]">
        {isGuest && (
          <motion.div 
            className="bg-warning/5 border border-warning rounded-sm p-md mb-lg text-[0.8rem] text-white flex items-center justify-center gap-md flex-wrap font-display uppercase tracking-[0.05em] shadow-[0_0_15px_rgba(255,255,0,0.1)]"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Guest mode —
            <button className="bg-warning text-bg-deep border-none font-extrabold cursor-pointer py-xs px-md text-[0.75rem] whitespace-nowrap rounded-xs transition-all duration-fast font-display uppercase hover:bg-white hover:shadow-[0_0_10px_rgba(255,255,255,0.5)]" onClick={handleUpgrade}>Sign in with Google</button>
            to save your progress
          </motion.div>
        )}
        <Outlet />
      </main>

      {/* Mobile Sidebar (Bottom Nav) */}
      <aside className="md:hidden bg-bg-card border-t border-gray-800 fixed bottom-0 left-0 right-0 flex flex-row p-sm z-[100]">
        <nav className="flex flex-row justify-around w-full">
          <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-xs p-sm font-display text-[0.7rem] uppercase ${isActive ? 'text-primary' : 'text-gray-300'}`}>
            <Home size={20} />
            <span className="text-[0.65rem]">Dashboard</span>
          </NavLink>
          <NavLink to="/routines" className={({ isActive }) => `flex flex-col items-center gap-xs p-sm font-display text-[0.7rem] uppercase ${isActive ? 'text-primary' : 'text-gray-300'}`}>
            <Dumbbell size={20} />
            <span className="text-[0.65rem]">Routines</span>
          </NavLink>
        </nav>
      </aside>

      {/* FAB and Quick Action Menu */}
      <div className="fixed bottom-xl right-xl flex flex-col items-end gap-md z-[100] max-md:bottom-[90px] max-md:right-md">
        <motion.button
          className={`w-[64px] h-[64px] rounded-sm bg-primary text-bg-deep flex items-center justify-center shadow-neon-strong transition-all duration-fast hover:scale-110 hover:bg-white max-md:w-[56px] max-md:h-[56px] ${showFabMenu ? 'bg-error text-white shadow-[0_0_20px_rgba(255,49,49,0.5)] rotate-0' : ''}`}
          onClick={() => setShowScan(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showScan && (
          <Scan 
            isModal={true} 
            onClose={() => setShowScan(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
