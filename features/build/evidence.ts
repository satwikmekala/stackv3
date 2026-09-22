import { getSessionWorkoutDisplay } from '../../constants/archetypes';
import { compareSetPerformance, getCurrentBest, type RecordSet } from '../../store/personalRecords';
import { getVerifiedSessions } from '../../store/verifiedSessions';
import { getStartOfWeek, parseSessionDate, toLocalCalendarDate } from '../../store/workoutCalendar';
import type { ExerciseLoadType, ExerciseSet, WorkoutSession } from '../../store/workoutStore';
import { DEFAULT_TUNING, HEIGHTS, weeklyHeight } from './model';

export type BuildRules = {
  heights: readonly [number, number, number, number];
  compressionFactor: number;
  minWeekHeight: number;
  maxWeekHeight: number;
};
export const DEFAULT_BUILD_RULES: BuildRules = {
  heights: HEIGHTS, compressionFactor: DEFAULT_TUNING.compression, minWeekHeight: 0.75, maxWeekHeight: 2.5,
};
export type BuildMetrics = { workouts: number; volumeKg: number; liftsUp: number; records: number };
export type SetPerformance = { weightKg: number; reps: number };
export type ImprovedSet = { regularSetIndex: number; previous: SetPerformance; current: SetPerformance };
export type ExerciseComparison = {
  exerciseName: string;
  loadType: ExerciseLoadType;
  previousSessionId: string | null;
  comparableSets: number;
  improvedSets: ImprovedSet[];
};
export type BuildRecord = { exerciseName: string; previous: RecordSet; current: RecordSet };
export type BuildPiece = {
  id: string;
  sessionId: string;
  date: string;
  weekStart: string;
  label: string;
  color: string;
  height: number;
  bucket: 0 | 1 | 2 | 3;
  eligibleExercises: number;
  comparisons: ExerciseComparison[];
  records: BuildRecord[];
  metrics: BuildMetrics;
};
export type BuildWeek = {
  id: string;
  weekStart: string;
  weekEnd: string;
  sealed: boolean;
  pieces: BuildPiece[];
  compositeHeight: number;
  metrics: BuildMetrics;
  previousActiveWeek: { weekStart: string; volumeDeltaKg: number } | null;
};
export type BuildState = {
  pieces: BuildPiece[];
  sealedWeeks: BuildWeek[];
  currentWeek: BuildWeek;
  metrics: BuildMetrics;
  issues: { sessionId: string; reason: 'invalid-date' | 'future-week' }[];
};

const emptyMetrics = (): BuildMetrics => ({ workouts: 0, volumeKg: 0, liftsUp: 0, records: 0 });
const totalMetrics = (pieces: readonly BuildPiece[]): BuildMetrics => pieces.reduce((total, piece) => ({
  workouts: total.workouts + piece.metrics.workouts,
  volumeKg: total.volumeKg + piece.metrics.volumeKg,
  liftsUp: total.liftsUp + piece.metrics.liftsUp,
  records: total.records + piece.metrics.records,
}), emptyMetrics());
const performed = (set: ExerciseSet | undefined): set is ExerciseSet => Boolean(set && set.completed && !set.skipped
  && Number.isFinite(set.weight) && set.weight >= 0 && Number.isFinite(set.reps) && set.reps > 0);
const performance = (set: ExerciseSet, loadType: ExerciseLoadType): SetPerformance => ({
  weightKg: loadType === 'bodyweight' ? 0 : set.weight, reps: set.reps,
});

function validateRules(rules: BuildRules) {
  if (rules.heights.length !== 4 || rules.heights.some((height, index) => !Number.isFinite(height) || height <= 0 || (index > 0 && height < rules.heights[index - 1]))
    || !Number.isFinite(rules.compressionFactor) || rules.compressionFactor <= 0
    || !Number.isFinite(rules.minWeekHeight) || rules.minWeekHeight <= 0
    || !Number.isFinite(rules.maxWeekHeight) || rules.maxWeekHeight < rules.minWeekHeight) {
    throw new RangeError('Build rules require four positive ordered heights and valid compression bounds');
  }
}

