import { longContentDate } from '@/utils/content';
import { ARCHETYPE_COMPOSITIONS, getSessionWorkoutDisplay } from '@/constants/archetypes';
import { workoutMeta } from '@/constants/workouts';
import type {
  BonusSetType,
  ExerciseLoadType,
  IntensityLevel,
  WorkoutSession,
} from '@/store/workoutStore';
import { performedSets, formatRepScheme } from '@/store/liftLog';
import { formatDuration, formatDurationScheme, getExerciseMetric, type ExerciseMetric } from '@/store/exerciseMeasurement';
import { formatWeight, kgToLbs, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { parseSessionDate } from '@/store/workoutCalendar';

export type WorkoutSummaryExercise = {
  name: string;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  setCount: number;
  /** Rep-metric only; timed exercises contribute 0. */
  repCount: number;
  repsBySet: number[];
  /** Duration-metric only, in seconds. */
  durationsBySet: number[];
  /** Canonical kg per performed set, in the same order as reps or durations. */
  weightsBySet: number[];
  /** weight × reps; timed exercises have no traditional volume. */
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
export function deriveWorkoutSummary(
  session: WorkoutSession,
  /**
   * Custom Split sessions carry no archetype, so the completion screen passes
   * the saved workout's own name here rather than falling back to a muscle
   * label that would misdescribe the session.
   */
  titleOverride?: string | null
): WorkoutSummary {
  const exercises = session.exercises.flatMap<WorkoutSummaryExercise>((exercise) => {
    const sets = performedSets(exercise.sets);

    if (sets.length === 0) return [];
    const metric = getExerciseMetric(exercise);
    const timed = metric === 'duration';

    return [{
      name: exercise.name,
      loadType: exercise.loadType,
      metric,
      setCount: sets.length,
      repsBySet: timed ? [] : sets.map((set) => set.reps),
      repCount: timed ? 0 : sets.reduce((sum, set) => sum + set.reps, 0),
      durationsBySet: timed ? sets.map((set) => set.durationS ?? 0) : [],
      weightsBySet: sets.map((set) => set.weight),
      volumeKg: timed ? 0 : sets.reduce(
        (sum, set) => sum + set.reps * set.weight,
        0
      ),
    }];
  });

  const allPerformedSets = session.exercises.flatMap((exercise) => performedSets(exercise.sets));
  // Totals count rep-metric sets only: seconds are never reps or volume.
  const repMetricSets = session.exercises
    .filter((exercise) => getExerciseMetric(exercise) === 'reps')
    .flatMap((exercise) => performedSets(exercise.sets));

  const specialSets: Record<BonusSetType, number> = {
    pr: 0,
    dropset: 0,
    extra: 0,
  };
  allPerformedSets.forEach((set) => {
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
    title: session.imported ? session.imported.name : session.origin === 'adhoc' ? getSessionWorkoutDisplay(session).label :
      titleOverride?.trim() ||
      (primaryArchetype
        ? secondaryArchetype
          ? `${primaryArchetype.shortLabel} + ${secondaryArchetype.shortLabel}`
          : primaryArchetype.shortLabel
        : legacyMeta?.label ?? 'Workout'),
    accent: session.origin === 'adhoc' ? getSessionWorkoutDisplay(session).color : primaryArchetype?.color ?? legacyMeta?.color ?? '#FF7A3D',
    date: parseSessionDate(session.date),
    intensity: session.intensity ?? 'medium',
    setCount: allPerformedSets.length,
    exerciseCount: exercises.length,
    repCount: repMetricSets.reduce((sum, set) => sum + set.reps, 0),
    volumeKg: repMetricSets.reduce(
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
  return longContentDate(date);
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
    const name = type === 'pr' ? 'PR attempt' : type === 'dropset' ? 'Drop set' : 'Extra set';
    return `${count} ${name}${count === 1 ? '' : 's'} logged`;
  }

  return `${total} bonus set${total === 1 ? '' : 's'} logged`;
}

/** Load carried through timed sets: "30 kg", or "30–32.5 kg" when it varied. */
function formatLoadRange(weightsKg: readonly number[], unit: WeightUnit): string {
  const low = Math.min(...weightsKg), high = Math.max(...weightsKg);
  const range = low === high
    ? formatWeight(low, unit)
    : `${formatWeight(low, unit)}–${formatWeight(high, unit)}`;
  return `${range} ${unitLabel(unit)}`;
}

/** A recognisable load/reps result, never accumulated tonnage. Varied sets
 * use the same top-set rule as Progress: heaviest, then most reps at that load.
 * Timed results always keep the load paired with its actual duration. */
export function formatExercisePerformance(
  exercise: WorkoutSummaryExercise,
  unit: WeightUnit
): { value: string; context: string } {
  const timed = exercise.metric === 'duration';
  const amounts = timed ? exercise.durationsBySet : exercise.repsBySet;
  if (amounts.length === 0) return { value: 'No sets logged', context: '' };
  const loaded = exercise.loadType === 'external_weight'
    && exercise.weightsBySet.some((weight) => weight > 0);
  const weightAt = (index: number) => loaded ? exercise.weightsBySet[index] ?? 0 : 0;
  const uniform = amounts.every((amount, index) => amount === amounts[0] && weightAt(index) === weightAt(0));
  const top = amounts.reduce((best, amount, index) =>
    weightAt(index) > weightAt(best) || (weightAt(index) === weightAt(best) && amount > amounts[best])
      ? index : best, 0);
  const amount = timed ? formatDuration(amounts[top]) : String(amounts[top]);
  const load = weightAt(top) > 0 ? `${formatWeight(weightAt(top), unit)} ${unitLabel(unit)}` : null;
  if (uniform) {
    return {
      value: `${amounts.length} × ${amount}${load ? ` at ${load}` : ''}`,
      context: timed ? 'Time per set' : loaded ? 'Sets × reps' : 'Bodyweight · sets × reps',
    };
  }
  return {
    value: load ? `${load} ${timed ? '·' : '×'} ${amount}` : timed ? amount : `Bodyweight × ${amount}`,
    context: `${timed && !loaded ? 'Longest hold' : 'Top set'} · ${exercise.setCount} ${exercise.setCount === 1 ? 'set' : 'sets'}`,
  };
}

/**
 * Same performed-set rule as Lift Log: bonus included, skipped excluded.
 * Timed exercises show their durations ("3 × 1:00", "1:00 · 0:45 · 1:10")
 * and, when weighted, the load held; never reps and never volume.
 */
export function formatExerciseRecap(
  exercise: WorkoutSummaryExercise,
  unit: WeightUnit
): { scheme: string; volume: string | null } {
  if (exercise.metric === 'duration') {
    return {
      scheme: formatDurationScheme(exercise.durationsBySet),
      volume: exercise.loadType === 'external_weight' && exercise.weightsBySet.length > 0
        ? formatLoadRange(exercise.weightsBySet, unit)
        : null,
    };
  }
  return {
    scheme: formatRepScheme(exercise.repsBySet),
    volume: `${formatSummaryNumber(displayVolume(exercise.volumeKg, unit))} ${unitLabel(unit)}`,
  };
}

/** Spoken recap; timed exercises are described in time, never reps. */
export function exerciseRecapAccessibilityLabel(exercise: WorkoutSummaryExercise, unit: WeightUnit): string {
  if (exercise.metric === 'duration') {
    const load = formatExerciseRecap(exercise, unit).volume;
    return `${exercise.setCount} sets, ${exercise.durationsBySet.map(formatDuration).join(', ')}${load ? `, ${load}` : ''}`;
  }
  return `${exercise.setCount} sets, ${exercise.repCount} reps, ${formatSummaryNumber(displayVolume(exercise.volumeKg, unit))} ${unitLabel(unit)} moved`;
}
