import { ARCHETYPE_COMPOSITIONS } from '@/constants/archetypes';
import { workoutMeta } from '@/constants/workouts';
import type {
  BonusSetType,
  IntensityLevel,
  WorkoutSession,
} from '@/store/workoutStore';
import { kgToLbs, type WeightUnit } from '@/store/weightUnits';

export type WorkoutSummaryExercise = {
  name: string;
  setCount: number;
  repCount: number;
  volumeKg: number;
};

export type WorkoutSummary = {
  id: string;
  title: string;
  accent: string;
  date: Date;
  intensity: IntensityLevel;
  setCount: number;
  exerciseCount: number;
  repCount: number;
  volumeKg: number;
  specialSets: Record<BonusSetType, number>;
  exercises: WorkoutSummaryExercise[];
};

const SPECIAL_SET_TYPES: BonusSetType[] = ['pr', 'dropset', 'extra'];

/**
 * Converts a completed session into the exact metrics shown on the completion
 * screen. Skipped sets are intentionally excluded even though the logging flow
 * marks them completed in order to advance through the workout.
 */
export function deriveWorkoutSummary(session: WorkoutSession): WorkoutSummary {
  const exercises = session.exercises.flatMap<WorkoutSummaryExercise>((exercise) => {
    const performedSets = exercise.sets.filter(
      (set) => set.completed && !set.skipped
    );

    if (performedSets.length === 0) return [];

    return [{
      name: exercise.name,
      setCount: performedSets.length,
      repCount: performedSets.reduce((sum, set) => sum + set.reps, 0),
      volumeKg: performedSets.reduce(
        (sum, set) => sum + set.reps * set.weight,
        0
      ),
    }];
  });

  const performedSets = session.exercises.flatMap((exercise) =>
    exercise.sets.filter((set) => set.completed && !set.skipped)
  );

  const specialSets: Record<BonusSetType, number> = {
    pr: 0,
    dropset: 0,
    extra: 0,
  };
  performedSets.forEach((set) => {
    if (set.type && SPECIAL_SET_TYPES.includes(set.type)) {
      specialSets[set.type] += 1;
    }
  });

  const primaryArchetype = session.archetype
    ? ARCHETYPE_COMPOSITIONS[session.archetype]
    : null;
  const secondaryArchetype = session.secondaryArchetype
    ? ARCHETYPE_COMPOSITIONS[session.secondaryArchetype]
    : null;
  const legacyMeta = session.workoutTypes[0]
    ? workoutMeta[session.workoutTypes[0]]
    : null;

  return {
    id: session.id,
    title: primaryArchetype
      ? secondaryArchetype
        ? `${primaryArchetype.shortLabel} + ${secondaryArchetype.shortLabel}`
        : primaryArchetype.shortLabel
      : legacyMeta?.label ?? 'Workout',
    accent: primaryArchetype?.color ?? legacyMeta?.color ?? '#FF7A3D',
    date: new Date(session.date),
    intensity: session.intensity ?? 'medium',
    setCount: performedSets.length,
    exerciseCount: exercises.length,
    repCount: performedSets.reduce((sum, set) => sum + set.reps, 0),
    volumeKg: performedSets.reduce(
      (sum, set) => sum + set.reps * set.weight,
      0
    ),
    specialSets,
    exercises,
  };
}

export function displayVolume(volumeKg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? kgToLbs(volumeKg) : volumeKg;
}

export function formatSummaryNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSummaryDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function intensitySummaryLabel(intensity: IntensityLevel): string {
  if (intensity === 'easy') return 'Felt easy';
  if (intensity === 'hard') return 'Felt hard';
  return 'Felt just right';
}

export function specialSetSummaryLabel(
  specialSets: Record<BonusSetType, number>
): string | null {
  const entries = SPECIAL_SET_TYPES
    .map((type) => [type, specialSets[type]] as const)
    .filter((entry) => entry[1] > 0);
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);

  if (total === 0) return null;

  if (entries.length === 1) {
    const [type, count] = entries[0];
    const name = type === 'pr' ? 'PR' : type === 'dropset' ? 'DROP' : 'EXTRA';
    return `${count} ${name} SET${count === 1 ? '' : 'S'} LOGGED`;
  }

  return `${total} SPECIAL SET${total === 1 ? '' : 'S'} LOGGED`;
}
