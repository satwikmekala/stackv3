const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loader(mocks = {}) {
  const cache = new Map();
  function load(id, parent = root) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(parent, id);
    if (!id.startsWith('@/') && !id.startsWith('.')) return require(id);
    const file = base.endsWith('.ts') ? base : `${base}.ts`;
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('exports', 'require', code)(exports, (child) => load(child, path.dirname(file)));
    return exports;
  }
  return load;
}
const load = loader();
const { deriveWorkoutLiveActivityState: derive } = load('@/services/liveActivity/state');
const { compactExerciseName } = load('@/services/liveActivity/compactExerciseName');
const { createWorkoutLiveActivityCoordinator: create } = load('@/services/liveActivity/coordinator');
const { formatWeight } = load('@/store/weightUnits');
const { getCurrentWorkoutExerciseIndex, getActiveSetIndex } = load('@/utils/workoutResume');

function source() {
  return {
    currentSession: {
      id: '42', completed: false,
      exercises: [
        { name: 'Bench Press', loadType: 'external_weight', sets: [
          { weight: 75, reps: 8, completed: true },
          { weight: 80, reps: 8 },
          { weight: 82.5, reps: 7 },
          { weight: 85, reps: 6 },
        ] },
        { name: 'Incline Dumbbell Press', loadType: 'external_weight', sets: [
          { weight: 25, reps: 10 }, { weight: 27.5, reps: 8 }, { weight: 30, reps: 6 },
        ] },
      ],
    },
    profile: { weightUnit: 'kg' },
    workoutFocus: { workoutId: '42', exerciseIndex: 0 },
  };
}
function fakeFactory(initial = []) {
  const events = [];
  const instances = [];
  let sequence = 0;
  const add = (id) => {
    const instance = {
      getId: () => id,
      update: async (state) => { events.push(['update', id, state]); },
      end: async (policy) => { events.push(['end', id, policy]); instances.splice(instances.indexOf(instance), 1); },
    };
    instances.push(instance);
    return instance;
  };
  initial.forEach(add);
  return {
    events, instances, add,
    getInstances: () => [...instances],
    start: (state) => {
      const instance = add(`new-${++sequence}`);
      events.push(['start', instance.getId(), state]);
      return instance;
    },
  };
}
function setup(initial = []) {
  const factory = fakeFactory(initial);
  const errors = [];
  const coordinator = create({ factory, endTestActivities: async () => {}, onError: (error) => errors.push(error) });
  return { factory, errors, coordinator };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('payload uses current committed set values, identity, and shared weight formatting', () => {
  const state = source();
  assert.deepEqual(derive(state), {
    workoutId: '42', exerciseId: 'Bench Press', exerciseName: 'Bench Press', compactName: 'Bench',
    setNumber: 2, totalSets: 4, weight: '80', reps: 8, unit: 'kg',
  });
  state.profile.weightUnit = 'lbs';
  assert.equal(derive(state).weight, formatWeight(80, 'lbs'));
  assert.equal(derive(state).unit, 'lbs');
  state.currentSession.exercises[0].sets[1].weight = 0;
  assert.equal(derive(state).weight, '0');
});

test('selected exercise overrides first incomplete; skipped/completed sets follow screen logic', () => {
  const state = source();
  state.workoutFocus.exerciseIndex = 1;
  assert.equal(derive(state).compactName, 'Incline');
  assert.equal(derive(state).setNumber, 1);
  state.currentSession.exercises[1].sets[0].completed = true;
  state.currentSession.exercises[1].sets[0].skipped = true;
  const payload = derive(state);
  assert.equal(payload.setNumber, 2);
  assert.equal(payload.weight, '27.5');
  assert.equal(getActiveSetIndex(state.currentSession.exercises[1]) + 1, payload.setNumber);
});

test('restart and mismatched session focus use the existing resume rule', () => {
  const state = source();
  state.currentSession.exercises[0].sets.forEach((set) => { set.completed = true; });
  state.workoutFocus = null;
  assert.equal(derive(state).exerciseName, 'Incline Dumbbell Press');
  state.workoutFocus = { workoutId: 'older-session', exerciseIndex: 0 };
  assert.equal(getCurrentWorkoutExerciseIndex(state.currentSession, state.workoutFocus), 1);
});

test('all sets completed keeps the last set until the session is genuinely finished', () => {
  const state = source();
  state.currentSession.exercises[0].sets.forEach((set) => { set.completed = true; });
  assert.equal(derive(state).setNumber, 4);
  assert.equal(derive(state).exerciseName, 'Bench Press');
  state.currentSession.completed = true;
  assert.equal(derive(state), null);
  state.currentSession = null;
  assert.equal(derive(state), null);
});

test('empty/missing/bodyweight values are not fabricated from targets or zeroes', () => {
  const state = source();
  state.currentSession.exercises[0].loadType = 'bodyweight';
  assert.equal(derive(state).weight, '—');
  assert.equal(derive(state).unit, '');
  state.currentSession.exercises[0].loadType = 'external_weight';
  state.currentSession.exercises[0].sets[1] = { targetWeight: 999, targetReps: 99 };
  assert.equal(derive(state).weight, '—');
  assert.equal(derive(state).reps, '—');
  state.currentSession.exercises = [];
  assert.equal(derive(state), null);
});

test('compact mappings and Unicode-safe fallback never mutate the full name', () => {
  const expected = {
    'Barbell Squat': 'Squat', 'Bench Press': 'Bench', 'Barbell Bicep Curl': 'Curl',
    'Barbell Hip Thrust': 'Hip Thrust', 'Incline Dumbbell Press': 'Incline',
    'Lat Pulldown': 'Pulldown', 'Leg Extension': 'Leg Ext.', 'Leg Press': 'Leg Press',
    'Lying Leg Curl': 'Leg Curl', 'Pull-Ups': 'Pull-Ups',
    'Seated Dumbbell Shoulder Press': 'Shoulder Press', 'Cable Chest Fly': 'Chest Fly',
    'Cable Overhead Triceps Extension': 'Tri Ext.', 'Standing Calf Raise': 'Calf Raise',
    'Chest Dips': 'Dips', Deadlift: 'Deadlift', 'Dumbbell Lateral Raise': 'Lateral Raise',
    'Single-Arm Dumbbell Lateral Raise': 'Lateral Raise',
  };
  for (const [name, short] of Object.entries(expected)) assert.equal(compactExerciseName(name), short);
  assert.equal(compactExerciseName('  BENCH   PRESS '), 'Bench');
  assert.equal(compactExerciseName('   '), 'Exercise');
  const name = 'Dumbbell Some Extremely Long Custom Exercise';
  assert.equal(Array.from(compactExerciseName(name)).length <= 14, true);
  assert.equal(compactExerciseName('😀'.repeat(20)), '😀'.repeat(13) + '…');
  const state = source();
  state.currentSession.exercises[0].name = name;
  assert.equal(derive(state).exerciseName, name);
});

test('one start, identical payloads skipped, relevant changes update once', async () => {
  const { coordinator, factory } = setup();
  const state = derive(source());
  await coordinator.sync(state, true);
  await coordinator.sync({ ...state }, true);
  await coordinator.sync({ ...state, reps: 9 }, true);
  assert.deepEqual(factory.events.map((event) => event[0]), ['start', 'update']);
  assert.equal(factory.instances.length, 1);
});

test('recovery adopts one existing activity, removes duplicates, refreshes once', async () => {
  const { coordinator, factory } = setup(['existing-a', 'existing-b']);
  const state = derive(source());
  await coordinator.sync(state, true, true);
  await coordinator.sync(state, true, true);
  assert.deepEqual(factory.events.map((event) => event.slice(0, 2)), [['end', 'existing-b'], ['update', 'existing-a']]);
  assert.equal(factory.instances.length, 1);
});

test('finish/cancel and startup without a workout remove all stale real activities', async () => {
  const { coordinator, factory } = setup(['stale-a', 'stale-b']);
  await coordinator.sync(null, true);
  assert.equal(factory.instances.length, 0);
  await coordinator.sync(derive(source()), true);
  await coordinator.sync(null, false);
  assert.equal(factory.instances.length, 0);
});

test('same-event progression coalesces and cancellation during an update ends last', async () => {
  const { coordinator, factory } = setup();
  const payload = derive(source());
  const first = coordinator.sync(payload, true);
  coordinator.sync({ ...payload, setNumber: 3, weight: '82.5' }, true);
  await first;
  assert.equal(factory.events[0][2].setNumber, 3);
  let release;
  factory.instances[0].update = (state) => {
    factory.events.push(['update', 'held', state]);
    return new Promise((resolve) => { release = resolve; });
  };
  const update = coordinator.sync({ ...payload, reps: 9 }, true);
  await tick();
  coordinator.sync({ ...payload, reps: 10 }, true);
  coordinator.sync(null, true);
  release();
  await update;
  assert.deepEqual(factory.events.map((event) => event[0]), ['start', 'update', 'end']);
  assert.equal(factory.instances.length, 0);
});

test('cancel while fake-activity cleanup is pending never starts an obsolete workout', async () => {
  const factory = fakeFactory();
  let release;
  const coordinator = create({ factory, endTestActivities: () => new Promise((resolve) => { release = resolve; }), onError: assert.fail });
  const task = coordinator.sync(derive(source()), true);
  await tick();
  coordinator.sync(null, true);
  release();
  await task;
  assert.equal(factory.events.length, 0);
});

test('background never starts; foreground recovers missing or dismissed activity', async () => {
  const { coordinator, factory } = setup();
  const payload = derive(source());
  await coordinator.sync(payload, false);
  assert.equal(factory.events.length, 0);
  await coordinator.sync(payload, true, true);
  await coordinator.sync({ ...payload, reps: 10 }, false);
  assert.deepEqual(factory.events.map((event) => event[0]), ['start', 'update']);
  factory.instances.length = 0;
  await coordinator.sync(payload, true, true);
  assert.equal(factory.instances.length, 1);
});

test('native failure is isolated and retried on foreground without duplicate starts', async () => {
  const { coordinator, factory, errors } = setup(['existing']);
  const payload = derive(source());
  const instance = factory.instances[0];
  const update = instance.update;
  instance.update = async () => { throw new Error('native unavailable'); };
  await coordinator.sync(payload, true);
  assert.equal(errors.length, 1);
  instance.update = update;
  await coordinator.sync(payload, true, true);
  assert.deepEqual(factory.events.map((event) => event[0]), ['update']);
  assert.equal(factory.instances.length, 1);
});

test('root observer waits for successful hydration and recovers on app foreground', async () => {
  const { createStore } = require('zustand/vanilla');
  const store = createStore(() => ({ ...source(), isHydrated: false, hydrationError: null }));
  const factory = fakeFactory(['existing']);
  const fake = fakeFactory(['test']);
  const listeners = new Set();
  const AppState = { currentState: 'active', addEventListener: (_event, fn) => {
    listeners.add(fn); return { remove: () => listeners.delete(fn) };
  } };
  const runtime = loader({
    'react-native': { AppState, Platform: { Version: '26.3' } },
    expo: { requireOptionalNativeModule: () => ({}) },
    '@/store/workoutStore': { useWorkoutStore: store },
    '@/store/workoutDatabase': {},
    './factories.ios': { workoutActivity: factory, testActivity: fake },
  })('@/services/liveActivity/sync.ios');
  const stop = runtime.startWorkoutLiveActivitySync();
  await tick();
  assert.equal(factory.events.length, 0);
  store.setState({ hydrationError: 'database unavailable', isHydrated: true });
  await tick();
  assert.equal(factory.events.length, 0);
  store.setState({ hydrationError: null });
  await tick();
  assert.equal(fake.instances.length, 0);
  assert.deepEqual(factory.events.map((event) => event[0]), ['update']);
  store.setState({ unrelated: 'render noise' });
  await tick();
  assert.equal(factory.events.length, 1);
  factory.instances.length = 0;
  for (const listener of listeners) listener('active');
  await tick();
  assert.equal(factory.instances.length, 1);
  stop();
  assert.equal(listeners.size, 0);
  assert.equal(factory.instances.length, 1);
});

test('native inbox/readback failures are contained and trigger authoritative reconciliation', () => {
  const { createLiveActivityActionBridge } = load('@/services/liveActivity/actions');
  const errors = [];
  let reconciled = 0;
  const drain = createLiveActivityActionBridge({
    isReady: () => true,
    isCurrentActivity: () => true,
    takePending: () => { throw Error('native unavailable'); },
    apply: () => assert.fail('must not mutate'),
    onApplied: () => assert.fail('must not navigate'),
    reconcile: () => { reconciled++; },
    onError: (error) => errors.push(error),
  });
  assert.doesNotThrow(drain);
  assert.equal(errors.length, 1);
  assert.equal(reconciled, 1);
});

test('explicit interaction refresh redraws unchanged authoritative values without duplicating the activity', async () => {
  const { coordinator, factory } = setup();
  const payload = derive(source());
  await coordinator.sync(payload, true);
  await coordinator.sync(payload, true, true, true);
  assert.deepEqual(factory.events.map((event) => event[0]), ['start', 'update']);
  assert.equal(factory.instances.length, 1);
});

test('iOS bridge consumes while backgrounded, validates native activity state and cleans up listeners', () => {
  const { createLiveActivityActionTargets } = load('@/services/liveActivity/actions');
  const target = { workoutId: '42', workoutStartedAt: '2026-09-23', exerciseId: '4', setId: '5',
    exerciseName: 'Bench Press', exerciseIndex: 0, setIndex: 0 };
  const encoded = createLiveActivityActionTargets(target, false).increaseReps;
  const pending = [{ id: 'one', source: 'activity', target: encoded, timestamp: 1 }];
  const listeners = new Set();
  const foregroundListeners = new Set();
  const applied = [];
  const navigated = [];
  let nativeActive = true;
  let refreshes = 0;
  const native = {
    takeStackLiveActivityActions: () => pending.splice(0),
    isStackLiveActivityActive: () => nativeActive,
    addListener: (_name, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; },
  };
  const AppState = { currentState: 'background', addEventListener: (_name, fn) => {
    foregroundListeners.add(fn); return { remove: () => foregroundListeners.delete(fn) };
  } };
  const runtime = loader({
    'react-native': { AppState },
    expo: { requireOptionalNativeModule: (name) => name === 'ExpoWidgets' ? native : {} },
    '@/store/workoutStore': { useWorkoutStore: { getState: () => ({
      isHydrated: true, hydrationError: null,
      applyActiveSetAction: (target, action) => { applied.push({ target, action }); return { status: 'applied' }; },
    }) } },
    '@/services/liveActivity/sync': { refreshWorkoutLiveActivity: () => { refreshes++; } },
    './factories.ios': { workoutActivity: { getInstances: () => [{ getId: () => 'activity' }] } },
  })('@/services/liveActivity/interaction.ios');
  const stop = runtime.startWorkoutLiveActivityInteractions((...args) => navigated.push(args));
  assert.equal(pending.length, 0);
  AppState.currentState = 'active';
  for (const fn of foregroundListeners) fn('active');
  assert.equal(applied.length, 1);
  assert.deepEqual(navigated, []);
  nativeActive = false;
  pending.push({ id: 'stale', source: 'activity', target: encoded, timestamp: 2 });
  for (const fn of listeners) fn();
  assert.equal(applied.length, 1);
  assert.equal(refreshes, 3);
  stop();
  assert.equal(listeners.size, 0);
  assert.equal(foregroundListeners.size, 0);
});
