/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise(setImmediate); };
const transpile = (file, source = fs.readFileSync(path.join(root, file), 'utf8')) =>
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

/** App modules with AsyncStorage on an in-memory disk and SQLite on node:sqlite. */
function harness({ disk = new Map(), sqlite = false } = {}) {
  const sql = sqlite ? new DatabaseSync(':memory:') : null;
  const adapter = sql && {
    getAllSync: (query, ...args) => sql.prepare(query).all(...args),
    getFirstSync: (query, ...args) => sql.prepare(query).get(...args) ?? null,
    runSync: (query, ...args) => { const result = sql.prepare(query).run(...args); return { ...result, lastInsertRowId: Number(result.lastInsertRowid) }; },
    withTransactionSync: (fn) => { sql.exec('BEGIN'); try { fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; } },
  };
  if (adapter) { adapter.getAllAsync = async (...a) => adapter.getAllSync(...a); adapter.getFirstAsync = async (...a) => adapter.getFirstSync(...a); }
  const cache = new Map();
  function load(id) {
    if (id === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
      getItem: async key => disk.get(key) ?? null,
      setItem: async (key, value) => { disk.set(key, value); },
      removeItem: async key => { disk.delete(key); },
    } };
    if (id === 'expo-sqlite') return { openDatabaseAsync: async () => adapter };
    if (id === 'react-native') return { Alert: { alert: () => {} }, Share: { share: async () => ({}) }, Platform: { OS: 'ios' } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const exports = {}; cache.set(id, exports);
    let source = fs.readFileSync(path.join(root, id.slice(2) + '.ts'), 'utf8');
    if (id === '@/store/workoutDatabase' && adapter) source += '\ndatabase = testDatabase; databasePromise = Promise.resolve(testDatabase);';
    new Function('exports', 'require', 'testDatabase', '__DEV__', transpile(id.slice(2) + '.ts', source))(exports,
      (name) => load(name.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(id), name)) : name), adapter, true);
    return exports;
  }
  return { load, sql, disk };
}

const catalogItem = (id, name, extra = {}) => ({ id, name, workoutType: 'chest', primaryMuscle: 'Chest', isCustom: false, equipment: null, loadType: 'external_weight', metric: 'reps', ...extra });
const CATALOG = [
  catalogItem(1, 'Bench Press'),
  catalogItem(2, 'Incline Dumbbell Press'),
  catalogItem(3, 'Seated Dumbbell Shoulder Press', { workoutType: 'shoulders', primaryMuscle: 'Shoulders' }),
  catalogItem(4, 'Overhead Press', { workoutType: 'shoulders', primaryMuscle: 'Front/Side Delts' }),
  catalogItem(5, 'Lat Pulldown', { workoutType: 'back', primaryMuscle: 'Lats' }),
  catalogItem(6, 'Cable Rear Delt Fly', { workoutType: 'shoulders', primaryMuscle: 'Shoulders' }),
  catalogItem(90, 'bench press', { isCustom: true }),
];
const ex = (id, rawName, status, extra = {}) => ({ id, rawName, status, matchMethod: null, matchedName: null, suggestedMatch: null,
  alternatives: [], sets: null, reps: null, durationSeconds: null, notes: [], group: null, ...extra });
