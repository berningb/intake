import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Dumbbell, Play, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { Routine, Exercise } from '../types';
import styles from './Routines.module.css';

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

export function Routines({ onClose, isModal = false }: { onClose?: () => void, isModal?: boolean }) {
  const { currentUser } = useAuth();
  const { 
    routines, 
    addRoutine, 
    deleteRoutine, 
    addActivityEntry, 
    loading 
  } = useLedger();
  
  const [showCreate, setShowCreate] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<{routine: Routine, exercises: Exercise[]} | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newExercises, setNewExercises] = useState<{name: string, sets?: number, reps?: number}[]>([
    { name: '', sets: 3, reps: 10 }
  ]);
  const [creating, setCreating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  const handleDelete = async (routineId: string) => {
    try {
      await deleteRoutine(routineId);
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const startWorkout = (routine: Routine) => {
    setActiveWorkout({
      routine,
      exercises: routine.exercises.map(e => ({ ...e, completed: false }))
    });
  };

  const toggleExercise = (index: number) => {
    if (!activeWorkout) return;
    const updated = [...activeWorkout.exercises];
    updated[index].completed = !updated[index].completed;
    setActiveWorkout({ ...activeWorkout, exercises: updated });
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return;
    
    await addActivityEntry({
      type: 'workout',
      routineId: activeWorkout.routine.id,
      routineName: activeWorkout.routine.name,
      exercises: activeWorkout.exercises
    });
    
    setActiveWorkout(null);
  };

  const addExerciseField = () => {
    setNewExercises([...newExercises, { name: '', sets: 3, reps: 10 }]);
  };

  const addQuickExercise = (name: string) => {
    const lastIdx = newExercises.length - 1;
    if (lastIdx >= 0 && !newExercises[lastIdx].name.trim()) {
      const updated = [...newExercises];
      updated[lastIdx] = { ...updated[lastIdx], name };
      setNewExercises(updated);
    } else {
      setNewExercises([...newExercises, { name, sets: 3, reps: 10 }]);
    }
  };

  const updateExerciseField = (index: number, field: string, value: string | number) => {
    const updated = [...newExercises];
    updated[index] = { ...updated[index], [field]: value };
    setNewExercises(updated);
  };

  const removeExerciseField = (index: number) => {
    setNewExercises(newExercises.filter((_, i) => i !== index));
  };

  const renderFormContent = () => (
    <div className={styles.sidebarForm}>
      <div className={styles.field}>
        <label>Routine Name</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g., Push Day, Leg Day"
          autoFocus
        />
      </div>

      <div className={styles.quickSelectSection}>
        <label>Quick Add Exercises</label>
        <div className={styles.categoryTabs}>
          {dynamicCategories.map(cat => (
            <button
              key={cat.name}
              className={`${styles.categoryTab} ${activeCategory === cat.name ? styles.activeTab : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          {activeCategory && (
            <motion.div 
              className={styles.quickExerciseGrid}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {dynamicCategories.find(c => c.name === activeCategory)?.exercises.map(ex => (
                <button
                  key={ex}
                  className={styles.quickExBtn}
                  onClick={() => addQuickExercise(ex)}
                >
                  <Plus size={12} />
                  {ex}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.exercisesSection}>
        <label>Exercises</label>
        {newExercises.map((exercise, index) => (
          <div key={index} className={styles.exerciseRow}>
            <input
              type="text"
              value={exercise.name}
              onChange={(e) => updateExerciseField(index, 'name', e.target.value)}
              placeholder="Exercise name"
              className={styles.exerciseName}
            />
            <input
              type="number"
              value={exercise.sets || ''}
              onChange={(e) => updateExerciseField(index, 'sets', Number(e.target.value))}
              placeholder="Sets"
              className={styles.exerciseNum}
            />
            <input
              type="number"
              value={exercise.reps || ''}
              onChange={(e) => updateExerciseField(index, 'reps', Number(e.target.value))}
              placeholder="Reps"
              className={styles.exerciseNum}
            />
            {newExercises.length > 1 && (
              <button 
                className={styles.removeBtn}
                onClick={() => removeExerciseField(index)}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button className={styles.addExerciseBtn} onClick={addExerciseField}>
          <Plus size={16} />
          Add Exercise
        </button>
      </div>

      <div className={styles.sidebarFooter}>
        <button 
          className={styles.saveBtn}
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          style={{ width: '100%' }}
        >
          {creating ? <Loader2 className={styles.spinner} size={18} /> : 'Create Routine'}
        </button>
      </div>
    </div>
  );

  const sidebarUI = (onDismiss: () => void) => (
    <div className={styles.overlay} onClick={onDismiss}>
      <motion.div 
        className={styles.modalContainer} 
        onClick={e => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <header className={styles.header} style={{ padding: 'var(--space-xl)', paddingBottom: 0, borderBottom: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h1>Create Routine</h1>
              <p>Build a new workout</p>
            </div>
            <button className={styles.closeBtn} onClick={onDismiss}>
              <X size={24} />
            </button>
          </div>
        </header>
        {renderFormContent()}
      </motion.div>
    </div>
  );

  if (isModal) {
    return sidebarUI(onClose!);
  }

  return (
    <motion.div 
      className={styles.routines}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Workout Routines</h1>
            <p>Create and track your exercise routines</p>
          </div>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={20} />
            New Routine
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      ) : routines.length === 0 ? (
        <div className={styles.emptyState}>
          <Dumbbell size={48} />
          <h3>No routines yet</h3>
          <p>Create your first workout routine to get started</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create Routine
          </button>
        </div>
      ) : (
        <div className={styles.routineGrid}>
          {routines.map((routine) => (
            <motion.div 
              key={routine.id} 
              className={styles.routineCard}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className={styles.routineHeader}>
                <h3>{routine.name}</h3>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(routine.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <ul className={styles.exerciseList}>
                {routine.exercises.slice(0, 4).map((exercise, i) => (
                  <li key={i}>
                    {exercise.name}
                    {exercise.sets && exercise.reps && (
                      <span> • {exercise.sets}×{exercise.reps}</span>
                    )}
                  </li>
                ))}
                {routine.exercises.length > 4 && (
                  <li className={styles.moreExercises}>
                    +{routine.exercises.length - 4} more
                  </li>
                )}
              </ul>
              
              <button 
                className={styles.startBtn}
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
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.workoutModal}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className={styles.workoutHeader}>
                <h2>{activeWorkout.routine.name}</h2>
                <span className={styles.progress}>
                  {activeWorkout.exercises.filter(e => e.completed).length}/{activeWorkout.exercises.length} done
                </span>
              </div>
              
              <div className={styles.workoutExercises}>
                {activeWorkout.exercises.map((exercise, index) => (
                  <button
                    key={index}
                    className={`${styles.workoutExercise} ${exercise.completed ? styles.done : ''}`}
                    onClick={() => toggleExercise(index)}
                  >
                    <div className={styles.checkbox}>
                      {exercise.completed && <Check size={16} />}
                    </div>
                    <span className={styles.exerciseInfo}>
                      {exercise.name}
                      {exercise.sets && exercise.reps && (
                        <small>{exercise.sets} sets × {exercise.reps} reps</small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className={styles.workoutActions}>
                <button className={styles.cancelBtn} onClick={() => setActiveWorkout(null)}>
                  Cancel
                </button>
                <button className={styles.finishBtn} onClick={finishWorkout}>
                  Finish Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
