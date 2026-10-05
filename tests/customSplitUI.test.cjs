/* global __dirname */
// Production render functions and event handlers with native controls replaced.
// These checks verify behavior; device layout/gestures still require simulator QA.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const lift = (id, name = `Lift ${id}`, group = 'Chest') => ({ id, name, workoutType: group === 'Chest' ? 'chest' : 'back', primaryMuscle: group, equipment: null, loadType: 'external_weight', metric: 'reps', isCustom: false });
const day = (id, exercises = []) => ({ id, customName: '', color: null, exercises, selectedMuscleGroups: [], prefillEnabled: false });
function harness(entry, state, { catalog = [], workoutState = {}, params = {}, db = {}, sharedSave = async () => ({ splitId: 1 }), preview = false, mocks = {}, platform = 'ios', canGoBack = true, reducedMotion = false } = {}) {
  let cursor = 0;
  const hooks = [], effects = [], cleanups = [], events = [], cache = new Map();
  const chain = new Proxy(() => chain, { get: () => chain });
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  const react = { __esModule: true, createElement: element, Fragment: 'Fragment',
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ?? (hooks[i] = { current: initial }); },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps?.some((value, j) => value !== hooks[i][j])) { hooks[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
    useMemo(fn) { return fn(); }, useCallback(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((value, j) => value !== hooks[i].deps[j])) hooks[i] = { fn, deps }; return hooks[i].fn; },
  };
  react.default = react;
  const hook = selector => selector ? selector(state) : state; hook.getState = () => state;
  const workoutHook = selector => selector ? selector(workoutState) : workoutState;
  workoutHook.getState = () => workoutState;
  function load(id) {
    if (id in mocks) return mocks[id];
    if (id === '@/features/sharing/saveSharedRoutineDraft') return { saveSharedRoutineDraft: sharedSave };
    if (id.endsWith('.css')) return {};
    if (id === 'react') return react;
    if (id === 'react-native-url-polyfill') return { URL };
    if (id === 'react-native') return new Proxy({ Platform: { OS: platform }, useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }), StyleSheet: { create: x => x }, Alert: { alert: (...args) => events.push(['alert', ...args]) } }, { get: (o, k) => o[k] ?? String(k) });
    if (id === 'expo-router') return { Stack: { Screen: 'Stack.Screen' }, useNavigation: () => ({ setOptions(options) { events.push(['options', options]); }, addListener: () => () => {} }), useFocusEffect: fn => react.useEffect(fn, [fn]), useLocalSearchParams: () => params, useRouter: () => ({
      back: () => events.push(['back']), push: route => events.push(['push', route]), replace: route => events.push(['replace', route]), dismissTo: route => events.push(['dismissTo', route]), canGoBack: () => canGoBack,
    }) };
    if (id === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (id === 'react-native-reanimated') return new Proxy({ __esModule: true, default: { View: 'Animated.View', ScrollView: 'Animated.ScrollView' }, useReducedMotion: () => reducedMotion, useSharedValue: value => ({ value }), useAnimatedRef: () => react.useRef(null), useAnimatedScrollHandler: () => () => {} }, { get: (o, k) => o[k] ?? chain });
    if ((id === 'expo-haptics' || id === '@/services/haptics')) return new Proxy({ ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }, { get: (o, k) => o[k] ?? (() => Promise.resolve()) });
    if (id === '@/store/muscleColors') return { useMuscleColors: selector => selector ? selector({ preferences: {}, hydrated: true, saving: false, error: null }) : { preferences: {}, hydrated: true, saving: false, error: null } };
    if (id === '@/store/workoutStore') return { useWorkoutStore: workoutHook };
    if (id === '@/store/workoutDatabase') return { readExerciseCatalogSync: () => catalog, ...db };
    if (id === '@/features/onboarding/config') return { ONBOARDING_PREVIEW_ENABLED: preview, FIRST_RUN_ROUTE: '/(onboarding)' };
    if (id === '@/store/onboardingDraft') return { loadOnboardingDraft: async () => {}, clearOnboardingDraft: async () => {}, useOnboardingDraft: { getState: () => ({ draft: { name: 'Sam' } }) } };
    if (id === '@/store/sharedRoutineHandoff') return { loadSharedRoutineHandoff: async () => {}, onboardingDestination: () => '/(tabs)',
      rememberSharedRoutineId: async () => {}, clearSharedRoutineHandoff: async () => {} };
    if (id === '@/store/customSplitDraft') return { flushCustomSplitDrafts: async () => {}, countPendingImports: draft => draft?.workouts.reduce((n, day) => n + (day.pendingImports?.length ?? 0), 0) ?? 0, useCustomSplitDraftStore: hook, getWorkoutDisplayName: day => day.customName || day.exercises.map(e => e.primaryMuscle).filter((v, i, a) => a.indexOf(v) === i).join(', '),
      getDraftPrefillRecommendation: () => null, getMuscleGroupForExercise: exercise => exercise.primaryMuscle, getWorkoutTypeForMuscleGroup: () => 'chest', splitRevision: split => JSON.stringify(split), splitDraftKey: (id, source, shareId) => id !== null ? `edit:${id}` : source === 'shared' ? `shared:${shareId}` : source === 'stack' ? 'stack' : 'new', CUSTOM_SPLIT_MUSCLE_GROUPS: ['Chest', 'Back'], MUSCLE_GROUP_COLORS: { Chest: '#ff7a3d', Back: '#4f8bff' } };
    if (id.startsWith('@/components/')) return new Proxy({ ui: {} }, { get: (o, k) => o[k] ?? String(k) });
    if (id === 'lucide-react-native') return new Proxy({}, { get: (_, k) => String(k) });
    if (!id.startsWith('@/')) throw Error(id);
    if (cache.has(id)) return cache.get(id);
    const file = ['.tsx', '.ts'].map(ext => path.join(root, id.slice(2) + ext)).find(fs.existsSync);
    const exports = {}; cache.set(id, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
    new Function('exports', 'require', 'React', code)(exports, child => load(child.startsWith('.') ? '@/'+path.relative(root,path.resolve(path.dirname(file),child)) : child), react); return exports;
  }
  const component = load(entry).default;
  return { events, unmount() { cleanups.forEach(cleanup => cleanup?.()); }, render() { cursor = 0; const tree = component(); while (effects.length) effects.shift()(); return [tree, { type: 'Stack.Screen', props: { options: events.filter(event => event[0] === 'options').at(-1)?.[1] } }]; } };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  const result = [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.left), ...nodes(tree.props?.right), ...nodes(tree.props?.options?.headerRight?.())];
  if (tree.type === 'FlatList') { result.push(...nodes(tree.props.ListHeaderComponent)); if (!tree.props.data.length) result.push(...nodes(tree.props.ListEmptyComponent)); else result.push(...tree.props.data.flatMap(item => nodes(tree.props.renderItem({ item })))); }
  return result;
}
const action = (tree, title) => nodes(tree).find(node => node.type === 'Action' && node.props.title === title);
const nativeHeader = tree => nodes(tree).find(node => node.type === 'Stack.Screen' && node.props.options?.headerShown).props.options;
const flush = () => new Promise(setImmediate);

