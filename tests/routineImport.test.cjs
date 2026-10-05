/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const { extractStackCatalog } = require('../server/scripts/stackCatalog.cjs');

// Production database code on real SQLite, only the native bridges replaced
// (same approach as splitSharingExperience.test.cjs).
function harness() {
  const sql = new DatabaseSync(':memory:');
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
    if (id === 'react-native') return { Alert: { alert: () => {} }, Share: { share: async () => ({}) } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const exports = {};
    cache.set(id, exports);
    let source = fs.readFileSync(path.join(root, id.slice(2) + '.ts'), 'utf8');
    if (id === '@/store/workoutDatabase') source += '\ndatabase = testDatabase; databasePromise = Promise.resolve(testDatabase);';
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
  return { sql, db, load };
}

// Pure modules load without the database.
const pureCache = new Map();
function loadPure(file) {
  const resolved = path.resolve(root, file);
  if (pureCache.has(resolved)) return pureCache.get(resolved);
  const exports = {};
  pureCache.set(resolved, exports);
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', js)(exports, (name) => {
    if (name.startsWith('@/')) return loadPure(`${name.slice(2)}.ts`);
    throw new Error(`Unexpected runtime dependency: ${name}`);
  });
  return exports;
}

const catalog = extractStackCatalog(root);
const resolverModule = loadPure('features/routineImport/exerciseResolver.ts');
const aliases = loadPure('features/routineImport/exerciseAliases.ts');
const protocol = loadPure('features/routineImport/routineImportProtocol.ts');
const importResult = loadPure('features/routineImport/routineImportResult.ts');
const resolver = resolverModule.createExerciseResolver(catalog);
const { looseExerciseKey } = resolverModule;
const names = new Set(catalog.exercises.map((exercise) => exercise.name));

const exercise = (rawName, extra = {}) => ({
  rawName, sets: null, reps: null, repsPerSet: null, repsMin: null, repsMax: null, durationSeconds: null, notes: [], group: null, ...extra,
});
const routine = (workouts, extra = {}) => ({ routineName: null, notes: [], unsupported: [], workouts, ...extra });
const build = (parsed, text) => importResult.buildRoutineImportResult(parsed, text, resolver);

// ---------------------------------------------------------------------------
// Catalog and alias data
// ---------------------------------------------------------------------------

test('catalog extraction matches the seeds the app actually inserts', () => {
  const { db } = harness();
  const seeds = [...db.EXERCISE_SEEDS, ...db.ARCHETYPE_EXERCISE_SEEDS].map(({ name, workoutType, primaryMuscle, loadType, metric }) =>
    ({ name, workoutType, primaryMuscle, loadType, metric }));
  assert.deepEqual(catalog.exercises, seeds);
  assert.ok(catalog.aliases.some((alias) => alias.alias === 'Triceps Pushdown' && alias.name === 'Tricep Pushdown'));
});

