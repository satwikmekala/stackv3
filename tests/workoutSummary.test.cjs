/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved);
  const exports = {};
  cache.set(resolved, exports);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', code)(exports, (name) => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw Error(`Unexpected dependency ${name}`);
  });
  return exports;
}
const { deriveWorkoutSummary, formatExerciseRecap, specialSetSummaryLabel } = load('store/workoutSummary.ts');
const { deriveLiftLog } = load('store/liftLog.ts');
const set = (reps, extra = {}) => ({ reps, weight: 50, completed: true, ...extra });
const lift = (name, sets) => ({ name, sets, loadType: 'external_weight' });
const session = (exercises) => ({ id: '1', date: '2026-10-02', exercises, completed: true, retroactive: false,
  archetype: 'push', secondaryArchetype: null, workoutTypes: ['chest'] });
const summarize = (sets) => deriveWorkoutSummary(session([lift('Bench press', sets)]));

test('exact regression: 12/12/12 renders 3 × 12 while total reps remains 36', () => {
  const result = summarize([set(12), set(12), set(12)]);
  assert.equal(result.repCount, 36);
  assert.equal(result.exercises[0].repCount, 36);
  assert.equal(formatExerciseRecap(result.exercises[0], 'kg').scheme, '3 × 12');
});

test('varying reps render exact performed sequence, never sets × total reps', () => {
  const result = summarize([set(12), set(12), set(10)]);
  assert.equal(result.repCount, 34);
  assert.equal(formatExerciseRecap(result.exercises[0], 'kg').scheme, '12 · 12 · 10 reps');
});

test('two lifts with equal total reps but different set structure receive distinct recaps', () => {
  const source = session([
    lift('Bench press', [set(12), set(12), set(10)]),
    lift('Row', [set(14), set(10), set(10)]),
  ]);
  const result = deriveWorkoutSummary(source);
  assert.deepEqual(result.exercises.map((e) => e.repCount), [34, 34]);
  assert.deepEqual(result.exercises.map((e) => formatExerciseRecap(e, 'kg').scheme), ['12 · 12 · 10 reps', '14 · 10 · 10 reps']);
});

test('exercise volume renders canonical kg with visible unit', () => {
  const result = summarize([set(12), set(12), set(12)]);
  assert.deepEqual(formatExerciseRecap(result.exercises[0], 'kg'), { scheme: '3 × 12', volume: '1,800 kg' });
  assert.equal(result.volumeKg, 1800);
});

test('exercise volume converts to lb display with visible unit', () => {
  const result = summarize([set(12), set(12), set(12)]);
  assert.deepEqual(formatExerciseRecap(result.exercises[0], 'lbs'), { scheme: '3 × 12', volume: '3,968.3 lbs' });
  assert.equal(result.volumeKg, 1800);
});

test('skipped and unfinished values never enter recap, volume or totals', () => {
  const source = session([
    lift('Bench press', [set(12), set(99, { skipped: true }), set(8, { completed: false })]),
    lift('Row', [set(99, { skipped: true })]),
  ]);
  const result = deriveWorkoutSummary(source);
  assert.deepEqual([result.setCount, result.repCount, result.exerciseCount, result.volumeKg], [1, 12, 1, 600]);
  assert.deepEqual(formatExerciseRecap(result.exercises[0], 'kg'), { scheme: '1 × 12', volume: '600 kg' });
  assert.equal(deriveLiftLog(source, [], 'kg').lines[0].scheme, '1 × 12');
});

test('all performed bonus types remain counted, skipped bonus excluded, using Lift Log membership', () => {
  const source = session([lift('Bench press', [
    set(12), set(12), set(12), set(5, { type: 'pr' }), set(10, { type: 'dropset' }),
    set(8, { type: 'extra' }), set(99, { type: 'extra', skipped: true }),
  ])]);
  const result = deriveWorkoutSummary(source);
  assert.deepEqual([result.setCount, result.repCount, result.volumeKg], [6, 59, 2950]);
  assert.deepEqual(result.specialSets, { pr: 1, dropset: 1, extra: 1 });
  assert.equal(specialSetSummaryLabel(result.specialSets), '3 SPECIAL SETS LOGGED');
  assert.equal(formatExerciseRecap(result.exercises[0], 'kg').scheme, '12 · 12 · 12 · 5 · 10 · 8 reps');
  assert.equal(deriveLiftLog(source, [], 'kg').lines[0].scheme, '6 × 5–12');
});