test('shared review saves once with Save routine, preserves named empty days, and returns to the library without activation', async () => {
  let saveCalls = 0, finish;
  const state = { draft: { name: 'Shared', workouts: [{ ...day('a'), customName: 'Named empty', color: 'purple' }] },
    source: 'shared', editingSplitId: null, sharedContext: { shareId: 'AAAAAAAAAAAAAAAAAAAAAA' }, drafts: {},
    discardDraft() { throw Error('service owns cleanup'); } };
  const h = harness('@/app/custom-split/review', state, { sharedSave: () => { saveCalls++; return new Promise(resolve => { finish = resolve; }); },
    workoutState: { refreshCustomSplits: async () => {}, setActiveSplit() { throw Error('must not activate'); },
      saveCustomSplitDraft() { throw Error('must use importer'); } } });
  let tree = h.render();
  assert.equal(action(tree, 'Save and use'), undefined); assert.equal(action(tree, 'Save for later'), undefined);
  const save = action(tree, 'Save routine'); assert.equal(save.props.disabled, false);
  save.props.onPress(); save.props.onPress(); await flush(); assert.equal(saveCalls, 1);
  finish({ splitId: 7 }); await flush();
  assert.deepEqual(h.events.at(-1), ['dismissTo', { pathname: '/your-splits', params: { source: 'shared' } }]);
});

test('shared save failure displays concise retry copy and keeps the editor draft', async () => {
  const draft = { name: 'Shared', workouts: [day('a', [lift(-1)])] };
  const state = { draft, source: 'shared', editingSplitId: null, discardDraft() { throw Error('must retain'); } };
  let fail = true;
  const h = harness('@/app/custom-split/review', state, { sharedSave: async () => { if (fail) throw Error('SQL private routine'); },
    workoutState: { refreshCustomSplits: async () => {} } });
  action(h.render(), 'Save routine').props.onPress(); await flush();
  let tree = h.render(); assert.equal(state.draft, draft);
  assert.ok(nodes(tree).some(node => node.type === 'Text' && node.props.children?.includes('Couldn’t save your routine. Your draft is still here. Try again.')));
  assert.doesNotMatch(JSON.stringify(tree), /SQL private/);
  fail = false; action(tree, 'Save routine').props.onPress(); await flush();
  assert.equal(h.events.at(-1)[0], 'dismissTo');
});

test('shared builder resumes its own slot and recovers an already committed receipt without saving again', async () => {
  const id = 'AAAAAAAAAAAAAAAAAAAAAA'; let resumed = 0, cleared = 0;
  const state = { hydrated: true, source: 'library', draft: null, editingSplitId: null, drafts: {},
    closeDraft() {}, resumeDraft(_splitId, source, shareId) { assert.equal(source, 'shared'); assert.equal(shareId, id);
      resumed++; Object.assign(this, { source: 'shared', sharedContext: { shareId: id, attemptId: 'receipt' },
        draft: { name: 'Shared', workouts: [day('a', [lift(-1)])] }, activeWorkoutId: 'a' }); return true; },
    discardDraft() { cleared++; this.draft = null; } };
  const h = harness('@/app/custom-split/index', state, { params: { source: 'shared', shareId: id },
    db: { hasSharedSplitImportReceiptSync: attempt => { assert.equal(attempt, 'receipt'); return true; } } });
  h.render(); await flush(); assert.equal(resumed, 1); assert.equal(cleared, 1);
  assert.deepEqual(h.events.at(-1), ['replace', { pathname: '/your-splits', params: { source: 'shared' } }]);
});

test('older builder cleanup cannot close a different shared context', async () => {
  let closed = 0;
  const state = { hydrated: true, source: 'shared', sharedContext: { shareId: 'AAAAAAAAAAAAAAAAAAAAAA' },
    draft: { name: 'Shared', workouts: [day('a', [lift(-1)])] }, activeWorkoutId: 'a', editingSplitId: null,
    closeDraft() { closed++; } };
  const h = harness('@/app/custom-split/index', state, { params: { source: 'shared', shareId: 'AAAAAAAAAAAAAAAAAAAAAA' } });
  h.render(); await flush(); state.sharedContext = { shareId: 'BBBBBBBBBBBBBBBBBBBBBQ' }; h.unmount();
  assert.equal(closed, 0);
});

test('shared custom exercise creation stages a temporary definition instead of writing the catalog', () => {
  const selected = [];
  const state = { source: 'shared', draft: { name: 'Shared', workouts: [day('a')] },
    picker: { workoutId: 'a', selected }, allocateSharedExerciseId: () => -5,
    updatePicker(update) { Object.assign(this.picker, update); }, addExercise() { throw Error('picker stages first'); } };
  const h = harness('@/app/custom-split/new-exercise', state, { params: { workoutId: 'a', picker: '1', initialName: 'Staged curl' },
    workoutState: { createCustomExercise() { throw Error('must not write'); } } });
  let tree = h.render();
  nodes(tree).find(node => node.props.accessibilityLabel === 'Chest').props.onPress();
  nodes(tree).find(node => node.props.accessibilityLabel === 'No equipment').props.onPress();
  tree = h.render();
  nodes(tree).find(node => node.props.accessibilityLabel === 'Create exercise').props.onPress();
  assert.equal(state.picker.selected[0].id, -5); assert.equal(state.picker.selected[0].portable.kind, 'custom');
  assert.equal(state.draft.workouts[0].exercises.length, 0); assert.equal(h.events.at(-1)[0], 'back');
});

