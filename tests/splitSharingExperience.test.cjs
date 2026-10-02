/* global __dirname, Buffer */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');

// Execute production SQL and store code with real SQLite, independent sender
// and recipient databases, and only the native SQLite/share bridges replaced.
function harness({ profile = true } = {}) {
  const sql = new DatabaseSync(':memory:');
  const shares = [];
  const adapter = {
    getAllSync: (query, ...args) => sql.prepare(query).all(...args),
    getFirstSync: (query, ...args) => sql.prepare(query).get(...args) ?? null,
    runSync: (query, ...args) => {
      const result = sql.prepare(query).run(...args);
      return { ...result, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    withTransactionSync: (fn) => {
      sql.exec('BEGIN');
      try { fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
  adapter.getAllAsync = async (...args) => adapter.getAllSync(...args);
  adapter.getFirstAsync = async (...args) => adapter.getFirstSync(...args);
  const cache = new Map();
  function load(id) {
    if (id === 'expo-sqlite') return { openDatabaseAsync: async () => adapter };
    if (id === 'react-native') return { Alert: { alert: () => {} }, Share: {
      share: async (content) => { shares.push(content); return { action: 'sharedAction' }; },
    } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const exports = {};
    cache.set(id, exports);
    let source = fs.readFileSync(path.join(root, id.slice(2) + '.ts'), 'utf8');
    if (id === '@/store/workoutDatabase') source += '\ndatabase = testDatabase; databasePromise = Promise.resolve(testDatabase);';
    const js = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    new Function('exports', 'require', 'testDatabase', '__DEV__', js)(exports,
      (name) => load(name.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(id), name)) : name), adapter, false);
    return exports;
  }
  const db = load('@/store/workoutDatabase');
  sql.exec(db.WORKOUT_DATABASE_SCHEMA);
  for (const seed of [...db.EXERCISE_SEEDS, ...db.ARCHETYPE_EXERCISE_SEEDS]) {
    adapter.runSync(`INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, load_type, metric)
      VALUES (?, ?, ?, ?, ?, ?)`, seed.name, seed.workoutType, seed.primaryMuscle, seed.secondaryMuscle, seed.loadType, seed.metric);
  }
  const store = load('@/store/workoutStore').useWorkoutStore;
  if (profile) store.getState().setProfile({ name: 'Recipient', weeklyGoal: 3, experienceLevel: 'intermediate',
    trainingDays: [0, 2, 4], onboardingCompleted: true, autoIncreaseWeight: true,
    weightIncrement: 0.5, weightUnit: 'kg', weightIncrementLbs: 5, activeSplitId: null });
  return { sql, adapter, db, store, load, shares };
}
const b = (name) => ({ kind: 'builtin', name });
const c = (name, extra = {}) => ({ kind: 'custom', name, workoutType: 'shoulders', primaryMuscle: 'Shoulders',
  equipment: 'Cable', loadType: 'external_weight', metric: 'reps', ...extra });
const program = (exercises = [b('Bench Press'), c('Cable Rear Delt')]) => ({ name: 'Push Pull Legs', workouts: [
  { name: 'Push', exercises }, { name: 'Pull', exercises: [b('Back Squat'), b('Barbell Curl')] },
] });
const count = (h, table) => h.sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const graph = (split) => ({ name: split.name, workouts: split.workouts.map((w) => ({ name: w.name,
  exercises: w.exercises.map((e) => ({ name: e.name, loadType: e.loadType, metric: e.metric })) })) });
const tables = ['exercises', 'custom_splits', 'custom_split_workouts', 'custom_split_workout_exercises',
  'profile', 'sessions', 'session_exercises', 'sets', 'split_templates', 'archetype_templates'];
const snapshot = (h) => Object.fromEntries(tables.map((table) => [table, h.sql.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
const ok = (result) => { assert.equal(result.ok, true, JSON.stringify(result)); return result.value; };

test('saved split → native share sheet → URL has human copy, both catalogs, no IDs or performance', async () => {
  const h = harness();
  try {
    const imported = h.db.importPortableSplitSync(program());
    const before = snapshot(h);
    await h.load('@/features/sharing/shareSavedSplit').shareSavedSplit(imported.splitId);
    assert.equal(h.shares.length, 1);
    assert.equal(h.shares[0].title, program().name);
    assert.match(h.shares[0].message, /^Push Pull Legs\n\nShared from Stack\n\nstack:\/\/import-split\?d=/);
    const transport = h.load('@/features/sharing/splitTransport');
    const url = h.shares[0].message.split('\n').at(-1);
    const parsed = ok(transport.parseSharedSplit(transport.readSplitImportToken(url)));
    assert.deepEqual(parsed, program());
    assert.doesNotMatch(JSON.stringify(parsed), /"(?:id|exerciseId|position|sets|weight|history|weightUnit|intensity|build|liveActivity)"/);
    assert.deepEqual(snapshot(h), before);
  } finally { h.sql.close(); }
});

test('share deleted split fails without opening native sheet', async () => {
  const h = harness();
  try {
    await assert.rejects(h.load('@/features/sharing/shareSavedSplit').shareSavedSplit(9999), /no longer saved/);
    assert.equal(h.shares.length, 0);
  } finally { h.sql.close(); }
});

test('transport budget blocks valid but oversized links before native sharing', async () => {
  const h = harness();
  try {
    const large = program(Array.from({ length: 30 }, (_, n) => c(`Custom ${n} ${'x'.repeat(60)}`)));
    const saved = h.db.importPortableSplitSync(large);
    const split = await h.db.getCustomSplitDetailAsync(saved.splitId);
    const t = h.load('@/features/sharing/splitTransport');
    const p = h.load('@/features/sharing/customSplitAdapter').portableSplitFromCustomSplit(split, h.db.BUILT_IN_EXERCISE_NAMES);
    const { prepareSplitShare, MAX_SPLIT_SHARE_URL_LENGTH } = h.load('@/features/sharing/shareSplit');
    assert.ok(t.buildSplitImportUrl(ok(t.encodeSharedSplit(p))).length > MAX_SPLIT_SHARE_URL_LENGTH);
    const content = prepareSplitShare(split, h.db.BUILT_IN_EXERCISE_NAMES);
    assert.equal(content.error.code, 'payload_too_large');
    await assert.rejects(h.load('@/features/sharing/shareSavedSplit').shareSavedSplit(saved.splitId), /too large to share/);
    assert.equal(h.shares.length, 0);
  } finally { h.sql.close(); }
});

test('opening/parsing links performs no writes; invalid tokens, duplicates and versions fail safely', () => {
  const h = harness();
  try {
    const t = h.load('@/features/sharing/splitTransport');
    const before = snapshot(h);
    const token = ok(t.encodeSharedSplit(program()));
    assert.deepEqual(ok(t.parseSharedSplit(token)), program());
    for (const invalid of [undefined, '', 'abc=', '%xx', ['abc', 'def'], 'a'.repeat(t.MAX_SHARED_SPLIT_TOKEN_LENGTH + 1)]) {
      assert.equal(t.parseSharedSplit(invalid).ok, false);
    }
    const wire = JSON.parse(Buffer.from(token, 'base64url').toString());
    for (const [field, value, code] of [['v', 99, 'unsupported_version'], ['type', 'other', 'unsupported_type']]) {
      const changed = Buffer.from(JSON.stringify({ ...wire, [field]: value })).toString('base64url');
      assert.equal(t.parseSharedSplit(changed).error.code, code);
    }
    assert.deepEqual(snapshot(h), before);
  } finally { h.sql.close(); }
});

test('cold-launch fallback maps only Stack import URLs, rejecting ambiguous payload parameters', () => {
  const h = harness();
  try {
    const route = h.load('@/features/sharing/splitLinkRouting').splitImportRouteFromUrl;
    const t = h.load('@/features/sharing/splitTransport');
    const token = ok(t.encodeSharedSplit(program()));
    for (const url of [t.buildSplitImportUrl(token), `stack:///import-split?d=${token}`]) {
      assert.deepEqual(route(url), { pathname: '/import-split', params: { d: token } });
    }
    for (const url of [null, 'stack://settings', 'https://evil.example/import-split?d=x', 'stack://import-split-other?d=x']) {
      assert.equal(route(url), null);
    }
    for (const url of ['stack://import-split', 'stack://import-split?d=a&d=b']) {
      assert.equal(t.parseSharedSplit(route(url).params.d).ok, false);
    }
  } finally { h.sql.close(); }
});

test('import revalidates the model at DB boundary, including enum failures', () => {
  const h = harness();
  try {
    const before = snapshot(h);
    for (const split of [null, {}, program([c('Bad', { metric: 'seconds' })]), program([c('Bad', { loadType: 'kg' })])]) {
      assert.throws(() => h.db.importPortableSplitSync(split));
      assert.deepEqual(snapshot(h), before);
    }
  } finally { h.sql.close(); }
});

test('unknown built-in rejects whole import with Update Stack, without guessing or catalog writes', () => {
  const h = harness();
  try {
    const before = snapshot(h);
    assert.throws(() => h.db.importPortableSplitSync(program([c('New Custom'), b('Future Stack Exercise')])), /Update Stack/);
    assert.deepEqual(snapshot(h), before);
  } finally { h.sql.close(); }
});

test('built-in resolves recipient IDs; missing/renamed seeds restored without mutating old exercise', async () => {
  const h = harness();
  try {
    const old = h.sql.prepare("SELECT * FROM exercises WHERE name = 'Bench Press'").get();
    h.sql.prepare('UPDATE exercises SET name = ? WHERE id = ?').run('My Old Bench', old.id);
    const result = h.db.importPortableSplitSync(program([b('Bench Press')]));
    const detail = await h.db.getCustomSplitDetailAsync(result.splitId);
    const exercise = detail.workouts[0].exercises[0];
    assert.notEqual(exercise.exerciseId, old.id);
    assert.equal(exercise.name, 'Bench Press');
    assert.equal(exercise.isCustom, false);
    assert.equal(h.sql.prepare('SELECT name FROM exercises WHERE id = ?').get(old.id).name, 'My Old Bench');
    const again = h.db.importPortableSplitSync(program([b('Bench Press')]));
    assert.equal((await h.db.getCustomSplitDetailAsync(again.splitId)).workouts[0].exercises[0].exerciseId, exercise.exerciseId);
  } finally { h.sql.close(); }
});

test('a custom row occupying a built-in name is never reinterpreted or mutated', async () => {
  const h = harness();
  try {
    h.sql.prepare("DELETE FROM exercises WHERE name = 'Bench Press'").run();
    const occupied = h.db.createCustomExerciseSync('Bench Press', 'core', 'Core', 'Cable', 'bodyweight', 'duration');
    const old = h.sql.prepare('SELECT * FROM exercises WHERE id = ?').get(occupied);
    const result = h.db.importPortableSplitSync(program([b('Bench Press')]));
    const exercise = (await h.db.getCustomSplitDetailAsync(result.splitId)).workouts[0].exercises[0];
    assert.equal(exercise.name, 'Bench Press (Stack)');
    assert.equal(exercise.metric, 'reps');
    assert.equal(exercise.loadType, 'external_weight');
    assert.equal(exercise.isCustom, false);
    assert.deepEqual(h.sql.prepare('SELECT * FROM exercises WHERE id = ?').get(occupied), old);
    const again = h.db.importPortableSplitSync(program([b('Bench Press')]));
    assert.equal((await h.db.getCustomSplitDetailAsync(again.splitId)).workouts[0].exercises[0].exerciseId, exercise.exerciseId);
  } finally { h.sql.close(); }
});

test('custom definitions missing locally are created once and reused across workouts/imports', async () => {
  const h = harness();
  try {
    const shared = program([c('Cable Rear Delt')]);
    shared.workouts[1].exercises.unshift(c('Cable Rear Delt'));
    const before = count(h, 'exercises');
    const result = h.db.importPortableSplitSync(shared);
    const detail = await h.db.getCustomSplitDetailAsync(result.splitId);
    assert.equal(count(h, 'exercises'), before + 1);
    assert.equal(detail.workouts[0].exercises[0].exerciseId, detail.workouts[1].exercises[0].exerciseId);
    h.db.importPortableSplitSync(shared);
    assert.equal(count(h, 'exercises'), before + 1);
  } finally { h.sql.close(); }
});

test('equivalent local custom with normalized name is reused', async () => {
  const h = harness();
  try {
    const local = h.db.createCustomExerciseSync('CABLE   rear delt', 'shoulders', 'Shoulders', 'Cable');
    const before = count(h, 'exercises');
    const result = h.db.importPortableSplitSync(program([c('Cable Rear Delt')]));
    assert.equal((await h.db.getCustomSplitDetailAsync(result.splitId)).workouts[0].exercises[0].exerciseId, local);
    assert.equal(count(h, 'exercises'), before);
  } finally { h.sql.close(); }
});

test('a custom definition equivalent to a built-in safely reuses the catalog row', async () => {
  const h = harness();
  try {
    const seed = h.db.EXERCISE_SEEDS.find(e => e.name === 'Bench Press');
    const before = count(h, 'exercises');
    const result = h.db.importPortableSplitSync(program([c(seed.name, {
      workoutType: seed.workoutType, primaryMuscle: seed.primaryMuscle,
      equipment: null, loadType: seed.loadType, metric: seed.metric,
    })]));
    const exercise = (await h.db.getCustomSplitDetailAsync(result.splitId)).workouts[0].exercises[0];
    assert.equal(exercise.isCustom, false);
    assert.equal(exercise.exerciseId, h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get(seed.name).id);
    assert.equal(count(h, 'exercises'), before);
  } finally { h.sql.close(); }
});

test('named empty workouts and unnamed populated workouts retain exact order and names', async () => {
  const h = harness();
  try {
    const split = { name: 'Recovery rotation', workouts: [
      { name: 'Rest', exercises: [] },
      { name: '', exercises: [b('Bench Press'), b('Barbell Curl')] },
      { name: 'Pull', exercises: [b('Lat Pulldown')] },
    ] };
    const imported = h.db.importPortableSplitSync(split);
    const detail = await h.db.getCustomSplitDetailAsync(imported.splitId);
    assert.deepEqual(h.load('@/features/sharing/customSplitAdapter').portableSplitFromCustomSplit(detail, h.db.BUILT_IN_EXERCISE_NAMES), split);
  } finally { h.sql.close(); }
});

for (const extra of [{ metric: 'duration' }, { loadType: 'bodyweight' }, { equipment: 'Machine' },
  { workoutType: 'arms' }, { primaryMuscle: 'Biceps' }]) {
  test(`custom collision safely disambiguates differing ${Object.keys(extra)[0]}`, async () => {
    const h = harness();
    try {
      const local = h.db.createCustomExerciseSync('Cable Rear Delt', 'shoulders', 'Shoulders', 'Cable');
      h.db.createCustomExerciseSync('Cable Rear Delt (shared)', 'legs', 'Quads', 'Machine');
      const before = h.sql.prepare('SELECT * FROM exercises WHERE id = ?').get(local);
      const result = h.db.importPortableSplitSync(program([c('Cable Rear Delt', extra)]));
      const exercise = (await h.db.getCustomSplitDetailAsync(result.splitId)).workouts[0].exercises[0];
      assert.equal(exercise.name, 'Cable Rear Delt (shared 2)');
      assert.deepEqual(h.sql.prepare('SELECT * FROM exercises WHERE id = ?').get(local), before);
      for (const [key, value] of Object.entries(extra)) assert.equal(exercise[key], value);
      const again = h.db.importPortableSplitSync(program([c('Cable Rear Delt', extra)]));
      assert.equal((await h.db.getCustomSplitDetailAsync(again.splitId)).workouts[0].exercises[0].exerciseId, exercise.exerciseId);
    } finally { h.sql.close(); }
  });
}

test('disambiguation reserves other payload names so separate exercises never collapse', async () => {
  const h = harness();
  try {
    h.db.createCustomExerciseSync('Cable Rear Delt', 'core', 'Core', 'Machine');
    const result = h.db.importPortableSplitSync(program([c('Cable Rear Delt'), c('Cable Rear Delt (shared)')]));
    const exercises = (await h.db.getCustomSplitDetailAsync(result.splitId)).workouts[0].exercises;
    assert.deepEqual(exercises.map(e => e.name), ['Cable Rear Delt (shared 2)', 'Cable Rear Delt (shared)']);
    assert.notEqual(exercises[0].exerciseId, exercises[1].exerciseId);
  } finally { h.sql.close(); }
});

test('long Unicode collision names remain bounded, valid and sharable', async () => {
  const h = harness();
  try {
    const name = '💪'.repeat(40);
    h.db.createCustomExerciseSync(name, 'core', 'Core', 'Machine');
    h.db.createCustomSplitSync('💪'.repeat(32));
    const shared = program([c(name)]); shared.name = '💪'.repeat(32);
    const result = h.db.importPortableSplitSync(shared);
    const detail = await h.db.getCustomSplitDetailAsync(result.splitId);
    assert.ok(result.name.length <= 64);
    assert.ok(detail.workouts[0].exercises[0].name.length <= 80);
    ok(h.load('@/features/sharing/shareSplit').prepareSplitShare(detail, h.db.BUILT_IN_EXERCISE_NAMES));
  } finally { h.sql.close(); }
});

test('independent copies, deterministic split names and order; active graph/session/profile unchanged', async () => {
  const h = harness();
  try {
    const original = h.db.importPortableSplitSync(program());
    h.store.getState().setActiveSplit(original.splitId);
    h.store.getState().startWorkoutFromCustomWorkout(original.splitId, original.workoutIds[0]);
    const before = snapshot(h);
    const result = h.db.importPortableSplitSync(program());
    assert.notEqual(result.splitId, original.splitId);
    assert.equal(result.name, 'Push Pull Legs 2');
    const after = snapshot(h);
    for (const table of ['profile', 'sessions', 'session_exercises', 'sets', 'split_templates', 'archetype_templates']) {
      assert.deepEqual(after[table], before[table], table);
    }
    assert.equal(h.store.getState().profile.activeSplitId, original.splitId);
    assert.deepEqual(graph(await h.db.getCustomSplitDetailAsync(result.splitId)), {
      ...graph(await h.db.getCustomSplitDetailAsync(original.splitId)), name: 'Push Pull Legs 2',
    });
    h.db.renameCustomSplitSync(result.splitId, 'My copy');
    h.db.renameWorkoutSync(result.workoutIds[0], 'My push');
    h.db.deleteCustomSplitSync(result.splitId);
    assert.equal((await h.db.getCustomSplitDetailAsync(original.splitId)).name, 'Push Pull Legs');
    assert.equal(h.db.readProfileSync().activeSplitId, original.splitId);
  } finally { h.sql.close(); }
});

test('split name collisions use normalized matching and choose first available suffix', () => {
  const h = harness();
  try {
    h.db.createCustomSplitSync('PUSH   PULL LEGS');
    h.db.createCustomSplitSync('Push Pull Legs 2');
    assert.equal(h.db.importPortableSplitSync(program()).name, 'Push Pull Legs 3');
  } finally { h.sql.close(); }
});

for (const table of ['exercises', 'custom_split_workouts', 'custom_split_workout_exercises']) {
  test(`atomic rollback on ${table} creation failure includes custom catalog and entire graph`, () => {
    const h = harness();
    try {
      const before = snapshot(h);
      // Fail after custom creation for graph tests, proving those inserts roll back too.
      const original = h.adapter.runSync;
      let inserts = 0;
      h.adapter.runSync = (query, ...args) => {
        if (query.includes(`INSERT INTO ${table}`) && ++inserts === (table === 'exercises' ? 1 : 2)) throw Error('Injected failure');
        return original(query, ...args);
      };
      assert.throws(() => h.db.importPortableSplitSync(program()), /Injected failure/);
      assert.deepEqual(snapshot(h), before);
      h.adapter.runSync = original;
      assert.ok(h.db.importPortableSplitSync(program()).splitId);
    } finally { h.sql.close(); }
  });
}

test('single Add action coalesces rapid taps, locks after success; a new preview can import again', async () => {
  const h = harness();
  try {
    const createAction = h.load('@/features/sharing/importAction').createSplitImportAction;
    const add = createAction(() => h.db.importPortableSplitSync(program()));
    const first = add();
    assert.equal(add(), first);
    const results = await Promise.all([first, add(), add()]);
    assert.equal(count(h, 'custom_splits'), 1);
    assert.equal(new Set(results.map(r => r.splitId)).size, 1);
    assert.equal((await add()).splitId, results[0].splitId);
    await createAction(() => h.db.importPortableSplitSync(program()))();
    assert.equal(count(h, 'custom_splits'), 2);
  } finally { h.sql.close(); }
});

test('failed Add transaction releases tap lock and can be retried', async () => {
  const h = harness();
  try {
    let fail = true;
    const add = h.load('@/features/sharing/importAction').createSplitImportAction(() => {
      if (fail) throw Error('Failure');
      return h.db.importPortableSplitSync(program());
    });
    await assert.rejects(add(), /Failure/);
    fail = false;
    assert.ok((await add()).splitId);
    assert.equal(count(h, 'custom_splits'), 1);
  } finally { h.sql.close(); }
});

test('fresh install can preview/save before onboarding with no profile mutation', async () => {
  const h = harness({ profile: false });
  try {
    assert.equal(h.db.readProfileSync(), null);
    const result = h.db.importPortableSplitSync(program());
    assert.equal(h.db.readProfileSync(), null);
    assert.equal((await h.db.getCustomSplitsAsync())[0].id, result.splitId);
    const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
    assert.match(layout, /!inSplitImport/);
  } finally { h.sql.close(); }
});

test('sender → share → parse → clean recipient: all measurement combinations and structure survive', async () => {
  const sender = harness(), recipient = harness();
  try {
    const matrix = [c('Weighted reps'), c('Reps only', { loadType: 'bodyweight', equipment: null }),
      c('Duration only', { loadType: 'bodyweight', metric: 'duration', equipment: null }),
      c('Weighted duration', { metric: 'duration' })];
    const source = sender.db.importPortableSplitSync(program(matrix));
    sender.store.getState().startWorkoutFromCustomWorkout(source.splitId, source.workoutIds[0]);
    sender.store.getState().updateExerciseSet(0, 0, 99, 999);
    sender.store.getState().toggleSetCompleted(0, 0);
    sender.store.getState().completeWorkout('hard');
    const detail = await sender.db.getCustomSplitDetailAsync(source.splitId);
    const content = ok(sender.load('@/features/sharing/shareSplit').prepareSplitShare(detail, sender.db.BUILT_IN_EXERCISE_NAMES));
    const t = recipient.load('@/features/sharing/splitTransport');
    const split = ok(t.parseSharedSplit(t.readSplitImportToken(content.url)));
    assert.deepEqual(split, program(matrix));
    // Shift recipient catalog IDs to demonstrate they are independently resolved.
    recipient.sql.exec('UPDATE exercises SET id = id + 1000');
    const result = recipient.db.importPortableSplitSync(split);
    const copied = await recipient.db.getCustomSplitDetailAsync(result.splitId);
    assert.deepEqual(graph(copied), graph(detail));
    assert.ok(copied.workouts[1].exercises.every(e => e.exerciseId >= 1000));
    assert.equal(count(recipient, 'sessions'), 0);
    assert.equal(count(recipient, 'sets'), 0);
    assert.equal(recipient.db.readProfileSync().activeSplitId, null);
    recipient.store.getState().updateProfile({ weightUnit: 'lbs' });
    recipient.store.getState().startWorkoutFromCustomWorkout(result.splitId, result.workoutIds[0]);
    const launched = recipient.store.getState().currentSession;
    assert.deepEqual(launched.exercises.map(e => [e.loadType, e.metric]), matrix.map(e => [e.loadType, e.metric]));
    for (const exercise of launched.exercises) {
      assert.equal(exercise.entryUnit, 'lbs');
      assert.equal(exercise.sets[0].weight, 0);
      assert.notEqual(exercise.sets[0].reps, 99);
      if (exercise.metric === 'duration') {
        assert.equal(exercise.sets[0].reps, 0);
        assert.ok(exercise.sets[0].durationS > 0);
      }
    }
  } finally { sender.sql.close(); recipient.sql.close(); }
});

test('imported built-in uses recipient global history, units and progression when later launched', async () => {
  const h = harness();
  try {
    const historySplit = h.db.importPortableSplitSync(program([b('Bench Press')]));
    h.store.getState().startWorkoutFromCustomWorkout(historySplit.splitId, historySplit.workoutIds[0]);
    for (let set = 0; set < 3; set++) {
      h.store.getState().updateExerciseSet(0, set, 8, 61.25 + set);
      h.store.getState().toggleSetCompleted(0, set);
    }
    h.store.getState().completeWorkout('medium');
    const before = h.db.readCompletedSessionsSync();
    h.store.getState().setActiveSplit(historySplit.splitId);
    h.store.getState().updateProfile({ weightUnit: 'lbs', weightIncrementLbs: 5 });
    const imported = h.db.importPortableSplitSync(program([b('bench press')]));
    const detail = await h.db.getCustomSplitDetailAsync(imported.splitId);
    assert.equal(detail.workouts[0].exercises[0].exerciseId,
      h.sql.prepare("SELECT id FROM exercises WHERE name = 'Bench Press'").get().id);
    assert.deepEqual(h.db.readCompletedSessionsSync(), before);
    h.store.getState().startWorkoutFromCustomWorkout(imported.splitId, imported.workoutIds[0]);
    const exercise = h.store.getState().currentSession.exercises[0];
    assert.equal(exercise.entryUnit, 'lbs');
    assert.deepEqual(exercise.sets.map(s => s.weight), [61.25, 62.25, 63.25]);
    assert.ok(exercise.sets.every(s => s.valueOrigin === 'history'));
    const suggestion = h.load('@/store/workoutProgression').getSetProgressionSuggestion(
      before, exercise, 0, h.store.getState().profile);
    assert.equal(suggestion.unit, 'lbs');
    assert.equal(suggestion.increment, 5);
    assert.equal(h.db.readProfileSync().activeSplitId, historySplit.splitId);
  } finally { h.sql.close(); }
});
