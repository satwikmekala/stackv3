/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise(setImmediate); };
function harness(disk = new Map(), fail = { read: false, write: false }) {
  const cache = new Map();
  function load(id) {
    if (id === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
      getItem: async key => { if (fail.read) throw Error('offline disk'); return disk.get(key) ?? null; },
      setItem: async (key, value) => { if (fail.write) throw Error('full disk'); disk.set(key, value); },
      removeItem: async key => { disk.delete(key); },
    } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const exports = {}; cache.set(id, exports);
    const source = fs.readFileSync(path.join(root, id.slice(2) + '.ts'), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('exports', 'require', code)(exports, load);
    return exports;
  }
  const store = load('@/store/customSplitDraft').useCustomSplitDraftStore;
  return { store, disk, fail, load };
}
const exercise = id => ({ id, name: `Lift ${id}`, primaryMuscle: 'Chest', workoutType: 'chest', equipment: null, loadType: 'external_weight', metric: 'reps', isCustom: false });
const saved = id => ({ id, name: `Split ${id}`, createdAt: '2026-10-03', updatedAt: '2026-10-03', workouts: [{ id: 91, splitId: id, name: 'Upper', position: 0, color: 'purple', exercises: [{ ...exercise(1), exerciseId: 1, position: 0 }] }] });

test('new and edited drafts survive restart independently, retaining active day, color, and order', async () => {
  const h = harness(); await settle();
  const s = () => h.store.getState();
  assert.equal(s().hydrated, true);
  s().initializeDraft('My split', 1, 'library');
  const first = s().activeWorkoutId;
  s().addExercise(first, exercise(1)); s().addExercise(first, exercise(2));
  s().reorderExercise(first, 0, 1); s().setWorkoutColor(first, 'blue'); s().addWorkout();
  const second = s().activeWorkoutId; s().closeDraft(); s().hydrateDraftForEdit(saved(7));
  s().setWorkoutCustomName(s().activeWorkoutId, 'Edited upper'); s().closeDraft(); await settle();
  const reopened = harness(h.disk); await settle();
  const r = () => reopened.store.getState();
  assert.equal(r().resumeDraft(null), true); assert.equal(r().activeWorkoutId, second);
  assert.deepEqual(r().draft.workouts[0].exercises.map(e => e.id), [2, 1]);
  assert.equal(r().draft.workouts[0].color, 'blue');
  assert.equal(r().resumeDraft(7), true); assert.equal(r().draft.workouts[0].customName, 'Edited upper');
  assert.equal(r().draft.workouts[0].persistedWorkoutId, 91); assert.equal(r().draft.workouts[0].color, 'purple');
});

test('picker selection and cancellation do not mutate the workout; custom selection preserves search', async () => {
  const { store } = harness(); await settle(); const s = () => store.getState();
  s().initializeDraft('Routine', 1, 'library'); const id = s().activeWorkoutId;
  s().openPicker(id); s().updatePicker({ query: 'Landmine', group: 'Chest', selected: [exercise(1)] });
  s().updatePicker({ selected: [...s().picker.selected, exercise(2)] });
  assert.equal(s().picker.query, 'Landmine'); assert.equal(s().draft.workouts[0].exercises.length, 0);
  s().closePicker(); assert.equal(s().draft.workouts[0].exercises.length, 0);
  s().addExercise(id, exercise(1)); s().addExercise(id, exercise(1)); assert.equal(s().draft.workouts[0].exercises.length, 1);
});

test('duplicate and reorder preserve identity, Undo restores original position without duplicates', async () => {
  const { store } = harness(); await settle(); const s = () => store.getState(); s().hydrateDraftForEdit(saved(7));
  const original = s().activeWorkoutId; s().duplicateWorkout(original);
  const copy = s().activeWorkoutId; assert.equal(s().draft.workouts[1].persistedWorkoutId, undefined);
  assert.equal(s().draft.workouts[1].color, 'purple'); s().reorderWorkout(1, 0);
  assert.equal(s().draft.workouts[1].persistedWorkoutId, 91); assert.equal(s().activeWorkoutId, copy);
  s().addExercise(copy, exercise(2)); s().removeExercise(copy, 1); s().restoreExercise(copy, exercise(1), 0); s().restoreExercise(copy, exercise(1), 0);
  assert.deepEqual(s().draft.workouts[0].exercises.map(e => e.id), [1, 2]);
});

test('discard clears only current draft and queued writes cannot resurrect it', async () => {
  const h = harness(); await settle(); const s = () => h.store.getState();
  s().initializeDraft('Keep', 1, 'library'); s().closeDraft(); s().hydrateDraftForEdit(saved(7));
  for (let i = 0; i < 10; i++) s().setSplitName(`Change ${i}`);
  s().discardDraft(); await settle(); const reopened = harness(h.disk); await settle();
  assert.equal(reopened.store.getState().resumeDraft(7), false);
  assert.equal(reopened.store.getState().resumeDraft(null), true);
});

test('read failure preserves disk and blocks hydration until retry; write failure retains in-memory work', async () => {
  const h = harness(); await settle(); h.store.getState().initializeDraft('Recover me', 1, 'library'); await settle();
  const before = h.disk.get('stack-split-drafts');
  const failed = harness(h.disk, { read: true, write: false }); await settle();
  assert.equal(failed.store.getState().hydrated, false); assert.equal(h.disk.get('stack-split-drafts'), before);
  failed.fail.read = false; await failed.store.persist.rehydrate(); await settle();
  assert.equal(failed.store.getState().resumeDraft(null), true);
  failed.fail.write = true; failed.store.getState().setSplitName('Still here'); await settle();
  assert.equal(failed.store.getState().draft.name, 'Still here'); assert.ok(failed.store.getState().storageError);
  failed.fail.write = false; failed.store.setState({}); await settle();
  const recovered = harness(h.disk); await settle(); recovered.store.getState().resumeDraft(null);
  assert.equal(recovered.store.getState().draft.name, 'Still here');
});

test('conflicted edits recover without claiming saved IDs or overwriting another new draft', async () => {
  const { store } = harness(); await settle(); const s = () => store.getState();
  s().hydrateDraftForEdit(saved(7)); s().recoverAsNew(); assert.equal(s().editingSplitId, null);
  assert.equal(s().draft.workouts[0].persistedWorkoutId, undefined); assert.equal(s().sourceRevision, null);
  s().closeDraft(); s().hydrateDraftForEdit(saved(8)); s().recoverAsNew();
  assert.equal(s().editingSplitId, 8); assert.equal(s().drafts.new.draft.name, 'Split 7');
});

test('future or corrupted draft storage is preserved without overwriting it', async () => {
  for (const value of [JSON.stringify({ version: 2, state: { drafts: {} } }), JSON.stringify({ version: 1, state: { drafts: { new: { draft: {} } } } }), 'broken JSON']) {
    const disk = new Map([['stack-split-drafts', value]]);
    const h = harness(disk); await settle();
    assert.equal(h.store.getState().hydrated, false);
    assert.equal(disk.get('stack-split-drafts'), value);
  }
});

test('Settings: clearing device drafts drains queued writes and prevents drafts from returning after restart', async () => {
  const h = harness(); await settle(); const s = () => h.store.getState();
  s().initializeDraft('Unfinished', 1, 'library'); s().closeDraft(); s().hydrateDraftForEdit(saved(7));
  for (let i = 0; i < 10; i++) s().setSplitName(`Queued ${i}`);
  await h.load('@/store/customSplitDraft').clearCustomSplitDrafts(); await settle();
  assert.equal(h.disk.has('stack-split-drafts'), false); assert.equal(s().draft, null);
  const reopened = harness(h.disk); await settle(); assert.deepEqual(reopened.store.getState().drafts, {});
});

test('Stack’s plan drafts keep their own slot beside a new routine and become an edit once saved', async () => {
  const h = harness(); await settle();
  const s = () => h.store.getState();
  s().initializeDraft('My split', 1, 'library'); s().closeDraft();
  s().initializeStackPlanDraft([{ name: 'Upper A', exercises: [exercise(1), exercise(2)] }, { name: 'Lower A', exercises: [exercise(3)] }]);
  assert.equal(s().source, 'stack'); assert.equal(s().editingSplitId, null); assert.equal(s().draft.name, 'Stack’s plan');
  assert.deepEqual(s().draft.workouts.map(day => [day.customName, day.exercises.map(e => e.id)]), [['Upper A', [1, 2]], ['Lower A', [3]]]);
  assert.deepEqual(Object.keys(s().drafts).sort(), ['new', 'stack']);
  s().closeDraft(); await settle();
  const reopened = harness(h.disk); await settle();
  const r = () => reopened.store.getState();
  assert.equal(r().resumeDraft(null, 'stack'), true); assert.equal(r().source, 'stack'); assert.equal(r().draft.workouts[0].customName, 'Upper A');
  r().discardDraft(); assert.deepEqual(Object.keys(r().drafts), ['new']);
  r().hydrateDraftForEdit({ ...saved(9), name: 'Stack’s plan', isStackPlan: true });
  assert.equal(r().source, 'stack'); assert.deepEqual(Object.keys(r().drafts).sort(), ['edit:9', 'new']);
  r().discardStackPlanDrafts();
  assert.equal(r().draft, null); assert.deepEqual(Object.keys(r().drafts), ['new']);
});