/** Read-only projection. No scene state, clock reads, persistence or animation events. */
export function deriveBuildState(sessions: readonly WorkoutSession[], now: Date, options: Partial<BuildRules> = {}): BuildState {
  if (!Number.isFinite(now.getTime())) throw new RangeError('Build requires a valid current date');
  const rules = { ...DEFAULT_BUILD_RULES, ...options };
  validateRules(rules);
  const currentWeekStart = toLocalCalendarDate(getStartOfWeek(now));
  const issues: BuildState['issues'] = [];
  const unique = new Map<string, WorkoutSession>();
  for (const session of getVerifiedSessions(sessions)) {
    const existing = unique.get(session.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(session)) throw new Error(`Conflicting Build session ID: ${session.id}`);
    unique.set(session.id, session);
  }
  const ordered = [...unique.values()].map((session) => ({ session, date: parseSessionDate(session.date) }))
    .filter(({ session, date }) => {
      if (!Number.isFinite(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(session.date) && toLocalCalendarDate(date) !== session.date)) {
        issues.push({ sessionId: session.id, reason: 'invalid-date' }); return false;
      }
      if (toLocalCalendarDate(getStartOfWeek(date)) > currentWeekStart) { issues.push({ sessionId: session.id, reason: 'future-week' }); return false; }
      return true;
    }).sort((a, b) => a.date.getTime() - b.date.getTime() || a.session.id.localeCompare(b.session.id, 'en', { numeric: true }));
  issues.sort((a, b) => a.sessionId.localeCompare(b.sessionId, 'en', { numeric: true }));

  // Exact logged names match the app's Records identity. Load type also scopes progression.
  const lastRegular = new Map<string, { sessionId: string; sets: ExerciseSet[] }>();
  const bestByName = new Map<string, RecordSet>();
  const pieces: BuildPiece[] = [];
  for (const { session, date } of ordered) {
    const groups = new Map<string, { name: string; loadType: ExerciseLoadType; regular: ExerciseSet[] }>();
    const candidates = new Map<string, RecordSet>();
    let volumeKg = 0;
    session.exercises.forEach((exercise, exerciseIndex) => {
      const key = JSON.stringify([exercise.name, exercise.loadType]);
      const group = groups.get(key) ?? { name: exercise.name, loadType: exercise.loadType, regular: [] };
      // Keep unperformed regular slots so a skipped set cannot shift comparison positions.
      group.regular.push(...exercise.sets.filter((set) => !set.type));
      groups.set(key, group);
      exercise.sets.forEach((set, setIndex) => {
        if (!performed(set)) return;
        volumeKg += set.weight * set.reps;
        const candidate: RecordSet = {
          id: `${session.id}-${exerciseIndex}-${setIndex}`, sessionId: session.id,
          date: new Date(date), exerciseIndex, setIndex, weight: set.weight, reps: set.reps,
        };
        const best = candidates.get(exercise.name);
        candidates.set(exercise.name, best ? getCurrentBest([best, candidate])! : candidate);
      });
    });
    const comparisons: ExerciseComparison[] = [];
    const improvedNames = new Set<string>();
    const eligibleNames = new Set<string>();
    for (const [key, group] of groups) {
      const prior = lastRegular.get(key);
      const comparison: ExerciseComparison = {
        exerciseName: group.name, loadType: group.loadType, previousSessionId: prior?.sessionId ?? null,
        comparableSets: 0, improvedSets: [],
      };
      group.regular.forEach((set, index) => {
        const previousSet = prior?.sets[index];
        if (!performed(set) || !performed(previousSet)) return;
        comparison.comparableSets++;
        const previous = performance(previousSet, group.loadType);
        const current = performance(set, group.loadType);
        if ((current.weightKg > previous.weightKg && current.reps >= previous.reps)
          || (current.weightKg === previous.weightKg && current.reps > previous.reps)) {
          comparison.improvedSets.push({ regularSetIndex: index, previous, current });
        }
      });
      if (comparison.comparableSets) eligibleNames.add(group.name);
      if (comparison.improvedSets.length) improvedNames.add(group.name);
      comparisons.push(comparison);
      // Skipped-only / bonus-only appearances do not erase the last usable regular session.
      if (group.regular.some(performed)) lastRegular.set(key, { sessionId: session.id, sets: group.regular });
    }
    const records: BuildRecord[] = [];
    for (const [exerciseName, candidate] of candidates) {
      const previous = bestByName.get(exerciseName);
      // Evaluate once per exercise, against history strictly before this session.
      if (previous && compareSetPerformance(candidate, previous) > 0) records.push({ exerciseName, previous, current: candidate });
      bestByName.set(exerciseName, previous ? getCurrentBest([previous, candidate])! : candidate);
    }
    const bucket = Math.min(3, improvedNames.size) as BuildPiece['bucket'];
    const display = getSessionWorkoutDisplay(session);
    pieces.push({
      id: `session:${session.id}`, sessionId: session.id, date: session.date,
      weekStart: toLocalCalendarDate(getStartOfWeek(date)), label: display.label, color: display.color,
      height: rules.heights[bucket], bucket, eligibleExercises: eligibleNames.size, comparisons, records,
      metrics: { workouts: 1, volumeKg, liftsUp: improvedNames.size, records: records.length },
    });
  }
  const grouped = new Map<string, BuildPiece[]>();
  for (const piece of pieces) {
    const group = grouped.get(piece.weekStart) ?? [];
    group.push(piece); grouped.set(piece.weekStart, group);
  }
  const makeWeek = (weekStart: string, children: BuildPiece[]): BuildWeek => {
    const end = parseSessionDate(weekStart); end.setDate(end.getDate() + 6);
    return {
      id: `week:${weekStart}`, weekStart, weekEnd: toLocalCalendarDate(end), sealed: weekStart < currentWeekStart,
      pieces: children, compositeHeight: children.length ? weeklyHeight(children.map((piece) => ({ color: piece.color, height: piece.height, record: piece.records.length > 0 })), rules.compressionFactor, rules.minWeekHeight, rules.maxWeekHeight) : 0,
      metrics: totalMetrics(children), previousActiveWeek: null,
    };
  };
  const sealedWeeks = [...grouped.entries()].filter(([key]) => key < currentWeekStart).map(([key, children]) => makeWeek(key, children));
  const currentWeek = makeWeek(currentWeekStart, grouped.get(currentWeekStart) ?? []);
  let previous: BuildWeek | undefined;
  for (const week of [...sealedWeeks, currentWeek]) {
    if (previous && week.pieces.length) week.previousActiveWeek = { weekStart: previous.weekStart, volumeDeltaKg: week.metrics.volumeKg - previous.metrics.volumeKg };
    if (week.pieces.length) previous = week;
  }
  return { pieces, sealedWeeks, currentWeek, metrics: totalMetrics(pieces), issues };
}
