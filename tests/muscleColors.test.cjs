/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function harness(disk = new Map(), fail = {}) {
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (cache.has(resolved)) return cache.get(resolved);
    const exports = {}; cache.set(resolved, exports);
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('exports', 'require', code)(exports, id => {
      if (id === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
        getItem: async key => { if (fail.read) throw Error('read'); return disk.get(key) ?? null; },
        setItem: async (key, value) => { if (fail.write) throw Error('write'); disk.set(key, value); },
        removeItem: async key => { disk.delete(key); },
      } };
      if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
      if (id.startsWith('.')) return load(path.resolve(path.dirname(resolved), id) + '.ts');
      return require(id);
    });
    return exports;
  }
  return { load, disk, fail, store: load('store/muscleColors.ts'), colors: load('constants/muscleColors.ts') };
}
test('Chest purple follows cards, archetypes, logger, records, and Build; survives restart', async () => {
  const h = harness();
  await h.store.loadMuscleColors();
  assert.equal(await h.store.saveMuscleColor('chest', 'purple'), true);
  const purple = h.colors.MUSCLE_COLOR_PALETTE.purple.value;
  assert.equal(h.colors.getWorkoutLoggingColor('chest'), purple);
  assert.equal(h.load('constants/workouts.ts').workoutMeta.chest.color, purple);
  assert.equal(h.load('constants/archetypes.ts').ARCHETYPE_COMPOSITIONS.push.color, purple);
  assert.equal(h.load('store/personalRecords.ts').MUSCLE_GROUPS.chest.color, purple);
  assert.equal(h.load('features/custom-split/colors.ts').resolveDayColor({ color: 'orange', exercises: [{ workoutType: 'chest' }] }), purple);
  const history = h.load('features/build/buildHistoryCache.ts').buildHistoryCache;
  const session = { id: 'test', date: '2026-10-03', completed: true, retroactive: false,
    archetype: null, secondaryArchetype: null, workoutTypes: ['chest'], exercises: [] };
  const before = history.get([session], '2026-09-28');
  assert.equal(before.state.pieces[0].color, purple);
  const reopened = harness(h.disk);
  await reopened.store.loadMuscleColors();
  assert.equal(reopened.colors.getMuscleColor('chest'), purple);
  assert.equal(reopened.colors.getMuscleColor('back'), h.colors.MUSCLE_COLOR_PALETTE.blue.value);
});
test('resetting one muscle restores its default and invalidates cached Build colors', async () => {
  const h = harness(); await h.store.loadMuscleColors();
  const cache = h.load('features/build/buildHistoryCache.ts').buildHistoryCache;
  const sessions = [{ id: '1', date: '2026-10-03', completed: true, retroactive: false,
    archetype: null, secondaryArchetype: null, workoutTypes: ['chest'], exercises: [] }];
  const original = cache.get(sessions, '2026-09-28');
  await h.store.saveMuscleColor('chest', 'purple');
  assert.equal(cache.peek(sessions, '2026-09-28'), null);
  const recolored = cache.get(sessions, '2026-09-28');
  assert.notEqual(recolored, original);
  assert.equal(recolored.state.pieces[0].color, h.colors.MUSCLE_COLOR_PALETTE.purple.value);
  await h.store.saveMuscleColor('back', 'pink');
  await h.store.saveMuscleColor('chest', null);
  assert.equal(h.colors.getMuscleColor('chest'), h.colors.MUSCLE_COLOR_PALETTE.orange.value);
  assert.equal(h.load('features/custom-split/colors.ts').resolveDayColor({ color: 'blue', exercises: [{ workoutType: 'chest' }] }), h.colors.MUSCLE_COLOR_PALETTE.orange.value);
  assert.equal(h.colors.getMuscleColor('back'), h.colors.MUSCLE_COLOR_PALETTE.pink.value);
});
test('failed writes retain the last saved appearance and a retry succeeds', async () => {
  const h = harness(); await h.store.loadMuscleColors();
  await h.store.saveMuscleColor('chest', 'purple');
  h.fail.write = true;
  assert.equal(await h.store.saveMuscleColor('chest', 'blue'), false);
  assert.equal(h.store.useMuscleColors.getState().error, 'save');
  assert.equal(h.colors.getMuscleColor('chest'), h.colors.MUSCLE_COLOR_PALETTE.purple.value);
  h.fail.write = false;
  assert.equal(await h.store.saveMuscleColor('chest', 'blue'), true);
  assert.equal(h.colors.getMuscleColor('chest'), h.colors.MUSCLE_COLOR_PALETTE.blue.value);
});
test('failed/corrupt hydration blocks writes and preserves saved data until retry', async () => {
  for (const raw of ['{"chest":"unknown"}', '[]', 'null', 'invalid']) {
    const h = harness(new Map([['stack-muscle-colors-v1', raw]]));
    await h.store.loadMuscleColors();
    assert.equal(h.store.useMuscleColors.getState().hydrated, false);
    assert.equal(await h.store.saveMuscleColor('chest', 'purple'), false);
    assert.equal(h.disk.get('stack-muscle-colors-v1'), raw);
  }
  const h = harness(new Map([['stack-muscle-colors-v1', '{"chest":"purple"}']]), { read: true });
  await h.store.loadMuscleColors();
  h.fail.read = false; await h.store.loadMuscleColors();
  assert.equal(h.colors.getMuscleColor('chest'), h.colors.MUSCLE_COLOR_PALETTE.purple.value);
  await h.store.clearMuscleColors();
  assert.equal(h.disk.has('stack-muscle-colors-v1'), false);
  assert.deepEqual(h.store.useMuscleColors.getState().preferences, {});
});