test('server copy of the routine-import modules and catalog is up to date', () => {
  const run = spawnSync(process.execPath, [path.join(root, 'server/scripts/sync-stack.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('no two catalog names share a loose key', () => {
  const seen = new Map();
  for (const name of names) {
    const key = looseExerciseKey(name);
    assert.ok(!seen.has(key), `"${name}" and "${seen.get(key)}" normalize to "${key}"`);
    seen.set(key, name);
  }
});

test('curated aliases point at real exercises and never shadow, repeat or conflict', () => {
  const nameKeys = new Map([...names].map((name) => [looseExerciseKey(name), name]));
  const aliasKeys = new Map();
  for (const [alias, name] of aliases.ROUTINE_IMPORT_ALIASES) {
    const key = looseExerciseKey(alias);
    assert.ok(names.has(name), `${alias} → unknown "${name}"`);
    assert.ok(!nameKeys.has(key), `"${alias}" already normalizes to "${nameKeys.get(key)}"`);
    assert.ok(!aliasKeys.has(key), `"${alias}" repeats "${aliasKeys.get(key)}"`);
    aliasKeys.set(key, alias);
  }
  for (const entry of aliases.AMBIGUOUS_EXERCISE_NAMES) {
    const key = looseExerciseKey(entry.name);
    assert.ok(!nameKeys.has(key) && !aliasKeys.has(key), `ambiguous "${entry.name}" collides`);
    for (const name of [entry.suggested, ...entry.alternatives].filter(Boolean)) assert.ok(names.has(name), name);
  }
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

const expectMatch = (raw, name, method) => {
  const result = resolver.resolve(raw);
  assert.equal(result.status, 'matched', `${raw}: ${JSON.stringify(result)}`);
  assert.equal(result.name, name, raw);
  if (method) assert.equal(result.method, method, raw);
};

test('resolution order: exact, alias, normalized, single typo', () => {
  expectMatch('Bench Press', 'Bench Press', 'exact');
  expectMatch('incl db', 'Incline Dumbbell Press', 'alias');
  expectMatch('lat pull', 'Lat Pulldown', 'alias');
  expectMatch('Triceps Pushdown', 'Tricep Pushdown', 'normalized');
  expectMatch('Barbell Squat', 'Squats', 'alias');
  expectMatch('bench press', 'Bench Press', 'normalized');
  expectMatch('PULL-UPS', 'Pull-ups', 'normalized');
  expectMatch('db fly', 'Dumbbell Fly', 'normalized');
  expectMatch('rdl', 'Romanian Deadlift', 'normalized');
  expectMatch('lat pulldwn', 'Lat Pulldown', 'typo');
  expectMatch('tricep pushdwn', 'Tricep Pushdown', 'typo');
  expectMatch('inclne db press', 'Incline Dumbbell Press', 'typo');
});

test('never auto-matches a different exercise that is one letter away', () => {
  // A changed first letter is a different word: jack ≠ hack/back.
  for (const raw of ['jack squat', 'incline curl press', 'decline db curl', 'sissy squat', 'jump squats', 'box squat', 'paused bench']) {
    assert.notEqual(resolver.resolve(raw).status, 'matched', raw);
  }
  expectMatch('hack squat', 'Hack Squat', 'normalized');
  expectMatch('back squat', 'Back Squat', 'normalized');
  expectMatch('decline press', 'Decline Press', 'normalized');
});

test('ambiguous shorthand is uncertain with alternatives, never matched', () => {
  for (const raw of ['shoulder press', 'dips', 'flies', 'curls', 'incline press', 'rows']) {
    const result = resolver.resolve(raw);
    assert.equal(result.status, 'uncertain', raw);
    assert.equal(result.method, 'ambiguous', raw);
    assert.ok(result.alternatives.length >= 2 || result.suggestedMatch, raw);
  }
  assert.equal(resolver.resolve('calves').suggestedMatch, 'Calf Raises');
});

test('loose names are uncertain with a suggestion; one-word muscles get none', () => {
  const rear = resolver.resolve('rear cable thing');
  assert.deepEqual([rear.status, rear.suggestedMatch], ['uncertain', 'Cable Rear Delt Fly']);
  assert.equal(resolver.resolve('low to high fly').suggestedMatch, 'Low-to-High Cable Fly');
  const chest = resolver.resolve('chest');
  assert.deepEqual([chest.status, chest.suggestedMatch], ['uncertain', null]);
});

test('unknown movements stay unresolved', () => {
  for (const raw of ['shoulder burnout', 'box jumps', 'kettlebell swings', 'treadmill', '???', '']) {
    assert.equal(resolver.resolve(raw).status, 'unresolved', raw);
  }
});

// ---------------------------------------------------------------------------
// Untrusted model output
// ---------------------------------------------------------------------------

test('model output with the wrong shape is rejected, never thrown', () => {
  const hostile = { get workouts() { throw new Error('boom'); } };
  for (const [index, value] of [null, 'text', [], {}, { workouts: {} }, { workouts: [{ exercises: [{ rawName: 7 }] }] },
    { workouts: [{ exercises: [{ rawName: 'Bench', sets: '3' }] }] }, { workouts: [{ exercises: [{}] }] }, hostile].entries()) {
    const read = protocol.readParsedRoutine(value);
    assert.equal(read.ok, false, `case ${index}`);
    assert.equal(read.error.code, 'invalid_model_output');
  }
  const tooMany = { workouts: [{ exercises: Array.from({ length: 61 }, (_, n) => ({ rawName: `x${n}` })) }] };
  assert.equal(protocol.readParsedRoutine(tooMany).ok, false);
});

test('model output is sanitized and implausible numbers dropped with warnings', () => {
  const read = protocol.readParsedRoutine({
    routineName: 'P‮p\u0000L',
    workouts: [{ name: 'x'.repeat(100), exercises: [{ rawName: '  Bench\tPress ', sets: 50, reps: 2.5, repsPerSet: [10, 0], durationSeconds: 30 }] }],
  });
  assert.equal(read.ok, true);
  assert.equal(read.value.routineName, 'P p L');
  assert.equal(read.value.workouts[0].name.length, 64);
  assert.deepEqual(read.value.workouts[0].exercises[0], exercise('Bench Press', { durationSeconds: 30 }));
  assert.ok(read.warnings.filter((w) => w.code === 'value_dropped').length >= 3);
});

// ---------------------------------------------------------------------------
// Grounding and result
// ---------------------------------------------------------------------------

const BRIEF = `Push

bench 3x8
incline db 3 sets
shoulder press 10 10 8
lat raises 4x12
tri pushdown 3x12

Pull

deadlift 3x5
lat pull 3x10
seated row
hammer curls 3x12`;

test('numbers the model invented are dropped; written ones are kept', () => {
  const text = 'Bench Press\nCable Fly 3x12\nPlank 1 min\nflies 12 12 12';
  const result = build(routine([{ name: null, notes: [], exercises: [
    exercise('Bench Press', { sets: 3, reps: 10 }),
    exercise('Cable Fly', { sets: 3, reps: 12 }),
    exercise('Plank', { durationSeconds: 60 }),
    exercise('flies', { sets: 3, reps: 12 }),
  ] }]), text);
  const [bench, fly, plank, flies] = result.routine.workouts[0].exercises;
  assert.deepEqual([bench.sets, bench.reps], [null, null]);
  assert.deepEqual([fly.sets, fly.reps], [3, { type: 'fixed', value: 12 }]);
  assert.equal(plank.durationSeconds, 60);
  assert.deepEqual([flies.sets, flies.reps], [3, { type: 'fixed', value: 12 }]);
  assert.equal(result.warnings.filter((w) => w.code === 'ungrounded_value').length, 2);
});

test('an exercise that is not in the pasted text is never auto-matched', () => {
  const result = build(routine([{ name: null, notes: [], exercises: [exercise('Bench Press'), exercise('Deadlift')] }]), 'Bench Press 3x8');
  const [, invented] = result.routine.workouts[0].exercises;
  assert.equal(invented.status, 'uncertain');
  assert.equal(invented.suggestedMatch, 'Deadlift');
  assert.ok(result.warnings.some((w) => w.code === 'ungrounded_exercise'));
  assert.equal(result.importDraft.ready, false);
});

test('rep schemes normalize to fixed, per-set and range targets', () => {
  const text = 'a 10 10 8\nb 12/12/12\nc 3x8-12\nd 3x10';
  const result = build(routine([{ name: null, notes: [], exercises: [
    exercise('a', { repsPerSet: [10, 10, 8] }),
    exercise('b', { repsPerSet: [12, 12, 12] }),
    exercise('c', { sets: 3, repsMin: 8, repsMax: 12 }),
    exercise('d', { sets: 3, reps: 10 }),
  ] }]), text);
  assert.deepEqual(result.routine.workouts[0].exercises.map((e) => [e.sets, e.reps]), [
    [3, { type: 'perSet', values: [10, 10, 8] }],
    [3, { type: 'fixed', value: 12 }],
    [3, { type: 'range', min: 8, max: 12 }],
    [3, { type: 'fixed', value: 10 }],
  ]);
});

test('uncertain or unresolved exercises block the draft and are listed for review', () => {
  const parsed = routine([
    { name: 'Push', notes: [], exercises: [exercise('bench', { sets: 3, reps: 8 }), exercise('shoulder press', { repsPerSet: [10, 10, 8] })] },
    { name: 'Pull', notes: [], exercises: [exercise('shoulder burnout')] },
  ]);
  const result = build(parsed, 'Push\nbench 3x8\nshoulder press 10 10 8\nPull\nshoulder burnout');
  assert.deepEqual(result.summary, { workouts: 2, exercises: 3, matched: 1, uncertain: 1, unresolved: 1 });
  assert.equal(result.importDraft.ready, false);
  assert.equal(result.importDraft.split, null);
  assert.deepEqual(result.importDraft.issues.map((issue) => [issue.code, issue.path]), [['needs_confirmation', 'w1e2'], ['needs_exercise', 'w2e1']]);
  assert.equal(result.routine.workouts[0].exercises[1].matchedName, null);
});

test('decisions turn a reviewed result into a valid PortableSplit', () => {
  const result = build(routine([{ name: 'Push', notes: [], exercises: [
    exercise('bench'), exercise('shoulder press'), exercise('shoulder burnout'), exercise('hammer curls'),
  ] }]), 'Push\nbench\nshoulder press\nshoulder burnout\nhammer curls');
  assert.equal(importResult.toPortableSplit(result).error.code, 'needs_review');
  const split = importResult.toPortableSplit(result, {
    name: 'My Push',
    decisions: {
      w1e2: { type: 'builtin', name: 'Overhead Press' },
      w1e3: { type: 'custom', exercise: { name: 'Shoulder Burnout', workoutType: 'shoulders', primaryMuscle: 'Shoulders', equipment: null, loadType: 'external_weight', metric: 'reps' } },
      w1e4: { type: 'skip' },
    },
  });
  assert.equal(split.ok, true, JSON.stringify(split));
  assert.deepEqual(split.value.workouts[0].exercises.map((e) => [e.kind, e.name]), [
    ['builtin', 'Bench Press'], ['builtin', 'Overhead Press'], ['custom', 'Shoulder Burnout'],
  ]);
  const duplicate = importResult.toPortableSplit(result, { decisions: { w1e2: { type: 'builtin', name: 'Bench Press' }, w1e3: { type: 'skip' } } });
  assert.equal(duplicate.error.code, 'duplicate_exercise');
});

test('a fully matched paste feeds the existing importer unchanged, and parsing writes nothing', () => {
  const h = harness();
  try {
    const before = h.sql.prepare('SELECT COUNT(*) AS n FROM custom_splits').get().n;
    const parsed = routine([
      { name: 'Push', notes: [], exercises: [exercise('bench', { sets: 3, reps: 8 }), exercise('incline db', { sets: 3 }), exercise('lat raises', { sets: 4, reps: 12 }), exercise('tri pushdown', { sets: 3, reps: 12 })] },
      { name: 'Pull', notes: [], exercises: [exercise('deadlift', { sets: 3, reps: 5 }), exercise('lat pull', { sets: 3, reps: 10 }), exercise('seated row'), exercise('hammer curls', { sets: 3, reps: 12 })] },
    ], { routineName: 'PPL' });
    const result = build(parsed, BRIEF);
    assert.equal(result.importDraft.ready, true, JSON.stringify(result.importDraft.issues));
    assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM custom_splits').get().n, before);

    const imported = h.db.importPortableSplitSync(result.importDraft.split);
    const workouts = h.sql.prepare(`SELECT w.name AS workout, e.name AS exercise FROM custom_split_workouts w
      JOIN custom_split_workout_exercises we ON we.workout_id = w.id JOIN exercises e ON e.id = we.exercise_id
      WHERE w.split_id = ? ORDER BY w.position, we.position`).all(imported.splitId);
    assert.equal(imported.name, 'PPL');
    assert.deepEqual(workouts.map((row) => `${row.workout}: ${row.exercise}`), [
      'Push: Bench Press', 'Push: Incline Dumbbell Press', 'Push: Lateral Raises', 'Push: Tricep Pushdown',
      'Pull: Deadlift', 'Pull: Lat Pulldown', 'Pull: Seated Cable Row', 'Pull: Hammer Curls',
    ]);
    assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM exercises WHERE is_custom = 1').get().n, 0);
  } finally { h.sql.close(); }
});