test('library offers recovery of shared drafts alongside an unfinished normal draft', async () => {
  const id = 'AAAAAAAAAAAAAAAAAAAAAA'; let closed = 0;
  const state = { hydrated: true, drafts: { new: { draft: { name: 'Local' } }, [`shared:${id}`]: {
    source: 'shared', editingSplitId: null, draft: { name: 'Shared' }, sharedContext: { shareId: id } } }, closeDraft() { closed++; } };
  const h = harness('@/app/your-splits', state, { workoutState: { customSplits: [], profile: { programMode: 'none' }, refreshCustomSplits: async () => {} } });
  h.render(); await flush(); const tree = h.render();
  const resume = nodes(tree).find(node => node.type === 'Action' && node.props.label === 'Continue Shared');
  resume.props.onPress(); assert.equal(closed, 1);
  assert.deepEqual(h.events.at(-1), ['push', { pathname: '/custom-split', params: { source: 'shared', shareId: id } }]);
  assert.ok(state.drafts.new);
});

test('shared entry displays loading, opens the existing editor with its context, and cancels on exit', async () => {
  const id = 'AAAAAAAAAAAAAAAAAAAAAA'; let release, cancelled = 0;
  const h = harness('@/app/shared-routine', { hydrated: true }, { params: { id },
    workoutState: { isHydrated: true, profile: { onboardingCompleted: true } },
    db: { EXERCISE_SEEDS: [], ARCHETYPE_EXERCISE_SEEDS: [] }, mocks: {
      '@/features/sharing/routineShareClient': { SharedRoutineLoadFailure: class extends Error {} },
      '@/features/sharing/sharedRoutineEntry': { createSharedRoutineEntry(deps) { return {
        load(value) { assert.equal(value, id); return new Promise(resolve => { release = () => { deps.openEditor(id); resolve(); }; }); },
        cancel() { cancelled++; },
      }; } },
    } });
  const tree = h.render(); assert.ok(nodes(tree).find(node => node.props.accessibilityLabel === 'Loading routine'));
  release(); await flush();
  assert.deepEqual(h.events.at(-1), ['replace', { pathname: '/custom-split', params: { source: 'shared', shareId: id } }]);
  h.unmount(); assert.equal(cancelled, 1);
});

test('first-run shared entry persists only the ID before setup and never fetches or opens the editor', async () => {
  const id = 'AAAAAAAAAAAAAAAAAAAAAA', ids = []; let release;
  const h = harness('@/app/shared-routine', { hydrated: false }, { params: { id },
    workoutState: { isHydrated: true, profile: null }, db: { EXERCISE_SEEDS: [], ARCHETYPE_EXERCISE_SEEDS: [] }, mocks: {
      '@/store/sharedRoutineHandoff': { rememberSharedRoutineId(value) { ids.push(value); return new Promise(resolve => { release = resolve; }); } },
      '@/features/sharing/sharedRoutineEntry': { createSharedRoutineEntry() { return { load() { throw Error('must not load during setup'); }, cancel() {} }; } },
    } });
  h.render(); assert.deepEqual(ids, [id]); assert.deepEqual(h.events, []);
  release(); await flush(); assert.deepEqual(h.events.at(-1), ['replace', '/(onboarding)']);
});
test('a first-run handoff completing after the entry loses focus cannot take navigation back', async () => {
  const id = 'AAAAAAAAAAAAAAAAAAAAAA'; let release;
  const h = harness('@/app/shared-routine', { hydrated: false }, { params: { id },
    workoutState: { isHydrated: true, profile: null }, db: { EXERCISE_SEEDS: [], ARCHETYPE_EXERCISE_SEEDS: [] }, mocks: {
      '@/store/sharedRoutineHandoff': { rememberSharedRoutineId: () => new Promise(resolve => { release = resolve; }) },
      '@/features/sharing/sharedRoutineEntry': { createSharedRoutineEntry: () => ({ load() { throw Error('must not fetch'); }, cancel() {} }) },
    } });
  h.render(); h.unmount(); release(); await flush(); assert.deepEqual(h.events, []);
});

for (const platform of ['ios', 'android']) {
  test(`library: ${platform} top-right menu opens Paste my routine without changing drafts`, () => {
    let actions;
    const drafts = { new: { draft: { name: 'Unfinished' } } };
    const state = { drafts, hydrated: true, closeDraft() { throw Error('opening paste must preserve drafts'); } };
    const workoutState = { profile: { onboardingCompleted: true, programMode: 'none' }, customSplits: [], refreshCustomSplits: async () => {} };
    const h = harness('@/app/your-splits', state, { platform, workoutState,
      mocks: { '@/components/custom-split/showActions': { showActions(_title, items) { actions = items; } } } });
    const header = nativeHeader(h.render());
    if (platform === 'ios') {
      const menu = header.unstable_headerRightItems()[0];
      assert.equal(menu.type, 'menu');
      assert.equal(menu.icon.name, 'ellipsis');
      actions = menu.menu.items;
      assert.equal(actions[0].label, 'Paste my routine');
    } else {
      header.headerRight().props.onPress();
      assert.equal(actions[0].title, 'Paste my routine');
    }
    actions[0].onPress();
    assert.deepEqual(h.events.at(-1), ['push', '/paste-routine']);
    assert.equal(state.drafts, drafts);
  });
}

for (const completed of [false, true]) {
  test(`paste screen: ${completed ? 'returning user' : 'onboarding'} parses into the correct review flow`, async () => {
    const imports = [], requests = [];
    const result = { routine: { name: null, workouts: [{ id: 'w1', name: 'Push', exercises: [
      { id: 'e1', rawName: 'bench', status: 'matched', matchedName: 'Bench Press', suggestedMatch: null, alternatives: [] },
      { id: 'e2', rawName: 'shoulder press', status: 'uncertain', matchedName: null, suggestedMatch: null, alternatives: [] },
    ] }] } };
    const state = { initializeImportedDraft(...args) { imports.push(args); } };
    const h = harness('@/app/paste-routine', state, {
      workoutState: { profile: completed ? { onboardingCompleted: true } : null }, catalog: [lift(1, 'Bench Press')],
      db: { initializeWorkoutDatabase: async () => {}, getNextCustomSplitNameAsync: async () => 'My routine' },
      mocks: { '@/features/routineImport/client': { PASTE_PARSE_MESSAGES: {}, checkPastedText: () => null,
        parsePastedRoutine: async (text, options) => { requests.push([text, options]); return result; } } },
    });
    let tree = h.render();
    assert.ok(nodes(tree).some(node => node.type === 'TextInput'), 'completed users can access the paste screen');
    nodes(tree).find(node => node.type === 'TextInput').props.onChangeText('Push\nbench 3x8\nshoulder press');
    tree = h.render(); action(tree, 'Continue').props.onPress(); await flush();
    assert.equal(requests[0][0], 'Push\nbench 3x8\nshoulder press');
    assert.ok(requests[0][1].signal instanceof AbortSignal);
    const source = completed ? 'library' : 'onboarding';
    assert.equal(imports.length, 1);
    assert.equal(imports[0][0], 'My routine');
    assert.equal(imports[0][2], source);
    assert.equal(imports[0][1][0].exercises[0].name, 'Bench Press');
    assert.equal(imports[0][1][0].pending[0].rawName, 'shoulder press');
    assert.deepEqual(h.events.at(-1), ['push', { pathname: '/custom-split', params: { source } }]);
    const back = nativeHeader(h.render()).unstable_headerLeftItems()[0];
    assert.equal(back.accessibilityLabel, completed ? 'Back to Your routines' : 'Back to import choices');
    back.onPress(); assert.deepEqual(h.events.at(-1), ['back']);
    const cold = harness('@/app/paste-routine', state, { canGoBack: false,
      workoutState: { profile: completed ? { onboardingCompleted: true } : null } });
    action(cold.render(), 'Back').props.onPress();
    assert.deepEqual(cold.events.at(-1), ['replace', completed ? '/your-splits' : '/bring-workouts']);
  });
}

