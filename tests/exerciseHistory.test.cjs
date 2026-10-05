/* global __dirname */
// Run with: node --test tests/exerciseHistory.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Store modules are real; anything outside store/ is presentation and stubbed.
const cache = new Map();
function load(id) {
  if (!id.startsWith('@/store/')) return new Proxy({}, { get: () => () => '#000' });
  const file = path.join(root, `${id.slice(2)}.ts`);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', code)(exports, load);
  return exports;
}
const history = load('@/store/exerciseHistory');

const set = (weight, reps, extra = {}) => ({ weight, reps, completed: true, skipped: false, ...extra });
const bench = (sets, extra = {}) => ({ name: 'Bench Press', loadType: 'external_weight', metric: 'reps', entryUnit: 'kg', sets, ...extra });
const other = (sets) => ({ name: 'Back Squat', loadType: 'external_weight', metric: 'reps', entryUnit: 'kg', sets });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false, ...extra });
const summary = (entries) => entries.map((entry) => ({
  id: entry.sessionId,
  sets: entry.sets.map((item) => `${item.weight}x${item.reps}${item.top ? '*' : ''}`),
}));

test('History lists only completed workouts with this exercise, newest first, capped at five', () => {
  const sessions = [
    session(1, '2026-09-01T10:00:00.000Z', [bench([set(50, 10)])]),
    session(2, '2026-09-05T10:00:00.000Z', [bench([set(52.5, 10)])]),
    session(3, '2026-09-09T10:00:00.000Z', [other([set(100, 5)])]),
    session(4, '2026-09-13T10:00:00.000Z', [bench([set(52.5, 9), set(55, 8)])]),
    session(5, '2026-09-17T10:00:00.000Z', [bench([set(55, 8)])]),
    session(6, '2026-09-21T10:00:00.000Z', [bench([set(55, 9)])]),
    session(7, '2026-09-25T10:00:00.000Z', [other([set(100, 5)]), bench([set(57.5, 8), set(57.5, 8), set(55, 9)])]),
  ];
  const entries = history.getExerciseHistory(sessions, 'Bench Press');
  assert.equal(history.EXERCISE_HISTORY_LIMIT, 5);
  assert.deepEqual(entries.map((entry) => entry.sessionId), ['7', '6', '5', '4', '2']);
  assert.deepEqual(summary(entries)[0], { id: '7', sets: ['57.5x8*', '57.5x8', '55x9'] });
  assert.deepEqual(summary(entries)[3], { id: '4', sets: ['52.5x9', '55x8*'] });
  assert.equal(history.getExerciseHistory(sessions, 'Bench Press', { limit: 2 }).length, 2);
});

test('The unfinished workout, retroactive logs and unperformed sets never count as history', () => {
  const sessions = [
    session(1, '2026-09-01T10:00:00.000Z', [bench([set(50, 10)])]),
    // Retroactive sessions copy old values instead of recording lifts.
    session(2, '2026-09-03T10:00:00.000Z', [bench([set(90, 10)])], { retroactive: true }),
    // All skipped: a workout with nothing performed is not a history entry.
    session(3, '2026-09-05T10:00:00.000Z', [bench([set(60, 8, { skipped: true }), set(60, 8, { completed: false })])]),
    session(4, '2026-09-07T10:00:00.000Z', [bench([
      set(20, 12, { sourceKind: 'warmup' }), set(60, 8), set(62.5, 6, { skipped: true }), set(60, 0, { completed: false }),
    ])]),
    // In progress: neither the completed flag nor the active ID may leak in.
    session(5, '2026-10-05T10:00:00.000Z', [bench([set(70, 8)])], { completed: false }),
    session(6, '2026-10-04T10:00:00.000Z', [bench([set(65, 8)])]),
  ];
  const entries = history.getExerciseHistory(sessions, 'Bench Press', { excludeSessionId: '6' });
  assert.deepEqual(summary(entries), [
    { id: '4', sets: ['60x8*'] },
    { id: '1', sets: ['50x10*'] },
  ]);
});

test('No matching history is an empty list, not an error', () => {
  assert.deepEqual(history.getExerciseHistory([], 'Bench Press'), []);
  assert.deepEqual(history.getExerciseHistory([session(1, '2026-09-01', [other([set(100, 5)])])], 'Bench Press'), []);
});

test('Same-day workouts order by when they were logged; date-only legacy rows use the local calendar', () => {
  const sessions = [
    session(10, '2026-09-20', [bench([set(50, 10)])]),
    session(12, '2026-09-20', [bench([set(52.5, 10)])]),
    session(11, '2026-09-21', [bench([set(55, 10)])]),
  ];
  const entries = history.getExerciseHistory(sessions, 'Bench Press');
  assert.deepEqual(entries.map((entry) => entry.sessionId), ['11', '12', '10']);
  assert.equal(entries[0].date.getDate(), 21);
  assert.equal(entries[0].date.getHours(), 0);
});

