import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Dumbbell, Play, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';

const EXERCISE_CATEGORIES = [
  {
    name: 'Chest',
    exercises: ['Bench Press', 'Incline Press', 'Dumbbell Flyes', 'Push-ups', 'Chest Press']
  },
  {
    name: 'Back',
    exercises: ['Deadlifts', 'Pull-ups', 'Lat Pulldowns', 'Bent Over Rows', 'Seated Rows', 'Face Pulls']
  },
  {
    name: 'Shoulders',
    exercises: ['Overhead Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Flyes', 'Shrugs']
  },
  {
    name: 'Legs',
    exercises: ['Back Squats', 'Front Squats', 'Leg Press', 'Leg Curls', 'Leg Extensions', 'Calf Raises']
  },
  {
    name: 'Arms',
    exercises: ['Bicep Curls', 'Hammer Curls', 'Tricep Pushdowns', 'Skull Crushers', 'Dips']
  },
  {
    name: 'Core',
    exercises: ['Plank', 'Crunches', 'Leg Raises', 'Russian Twists', 'Hanging Knee Raises']
  }
];

export function Routines({ onClose, isModal = false }) {
  const { currentUser } = useAuth();
  const { 
    routines, 
    addRoutine, 
    deleteRoutine, 
    addActivityEntry, 
    loading 
  } = useLedger();
  
  const [showCreate, setShowCreate] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [showVictory, setShowVictory] = useState(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newExercises, setNewExercises] = useState([
    { name: '', sets: 3, reps: 10 }
  ]);
  const [creating, setCreating] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isModal]);

  // Get unique exercises user has used before
  const userExercises = Array.from(new Set(
    routines.flatMap(r => r.exercises.map(e => e.name))
  )).sort();

  const dynamicCategories = [
    ...(userExercises.length > 0 ? [{ name: 'My Exercises', exercises: userExercises }] : []),
    ...EXERCISE_CATEGORIES
  ];

  const handleCreate = async () => {
    if (!currentUser || !newName.trim()) return;
    
    setCreating(true);
    try {
      await addRoutine({
        name: newName,
        exercises: newExercises.filter(e => e.name.trim()),
      });
      if (onClose) {
        onClose();
      } else {
        setShowCreate(false);
      }
      setNewName('');
      setNewExercises([{ name: '', sets: 3, reps: 10 }]);
    } catch (error) {
      console.error('Error creating routine:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (routineId) => {
    try {
      await deleteRoutine(routineId);
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const startWorkout = (routine) => {
    setActiveWorkout({
      routine,
      exercises: routine.exercises.map(e => ({ ...e, completed: false }))
    });
  };

  const toggleExercise = (index) => {
    if (!activeWorkout) return;
    const updated = [...activeWorkout.exercises];
    updated[index].completed = !updated[index].completed;
    setActiveWorkout({ ...activeWorkout, exercises: updated });
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return;
    
    const completedCount = activeWorkout.exercises.filter(e => e.completed).length;
    const routineName = activeWorkout.routine.name;

    await addActivityEntry({
      type: 'workout',
      routineId: activeWorkout.routine.id,
      routineName: activeWorkout.routine.name,
      exercises: activeWorkout.exercises
    });
    
    setActiveWorkout(null);
    setShowVictory({ name: routineName, count: completedCount });
    
    // Auto-hide victory screen after 3 seconds
    setTimeout(() => {
      setShowVictory(null);
    }, 4000);
  };

  const addExerciseField = () => {
    setNewExercises([...newExercises, { name: '', sets: 3, reps: 10 }]);
  };

  const addQuickExercise = (name) => {
    const lastIdx = newExercises.length - 1;
    if (lastIdx >= 0 && !newExercises[lastIdx].name.trim()) {
      const updated = [...newExercises];
      updated[lastIdx] = { ...updated[lastIdx], name };
      setNewExercises(updated);
    } else {
      setNewExercises([...newExercises, { name, sets: 3, reps: 10 }]);
    }
  };

  const updateExerciseField = (index, field, value) => {
    const updated = [...newExercises];
    updated[index] = { ...updated[index], [field]: value };
    setNewExercises(updated);
  };

  const removeExerciseField = (index) => {
    setNewExercises(newExercises.filter((_, i) => i !== index));
  };

  const renderFormContent = () => (
    <div className="p-md sm:p-xl flex flex-col h-full">
      <div className="mb-lg sm:mb-xl">
        <label className="block text-[0.7rem] sm:text-[0.75rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">Routine Name</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g., Push Day"
          autoFocus
          className="w-full p-3 sm:p-4 bg-bg-accent border border-gray-800 text-white rounded-sm transition-all duration-fast focus:border-primary focus:shadow-neon outline-none"
        />
      </div>

      <div className="mb-lg sm:mb-xl">
        <label className="block text-[0.7rem] sm:text-[0.75rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-md">Quick Add</label>
        <div className="flex gap-xs flex-wrap mb-md max-h-[120px] overflow-y-auto no-scrollbar">
          {dynamicCategories.map(cat => (
            <button
              key={cat.name}
              className={`py-[4px] px-[10px] sm:py-[6px] sm:px-[12px] rounded-sm text-[0.6rem] sm:text-[0.65rem] font-bold font-display uppercase tracking-[0.05em] transition-all duration-fast border ${activeCategory === cat.name ? 'bg-primary border-primary text-bg-deep shadow-neon' : 'bg-bg-accent border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'}`}
              onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          {activeCategory && (
            <motion.div 
              className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-xs p-md bg-white/[0.02] rounded-sm border border-gray-800"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {dynamicCategories.find(c => c.name === activeCategory)?.exercises.map(ex => (
                <button
                  key={ex}
                  className="flex items-center gap-xs p-2 bg-bg-card border border-gray-800 rounded-xs text-white text-[0.65rem] text-left transition-all duration-fast hover:border-primary hover:bg-primary/5"
                  onClick={() => addQuickExercise(ex)}
                >
                  <Plus size={10} className="text-primary shrink-0" />
                  <span className="truncate">{ex}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-0 overflow-y-auto flex-1 no-scrollbar pr-xs">
        <label className="block text-[0.7rem] sm:text-[0.75rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-md">Exercises</label>
        {newExercises.map((exercise, index) => (
          <div key={index} className="flex gap-xs sm:gap-sm mb-md">
            <input
              type="text"
              value={exercise.name}
              onChange={(e) => updateExerciseField(index, 'name', e.target.value)}
              placeholder="Exercise"
              className="flex-[2] p-3 sm:p-[0.875rem_1rem] bg-bg-accent border border-gray-800 rounded-sm text-white text-sm focus:border-primary focus:shadow-neon outline-none min-w-0"
            />
            <input
              type="number"
              value={exercise.sets || ''}
              onChange={(e) => updateExerciseField(index, 'sets', Number(e.target.value))}
              placeholder="S"
              className="w-[50px] sm:w-[80px] p-3 text-center bg-bg-accent border border-gray-800 rounded-sm text-white text-sm focus:border-primary focus:shadow-neon outline-none"
            />
            <input
              type="number"
              value={exercise.reps || ''}
              onChange={(e) => updateExerciseField(index, 'reps', Number(e.target.value))}
              placeholder="R"
              className="w-[50px] sm:w-[80px] p-3 text-center bg-bg-accent border border-gray-800 rounded-sm text-white text-sm focus:border-primary focus:shadow-neon outline-none"
            />
            {newExercises.length > 1 && (
              <button 
                className="p-xs sm:p-sm bg-transparent text-gray-700 rounded-sm transition-all duration-fast hover:text-error hover:bg-error/10 shrink-0"
                onClick={() => removeExerciseField(index)}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button className="flex items-center justify-center gap-sm p-[10px] bg-transparent text-primary font-extrabold font-display uppercase tracking-[0.1em] text-[0.6rem] sm:text-[0.65rem] transition-all duration-fast border border-dashed border-gray-800 w-full rounded-sm hover:border-primary hover:bg-primary/5" onClick={addExerciseField}>
          <Plus size={14} />
          Add Exercise
        </button>
      </div>

      <div className="mt-auto pt-lg sm:pt-xl shrink-0">
        <button 
          className="flex items-center justify-center gap-sm py-[12px] px-[25px] bg-secondary text-white font-extrabold font-display uppercase tracking-[0.1em] text-[0.7rem] sm:text-[0.75rem] rounded-sm shadow-[0_0_15px_var(--color-secondary-glow)] transition-all duration-fast hover:not-disabled:bg-white hover:not-disabled:text-secondary hover:not-disabled:shadow-[0_0_25px_var(--color-secondary-glow)] disabled:opacity-50 disabled:cursor-not-allowed w-full"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
        >
          {creating ? <Loader2 className="animate-spin" size={18} /> : 'Create'}
        </button>
      </div>
    </div>
  );

  const sidebarUI = (onDismiss) => (
    <div className="fixed inset-0 bg-[#050507]/70 backdrop-blur-[4px] z-[1000] flex justify-end" onClick={onDismiss}>
      <motion.div 
        className="w-full max-w-[500px] h-full bg-bg-deep border-l border-gray-800 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <header className="p-xl pb-0 border-none mb-[3rem]">
          <div className="flex justify-between items-center w-full">
            <div>
              <h1 className="text-[1.75rem] font-black font-display text-white uppercase tracking-[0.1em] mb-xs">Create Routine</h1>
              <p className="text-primary m-0 text-[0.7rem] font-display uppercase tracking-[0.2em] opacity-70">Build a new workout</p>
            </div>
            <button className="p-xs bg-transparent text-gray-500 rounded-sm transition-all duration-fast hover:text-error hover:bg-error/10" onClick={onDismiss}>
              <X size={24} />
            </button>
          </div>
        </header>
        {renderFormContent()}
      </motion.div>
    </div>
  );

  if (isModal) {
    return sidebarUI(onClose);
  }

  return (
    <motion.div 
      className="max-w-[1000px] mx-auto px-1 sm:px-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-lg sm:mb-[3rem] pb-md border-b border-gray-800">
        <div className="flex justify-between items-end flex-wrap gap-md w-full">
          <div className="min-w-0">
            <h1 className="text-[1.25rem] sm:text-[1.75rem] font-black font-display text-white uppercase tracking-[0.1em] mb-xs truncate">Routines</h1>
            <p className="text-primary m-0 text-[0.6rem] sm:text-[0.7rem] font-display uppercase tracking-[0.2em] opacity-70">Track your workouts</p>
          </div>
          <button className="flex items-center gap-xs sm:gap-sm py-2 px-4 sm:py-2.5 sm:px-5 bg-primary text-bg-deep rounded-sm font-extrabold font-display uppercase tracking-[0.1em] text-[0.65rem] sm:text-[0.75rem] shadow-[0_0_15px_var(--color-primary-glow)] transition-all duration-fast hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]" onClick={() => setShowCreate(true)}>
            <Plus size={18} className="sm:w-[20px] sm:h-[20px]" />
            New
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md sm:gap-xl">
          {[1,2,3].map(i => <div key={i} className="h-[200px] bg-bg-accent rounded-md animate-pulse border border-gray-800" />)}
        </div>
      ) : routines.length === 0 ? (
        <div className="text-center py-3xl px-md">
          <Dumbbell size={48} className="text-gray-800 mb-lg drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] mx-auto" />
          <h3 className="mb-sm font-display uppercase text-white text-[1rem]">No routines yet</h3>
          <p className="text-gray-500 mb-xl text-[0.8rem]">Create your first workout routine to get started</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create Routine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md sm:gap-xl">
          {routines.map((routine) => (
            <motion.div 
              key={routine.id} 
              className="bg-bg-card rounded-md p-md sm:p-xl border border-gray-800 transition-all duration-normal relative overflow-hidden flex flex-col hover:border-primary hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-primary before:opacity-30 hover:before:opacity-100 hover:before:shadow-neon"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex justify-between items-start mb-lg">
                <h3 className="text-[1rem] font-display uppercase tracking-[0.05em] text-white">{routine.name}</h3>
                <button 
                  className="p-xs bg-transparent text-gray-700 rounded-xs opacity-30 transition-all duration-fast hover:opacity-100 hover:text-error hover:bg-error/10"
                  onClick={() => handleDelete(routine.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <ul className="list-none mb-xl">
                {routine.exercises.slice(0, 4).map((exercise, i) => (
                  <li key={i} className="py-sm border-b border-white/[0.03] flex justify-between text-gray-300 text-[0.85rem] last:border-none">
                    {exercise.name}
                    {exercise.sets && exercise.reps && (
                      <span className="text-primary font-display font-bold text-[0.75rem]"> • {exercise.sets}×{exercise.reps}</span>
                    )}
                  </li>
                ))}
                {routine.exercises.length > 4 && (
                  <li className="text-gray-500 italic font-body text-[0.8rem] py-sm border-none">
                    +{routine.exercises.length - 4} more
                  </li>
                )}
              </ul>
              
              <button 
                className="w-full flex items-center justify-center gap-sm p-3 bg-bg-accent text-primary rounded-sm font-extrabold font-display uppercase tracking-[0.1em] text-[0.7rem] border border-primary/20 transition-all duration-fast mt-auto hover:bg-primary hover:text-bg-deep hover:shadow-neon"
                onClick={() => startWorkout(routine)}
              >
                <Play size={18} />
                Start Workout
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && sidebarUI(() => setShowCreate(false))}
      </AnimatePresence>

      <AnimatePresence>
        {activeWorkout && (
          <motion.div 
            className="fixed inset-0 bg-[#050507]/85 backdrop-blur-[8px] flex items-center justify-center p-lg z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-bg-card rounded-md w-full max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col border border-gray-800"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="flex justify-between items-center p-xl bg-primary text-bg-deep shadow-neon">
                <h2 className="text-bg-deep text-[1rem] font-display uppercase tracking-[0.1em]">{activeWorkout.routine.name}</h2>
                <span className="text-[0.75rem] font-black font-display">
                  {activeWorkout.exercises.filter(e => e.completed).length}/{activeWorkout.exercises.length} done
                </span>
              </div>
              
              <div className="p-lg max-h-[400px] overflow-y-auto">
                {activeWorkout.exercises.map((exercise, index) => (
                  <button
                    key={index}
                    className={`flex items-center gap-md w-full p-lg bg-bg-accent rounded-sm mb-md text-left transition-all duration-fast border border-gray-800 hover:border-primary ${exercise.completed ? 'bg-success/5 border-success' : ''}`}
                    onClick={() => toggleExercise(index)}
                  >
                    <div className={`w-[28px] h-[28px] border-2 border-gray-700 rounded-xs flex items-center justify-center shrink-0 transition-all duration-fast ${exercise.completed ? 'bg-success border-success text-bg-deep shadow-success-glow' : ''}`}>
                      {exercise.completed && <Check size={16} />}
                    </div>
                    <span className="flex flex-col">
                      <span className="font-bold text-white text-[0.9rem]">{exercise.name}</span>
                      {exercise.sets && exercise.reps && (
                        <small className="text-gray-500 text-[0.75rem]">{exercise.sets} sets × {exercise.reps} reps</small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-md p-xl border-t border-gray-800">
                <button className="flex-1 py-[15px] bg-transparent text-gray-500 font-extrabold font-display uppercase tracking-[0.1em] text-[0.75rem] hover:text-white" onClick={() => setActiveWorkout(null)}>
                  Cancel
                </button>
                <button className="flex-1 py-[15px] bg-success text-bg-deep font-extrabold font-display uppercase tracking-[0.1em] border-radius-sm shadow-success-glow hover:bg-white hover:shadow-success-glow" onClick={finishWorkout}>
                  Finish Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVictory && (
          <motion.div 
            className="fixed inset-0 bg-[#050507]/90 backdrop-blur-[10px] z-[2000] flex items-center justify-center p-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVictory(null)}
          >
            <motion.div 
              className="bg-bg-card border-2 border-primary rounded-lg p-[4.5rem] text-center max-w-[400px] w-full shadow-neon-strong relative overflow-hidden z-[2001] before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[conic-gradient(transparent,var(--color-primary-glow),transparent_30%)] before:animate-[rotate_conic_4s_linear_infinite] before:-z-10"
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <div className="mb-xl flex justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Dumbbell size={64} className="text-primary" />
                </motion.div>
              </div>
              <h2 className="text-[1.5rem] font-black mb-xs text-white shadow-neon font-display">Workout Complete!</h2>
              <p className="text-primary font-display uppercase tracking-[0.2em] text-[0.7rem] mb-[3rem]">{showVictory.name}</p>
              <div className="flex justify-center gap-[3rem] mb-[3rem]">
                <div className="flex flex-col gap-[4px]">
                  <span className="text-[1.25rem] font-black text-white font-display">{showVictory.count}</span>
                  <span className="text-[0.55rem] text-gray-500 uppercase tracking-[0.1em]">Exercises</span>
                </div>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-[1.25rem] font-black text-white font-display">+100</span>
                  <span className="text-[0.55rem] text-gray-500 uppercase tracking-[0.1em]">XP</span>
                </div>
              </div>
              <p className="text-[0.75rem] text-gray-300 mb-[3rem] italic">Level Up! You're stronger than yesterday.</p>
              <button className="w-full p-md bg-primary text-bg-deep rounded-sm font-extrabold font-display uppercase tracking-[0.2em] shadow-neon">Continue</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
