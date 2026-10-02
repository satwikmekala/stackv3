import type { ExerciseCatalogItem, WorkoutSession } from './workoutStore';
import { getMuscleGroupForExercise } from './customSplitDraft';

export function defaultAdhocRoutineName(session: WorkoutSession, catalog: readonly ExerciseCatalogItem[]): string {
  const byName = new Map(catalog.map((exercise) => [exercise.name, exercise]));
  const groups = new Set<string>();
  for (const exercise of session.exercises) {
    if (!exercise.sets.some((set) => set.completed === true && set.skipped !== true)) continue;
    const definition = byName.get(exercise.name);
    if (definition) groups.add(getMuscleGroupForExercise(definition));
  }
  return [...groups].join(', ') || 'Workout';
}