for (const activate of [false, true]) {
  test(`library pasted routine: ${activate ? 'save and use' : 'save for later'} returns to routines without onboarding changes`, async () => {
    const calls = [];
    const profile = { onboardingCompleted: true, programMode: 'stack' };
    const state = { draft: { name: 'Pasted', workouts: [day('a', [lift(1)])] }, source: 'library', editingSplitId: null,
      discardDraft() { this.draft = null; } };
    const h = harness('@/app/custom-split/review', state, { workoutState: { profile,
      saveCustomSplitDraft: async (...args) => { calls.push(args); return 41; },
      completeNoProgramOnboarding() { throw Error('must not restart onboarding'); },
    } });
    action(h.render(), activate ? 'Save and use' : 'Save for later').props.onPress(); await flush();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0][2], { activate, completeOnboarding: false });
    assert.equal(state.draft, null);
    assert.deepEqual(h.events.at(-1), ['dismissTo', '/your-splits']);
    assert.equal(profile.onboardingCompleted, true);
  });
}

test('empty day leads directly to picker without a muscle selection, naming field or prefill toggle', async () => {
  const workout = day('a');
  const state = { draft: { name: 'My split', workouts: [workout] }, activeWorkoutId: 'a', editingSplitId: null, hydrated: true, drafts: {}, closeDraft() {}, openPicker(id) { this.picker = { workoutId: id }; } };
  const h = harness('@/app/custom-split/index', state);
  h.render(); await flush(); const tree = h.render();
  assert.equal(nodes(tree).some(node => node.type === 'TextInput'), false);
  assert.ok(action(tree, 'Add exercises')); assert.ok(action(tree, 'Review routine'));
  assert.equal(action(tree, 'Review routine').props.pill, true);
  assert.ok(action(tree, 'Settings'));
  assert.equal(action(tree, 'Day settings'), undefined);
  const header = nodes(tree).find(node => node.type === 'Stack.Screen' && node.props.options?.headerShown).props.options;
  assert.equal(header.headerShown, true);
  assert.equal(header.headerBackButtonDisplayMode, 'minimal');
  assert.equal(header.headerLeft, undefined);
  assert.equal(header.unstable_headerLeftItems()[0].icon.name, 'chevron.left');
  const reviewButton = header.unstable_headerRightItems()[0];
  assert.equal(reviewButton.type, 'button');
  assert.equal(reviewButton.variant, 'plain');
  assert.equal(reviewButton.element, undefined);
  assert.equal(reviewButton.disabled, false);
  reviewButton.onPress();
  assert.deepEqual(h.events.at(-1), ['push', '/custom-split/review']);
  action(tree, 'Add exercises').props.onPress();
  assert.equal(state.picker.workoutId, 'a'); assert.deepEqual(h.events.at(-1), ['push', '/custom-split/exercises']);
});

test('editor and review keep their native headers and content insets stable across navigation', () => {
  const layout = harness('@/app/custom-split/_layout', {}).render();
  const screens = nodes(layout).filter(node => node.type === 'Stack.Screen');
  for (const name of ['index', 'review']) {
    assert.equal(screens.find(node => node.props.name === name).props.options.headerShown, true);
  }
  const state = { draft: { name: 'Routine', workouts: [day('a', [lift(1)])] }, source: 'library', editingSplitId: 7,
    selectWorkout(id) { this.activeWorkoutId = id; } };
  const h = harness('@/app/custom-split/review', state);
  const tree = h.render();
  assert.deepEqual(nodes(tree).find(node => node.type === 'SafeAreaView').props.edges, ['left', 'right', 'bottom']);
  assert.equal(nodes(tree).some(node => node.type === 'Header'), false);
  assert.equal(h.events.some(event => event[0] === 'options' && 'headerShown' in event[1]), false);
  const header = nativeHeader(tree);
  assert.equal(header.headerBackVisible, false);
  const back = header.unstable_headerLeftItems()[0];
  assert.equal(back.icon.name, 'chevron.left');
  back.onPress();
  assert.deepEqual(h.events.at(-1), ['back']);
  action(tree, 'Edit workout').props.onPress();
  assert.equal(state.activeWorkoutId, 'a');
  assert.deepEqual(h.events.at(-1), ['back']);
});

test('new split exposes confirmed discard in the native top-right menu, with no delete or buried discard button', () => {
  let discarded = 0;
  const state = { draft: { name: 'Routine', workouts: [day('a', [lift(1)])] }, source: 'library', editingSplitId: null,
    discardDraft() { discarded++; this.draft = null; } };
  const h = harness('@/app/custom-split/review', state);
  const tree = h.render();
  assert.equal(action(tree, 'Discard draft'), undefined);
  const menu = nativeHeader(tree).unstable_headerRightItems()[0];
  assert.equal(menu.type, 'menu');
  assert.equal(menu.icon.name, 'ellipsis');
  assert.deepEqual(menu.menu.items.map(item => item.label), ['Discard draft']);
  menu.menu.items[0].onPress();
  assert.equal(discarded, 0);
  const confirmation = h.events.at(-1);
  assert.equal(confirmation[0], 'alert');
  assert.equal(confirmation[3][0].style, 'cancel');
  confirmation[3].find(button => button.text === 'Discard draft').onPress();
  assert.equal(discarded, 1);
  assert.deepEqual(h.events.at(-1), ['dismissTo', '/your-splits']);
});