const RESULT = {
  type: 'stack.routineImport', v: 1,
  routine: { name: null, notes: [], unsupported: [], workouts: [
    { id: 'w1', name: 'Push', notes: [], exercises: [
      ex('w1e1', 'bench', 'matched', { matchedName: 'Bench Press' }),
      ex('w1e2', 'shoulder press', 'uncertain', { alternatives: ['Seated Dumbbell Shoulder Press', 'Overhead Press', 'Machine Shoulder Press'] }),
      ex('w1e3', 'incline db', 'matched', { matchedName: 'Incline Dumbbell Press' }),
      ex('w1e4', 'rear cable thing', 'uncertain', { suggestedMatch: 'Cable Rear Delt Fly' }),
      ex('w1e5', 'shoulder burnout', 'unresolved'),
      ex('w1e6', 'Bench Press', 'matched', { matchedName: 'Bench Press' }),
    ] },
    { id: 'w2', name: null, notes: [], exercises: [ex('w2e1', 'lat pull', 'matched', { matchedName: 'Lat Pulldown' }), ex('w2e2', 'future lift', 'matched', { matchedName: 'Future Stack Lift' })] },
    { id: 'w3', name: 'Rest day', notes: ['rest'], exercises: [] },
  ] },
  summary: { workouts: 3, exercises: 8, matched: 5, uncertain: 2, unresolved: 1 },
  importDraft: { ready: false, split: null, issues: [] }, warnings: [],
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const client = () => harness().load('@/features/routineImport/client');
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('client: empty or oversized pastes never reach the network', async () => {
  const c = client();
  let calls = 0;
  const fetch = async () => { calls += 1; };
  await assert.rejects(c.parsePastedRoutine('  \n ', { fetch, baseUrl: 'http://x' }), { message: 'Paste your routine first.' });
  await assert.rejects(c.parsePastedRoutine('a'.repeat(10_001), { fetch, baseUrl: 'http://x' }), { reason: 'too_long' });
  assert.equal(calls, 0);
});

test('client: sends only the text to the parse endpoint and accepts a valid result', async () => {
  const c = client();
  let request;
  const result = await c.parsePastedRoutine('Push\nbench 3x8', { baseUrl: 'http://api.test', fetch: async (url, init) => {
    request = { url, init }; return reply(200, { ...RESULT, meta: { model: 'x' } })();
  } });
  assert.equal(request.url, 'http://api.test/v1/routine-import/parse');
  assert.deepEqual(JSON.parse(request.init.body), { text: 'Push\nbench 3x8' });
  assert.equal(result.routine.workouts.length, 3);
});

test('client: failures map to the three user-facing messages; malformed results are rejected', async () => {
  const c = client();
  const failsWith = async (fetch, message) => assert.rejects(c.parsePastedRoutine('bench', { baseUrl: 'http://x', fetch, timeoutMs: 50 }), { message });
  await failsWith(reply(502, { error: { code: 'invalid_model_output' } }), 'Couldn’t read this routine. Try again.');
  await failsWith(reply(503, { error: { code: 'ai_unavailable' } }), 'Couldn’t read this routine. Try again.');
  await failsWith(reply(504, { error: { code: 'ai_timeout' } }), 'This is taking longer than expected. Try again.');
  await failsWith(reply(400, { error: { code: 'empty_text' } }), 'Paste your routine first.');
  await failsWith(reply(200, { type: 'stack.routineImport', v: 1, routine: { workouts: [{ id: 'w1', exercises: [{ rawName: 7 }] }] } }), 'Couldn’t read this routine. Try again.');
  await failsWith(reply(200, '<html>'), 'Couldn’t read this routine. Try again.');
  await failsWith(async () => { throw new TypeError('Network request failed'); }, 'Couldn’t read this routine. Try again.');
  const hang = (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  await failsWith(hang, 'This is taking longer than expected. Try again.');
  await assert.rejects(c.parsePastedRoutine('bench', { baseUrl: null, fetch: reply(200, RESULT) }), { reason: 'failed' });
});

test('client: a cancelled read rejects without a user-facing parse error', async () => {
  const c = client();
  const controller = new AbortController();
  const hang = (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const pending = c.parsePastedRoutine('bench', { baseUrl: 'http://x', fetch: hang, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => !(error instanceof c.PasteParseFailure));
});

// ---------------------------------------------------------------------------
// Result → editor draft
// ---------------------------------------------------------------------------

test('draft: matched exercises prefill in order; anything uncertain waits for review', () => {
  const { buildImportedDraft } = harness().load('@/features/routineImport/importDraft');
  const draft = buildImportedDraft(RESULT, CATALOG);
  assert.equal(draft.name, null);
  assert.equal(draft.workouts.length, 2, 'a workout with nothing in it is dropped');
  const [push, pull] = draft.workouts;
  assert.equal(push.name, 'Push');
  assert.deepEqual(push.exercises.map((e) => [e.id, e.name]), [[1, 'Bench Press'], [2, 'Incline Dumbbell Press']],
    'built-in wins over a same-named custom; the repeated Bench Press appears once');
  assert.deepEqual(push.pending.map((p) => [p.key, p.rawName, p.status, p.suggestion?.name ?? null, p.alternatives.map((a) => a.name), p.position]), [
    ['w1e2', 'shoulder press', 'uncertain', null, ['Seated Dumbbell Shoulder Press', 'Overhead Press'], 1],
    ['w1e4', 'rear cable thing', 'uncertain', 'Cable Rear Delt Fly', [], 3],
    ['w1e5', 'shoulder burnout', 'unresolved', null, [], 4],
  ]);
  assert.equal(pull.name, '');
  assert.deepEqual(pull.exercises.map((e) => e.name), ['Lat Pulldown']);
  assert.deepEqual(pull.pending.map((p) => [p.rawName, p.status]), [['future lift', 'unresolved']],
    'a match this device does not have is never treated as matched');
});

// ---------------------------------------------------------------------------
// Draft store
// ---------------------------------------------------------------------------

test('store: imported draft keeps pending items through a restart; confirming inserts in place, removing drops', async () => {
  const h = harness();
  const draftModule = h.load('@/store/customSplitDraft');
  await settle();
  const { buildImportedDraft } = h.load('@/features/routineImport/importDraft');
  const s = () => draftModule.useCustomSplitDraftStore.getState();
  s().initializeDraft('Old new draft', 1, 'onboarding');
  s().initializeImportedDraft('Pasted', buildImportedDraft(RESULT, CATALOG).workouts, 'onboarding');
  assert.equal(s().draft.name, 'Pasted', 'the paste replaces an open new-routine draft');
  assert.equal(draftModule.countPendingImports(s().draft), 4);
  const push = s().draft.workouts[0];
  assert.deepEqual(push.selectedMuscleGroups, ['Chest']);
  s().closeDraft(); await settle();

  const reopened = harness({ disk: h.disk });
  const reopenedModule = reopened.load('@/store/customSplitDraft');
  await settle();
  const r = () => reopenedModule.useCustomSplitDraftStore.getState();
  assert.equal(r().resumeDraft(null), true);
  assert.equal(reopenedModule.countPendingImports(r().draft), 4);
  const id = r().draft.workouts[0].id;
  r().resolvePendingImport(id, 'w1e2', CATALOG[3]);
  assert.deepEqual(r().draft.workouts[0].exercises.map((e) => e.name), ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press']);
  assert.ok(r().draft.workouts[0].selectedMuscleGroups.includes('Shoulders'));
  r().resolvePendingImport(id, 'w1e5', null);
  r().resolvePendingImport(id, 'w1e4', CATALOG[0]);
  assert.deepEqual(r().draft.workouts[0].exercises.map((e) => e.name), ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press'],
    'confirming an exercise the workout already has only clears the question');
  assert.equal(r().draft.workouts[0].pendingImports, undefined);
  assert.equal(reopenedModule.countPendingImports(r().draft), 1);
});

test('store: the picker can choose the exercise for a pending item', async () => {
  const h = harness(); await settle();
  const { buildImportedDraft } = h.load('@/features/routineImport/importDraft');
  const s = () => h.load('@/store/customSplitDraft').useCustomSplitDraftStore.getState();
  s().initializeImportedDraft('Pasted', buildImportedDraft(RESULT, CATALOG).workouts, 'onboarding');
  const id = s().draft.workouts[0].id;
  s().openPicker(id, { pendingKey: 'w1e5', query: 'shoulder burnout' });
  assert.deepEqual([s().picker.pendingKey, s().picker.query], ['w1e5', 'shoulder burnout']);
  s().openPicker(id);
  assert.equal(s().picker.pendingKey, undefined, 'a normal Add exercises never resolves a pending item');
});

// ---------------------------------------------------------------------------
// Backend result → draft → Stack's save, on real SQLite
// ---------------------------------------------------------------------------

test('paste → backend result → editor draft → saved routine, with nothing written before Save', async () => {
  const h = harness({ sqlite: true });
  const db = h.load('@/store/workoutDatabase');
  h.sql.exec(db.WORKOUT_DATABASE_SCHEMA);
  for (const seed of [...db.EXERCISE_SEEDS, ...db.ARCHETYPE_EXERCISE_SEEDS]) {
    h.sql.prepare(`INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, load_type, metric) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(seed.name, seed.workoutType, seed.primaryMuscle, seed.secondaryMuscle, seed.loadType, seed.metric);
  }
  await settle();
  const { extractStackCatalog } = require('../server/scripts/stackCatalog.cjs');
  const resolver = h.load('@/features/routineImport/exerciseResolver').createExerciseResolver(extractStackCatalog(root));
  const { buildRoutineImportResult } = h.load('@/features/routineImport/routineImportResult');
  const exercise = (rawName, extra = {}) => ({ rawName, sets: null, reps: null, repsPerSet: null, repsMin: null, repsMax: null, durationSeconds: null, notes: [], group: null, ...extra });
  const text = 'Push\nbench 3x8\nshoulder press 10 10 8\nlat raises 4x12\n\nPull\ndeadlift 3x5\nlat pull 3x10';
  const result = buildRoutineImportResult({ routineName: null, notes: [], unsupported: [], workouts: [
    { name: 'Push', notes: [], exercises: [exercise('bench', { sets: 3, reps: 8 }), exercise('shoulder press', { repsPerSet: [10, 10, 8] }), exercise('lat raises', { sets: 4, reps: 12 })] },
    { name: 'Pull', notes: [], exercises: [exercise('deadlift', { sets: 3, reps: 5 }), exercise('lat pull', { sets: 3, reps: 10 })] },
  ] }, text, resolver);
  const countSplits = () => h.sql.prepare('SELECT COUNT(*) AS n FROM custom_splits').get().n;

  const { buildImportedDraft } = h.load('@/features/routineImport/importDraft');
  const draftModule = h.load('@/store/customSplitDraft');
  const s = () => draftModule.useCustomSplitDraftStore.getState();
  s().initializeImportedDraft('My routine', buildImportedDraft(result, db.readExerciseCatalogSync()).workouts, 'onboarding');
  assert.equal(countSplits(), 0, 'parsing and prefilling write nothing');
  assert.equal(draftModule.countPendingImports(s().draft), 1, 'shoulder press must be confirmed before Save');

  const push = s().draft.workouts[0];
  const overhead = db.readExerciseCatalogSync().find((item) => item.name === 'Overhead Press');
  s().resolvePendingImport(push.id, push.pendingImports[0].key, overhead);
  assert.equal(draftModule.countPendingImports(s().draft), 0);

  // What Review's Save sends during first-run setup: no activation until the profile exists.
  const inputs = s().draft.workouts.map((day) => ({ name: draftModule.getWorkoutDisplayName(day), color: null,
    exerciseIds: day.exercises.map((item) => item.id), persistedWorkoutId: null }));
  const splitId = db.saveCustomSplitDraftSync(s().draft.name, inputs, { activate: false });
  const rows = h.sql.prepare(`SELECT w.name AS workout, e.name AS exercise FROM custom_split_workouts w
    JOIN custom_split_workout_exercises we ON we.workout_id = w.id JOIN exercises e ON e.id = we.exercise_id
    WHERE w.split_id = ? ORDER BY w.position, we.position`).all(splitId);
  assert.deepEqual(rows.map((row) => `${row.workout}: ${row.exercise}`), [
    'Push: Bench Press', 'Push: Overhead Press', 'Push: Lateral Raises', 'Pull: Deadlift', 'Pull: Lat Pulldown',
  ]);
  assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM profile').get().n, 0, 'the routine saves before setup creates the profile');
});

test('loader: the three logo tiles exist, appear light → medium → brightest, and have space-free file names', () => {
  // iOS silently draws nothing for an asset whose file name contains a space.
  const source = fs.readFileSync(path.join(root, 'components/StackLogoLoader.tsx'), 'utf8');
  const assets = [...source.matchAll(/require\('@\/(assets\/[^']+)'\)/g)].map((match) => match[1]);
  assert.deepEqual(assets, ['assets/images/logo-tile-light.png', 'assets/images/logo-tile-medium.png', 'assets/images/logo-tile-hard.png']);
  for (const asset of assets) {
    assert.ok(fs.existsSync(path.join(root, asset)), asset);
    assert.doesNotMatch(asset, /\s/);
  }
});
