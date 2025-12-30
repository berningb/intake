import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

export function LiquidProgressBar({ 
  percentage, 
  label, 
  current, 
  target, 
  icon: Icon,
  colorClass = "from-blue-600 to-blue-400",
  glowColor = "rgba(59, 130, 246, 0.5)",
  unit = "g",
  onIncrease,
  onDecrease,
  segments = 0
}) {
  return (
    <div className="flex flex-col gap-sm group">
      <div className="flex justify-between items-center text-gray-300 font-display text-[0.6rem] font-bold uppercase tracking-[0.15em] mb-xs">
        <div className="flex items-center gap-xs">
          {Icon && <Icon size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-xs font-black">
          <span className="text-white">{Math.round(current)}</span>
          <span className="text-gray-600 opacity-50">/</span>
          <span className="text-gray-500">{target || '---'}{unit}</span>
        </div>
      </div>

      <div className="relative h-[24px] bg-bg-deep rounded-xs overflow-hidden border border-gray-800 group-hover:border-white/10 transition-colors shadow-inner flex items-center">
        {/* Interval Segment Markers */}
        {segments > 1 && (
          <div className="absolute inset-0 z-20 flex justify-evenly pointer-events-none">
            {[...Array(segments - 1)].map((_, i) => {
              const segmentPercent = (100 / segments) * (i + 1);
              const isFilled = percentage >= segmentPercent;
              return (
                <div 
                  key={i} 
                  className={`w-[2px] h-full transition-colors duration-500 ${
                    isFilled 
                      ? 'bg-white/30 shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
                      : 'bg-white/5 border-r border-black/20'
                  }`}
                />
              );
            })}
          </div>
        )}

        {/* Quick Controls Layer */}
        {onIncrease && onDecrease && (
          <div className="absolute inset-0 z-30 flex justify-between px-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDecrease();
              }}
              className="pointer-events-auto h-full px-[4px] text-white/40 hover:text-white transition-colors"
              title="Decrease"
            >
              <Minus size={12} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onIncrease();
              }}
              className="pointer-events-auto h-full px-[4px] text-white/40 hover:text-white transition-colors"
              title="Increase"
            >
              <Plus size={12} />
            </button>
          </div>
        )}

        {/* Liquid Fill */}
        <motion.div 
          className={`absolute bottom-0 left-0 right-0 bg-linear-to-t ${colorClass} z-10`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percentage)}%`, height: '100%' }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          style={{ boxShadow: `0 0 15px ${glowColor}` }}
        >
          {/* Micro Bubbles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white/20 rounded-full"
              style={{
                width: 3,
                height: 3,
                left: `${20 + i * 30}%`,
                bottom: '-5px'
              }}
              animate={{
                bottom: '120%',
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + i,
                repeat: Infinity,
                delay: i * 0.5
              }}
            />
          ))}
        </motion.div>

        {/* Over-target indicator */}
        {percentage > 100 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-0 top-0 bottom-0 w-[4px] bg-error z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          />
        )}
      </div>
    </div>
  );
}