test('saved split menu confirms deletion, locks navigation while pending and only discards after deletion succeeds', async () => {
  let discarded = 0, finishDelete;
  const deleted = [];
  const state = { draft: { name: 'Routine', workouts: [day('a', [lift(1)])] }, editingSplitId: 7,
    discardDraft() { discarded++; this.draft = null; } };
  const h = harness('@/app/custom-split/review', state, {
    workoutState: { deleteSplit: id => { deleted.push(id); return new Promise(resolve => { finishDelete = resolve; }); } },
    db: { getCustomSplitDetailAsync: async () => null },
  });
  const menu = nativeHeader(h.render()).unstable_headerRightItems()[0];
  assert.deepEqual(menu.menu.items.map(item => item.label), ['Discard draft', 'Delete routine']);
  const remove = menu.menu.items[1];
  assert.equal(remove.destructive, true);
  remove.onPress();
  assert.deepEqual(deleted, []);
  h.events.at(-1)[3].find(button => button.text === 'Delete routine').onPress();
  assert.deepEqual(deleted, [7]);
  assert.equal(discarded, 0);
  const pending = nativeHeader(h.render());
  assert.equal(pending.gestureEnabled, false);
  assert.equal(pending.unstable_headerLeftItems()[0].disabled, true);
  assert.equal(pending.unstable_headerRightItems()[0].disabled, true);
  remove.onPress(); assert.deepEqual(deleted, [7]);
  finishDelete(); await flush();
  assert.equal(discarded, 1);
  assert.deepEqual(h.events.at(-1), ['dismissTo', '/your-splits']);
});

test('failed saved split deletion retains the draft and restores navigation, including guarded failures that resolve', async () => {
  for (const rejects of [false, true]) {
    let discarded = false;
    const state = { draft: { name: 'Routine', workouts: [day('a', [lift(1)])] }, editingSplitId: 7,
      discardDraft() { discarded = true; } };
    const h = harness('@/app/custom-split/review', state, {
      workoutState: { deleteSplit: async () => { if (rejects) throw new Error('Could not delete this split.'); } },
      db: { getCustomSplitDetailAsync: async () => ({ id: 7 }) },
    });
    nativeHeader(h.render()).unstable_headerRightItems()[0].menu.items[1].onPress();
    h.events.at(-1)[3].find(button => button.text === 'Delete routine').onPress(); await flush();
    const tree = h.render();
    assert.equal(discarded, false);
    assert.match(JSON.stringify(tree), /Couldn’t delete this routine/);
    assert.equal(nativeHeader(tree).gestureEnabled, true);
    assert.equal(h.events.some(event => event[0] === 'dismissTo'), false);
  }
});

test('picker defaults to complete catalog, selects in tap order, preserves pending selection across search, commits once', () => {
  const a = lift(1), b = lift(2, 'Row', 'Back'), c = lift(3);
  const state = { draft: { workouts: [day('a', [a])] }, picker: { workoutId: 'a', query: '', group: null, selected: [] },
    updatePicker(update) { Object.assign(this.picker, update); }, addExercise(_id, e) { this.draft.workouts[0].exercises.push(e); }, closePicker() { this.picker = null; } };
  const h = harness('@/app/custom-split/exercises', state, { catalog: [a, b, c] });
  let tree = h.render(); const choices = nodes(tree).filter(node => node.props?.accessibilityRole === 'checkbox');
  assert.equal(choices.length, 3); assert.equal(choices[0].props.disabled, true);
  choices[2].props.onPress(); tree = h.render();
  nodes(tree).find(node => node.props?.accessibilityLabel === 'Row').props.onPress();
  state.updatePicker({ query: 'No match' }); tree = h.render();
  assert.ok(action(tree, 'Create exercise')); assert.equal(state.picker.selected.length, 2);
  action(tree, 'Add 2 exercises').props.onPress(); assert.deepEqual(state.draft.workouts[0].exercises.map(e => e.id), [1, 3, 2]);
  assert.equal(state.picker, null); assert.deepEqual(h.events.at(-1), ['back']);
});

test('review blocks empty days, offers save for later, and retains draft on save failure', async () => {
  let discarded = false;
  const state = { draft: { name: 'Routine', workouts: [day('a', [lift(1)]), day('b')] }, source: 'library', editingSplitId: null, discardDraft() { discarded = true; } };
  const calls = [];
  const h = harness('@/app/custom-split/review', state, { workoutState: { saveCustomSplitDraft: async (...args) => { calls.push(args); return undefined; } } });
  let tree = h.render(); assert.equal(action(tree, 'Save and use').props.disabled, true);
  state.draft.workouts.pop(); tree = h.render(); action(tree, 'Save for later').props.onPress(); await flush();
  assert.equal(calls[0][2].activate, false); assert.equal(discarded, false);
  tree = h.render(); assert.match(JSON.stringify(tree), /Couldn’t save your routine/);
});

test('review rejects stale source before writing and offers recovery as a new split', async () => {
  let writes = 0;
  const state = { draft: { name: 'Routine', workouts: [day('a', [lift(1)])] }, editingSplitId: 7, source: 'library', sourceRevision: 'old', drafts: {} };
  const h = harness('@/app/custom-split/review', state, { db: { getCustomSplitDetailAsync: async () => ({ id: 7, updatedAt: 'new' }) }, workoutState: { updateCustomSplitDraft: async () => { writes++; return true; } } });
  action(h.render(), 'Save changes').props.onPress(); await flush(); const tree = h.render();
  assert.equal(writes, 0); assert.ok(action(tree, 'Recover draft')); assert.equal(action(tree, 'Save changes').props.disabled, true);
});

