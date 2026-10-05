/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function harness({ profile = null, draft = { step: 'welcome', name: '', frequency: null }, ready = true,
  error = null, hydrated = true, hydrationError = null, handoffReady = true, handoffError = null,
  destination = '/(tabs)' } = {}) {
  const effects = [], calls = [], cache = new Map();
  const node = (type, props) => ({ type, props });
  const mocks = {
    react: { useState: initial => [initial, value => calls.push(['state', value])], useEffect: fn => effects.push(fn) },
    'react/jsx-runtime': { jsx: node, jsxs: node },
    'expo-router': { Redirect: 'Redirect', Stack: Object.assign('Stack', { Screen: 'Stack.Screen' }) },
    '@/features/onboarding/SetupLoading': { SetupLoading: 'SetupLoading' },
    '@/store/workoutStore': { useWorkoutStore: selector => selector({ profile, isHydrated: hydrated, hydrationError }),
      initializeWorkoutStore: async () => { calls.push('initialize'); } },
    '@/store/onboardingDraft': { useOnboardingDraft: () => ({ draft, ready, error }),
      loadOnboardingDraft: async () => { calls.push('load'); }, clearOnboardingDraft: async () => { calls.push('clear'); } },
    '@/store/sharedRoutineHandoff': { useSharedRoutineHandoff: () => ({ ready: handoffReady, error: handoffError }),
      loadSharedRoutineHandoff: async () => { calls.push('handoff'); }, onboardingDestination: () => destination },
  };
  function load(id) {
    if (id in mocks) return mocks[id];
    if (cache.has(id)) return cache.get(id);
    const file = ['.tsx', '.ts'].map(ext => path.join(root, id.slice(2) + ext)).find(fs.existsSync);
    const exports = {}; cache.set(id, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    new Function('exports', 'require', code)(exports, child => load(child.startsWith('.')
      ? path.posix.normalize(path.posix.join(path.posix.dirname(id), child)) : child));
    return exports;
  }
  return { calls, render(id) { const result = load(id).default(); while (effects.length) effects.shift()(); return result; } };
}

test('fresh launch goes straight to normal onboarding; its empty draft opens the new Welcome', () => {
  const h = harness();
  assert.equal(h.render('@/app/index').props.href, '/(onboarding)');
  assert.equal(h.render('@/app/(onboarding)/index').props.href, '/(onboarding)/welcome');
  assert.ok(h.calls.includes('load'));
});

test('cold launch resumes every shorter-flow step and translates retired questionnaire drafts', () => {
  for (const [step, name, frequency, expected] of [
    ['name', 'Sam', null, '/(onboarding)/name'],
    ['starting-point', 'Sam', null, '/(onboarding)/starting-point'],
    ['starting-point', '', null, '/(onboarding)/name'],
    ['bring-workouts', 'Sam', null, '/bring-workouts'],
    ['experience', 'Sam', null, '/(onboarding)/starting-point'],
    ['frequency', 'Sam', 3, '/program-setup'],
    ['program-preview', 'Sam', 3, '/program-setup/preview'],
    ['program-preview', 'Sam', null, '/program-setup'],
    ['split-choice', 'Sam', 3, '/program-setup/preview'],
    ['split-choice', 'Sam', null, '/program-setup'],
  ]) {
    const result = harness({ draft: { step, name, frequency } }).render('@/app/(onboarding)/index');
    assert.equal(result.type, 'Redirect');
    assert.deepEqual(result.props.href, expected.startsWith('/program-setup')
      ? { pathname: expected, params: { source: 'onboarding' } } : expected, step);
  }
});

test('retired questionnaire and preview links resume the same saved setup', () => {
  for (const route of ['(onboarding)/whatsurname', '(onboarding)/experience', '(onboarding)/current-week',
    '(onboarding)/split-choice', 'onboarding-preview/index', 'onboarding-preview/welcome',
    'onboarding-preview/name', 'onboarding-preview/starting-point']) {
    const h = harness({ draft: { step: 'starting-point', name: 'Sam', frequency: null } });
    assert.equal(h.render(`@/app/${route}`).props.href, '/(onboarding)/starting-point', route);
    const completed = harness({ profile: { onboardingCompleted: true } });
    assert.equal(completed.render(`@/app/${route}`).props.href, '/(tabs)', route);
    assert.ok(completed.calls.includes('clear'));
  }
});

test('returning users skip setup and a cold launch honors the saved shared-routine destination', () => {
  const profile = { onboardingCompleted: true };
  assert.equal(harness({ profile }).render('@/app/index').props.href, '/(tabs)');
  const destination = { pathname: '/import-split', params: { d: 'saved-share' } };
  assert.deepEqual(harness({ profile, destination }).render('@/app/index').props.href, destination);
});

test('storage failures show retry and cannot navigate past unread profile, setup or shared context', () => {
  const unread = harness({ ready: false, error: 'Read failed' }).render('@/app/(onboarding)/index');
  assert.equal(unread.type, 'SetupLoading'); assert.equal(unread.props.error, 'Read failed');
  const h = harness({ hydrated: false, hydrationError: 'Database failed' });
  const profile = h.render('@/app/index');
  assert.equal(profile.type, 'SetupLoading'); profile.props.retry(); assert.ok(h.calls.includes('initialize'));
  const handoff = harness({ profile: { onboardingCompleted: true }, handoffReady: false, handoffError: 'Handoff failed' }).render('@/app/index');
  assert.equal(handoff.type, 'SetupLoading'); assert.equal(handoff.props.error, 'Handoff failed');
});
