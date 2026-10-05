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
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', js)(exports, (name) => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw new Error(`Unexpected runtime dependency: ${name}`);
  });
  return exports;
}
const { deriveLiftLog, LIFT_LOG_MAX_LINES } = load('store/liftLog.ts');

const set = (weight, reps, extra = {}) => ({ weight, reps, completed: true, ...extra });
const lift = (name, sets, loadType = 'external_weight') => ({ name, sets, loadType });
const session = (id, date, exercises) => ({ id: String(id), date, exercises, completed: true, retroactive: false,
  archetype: 'pull', secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null, workoutTypes: ['back'] });

test('one total volume per lift in training order', () => {
  const today = session(2, '2026-09-25', [
    lift('Deadlift', [set(90, 5), set(100, 5), set(100, 5)]),
    lift('Barbell Row', [set(60, 8), set(60, 8), set(60, 8)]),
  ]);
  assert.deepEqual(deriveLiftLog(today, [today], 'kg'), { more: 0, lines: [
    { name: 'Deadlift', value: '1,450', unit: 'kg', record: false },
    { name: 'Barbell Row', value: '1,440', unit: 'kg', record: false },
  ] });
});

test('PR only when the top set beats every earlier session; a first session is not a PR', () => {
  const before = session(1, '2026-09-18', [lift('Deadlift', [set(95, 5)]), lift('Lat Pulldown', [set(55, 10)])]);
  const today = session(2, '2026-09-25', [
    lift('Deadlift', [set(100, 5)]), lift('Lat Pulldown', [set(55, 10)]), lift('Hammer Curl', [set(14, 14)]),
  ]);
  const later = session(3, '2026-09-28', [lift('Deadlift', [set(120, 5)])]);
  const lines = deriveLiftLog(today, [before, today, later], 'kg').lines;
  assert.deepEqual(lines.map((line) => [line.name, line.record]), [['Deadlift', true], ['Lat Pulldown', false], ['Hammer Curl', false]]);
});

test('skipped and unfinished sets never count; bodyweight is labelled without a rep count', () => {
  const today = session(1, '2026-09-25', [
    lift('Pull-up', [set(0, 12), set(0, 10)], 'bodyweight'),
    lift('Seated Cable Row', [set(45, 12), set(45, 10), set(80, 12, { skipped: true }), set(90, 1, { completed: false })]),
    lift('Face Pull', [set(20, 15, { skipped: true })]),
  ]);
  assert.deepEqual(deriveLiftLog(today, [today], 'kg').lines, [
    { name: 'Pull-up', value: 'Bodyweight', unit: '', record: false },
    { name: 'Seated Cable Row', value: '990', unit: 'kg', record: false },
  ]);
});

test('lb profiles convert, and long sessions cap with a remainder', () => {
  const today = session(1, '2026-09-25', Array.from({ length: LIFT_LOG_MAX_LINES + 2 }, (_, i) => lift(`Lift ${i}`, [set(100, 5)])));
  const log = deriveLiftLog(today, [today], 'lbs');
  assert.equal(log.lines.length, LIFT_LOG_MAX_LINES);
  assert.equal(log.more, 2);
  assert.deepEqual([log.lines[0].value, log.lines[0].unit], ['1,102.3', 'lb']);
});

test('screenshot regression: mixed Bench Press totals use every actual set weight', () => {
  const today = session(1, '2026-10-05', [lift('Bench Press', [set(42, 9), set(42.6, 9), set(42.6, 9)])]);
  assert.deepEqual(deriveLiftLog(today, [], 'kg').lines[0], {
    name: 'Bench Press', value: '1,144.8', unit: 'kg', record: false,
  });
});

test('mixed weights and reps are summed before converting the total to pounds', () => {
  const today = session(1, '2026-10-05', [lift('Bench Press', [set(40, 12), set(60, 5), set(60, 6), set(100, 99, { skipped: true }), set(110, 99, { completed: false })])]);
  const log = deriveLiftLog(today, [], 'lbs');
  assert.deepEqual(log.lines[0], { name: 'Bench Press', value: '2,513.3', unit: 'lb', record: false });
});

