import { redesignColors, splitColors } from '@/constants/theme';
import type { ExerciseCatalogItem } from '@/store/workoutDatabase';
import { parseSessionDate, toLocalCalendarDate, type WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';

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
  lastPerformed: Date;
};

export const MUSCLE_GROUPS = {
  chest: { label: 'Chest', color: splitColors.chest },
  back: { label: 'Back', color: splitColors.back },
  shoulders: { label: 'Shoulders', color: splitColors.shoulders },
  biceps: { label: 'Biceps', color: splitColors.arms },
  triceps: { label: 'Triceps', color: splitColors.arms },
  arms: { label: 'Arms', color: splitColors.arms },
  legs: { label: 'Legs', color: splitColors.legs },
  core: { label: 'Core', color: splitColors.core },
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

export const compareSetPerformance = (a: RecordSet, b: RecordSet) =>
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

/** Every distinct logged name is included; unfinished/skipped sets never count. */
export function derivePersonalRecords(sessions: readonly WorkoutSession[]): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>();
  for (const session of getVerifiedSessions(sessions)) {
    const date = parseSessionDate(session.date);
    session.exercises.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        if (!set.completed || set.skipped) return;
        const candidate: RecordSet = {
          id: `${session.id}-${exerciseIndex}-${setIndex}`,
          sessionId: session.id, date, exerciseIndex, setIndex,
          weight: set.weight, reps: set.reps,
        };
        const record = records.get(exercise.name);
        if (!record) {
          records.set(exercise.name, { name: exercise.name, best: candidate, lastPerformed: date });
        } else {
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

/** PR means a strict improvement at the time; equal sets only update best-set recency. */
export function deriveRecentLifts(sets: readonly RecordSet[]) {
  let previousBest: RecordSet | undefined;
  const prIds = new Set<string>();
  const chronological = [...sets].sort(compareSetRecency);
  for (const set of chronological) {
    if (!previousBest || compareSetPerformance(set, previousBest) > 0) {
      previousBest = set;
      prIds.add(set.id);
    }
  }
  const groups = new Map<string, { key: string; date: Date; sets: (RecordSet & { isPR: boolean })[]; hasPR: boolean }>();
  for (const set of [...chronological].reverse()) {
    const key = toLocalCalendarDate(set.date);
    if (!groups.has(key)) groups.set(key, { key, date: set.date, sets: [], hasPR: false });
    const group = groups.get(key)!;
    const isPR = prIds.has(set.id);
    group.sets.push({ ...set, isPR });
    group.hasPR ||= isPR;
  }
  // Dates newest first, sessions newest first within a date, sets in logging order.
  for (const group of groups.values()) {
    group.sets.sort((a, b) => b.date.getTime() - a.date.getTime()
      || b.sessionId.localeCompare(a.sessionId, 'en', { numeric: true })
      || a.exerciseIndex - b.exerciseIndex || a.setIndex - b.setIndex);
  }
  return [...groups.values()];
}
