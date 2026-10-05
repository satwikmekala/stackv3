import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExerciseCatalogItem } from '@/store/workoutDatabase';
import type { ImportPlan, ImportSnapshot } from '../models';
import { missingRoutineTarget, routineWorkingSets, unsupportedRoutineTarget, usableImportedSet } from '../models';
import { validateImportSnapshot } from '../validation';
import { HevyImportError } from './errors';
import { resolveHevyExercise } from './exerciseResolver';

type Database = Pick<SQLiteDatabase, 'getAllSync'>;
export function readImportCatalog(db: Database): ExerciseCatalogItem[] {
  return db.getAllSync<{ id: number; name: string; workout_type: ExerciseCatalogItem['workoutType']; primary_muscle: string;
    is_custom: number; equipment: string | null; load_type: ExerciseCatalogItem['loadType']; metric: ExerciseCatalogItem['metric'] }>('SELECT * FROM exercises')
    .map(row => ({ id: row.id, name: row.name, workoutType: row.workout_type, primaryMuscle: row.primary_muscle,
      isCustom: Boolean(row.is_custom), equipment: row.equipment, loadType: row.load_type, metric: row.metric }));
}
export function createHevyImportPlan(db: Database, snapshot: ImportSnapshot): ImportPlan {
  try { validateImportSnapshot(snapshot); } catch { throw new HevyImportError('reading'); }
  const templates = new Map(snapshot.templates.map(template => [template.id, template]));
  if ([...snapshot.workouts, ...snapshot.routines].some(item => item.exercises.some(exercise => !templates.has(exercise.templateId)))) throw new HevyImportError('reading');
  const catalog = readImportCatalog(db);
  const mappings = new Map(db.getAllSync<{ source_id: string; exercise_id: number }>(
    'SELECT source_id, exercise_id FROM imported_exercises WHERE account_id = ?', snapshot.accountId).map(row => [row.source_id, row.exercise_id]));
  const resolutions = snapshot.templates.map(template => resolveHevyExercise(template, catalog, mappings.get(template.id)));
  const knownRoutines = new Set(db.getAllSync<{ source_id: string }>('SELECT source_id FROM imported_routines WHERE account_id = ?', snapshot.accountId).map(row => row.source_id));
  const knownWorkouts = new Set(db.getAllSync<{ source_id: string }>('SELECT source_id FROM imported_workouts WHERE account_id = ?', snapshot.accountId).map(row => row.source_id));
  const warnings = new Set<string>();
  for (const resolution of resolutions) if (!resolution.compatible) warnings.add(`${resolution.template.name}: its measurements are saved for reference. Stack cannot log or compare them yet.`);
  for (const workout of snapshot.workouts) for (const exercise of workout.exercises) {
    if (exercise.sets.some(set => !usableImportedSet(templates.get(exercise.templateId)!, set))) warnings.add('Some recorded sets cannot be compared in Stack. Their original values will remain in workout history.');
  }
  if ([...snapshot.routines, ...snapshot.workouts].some(item => item.exercises.some(exercise => exercise.supersetId !== null))) warnings.add('Superset groups are saved for reference. Stack will show exercises individually.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => exercise.restS !== null && exercise.restS !== undefined))) warnings.add('Routine rest times are saved for reference. Stack’s timer is set separately.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => exercise.sets.some(set => set.repRange)))) warnings.add('Rep ranges are saved for reference. Logging starts at the lower target when available.');
  if (snapshot.incompleteWorkouts) warnings.add('Unfinished Hevy workouts will not be imported.');
  if ([...snapshot.routines, ...snapshot.workouts].some(item => item.exercises.some(exercise => exercise.sets.some(set => set.rpe !== null || set.customMetric !== null)))) warnings.add('RPE and other measurements are saved in the original Hevy details for reference.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => exercise.sets.some(set => ['warmup', 'dropset'].includes(set.kind))))) warnings.add('Routine warmup and drop sets are saved for reference. Logging starts with working sets.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => exercise.sets.some(set => !['normal', 'failure', 'warmup', 'dropset'].includes(set.kind))))) warnings.add('Some routine set types cannot be logged in Stack. Their original values are saved for reference.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => exercise.notes))) warnings.add('Routine notes are saved in the original Hevy details for reference.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => routineWorkingSets(exercise.sets).some(set => missingRoutineTarget(templates.get(exercise.templateId)!, set))))) warnings.add('Missing routine targets start with Stack’s default reps, load or time. Original targets stay in the Hevy details.');
  if (snapshot.routines.some(item => item.exercises.some(exercise => !routineWorkingSets(exercise.sets).length || routineWorkingSets(exercise.sets).some(set => unsupportedRoutineTarget(templates.get(exercise.templateId)!, set))))) warnings.add('Some workouts need their targets edited in Your routines before you can log them.');
  warnings.add('Your history will inform Progress, records and previous values. Historical blocks and layers in Your Stack are not recreated in this version.');
  const existingRoutines = snapshot.routines.filter(item => knownRoutines.has(item.id)).length;
  const existingWorkouts = snapshot.workouts.filter(item => knownWorkouts.has(item.id)).length;
  return { snapshot, resolutions, newRoutines: snapshot.routines.length - existingRoutines, newWorkouts: snapshot.workouts.length - existingWorkouts,
    existingRoutines, existingWorkouts, customExercises: resolutions.filter(item => item.localId === null).length, warnings: [...warnings] };
}
