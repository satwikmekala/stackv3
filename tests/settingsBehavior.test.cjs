/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(mocks = {}) {
  mocks = { '@/features/onboarding/config': { ONBOARDING_PREVIEW_ENABLED: true, FIRST_RUN_ROUTE: '/(onboarding)' }, ...mocks };
  const cache = new Map();
  const load = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const exports = {}; cache.set(id, exports);
    const code = ts.transpileModule(fs.readFileSync(path.join(root, id.slice(2) + '.ts'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('exports', 'require', code)(exports, child => load(child.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(id), child)) : child));
    return exports;
  };
  return load;
}
const training = loader()('@/store/trainingPreferences');
test('weekly goal counts distinct local training days and excludes unfinished/outside-week sessions', () => {
  const sessions = [
    { date: '2026-09-14', completed: true }, { date: '2026-09-14', completed: true },
    { date: new Date(2026, 8, 15, 23, 45).toISOString(), completed: true },
    { date: '2026-09-16', completed: false }, { date: '2026-09-13', completed: true },
  ];
  const week = ['2026-09-14', '2026-09-15', '2026-09-16'];
  assert.deepEqual(training.weeklyTrainingProgress(sessions, week, 3), { completed: 2, goal: 3 });
  assert.deepEqual(training.weeklyTrainingProgress(sessions, week, 0), { completed: 2, goal: 0 });
});
test('an optional habit target cannot change a configured automatic program', () => {
  for (const weeklyGoal of [0, 1, 7]) assert.equal(training.getProgramFrequency({ weeklyGoal, programWeeklyGoal: 4 }), 4);
  assert.equal(training.getProgramFrequency({ weeklyGoal: 0 }), 3);
  assert.equal(training.trainingDaysLabel([]), 'Flexible');
  assert.equal(training.trainingDaysLabel([4, 0, 2]), 'Mon, Wed, Fri');
});
function preferencesHarness() {
  const disk = new Map();
  let release, releaseRead, failRead = false, failWrite = false, hold = false, holdRead = false;
  const storage = {
    getItem: async key => { if (failRead) throw Error('read failed'); const value = disk.get(key) ?? null; if (holdRead) await new Promise(resolve => { releaseRead = resolve; }); return value; },
    setItem: async (key, value) => { if (hold) await new Promise(resolve => { release = resolve; }); if (failWrite) throw Error('write failed'); disk.set(key, value); },
    removeItem: async key => disk.delete(key),
  };
  const calls = [];
  const load = loader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'expo-haptics': { selectionAsync: async () => calls.push('selection'), impactAsync: async () => calls.push('impact'), notificationAsync: async () => calls.push('notification') } });
  return { p: load('@/store/appPreferences'), h: load('@/services/haptics'), disk, calls,
    holdRead: () => { holdRead = true; }, releaseRead: () => releaseRead(),
    hold: () => { hold = true; }, release: () => release(), failRead: () => { failRead = true; }, failWrite: () => { failWrite = true; } };
}
test('preferences publish only after persistence; haptics off suppresses all feedback', async () => {
  const { p, h, ...io } = preferencesHarness(); await p.loadAppPreferences();
  io.hold(); const saving = p.saveAppPreference('haptics', false);
  assert.equal(p.useAppPreferences.getState().haptics, true);
  assert.equal(await p.saveAppPreference('liveActivities', false), false);
  io.release(); assert.equal(await saving, true);
  assert.equal(JSON.parse(io.disk.get(p.APP_PREFERENCES_KEY)).haptics, false);
  await h.selectionAsync(); await h.impactAsync(); await h.notificationAsync();
  assert.deepEqual(io.calls, []);
  await p.loadAppPreferences(); assert.equal(p.useAppPreferences.getState().haptics, false);
});
test('failed preference writes preserve the prior choice and unread preferences hide Live Activities', async () => {
  const io = preferencesHarness(); const p = io.p; await p.loadAppPreferences(); io.failWrite();
  assert.equal(await p.saveAppPreference('haptics', false), false);
  assert.equal(p.useAppPreferences.getState().haptics, true);
  io.failRead(); await p.loadAppPreferences();
  assert.equal(p.useAppPreferences.getState().liveActivities, false);
  assert.equal(p.useAppPreferences.getState().error, true);
  assert.equal(await p.saveAppPreference('liveActivities', true), false);
});

