import type { UserProfile, WorkoutFocus, WorkoutSession } from '@/store/workoutStore';
import { getActiveSetIndex, getCurrentWorkoutExerciseIndex } from '@/utils/workoutResume';
import { getWeightIncrementKg, kgToLbs } from '@/store/weightUnits';
import { getMeasurementActions, getNextIncompleteExerciseIndex, isExerciseComplete, projectSetToggle, type WorkoutSetTarget } from '@/store/workoutSetActions';
import { DURATION_STEP_S, getExerciseMetric, isValidDuration } from '@/store/exerciseMeasurement';
import { createActionTargetPrefix } from '@/services/liveActivity/actions';
import { deriveWorkoutLiveActivityState, type WorkoutLiveActivityState } from '@/services/liveActivity/state';

type Source = { currentSession: WorkoutSession | null; profile: UserProfile | null; workoutFocus: WorkoutFocus | null };
type ReadTarget = (exerciseIndex: number, setIndex: number) => WorkoutSetTarget | null;

export function deriveInteractiveWorkoutPresentation(source: Source, readTarget: ReadTarget): WorkoutLiveActivityState | null {
  const frame = (snapshot: Source) => {
    const display = deriveWorkoutLiveActivityState(snapshot);
    if (!display || !snapshot.currentSession || !snapshot.profile) return null;
    const ei = getCurrentWorkoutExerciseIndex(snapshot.currentSession, snapshot.workoutFocus);
    const exercise = snapshot.currentSession.exercises[ei];
    const si = getActiveSetIndex(exercise);
    const set = exercise.sets[si];
    const target = readTarget(ei, si);
    const metric = getExerciseMetric(exercise);
    if (set.completed || !target || target.workoutId !== snapshot.currentSession.id ||
        target.workoutStartedAt !== snapshot.currentSession.date || target.exerciseName !== exercise.name ||
        !Number.isFinite(set.weight) ||
        (metric === 'duration' ? !isValidDuration(set.durationS) : !Number.isFinite(set.reps))) return display;
    const step = getWeightIncrementKg(snapshot.profile, exercise.entryUnit);
    if (!Number.isFinite(step) || step <= 0) return display;
    display.actionTarget = createActionTargetPrefix(target, step);
    // Only the controls this measurement exposes in-app; seconds have their own actions.
    display.actions = Object.fromEntries(getMeasurementActions(exercise.loadType, metric)
      .map((action) => [action, action]));
    display.interaction = {
      weightKg: set.weight, weightStepKg: step,
      displayFactor: exercise.entryUnit === 'lbs' ? kgToLbs(1) : 1,
      ...(metric === 'duration' ? { durationS: set.durationS, durationStepS: DURATION_STEP_S } : {}),
    };
    return display;
  };
  const result = frame(source);
  if (!result?.interaction || !source.currentSession || !source.profile) return result;
  const session = source.currentSession;
  const ei = getCurrentWorkoutExerciseIndex(session, source.workoutFocus);
  const si = getActiveSetIndex(session.exercises[ei]);
  const { exercises, propagation } = projectSetToggle(session.exercises, ei, si, source.profile);
  const nextIndex = isExerciseComplete(exercises[ei]) ? getNextIncompleteExerciseIndex(exercises, ei) : ei;
  if (nextIndex !== -1) {
    const next = frame({ ...source, currentSession: { ...session, exercises },
      workoutFocus: { workoutId: session.id, exerciseIndex: nextIndex } });
    if (next?.interaction) {
      result.interaction.next = next;
      // The domain projection supplies how edits feed the immediate next set.
      // Pass its exact offset, avoiding accumulated floating-point delta error.
      if (nextIndex === ei && propagation?.setIndex === getActiveSetIndex(exercises[nextIndex])) {
        result.interaction.nextWeightOffsetKg = propagation.weightOffsetKg;
        result.interaction.nextRepsFromCurrent = propagation.repsFromCurrent;
        if (propagation.durationFromCurrent) result.interaction.nextDurationFromCurrent = true;
      }
    }
  }
  return result;
}
