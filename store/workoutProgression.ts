import type {
  Exercise,
  ExerciseSet,
  ExperienceLevel,
} from '@/store/workoutStore';

const WEIGHT_INCREMENT_BY_LEVEL: Record<ExperienceLevel, number> = {
  beginner: 5,
  intermediate: 2.5,
  advanced: 1.25,
};

const getWeightIncrement = (level: ExperienceLevel | undefined): number =>
  WEIGHT_INCREMENT_BY_LEVEL[level ?? 'intermediate'];

/**
 * Canonical shape for an exercise entering a session with no template targets
 * and no usable history. Shared by the split editor and by custom-split
 * sessions so a first-time exercise always starts the same way.
 */
export const makeDefaultExercise = (name: string): Exercise => ({
  name,
  sets: [
    { reps: 8, weight: 0 },
    { reps: 8, weight: 0 },
    { reps: 8, weight: 0 },
  ],
});

// Pure progressive-overload business logic, unchanged from the previous store.
const computeNextTarget = (
  lastSet: ExerciseSet | undefined,
  templateSet: { reps: number; weight: number },
  experienceLevel: ExperienceLevel | undefined
): { targetReps: number; targetWeight: number } => {
  if (!lastSet) {
    return { targetReps: templateSet.reps, targetWeight: templateSet.weight };
  }
  const priorTargetReps = lastSet.targetReps ?? lastSet.reps;
  const priorTargetWeight = lastSet.targetWeight ?? lastSet.weight;

  if (lastSet.skipped) {
    return { targetReps: priorTargetReps, targetWeight: priorTargetWeight };
  }
  const hitTarget = lastSet.reps >= priorTargetReps;
  return {
    targetReps: priorTargetReps,
    targetWeight: hitTarget
      ? Math.max(0, priorTargetWeight + getWeightIncrement(experienceLevel))
      : priorTargetWeight,
  };
};

export const createSessionExercise = (
  templateExercise: Exercise,
  lastExercise: Exercise | undefined,
  experienceLevel: ExperienceLevel | undefined
): Exercise => ({
  name: templateExercise.name,
  sets: templateExercise.sets
    .filter((set) => !set.type)
    .map((templateSet, setIndex) => {
      const { targetReps, targetWeight } = computeNextTarget(
        lastExercise?.sets[setIndex],
        templateSet,
        experienceLevel
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
});

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
  sets: templateExercise.sets
    .filter((set) => !set.type)
    .map((templateSet, setIndex) => {
      const lastSet = lastExercise?.sets[setIndex];
      const reps = lastSet?.reps ?? templateSet.reps;
      const weight = lastSet?.weight ?? templateSet.weight;

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
