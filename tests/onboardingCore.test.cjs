/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(setImmediate); };
function loader(mocks = {}) {
  mocks = { '@/store/sharedRoutineHandoff': { loadSharedRoutineHandoff: async () => {}, onboardingDestination: () => '/(tabs)', clearSharedRoutineHandoff: async () => {} }, ...mocks };
  const cache = new Map();
  function load(id) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.endsWith('.png')) return { uri: id };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const stem = path.join(root, id.slice(2));
    const file = fs.existsSync(stem + '.ts') ? stem + '.ts' : stem + '.tsx';
    const exports = {}; cache.set(id, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    new Function('exports', 'require', code)(exports, child => load(child.startsWith('.')
      ? path.posix.normalize(path.posix.join(path.posix.dirname(id), child)) : child));
    return exports;
  }
  return load;
}
function draftHarness(disk = new Map()) {
  const fail = { read: false, write: false, remove: false };
  let hold = null;
  const storage = {
    getItem: async key => { if (fail.read) throw Error('disk read'); return disk.get(key) ?? null; },
    setItem: async (key, value) => { if (hold) await hold; if (fail.write) throw Error('disk write'); disk.set(key, value); },
    removeItem: async key => { if (fail.remove) throw Error('disk remove'); disk.delete(key); },
  };
  const load = loader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const d = load('@/store/onboardingDraft');
  return { d, disk, fail, load, hold: promise => { hold = promise; } };
}
test('draft relaunch and Back preserve choice, independent frequency and three-day structure', async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft();
  assert.deepEqual(h.d.useOnboardingDraft.getState().draft, h.d.emptyOnboardingDraft());
  await h.d.saveOnboardingDraft({ step: 'starting-point', choice: 'stack', frequency: 3, structure: 'push-pull-legs' });
  const restarted = draftHarness(h.disk); await restarted.d.loadOnboardingDraft();
  assert.equal(restarted.d.useOnboardingDraft.getState().draft.step, 'starting-point');
  await restarted.d.saveOnboardingDraft({ step: 'welcome' });
  const back = draftHarness(h.disk); await back.d.loadOnboardingDraft();
  assert.deepEqual(back.d.useOnboardingDraft.getState().draft, { step: 'welcome', name: '', choice: 'stack', frequency: 3, structure: 'push-pull-legs' });
});
test('the nickname persists across relaunch, and drafts saved before the name step resume with an empty one', async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft();
  await h.d.saveOnboardingDraft({ step: 'starting-point', name: 'Sam' });
  const restarted = draftHarness(h.disk); await restarted.d.loadOnboardingDraft();
  assert.deepEqual(restarted.d.useOnboardingDraft.getState().draft, { ...h.d.emptyOnboardingDraft(), step: 'starting-point', name: 'Sam' });
  const legacy = { step: 'starting-point', choice: 'stack', frequency: 3, structure: 'full-body' };
  const old = draftHarness(new Map([[h.d.ONBOARDING_DRAFT_KEY, JSON.stringify({ version: 1, draft: legacy })]]));
  await old.d.loadOnboardingDraft(); assert.deepEqual(old.d.useOnboardingDraft.getState().draft, { ...legacy, name: '' });
  for (const name of [42, 'x'.repeat(h.d.NICKNAME_MAX_LENGTH + 1)]) {
    const raw = JSON.stringify({ version: 1, draft: { ...h.d.emptyOnboardingDraft(), name } });
    const bad = draftHarness(new Map([[h.d.ONBOARDING_DRAFT_KEY, raw]]));
    await assert.rejects(bad.d.loadOnboardingDraft()); assert.equal(bad.disk.get(h.d.ONBOARDING_DRAFT_KEY), raw);
  }
});
test('unread or incompatible drafts remain untouched and retry can recover', async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft(); await h.d.saveOnboardingDraft({ step: 'starting-point' });
  const raw = h.disk.get(h.d.ONBOARDING_DRAFT_KEY);
  const r = draftHarness(h.disk); r.fail.read = true;
  await assert.rejects(r.d.loadOnboardingDraft()); assert.equal(r.d.useOnboardingDraft.getState().ready, false);
  assert.equal(h.disk.get(h.d.ONBOARDING_DRAFT_KEY), raw);
  r.fail.read = false; await r.d.loadOnboardingDraft(); assert.equal(r.d.useOnboardingDraft.getState().draft.step, 'starting-point');
  for (const raw of ['broken', JSON.stringify({ version: 2, draft: h.d.emptyOnboardingDraft() }),
    JSON.stringify({ version: 1, draft: { ...h.d.emptyOnboardingDraft(), frequency: 7 } })]) {
    const bad = draftHarness(new Map([[h.d.ONBOARDING_DRAFT_KEY, raw]]));
    await assert.rejects(bad.d.saveOnboardingDraft({ choice: 'track' }));
    assert.equal(bad.disk.get(h.d.ONBOARDING_DRAFT_KEY), raw);
  }
});
test('failed draft writes preserve durable choices and successful retry publishes them', async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft(); h.fail.write = true;
  await assert.rejects(h.d.saveOnboardingDraft({ step: 'starting-point' }));
  assert.equal(h.d.useOnboardingDraft.getState().draft.step, 'welcome'); assert.equal(h.disk.size, 0);
  h.fail.write = false; await h.d.saveOnboardingDraft({ step: 'starting-point' });
  assert.equal(h.d.useOnboardingDraft.getState().draft.step, 'starting-point');
});
test('clearing a draft drains queued writes and never touches a shared-routine context key', async () => {
  const h = draftHarness(new Map([['shared-routine-context', 'keep this']])); await h.d.loadOnboardingDraft();
  let release; h.hold(new Promise(resolve => { release = resolve; }));
  const save = h.d.saveOnboardingDraft({ step: 'starting-point', frequency: 6 });
  const clear = h.d.clearOnboardingDraft(); release(); await Promise.all([save, clear]);
  assert.equal(h.disk.has(h.d.ONBOARDING_DRAFT_KEY), false); assert.equal(h.disk.get('shared-routine-context'), 'keep this');
  const r = draftHarness(h.disk); await r.d.loadOnboardingDraft(); assert.deepEqual(r.d.useOnboardingDraft.getState().draft, r.d.emptyOnboardingDraft());
});
for (const choice of ['track', 'explore']) test(`${choice} app entry waits for successful profile persistence and enters once`, async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft();
  let fail = true, writes = 0, navigation = 0;
  const enter = h.load('@/features/onboarding/entry').createOnboardingEntry({
    saveChoice: choice => h.d.saveOnboardingDraft({ choice }),
    completeProfile: () => { writes++; if (fail) throw Error('profile write failed'); return { onboardingCompleted: true }; },
    clearDraft: h.d.clearOnboardingDraft,
    enterApp: () => { navigation++; },
  });
  const first = enter(choice); const repeated = enter(choice);
  assert.equal(first, repeated); await assert.rejects(first); assert.equal(writes, 1); assert.equal(navigation, 0);
  assert.equal(h.d.useOnboardingDraft.getState().draft.choice, choice); assert.ok(h.disk.has(h.d.ONBOARDING_DRAFT_KEY));
  fail = false; await Promise.all([enter(choice), enter(choice)]); await enter(choice);
  assert.equal(writes, 2); assert.equal(navigation, 1); assert.equal(h.disk.has(h.d.ONBOARDING_DRAFT_KEY), false);
});
test('draft save failure blocks profile acceptance and draft cleanup failure never invites duplicate acceptance', async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft(); h.fail.write = true;
  let writes = 0, nav = 0;
  const enter = h.load('@/features/onboarding/entry').createOnboardingEntry({
    saveChoice: choice => h.d.saveOnboardingDraft({ choice }),
    completeProfile: () => { writes++; return { onboardingCompleted: true }; },
    clearDraft: h.d.clearOnboardingDraft, enterApp: () => { nav++; },
  });
  await assert.rejects(enter('explore')); assert.equal(writes, 0); assert.equal(nav, 0);
  h.fail.write = false; h.fail.remove = true; await enter('explore'); await enter('track');
  assert.equal(writes, 1); assert.equal(nav, 1); assert.ok(h.disk.has(h.d.ONBOARDING_DRAFT_KEY));
  h.fail.remove = false; await h.d.clearOnboardingDraft(); assert.equal(h.disk.has(h.d.ONBOARDING_DRAFT_KEY), false);
});
function hookHarness(completed = false) {
  const h = draftHarness(); const state = { profile: completed ? { onboardingCompleted: true } : null };
  const navigation = []; const states = []; let cursor = 0, focus, fail = false, writes = 0;
  const react = {
    useState: initial => { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => react.useState({ current: initial })[0], useCallback: fn => fn, useEffect: () => {},
  };
  const names = [];
  const store = () => state; store.getState = () => ({ ...state, completeNoProgramOnboarding: name => {
    if (fail) throw Error('full disk'); writes++; names.push(name); state.profile = { onboardingCompleted: true }; return state.profile;
  } });
  const load = loader({ react,
    'expo-router': { useRouter: () => ({ push: route => navigation.push(['push', route]), replace: route => navigation.push(['replace', route]), dismissTo: route => navigation.push(['dismissTo', route]) }), useFocusEffect: cb => { focus = cb; } },
    '@/store/onboardingDraft': { ...h.d, useOnboardingDraft: Object.assign(() => h.d.useOnboardingDraft.getState(), { getState: h.d.useOnboardingDraft.getState }) },
    '@/store/workoutStore': { useWorkoutStore: store },
  });
  const render = step => { cursor = 0; return load('@/features/onboarding/useCoreOnboarding').useCoreOnboarding(step); };
  return { ...h, draftFail: h.fail, render, navigation, names, focus: () => focus(), fail: value => { fail = value; }, writes: () => writes };
}
test('Welcome Continue persists the name step, does not complete setup, and duplicate taps navigate once', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); const flow = h.render('welcome');
  h.focus(); await settle(); flow.getStarted(); flow.getStarted(); await settle();
  assert.equal(h.d.useOnboardingDraft.getState().draft.step, 'name');
  assert.deepEqual(h.navigation, [['push', '/(onboarding)/name']]); assert.equal(h.writes(), 0);
});
test('Name Continue trims and persists the nickname, ignores a blank one and navigates once', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); const flow = h.render('name');
  h.focus(); await settle(); flow.submitName('   '); await settle();
  assert.equal(h.navigation.length, 0); assert.equal(h.d.useOnboardingDraft.getState().draft.step, 'name');
  flow.submitName('  Sam  '); flow.submitName('  Sam  '); await settle();
  assert.deepEqual(h.d.useOnboardingDraft.getState().draft, { ...h.d.emptyOnboardingDraft(), step: 'starting-point', name: 'Sam' });
  assert.deepEqual(h.navigation, [['push', '/(onboarding)/starting-point']]); assert.equal(h.writes(), 0);
  assert.equal(h.render('starting-point').name, 'Sam');
});
for (const choice of ['track', 'explore']) test(`${choice} completes setup with the saved nickname`, async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); await h.d.saveOnboardingDraft({ step: 'starting-point', name: 'Sam' });
  const flow = h.render('starting-point'); h.focus(); await settle(); flow.enter(choice); await settle();
  assert.deepEqual(h.names, ['Sam']); assert.deepEqual(h.navigation, [['replace', '/(tabs)']]);
});
for (const [step, choice] of [['starting-point', 'track'], ['starting-point', 'explore']]) {
  test(`${step} ${choice} failure stays on its screen with Retry, then enters app once`, async () => {
    const h = hookHarness(); await h.d.loadOnboardingDraft(); h.render(step); h.focus(); await settle();
    h.fail(true); const flow = h.render(step); flow.enter(choice); flow.enter(choice); await settle();
    assert.equal(h.navigation.length, 0); assert.equal(h.d.useOnboardingDraft.getState().draft.step, step);
    const failed = h.render(step); assert.match(failed.error, /Try again/); assert.equal(failed.busy, false);
    h.fail(false); failed.retry(); failed.retry(); await settle();
    assert.equal(h.writes(), 1); assert.deepEqual(h.navigation, [['replace', '/(tabs)']]);
  });
}
test('guided choice saves the optional branch draft and navigates once without profile acceptance', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); const flow = h.render('starting-point');
  flow.getProgram(); flow.getProgram(); await settle();
  assert.equal(h.d.useOnboardingDraft.getState().draft.choice, 'stack');
  assert.equal(h.d.useOnboardingDraft.getState().draft.step, 'frequency');
  assert.equal(h.writes(), 0); assert.deepEqual(h.navigation, [['push', { pathname: '/program-setup', params: { source: 'onboarding' } }]]);
  const done = hookHarness(true); const existing = done.render('welcome'); done.focus(); await settle();
  assert.equal(existing.completedOnEntry, true); assert.equal(done.disk.size, 0); assert.equal(done.writes(), 0);
});
test('own workouts opens import choices once, preserves the nickname on relaunch, and does not complete onboarding', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); await h.d.saveOnboardingDraft({ name: 'Sam', step: 'starting-point' });
  const flow = h.render('starting-point'); flow.bringWorkouts(); flow.bringWorkouts(); await settle();
  assert.deepEqual(h.navigation, [['push', '/bring-workouts']]); assert.equal(h.writes(), 0);
  const relaunched = draftHarness(h.disk); await relaunched.d.loadOnboardingDraft();
  assert.equal(relaunched.d.useOnboardingDraft.getState().draft.step, 'bring-workouts');
  assert.equal(relaunched.d.useOnboardingDraft.getState().draft.name, 'Sam');
  assert.equal(relaunched.d.useOnboardingDraft.getState().draft.choice, 'track');
});
function renderScreen(id, name, props, { fontScale = 1, width = 390 } = {}) {
  const node = (type, nodeProps) => ({ type, props: nodeProps ?? {} });
  const chain = new Proxy(function animation() {}, { get: () => () => chain });
  const react = { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] };
  const native = { StyleSheet: { create: value => value, flatten: value => value }, useWindowDimensions: () => ({ width, fontScale }) };
  for (const tag of ['Text', 'View', 'ScrollView', 'TextInput']) native[tag] = tag;
  const load = loader({ react, 'react/jsx-runtime': { jsx: node, jsxs: node, Fragment: 'Fragment' }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 34 }) },
    'react-native-reanimated': { __esModule: true, default: { View: 'Animated.View' }, FadeIn: chain, FadeInDown: chain, ReduceMotion: {},
      useAnimatedKeyboard: () => ({ height: { value: 0 } }), useAnimatedStyle: fn => fn() },
    'lucide-react-native': { ArrowRight: 'ArrowRight', ChevronLeft: 'ChevronLeft' },
    '@/components/custom-split/SplitPressable': { SplitPressable: 'Pressable' },
    '@/hooks/usePressScale': { usePressScale: () => ({ animatedStyle: {}, onPressIn() {}, onPressOut() {} }) },
    '@/store/onboardingDraft': { NICKNAME_MAX_LENGTH: 40 } });
  const nodes = [];
  function walk(value) {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!value || typeof value !== 'object') return;
    if (typeof value.type === 'function') { walk(value.type(value.props)); return; }
    nodes.push(value); walk(value.props.children);
  }
  walk(load(id)[name](props));
  const text = value => Array.isArray(value) ? value.map(text).join('') : typeof value === 'string' ? value : '';
  return { nodes, texts: nodes.filter(n => n.type === 'Text').map(n => text(n.props.children)),
    buttons: nodes.filter(n => n.props.accessibilityRole === 'button') };
}
test('Welcome says only what Stack is, with Continue as its single action', () => {
  const calls = [];
  for (const options of [{}, { width: 320, fontScale: 2.5 }]) {
    const screen = renderScreen('@/features/onboarding/WelcomeScreen', 'WelcomeScreen', { onContinue: () => calls.push('continue') }, options);
    assert.deepEqual(screen.texts, ['Every workout\nstacks up.', 'Log your training.\nSee your progress take shape.', 'Continue']);
    assert.equal(screen.buttons.length, 1); screen.buttons[0].props.onPress();
    assert.ok(screen.nodes.some(n => n.props.accessibilityRole === 'image' && n.props.accessibilityLabel === 'Stack'));
    assert.equal(screen.nodes.some(n => n.props.numberOfLines), false);
  }
  assert.deepEqual(calls, ['continue', 'continue']);
  assert.equal(renderScreen('@/features/onboarding/WelcomeScreen', 'WelcomeScreen', { onContinue() {}, busy: true }).buttons[0].props.disabled, true);
});
test('Name asks for a nickname and keeps Continue disabled until one is entered', () => {
  const submitted = [];
  const empty = renderScreen('@/features/onboarding/NameScreen', 'NameScreen', { initialName: '  ', busy: false, onSubmit: name => submitted.push(name) });
  assert.deepEqual(empty.texts, ['What should we call you?', 'Continue']);
  const input = empty.nodes.find(n => n.type === 'TextInput');
  assert.equal(input.props.placeholder, 'Nickname'); assert.equal(input.props.accessibilityLabel, 'Nickname');
  assert.equal(input.props.maxLength, 40); assert.equal(input.props.autoFocus, true);
  assert.equal(empty.buttons[0].props.disabled, true); input.props.onSubmitEditing(); empty.buttons[0].props.onPress();
  const filled = renderScreen('@/features/onboarding/NameScreen', 'NameScreen', { initialName: 'Sam', busy: false, onSubmit: name => submitted.push(name) }, { width: 320, fontScale: 2.5 });
  assert.equal(filled.buttons[0].props.disabled, false); filled.buttons[0].props.onPress();
  assert.equal(renderScreen('@/features/onboarding/NameScreen', 'NameScreen', { initialName: 'Sam', busy: true, onSubmit() {} }).buttons[0].props.disabled, true);
  assert.deepEqual(submitted, ['Sam']);
});
test('Training choice offers two equal choices and a tertiary Explore first, with no example data', () => {
  for (const options of [{}, { width: 320, fontScale: 2.5 }]) {
    const calls = [];
    const screen = renderScreen('@/features/onboarding/StartingPointScreen', 'StartingPointScreen',
      { busy: false, onTrack: () => calls.push('track'), onProgram: () => calls.push('stack'), onExplore: () => calls.push('explore') }, options);
    assert.deepEqual(screen.texts, ['How do you want to train?', 'I have my own workouts', 'Track what you already do.',
      'Give me workouts', 'Start with workouts from Stack.', 'Explore first']);
    assert.equal(screen.buttons.length, 3); assert.equal(screen.buttons.some(n => n.props.accessibilityState?.selected), false);
    assert.deepEqual(screen.buttons.map(n => n.props.accessibilityLabel), ['I have my own workouts', 'Give me workouts', undefined]);
    screen.buttons.forEach(button => button.props.onPress()); assert.deepEqual(calls, ['track', 'stack', 'explore']);
    const [own, given] = screen.buttons.map(n => n.props.style({ pressed: false }));
    assert.deepEqual(own, given, 'Neither choice is styled as the preferred answer');
    assert.equal(screen.nodes.some(n => n.props.numberOfLines), false);
  }
});

