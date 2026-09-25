import type { UserProfile, WorkoutFocus, WorkoutSession } from '@/store/workoutStore';
import { formatWeight, unitLabel } from '@/store/weightUnits';
import { getActiveSetIndex, getCurrentWorkoutExerciseIndex } from '@/utils/workoutResume';
import { compactExerciseName } from '@/services/liveActivity/compactExerciseName';
import type { LiveActivityActionTargets } from '@/services/liveActivity/actions';

export type WorkoutLiveActivityDisplayState = {
  exerciseName: string;
  compactName: string;
  setNumber: number;
  totalSets: number;
  weight: number | string;
  reps: number | string;
  unit: string;
  actions?: LiveActivityActionTargets;
  actionTarget?: string;
  completionPending?: boolean;
  // Temporary presentation only. ActivityKit updates these before RN is ready.
  interaction?: {
    weightKg: number;
    weightStepKg: number;
    displayFactor: number;
    next?: WorkoutLiveActivityDisplayState;
    nextWeightOffsetKg?: number;
    nextRepsFromCurrent?: boolean;
  };
  acknowledgedRevision?: number;
};

export type WorkoutLiveActivityState = WorkoutLiveActivityDisplayState & {
  workoutId: string;
  // Session exercises are keyed by name throughout the existing domain model.
  // This is that existing key, not an invented SQLite catalog ID.
  exerciseId: string;
};

export type WorkoutLiveActivitySource = {
  currentSession: WorkoutSession | null;
  profile: Pick<UserProfile, 'weightUnit'> | null;
  workoutFocus: WorkoutFocus | null;
};

export function deriveWorkoutLiveActivityState(source: WorkoutLiveActivitySource): WorkoutLiveActivityState | null {
  const session = source.currentSession;
  if (!session || session.completed || !source.profile) return null;
  const exerciseIndex = getCurrentWorkoutExerciseIndex(session, source.workoutFocus);
  const exercise = session.exercises[exerciseIndex];
  if (!exercise || exercise.sets.length === 0) return null;
  const setIndex = getActiveSetIndex(exercise);
  const set = exercise.sets[setIndex];
  const bodyweight = exercise.loadType === 'bodyweight';
  const unit = source.profile.weightUnit;
  return {
    workoutId: session.id,
    exerciseId: exercise.name,
    exerciseName: exercise.name,
    compactName: compactExerciseName(exercise.name),
    setNumber: setIndex + 1,
    totalSets: exercise.sets.length,
    // Match ActiveSetCard's committed display value exactly. Targets are not
    // substitutes for actual set values. Bodyweight has no weight input in-app.
    weight: bodyweight || !Number.isFinite(set.weight) ? '—' : formatWeight(set.weight, unit),
    reps: Number.isFinite(set.reps) ? set.reps : '—',
    unit: bodyweight ? '' : unitLabel(unit),
  };
}
