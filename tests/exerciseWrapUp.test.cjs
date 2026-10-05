/* global __dirname */
// Run with: node --test tests/exerciseWrapUp.test.cjs
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
const wrapUp = load('@/store/exerciseWrapUp');

const set = (weight, reps, extra = {}) => ({ weight, reps, completed: true, skipped: false, ...extra });
const lift = (sets, extra = {}) => ({ name: 'Back Squat', loadType: 'external_weight', metric: 'reps', sets, ...extra });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false, ...extra });

test('Records need history and use the Records screen rule: heavier first, then more reps', () => {
  const history = [session(1, '2026-09-01', [lift([set(60, 8), set(62.5, 6)])])];
  const best = wrapUp.getPreviousBest(history, 'Back Squat');
  assert.deepEqual(best, { weight: 62.5, reps: 6 });
  const today = lift([set(60, 10), set(62.5, 7), set(62.5, 7), set(65, 3, { type: 'extra' }), set(70, 1, { skipped: true })]);
  // Same weight with more reps beats it; an equal set does not; skipped sets never count.
  assert.deepEqual(wrapUp.getRecordSetIndexes(best, today), [1, 3]);
  assert.deepEqual(wrapUp.getRecordSetIndexes(null, today), [], 'a first-ever session sets the baseline');
  assert.deepEqual(wrapUp.getRecordSetIndexes(best, lift([set(0, 0, { durationS: 60 })], { metric: 'duration' })), []);
});

test('Retroactive, unfinished and other-metric history is not a record', () => {
  const history = [
    session(1, '2026-09-01', [lift([set(100, 5)])], { retroactive: true }),
    session(2, '2026-09-02', [lift([set(90, 5)])], { completed: false }),
    session(3, '2026-09-03', [lift([set(80, 5)], { metric: 'duration' })]),
    session(4, '2026-09-04', [lift([set(50, 5)])]),
  ];
  assert.deepEqual(wrapUp.getPreviousBest(history, 'Back Squat'), { weight: 50, reps: 5 });
});

test('Record hint only appears when one more set could realistically beat it', () => {
  const exercise = lift([set(60, 8)]);
  assert.deepEqual(wrapUp.getRecordHint({ weight: 60, reps: 8 }, exercise, { weight: 60, reps: 8 }),
    { best: { weight: 60, reps: 8 }, beatReps: 9 });
  assert.deepEqual(wrapUp.getRecordHint({ weight: 65, reps: 6 }, exercise, { weight: 60, reps: 8 }),
    { best: { weight: 65, reps: 6 }, beatReps: null });
  assert.equal(wrapUp.getRecordHint({ weight: 80, reps: 6 }, exercise, { weight: 60, reps: 8 }), null);
  assert.equal(wrapUp.getRecordHint(null, exercise, { weight: 60, reps: 8 }), null);
});

test('Added sets start from the last performed straight set, not a drop set', () => {
  assert.equal(wrapUp.getAddSetBase(lift([set(60, 8), set(62.5, 8), set(50, 10, { type: 'dropset' })])).weight, 62.5);
  assert.equal(wrapUp.getAddSetBase(lift([set(60, 8), set(70, 8, { skipped: true })])).weight, 60);
  assert.equal(wrapUp.getAddSetBase(lift([set(70, 8, { skipped: true })])).weight, 70);
});

test('Last-time comparison totals performed sets in the exercise’s own measure', () => {
  const history = [
    session(1, '2026-09-01', [lift([set(60, 8), set(60, 8)])]),
    session(2, '2026-09-08', [lift([set(60, 8), set(60, 8), set(60, 6, { skipped: true })])]),
  ];
  assert.deepEqual(wrapUp.getLastTimeComparison(history, lift([set(60, 8), set(62.5, 8), set(60, 8)])),
    { measure: 'volume', current: 1460, previous: 960 });
  assert.deepEqual(wrapUp.getLastTimeComparison([], lift([set(60, 8)])),
    { measure: 'volume', current: 480, previous: null });
  const pullUps = { name: 'Back Squat', loadType: 'bodyweight', metric: 'reps', sets: [set(0, 10), set(0, 8)] };
  assert.deepEqual(wrapUp.getLastTimeComparison(history, pullUps), { measure: 'reps', current: 18, previous: null },
    'a load-type change is not comparable');
  const plank = { name: 'Plank', loadType: 'bodyweight', metric: 'duration', sets: [set(0, 0, { durationS: 60 }), set(0, 0, { durationS: 45 })] };
  const plankHistory = [session(3, '2026-09-08', [{ ...plank, sets: [set(0, 0, { durationS: 50 })] }])];
  assert.deepEqual(wrapUp.getLastTimeComparison(plankHistory, plank), { measure: 'duration', current: 105, previous: 50 });
});