test('Back after a cold draft restore persists each previous step without clearing the nickname or guided choice', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft();
  await h.d.saveOnboardingDraft({ step: 'starting-point', name: 'Sam', choice: 'stack', frequency: 3, structure: 'push-pull-legs' });
  const flow = h.render('starting-point'); flow.backToName(); flow.backToName(); await settle();
  assert.deepEqual(h.navigation, [['dismissTo', '/(onboarding)/name']]);
  assert.deepEqual(h.d.useOnboardingDraft.getState().draft, { step: 'name', name: 'Sam', choice: 'stack', frequency: 3, structure: 'push-pull-legs' });
  h.render('name').backToWelcome(); await settle();
  assert.deepEqual(h.navigation.at(-1), ['dismissTo', '/(onboarding)/welcome']);
  assert.deepEqual(h.d.useOnboardingDraft.getState().draft, { step: 'welcome', name: 'Sam', choice: 'stack', frequency: 3, structure: 'push-pull-legs' });
});
test('Reset All Data clears the onboarding draft after successful database reset, preserving it on failed reset', async () => {
  const h = draftHarness(); await h.d.loadOnboardingDraft(); await h.d.saveOnboardingDraft({ step: 'starting-point', choice: 'stack' });
  let fail = true;
  const state = { currentSession: null, profile: { onboardingCompleted: true }, resetAllData: () => { if (!fail) state.profile = null; } };
  const noop = async () => {};
  const load = loader({
    '@react-native-async-storage/async-storage': { __esModule: true, default: {} },
    'expo-file-system': {}, 'expo-sharing': {}, 'react-native': { Platform: { OS: 'ios' } },
    '@/store/workoutStore': { useWorkoutStore: { getState: () => state } },
    '@/store/onboardingDraft': h.d,
    '@/store/appPreferences': { clearAppPreferences: noop }, '@/store/workoutDatabase': {}, '@/store/workoutBackup': {},
    '@/store/muscleColors': { clearMuscleColors: noop }, '@/store/liftProgressPreferences': { clearLiftProgressPreferences: noop },
    '@/constants/muscleColors': {}, '@/features/build/useBuildAccessibility': { buildPreferences: { setReduceEffects: noop } },
    '@/features/build/preferences': {}, '@/features/build/introductionStore': { buildIntroduction: { reset: noop } },
    '@/store/customSplitDraft': { clearCustomSplitDrafts: noop },
    '@/store/programConfigurationDraft': { clearProgramConfigurationDraft: noop },
  });
  const reset = load('@/features/settings/data').deleteAllData;
  await assert.rejects(reset()); assert.ok(h.disk.has(h.d.ONBOARDING_DRAFT_KEY));
  fail = false; await reset(); assert.equal(h.disk.has(h.d.ONBOARDING_DRAFT_KEY), false);
  assert.deepEqual(h.d.useOnboardingDraft.getState().draft, h.d.emptyOnboardingDraft());
});

