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
  assert.ok(!/workoutStore|workoutDatabase/.test(resolved), 'Shared history must not load the native store or database');
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
const { buildCounts } = load('features/build/buildCounts.ts');
const { createBuildHistoryCache } = load('features/build/buildHistoryCache.ts');
const { adaptBuildHistory } = load('features/build/adapter.ts');
const { makeMonolithDemo, MONOLITH_DEMO_NOW } = load('features/build/monolithDemo.ts');
const { EVIDENCE_DEMO_SESSIONS, EVIDENCE_DEMO_NOW } = load('features/build/evidenceDemo.ts');
const { getStartOfWeek, toLocalCalendarDate } = load('store/workoutCalendar.ts');

const weekOf = (date) => toLocalCalendarDate(getStartOfWeek(date));
/** The Home card's numbers as the evidence engine derives them. */
function derivedCounts(sessions, now) {
  const { state } = adaptBuildHistory(sessions, now);
  return { weeksBuilt: state.sealedWeeks.filter((week) => week.pieces.length > 0).length, piecesThisWeek: state.currentWeek.pieces.length, hasHistory: state.metrics.workouts > 0 };
}
const countsOnly = ({ weeksBuilt, piecesThisWeek, hasHistory }) => ({ weeksBuilt, piecesThisWeek, hasHistory });
const agree = (sessions, now, label) => assert.deepEqual(countsOnly(buildCounts(sessions, weekOf(now))), derivedCounts(sessions, now), label);
const session = (id, date, extra = {}) => ({
  id, date, completed: true, retroactive: false, archetype: null, secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null,
  workoutTypes: ['chest'], exercises: [{ name: 'Bench Press', loadType: 'external_weight', sets: [{ weight: 60, reps: 8, completed: true }] }], ...extra,
});

test('count selector matches the derivation on the 12-, 104- and 260-week fixtures', () => {
  for (const weeks of [0, 1, 12, 104, 260]) {
    const sessions = makeMonolithDemo(weeks);
    agree(sessions, MONOLITH_DEMO_NOW, `${weeks} weeks`);
  }
  const long = buildCounts(makeMonolithDemo(260), weekOf(MONOLITH_DEMO_NOW));
  assert.ok(long.weeksBuilt > 200 && long.piecesThisWeek === 2 && long.hasHistory);
  agree(EVIDENCE_DEMO_SESSIONS, EVIDENCE_DEMO_NOW, 'evidence demo');
});

test('count selector matches the derivation on edge cases', () => {
  const now = new Date(2026, 8, 23, 12); // Wednesday; week starts Monday 21 Sep
  const cases = {
    'no sessions': [],
    'current week only': [session('a', '2026-09-21'), session('b', '2026-09-23')],
    'sealed weeks only, this week open': [session('a', '2026-09-07'), session('b', '2026-09-14'), session('c', '2026-09-15')],
    'retroactive and incomplete sessions are not pieces': [session('a', '2026-09-14', { retroactive: true }), session('b', '2026-09-22', { completed: false }), session('c', '2026-09-08')],
    'identical duplicate IDs count once': [session('a', '2026-09-14'), session('a', '2026-09-14'), session('b', '2026-09-22'), session('b', '2026-09-22')],
    'invalid and impossible dates are ignored': [session('a', 'not a date'), session('b', '2026-02-30'), session('c', '2026-09-22')],
    'future weeks are ignored': [session('a', '2026-09-28'), session('b', '2027-01-04'), session('c', '2026-09-22')],
    'Sunday night vs Monday morning boundary': [session('a', '2026-09-20'), session('b', '2026-09-21'), session('c', new Date(2026, 8, 20, 23, 30).toISOString()), session('d', new Date(2026, 8, 21, 0, 10).toISOString())],
    'ISO timestamps as saved by the store': [session('a', new Date(2026, 8, 1, 18).toISOString()), session('b', new Date(2026, 8, 22, 7).toISOString())],
    'a quiet week between built weeks': [session('a', '2026-08-31'), session('b', '2026-09-14')],
  };
  for (const [label, sessions] of Object.entries(cases)) agree(sessions, now, label);
  assert.deepEqual(buildCounts([], weekOf(now)), { weeksBuilt: 0, piecesThisWeek: 0, hasHistory: false, sealedWeekStarts: [] });
});

test('shared history cache derives once per sessions array and week', () => {
  let derivations = 0;
  const shared = createBuildHistoryCache((sessions, now) => { derivations++; return adaptBuildHistory(sessions, now); });
  const sessions = makeMonolithDemo(12);
  const week = weekOf(MONOLITH_DEMO_NOW);
  assert.equal(shared.peek(sessions, week), null, 'peek never derives');
  assert.equal(derivations, 0);
  const first = shared.get(sessions, week);
  assert.equal(shared.get(sessions, week), first, 'every reader gets the same result');
  assert.equal(shared.peek(sessions, week), first);
  assert.equal(derivations, 1);
  const copy = [...sessions];
  assert.notEqual(shared.get(copy, week), first, 'a new sessions array recomputes');
  assert.equal(derivations, 2);
  shared.get(copy, week); shared.get(copy, week);
  assert.equal(derivations, 2);
  const nextWeek = toLocalCalendarDate(new Date(2026, 8, 28));
  shared.get(copy, nextWeek);
  assert.equal(derivations, 3, 'a new week recomputes');
  assert.equal(shared.peek(copy, week), null, 'an older key is not served');
  assert.deepEqual(shared.get(copy, week).state, adaptBuildHistory(copy, MONOLITH_DEMO_NOW).state, 'same output as a direct derivation');
});
