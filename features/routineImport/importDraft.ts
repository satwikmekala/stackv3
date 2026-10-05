/**
 * RoutineImportResult → the existing routine editor's draft.
 *
 * Matched exercises become ordinary draft exercises (rows from this device's
 * catalog). Anything Stack wasn't sure about becomes a pending item on its
 * workout: visible in the editor and blocking Save until the person picks an
 * exercise or removes it. Nothing is ever silently guessed.
 *
 * Pure: no database, store, router or platform imports.
 */
import { exerciseMatchKey } from '@/features/sharing/splitProtocol';
import type { RoutineImportResult } from '@/features/routineImport/routineImportProtocol';
import type { ExerciseCatalogItem } from '@/store/workoutStore';

export interface PendingImportExercise {
  /** RoutineImportExercise.id, unique within the import. */
  key: string;
  /** What the person wrote. */
  rawName: string;
  status: 'uncertain' | 'unresolved';
  suggestion: ExerciseCatalogItem | null;
  alternatives: ExerciseCatalogItem[];
  /** Index in the pasted workout, so a confirmed exercise returns to its place. */
  position: number;
}

export interface ImportedDraftWorkout {
  name: string;
  exercises: ExerciseCatalogItem[];
  pending: PendingImportExercise[];
}

export interface ImportedDraft {
  name: string | null;
  workouts: ImportedDraftWorkout[];
}

export const buildImportedDraft = (
  result: Pick<RoutineImportResult, 'routine'>,
  catalog: readonly ExerciseCatalogItem[]
): ImportedDraft => {
  // Built-ins first, so a custom exercise that shares a name never wins.
  const byKey = new Map<string, ExerciseCatalogItem>();
  for (const exercise of [...catalog].sort((a, b) => Number(a.isCustom) - Number(b.isCustom))) {
    const key = exerciseMatchKey(exercise.name);
    if (!byKey.has(key)) byKey.set(key, exercise);
  }
  const find = (name: string | null) => (name ? byKey.get(exerciseMatchKey(name)) ?? null : null);

  const workouts = result.routine.workouts.map((workout): ImportedDraftWorkout => {
    const exercises: ExerciseCatalogItem[] = [];
    const pending: PendingImportExercise[] = [];
    workout.exercises.forEach((exercise, position) => {
      const matched = exercise.status === 'matched' ? find(exercise.matchedName) : null;
      if (matched) {
        // The editor holds each exercise once per workout; a repeat is the same exercise.
        if (!exercises.some((item) => item.id === matched.id)) exercises.push(matched);
        return;
      }
      const suggestion = find(exercise.status === 'matched' ? exercise.matchedName : exercise.suggestedMatch);
      const alternatives = exercise.alternatives.map(find)
        .filter((item): item is ExerciseCatalogItem => item !== null && item.id !== suggestion?.id)
        .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
      pending.push({
        key: exercise.id,
        rawName: exercise.rawName,
        // Nothing to offer on this device means the person picks or creates the exercise.
        status: suggestion || alternatives.length ? 'uncertain' : 'unresolved',
        suggestion,
        alternatives,
        position,
      });
    });
    return { name: workout.name ?? '', exercises, pending };
  }).filter((workout) => workout.exercises.length > 0 || workout.pending.length > 0);

  return { name: result.routine.name, workouts };
};