test('Welcome Continue draft-write failure stays on Welcome and Retry performs exactly one navigation', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); const flow = h.render('welcome');
  h.draftFail.write = true; flow.getStarted(); flow.getStarted(); await settle();
  assert.equal(h.navigation.length, 0); assert.equal(h.d.useOnboardingDraft.getState().draft.step, 'welcome');
  const failed = h.render('welcome'); assert.match(failed.error, /Try again/);
  h.draftFail.write = false; failed.retry(); failed.retry(); await settle();
  assert.deepEqual(h.navigation, [['push', '/(onboarding)/name']]); assert.equal(h.writes(), 0);
});

test('a shared-routine route arriving during a save keeps navigation ownership', async () => {
  const h = hookHarness(); await h.d.loadOnboardingDraft(); h.render('starting-point');
  const leave = h.focus(); await settle();
  let release; h.hold(new Promise(resolve => { release = resolve; }));
  const flow = h.render('starting-point'); flow.enter('track'); leave(); release(); await settle();
  assert.equal(h.writes(), 1); assert.equal(h.navigation.length, 0);
  assert.equal(h.disk.has(h.d.ONBOARDING_DRAFT_KEY), false);
  h.render('starting-point'); h.focus(); await settle();
  assert.deepEqual(h.navigation, [['replace', '/(tabs)']]); assert.equal(h.writes(), 1);
});

