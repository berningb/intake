import { motion } from 'framer-motion';
import { Target, CheckCircle2, Circle, Zap } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

export function BountyBoard() {
  const { getMissions } = useLedger();
  const missions = getMissions();

  if (missions.length === 0) return null;

  return (
    <div className="bg-bg-card border border-gray-800 rounded-md p-xl shadow-card relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-primary/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="flex justify-between items-center mb-xl relative z-10">
        <div className="flex items-center gap-md">
          <Target size={20} className="text-primary shadow-primary-glow" />
          <h2 className="font-display text-[1rem] font-black uppercase tracking-[0.2em] m-0 text-white">Daily Bounties</h2>
        </div>
        <div className="flex items-center gap-xs text-[0.6rem] font-display text-gray-500 uppercase tracking-[0.1em]">
          <span>Active Operations</span>
          <div className="w-[6px] h-[6px] rounded-full bg-secondary animate-pulse" />
        </div>
      </div>

      <div className="grid gap-md relative z-10">
        {missions.map((mission) => (
          <motion.div
            key={mission.id}
            className={`group flex items-center gap-lg p-lg rounded-sm border transition-all duration-fast ${
              mission.completed 
                ? 'bg-primary/5 border-primary/30 shadow-[inset_0_0_20px_rgba(0,242,255,0.05)]' 
                : 'bg-bg-accent/50 border-gray-800 hover:border-gray-700 hover:bg-bg-accent'
            }`}
            whileHover={{ x: mission.completed ? 0 : 4 }}
          >
            <div className={`shrink-0 ${mission.completed ? 'text-primary' : 'text-gray-600'}`}>
              {mission.completed ? (
                <CheckCircle2 size={24} className="drop-shadow-[0_0_8px_var(--color-primary-glow)]" />
              ) : (
                <Circle size={24} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`font-display text-[0.8rem] font-black uppercase tracking-[0.1em] truncate ${mission.completed ? 'text-white' : 'text-gray-400'}`}>
                  {mission.name}
                </h3>
                <div className={`flex items-center gap-1 font-display text-[0.65rem] font-bold ${mission.completed ? 'text-secondary' : 'text-gray-600'}`}>
                  <Zap size={10} />
                  <span>+{mission.xp} DP</span>
                </div>
              </div>
              <p className="text-[0.7rem] text-gray-500 font-body leading-tight">
                {mission.desc}
              </p>
            </div>

            {/* Progress Bar for non-binary missions */}
            {mission.goal > 1 && !mission.completed && (
              <div className="w-[80px] shrink-0 max-sm:hidden">
                <div className="flex justify-between mb-1">
                  <span className="text-[0.55rem] font-display text-gray-600 uppercase">Sync</span>
                  <span className="text-[0.55rem] font-display text-gray-400">{Math.min(100, Math.round((mission.current / mission.goal) * 100))}%</span>
                </div>
                <div className="h-[3px] w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, (mission.current / mission.goal) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-xl pt-lg border-t border-gray-800/50 flex justify-between items-center opacity-50">
        <span className="text-[0.55rem] font-display text-gray-500 uppercase tracking-[0.2em]">Bounty Board v2.4</span>
        <span className="text-[0.55rem] font-display text-gray-500 uppercase tracking-[0.2em]">Reset 00:00:00</span>
      </div>
    </div>
  );
}

