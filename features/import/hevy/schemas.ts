import type { ImportExercise, ImportFolder, ImportRoutine, ImportSet, ImportTemplate, ImportWorkout } from '../models';
import { HevyImportError } from './errors';

// Checked against Hevy's live OpenAPI on 2026-10-05. Project only whitelisted fields.
function fail(): never { throw new HevyImportError('reading'); }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, empty = false): string {
  if (typeof value !== 'string' || value.length > 100_000 || (!empty && !value.trim())) fail();
  return value;
}
function optionalText(value: unknown): string { return value == null ? '' : text(value, true); }
function numeric(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail();
  return value;
}
function integer(value: unknown): number { const n = numeric(value); if (!Number.isSafeInteger(n) || n < 0) fail(); return n; }
function nullableNumber(value: unknown): number | null { return value == null ? null : numeric(value); }
function nullableNonnegative(value: unknown, whole = false): number | null {
  if (value == null) return null;
  const n = whole ? integer(value) : numeric(value); if (n < 0) fail(); return n;
}
function date(value: unknown): string {
  const result = text(value);
  // Require an explicit offset: interpreting a provider timestamp in device time changes history.
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) fail();
  return new Date(result).toISOString();
}
function list<T>(value: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > 100_000) fail();
  return value.map(parse);
}
function ordered<T extends { index: number }>(items: T[]): T[] {
  if (new Set(items.map(item => item.index)).size !== items.length) fail();
  return items.sort((a, b) => a.index - b.index);
}
export function parseSet(value: unknown, routine = false): ImportSet {
  const v = object(value);
  const range = v.rep_range == null ? null : object(v.rep_range);
  const start = range ? nullableNonnegative(range.start, true) : null;
  const end = range ? nullableNonnegative(range.end, true) : null;
  if (start !== null && end !== null && end < start) fail();
  const rpe = nullableNumber(v.rpe); if (rpe !== null && (rpe < 0 || rpe > 10)) fail();
  return { index: integer(v.index), kind: text(v.type), weightKg: nullableNumber(v.weight_kg),
    reps: nullableNonnegative(v.reps, true), durationS: nullableNonnegative(v.duration_seconds),
    distanceM: nullableNonnegative(v.distance_meters), rpe, customMetric: nullableNumber(v.custom_metric),
    ...(routine ? { repRange: range ? { start, end } : null } : {}) };
}
function exercises(value: unknown, routine: boolean): ImportExercise[] {
  return ordered(list(value, item => {
    const v = object(item);
    // OpenAPI says string for rest_seconds but gives a numeric example. Accept both numeric forms.
    const rest = v.rest_seconds == null ? null : nullableNonnegative(
      typeof v.rest_seconds === 'string' && /^\d+(?:\.\d+)?$/.test(v.rest_seconds) ? Number(v.rest_seconds) : v.rest_seconds);
    return { index: integer(v.index), templateId: text(v.exercise_template_id), name: text(v.title),
      notes: optionalText(v.notes), supersetId: v.superset_id == null ? null : integer(v.superset_id),
      ...(routine ? { restS: rest } : {}), sets: ordered(list(v.sets, set => parseSet(set, routine))) };
  }));
}
export function parseRoutine(value: unknown): ImportRoutine {
  const v = object(value);
  return { id: text(v.id), name: text(v.title), folderId: v.folder_id == null ? null : integer(v.folder_id),
    createdAt: date(v.created_at), updatedAt: date(v.updated_at), exercises: exercises(v.exercises, true) };
}
export function parseWorkout(value: unknown): ImportWorkout | null {
  const v = object(value);
  const startedAt = date(v.start_time);
  // Never label an unfinished session as completed. Still validate it before omission.
  const endedAt = v.end_time == null ? null : date(v.end_time);
  const parsed = { id: text(v.id), name: text(v.title), routineId: v.routine_id == null ? null : text(v.routine_id),
    notes: optionalText(v.description), startedAt, endedAt: endedAt ?? '',
    createdAt: date(v.created_at), updatedAt: date(v.updated_at), exercises: exercises(v.exercises, false) };
  if (endedAt !== null && endedAt < startedAt) fail();
  return endedAt === null ? null : parsed;
}
export function parseTemplate(value: unknown): ImportTemplate {
  const v = object(value); if (typeof v.is_custom !== 'boolean') fail();
  return { id: text(v.id), name: text(v.title), type: text(v.type), primaryMuscle: text(v.primary_muscle_group),
    secondaryMuscles: list(v.secondary_muscle_groups, item => text(item)), equipment: text(v.equipment), isCustom: v.is_custom };
}
export function parseFolder(value: unknown): ImportFolder {
  const v = object(value);
  return { id: integer(v.id), index: integer(v.index), name: text(v.title), createdAt: date(v.created_at), updatedAt: date(v.updated_at) };
}
export function parseUser(value: unknown) {
  const v = object(object(value).data);
  if (v.weight_unit !== 'kg' && v.weight_unit !== 'lbs') fail();
  return { accountId: text(v.id), weightUnit: v.weight_unit as 'kg' | 'lbs' };
}
export function parsePage(value: unknown, key: string, requestedPage: number) {
  const v = object(value); const page = integer(v.page); const pageCount = integer(v.page_count);
  if (page !== requestedPage || pageCount > 20_000 || !Array.isArray(v[key]) ||
      (pageCount > 0 && page > pageCount) || (pageCount === 0 && v[key].length !== 0) ||
      (page < pageCount && v[key].length === 0)) fail();
  return { pageCount, items: v[key] as unknown[] };
}
export function parseWorkoutCount(value: unknown): number { return integer(object(value).workout_count); }