function programHarness(profile = null, source = 'onboarding') {
  const h = draftHarness(); const cfg = h.load('@/store/programConfigurationDraft');
  const live = { profile }; const navigation = []; const instances = new Map(); let current, cursor = 0, writes = 0, failProfile = false, failCatalog = false;
  const effects = []; const router = { push: route => navigation.push(['push',route]), replace: route => navigation.push(['replace',route]), dismissTo: route => navigation.push(['dismissTo',route]) };
  const react = {
    useState(initial) { const i = cursor++, arr = current.states; if (!(i in arr)) arr[i] = typeof initial === 'function' ? initial() : initial;
      return [arr[i], value => { arr[i] = typeof value === 'function' ? value(arr[i]) : value; }]; },
    useRef: value => react.useState({ current: value })[0], useCallback: fn => fn,
    useEffect(fn,deps) { const i = cursor++, arr = current.states; if (!arr[i] || deps.some((v,j)=>v!==arr[i].deps[j])) {
      arr[i]?.cleanup?.(); const entry = { deps }; arr[i] = entry; effects.push(() => { entry.cleanup = fn(); });
    } },
  };
  const store = () => live; store.getState = () => ({ ...live,
    completeNoProgramOnboarding: name => { if (failProfile) throw Error('full disk'); writes++; live.profile = { onboardingCompleted: true, programMode: 'none', name }; return live.profile; },
    acceptStackProgram: (frequency,structure,context,name) => { if (failProfile) throw Error('full disk'); writes++;
      live.profile = { ...(context === 'configuration' ? live.profile : { name }), onboardingCompleted: true, programMode: 'stack', activeSplitId: null, programWeeklyGoal: frequency, threeDayStructure: structure }; return live.profile; },
  });
  const colors = {};
  const db = { readArchetypeVariantsSync: () => ['a','b','c'], getNextArchetypeVariant: () => 'a',
    readArchetypeTemplateCatalogSync: archetype => { if (failCatalog) throw Error('catalog unavailable'); return [{ id: 1, name: `${archetype} exercise`, workoutType: 'chest', primaryMuscle: 'Chest' }]; } };
  const load = loader({ react,
    'expo-router': { useRouter: () => router, useLocalSearchParams: () => ({ source }), useFocusEffect: cb => { current.focus = cb; } },
    '@/store/workoutStore': { useWorkoutStore: store }, '@/store/workoutDatabase': db,
    '@/store/customSplitDraft': { useCustomSplitDraftStore: { getState: () => ({ discardStackPlanDrafts() {} }) } },
    '@/store/muscleColors': { useMuscleColors: selector => selector({ preferences: colors }) },
    '@/store/onboardingDraft': { ...h.d, useOnboardingDraft: Object.assign(() => h.d.useOnboardingDraft.getState(), { getState: h.d.useOnboardingDraft.getState }) },
    '@/store/programConfigurationDraft': { ...cfg, useProgramConfigurationDraft: Object.assign(() => cfg.useProgramConfigurationDraft.getState(), { getState: cfg.useProgramConfigurationDraft.getState }) },
  });
  function render(step) {
    if (!instances.has(step)) instances.set(step,{ states: [] }); current = instances.get(step); cursor = 0;
    const result = load('@/features/program/useProgramSetup').useProgramSetup(step); while (effects.length) effects.shift()(); return result;
  }
  return { ...h, cfg, live, navigation, render, focus: step => instances.get(step).focus(),
    writes: () => writes, failProfile: value => { failProfile = value; }, failCatalog: value => { failCatalog = value; } };
}
test('program drafts are independent, persist across relaunch and both clear on Reset', async () => {
  const h = draftHarness(); const c = h.load('@/store/programConfigurationDraft');
  await h.d.loadOnboardingDraft(); await h.d.saveOnboardingDraft({ step:'program-preview',frequency:3,structure:'push-pull-legs' });
  await c.loadProgramConfigurationDraft(); await c.saveProgramConfigurationDraft({ step:'frequency',frequency:6 });
  const reopened = draftHarness(h.disk); const r = reopened.load('@/store/programConfigurationDraft');
  await reopened.d.loadOnboardingDraft(); await r.loadProgramConfigurationDraft();
  assert.equal(reopened.d.useOnboardingDraft.getState().draft.frequency,3); assert.equal(r.useProgramConfigurationDraft.getState().draft.frequency,6);
  await Promise.all([reopened.d.clearOnboardingDraft(),r.clearProgramConfigurationDraft()]); assert.equal(h.disk.size,0);
});
test('program frequency requires selection, newly selecting 3 uses Full body, and Back retains explicit PPL', async () => {
  const h = programHarness(); await h.d.loadOnboardingDraft(); h.render('frequency'); h.focus('frequency'); await settle();
  let flow = h.render('frequency'); flow.seeWorkouts(); await settle(); assert.equal(h.navigation.length,0);
  flow.selectFrequency(3); assert.equal(h.render('frequency').frequency,3); await settle();
  assert.equal(h.render('frequency').structure,'full-body'); flow = h.render('frequency'); flow.seeWorkouts(); flow.seeWorkouts(); await settle();
  h.render('program-preview'); h.focus('program-preview'); await settle(); h.render('program-preview').selectStructure('push-pull-legs'); await settle();
  h.render('program-preview'); await settle();
  assert.deepEqual(h.render('program-preview').lineup.map(d=>d.archetype),['push','pull','legs']);
  h.render('program-preview').back(); await settle(); h.render('frequency'); h.focus('frequency'); await settle();
  flow = h.render('frequency'); assert.equal(flow.structure,'push-pull-legs'); flow.selectFrequency(3); await settle(); assert.equal(h.render('frequency').structure,'push-pull-legs');
  flow.selectFrequency(2); await settle(); h.render('frequency').selectFrequency(3); await settle(); assert.equal(h.render('frequency').structure,'full-body');
  assert.equal(h.writes(),0); assert.equal(h.live.profile,null);
});
for (const frequency of [1,2,3,4,5,6]) test(`program preview ${frequency}: loads real lists, retry recovers, acceptance is retryable and enters once`, async () => {
  const h = programHarness(); await h.d.loadOnboardingDraft(); await h.d.saveOnboardingDraft({ frequency, step:'program-preview', name:'Sam' });
  h.failCatalog(true); h.render('program-preview'); h.focus('program-preview'); await settle();
  let flow = h.render('program-preview'); assert.match(flow.workoutError,/Could not load/); flow.useWorkouts(); await settle(); assert.equal(h.writes(),0);
  h.failCatalog(false); flow.retryWorkouts(); h.render('program-preview'); await settle(); flow=h.render('program-preview');
  assert.equal(flow.lineup.length,frequency); assert.equal(flow.lineup.every(d=>d.exercises.length===1),true);
  h.failProfile(true); flow.useWorkouts(); flow.useWorkouts(); await settle(); flow=h.render('program-preview');
  assert.match(flow.error,/Try again/); assert.equal(h.navigation.length,0); assert.equal(h.d.useOnboardingDraft.getState().draft.frequency,frequency);
  h.failProfile(false); flow.retry(); flow.retry(); await settle(); h.render('program-preview').useWorkouts(); await settle();
  assert.equal(h.writes(),1); assert.equal(h.navigation.length,1); assert.equal(h.live.profile.programWeeklyGoal,frequency);
  assert.equal(h.live.profile.name,'Sam'); assert.equal(h.disk.has(h.d.ONBOARDING_DRAFT_KEY),false);
});
for (const mode of ['none','stack','custom']) test(`later ${mode} configuration: Cancel, Decide later and Explore preserve the entire active profile`, async () => {
  const profile={ onboardingCompleted:true,programMode:mode,activeSplitId:mode==='custom'?73:null,weeklyGoal:5,programWeeklyGoal:4,threeDayStructure:'push-pull-legs',weightUnit:'lbs',name:'Keep',trainingDays:[1,4] };
  for (const action of ['back','skip']) for (const step of ['frequency','program-preview']) {
    if (action==='back' && step==='program-preview') continue;
    const h=programHarness({...profile},'splits'); await h.cfg.loadProgramConfigurationDraft(); await h.cfg.saveProgramConfigurationDraft({ frequency:3,structure:'full-body' });
    h.render(step);h.focus(step);await settle(); const flow=h.render(step);flow[action]();await settle();
    assert.deepEqual(h.live.profile,profile);assert.equal(h.writes(),0);assert.deepEqual(h.navigation,[['dismissTo','/your-splits']]);
    assert.equal(h.disk.has(h.cfg.PROGRAM_CONFIGURATION_DRAFT_KEY),false);
  }
});
test('later acceptance preserves the independent habit goal and incoming routine retains navigation ownership', async () => {
  const original={onboardingCompleted:true,programMode:'custom',activeSplitId:73,weeklyGoal:5,weightUnit:'lbs',trainingDays:[1,4]};
  const h=programHarness({...original},'train');await h.cfg.loadProgramConfigurationDraft();await h.cfg.saveProgramConfigurationDraft({frequency:2});
  h.render('program-preview');const leave=h.focus('program-preview');await settle();
  let release;h.hold(new Promise(resolve=>{release=resolve;}));const flow=h.render('program-preview');flow.useWorkouts();leave();release();await settle();
  assert.equal(h.writes(),1);assert.equal(h.navigation.length,0);assert.equal(h.live.profile.weeklyGoal,5);assert.equal(h.live.profile.weightUnit,'lbs');
  h.render('program-preview');h.focus('program-preview');await settle();
  assert.deepEqual(h.navigation,[['dismissTo','/(tabs)']]);assert.equal(h.writes(),1);
});
for(const step of ['frequency','program-preview']) test(`fresh ${step} skip creates only no-program app entry once`,async()=>{
  const h=programHarness();await h.d.loadOnboardingDraft();await h.d.saveOnboardingDraft({frequency:3});h.render(step);h.focus(step);await settle();
  const flow=h.render(step);flow.skip();flow.skip();await settle();assert.equal(h.live.profile.programMode,'none');assert.equal(h.writes(),1);assert.equal(h.navigation.length,1);
});

