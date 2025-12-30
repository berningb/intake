import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calendar, Plus, LogOut, Dumbbell, UserPlus, ScanBarcode, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Scan } from '../pages/Scan';
import styles from './Layout.module.css';

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
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className={styles.logoText}>intake</h1>
            <span className={styles.logoTagline}>mindful eating</span>
          </motion.div>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/routines" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <Dumbbell size={20} />
            <span>Routines</span>
          </NavLink>
        </nav>

        <div className={styles.userSection}>
          {isGuest && (
            <button className={styles.upgradeBtn} onClick={handleUpgrade}>
              <UserPlus size={16} />
              <span>Save Progress</span>
            </button>
          )}
          <div className={styles.userRow}>
            {userData && (
              <button className={styles.userInfo} onClick={() => navigate('/profile')}>
                <div className={`${styles.avatar} ${isGuest ? styles.guestAvatar : ''}`}>
                  {isGuest ? '?' : (userData.displayName?.charAt(0) || userData.email.charAt(0))}
                </div>
                <div className={styles.userName}>
                  <span>{isGuest ? 'Guest' : (userData.displayName || 'User')}</span>
                  <small>{isGuest ? 'Not signed in' : userData.email}</small>
                </div>
              </button>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {isGuest && (
          <motion.div 
            className={styles.guestBanner}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Guest mode —
            <button onClick={handleUpgrade}>Sign in with Google</button>
            to save your progress
          </motion.div>
        )}
        <Outlet />
      </main>

      {/* FAB and Quick Action Menu */}
      <div className={styles.fabContainer}>
        <motion.button
          className={`${styles.fab} ${showFabMenu ? styles.fabActive : ''}`}
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
