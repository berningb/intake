import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Target, Award, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ExperienceBar() {
  const { userData, lastXpGain } = useAuth();
  
  if (!userData) return null;

  const totalXp = userData.xp || 0;
  
  // Define XP requirements for early levels
  // levelRequirements[i] is the total XP needed to REACH level i+1
  const levelRequirements = [0, 100, 300, 700, 1300, 2100];
  const BASE_XP_PER_LEVEL = 1000;

  const calculateLevelData = (xp) => {
    let currentLvl = 1;
    let xpToNext = 0;
    let xpCurrent = 0;

    // Check fixed requirements first
    for (let i = 1; i < levelRequirements.length; i++) {
      if (xp < levelRequirements[i]) {
        currentLvl = i;
        xpToNext = levelRequirements[i] - levelRequirements[i-1];
        xpCurrent = xp - levelRequirements[i-1];
        return { currentLvl, xpCurrent, xpToNext };
      }
    }

    // After fixed levels, use constant XP per level
    const xpBeyondFixed = xp - levelRequirements[levelRequirements.length - 1];
    const levelsBeyondFixed = Math.floor(xpBeyondFixed / BASE_XP_PER_LEVEL);
    
    currentLvl = levelRequirements.length + levelsBeyondFixed;
    xpCurrent = xpBeyondFixed % BASE_XP_PER_LEVEL;
    xpToNext = BASE_XP_PER_LEVEL;

    return { currentLvl, xpCurrent, xpToNext };
  };

  const { currentLvl, xpCurrent, xpToNext } = calculateLevelData(totalXp);
  const progress = (xpCurrent / xpToNext) * 100;

  const getBadgeInfo = (lvl) => {
    if (lvl < 5) return { name: 'Novice Sync', icon: <Shield size={14} />, color: 'text-gray-400', border: 'border-gray-500/30', bg: 'bg-gray-500/10' };
    if (lvl < 10) return { name: 'Operator', icon: <Zap size={14} />, color: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' };
    if (lvl < 15) return { name: 'Technician', icon: <Target size={14} />, color: 'text-secondary', border: 'border-secondary/30', bg: 'bg-secondary/10' };
    if (lvl < 20) return { name: 'Architect', icon: <Award size={14} />, color: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10' };
    return { name: 'Master System', icon: <Cpu size={14} />, color: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-400/10' };
  };

  const badge = getBadgeInfo(currentLvl);

  return (
    <div className="w-full mb-xl">
      <div className="flex justify-between items-end mb-sm">
        <div className="flex flex-col gap-xs">
          <div className={`flex items-center gap-xs px-sm py-[2px] rounded-xs border ${badge.border} ${badge.bg} ${badge.color} w-fit`}>
            {badge.icon}
            <span className="font-display text-[0.6rem] font-black uppercase tracking-[0.1em] leading-none">
              {badge.name}
            </span>
          </div>
          <div className="flex items-baseline gap-xs">
            <span className="font-display text-[1.25rem] font-black text-white leading-none">LVL {currentLvl}</span>
            <span className="font-display text-[0.6rem] text-gray-500 font-bold uppercase tracking-[0.1em]">Sync Auth</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end relative">
          <AnimatePresence>
            {lastXpGain && (
              <motion.span
                key={lastXpGain.timestamp}
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{ opacity: 1, y: -20, scale: 1.2 }}
                exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                className="font-display text-[0.7rem] text-secondary font-black tracking-[0.1em] absolute right-0 z-20 shadow-secondary-glow"
              >
                +{lastXpGain.amount} DP
              </motion.span>
            )}
          </AnimatePresence>
          <span className="font-display text-[0.7rem] text-primary font-black tracking-[0.05em]">
            {xpCurrent} <span className="text-gray-600 opacity-50">/ {xpToNext} DP</span>
          </span>
        </div>
      </div>

      <div className="relative h-[6px] w-full bg-bg-accent rounded-full overflow-hidden border border-gray-800/50">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary shadow-neon z-10"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        
        {/* Experience Gain Highlight */}
        <AnimatePresence>
          {lastXpGain && (
            <motion.div
              key={`gain-${lastXpGain.timestamp}`}
              className="absolute top-0 h-full bg-white opacity-50 z-20"
              initial={{ left: `${Math.max(0, progress - (lastXpGain.amount / (xpToNext / 100)))}%`, width: 0 }}
              animate={{ width: `${(lastXpGain.amount / (xpToNext / 100))}%` }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
        
        {/* Scanning line effect */}
        <motion.div 
          className="absolute top-0 h-full w-[40px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ 
            left: ['-20%', '120%'],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "linear",
            delay: 1
          }}
        />
      </div>
    </div>
  );
}

