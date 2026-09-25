import type {
  Exercise,
  ExerciseLoadType,
  ExerciseSet,
  UserProfile,
} from '@/store/workoutStore';
import { getWeightIncrementKg } from '@/store/weightUnits';

/**
 * Canonical shape for an exercise entering a session with no template targets
 * and no usable history. Shared by the split editor and by custom-split
 * sessions so a first-time exercise always starts the same way.
 */
export const makeDefaultExercise = (
  name: string,
  loadType: ExerciseLoadType = 'external_weight'
): Exercise => ({
  name,
  loadType,
  sets: [
    { reps: 8, weight: 0 },
    { reps: 8, weight: 0 },
    { reps: 8, weight: 0 },
  ],
});

// Progressive-overload business logic shared by every live session-start path.
const computeNextTarget = (
  lastSet: ExerciseSet | undefined,
  templateSet: { reps: number; weight: number },
  progressionIncrementKg: number,
  loadType: ExerciseLoadType
): { targetReps: number; targetWeight: number } => {
  if (!lastSet) {
    return {
      targetReps: templateSet.reps,
      targetWeight: loadType === 'bodyweight' ? 0 : templateSet.weight,
    };
  }
  const priorTargetReps = lastSet.targetReps ?? lastSet.reps;
  const priorTargetWeight = lastSet.weight ?? lastSet.targetWeight ?? templateSet.weight;

  if (lastSet.skipped) {
    return {
      targetReps: priorTargetReps,
      targetWeight: loadType === 'bodyweight' ? 0 : priorTargetWeight,
    };
  }
  const hitTarget = lastSet.reps >= priorTargetReps;
  return {
    targetReps: priorTargetReps,
    targetWeight:
      loadType === 'bodyweight'
        ? 0
        : hitTarget
          ? Math.max(0, priorTargetWeight + progressionIncrementKg)
          : priorTargetWeight,
  };
};

export const createSessionExercise = (
  templateExercise: Exercise,
  lastExercise: Exercise | undefined,
  profile: Pick<
    UserProfile,
    'weightUnit' | 'weightIncrement' | 'weightIncrementLbs'
  >
): Exercise => {
  // One configured step keeps the next target on the same grid as the actual
  // weight the user logged, regardless of their display unit.
  const progressionIncrementKg = getWeightIncrementKg(profile);

  return {
    name: templateExercise.name,
    loadType: templateExercise.loadType,
    sets: templateExercise.sets
      .filter((set) => !set.type)
      .map((templateSet, setIndex) => {
        const { targetReps, targetWeight } = computeNextTarget(
          lastExercise?.sets[setIndex],
          templateSet,
          progressionIncrementKg,
          templateExercise.loadType
        );
        return {
          reps: targetReps,
          weight: targetWeight,
          targetReps,
          targetWeight,
          completed: false,
          skipped: false,
        };
      }),
  };
};

/**
 * Builds an already-completed exercise without applying progressive overload.
 * History values are copied by set position; template values cover exercises
 * (or individual sets) that have never been logged before.
 */
export const createCompletedSessionExercise = (
  templateExercise: Exercise,
  lastExercise: Exercise | undefined
): Exercise => ({
  name: templateExercise.name,
  loadType: templateExercise.loadType,
  sets: templateExercise.sets
    .filter((set) => !set.type)
    .map((templateSet, setIndex) => {
      const lastSet = lastExercise?.sets[setIndex];
      const reps = lastSet?.reps ?? templateSet.reps;
      const weight = templateExercise.loadType === 'bodyweight'
        ? 0
        : lastSet?.weight ?? templateSet.weight;

      return {
        reps,
        weight,
        targetReps: lastSet?.targetReps ?? reps,
        targetWeight: lastSet?.targetWeight ?? weight,
        completed: true,
        skipped: false,
      };
    }),
});
