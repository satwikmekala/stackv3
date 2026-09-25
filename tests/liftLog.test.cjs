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

test('one line per lift: top set, sets × reps, in training order', () => {
  const today = session(2, '2026-09-25', [
    lift('Deadlift', [set(90, 5), set(100, 5), set(100, 5)]),
    lift('Barbell Row', [set(60, 8), set(60, 8), set(60, 8)]),
  ]);
  assert.deepEqual(deriveLiftLog(today, [today], 'kg'), { more: 0, lines: [
    { name: 'Deadlift', value: '100', unit: 'kg', scheme: '3 × 5', record: false },
    { name: 'Barbell Row', value: '60', unit: 'kg', scheme: '3 × 8', record: false },
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

test('skipped and unfinished sets never count; varied reps show a range; bodyweight shows reps', () => {
  const today = session(1, '2026-09-25', [
    lift('Pull-up', [set(0, 12), set(0, 10)], 'bodyweight'),
    lift('Seated Cable Row', [set(45, 12), set(45, 10), set(80, 12, { skipped: true }), set(90, 1, { completed: false })]),
    lift('Face Pull', [set(20, 15, { skipped: true })]),
  ]);
  assert.deepEqual(deriveLiftLog(today, [today], 'kg').lines, [
    { name: 'Pull-up', value: '12', unit: 'reps', scheme: '2 × 10–12', record: false },
    { name: 'Seated Cable Row', value: '45', unit: 'kg', scheme: '2 × 10–12', record: false },
  ]);
});

test('lb profiles convert, and long sessions cap with a remainder', () => {
  const today = session(1, '2026-09-25', Array.from({ length: LIFT_LOG_MAX_LINES + 2 }, (_, i) => lift(`Lift ${i}`, [set(100, 5)])));
  const log = deriveLiftLog(today, [today], 'lbs');
  assert.equal(log.lines.length, LIFT_LOG_MAX_LINES);
  assert.equal(log.more, 2);
  assert.deepEqual([log.lines[0].value, log.lines[0].unit], ['220.5', 'lbs']);
});
