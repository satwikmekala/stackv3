import type { WorkoutSession } from '../../store/workoutStore';

export const EVIDENCE_DEMO_NOW = new Date(2026, 8, 23, 12);
const session = (id: string, date: string, values: [number, number][]): WorkoutSession => ({
  id, date, completed: true, retroactive: false, archetype: 'push', secondaryArchetype: null,
  archetypeVariant: null, secondaryArchetypeVariant: null, workoutTypes: ['chest', 'shoulders', 'arms'],
  exercises: ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly'].map((name, index) => ({
    name, loadType: 'external_weight', sets: Array.from({ length: 3 }, () => ({ weight: values[index][0], reps: values[index][1], completed: true })),
  })),
});

/** Actual session-shaped evidence, derived by the same engine as saved history. Never persisted. */
export const EVIDENCE_DEMO_SESSIONS: WorkoutSession[] = [
  session('demo-1', '2026-09-14', [[80, 8], [40, 10], [15, 12]]),
  session('demo-2', '2026-09-18', [[85, 8], [40, 12], [15, 14]]),
  session('demo-3', '2026-09-22', [[85, 9], [42.5, 12], [15, 14]]),
];
