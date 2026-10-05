import { getMuscleColor } from '@/constants/muscleColors';
import { redesignColors } from '@/constants/theme';
import type { ExerciseCatalogItem } from '@/store/workoutDatabase';
import type { WorkoutSession } from '@/store/workoutStore';
import { parseSessionDate } from '@/store/workoutCalendar';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { getExerciseMetric } from '@/store/exerciseMeasurement';
import type { LiftPerformance } from '@/store/liftProgress';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

export type RecordSet = {
  id: string;
  sessionId: string;
  date: Date;
  exerciseIndex: number;
  setIndex: number;
  weight: number;
  reps: number;
};

export type PersonalRecord = {
  name: string;
  best: RecordSet;
  /** When the current best performance was first reached; later equal sets don't move it. */
  achieved: Date;
  lastPerformed: Date;
};

export const MUSCLE_GROUPS = {
  chest: { label: 'Chest', get color() { return getMuscleColor('chest'); } },
  back: { label: 'Back', get color() { return getMuscleColor('back'); } },
  shoulders: { label: 'Shoulders', get color() { return getMuscleColor('shoulders'); } },
  biceps: { label: 'Biceps', get color() { return getMuscleColor('arms'); } },
  triceps: { label: 'Triceps', get color() { return getMuscleColor('arms'); } },
  arms: { label: 'Arms', get color() { return getMuscleColor('arms'); } },
  legs: { label: 'Legs', get color() { return getMuscleColor('legs'); } },
  core: { label: 'Core', get color() { return getMuscleColor('core'); } },
  other: { label: 'Other', color: redesignColors.ash },
} as const;
export type MuscleGroup = keyof typeof MUSCLE_GROUPS;

export function getRecordMuscle(exercise?: Pick<ExerciseCatalogItem, 'workoutType' | 'primaryMuscle'>): MuscleGroup {
  if (!exercise) return 'other';
  if (exercise.workoutType === 'arms') {
    const muscle = exercise.primaryMuscle.toLowerCase();
    if (muscle.includes('biceps') && !muscle.includes('triceps')) return 'biceps';
    if (muscle.includes('triceps') && !muscle.includes('biceps')) return 'triceps';
  }
  return exercise.workoutType;
}

export const compareSetPerformance = (
  a: Pick<RecordSet, 'weight' | 'reps'>,
  b: Pick<RecordSet, 'weight' | 'reps'>
) =>
  a.weight - b.weight || a.reps - b.reps;

export const compareSetRecency = (a: RecordSet, b: RecordSet) =>
  a.date.getTime() - b.date.getTime()
  || a.sessionId.localeCompare(b.sessionId, 'en', { numeric: true })
  || a.exerciseIndex - b.exerciseIndex
  || a.setIndex - b.setIndex;

export function getCurrentBest(sets: readonly RecordSet[]): RecordSet | undefined {
  return sets.reduce<RecordSet | undefined>((best, set) =>
    !best || (compareSetPerformance(set, best) || compareSetRecency(set, best)) > 0
      ? set : best, undefined);
}

/**
 * Every distinct logged name is included; unfinished/skipped sets never count.
 * Weight/reps records only: timed sets have no record semantics yet.
 */
export function derivePersonalRecords(sessions: readonly WorkoutSession[]): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>();
  for (const session of getVerifiedSessions(sessions)) {
    const date = parseSessionDate(session.date);
    session.exercises.forEach((exercise, exerciseIndex) => {
      if (getExerciseMetric(exercise) !== 'reps') return;
      exercise.sets.forEach((set, setIndex) => {
        if (!set.completed || set.skipped || set.sourceKind === 'warmup') return;
        const candidate: RecordSet = {
          id: `${session.id}-${exerciseIndex}-${setIndex}`,
          sessionId: session.id, date, exerciseIndex, setIndex,
          weight: set.weight, reps: set.reps,
        };
        const record = records.get(exercise.name);
        if (!record) {
          records.set(exercise.name, { name: exercise.name, best: candidate, achieved: date, lastPerformed: date });
        } else {
          const comparison = compareSetPerformance(candidate, record.best);
          if (comparison > 0) record.achieved = date;
          else if (comparison === 0 && date < record.achieved) record.achieved = date;
          record.best = getCurrentBest([record.best, candidate])!;
          if (date > record.lastPerformed) record.lastPerformed = date;
        }
      });
    });
  }
  return [...records.values()].sort((a, b) =>
    b.lastPerformed.getTime() - a.lastPerformed.getTime() || a.name.localeCompare(b.name));
}