test('program acceptance blocks draft failures and does not repeat a committed profile after cleanup failure',async()=>{
  const h=draftHarness();await h.d.loadOnboardingDraft();let writes=0,entries=0;
  const accept=h.load('@/features/program/acceptance').createProgramAcceptance({
    saveDraft:(frequency,structure)=>h.d.saveOnboardingDraft({frequency,structure}),
    commit:()=>{writes++;return {onboardingCompleted:true};},clearDraft:h.d.clearOnboardingDraft,finish:()=>{entries++;},
  });
  h.fail.write=true;await assert.rejects(accept(3,'full-body'));assert.equal(writes,0);assert.equal(entries,0);
  h.fail.write=false;h.fail.remove=true;await accept(3,'push-pull-legs');await accept(6,'full-body');
  assert.equal(writes,1);assert.equal(entries,1);assert.equal(h.d.useOnboardingDraft.getState().draft.structure,'push-pull-legs');
});

function programUI(fontScale=1) {
  let cursor=0;const states=[];
  const element=(type,props)=>({type,props});
  const load=loader({
    react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];}},
    'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'Fragment'},
    'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:v=>v},useWindowDimensions:()=>({width:390,height:844,fontScale})},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{Stack:{Screen:'Stack.Screen'}},
    'lucide-react-native':{Check:'Check',ChevronDown:'ChevronDown',ChevronUp:'ChevronUp',ChevronLeft:'ChevronLeft'},
    '@/components/custom-split/SplitPressable':{SplitPressable:'Pressable'},
    '@/components/home/WorkoutCardSurface':{WorkoutCardSurface:'WorkoutCardSurface'},
    '@/features/onboarding/SetupLoading':{SetupStatus:'SetupStatus'},
    '@/components/StackLogo':{StackLogo:'StackLogo'},
    '@/features/onboarding/OnboardingActions':{onboardingBackOptions:()=>({})},
  });
  return {load,setScale(value){fontScale=value;},render(component,props){cursor=0;return component(props);}};
}
function uiNodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(uiNodes);return [tree,...uiNodes(tree.props?.children)];}

