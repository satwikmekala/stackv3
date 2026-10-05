import { create } from 'zustand';
import { clampDuration, DURATION_MAX_S } from '@/store/exerciseMeasurement';
import { sameSetTarget, type WorkoutSetEditTarget } from '@/store/workoutSetActions';
import { useWorkoutStore } from '@/store/workoutStore';

export interface ExerciseTimer {
  target: WorkoutSetEditTarget;
  originalDurationS: number;
  elapsedMs: number;
  startedAt: number | null;
}

// Timestamps keep the stopwatch accurate when JS is suspended in the background.
export const elapsedTimerMs = (timer: ExerciseTimer, now = Date.now()) =>
  Math.min(DURATION_MAX_S * 1000, timer.elapsedMs +
    (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt)));

// Ephemeral workout UI state survives minimizing the screen. Only a stopped
// measurement is written to SQLite; ticking never rewrites a set or its target.
export const useExerciseTimerStore = create<{ timer: ExerciseTimer | null }>(() => ({ timer: null }));

const matches = (timer: ExerciseTimer | null, target: WorkoutSetEditTarget) =>
  timer !== null && sameSetTarget(timer.target, target) && timer.target.completed === target.completed;

export function startExerciseTimer(target: WorkoutSetEditTarget, now = Date.now()): boolean {
  const workout = useWorkoutStore.getState();
  const actual = workout.getSetEditTarget();
  const exercise = workout.currentSession?.exercises[target.exerciseIndex];
  if (!actual || actual.completed || !sameSetTarget(actual, target) || exercise?.metric !== 'duration') return false;
  const { timer } = useExerciseTimerStore.getState();
  if (matches(timer, target) && timer!.startedAt !== null) return true;
  useExerciseTimerStore.setState({ timer: matches(timer, target)
    ? { ...timer!, startedAt: now }
    : { target, originalDurationS: exercise.sets[target.setIndex].durationS ?? 1, elapsedMs: 0, startedAt: now } });
  return true;
}

export function stopExerciseTimer(target: WorkoutSetEditTarget, now = Date.now()): boolean {
  const { timer } = useExerciseTimerStore.getState();
  if (!matches(timer, target) || timer!.startedAt === null) return true;
  const elapsedMs = elapsedTimerMs(timer!, now);
  const result = useWorkoutStore.getState().applySetValueAction(target, 'setDuration',
    clampDuration(Math.floor(elapsedMs / 1000)));
  if (result.status !== 'applied') return false;
  useExerciseTimerStore.setState({ timer: { ...timer!, elapsedMs, startedAt: null } });
  return true;
}

export function clearExerciseTimer(target: WorkoutSetEditTarget) {
  if (matches(useExerciseTimerStore.getState().timer, target)) useExerciseTimerStore.setState({ timer: null });
}

export function resetExerciseTimer(target: WorkoutSetEditTarget): boolean {
  const { timer } = useExerciseTimerStore.getState();
  if (!matches(timer, target)) return true;
  const result = useWorkoutStore.getState().applySetValueAction(target, 'setDuration', timer!.originalDurationS);
  if (result.status !== 'applied') return false;
  clearExerciseTimer(target);
  return true;
}

// Completion, skipping, swapping, discarding and changing exercise invalidate
// the row lease, including actions arriving from the Live Activity.
useWorkoutStore.subscribe(() => {
  const { timer } = useExerciseTimerStore.getState();
  if (!timer) return;
  const active = useWorkoutStore.getState().getActiveSetTarget();
  if (!active || !sameSetTarget(active, timer.target)) useExerciseTimerStore.setState({ timer: null });
});