test('Each workout keeps its own measure and marks one best set', () => {
  const sessions = [
    session(1, '2026-09-01', [bench([set(0, 10), set(0, 12), set(0, 12)], { loadType: 'bodyweight' })]),
    session(2, '2026-09-02', [bench([set(0, 0, { durationS: 45 }), set(0, 0, { durationS: 60 })], { loadType: 'bodyweight', metric: 'duration' })]),
    session(3, '2026-09-03', [bench([set(20, 0, { durationS: 60 }), set(24, 0, { durationS: 40 })], { metric: 'duration' })]),
    session(4, '2026-09-04', [bench([set(60, 8), set(45, 12, { type: 'dropset' })])]),
  ];
  const [dropset, carry, plank, pullUps] = history.getExerciseHistory(sessions, 'Bench Press');
  assert.deepEqual(pullUps.sets.map((item) => item.top), [false, true, false], 'first of the tied best sets');
  assert.equal(pullUps.sets[0].loadType, 'bodyweight');
  assert.deepEqual(plank.sets.map((item) => item.top), [false, true]);
  assert.equal(plank.sets[0].metric, 'duration');
  assert.deepEqual(carry.sets.map((item) => item.top), [false, true], 'load before time held');
  assert.deepEqual(dropset.sets.map((item) => [item.top, item.type]), [[true, undefined], [false, 'dropset']]);
});

test('Sets read like the logger in today’s unit, for every logging type', () => {
  const fmt = (values, unit = 'kg') => {
    const { load, unit: shown, measure, accessibilityLabel } = history.formatHistorySet({
      weight: 0, reps: 0, loadType: 'external_weight', metric: 'reps', top: false, ...values,
    }, unit);
    return { load, unit: shown, measure, accessibilityLabel };
  };
  assert.deepEqual(fmt({ weight: 57.5, reps: 8, top: true }), {
    load: '57.5', unit: 'kg', measure: '× 8', accessibilityLabel: '57.5 kilograms, 8 reps, best set',
  });
  assert.deepEqual(fmt({ weight: 45.359, reps: 5 }, 'lbs'), {
    load: '100', unit: 'lb', measure: '× 5', accessibilityLabel: '100 pounds, 5 reps',
  });
  assert.deepEqual(fmt({ reps: 12, loadType: 'bodyweight', weight: 10 }), {
    load: null, unit: '', measure: '12 reps', accessibilityLabel: '12 reps',
  });
  assert.equal(fmt({ reps: 1, loadType: 'bodyweight' }).measure, '1 rep');
  assert.deepEqual(fmt({ durationS: 45, loadType: 'bodyweight', metric: 'duration' }), {
    load: null, unit: '', measure: '0:45', accessibilityLabel: '45 seconds',
  });
  assert.deepEqual(fmt({ weight: 24, durationS: 90, metric: 'duration' }), {
    load: '24', unit: 'kg', measure: '· 1:30', accessibilityLabel: '24 kilograms, 1 minute 30 seconds',
  });
  assert.equal(fmt({ weight: 40, reps: 10, type: 'dropset' }).accessibilityLabel, '40 kilograms, 10 reps, drop set');
});

test('Dates are short, include the year only when needed, and say how long ago', () => {
  const now = new Date(2026, 9, 5, 18, 0);
  const at = (y, m, d) => history.formatHistoryDate(new Date(y, m, d, 9, 0), now);
  assert.deepEqual(at(2026, 9, 5), { label: 'Oct 5', relative: 'Today' });
  assert.deepEqual(at(2026, 9, 4), { label: 'Oct 4', relative: 'Yesterday' });
  assert.deepEqual(at(2026, 9, 2), { label: 'Oct 2', relative: '3 days ago' });
  assert.deepEqual(at(2026, 8, 28), { label: 'Sep 28', relative: '7 days ago' });
  assert.deepEqual(at(2026, 8, 23), { label: 'Sep 23', relative: '12 days ago' });
  assert.deepEqual(at(2026, 8, 21), { label: 'Sep 21', relative: '2 weeks ago' });
  assert.deepEqual(at(2026, 8, 14), { label: 'Sep 14', relative: '3 weeks ago' });
  assert.deepEqual(at(2026, 6, 1), { label: 'Jul 1', relative: '' });
  assert.deepEqual(at(2025, 11, 30), { label: 'Dec 30, 2025', relative: '' });
});
