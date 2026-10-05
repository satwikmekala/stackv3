/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function evaluate(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, (id) => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected dependency: ${id}`);
  });
  return exports;
}
const dates = evaluate('store/workoutCalendar.ts');
const units = evaluate('store/weightUnits.ts');
const verified = evaluate('store/verifiedSessions.ts');
const measurements = evaluate('store/exerciseMeasurement.ts');
const progress = evaluate('store/liftProgress.ts', {
  '@/store/verifiedSessions': verified, '@/store/workoutCalendar': dates,
  '@/store/weightUnits': units, '@/store/exerciseMeasurement': measurements,
});
const set = (weight, reps, extra = {}) => ({ weight, reps, completed: true, ...extra });
const exercise = (name, sets, extra = {}) => ({ name, sets, loadType: 'external_weight', ...extra });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false, ...extra });

 test('only performed valid weight/rep evidence enters progress', () => {
  const list = progress.deriveLiftProgress([
    session(1, '2026-09-20', [exercise('Bench', [set(60, 8), set(999, 1, { skipped: true }), set(888, 1, { completed: false }),
      set(NaN, 5), set(-1, 5), set(777, 0), set(666, Infinity)]),
      exercise('Only skipped', [set(100, 8, { skipped: true })]),
      exercise('Only unlogged', [set(100, 8, { completed: false })]),
      exercise('Invalid hold', [set(100, 0, { durationS: 0 })], { metric: 'duration' })]),
    session(2, '2026-09-21', [exercise('Bench', [set(300, 8)])], { retroactive: true }),
    session(3, '2026-09-22', [exercise('Bench', [set(400, 8)])], { completed: false }),
    session(4, 'bad-date', [exercise('Invalid date', [set(500, 8)])]),
  ]);
  assert.deepEqual(list.map((lift) => lift.name), ['Bench']);
  assert.deepEqual([list[0].latest.weight, list[0].latest.reps], [60, 8]);
  assert.equal(list[0].previous, null);
  assert.equal(progress.liftComparisonCopy(list[0], 'kg'), '');
});

test('declines and rep improvements retain actual latest and previous performance', () => {
  const history = [
    session(1, '2026-09-01', [exercise('Bench', [set(60, 8)])]),
    session(2, '2026-09-10', [exercise('Bench', [set(70, 6)])]),
    session(3, '2026-09-20', [exercise('Bench', [set(50, 10)])]),
  ];
  const snapshot = JSON.stringify(history);
  const lift = progress.deriveLiftProgress(history)[0];
  assert.equal(lift.latest.weight, 50);
  assert.equal(lift.previous.weight, 70);
  assert.equal(lift.history.length, 3);
  assert.equal(JSON.stringify(history), snapshot);
  assert.equal(progress.formatLiftPerformance(lift.latest, 'kg'), '50 kg × 10');
  assert.equal(progress.liftComparisonCopy(lift, 'kg'), 'Previous: 70 kg × 6');
  const reps = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Press', [set(25, 8)])]),
    session(2, '2026-09-08', [exercise('Press', [set(25, 10)])]),
  ])[0];
  assert.equal(progress.formatLiftPerformance(reps.latest, 'kg'), '25 kg × 10');
  assert.equal(progress.formatLiftPerformance(reps.previous, 'kg'), '25 kg × 8');
});

test('one top set per session ranks load, then reps; duplicate exercise blocks combine', () => {
  const lift = progress.deriveLiftProgress([
    session(9, '2026-09-20', [exercise('Bench', [set(50, 12), set(60, 5), set(60, 8)]), exercise('Bench', [set(60, 9)])]),
    session(10, '2026-09-20', [exercise('Bench', [set(55, 8)])]),
  ])[0];
  assert.equal(lift.history.length, 2);
  assert.equal(lift.latest.sessionId, '10');
  assert.deepEqual([lift.previous.weight, lift.previous.reps], [60, 9]);
});

test('bodyweight lifts compare reps without invented zero-weight progress or unit changes', () => {
  const lift = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Pull-up', [set(0, 8)], { loadType: 'bodyweight' })]),
    session(2, '2026-09-08', [exercise('Pull-up', [set(0, 10), set(0, 12)], { loadType: 'bodyweight' })]),
  ])[0];
  assert.equal(progress.formatLiftPerformance(lift.latest, 'lbs'), "Bodyweight × 12");
  assert.equal(progress.liftComparisonCopy(lift, 'kg'), "Previous: Bodyweight × 8");
  assert.equal(progress.formatLiftPerformance({ ...lift.latest, weight: 10, bodyweight: false }, 'lbs'), "22 lb × 12");
  const changed = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Pull-up', [set(0, 8)], { loadType: 'bodyweight' })]),
    session(2, '2026-09-08', [exercise('Pull-up', [set(10, 8)])]),
  ])[0];
  assert.equal(changed.previous, null);
});

test('timed progress uses valid elapsed time without invented reps or weight units', () => {
  const lift = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Plank', [set(0, 0, { durationS: 45 })], { loadType: 'bodyweight', metric: 'duration' })]),
    session(2, '2026-09-08', [exercise('Plank', [
      set(0, 0, { durationS: 65 }), set(0, 0, { durationS: 125 }),
      set(0, 0, { durationS: 999, skipped: true }), set(0, 0, { durationS: 888, sourceKind: 'warmup' }),
      set(0, 0, { durationS: Infinity }), set(0, 0, { durationS: 6000 }),
    ], { loadType: 'bodyweight', metric: 'duration' })]),
  ])[0];
  assert.equal(lift.latest.durationS, 125);
  assert.equal(lift.latest.reps, 0);
  assert.equal(progress.formatLiftPerformance(lift.latest, 'lbs'), 'Bodyweight · 2:05');
  assert.equal(progress.liftComparisonCopy(lift, 'kg'), 'Previous: Bodyweight · 0:45');
});

test('loaded timed sets rank load then duration and compare only the same measurement', () => {
  const lift = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Carry', [set(20, 0, { durationS: 30 })], { metric: 'duration' })]),
    session(2, '2026-09-05', [exercise('Carry', [set(25, 10)])]),
    session(3, '2026-09-08', [exercise('Carry', [set(20, 0, { durationS: 90 }),
      set(30, 0, { durationS: 40 }), set(30, 0, { durationS: 45 })], { metric: 'duration' }),
      exercise('Carry', [set(30, 0, { durationS: 50 })], { metric: 'duration' })]),
  ])[0];
  assert.equal(lift.latest.weight, 30);
  assert.equal(lift.latest.durationS, 50);
  assert.equal(lift.previous.sessionId, '1');
  assert.equal(progress.formatLiftPerformance(lift.latest, 'kg'), '30 kg · 0:50');
  assert.equal(progress.formatLiftPerformance(lift.latest, 'lbs'), '66.1 lb · 0:50');
});

test('defaults prefer frequent comparable exercises, then remain stable as others develop', () => {
  const history = [
    session(1, '2026-09-01', [exercise('Bench', [set(60, 8)]), exercise('Press', [set(25, 8)])]),
    session(2, '2026-09-08', [exercise('Bench', [set(60, 8)]), exercise('Press', [set(25, 8)])]),
  ];
  const initial = progress.deriveLiftProgress(history);
  const chosen = progress.defaultWatchedLifts(initial);
  assert.deepEqual(chosen, ['Bench', 'Press']);
  const updated = progress.deriveLiftProgress([...history,
    ...[3, 4, 5].map((id) => session(id, `2026-09-${10 + id}`, [exercise('New lift', [set(id * 10, 8)])])),
  ]);
  assert.deepEqual(progress.resolveWatchedLifts(updated, chosen, true), chosen);
  assert.deepEqual(progress.resolveWatchedLifts(updated, ['Press'], false), ['Press']);
  assert.deepEqual(progress.resolveWatchedLifts(updated, [], false), []);
  assert.deepEqual(progress.resolveWatchedLifts(initial, ['Removed', 'Bench'], true), ['Bench', 'Press']);
  assert.deepEqual(progress.defaultWatchedLifts(initial.slice(0, 1)), ['Bench']);
  assert.deepEqual(progress.deriveLiftProgress([]), []);
});

test('sorts recent workouts and training frequency with stable ties without mutating history', () => {
  const lifts = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Bench', [set(40, 8)]), exercise('Press', [set(20, 8)])]),
    session(2, '2026-09-08', [exercise('Bench', [set(40, 8)]), exercise('Press', [set(20, 8)])]),
    session(3, '2026-09-15', [exercise('Bench', [set(40, 8)])]),
    session(4, '2026-09-22', [exercise('Curl', [set(10, 8)]), exercise('Dip', [set(0, 10)], { loadType: 'bodyweight' })]),
  ]);
  const snapshot = JSON.stringify(lifts);
  const names = sort => progress.sortLiftProgress(lifts, sort).map(lift => lift.name);
  assert.deepEqual(names('recent'), ['Curl', 'Dip', 'Bench', 'Press']);
  assert.deepEqual(names('trained'), ['Bench', 'Press', 'Curl', 'Dip']);
  assert.deepEqual(JSON.stringify(lifts), snapshot);
  assert.deepEqual(progress.sortLiftProgress([], 'improved'), []);
});

test('most improved ranks relative changes in each lift, including reps, holds, declines and missing comparisons', () => {
  const lifts = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Heavy lift', [set(100, 8)]), exercise('Small lift', [set(10, 8)]),
      exercise('Dip', [set(0, 8)], { loadType: 'bodyweight' }),
      exercise('Plank', [set(0, 0, { durationS: 30 })], { loadType: 'bodyweight', metric: 'duration' }),
      exercise('Decline', [set(40, 8)]), exercise('Unchanged', [set(20, 8)])]),
    session(2, '2026-09-08', [exercise('Heavy lift', [set(110, 8)]), exercise('Small lift', [set(12, 8)]),
      exercise('Dip', [set(0, 12)], { loadType: 'bodyweight' }),
      exercise('Plank', [set(0, 0, { durationS: 60 })], { loadType: 'bodyweight', metric: 'duration' }),
      exercise('Decline', [set(30, 8)]), exercise('Unchanged', [set(20, 8)])]),
    session(3, '2026-09-22', [exercise('New lift', [set(200, 8)])]),
  ]);
  assert.deepEqual(progress.sortLiftProgress(lifts, 'improved').map(lift => lift.name),
    ['Plank', 'Dip', 'Small lift', 'Heavy lift', 'Unchanged', 'Decline', 'New lift']);
  assert.equal(progress.liftImprovementCopy(lifts.find(lift => lift.name === 'Dip')), 'Reps +50% vs previous workout');
  assert.equal(progress.liftImprovementCopy(lifts.find(lift => lift.name === 'Plank')), 'Time +100% vs previous workout');
  assert.equal(progress.liftImprovementCopy(lifts.find(lift => lift.name === 'Decline')), 'Estimated strength −25% vs previous workout');
  assert.equal(progress.liftImprovementCopy(lifts.find(lift => lift.name === 'New lift')), 'No comparable previous workout yet');
});

test('weighted rep comparisons account for fewer reps rather than treating any load increase as improvement', () => {
  const lifts = progress.deriveLiftProgress([
    session(1, '2026-09-01', [exercise('Bench', [set(60, 10)]), exercise('Press', [set(20, 8)])]),
    session(2, '2026-09-08', [exercise('Bench', [set(65, 3)]), exercise('Press', [set(20, 10)])]),
  ]);
  const bench = lifts.find(lift => lift.name === 'Bench');
  const press = lifts.find(lift => lift.name === 'Press');
  assert.ok(progress.liftImprovement(bench).change < 0);
  assert.ok(progress.liftImprovement(press).change > 0);
  assert.deepEqual(progress.sortLiftProgress(lifts, 'improved').map(lift => lift.name), ['Press', 'Bench']);
  const zeroBaseline = { ...bench, previous: { ...bench.previous, weight: 0 } };
  assert.equal(progress.liftImprovement(zeroBaseline), null);
});

test('weighted holds compare time at the same load or load at the same time, never inventing a mixed improvement', () => {
  const lifts = progress.deriveLiftProgress([
    session(1, '2026-09-01', ['Time', 'Load', 'Mixed'].map(name => exercise(name, [set(20, 0, { durationS: 30 })], { metric: 'duration' }))),
    session(2, '2026-09-08', [exercise('Time', [set(20, 0, { durationS: 45 })], { metric: 'duration' }),
      exercise('Load', [set(30, 0, { durationS: 30 })], { metric: 'duration' }),
      exercise('Mixed', [set(30, 0, { durationS: 20 })], { metric: 'duration' })]),
  ]);
  assert.deepEqual(progress.liftImprovement(lifts.find(lift => lift.name === 'Time')), { change: 0.5, label: 'Time' });
  assert.deepEqual(progress.liftImprovement(lifts.find(lift => lift.name === 'Load')), { change: 0.5, label: 'Load' });
  assert.equal(progress.liftImprovement(lifts.find(lift => lift.name === 'Mixed')), null);
  const mixedMetric = { ...lifts[0], previous: { ...lifts[0].previous, durationS: undefined } };
  assert.equal(progress.liftImprovement(mixedMetric), null);
});

test('sorting chips reorder the screen while search and featured selections remain intact', () => {
  const sessions = [
    session(1, '2026-09-01', [exercise('Bench', [set(40, 8)]), exercise('Dip', [set(0, 8)], { loadType: 'bodyweight' })]),
    session(2, '2026-09-08', [exercise('Bench', [set(42, 8)]), exercise('Dip', [set(0, 12)], { loadType: 'bodyweight' })]),
    session(3, '2026-09-22', [exercise('New', [set(20, 8)])]),
  ];
  const states = [];
  let cursor = 0;
  const state = { sessions, profile: { weightUnit: 'kg' }, getExerciseWorkoutType: () => null };
  const Screen = evaluate('app/lift-progress.tsx', {
    react: { useMemo: callback => callback(), useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { FlatList: 'FlatList', Platform: { OS: 'web' }, Pressable: 'Pressable', Text: 'Text',
      TextInput: 'TextInput', View: 'View', StyleSheet: { create: value => value, hairlineWidth: 1 } },
    'expo-router': { Stack: { Screen: 'Stack.Screen' }, useLocalSearchParams: () => ({ choose: '1' }), useRouter: () => ({ back() {} }) },
    'lucide-react-native': { Check: 'Check', ChevronRight: 'ChevronRight', Search: 'Search' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/constants/exerciseNames': { displayExerciseName: name => name },
    '@/constants/muscleColors': { getMuscleColor: () => '#fff' },
    '@/store/muscleColors': { useMuscleColors() {} },
    '@/services/haptics': {},
    '@/constants/theme': evaluate('constants/theme.ts'),
    '@/store/workoutStore': { useWorkoutStore: selector => selector(state) },
    '@/store/workoutDatabase': { DEFAULT_WEIGHT_UNIT: 'kg' },
    '@/store/liftProgress': progress,
    '@/store/liftProgressPreferences': { loadLiftProgressPreferences() {}, saveWatchedLifts: async () => true },
    '@/hooks/useWatchedLifts': { useWatchedLifts: () => ({ names: ['Bench'], preferences: { hydrated: true, saving: false, error: null } }) },
  }).default;
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean) ?? null;
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  const render = () => { cursor = 0; return find(Screen(), node => node.type === 'FlatList'); };
  const chip = (list, label) => find(list.props.ListHeaderComponent, node => node.props?.accessibilityLabel === label);
  let list = render();
  assert.deepEqual(list.props.data.map(lift => lift.name), ['New', 'Bench', 'Dip']);
  assert.equal(chip(list, 'Most recent').props.accessibilityState.checked, true);
  chip(list, 'Most improved').props.onPress();
  list = render();
  assert.deepEqual(list.props.data.map(lift => lift.name), ['Dip', 'Bench', 'New']);
  list.props.renderItem({ item: list.props.data[0] }).props.onPress();
  chip(list, 'Most trained').props.onPress();
  list = render();
  assert.deepEqual(list.props.data.map(lift => lift.name), ['Bench', 'Dip', 'New']);
  find(list.props.ListHeaderComponent, node => node.type === 'TextInput').props.onChangeText('dip');
  list = render();
  assert.deepEqual(list.props.data.map(lift => lift.name), ['Dip']);
  assert.equal(list.props.renderItem({ item: list.props.data[0] }).props.accessibilityState.checked, true);
  chip(list, 'Most recent').props.onPress();
  list = render();
  assert.deepEqual(list.props.data.map(lift => lift.name), ['Dip']);
  assert.equal(chip(list, 'Most recent').props.accessibilityState.checked, true);
  assert.equal(chip(list, 'Most improved').props.accessibilityState.checked, false);
  assert.equal(list.props.renderItem({ item: list.props.data[0] }).props.accessibilityState.checked, true);
});

function preferencesFixture() {
  let stored = null, readFails = false, writeFails = false;
  const storage = {
    async getItem() { if (readFails) throw new Error('unavailable'); return stored; },
    async setItem(_key, value) { if (writeFails) throw new Error('unavailable'); stored = value; },
    async removeItem() { stored = null; },
  };
  const prefs = evaluate('store/liftProgressPreferences.ts', { zustand: require('zustand'), '@react-native-async-storage/async-storage': storage });
  return { prefs, get stored() { return stored; }, set stored(value) { stored = value; },
    failRead(value) { readFails = value; }, failWrite(value) { writeFails = value; } };
}

test('featured choices persist, reload, deduplicate, cap at two, and clear on reset', async () => {
  const f = preferencesFixture();
  await f.prefs.loadLiftProgressPreferences();
  assert.equal(await f.prefs.saveWatchedLifts(['Bench', 'Bench', 'Press', 'Curl']), true);
  assert.deepEqual(JSON.parse(f.stored), { names: ['Bench', 'Press'], automatic: false });
  f.prefs.useLiftProgressPreferences.setState({ names: null, hydrated: false });
  await f.prefs.loadLiftProgressPreferences();
  assert.deepEqual(f.prefs.useLiftProgressPreferences.getState().names, ['Bench', 'Press']);
  await f.prefs.clearLiftProgressPreferences();
  assert.equal(f.stored, null);
  assert.equal(f.prefs.useLiftProgressPreferences.getState().automatic, true);
});

test('failed saves retain the committed selection and can be retried', async () => {
  const f = preferencesFixture();
  await f.prefs.loadLiftProgressPreferences();
  await f.prefs.saveWatchedLifts(['Bench'], true);
  f.failWrite(true);
  assert.equal(await f.prefs.saveWatchedLifts(['Press']), false);
  assert.deepEqual(f.prefs.useLiftProgressPreferences.getState().names, ['Bench']);
  assert.equal(f.prefs.useLiftProgressPreferences.getState().error, 'save');
  assert.equal(f.prefs.useLiftProgressPreferences.getState().saving, false);
  f.failWrite(false);
  assert.equal(await f.prefs.saveWatchedLifts(['Press']), true);
  assert.equal(f.prefs.useLiftProgressPreferences.getState().error, null);
});

test('failed preference reads block writes until recovery instead of overwriting saved choices', async () => {
  const f = preferencesFixture();
  f.stored = JSON.stringify({ names: ['Bench'], automatic: false });
  f.failRead(true);
  await f.prefs.loadLiftProgressPreferences();
  assert.equal(f.prefs.useLiftProgressPreferences.getState().error, 'load');
  assert.equal(await f.prefs.saveWatchedLifts(['Press']), false);
  assert.deepEqual(JSON.parse(f.stored).names, ['Bench']);
  f.failRead(false);
  await f.prefs.loadLiftProgressPreferences();
  assert.deepEqual(f.prefs.useLiftProgressPreferences.getState().names, ['Bench']);
});

test('reset waits for an in-flight save so old choices cannot reappear', async () => {
  let release, stored = null;
  const gate = new Promise((resolve) => { release = resolve; });
  const storage = {
    async getItem() { return stored; },
    async setItem(_key, value) { await gate; stored = value; },
    async removeItem() { stored = null; },
  };
  const prefs = evaluate('store/liftProgressPreferences.ts', { zustand: require('zustand'), '@react-native-async-storage/async-storage': storage });
  await prefs.loadLiftProgressPreferences();
  const saving = prefs.saveWatchedLifts(['Bench']);
  const resetting = prefs.clearLiftProgressPreferences();
  release();
  await Promise.all([saving, resetting]);
  assert.equal(stored, null);
  assert.equal(prefs.useLiftProgressPreferences.getState().names, null);
  assert.equal(prefs.useLiftProgressPreferences.getState().automatic, true);
});
