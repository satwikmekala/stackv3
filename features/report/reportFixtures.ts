import type { BonusSetType, ExerciseSet, SessionExercise, WorkoutSession } from '@/store/workoutStore';

/*
 * Representative sessions for report QA (dev preview route and tests).
 * Weights are kg-canonical, exactly as persisted.
 */

type SetSpec = number | [reps: number, weightKg: number] | { reps?: number; weight?: number; durationS?: number; type?: BonusSetType; skipped?: boolean };

const toSet = (spec: SetSpec, defaultWeight: number): ExerciseSet => {
  if (typeof spec === 'number') return { reps: spec, weight: defaultWeight, completed: true };
  if (Array.isArray(spec)) return { reps: spec[0], weight: spec[1], completed: true };
  return {
    reps: spec.reps ?? 0,
    weight: spec.weight ?? defaultWeight,
    ...(spec.durationS !== undefined ? { durationS: spec.durationS } : {}),
    ...(spec.type ? { type: spec.type } : {}),
    completed: true,
    ...(spec.skipped ? { skipped: true } : {}),
  };
};

export const lift = (name: string, weightKg: number, sets: SetSpec[], entryUnit: 'kg' | 'lbs' = 'kg'): SessionExercise => ({
  name, loadType: 'external_weight', metric: 'reps', entryUnit, sets: sets.map((spec) => toSet(spec, weightKg)),
});
export const bodyweight = (name: string, reps: SetSpec[]): SessionExercise => ({
  name, loadType: 'bodyweight', metric: 'reps', entryUnit: 'kg', sets: reps.map((spec) => toSet(spec, 0)),
});
export const hold = (name: string, seconds: number[], weightKg = 0): SessionExercise => ({
  name,
  loadType: weightKg > 0 ? 'external_weight' : 'bodyweight',
  metric: 'duration',
  entryUnit: 'kg',
  sets: seconds.map((durationS) => ({ reps: 0, weight: weightKg, durationS, completed: true })),
});

export const reportSession = (
  exercises: SessionExercise[],
  overrides: Partial<WorkoutSession> = {}
): WorkoutSession => ({
  origin: 'archetype',
  id: '42',
  date: '2026-10-02T18:05:00.000Z',
  completedAt: '2026-10-02T19:09:00.000Z',
  archetype: 'push',
  secondaryArchetype: null,
  archetypeVariant: null,
  secondaryArchetypeVariant: null,
  workoutTypes: ['chest'],
  intensity: 'hard',
  completed: true,
  retroactive: false,
  exercises,
  ...overrides,
});

const lbs = (value: number) => value / 2.20462;

export const REPORT_FIXTURES: { key: string; label: string; session: WorkoutSession; history?: WorkoutSession[] }[] = [
  {
    key: 'push',
    label: 'Standard Push',
    session: reportSession([
      lift('Bench Press', 80, [10, 10, 9, 8]),
      lift('Incline Dumbbell Press', 30, [12, 10, 10]),
      lift('Seated Shoulder Press', 40, [10, 10, 8]),
      lift('Cable Lateral Raise', 7.5, [15, 15, 12]),
      lift('Triceps Rope Pushdown', 25, [12, 12, { reps: 15, weight: 20, type: 'dropset' }]),
    ]),
  },
  {
    key: 'mixed',
    label: 'Mixed reps + timed',
    session: reportSession([
      lift('Goblet Squat', 24, [12, 12, 10]),
      bodyweight('Walking Lunge', [20, 20, 16]),
      hold('Plank', [60, 60, 45]),
      hold('Farmer Carry', [45, 45, 40], 32),
      bodyweight('Hanging Leg Raise', [12, 10, { reps: 0, skipped: true }]),
    ], { archetype: 'full_body', intensity: 'medium', date: '2026-10-01T07:12:00.000Z', completedAt: '2026-10-01T07:58:00.000Z' }),
  },
  {
    key: 'long',
    label: 'Long 10-exercise',
    session: reportSession([
      lift('Barbell Back Squat', 120, [5, 5, 5, 5, 5]),
      lift('Romanian Deadlift', 100, [8, 8, 8, 7]),
      lift('Bulgarian Split Squat (Dumbbells, Rear Foot Elevated)', 22.5, [10, 10, 10, 9]),
      lift('Leg Press', 200, [12, 12, 10, { reps: 15, weight: 160, type: 'dropset' }]),
      lift('Leg Extension', 55, [15, 12, 12]),
      lift('Lying Leg Curl', lbs(90), [12, 12, 10], 'lbs'),
      lift('Hip Thrust', 140, [10, 10, 10]),
      lift('Standing Calf Raise', 80, [15, 15, 15, 12]),
      lift('Seated Calf Raise', 40, [{ reps: 15, skipped: true }, { reps: 15, skipped: true }]),
      hold('Wall Sit', [60, 50]),
    ], { archetype: 'legs', workoutTypes: ['legs'], intensity: 'hard', date: '2026-09-29T17:30:00.000Z', completedAt: '2026-09-29T19:12:00.000Z' }),
  },
  {
    key: 'bodyweight',
    label: 'Bodyweight only',
    session: reportSession([
      bodyweight('Pull-Up', [10, 9, 8, 6]),
      bodyweight('Push-Up', [25, 22, 20]),
      bodyweight('Dip', [15, 12, 12]),
      hold('Hollow Hold', [40, 35, 30]),
    ], { archetype: 'upper', intensity: 'easy', completedAt: null, date: '2026-09-27' }),
  },
  {
    key: 'records',
    label: 'PR + bonus sets',
    session: reportSession([
      lift('Bench Press', 82.5, [8, 8, 8, { reps: 3, weight: 92.5, type: 'pr' }, { reps: 8, weight: 82.5, type: 'extra' }]),
      lift('Overhead Press', 50, [6, 6, 5]),
      lift('Weighted Dip', 20, [10, 9, { reps: 14, weight: 0, type: 'dropset' }]),
      lift('Skull Crusher', 30, [12, 12, { reps: 12, skipped: true }]),
    ], { id: '43' }),
    history: [
      reportSession([
        lift('Bench Press', 90, [3]),
        lift('Overhead Press', 47.5, [6, 6, 6]),
      ], { id: '40', date: '2026-09-25T18:00:00.000Z' }),
    ],
  },
];
