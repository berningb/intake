import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Target, Activity, AlertTriangle, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Profile() {
  const { userData, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [metrics, setMetrics] = useState({
    calories: 2000,
    protein: undefined,
    carbs: undefined,
    fat: undefined
  });
  const [preferences, setPreferences] = useState({
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

  const toggleRestriction = (restriction) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  return (
    <motion.div 
      className="max-w-[800px] mx-auto pb-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-[3rem] pb-md border-b border-gray-800">
        <h1 className="text-[1.75rem] font-black font-display text-white uppercase tracking-[0.1em] mb-xs">Profile & Settings</h1>
        <p className="text-primary m-0 text-[0.7rem] font-display uppercase tracking-[0.2em] opacity-70">Customize your daily targets and preferences</p>
      </header>

      <section className="mb-[3rem]">
        <div className="flex items-center gap-md mb-lg text-white">
          <User size={20} />
          <h2 className="text-[0.9rem] font-display font-extrabold uppercase tracking-[0.1em]">Personal Info</h2>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-md p-xl shadow-card">
          <div className="mb-lg">
            <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="p-4 bg-bg-accent border border-gray-800 w-full text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:bg-primary/3 focus:shadow-neon outline-none"
            />
          </div>
          <div className="mb-lg">
            <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Theme Preference</label>
            <div className="flex gap-md mb-sm">
              <button
                className={`flex-1 flex items-center justify-center gap-sm p-md rounded-sm transition-all duration-fast border ${preferences.theme !== 'light' ? 'bg-primary/10 border-primary text-primary shadow-neon' : 'bg-bg-accent border-gray-800 text-gray-500 hover:border-primary hover:text-white'}`}
                onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
              >
                <Moon size={18} />
                <span className="font-display text-[0.7rem] font-extrabold uppercase tracking-[0.1em]">Cyberpunk</span>
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-sm p-md rounded-sm transition-all duration-fast border ${preferences.theme === 'light' ? 'bg-primary/10 border-primary text-primary shadow-neon' : 'bg-bg-accent border-gray-800 text-gray-500 hover:border-primary hover:text-white'}`}
                onClick={() => setPreferences({ ...preferences, theme: 'light' })}
              >
                <Sun size={18} />
                <span className="font-display text-[0.7rem] font-extrabold uppercase tracking-[0.1em]">Light Mode</span>
              </button>
            </div>
          </div>
          <div className="mb-0">
            <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Email</label>
            <input
              type="email"
              value={userData?.email || ''}
              disabled
              className="p-4 bg-bg-accent border border-gray-800 w-full text-white rounded-sm font-body transition-all duration-fast opacity-40 cursor-not-allowed"
            />
            <span className="block text-[0.7rem] text-gray-600 mt-sm">Email cannot be changed</span>
          </div>
        </div>
      </section>

      <section className="mb-[3rem]">
        <div className="flex items-center gap-md mb-lg text-white">
          <Target size={20} />
          <h2 className="text-[0.9rem] font-display font-extrabold uppercase tracking-[0.1em]">Daily Targets</h2>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-md p-xl shadow-card">
          <p className="text-gray-500 text-[0.8rem] mb-xl leading-[1.6]">
            Set your daily nutritional targets. These are guidelines, not strict rules.
          </p>
          
          <div className="grid grid-cols-2 gap-lg max-sm:grid-cols-1">
            <div className="mb-0">
              <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Calories (CAL)</label>
              <input
                type="number"
                value={metrics.calories || ''}
                onChange={(e) => setMetrics({...metrics, calories: Number(e.target.value) || undefined})}
                placeholder="e.g., 2000"
                className="p-4 bg-bg-accent border border-gray-800 w-full text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:bg-primary/3 focus:shadow-neon outline-none"
              />
            </div>
            <div className="mb-0">
              <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Protein (g)</label>
              <input
                type="number"
                value={metrics.protein || ''}
                onChange={(e) => setMetrics({...metrics, protein: Number(e.target.value) || undefined})}
                placeholder="Optional"
                className="p-4 bg-bg-accent border border-gray-800 w-full text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:bg-primary/3 focus:shadow-neon outline-none"
              />
            </div>
            <div className="mb-0">
              <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Carbs (g)</label>
              <input
                type="number"
                value={metrics.carbs || ''}
                onChange={(e) => setMetrics({...metrics, carbs: Number(e.target.value) || undefined})}
                placeholder="Optional"
                className="p-4 bg-bg-accent border border-gray-800 w-full text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:bg-primary/3 focus:shadow-neon outline-none"
              />
            </div>
            <div className="mb-0">
              <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Fat (g)</label>
              <input
                type="number"
                value={metrics.fat || ''}
                onChange={(e) => setMetrics({...metrics, fat: Number(e.target.value) || undefined})}
                placeholder="Optional"
                className="p-4 bg-bg-accent border border-gray-800 w-full text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:bg-primary/3 focus:shadow-neon outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-[3rem]">
        <div className="flex items-center gap-md mb-lg text-white">
          <Activity size={20} />
          <h2 className="text-[0.9rem] font-display font-extrabold uppercase tracking-[0.1em]">Activity Level</h2>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-md p-xl shadow-card">
          <div className="flex flex-col gap-md">
            {activityLevels.map((level) => (
              <button
                key={level.value}
                className={`flex flex-col items-start p-lg bg-bg-accent border rounded-sm text-left transition-all duration-normal border-gray-800 hover:border-gray-500 hover:bg-white/[0.02] ${preferences.activityLevel === level.value ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(0,242,255,0.1)]' : ''}`}
                onClick={() => setPreferences({...preferences, activityLevel: level.value})}
              >
                <span className={`font-extrabold font-display uppercase tracking-[0.05em] text-[0.85rem] mb-1 ${preferences.activityLevel === level.value ? 'text-primary' : 'text-white'}`}>{level.label}</span>
                <span className="text-[0.75rem] text-gray-500">{level.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-[3rem]">
        <div className="flex items-center gap-md mb-lg text-white">
          <AlertTriangle size={20} />
          <h2 className="text-[0.9rem] font-display font-extrabold uppercase tracking-[0.1em]">Dietary Preferences</h2>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-md p-xl shadow-card">
          <p className="text-gray-500 text-[0.8rem] mb-xl leading-[1.6]">
            Select any dietary restrictions or preferences you follow.
          </p>
          <div className="flex flex-wrap gap-sm">
            {dietaryOptions.map((option) => (
              <button
                key={option}
                className={`py-sm px-lg bg-bg-accent border border-gray-800 text-gray-500 rounded-sm text-[0.75rem] font-extrabold font-display uppercase tracking-[0.05em] transition-all duration-fast hover:text-white hover:border-gray-500 ${preferences.dietaryRestrictions.includes(option) ? 'bg-primary text-bg-deep border-primary shadow-neon' : ''}`}
                onClick={() => toggleRestriction(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky bottom-xl flex justify-center pt-xl z-20">
        <button 
          className="flex items-center gap-md py-[1.25rem] px-[3rem] bg-secondary text-white font-extrabold font-display uppercase tracking-[0.2em] rounded-sm shadow-[0_0_20px_var(--color-secondary-glow)] transition-all duration-fast hover:not-disabled:bg-white hover:not-disabled:text-secondary hover:not-disabled:shadow-[0_0_30px_var(--color-secondary-glow)] hover:not-disabled:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed max-sm:w-full"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
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