// ---------------------------------------------------------------------------
// Slice 4: timed exercises
// ---------------------------------------------------------------------------
const measurement = load('store/exerciseMeasurement.ts');
const hold = (name, durations, weights = [], loadType = weights.length ? 'external_weight' : 'bodyweight') => ({
  name, loadType, metric: 'duration',
  sets: durations.map((durationS, index) => ({ reps: 0, durationS, weight: weights[index] ?? 0, completed: true })),
});

test('duration formatting and typed entry are exact', () => {
  assert.deepEqual([45, 60, 90, 125, 0, 5999].map(measurement.formatDuration), ['0:45', '1:00', '1:30', '2:05', '0:00', '99:59']);
  assert.equal(measurement.formatDuration(undefined), '—');
  assert.deepEqual(['90', '1:30', ' 2:05 ', '0:45'].map(measurement.parseDurationInput), [90, 90, 125, 45]);
  assert.deepEqual(['1:3', '1:60', 'abc', '', '1.5', '-5', '12345'].map(measurement.parseDurationInput), [null, null, null, null, null, null, null]);
  assert.equal(measurement.DURATION_STEP_S, 5);
  assert.deepEqual([measurement.clampDuration(0), measurement.clampDuration(-10), measurement.clampDuration(9000)], [1, 1, 5999]);
});

test('timed recap: equal 3 × 1:00, varied 1:00 · 0:45 · 1:10, never reps and never volume', () => {
  const result = deriveWorkoutSummary(session([hold('Plank', [60, 60, 60]), hold('Side Plank', [60, 45, 70])]));
  assert.deepEqual(result.exercises.map((exercise) => formatExerciseRecap(exercise, 'kg')), [
    { scheme: '3 × 1:00', volume: null },
    { scheme: '1:00 · 0:45 · 1:10', volume: null },
  ]);
  assert.doesNotMatch(JSON.stringify(result.exercises.map((exercise) => formatExerciseRecap(exercise, 'kg'))), /reps/);
  const { exerciseRecapAccessibilityLabel } = load('store/workoutSummary.ts');
  assert.equal(exerciseRecapAccessibilityLabel(result.exercises[1], 'kg'), '3 sets, 1:00, 0:45, 1:10');
});

test('weighted timed recap shows the load held, not volume', () => {
  const result = deriveWorkoutSummary(session([hold('Farmer Carry', [45, 45, 30], [30, 30, 32.5])]));
  assert.deepEqual(formatExerciseRecap(result.exercises[0], 'kg'), { scheme: '0:45 · 0:45 · 0:30', volume: '30–32.5 kg' });
  const even = deriveWorkoutSummary(session([hold('Farmer Carry', [45, 45], [30, 30])]));
  assert.deepEqual(formatExerciseRecap(even.exercises[0], 'kg'), { scheme: '2 × 0:45', volume: '30 kg' });
  assert.equal(even.volumeKg, 0);
});

test('timed sets add nothing to total reps or volume; the sets still count', () => {
  const result = deriveWorkoutSummary(session([lift('Bench press', [set(10), set(10)]), hold('Plank', [60, 60]), hold('Farmer Carry', [45], [40])]));
  assert.equal(result.repCount, 20);
  assert.equal(result.volumeKg, 1000);
  assert.equal(result.setCount, 5);
  assert.deepEqual(result.exercises.map((exercise) => [exercise.repCount, exercise.volumeKg]), [[20, 1000], [0, 0], [0, 0]]);
});

test('Lift Log: holds show time (or load held), a duration range, and are never PRs', () => {
  const earlier = { ...session([hold('Plank', [30]), hold('Farmer Carry', [20], [20])]), id: '0', date: '2026-09-01' };
  const today = session([hold('Plank', [45, 60]), hold('Farmer Carry', [45, 30], [30, 32.5]), lift('Bench press', [set(10)])]);
  const log = deriveLiftLog(today, [earlier, today], 'kg');
  assert.deepEqual(log.lines.slice(0, 2), [
    { name: 'Plank', value: '1:00', unit: '', scheme: '2 × 0:45–1:00', record: false },
    { name: 'Farmer Carry', value: '32.5', unit: 'kg', scheme: '2 × 0:30–0:45', record: false },
  ]);
});