test('a delayed Settings read cannot replace a newer saved preference', async () => {
  const io = preferencesHarness(); await io.p.loadAppPreferences();
  io.holdRead(); const read = io.p.loadAppPreferences();
  assert.equal(await io.p.saveAppPreference('liveActivities', false), true);
  io.releaseRead(); await read;
  assert.equal(io.p.useAppPreferences.getState().liveActivities, false);
  assert.equal(JSON.parse(io.disk.get(io.p.APP_PREFERENCES_KEY)).liveActivities, false);
});
test('haptic feedback waits for successful preference loading', async () => {
  const io = preferencesHarness(); await io.h.selectionAsync(); assert.deepEqual(io.calls, []);
  await io.p.loadAppPreferences(); await io.h.selectionAsync(); assert.deepEqual(io.calls, ['selection']);
  io.failRead(); await io.p.loadAppPreferences(); await io.h.selectionAsync(); assert.deepEqual(io.calls, ['selection']);
});

test('Settings editors use app navigation, independent plan choices and explicit unit confirmation', () => {
  const states = []; let cursor = 0;
  const navigation = [];
  const profile = { name: 'Preview', weeklyGoal: 3, programWeeklyGoal: 3, trainingDays: [0, 2, 4], weightUnit: 'kg',
    programMode: 'none', threeDayStructure: 'full-body', experienceLevel: 'advanced', weightUnitConfirmed: false };
  const workout = { profile, currentSession: null, updateProfile: updates => Object.assign(profile, updates) };
  const store = selector => selector(workout); store.getState = () => workout;
  const params = {};
  const load = loader({
    react: { useState: initial => { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef: initial => { const i = cursor++; return states[i] ?? (states[i] = { current: initial }); }, useEffect() {} },
    'react-native': { Platform: { OS: 'web' }, Alert: { alert() {} }, AppState: {}, Linking: {} },
    'expo-router': { useLocalSearchParams: () => params, useRouter: () => ({
      push: route => navigation.push(['push', route]), canGoBack: () => true, back: () => navigation.push(['back']),
    }) },
    expo: {}, 'expo-constants': { __esModule: true, default: { expoConfig: { version: '1' } } },
    '@/store/workoutStore': { useWorkoutStore: store }, '@/store/appPreferences': { useAppPreferences: () => ({ ready: true }) },
    '@/features/build/useBuildAccessibility': { useBuildAccessibility: () => ({ ready: true }), buildPreferences: {} },
    '@/features/build/config': { BUILD_SANDBOX_ENABLED: false }, '@/features/settings/data': {},
  });
  const hook = load('@/features/settings/useSettings').useSettings;
  const render = () => { cursor = 0; return hook(); };
  const rootPage = render(); assert.equal(rootPage.page, null);
  rootPage.open('data');
  assert.deepEqual(navigation.pop(), ['push', { pathname: '/settings', params: { page: 'data' } }]);
  params.page = 'name'; const namePage = render();
  assert.equal(namePage.page, 'name');
  namePage.sections('name')[0].rows[0].onChange('  New name  ');
  render().saveName(); assert.equal(profile.name, 'New name'); assert.deepEqual(navigation.pop(), ['back']);
  delete params.page; render().back(); assert.deepEqual(navigation.pop(), ['back']);
  const program = render().sections('program');
  assert.match(program[0].footer, /active plan stays/);
  program[1].rows[1].onPress();
  assert.equal(profile.threeDayStructure, 'push-pull-legs');
  assert.equal(profile.experienceLevel, 'advanced');
  program[0].rows[5].onPress();
  assert.equal(profile.programWeeklyGoal, 6);
  assert.equal(profile.weeklyGoal, 3);
  assert.equal(profile.programMode, 'none');
  render().sections('unit')[0].rows[1].onPress();
  assert.equal(profile.weightUnit, 'lbs');
  assert.equal(profile.weightUnitConfirmed, true);
});
