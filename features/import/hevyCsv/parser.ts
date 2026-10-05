import { sha256 } from 'js-sha256';
import type { ExerciseCatalogItem } from '@/store/workoutDatabase';
import type { ImportExercise, ImportSet, ImportSnapshot, ImportTemplate, ImportWorkout } from '../models';
import { validateImportSnapshot } from '../validation';
import { resolveHevyExercise } from '../hevy/exerciseResolver';
import { HevyExportError } from './errors';
import { HEVY_CSV_MAX_BYTES, HEVY_CSV_MAX_SETS, HEVY_CSV_MAX_WORKOUTS } from './limits';

export const HEVY_CSV_ACCOUNT = 'hevy-csv-v1';
const BASE_HEADERS = ['title', 'start_time', 'end_time', 'description', 'exercise_title', 'superset_id',
  'exercise_notes', 'set_index', 'set_type', 'reps', 'duration_seconds', 'rpe'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const invalid = (): never => { throw new HevyExportError('invalid'); };
const unsupported = (): never => { throw new HevyExportError('unsupported'); };
const large = (): never => { throw new HevyExportError('large'); };
const fingerprint = (value: unknown) => sha256.create().update(JSON.stringify(value)).hex();

/** RFC 4180 quoting, including embedded newlines and escaped quotes. No permissive repair. */
function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', mode: 'plain' | 'quoted' | 'closed' = 'plain';
  const cell = () => { row.push(field); field = ''; mode = 'plain'; if (row.length > 14) unsupported(); };
  const line = () => { cell(); if (row.some(value => value.length)) rows.push(row); row = []; if (rows.length > HEVY_CSV_MAX_SETS + 1) large(); };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (mode === 'quoted') {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; } else mode = 'closed';
      } else field += char;
    } else if (char === ',') cell();
    else if (char === '\n') line();
    else if (mode === 'closed') invalid();
    else if (char === '"') { if (field.length) invalid(); mode = 'quoted'; }
    else field += char;
    if (field.length > 100_000) large();
  }
  if (mode === 'quoted') invalid();
  if (field.length || row.length || mode === 'closed') line();
  return rows;
}

function number(value: string, integer = false): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) invalid();
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed > Number.MAX_SAFE_INTEGER || integer && !Number.isSafeInteger(parsed)) invalid();
  return parsed;
}

/** Hevy provides a wall clock, with minute precision and no zone. Never invoke Date.parse on it. */
function date(value: string): { iso: string; wall: number[] } {
  const match = /^(\d{1,2}) ([A-Za-z]+) (\d{4}), (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return unsupported();
  const [, day, month, year, hour, minute] = match;
  const m = MONTHS.indexOf(month);
  if (m < 0) unsupported();
  const wall = [Number(year), m, Number(day), Number(hour), Number(minute)];
  const sameWall = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()].every((n, i) => n === wall[i]);
  const d = new Date(wall[0], wall[1], wall[2], wall[3], wall[4]);
  if (wall[0] < 1900 || !sameWall(d)) invalid();
  // Reject duplicated fall-back local times instead of assigning an arbitrary offset.
  if ([-120, -90, -60, -30, 30, 60, 90, 120].some(minutes => sameWall(new Date(d.getTime() + minutes * 60_000)))) unsupported();
  return { iso: d.toISOString(), wall };
}

function templateFor(name: string, sets: ImportSet[], catalog: readonly ExerciseCatalogItem[]): ImportTemplate {
  const equipment = name.match(/\(([^)]+)\)$/)?.[1].toLowerCase() ?? 'unknown';
  const template: ImportTemplate = { id: '', name, type: 'csv_unknown', primaryMuscle: 'unknown', secondaryMuscles: [], equipment, isCustom: false };
  const timed = sets.some(set => (set.durationS ?? 0) > 0);
  const reps = sets.some(set => (set.reps ?? 0) > 0);
  const load = sets.some(set => (set.weightKg ?? 0) > 0);
  const types = timed && !reps ? ['weight_duration', 'duration'] : reps && !timed ? ['weight_reps', 'bodyweight_reps'] : [];
  // Probe through the existing resolver. CSV has neither template IDs nor authoritative muscle/type metadata.
  const matches = types.map(type => resolveHevyExercise({ ...template, type }, catalog)).filter(item => item.localId !== null);
  const known = matches.length === 1 ? matches[0] : undefined;
  const hasDistance = sets.some(set => (set.distanceM ?? 0) > 0);
  const assisted = /\b(assisted|assistance)\b/i.test(name);
  if (hasDistance) template.type = 'distance_duration';
  else if (assisted) template.type = 'assistance';
  else if (known) {
    // A bodyweight name carrying added load must not become ordinary bodyweight performance.
    template.type = known.loadType === 'bodyweight' && load ? 'weighted_bodyweight' : known.template.type;
    template.primaryMuscle = known.primaryMuscle.toLowerCase().replace(/\s+/g, '_');
  } else if (types.length && sets.every(set => set.weightKg !== null)) template.type = timed ? 'weight_duration' : 'weight_reps';
  // Unknown names without clear load/metric evidence remain reference-only, not fabricated baselines.
  template.id = `csv-exercise:${fingerprint([name, template.type])}`;
  return template;
}

export function parseHevyExport(input: string, catalog: readonly ExerciseCatalogItem[]): ImportSnapshot {
  try { return parse(input, catalog); }
  catch (error) { if (error instanceof HevyExportError) throw error; throw new HevyExportError('invalid'); }
}

