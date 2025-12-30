import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Target, Activity, AlertTriangle, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DailyMetrics, UserPreferences } from '../types';
import styles from './Profile.module.css';

export function Profile() {
  const { userData, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [metrics, setMetrics] = useState<DailyMetrics>({
    calories: 2000,
    protein: undefined,
    carbs: undefined,
    fat: undefined
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    activityLevel: 'moderate'
  });

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
      setMetrics(userData.dailyMetrics || { calories: 2000 });
      setPreferences(userData.preferences || { dietaryRestrictions: [], activityLevel: 'moderate' });
    }
  }, [userData]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUserData({
        displayName,
        dailyMetrics: metrics,
        preferences
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
    { value: 'light', label: 'Light', desc: '1-3 days/week' },
    { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
    { value: 'active', label: 'Active', desc: '6-7 days/week' },
    { value: 'very_active', label: 'Very Active', desc: 'Intense daily exercise' }
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
    'Keto', 'Paleo', 'Low-Sodium', 'Halal', 'Kosher'
  ];

  const toggleRestriction = (restriction: string) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  return (
    <motion.div 
      className={styles.profile}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className={styles.header}>
        <h1>Profile & Settings</h1>
        <p>Customize your daily targets and preferences</p>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <User size={20} />
          <h2>Personal Info</h2>
        </div>
        <div className={styles.card}>
          <div className={styles.field}>
            <label>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className={styles.field}>
            <label>Theme Preference</label>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeBtn} ${preferences.theme !== 'light' ? styles.active : ''}`}
                onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
              >
                <Moon size={18} />
                <span>Cyberpunk</span>
              </button>
              <button
                className={`${styles.themeBtn} ${preferences.theme === 'light' ? styles.active : ''}`}
                onClick={() => setPreferences({ ...preferences, theme: 'light' })}
              >
                <Sun size={18} />
                <span>Light Mode</span>
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              value={userData?.email || ''}
              disabled
              className={styles.disabled}
            />
            <span className={styles.hint}>Email cannot be changed</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Target size={20} />
          <h2>Daily Targets</h2>
        </div>
        <div className={styles.card}>
          <p className={styles.cardDesc}>
            Set your daily nutritional targets. These are guidelines, not strict rules.
          </p>
          
          <div className={styles.metricsGrid}>
            <div className={styles.field}>
              <label>Calories (CAL)</label>
              <input
                type="number"
                value={metrics.calories || ''}
                onChange={(e) => setMetrics({...metrics, calories: Number(e.target.value) || undefined})}
                placeholder="e.g., 2000"
              />
            </div>
            <div className={styles.field}>
              <label>Protein (g)</label>
              <input
                type="number"
                value={metrics.protein || ''}
                onChange={(e) => setMetrics({...metrics, protein: Number(e.target.value) || undefined})}
                placeholder="Optional"
              />
            </div>
            <div className={styles.field}>
              <label>Carbs (g)</label>
              <input
                type="number"
                value={metrics.carbs || ''}
                onChange={(e) => setMetrics({...metrics, carbs: Number(e.target.value) || undefined})}
                placeholder="Optional"
              />
            </div>
            <div className={styles.field}>
              <label>Fat (g)</label>
              <input
                type="number"
                value={metrics.fat || ''}
                onChange={(e) => setMetrics({...metrics, fat: Number(e.target.value) || undefined})}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Activity size={20} />
          <h2>Activity Level</h2>
        </div>
        <div className={styles.card}>
          <div className={styles.activityLevels}>
            {activityLevels.map((level) => (
              <button
                key={level.value}
                className={`${styles.activityBtn} ${preferences.activityLevel === level.value ? styles.active : ''}`}
                onClick={() => setPreferences({...preferences, activityLevel: level.value as any})}
              >
                <span className={styles.activityLabel}>{level.label}</span>
                <span className={styles.activityDesc}>{level.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <AlertTriangle size={20} />
          <h2>Dietary Preferences</h2>
        </div>
        <div className={styles.card}>
          <p className={styles.cardDesc}>
            Select any dietary restrictions or preferences you follow.
          </p>
          <div className={styles.tagGrid}>
            {dietaryOptions.map((option) => (
              <button
                key={option}
                className={`${styles.tag} ${preferences.dietaryRestrictions.includes(option) ? styles.active : ''}`}
                onClick={() => toggleRestriction(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.actions}>
        <button 
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className={styles.spinner} size={20} />
          ) : saved ? (
            <>
              <Save size={20} />
              Saved!
            </>
          ) : (
            <>
              <Save size={20} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