export function filterPersonalRecords<T extends PersonalRecord & { muscle: MuscleGroup }>(
  records: readonly T[], query: string, selectedMuscles: readonly MuscleGroup[]
) {
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = records.filter((record) => record.name.toLowerCase().includes(normalizedQuery));
  const muscles = (Object.keys(MUSCLE_GROUPS) as MuscleGroup[])
    .filter((muscle) => searchResults.some((record) => record.muscle === muscle));
  return {
    normalizedQuery,
    muscles,
    visibleRecords: searchResults.filter((record) =>
      selectedMuscles.length === 0 || selectedMuscles.includes(record.muscle)),
  };
}

export function highlightExerciseName(name: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [{ text: name, matched: false }];
  const parts: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  let match = name.toLowerCase().indexOf(normalizedQuery);
  while (match !== -1) {
    if (match > cursor) parts.push({ text: name.slice(cursor, match), matched: false });
    cursor = match + normalizedQuery.length;
    parts.push({ text: name.slice(match, cursor), matched: true });
    match = name.toLowerCase().indexOf(normalizedQuery, cursor);
  }
  if (cursor < name.length) parts.push({ text: name.slice(cursor), matched: false });
  return parts;
}

export type PersonalRecordSort = 'recent' | 'name';
export const PERSONAL_RECORD_SORTS = [
  { value: 'recent', label: 'Newest record' },
  { value: 'name', label: 'Name' },
] as const satisfies readonly { value: PersonalRecordSort; label: string }[];

/** Returns a new list ordered by when each record was set, or alphabetically. */
export function sortPersonalRecords<T extends PersonalRecord>(records: readonly T[], sort: PersonalRecordSort): T[] {
  return [...records].sort((a, b) => sort === 'name'
    ? a.name.localeCompare(b.name)
    : b.achieved.getTime() - a.achieved.getTime() || a.name.localeCompare(b.name));
}

/** What a milestone added over the record it replaced, in the PR rule's own order. */
export type RecordDelta =
  | { kind: 'weight'; from: number; to: number }
  | { kind: 'reps'; reps: number };

export type RecordMilestone = {
  set: RecordSet;
  /** Null for the first record: there was nothing to beat. */
  delta: RecordDelta | null;
  isCurrent: boolean;
};

export type RecordProgression = {
  /** Newest first; the first entry is the current record. */
  milestones: RecordMilestone[];
  current: RecordMilestone | undefined;
  /** Later sessions that equalled the current record without beating it. */
  matches: number;
};

/**
 * Only sets that strictly beat every earlier set, using compareSetPerformance.
 * Equal sets never become milestones; they're counted as matches of the
 * current record instead.
 */
export function deriveRecordProgression(sets: readonly RecordSet[]): RecordProgression {
  const chronological: RecordMilestone[] = [];
  for (const set of [...sets].sort(compareSetRecency)) {
    const previous = chronological[chronological.length - 1]?.set;
    if (previous && compareSetPerformance(set, previous) <= 0) continue;
    chronological.push({
      set, isCurrent: false,
      delta: !previous ? null : set.weight > previous.weight
        ? { kind: 'weight', from: previous.weight, to: set.weight }
        : { kind: 'reps', reps: set.reps - previous.reps },
    });
  }
  const current = chronological[chronological.length - 1];
  if (current) current.isCurrent = true;
  const matches = current ? new Set(sets.filter((set) => set.id !== current.set.id
    && set.sessionId !== current.set.sessionId
    && compareSetPerformance(set, current.set) === 0).map((set) => set.sessionId)).size : 0;
  return { milestones: chronological.reverse(), current, matches };
}

/** Deltas use the displayed (rounded) values so they always add up on screen. */
export function formatRecordDelta(delta: RecordDelta | null, unit: WeightUnit): string | null {
  if (!delta) return null;
  if (delta.kind === 'reps') return delta.reps > 0 ? `+${delta.reps} ${delta.reps === 1 ? 'rep' : 'reps'}` : null;
  const difference = Number(formatWeight(delta.to, unit)) - Number(formatWeight(delta.from, unit));
  if (!(difference > 0)) return null;
  const rounded = Math.round(difference * 10) / 10;
  return `+${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unitLabel(unit)}`;
}

/** Record sets are weight/reps only; a zero load is bodyweight, as the Records list has always shown. */
export const recordPerformance = (set: RecordSet): LiftPerformance => ({
  sessionId: set.sessionId, date: set.date, weight: set.weight, reps: set.reps, bodyweight: set.weight === 0,
});