test('create exercise accepts no equipment and returns it selected to the picker without changing the day', () => {
  const catalog = [];
  const state = { draft: { workouts: [day('a')] }, picker: { workoutId: 'a', query: 'Floor hold', selected: [lift(1)] },
    updatePicker(update) { Object.assign(this.picker, update); }, addExercise() { throw Error('must not add directly'); } };
  const definitions = [];
  const h = harness('@/app/custom-split/new-exercise', state, { catalog, params: { workoutId: 'a', picker: '1', initialName: 'Floor hold' }, workoutState: {
    createCustomExercise: (...args) => { definitions.push(args); catalog.push({ ...lift(99, args[0]), equipment: args[3], loadType: args[4], metric: args[5] }); return 99; },
  } });
  let tree = h.render(); nodes(tree).find(node => node.props?.accessibilityLabel === 'Chest').props.onPress();
  tree = h.render(); nodes(tree).find(node => node.props?.accessibilityLabel === 'No equipment').props.onPress();
  tree = h.render(); nodes(tree).find(node => node.type?.name === 'ChoiceRow' && node.props.label === 'LOAD').props.onSelect('bodyweight');
  tree = h.render(); nodes(tree).find(node => node.type?.name === 'ChoiceRow' && node.props.label === 'MEASURE').props.onSelect('duration');
  tree = h.render(); nodes(tree).find(node => node.props?.accessibilityLabel === 'Create exercise').props.onPress();
  assert.deepEqual(definitions[0], ['Floor hold', 'chest', 'Chest', null, 'bodyweight', 'duration']);
  assert.equal(state.draft.workouts[0].exercises.length, 0);
  assert.deepEqual(state.picker.selected.map(e => e.id), [1, 99]); assert.equal(state.picker.query, 'Floor hold');
  assert.deepEqual(h.events.at(-1), ['back']);
});

test('Stack template is a preview until explicitly applied to an empty day', () => {
  let merged = null;
  const state = { draft: { workouts: [day('a')] }, activeWorkoutId: 'a', mergePrefill: (id, exercises) => { merged = { id, exercises }; } };
  const exercises = [lift(1), lift(2)];
  const h = harness('@/app/custom-split/template', state, { workoutState: {}, db: { readArchetypeVariantsSync: () => ['a'], readArchetypeTemplateCatalogSync: () => exercises } });
  const tree = h.render(); assert.equal(merged, null); assert.match(JSON.stringify(tree), /Preview/);
  action(tree, 'Use this workout').props.onPress(); assert.deepEqual(merged, { id: 'a', exercises });
});

test('selected preview survives filters; searching or removing the last choice returns to browsing', () => {
  const a = lift(1, 'Bench Press'), b = lift(2, 'Row', 'Back');
  const state = { draft: { workouts: [day('a')] }, picker: { workoutId: 'a', query: '', group: 'Chest', selected: [b] },
    updatePicker(update) { this.picker = { ...this.picker, ...update }; } };
  const h = harness('@/app/custom-split/exercises', state, { catalog: [a, b] });
  let tree = h.render();
  assert.equal(nodes(tree).filter(n => n.props.accessibilityRole === 'checkbox').length, 1);
  action(tree, 'View selected (1)').props.onPress(); tree = h.render();
  const selected = nodes(tree).filter(n => n.props.accessibilityRole === 'checkbox');
  assert.equal(selected[0].props.accessibilityLabel, 'Row');
  nodes(tree).find(n => n.type === 'ExerciseSearchInput').props.onChangeText('Bench'); tree = h.render();
  assert.equal(nodes(tree).filter(n => n.props.accessibilityRole === 'checkbox')[0].props.accessibilityLabel, 'Bench Press');
  assert.equal(state.picker.selected.length, 1);
  action(tree, 'View selected (1)').props.onPress(); tree = h.render();
  nodes(tree).find(n => n.props.accessibilityLabel === 'Row').props.onPress(); tree = h.render();
  assert.equal(state.picker.selected.length, 0);
  assert.ok(action(tree, 'Select exercises to add'));
  assert.equal(nodes(tree).filter(n => n.props.accessibilityRole === 'checkbox')[0].props.accessibilityLabel, 'Bench Press');
});

test('library activates the chosen split, refreshes its detail, and shows its active status', async () => {
  let refreshes = 0, closed = 0;
  const state = { drafts: {}, hydrated: true, closeDraft() { closed++; } };
  const workoutState = {
    profile: { activeSplitId: null, programMode: 'stack' }, customSplits: [{ id: 7, name: 'My split', workoutCount: 2, exerciseCount: 5 }],
    refreshCustomSplits: async () => { refreshes++; },
    setActiveSplit(id) { this.profile = { activeSplitId: id, programMode: id === null ? 'stack' : 'custom' }; },
  };
  const h = harness('@/app/your-splits', state, { workoutState });
  let tree = h.render(); await flush(); assert.equal(refreshes, 1);
  const edit = action(tree, 'Edit routine'); assert.equal(edit.props.compact, true);
  edit.props.onPress(); assert.equal(closed, 1);
  assert.deepEqual(h.events.at(-1), ['push', { pathname: '/custom-split', params: { source: 'library', splitId: '7' } }]);
  const activation = nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'My split');
  assert.equal(activation.props.active, false);
  activation.props.onPress(); tree = h.render(); await flush();
  assert.equal(workoutState.profile.activeSplitId, 7);
  assert.equal(refreshes, 2);
  assert.equal(nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'My split').props.active, true);
  const stack = nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'Stack’s plan');
  assert.equal(stack.props.active, false);
  stack.props.onPress(); tree = h.render(); await flush();
  assert.deepEqual(h.events.at(-1), ['push', { pathname: '/program-setup', params: { source: 'splits' } }]);
  assert.equal(workoutState.profile.activeSplitId, 7, 'Browsing the program does not activate it');
  assert.equal(nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'Stack’s plan').props.active, false);
});

test('library confirms activation in place, then reorders; rapid taps and failed writes preserve the latest selection', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let fail = false;
  const workoutState = {
    profile: { programMode: 'custom', activeSplitId: 1 },
    customSplits: [1, 2, 3].map(id => ({ id, name: `Routine ${id}`, workoutCount: 1, exerciseCount: 2 })),
    refreshCustomSplits: async () => {},
    setActiveSplit(id) { if (!fail) this.profile = { programMode: 'custom', activeSplitId: id }; },
  };
  const h = harness('@/app/your-splits', { drafts: {}, hydrated: true, closeDraft() {} }, { workoutState });
  const pills = tree => nodes(tree).filter(n => n.type === 'SplitActivationPill' && n.props.name.startsWith('Routine'));
  const order = tree => pills(tree).map(n => n.props.name);
  const activate = id => {
    pills(h.render()).find(n => n.props.name === `Routine ${id}`).props.onPress();
    return h.render();
  };
  let tree = activate(2);
  assert.deepEqual(order(tree), ['Routine 1', 'Routine 2', 'Routine 3']);
  assert.equal(pills(tree).find(n => n.props.name === 'Routine 2').props.active, true);
  t.mock.timers.tick(119);
  assert.equal(order(h.render())[0], 'Routine 1');
  t.mock.timers.tick(1);
  assert.equal(order(h.render())[0], 'Routine 2');
  activate(3);
  t.mock.timers.tick(60);
  activate(1);
  t.mock.timers.tick(60);
  assert.equal(order(h.render())[0], 'Routine 2', 'the superseded activation must not reorder the cards');
  t.mock.timers.tick(60);
  assert.equal(order(h.render())[0], 'Routine 1');
  fail = true;
  tree = activate(3);
  t.mock.timers.tick(120);
  assert.equal(order(h.render())[0], 'Routine 1');
  assert.equal(pills(tree).find(n => n.props.name === 'Routine 3').props.active, false);
  activate(2);
  h.unmount();
});