test('bodyweight ignores stale loads and timed exercises show total duration instead of invented volume', () => {
  const today = session(1, '2026-10-05', [
    lift('Pull-up', [set(100, 5), set(0, 12)], 'bodyweight'),
    { ...lift('Farmer Carry', [set(20, 0, { durationS: 90 }), set(40, 0, { durationS: 30 })]), metric: 'duration' },
  ]);
  const lines = deriveLiftLog(today, [], 'kg').lines;
  assert.deepEqual(lines[0], { name: 'Pull-up', value: 'Bodyweight', unit: '', record: false });
  assert.deepEqual(lines[1], { name: 'Farmer Carry', value: '2:00', unit: '', record: false });
});

test('PR comparisons use timestamp order and stable string IDs, excluding future and retroactive history', () => {
  const before = session('workout-1', '2026-10-05T09:00:00Z', [lift('Bench Press', [set(40, 8)])]);
  const today = session('workout-2', '2026-10-05T14:00:00+05:30', [lift('Bench Press', [set(42, 9)])]);
  assert.equal(deriveLiftLog(today, [before], 'kg').lines[0].record, false, '09:00 UTC is later than 08:30 UTC');
  before.date = today.date;
  assert.equal(deriveLiftLog(today, [before], 'kg').lines[0].record, true);
  before.retroactive = true;
  assert.equal(deriveLiftLog(today, [before], 'kg').lines[0].record, false);
});

test('warmups contribute actual volume but cannot set the working PR baseline', () => {
  const before = session(1, '2026-10-04', [lift('Bench Press', [set(100, 1, { sourceKind: 'warmup' }), set(40, 8)])]);
  const today = session(2, '2026-10-05', [lift('Bench Press', [set(110, 1, { sourceKind: 'warmup' }), set(42, 9)])]);
  const line = deriveLiftLog(today, [before], 'kg').lines[0];
  assert.equal(line.value, '488');
  assert.equal(line.record, true);
});

test('skipped-only lifts are omitted while duplicate names keep the actual exercise order', () => {
  const today = session(1, '2026-10-05', [lift('Row', [set(20, 10)]), lift('Skipped', [set(99, 99, { skipped: true })]), lift('Row', [set(30, 8)])]);
  assert.deepEqual(deriveLiftLog(today, [], 'kg').lines.map(line => [line.name, line.value]), [['Row', '200'], ['Row', '240']]);
});

test('requested squat example: 60 kg for three sets of eight displays 1,440 kg without a rep scheme', () => {
  const today = session(1, '2026-10-06', [lift('Back Squat', [set(60, 8), set(60, 8), set(60, 8)])]);
  assert.deepEqual(deriveLiftLog(today, [], 'kg').lines, [{ name: 'Back Squat', value: '1,440', unit: 'kg', record: false }]);
});

test('share totals agree with recap and footer across mixed sets, bonuses, bodyweight and time', () => {
  const today = session(1, '2026-10-06', [
    lift('Back Squat', [set(60, 8), set(70, 6), set(50, 10, { type: 'dropset' }), set(80, 3, { type: 'pr' }), set(40, 5, { type: 'extra' }), set(999, 99, { skipped: true }), set(999, 99, { completed: false })]),
    lift('Row', [set(25.5, 12), set(27.5, 10)]),
    lift('Pull-up', [set(100, 12)], 'bodyweight'),
    { ...lift('Plank', [set(0, 0, { durationS: 45 }), set(0, 0, { durationS: 60 }), set(0, 0, { durationS: 90, skipped: true })], 'bodyweight'), metric: 'duration' },
  ]);
  const summary = load('store/workoutSummary.ts').deriveWorkoutSummary(today);
  const lines = deriveLiftLog(today, [], 'kg').lines;
  assert.deepEqual(lines.map(line => [line.value, line.unit]), [['1,840', 'kg'], ['581', 'kg'], ['Bodyweight', ''], ['1:45', '']]);
  assert.equal(summary.volumeKg, 2421);
  assert.deepEqual(summary.exercises.map(exercise => exercise.volumeKg), [1840, 581, 0, 0]);
  assert.equal(lines.filter(line => line.unit === 'kg').reduce((sum, line) => sum + Number(line.value.replaceAll(',', '')), 0), summary.volumeKg);
  assert.ok(lines.every(line => !Object.hasOwn(line, 'scheme') && line.unit !== 'reps'));
});
