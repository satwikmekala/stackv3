/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(mocks = {}) {
  const cache = new Map();
  function load(id) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const stem = path.join(root, id.slice(2));
    const file = ['.ts', '.tsx'].map(ext => stem + ext).find(fs.existsSync);
    const exports = {}; cache.set(id, exports);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    new Function('exports', 'require', '__DEV__', js)(exports, name => load(name.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(id), name)) : name), true);
    return exports;
  }
  return load;
}
function handoffHarness(disk = new Map()) {
  const fail = { read: false, write: false, remove: false };
  let hold;
  const storage = {
    getItem: async key => { if (fail.read) throw Error('read'); return disk.get(key) ?? null; },
    setItem: async (key, value) => { if (hold) await hold; if (fail.write) throw Error('write'); disk.set(key, value); },
    removeItem: async key => { if (fail.remove) throw Error('remove'); disk.delete(key); },
  };
  const load = loader({ 'expo-modules-core': { uuid: { v4: () => require('node:crypto').randomUUID() } }, '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const h = load('@/store/sharedRoutineHandoff');
  const t = load('@/features/sharing/splitTransport');
  const token = name => { const encoded = t.encodeSharedSplit({ name, workouts: [{ name: 'Day one', exercises: [{ kind: 'builtin', name: 'Bench Press' }] }] }); assert.equal(encoded.ok, true); return encoded.value; };
  return { h, disk, fail, token, load, hold: p => { hold = p; } };
}
test('shared context survives setup draft clear, Back-like draft changes and cold relaunch without activating a program', async () => {
  const x = handoffHarness(), a = x.token('A routine');
  await x.h.rememberSharedRoutine(a, { splitId: 27, name: 'A routine' });
  const d = x.load('@/store/onboardingDraft'); await d.saveOnboardingDraft({ step: 'program-preview', choice: 'stack', frequency: 3 });
  await d.saveOnboardingDraft({ step: 'welcome' }); await d.clearOnboardingDraft();
  const cold = handoffHarness(x.disk); await cold.h.loadSharedRoutineHandoff();
  assert.deepEqual(cold.h.onboardingDestination(), { pathname: '/import-split', params: { d: a } });
  assert.deepEqual(cold.h.useSharedRoutineHandoff.getState().pending.saved, { splitId: 27, name: 'A routine' });
  assert.equal(x.disk.has(d.ONBOARDING_DRAFT_KEY), false);
});
test('unread context blocks profile acceptance; retry enters once, cleanup never clears shared context', async () => {
  const x = handoffHarness(); x.fail.read = true;
  let writes = 0, nav = 0;
  const enter = x.load('@/features/onboarding/entry').createOnboardingEntry({ prepare: x.h.loadSharedRoutineHandoff, saveChoice: async () => {}, completeProfile: () => { writes++; return { onboardingCompleted: true }; }, clearDraft: async () => {}, enterApp: () => nav++ });
  await assert.rejects(enter('track')); assert.equal(writes, 0); assert.equal(nav, 0);
  x.fail.read = false; await Promise.all([enter('track'), enter('track')]); assert.equal(writes, 1); assert.equal(nav, 1);
});
test('incoming link owns the handoff while previous acceptance is clearing its draft', async () => {
  const x = handoffHarness(), a = x.token('First'), b = x.token('Incoming');
  await x.h.rememberSharedRoutine(a); let release; let current = true; const routes = [];
  const enter = x.load('@/features/onboarding/entry').createOnboardingEntry({ prepare: x.h.loadSharedRoutineHandoff, saveChoice: async () => {}, completeProfile: () => ({ onboardingCompleted: true }), clearDraft: () => new Promise(resolve => { release = resolve; }), enterApp: () => { if (current) routes.push(x.h.onboardingDestination()); } });
  const pending = enter('explore'); await new Promise(setImmediate);
  current = false; await x.h.rememberSharedRoutine(b); release(); await pending;
  assert.deepEqual(routes, []); assert.equal(x.h.onboardingDestination().params.d, b);
  await x.h.clearSharedRoutineHandoff(a); assert.equal(x.h.onboardingDestination().params.d, b);
  await x.h.clearSharedRoutineHandoff(b); assert.equal(x.h.onboardingDestination(), '/(tabs)');
});
test('failed context writes/removals preserve the last durable routine and support retry', async () => {
  const x = handoffHarness(), a = x.token('First'), b = x.token('Next'); await x.h.rememberSharedRoutine(a);
  const raw = x.disk.get(x.h.SHARED_ROUTINE_HANDOFF_KEY); x.fail.write = true;
  await assert.rejects(x.h.rememberSharedRoutine(b)); assert.equal(x.disk.get(x.h.SHARED_ROUTINE_HANDOFF_KEY), raw); assert.equal(x.h.onboardingDestination().params.d, a);
  x.fail.write = false; await x.h.rememberSharedRoutine(b, { splitId: 11, name: 'Next' }); await x.h.rememberSharedRoutine(b);
  assert.equal(x.h.useSharedRoutineHandoff.getState().pending.saved.splitId, 11);
  x.fail.remove = true; await assert.rejects(x.h.clearSharedRoutineHandoff(b)); assert.equal(x.h.onboardingDestination().params.d, b);
  x.fail.remove = false; await x.h.clearSharedRoutineHandoff(b); assert.equal(x.h.onboardingDestination(), '/(tabs)');
});
test('serialized new routine / stale dismissal / Reset cannot revive an earlier pending write', async () => {
  const x = handoffHarness(), a = x.token('First'), b = x.token('Next'); await x.h.rememberSharedRoutine(a);
  let release; x.hold(new Promise(resolve => { release = resolve; }));
  const save = x.h.rememberSharedRoutine(b); const stale = x.h.clearSharedRoutineHandoff(a); const clear = x.h.clearSharedRoutineHandoff();
  release(); await Promise.all([save, stale, clear]); assert.equal(x.disk.size, 0); assert.equal(x.h.onboardingDestination(), '/(tabs)');
});
test('invalid shared contexts cannot navigate or overwrite storage; Reset can clear corrupt state', async () => {
  const x = handoffHarness(), valid = { version: 1, pending: { token: x.token('Okay'), saved: null } };
  for (const raw of ['broken', JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, pending: { token: 'bad', saved: null } }), JSON.stringify({ ...valid, pending: { ...valid.pending, saved: { splitId: -1, name: 'Bad' } } })]) {
    const bad = handoffHarness(new Map([[x.h.SHARED_ROUTINE_HANDOFF_KEY, raw]])); await assert.rejects(bad.h.loadSharedRoutineHandoff());
    assert.equal(bad.h.useSharedRoutineHandoff.getState().ready, false); assert.equal(bad.disk.get(x.h.SHARED_ROUTINE_HANDOFF_KEY), raw);
    await bad.h.clearSharedRoutineHandoff(); assert.equal(bad.h.onboardingDestination(), '/(tabs)'); assert.equal(bad.disk.size, 0);
  }
});
function renderHarness(file, mocks = {}) {
  const nodes = [], routes = [];
  const node = (type, props) => ({ type, props: props ?? {} });
  const native = { useWindowDimensions: () => ({ fontScale: 1 }), StyleSheet: { create: x => x }, ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
  const load = loader({ react: {}, 'react/jsx-runtime': { jsx: node, jsxs: node }, 'react-native': native,
    'expo-router': { Redirect: 'Redirect', Stack: { Screen: 'Stack.Screen' }, useRouter: () => ({ push: x => routes.push(x), navigate: x => routes.push(x), dismissTo: x => routes.push(x) }), useIsFocused: () => true },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'lucide-react-native': { ArrowRight: 'Arrow', HelpCircle: 'Help' }, '@/components/custom-split/SplitPressable': { SplitPressable: 'Pressable' },
    '@/features/build/BuildPreview': { BuildPreview: 'BuildPreview' }, '@/features/build/Monolith': { __esModule: true, default: 'Monolith' },
    '@/components/home/WorkoutCardSurface': { WorkoutCardSurface: 'Surface' }, '@/features/build/useBuildHistory': { useBuildHistory: () => ({ state: { pieces: [] } }) },
    '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: true }, ...mocks });
  function walk(x) { if (Array.isArray(x)) return x.forEach(walk); if (!x || typeof x !== 'object') return; if (typeof x.type === 'function') return walk(x.type(x.props)); nodes.push(x); walk(x.props.children); }
  walk(load(file).default()); return { nodes, routes };
}
test('Stack discovery uses saved history, exposes contextual Train/help and renders no earned pieces', () => {
  const h = renderHarness('@/features/build/StackDiscovery'); const texts = h.nodes.filter(n => n.type === 'Text').map(n => n.props.children);
  assert.ok(texts.includes('MY STACK')); assert.ok(texts.includes('Your Stack starts here')); assert.ok(texts.includes('Go to Train')); assert.ok(!texts.includes('See an example'));
  assert.deepEqual(h.nodes.find(n => n.type === 'BuildPreview').props.slabs, []);
  h.nodes.filter(n => n.props.accessibilityRole === 'button').forEach(n => n.props.onPress());
  assert.deepEqual(h.routes, ['/stack-help', '/(tabs)']);
  const full = renderHarness('@/features/build/StackDiscovery', { '@/features/build/useBuildHistory': { useBuildHistory: () => ({ state: { pieces: [{ id: 'earned' }] } }) } });
  assert.equal(full.nodes[0].type, 'Monolith');
});
test('Stack example is read-only presentation and all colors have explanatory text; flag-off safely redirects', () => {
  const h = renderHarness('@/app/stack-example');
  assert.ok(h.nodes.some(n => n.props.children === 'EXAMPLE ONLY'));
  const slabs = h.nodes.find(n => n.type === 'BuildPreview').props.slabs; assert.ok(slabs.every(s => s.id.startsWith('welcome:')));
  assert.ok(h.nodes.some(n => n.props.accessibilityLabel?.includes('Your training data stays unchanged')));
  assert.ok(!h.nodes.some(n => n.props.numberOfLines)); h.nodes.find(n => n.props.accessibilityRole === 'button').props.onPress(); assert.deepEqual(h.routes, ['/(tabs)']);
  const off = renderHarness('@/app/stack-example', { '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: false } }); assert.equal(off.nodes[0].type, 'Redirect');
});

function importScreenHarness({ completed = false, saved = null, preview = true } = {}) {
  const hooks = new Map(), effects = [], routes = [], calls = [];
  let owner, cursor, failActivation = false, failContext = false, resolveImport;
  const handoff = { pending: saved ? { token: 'valid-fixture', saved } : null };
  const profile = { onboardingCompleted: completed, programMode: 'none', activeSplitId: null };
  const state = { profile, refreshCustomSplits: async () => calls.push('refresh'), activateSharedRoutine: id => {
    calls.push(['activate', id]); if (failActivation) throw Error('SQL write failed'); profile.programMode = 'custom'; profile.activeSplitId = id;
  } };
  const useWorkoutStore = selector => selector(state); useWorkoutStore.getState = () => state;
  const react = {
    useMemo: fn => react.useState(fn)[0], useCallback: fn => fn,
    useRef: value => react.useState(() => ({ current: value }))[0],
    useState: value => { const slots = hooks.get(owner); const index = cursor++; if (!slots[index]) slots[index] = { value: typeof value === 'function' ? value() : value }; const slot = slots[index]; return [slot.value, next => { slot.value = typeof next === 'function' ? next(slot.value) : next; }]; },
    useEffect: fn => { const slots = hooks.get(owner); const index = cursor++; if (!slots[index]) { slots[index] = {}; effects.push(fn); } },
  };
  const load = loader({ react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { useWindowDimensions: () => ({ fontScale: 1 }), StyleSheet: { create: x => x }, ActivityIndicator: 'Activity', ScrollView: 'Scroll', Text: 'Text', View: 'View', Pressable: 'Button', Linking: { addEventListener: () => ({ remove() {} }) } },
    'react-native-safe-area-context': { SafeAreaView: 'Safe' }, 'lucide-react-native': { Check: 'Check', ChevronLeft: 'Back', Layers: 'Layers' },
    'expo-router': { useFocusEffect: fn => react.useEffect(fn), useLocalSearchParams: () => ({ d: 'valid-fixture' }), useRouter: () => ({ replace: route => routes.push(route), back: () => routes.push('back'), canGoBack: () => false }) },
    '@/features/sharing/splitTransport': { parseSharedSplit: () => ({ ok: true, value: { name: 'Shared', workouts: [{ name: 'Push', exercises: [{ name: 'Bench Press', kind: 'builtin' }] }] } }) },
    '@/store/workoutDatabase': { importPortableSplitSync: () => { calls.push('import'); return new Promise(resolve => { resolveImport = resolve; }); } },
    '@/store/workoutStore': { useWorkoutStore }, '@/store/customSplitDraft': { useCustomSplitDraftStore: selector => selector({ closeDraft: () => calls.push('closeDraft') }) },
    '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: preview, FIRST_RUN_ROUTE: '/onboarding-preview' },
    '@/store/sharedRoutineHandoff': { useSharedRoutineHandoff: () => handoff, loadSharedRoutineHandoff: async () => {},
      prepareSharedRoutineImport: async () => { if (failContext) throw Error('storage'); return '00000000-0000-4000-8000-000000000009'; },
      rememberSharedRoutine: async (token, result) => { calls.push(['remember', token, result]); if (failContext) throw Error('storage'); handoff.pending = { token, saved: result ?? handoff.pending?.saved ?? null }; },
      clearSharedRoutineHandoff: async token => { calls.push(['clear', token]); if (failContext) throw Error('storage'); handoff.pending = null; } },
  });
  const component = load('@/app/import-split').default;
  function render() {
    const nodes = [];
    function walk(x) {
      if (Array.isArray(x)) return x.forEach(walk); if (!x || typeof x !== 'object') return;
      if (typeof x.type === 'function') { owner = x.type; cursor = 0; if (!hooks.has(owner)) hooks.set(owner, []); return walk(x.type(x.props)); }
      nodes.push(x); walk(x.props?.children);
    }
    walk({ type: component, props: {} }); while (effects.length) effects.shift()(); return nodes;
  }
  function action(label) { const nodes = render(); const button = nodes.find(n => n.type === 'Button' && (n.props.accessibilityLabel === label || nodes.some(t => t.type === 'Text' && t.props.children === label && n.props.children?.includes?.(t)))); assert.ok(button, `Missing ${label}`); return button.props.onPress; }
  return { render, action, routes, calls, profile, handoff, failActivation: value => { failActivation = value; }, failContext: value => { failContext = value; }, resolve: () => resolveImport({ splitId: 9, name: 'Shared', workoutIds: [18] }) };
}
const settle = () => new Promise(setImmediate);
test('shared import taps persist once; a failed handoff retry retains the imported identity and enters setup without activation', async () => {
  const h = importScreenHarness(); const add = h.action('Add to Your routines'); add(); add(); await settle();
  assert.equal(h.calls.filter(c => c === 'import').length, 1);
  h.failContext(true); h.resolve(); await settle();
  assert.ok(h.render().some(n => n.props?.children === 'Added to Your routines'));
  assert.ok(h.render().some(n => typeof n.props?.children === 'string' && n.props.children.includes("Couldn’t add")));
  h.failContext(false); h.action('Continue to Stack')(); await settle();
  assert.deepEqual(h.routes, ['/onboarding-preview']); assert.equal(h.handoff.pending.saved.splitId, 9);
  assert.equal(h.profile.programMode, 'none'); assert.equal(h.calls.filter(c => c === 'import').length, 1);
});
test('explicit Use keeps the current screen on activation failure and retries without re-importing or double navigation', async () => {
  const h = importScreenHarness({ completed: true, saved: { splitId: 9, name: 'Shared' } }); h.failActivation(true);
  h.action('Use this routine')(); await settle(); assert.equal(h.profile.programMode, 'none'); assert.deepEqual(h.routes, []);
  assert.ok(h.render().some(n => n.props?.children === 'Couldn’t save your choice. Try again.'));
  h.failActivation(false); const use = h.action('Use this routine'); use(); use(); await settle();
  assert.equal(h.profile.activeSplitId, 9); assert.deepEqual(h.routes, ['/(tabs)']); assert.equal(h.handoff.pending, null);
  assert.equal(h.calls.filter(c => c === 'import').length, 0);
});
test('Save for later leaves the active program alone; the production import screen retains its previous actions', async () => {
  const h = importScreenHarness({ completed: true, saved: { splitId: 9, name: 'Shared' } }); h.profile.programMode = 'stack';
  h.action('Save for later')(); await settle(); assert.equal(h.profile.programMode, 'stack'); assert.deepEqual(h.routes, ['/your-splits']);
  assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'activate').length, 0);
  const legacy = importScreenHarness({ completed: true, saved: { splitId: 9, name: 'Shared' }, preview: false });
  assert.ok(!legacy.render().some(n => n.props?.children === 'Use this routine')); legacy.action('Done')(); await settle(); assert.deepEqual(legacy.routes, ['/your-splits']);
});
test('retired onboarding routes redirect fresh/completed preview users while the flag-off five-screen flow stays intact', () => {
  for (const completed of [false, true]) {
    const h = renderHarness('@/app/(onboarding)/_layout', { '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: true, FIRST_RUN_ROUTE: '/onboarding-preview' }, '@/store/workoutStore': { useWorkoutStore: selector => selector({ profile: { onboardingCompleted: completed } }) } });
    assert.equal(h.nodes[0].type, 'Redirect'); assert.equal(h.nodes[0].props.href, completed ? '/(tabs)' : '/onboarding-preview');
  }
  const legacy = renderHarness('@/app/(onboarding)/_layout', { '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: false }, '@/store/workoutStore': { useWorkoutStore: selector => selector({ profile: null }) } });
  assert.deepEqual(legacy.nodes.filter(n => n.type === 'Stack.Screen').map(n => n.props.name), ['welcome', 'whatsurname', 'experience', 'current-week', 'split-choice']);
  assert.ok(!legacy.nodes.some(n => n.type === 'Redirect'));
});
test('Help deliberately reopens the retained introduction and returns to its caller; unavailable preview redirects safely', () => {
  const returned = [];
  const h = renderHarness('@/app/stack-help', { '@/features/build/BuildEntry': { __esModule: true, default: 'BuildEntry' }, 'expo-router': { Redirect: 'Redirect', useRouter: () => ({ canGoBack: () => true, back: () => returned.push('caller') }) } });
  assert.equal(h.nodes[0].type, 'BuildEntry'); assert.equal(h.nodes[0].props.forceIntroduction, true); assert.equal(h.nodes[0].props.children, null);
  h.nodes[0].props.onFinish(); assert.deepEqual(returned, ['caller']);
  const off = renderHarness('@/app/stack-help', { '@/features/build/BuildEntry': { __esModule: true, default: 'BuildEntry' }, '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: false } });
  assert.equal(off.nodes[0].type, 'Redirect');
});

test('import attempt is durable before SQL, survives cold load and failed saved-ID writes, and a dismissed link gets a new attempt', async () => {
  const x = handoffHarness(), token = x.token('Crash recovery');
  const first = await x.h.prepareSharedRoutineImport(token);
  assert.match(first, /^[0-9a-f-]{36}$/);
  assert.equal(x.h.useSharedRoutineHandoff.getState().pending.saved, null);
  const cold = handoffHarness(x.disk); await cold.h.loadSharedRoutineHandoff();
  assert.equal(await cold.h.prepareSharedRoutineImport(token), first);
  cold.fail.write = true;
  await assert.rejects(cold.h.rememberSharedRoutine(token, { splitId: 5, name: 'Crash recovery' }));
  const afterCrash = handoffHarness(x.disk); await afterCrash.h.loadSharedRoutineHandoff();
  assert.equal(afterCrash.h.useSharedRoutineHandoff.getState().pending.saved, null);
  assert.equal(await afterCrash.h.prepareSharedRoutineImport(token), first);
  await afterCrash.h.rememberSharedRoutine(token, { splitId: 5, name: 'Crash recovery' });
  assert.equal(afterCrash.h.useSharedRoutineHandoff.getState().pending.attemptId, first);
  await afterCrash.h.clearSharedRoutineHandoff(token);
  assert.notEqual(await afterCrash.h.prepareSharedRoutineImport(token), first);
});
test('a failed attempt write cannot begin SQL import and can be retried', async () => {
  const h = importScreenHarness(); h.failContext(true); h.action('Add to Your routines')(); await settle();
  assert.equal(h.calls.filter(c => c === 'import').length, 0);
  h.failContext(false); h.action('Add to Your routines')(); await settle(); h.resolve(); await settle();
  assert.equal(h.calls.filter(c => c === 'import').length, 1);
});