test('library respects Reduce Motion by reordering without a confirmation delay', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const workoutState = {
    profile: { programMode: 'custom', activeSplitId: 1 },
    customSplits: [1, 2].map(id => ({ id, name: `Routine ${id}`, workoutCount: 1, exerciseCount: 2 })),
    refreshCustomSplits: async () => {},
    setActiveSplit(id) { this.profile = { programMode: 'custom', activeSplitId: id }; },
  };
  const h = harness('@/app/your-splits', { drafts: {}, hydrated: true, closeDraft() {} }, { workoutState, reducedMotion: true });
  nodes(h.render()).find(n => n.type === 'SplitActivationPill' && n.props.name === 'Routine 2').props.onPress();
  h.render();
  const pills = nodes(h.render()).filter(n => n.type === 'SplitActivationPill');
  assert.equal(pills[0].props.name, 'Routine 2');
  assert.equal(pills[0].props.active, true);
  h.unmount();
});

for (const mode of ['stack', 'custom']) {
  test(`library: Train as you go leaves saved routines intact from ${mode} mode`, async () => {
    const drafts = { drafts: {}, hydrated: true, closeDraft() {} };
    const saved = [{ id: 7, name: 'My split', workoutCount: 2, exerciseCount: 5 }];
    const workoutState = { profile: { programMode: mode, activeSplitId: mode === 'custom' ? 7 : null }, customSplits: saved,
      refreshCustomSplits: async () => {}, chooseNoProgram() { this.profile = { programMode: 'none', activeSplitId: null }; } };
    const h = harness('@/app/your-splits', drafts, { workoutState });
    const choose = action(h.render(), 'Train as you go');
    assert.equal(choose.props.disabled, false);
    choose.props.onPress();
    const tree = h.render(); await flush();
    assert.equal(workoutState.profile.programMode, 'none');
    assert.equal(workoutState.customSplits, saved);
    assert.equal(nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'Stack’s plan').props.active, false);
    assert.equal(nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'My split').props.active, false);
    assert.equal(action(tree, 'Train as you go').props.disabled, true);
    assert.match(JSON.stringify(tree), /CURRENT · NO PLAN/);
  });
}

test('library: failed no-program persistence keeps the selected program and saved routines', () => {
  const saved = [{ id: 7, name: 'My split', workoutCount: 2, exerciseCount: 5 }];
  const workoutState = { profile: { programMode: 'custom', activeSplitId: 7 }, customSplits: saved,
    refreshCustomSplits: async () => {}, chooseNoProgram() {} };
  const h = harness('@/app/your-splits', { drafts: {}, hydrated: true, closeDraft() {} }, { workoutState });
  action(h.render(), 'Train as you go').props.onPress();
  const tree = h.render();
  assert.equal(workoutState.profile.programMode, 'custom');
  assert.equal(workoutState.customSplits, saved);
  assert.equal(nodes(tree).find(node => node.type === 'SplitActivationPill' && node.props.name === 'My split').props.active, true);
});

test('library: Stack and saved-routine discovery prioritize the requested section without activation', () => {
  const workoutState = { profile: { programMode: 'none', activeSplitId: null },
    customSplits: [{ id: 7, name: 'Saved upper', workoutCount: 1, exerciseCount: 3 }], refreshCustomSplits: async () => {} };
  for (const focus of ['stack', 'library']) {
    const tree = harness('@/app/your-splits', { drafts: {}, hydrated: true, closeDraft() {} }, { workoutState, params: { focus } }).render();
    const pills = nodes(tree).filter(node => node.type === 'SplitActivationPill');
    assert.equal(pills[0].props.name, focus === 'stack' ? 'Stack’s plan' : 'Saved upper');
    assert.ok(pills.every(pill => !pill.props.active));
    assert.equal(workoutState.profile.programMode, 'none');
  }
});

test('preview library: Stack discovery opens configuration; an existing Stack’s plan edits in the routine editor', () => {
  for (const mode of ['none','custom','stack']) {
    let activations=0;
    const workoutState={profile:{onboardingCompleted:true,programMode:mode,activeSplitId:mode==='custom'?7:null},customSplits:[],
      refreshCustomSplits:async()=>{},setActiveSplit(){activations++;}};
    const h=harness('@/app/your-splits',{drafts:{},hydrated:true,closeDraft(){}},{workoutState,preview:true});
    const tree=h.render();
    const stack=nodes(tree).find(node=>node.type==='SplitActivationPill' && node.props.name==='Stack’s plan');
    if(mode!=='stack')stack.props.onPress();
    action(tree,'Edit Stack’s plan').props.onPress();
    const pushes=h.events.filter(event=>event[0]==='push').map(event=>JSON.stringify(event[1]));
    const setup=JSON.stringify({pathname:'/program-setup',params:{source:'splits'}});
    if(mode==='stack') assert.deepEqual(pushes,[JSON.stringify({pathname:'/custom-split',params:{source:'stack'}})]);
    else assert.deepEqual(pushes,[setup,setup]);
    assert.equal(activations,0);assert.equal(workoutState.profile.programMode,mode);
  }
});