function parse(input: string, catalog: readonly ExerciseCatalogItem[]): ImportSnapshot {
  if (!input.trim()) throw new HevyExportError('empty');
  // Bound memory before splitting. Count UTF-8 bytes without relying on native TextEncoder.
  if (input.length > HEVY_CSV_MAX_BYTES) large();
  let bytes = 0;
  for (const char of input) { const point = char.codePointAt(0)!; bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4; if (bytes > HEVY_CSV_MAX_BYTES) large(); }
  if (input.includes('\0') || input.includes('\uFFFD')) invalid();
  const rows = csvRows(input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
  if (!rows.length) throw new HevyExportError('empty');
  const headers = rows[0];
  const weight = headers.includes('weight_kg') ? 'weight_kg' : 'weight_lbs';
  const distance = headers.includes('distance_km') ? 'distance_km' : 'distance_miles';
  const expected = [...BASE_HEADERS, weight, distance];
  if (headers.length !== 14 || new Set(headers).size !== 14 || !expected.every(header => headers.includes(header))) unsupported();
  if (rows.length === 1) throw new HevyExportError('empty');
  const columns = new Map(headers.map((header, index) => [header, index]));
  const parsedDates = new Map<string, ReturnType<typeof date>>();
  const readDate = (value: string) => {
    let parsed = parsedDates.get(value);
    if (!parsed) { parsed = date(value); parsedDates.set(value, parsed); }
    return parsed;
  };
  const workouts: ImportWorkout[] = [], templates = new Map<string, ImportTemplate>(), occurrences = new Map<string, number>();
  let key = '', current: ImportWorkout | null = null, wallStart: number[] = [], wallEnd: number[] = [], incomplete = false, incompleteWorkouts = 0;
  const finish = () => {
    if (!current) return;
    if (incomplete) { incompleteWorkouts++; return; }
    // Entire ordered content participates, rather than just title/date/first set. Not dependent on device zone or resolver output.
    const content = [current.name, wallStart, wallEnd, current.notes, current.exercises.map(exercise => [exercise.name, exercise.notes, exercise.supersetId, exercise.sets])];
    const hash = fingerprint(content), ordinal = occurrences.get(hash) ?? 0;
    occurrences.set(hash, ordinal + 1);
    current.id = `csv-workout:${hash}:${ordinal}`;
    workouts.push(current);
    if (workouts.length > HEVY_CSV_MAX_WORKOUTS) large();
  };
  for (const row of rows.slice(1)) {
    if (row.length !== headers.length) invalid();
    const get = (column: string) => row[columns.get(column)!];
    const title = get('title'), name = get('exercise_title');
    if (!title.trim() || !name.trim()) invalid();
    const start = readDate(get('start_time')), end = get('end_time').trim() ? readDate(get('end_time')) : null;
    if (end && end.iso < start.iso) invalid();
    const nextKey = JSON.stringify([title, start.wall, end?.wall ?? null, get('description')]);
    if (nextKey !== key) {
      finish(); key = nextKey; wallStart = start.wall; wallEnd = end?.wall ?? [];
      incomplete = end === null;
      current = { id: '', name: title, routineId: null, notes: get('description'), startedAt: start.iso,
        endedAt: end?.iso ?? start.iso, createdAt: start.iso, updatedAt: end?.iso ?? start.iso, exercises: [] };
    }
    const setIndex = number(get('set_index'), true);
    if (setIndex === null) return invalid();
    const sourceKind = get('set_type').trim();
    if (!sourceKind) invalid();
    const set: ImportSet = { index: setIndex, kind: sourceKind === 'drop_set' ? 'dropset' : sourceKind,
      weightKg: number(get(weight)), reps: number(get('reps'), true), durationS: number(get('duration_seconds')),
      distanceM: number(get(distance)), rpe: number(get('rpe')), customMetric: null };
    if (set.rpe !== null && set.rpe > 10) invalid();
    if (set.weightKg !== null && weight === 'weight_lbs') set.weightKg *= 0.45359237;
    if (set.distanceM !== null) set.distanceM *= distance === 'distance_km' ? 1000 : 1609.344;
    const superset = number(get('superset_id'), true), notes = get('exercise_notes');
    let exercise: ImportExercise | undefined = current!.exercises.at(-1);
    if (!exercise || exercise.name !== name || exercise.notes !== notes || exercise.supersetId !== superset || setIndex <= exercise.sets.at(-1)!.index) {
      exercise = { index: current!.exercises.length, templateId: '', name, notes, supersetId: superset, sets: [] };
      current!.exercises.push(exercise);
    }
    exercise.sets.push(set);
  }
  finish();
  if (!workouts.length) throw new HevyExportError('empty');
  const templateCache = new Map<string, ImportTemplate>();
  for (const workout of workouts) for (const exercise of workout.exercises) {
    const sets = exercise.sets;
    const evidence = JSON.stringify([exercise.name, sets.some(set => (set.durationS ?? 0) > 0), sets.some(set => (set.reps ?? 0) > 0),
      sets.some(set => (set.weightKg ?? 0) > 0), sets.some(set => (set.distanceM ?? 0) > 0), sets.every(set => set.weightKg !== null)]);
    const template = templateCache.get(evidence) ?? templateFor(exercise.name, sets, catalog);
    templateCache.set(evidence, template);
    templates.set(template.id, template); exercise.templateId = template.id;
  }
  const snapshot: ImportSnapshot = { source: 'hevy', accountId: HEVY_CSV_ACCOUNT, weightUnit: weight === 'weight_kg' ? 'kg' : 'lbs',
    routines: [], folders: [], workouts, templates: [...templates.values()], incompleteWorkouts };
  validateImportSnapshot(snapshot);
  return snapshot;
}
