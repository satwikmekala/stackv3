import type { ImportSnapshot } from './models';

/** Validate the Stack-owned boundary again before preview and transaction. */
export function validateImportSnapshot(snapshot: ImportSnapshot): void {
  const fail = () => { throw Error('Invalid import data.'); };
  const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 100_000;
  const date = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value as string) && Number.isFinite(Date.parse(value as string));
  const integer = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
  const numeric = (value: unknown) => value === null || typeof value === 'number' && Number.isFinite(value);
  if (!snapshot || snapshot.source !== 'hevy' || !text(snapshot.accountId) || !['kg', 'lbs'].includes(snapshot.weightUnit) || !integer(snapshot.incompleteWorkouts)) fail();
  for (const items of [snapshot.templates, snapshot.routines, snapshot.workouts, snapshot.folders]) {
    if (!Array.isArray(items) || new Set(items.map(item => item.id)).size !== items.length) fail();
  }
  for (const template of snapshot.templates) if (!text(template.id) || !text(template.name) || !text(template.type) || !text(template.primaryMuscle) ||
      !text(template.equipment) || typeof template.isCustom !== 'boolean' || !Array.isArray(template.secondaryMuscles) || !template.secondaryMuscles.every(text)) fail();
  const templates = new Set(snapshot.templates.map(item => item.id));
  const folders = new Set(snapshot.folders.map(item => item.id));
  for (const folder of snapshot.folders) if (!integer(folder.id) || !integer(folder.index) || !text(folder.name) || !date(folder.createdAt) || !date(folder.updatedAt)) fail();
  for (const item of [...snapshot.routines, ...snapshot.workouts]) {
    if (!text(item.id) || !text(item.name) || !date(item.createdAt) || !date(item.updatedAt) || !Array.isArray(item.exercises)) fail();
    const indices = new Set<number>(); let last = -1;
    for (const exercise of item.exercises) {
      if (!integer(exercise.index) || exercise.index <= last || indices.has(exercise.index) || !text(exercise.name) || !templates.has(exercise.templateId) ||
          typeof exercise.notes !== 'string' || !(exercise.supersetId === null || integer(exercise.supersetId)) || !Array.isArray(exercise.sets) ||
          !(exercise.restS === undefined || exercise.restS === null || typeof exercise.restS === 'number' && Number.isFinite(exercise.restS) && exercise.restS >= 0)) fail();
      last = exercise.index; indices.add(last); let lastSet = -1;
      for (const set of exercise.sets) {
        if (!integer(set.index) || set.index <= lastSet || !text(set.kind) || !numeric(set.weightKg) || !numeric(set.rpe) || !numeric(set.customMetric) ||
            !(set.reps === null || integer(set.reps)) || ![set.durationS, set.distanceM].every(value => numeric(value) && (value === null || value >= 0)) ||
            !(set.rpe === null || set.rpe >= 0 && set.rpe <= 10)) fail();
        if (set.repRange !== null && set.repRange !== undefined && (!(set.repRange.start === null || integer(set.repRange.start)) || !(set.repRange.end === null || integer(set.repRange.end)) ||
            set.repRange.start !== null && set.repRange.end !== null && set.repRange.end < set.repRange.start)) fail();
        lastSet = set.index;
      }
    }
  }
  for (const routine of snapshot.routines) if (!(routine.folderId === null || folders.has(routine.folderId))) fail();
  for (const workout of snapshot.workouts) if (!date(workout.startedAt) || !date(workout.endedAt) || workout.endedAt < workout.startedAt ||
      !(workout.routineId === null || text(workout.routineId)) || typeof workout.notes !== 'string') fail();
}
