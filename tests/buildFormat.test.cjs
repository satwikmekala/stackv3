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
const f = load('features/build/buildFormat.ts');

test('dates: day, spoken day, weekday', () => {
  assert.equal(f.formatDay('2026-09-14'), '14 SEP');
  assert.equal(f.formatDayA11y('2026-09-14'), '14 September');
  assert.equal(f.formatWeekday('2026-09-14'), 'Mon');
  assert.equal(f.formatWeekday('2026-09-20T18:30:00'), 'Sun');
});

test('date ranges: same month, across months, across years, and the spoken form', () => {
  assert.equal(f.formatDateRange('2026-09-14', '2026-09-20'), '14–20 SEP');
  assert.equal(f.formatDateRange('2026-09-28', '2026-10-04'), '28 SEP–4 OCT');
  assert.equal(f.formatDateRange('2026-12-28', '2027-01-03'), '28 DEC–3 JAN');
  assert.equal(f.formatDateRangeA11y('2026-09-14', '2026-10-04'), '14 September to 4 October');
});

test('spelled counts: words for 0–99, digits from 100', () => {
  assert.deepEqual([0, 1, 7, 13, 20, 21, 99, 100, 104, 260].map(f.numberWord), ['zero', 'one', 'seven', 'thirteen', 'twenty', 'twenty-one', 'ninety-nine', '100', '104', '260']);
  assert.deepEqual([0, 1, 21, 104].map(f.spelledCount), ['Zero', 'One', 'Twenty-one', '104']);
});

test('pluralisation: singular, plural, zero, explicit plural', () => {
  assert.equal(f.countLabel(1, 'piece'), '1 piece');
  assert.equal(f.countLabel(3, 'piece'), '3 pieces');
  assert.equal(f.countLabel(0, 'piece'), '0 pieces');
  assert.equal(f.countLabel(2, 'PR', 'PRs'), '2 PRs');
  assert.deepEqual([1, 2].map(f.recordLabel), ['1 PR', '2 PRs']);
});

test('week accessibility label', () => {
  const week = { weekStart: '2026-09-14', weekEnd: '2026-09-20', pieces: [1, 2, 3, 4], metrics: { records: 1 } };
  assert.equal(f.weekAccessibilityLabel(week), 'Week of 14 September (14–20 SEP), 4 pieces, 1 PR');
  assert.equal(f.weekAccessibilityLabel({ ...week, pieces: [1], metrics: { records: 0 } }), 'Week of 14 September (14–20 SEP), 1 piece');
});

test('moved: session never uses tonnes, aggregate does; lb whole pounds; zero is null', () => {
  assert.equal(f.formatMovedSession(5240, 'kg'), '5,240 KG');
  assert.equal(f.formatMovedSession(840.4, 'kg'), '840 KG');
  assert.equal(f.formatMovedSession(5240, 'lbs'), '11,552 LB');
  assert.equal(f.formatMovedAggregate(5240, 'kg'), '5.2 T');
  assert.equal(f.formatMovedAggregate(138200, 'kg'), '138.2 T');
  assert.equal(f.formatMovedAggregate(999, 'kg'), '999 KG');
  assert.equal(f.formatMovedAggregate(5240, 'lbs'), '11,552 LB');
  for (const format of [f.formatMovedSession, f.formatMovedAggregate]) { assert.equal(format(0, 'kg'), null); assert.equal(format(0, 'lbs'), null); }
});

test('load × reps: trims zeros, converts lb, bodyweight', () => {
  assert.equal(f.formatLoadReps(85, 5, 'kg'), '85 kg × 5');
  assert.equal(f.formatLoadReps(47.5, 8, 'kg'), '47.5 kg × 8');
  assert.equal(f.formatLoadReps(85, 8, 'lbs'), '187.4 lbs × 8');
  assert.equal(f.formatLoadReps(0, 15, 'kg'), 'Bodyweight × 15');
});

test('category: split, merged split, muscle-group fallback, label fallback', () => {
  assert.equal(f.pieceCategory({ archetype: 'push', secondaryArchetype: null, workoutTypes: [] }, 'x'), 'Push');
  assert.equal(f.pieceCategory({ archetype: 'push', secondaryArchetype: 'legs', workoutTypes: [] }, 'x'), 'Push + Legs');
  assert.equal(f.pieceCategory({ archetype: null, secondaryArchetype: null, workoutTypes: ['chest', 'back'] }, 'x'), 'Chest');
  assert.equal(f.pieceCategory({ archetype: null, secondaryArchetype: null, workoutTypes: [] }, 'Workout'), 'Workout');
  assert.equal(f.pieceCategory(undefined, 'Workout'), 'Workout');
});