test('program exercise disclosure exposes the real list and can collapse without changing its template',()=>{
  const h=programUI();const lineup=[{key:'0:push:a',name:'Push A',color:'#FF7A3D',exercises:[{id:1,name:'Bench Press',workoutType:'chest',primaryMuscle:'Chest'},{id:2,name:'Overhead Press',workoutType:'shoulders',primaryMuscle:'Delts'}]}];
  const before=JSON.stringify(lineup);let selections=0;
  const screen=h.render(h.load('@/features/program/ProgramPreviewScreen').ProgramPreviewScreen,{frequency:3,structure:'full-body',busy:false,selectStructure:()=>selections++,lineup,loading:false,error:null,retry(){}});
  const row=uiNodes(screen).find(n=>typeof n.type==='function');
  let tree=h.render(row.type,row.props);let disclosure=uiNodes(tree).find(n=>n.props?.accessibilityLabel==='Push A, 2 exercises');
  assert.equal(disclosure.props.accessibilityState.expanded,false);assert.ok(!JSON.stringify(tree).includes('Bench Press'));
  disclosure.props.onPress();tree=h.render(row.type,row.props);disclosure=uiNodes(tree).find(n=>n.props?.accessibilityLabel==='Push A, 2 exercises');
  assert.equal(disclosure.props.accessibilityState.expanded,true);assert.ok(JSON.stringify(tree).includes('Bench Press'));assert.ok(JSON.stringify(tree).includes('Overhead Press'));
  h.setScale(3.12);tree=h.render(row.type,row.props);disclosure=uiNodes(tree).find(n=>n.props?.accessibilityLabel==='Push A, 2 exercises');
  assert.equal(disclosure.props.accessibilityState.expanded,true);assert.ok(JSON.stringify(tree).includes('Bench Press'));
  h.setScale(1);tree=h.render(row.type,row.props);disclosure=uiNodes(tree).find(n=>n.props?.accessibilityLabel==='Push A, 2 exercises');
  disclosure.props.onPress();tree=h.render(row.type,row.props);assert.ok(!JSON.stringify(tree).includes('Bench Press'));
  assert.equal(JSON.stringify(lineup),before);assert.equal(selections,0);
});

test('program actions remain scrollable at accessibility text sizes instead of consuming the viewport',()=>{
  for(const scale of [1,3.12]){
    const h=programUI(scale);const tree=h.render(h.load('@/features/program/ProgramScreenFrame').ProgramScreenFrame,{title:'Your starting lineup.',number:2,busy:false,error:null,retry(){},back(){},children:'Workouts',primary:'Use these workouts',onPrimary(){},secondary:'Explore without a program',onSecondary(){}});
    const scroll=uiNodes(tree).find(n=>n.type==='ScrollView');
    assert.equal(uiNodes(scroll).filter(n=>n.type==='Pressable').length,scale===1?0:2);
    assert.equal(uiNodes(tree).filter(n=>n.type==='Pressable').length,2);
    assert.ok(uiNodes(tree).filter(n=>n.type==='Text' && ['Use these workouts','Explore without a program'].includes(n.props.children)).every(n=>n.props.numberOfLines===undefined && n.props.allowFontScaling!==false));
  }
});