test('library: an edited Stack’s plan stays out of the library, edits in place and reactivates directly', () => {
  for (const active of [true, false]) {
    const activated=[];
    const workoutState={profile:{onboardingCompleted:true,programMode:'custom',activeSplitId:active?9:7},
      customSplits:[{id:9,name:'Stack’s plan',workoutCount:2,exerciseCount:8,isStackPlan:true},{id:7,name:'Saved upper',workoutCount:1,exerciseCount:3}],
      refreshCustomSplits:async()=>{},setActiveSplit(id){activated.push(id);}};
    const h=harness('@/app/your-splits',{drafts:{},hydrated:true,closeDraft(){}},{workoutState,preview:true});
    const tree=h.render();
    const pills=nodes(tree).filter(node=>node.type==='SplitActivationPill');
    assert.deepEqual(pills.map(pill=>pill.props.name).sort(),['Saved upper','Stack’s plan']);
    const stack=pills.find(pill=>pill.props.name==='Stack’s plan');
    assert.equal(stack.props.active,active);
    assert.match(JSON.stringify(tree),/2 workouts · 8 exercises/);
    assert.match(JSON.stringify(tree),/"YOUR LIBRARY · ",1\]/);
    stack.props.onPress();
    action(tree,'Edit Stack’s plan').props.onPress();
    assert.deepEqual(activated,[9]);
    assert.deepEqual(h.events.filter(event=>event[0]==='push').map(event=>event[1]),[{pathname:'/custom-split',params:{source:'stack',splitId:'9'}}]);
  }
});

test('review saves the first Stack’s plan edit as Stack’s plan, never as a new routine', async () => {
  for (const mode of ['stack', 'custom']) {
    let discarded=false;
    const calls=[];
    const state={draft:{name:'Stack’s plan',workouts:[day('a',[lift(1)]),day('b',[lift(2)])]},source:'stack',editingSplitId:null,discardDraft(){discarded=true;}};
    const h=harness('@/app/custom-split/review',state,{workoutState:{profile:{programMode:mode},saveCustomSplitDraft:async(...args)=>{calls.push(args);return 12;}}});
    const tree=h.render();
    assert.equal(nodes(tree).some(node=>node.type==='TextInput'),false);
    assert.equal(action(tree,'Save for later'),undefined);assert.equal(action(tree,'Save and use'),undefined);
    assert.equal(JSON.stringify(nativeHeader(tree).unstable_headerRightItems()).includes('Delete routine'),false);
    action(tree,'Save changes').props.onPress();await flush();
    assert.equal(calls.length,1);assert.equal(calls[0][0],'Stack’s plan');
    assert.deepEqual(calls[0][2],{stackPlan:true,activate:mode==='stack'});
    assert.equal(discarded,true);
    assert.ok(h.events.some(event=>event[0]==='dismissTo'&&event[1]==='/your-splits'));
  }
});

test('review updates an edited Stack’s plan in place without offering deletion', async () => {
  const updates=[];
  const plan={id:9,isStackPlan:true};
  const state={draft:{name:'Stack’s plan',workouts:[day('a',[lift(1)])]},source:'stack',editingSplitId:9,sourceRevision:JSON.stringify(plan),discardDraft(){}};
  const h=harness('@/app/custom-split/review',state,{db:{getCustomSplitDetailAsync:async()=>plan},workoutState:{saveCustomSplitDraft:async()=>{throw Error('must update in place');},updateCustomSplitDraft:async(...args)=>{updates.push(args);return true;}}});
  const tree=h.render();
  assert.equal(JSON.stringify(nativeHeader(tree).unstable_headerRightItems()).includes('Delete routine'),false);
  action(tree,'Save changes').props.onPress();await flush();
  assert.equal(updates.length,1);assert.equal(updates[0][0],9);assert.equal(updates[0][1],'Stack’s plan');
});

const pendingItem = (key, rawName, extra = {}) => ({ key, rawName, status: 'uncertain', suggestion: null, alternatives: [], position: 1, ...extra });

test('pasted routine: the editor shows exercises to check and routes their choice through the picker', async () => {
  const resolved = [];
  const workout = { ...day('a', [lift(1, 'Bench Press')]), pendingImports: [pendingItem('w1e2', 'shoulder press')] };
  const other = { ...day('b', [lift(2)]), pendingImports: [pendingItem('w2e1', 'rear cable thing')] };
  const state = { draft: { name: 'Pasted', workouts: [workout, other] }, activeWorkoutId: 'a', editingSplitId: null, source: 'onboarding', hydrated: true, drafts: {}, closeDraft() {},
    resolvePendingImport: (...args) => resolved.push(args), openPicker(id, options) { this.picker = { workoutId: id, ...options }; } };
  const h = harness('@/app/custom-split/index', state);
  h.render(); await flush(); const tree = h.render();
  const list = nodes(tree).find(node => node.type === 'PendingImportList');
  assert.deepEqual(list.props.items.map(item => item.rawName), ['shoulder press']);
  assert.match(JSON.stringify(tree), /1 exercise.*in other workouts.*needs.*a check/);
  list.props.onResolve('w1e2', null);
  assert.deepEqual(resolved, [['a', 'w1e2', null]]);
  list.props.onSearch(workout.pendingImports[0]);
  assert.deepEqual(state.picker, { workoutId: 'a', pendingKey: 'w1e2', query: 'shoulder press' });
  assert.deepEqual(h.events.at(-1), ['push', '/custom-split/exercises']);
});

test('pasted routine: Save waits for every exercise to check, then first-run setup saves, finishes setup and uses it once', async () => {
  const calls = [];
  const workout = { ...day('a', [lift(1)]), pendingImports: [pendingItem('w1e2', 'shoulder burnout', { status: 'unresolved' })] };
  let discarded = false;
  const state = { draft: { name: 'Pasted', workouts: [workout] }, source: 'onboarding', editingSplitId: null, drafts: {}, discardDraft() { discarded = true; } };
  const workoutState = { profile: null,
    saveCustomSplitDraft: async (...args) => { calls.push(['save', args[2]]); return 41; },
    completeNoProgramOnboarding: name => { calls.push(['complete', name]); return { onboardingCompleted: true }; },
    activateSharedRoutine: id => { calls.push(['activate', id]); } };
  const h = harness('@/app/custom-split/review', state, { workoutState });
  let tree = h.render();
  assert.equal(action(tree, 'Save and use').props.disabled, true);
  assert.match(JSON.stringify(tree), /Check the exercise Stack wasn’t sure about before saving/);
  assert.match(JSON.stringify(tree), /shoulder burnout.*needs a check/);
  assert.equal(action(tree, 'Save for later'), undefined);
  delete workout.pendingImports;
  tree = h.render(); action(tree, 'Save and use').props.onPress(); await flush(); await flush();
  assert.deepEqual(calls, [['save', { activate: false }], ['complete', 'Sam'], ['activate', 41]]);
  assert.equal(discarded, true);
  assert.deepEqual(h.events.filter(event => event[0] === 'replace'), [['replace', '/(tabs)']]);
});
