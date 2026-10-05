const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { harness: databaseHarness } = require('./hevyHarness.cjs');
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(setImmediate); };
const ID = 'AAAAAAAAAAAAAAAAAAAAAA', OTHER = 'BBBBBBBBBBBBBBBBBBBBBQ';
const builtin = name => ({ kind: 'builtin', name });
const custom = (name = 'Staged hold', extra = {}) => ({ kind: 'custom', name, workoutType: 'core',
  primaryMuscle: 'Core', equipment: null, loadType: 'bodyweight', metric: 'duration', ...extra });
const routine = () => ({ name: 'Received routine', workouts: [
  { name: 'Push', color: 'purple', exercises: [builtin('Bench Press'), custom()] },
  { name: 'Empty named workout', color: 'teal', exercises: [] },
  { name: '', exercises: [custom(), builtin('Back Squat')] },
] });
function harness({ disk = new Map(), fail = {}, mocks = {} } = {}) {
  const h = databaseHarness({
    'expo-modules-core': { uuid: { v4: randomUUID } },
    'react-native-url-polyfill': { URL },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: async key => { if (fail.read) throw Error('read failed'); return disk.get(key) ?? null; },
      setItem: async (key, value) => { if (fail.write || fail.reject?.(value)) throw Error('write failed'); disk.set(key, value); },
      removeItem: async key => disk.delete(key),
    } }, ...mocks,
  });
  const module = h.load('@/store/customSplitDraft');
  const seeds = [...h.database.EXERCISE_SEEDS, ...h.database.ARCHETYPE_EXERCISE_SEEDS];
  const build = h.load('@/features/sharing/sharedRoutineDraft');
  const open = (id = ID, split = routine()) => module.useCustomSplitDraftStore.getState().initializeSharedDraft(id, split.name, build.buildSharedRoutineDraft(split, seeds));
  return { ...h, disk, fail, seeds, build, open, store: module.useCustomSplitDraftStore, draftModule: module,
    save: () => h.load('@/features/sharing/saveSharedRoutineDraft').saveSharedRoutineDraft() };
}
const structuralTables = ['exercises', 'custom_splits', 'custom_split_workouts', 'custom_split_workout_exercises',
  'profile', 'sessions', 'session_exercises', 'sets', 'shared_split_import_receipts'];
const snapshot = h => Object.fromEntries(structuralTables.map(table => [table, h.sql.prepare(`SELECT * FROM ${table}`).all()]));
const count = (h, table) => h.sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
const response = (body, status = 200) => ({ ok: status < 400, status, headers: new Headers(), text: async () => body });

test('fetch validates IDs, V1 payloads and privacy using the same API configuration', async () => {
  const h = harness();
  try {
    const client = h.load('@/features/sharing/routineShareClient');
    const protocol = h.load('@/features/sharing/splitProtocol');
    const canonical = protocol.serializeSharedSplit(routine()).value;
    const calls = [];
    const fetched = await client.fetchRoutineShare(ID, { baseUrl: 'https://api.internal', fetch: async (...args) => { calls.push(args); return response(canonical); } });
    assert.deepEqual(fetched, routine()); assert.equal(calls[0][0], `https://api.internal/v1/routine-shares/${ID}`);
    const raw = JSON.parse(canonical); raw.id = 123; raw.history = ['private'];
    assert.deepEqual(await client.fetchRoutineShare(ID, { baseUrl: 'https://api.internal', fetch: async () => response(JSON.stringify(raw)) }), routine());
    for (const id of [undefined, '', 'short', [ID], 'a'.repeat(22)]) {
      await assert.rejects(client.fetchRoutineShare(id, { fetch: () => { throw Error('must not fetch'); } }), /This routine link is broken/);
    }
    await assert.rejects(client.fetchRoutineShare(ID, { baseUrl: null }), /Couldn’t load/);
  } finally { h.sql.close(); }
});

test('fetch distinguishes missing, temporary failures, invalid payload and newer protocol with concise copy', async () => {
  const h = harness();
  try {
    const fetchShare = h.load('@/features/sharing/routineShareClient').fetchRoutineShare;
    for (const [reply, message] of [
      [response('{}', 404), 'This routine is no longer available.'],
      [response('server secret', 503), 'Couldn’t load this routine. Try again.'],
      [response('server secret', 500), 'Couldn’t load this routine. Try again.'],
      [response('invalid'), 'This routine link is broken.'],
      [response('{"type":"stack.split","v":99}'), 'This routine needs a newer Stack. Update to open it.'],
    ]) await assert.rejects(fetchShare(ID, { baseUrl: 'https://api.internal', fetch: async () => reply }), error => error.message === message);
    await assert.rejects(fetchShare(ID, { baseUrl: 'https://api.internal', timeoutMs: 2,
      fetch: (_, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Error('secret')))) }), /Couldn’t load/);
    const controller = new AbortController(); controller.abort();
    let called = false;
    await assert.rejects(fetchShare(ID, { signal: controller.signal, baseUrl: 'https://api.internal', fetch: async () => { called = true; } }), /Couldn’t load/);
    assert.equal(called, false);
  } finally { h.sql.close(); }
});

test('stale and cancelled entries cannot overwrite a newer draft or navigate after leaving', async () => {
  const h = harness(); await settle();
  try {
    const completions = [], navigated = [];
    const entry = h.load('@/features/sharing/sharedRoutineEntry').createSharedRoutineEntry({ seeds: h.seeds,
      getDraftStore: h.store.getState, fetch: () => new Promise(resolve => completions.push(resolve)), openEditor: id => navigated.push(id) });
    const first = entry.load(ID), second = entry.load(OTHER);
    completions[1]({ ...routine(), name: 'Newer intent' }); await second;
    completions[0](routine()); await first;
    assert.equal(h.store.getState().draft.name, 'Newer intent'); assert.deepEqual(navigated, [OTHER]);
    const third = entry.load(ID); entry.cancel(); completions[2](routine()); await third;
    assert.deepEqual(navigated, [OTHER]); assert.equal(h.store.getState().sharedContext.shareId, OTHER);
  } finally { h.sql.close(); }
});

test('entry ownership remains cancellable while durable handoff cleanup awaits, so a late editor navigation cannot win', async () => {
  const h = harness(); await settle();
  try {
    const releases = [], routes = [];
    const entry = h.load('@/features/sharing/sharedRoutineEntry').createSharedRoutineEntry({ seeds: h.seeds,
      getDraftStore: h.store.getState, fetch: async () => routine(),
      openEditor: async (id, { signal }) => {
        await new Promise(resolve => releases.push(resolve));
        if (!signal.aborted) routes.push(id);
      } });
    const first = entry.load(ID); await settle();
    const next = entry.load(OTHER); await settle();
    releases[0](); await first; assert.deepEqual(routes, []);
    releases[1](); await next; assert.deepEqual(routes, [OTHER]);
    assert.equal(h.store.getState().sharedContext.shareId, OTHER);
    const exited = entry.load(ID); await settle(); entry.cancel(); releases[2](); await exited;
    assert.deepEqual(routes, [OTHER]);
  } finally { h.sql.close(); }
});

test('isolated shared slots preserve local drafts, order, names, colors, empty days and staged definitions with zero DB writes', async () => {
  const h = harness(); await settle();
  try {
    const s = () => h.store.getState();
    s().initializeDraft('Unfinished local', 1, 'library');
    const unfinished = JSON.stringify(s().drafts.new), before = snapshot(h);
    h.open();
    assert.equal(s().source, 'shared'); assert.equal(s().editingSplitId, null);
    assert.equal(JSON.stringify(s().drafts.new), unfinished);
    assert.deepEqual(h.build.sharedDraftToPortable(s().draft, h.database.BUILT_IN_EXERCISE_NAMES), routine());
    assert.ok(s().draft.workouts.flatMap(day => day.exercises).every(exercise => exercise.id < 0 && exercise.portable));
    assert.deepEqual(snapshot(h), before);
    const first = s().draft.workouts[0]; s().setSplitName('Edited'); s().setWorkoutCustomName(first.id, 'Edited push');
    h.open(OTHER); assert.ok(s().drafts[`shared:${ID}`]);
    s().discardDraft(); assert.equal(s().resumeDraft(null, 'shared', ID), true);
    assert.equal(s().draft.name, 'Edited'); assert.equal(s().draft.workouts[0].customName, 'Edited push');
    s().discardDraft(); assert.deepEqual(Object.keys(s().drafts), ['new']);
    assert.equal(s().resumeDraft(null), true); assert.equal(s().draft.name, 'Unfinished local');
    assert.deepEqual(snapshot(h), before);
  } finally { h.sql.close(); }
});

test('shared editing and staged custom creation use normal draft operations and remain portable', async () => {
  const h = harness(); await settle();
  try {
    const before = snapshot(h); h.open(); const s = () => h.store.getState();
    const first = s().activeWorkoutId;
    s().setSplitName('My edited copy'); s().setWorkoutCustomName(first, 'Upper'); s().setWorkoutColor(first, 'blue');
    s().reorderExercise(first, 0, 1); s().duplicateWorkout(first); s().reorderWorkout(0, 1);
    s().addWorkout(); const added = s().activeWorkoutId; s().setWorkoutCustomName(added, 'New workout');
    const staged = h.build.stageSharedCustomExercise(s().draft, [], { name: 'New timed lift', workoutType: 'core',
      primaryMuscle: 'Core', equipment: null, loadType: 'bodyweight', metric: 'duration', isCustom: true });
    s().addExercise(added, staged); s().removeExercise(added, staged.id); s().restoreExercise(added, staged, 0);
    s().deleteWorkout(s().draft.workouts[2].id);
    const portable = h.build.sharedDraftToPortable(s().draft, h.database.BUILT_IN_EXERCISE_NAMES);
    assert.equal(portable.name, 'My edited copy'); assert.equal(portable.workouts[0].name, 'Upper');
    assert.equal(portable.workouts[0].color, 'blue'); assert.deepEqual(portable.workouts[0].exercises.map(item => item.name), ['Staged hold', 'Bench Press']);
    assert.equal(portable.workouts.at(-1).exercises[0].metric, 'duration');
    assert.deepEqual(snapshot(h), before);
    s().setSplitName(''); assert.throws(() => h.build.sharedDraftToPortable(s().draft, h.database.BUILT_IN_EXERCISE_NAMES), /Check your routine/);
  } finally { h.sql.close(); }
});

test('unknown built-in fails before any draft or database mutation; missing local seed rows remain staged', async () => {
  const h = harness(); await settle();
  try {
    h.store.getState().initializeDraft('Keep', 1, 'library'); const before = snapshot(h);
    assert.throws(() => h.open(ID, { name: 'Future', workouts: [{ name: 'Day', exercises: [builtin('Future lift')] }] }), /newer Stack/);
    assert.equal(h.store.getState().draft.name, 'Keep'); assert.deepEqual(snapshot(h), before);
    h.sql.prepare('DELETE FROM exercises WHERE name = ?').run('Bench Press'); const absent = snapshot(h);
    h.open(); assert.deepEqual(snapshot(h), absent);
    await h.save(); assert.ok(h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get('Bench Press'));
  } finally { h.sql.close(); }
});

test('shared and local drafts recover independently after restart, retaining edits and temporary identities', async () => {
  const h = harness(); await settle(); let reopened;
  try {
    h.store.getState().initializeDraft('Local unfinished', 1, 'library'); h.open();
    h.store.getState().setSplitName('Edited received'); h.store.getState().closeDraft(); await settle();
    reopened = harness({ disk: h.disk }); await settle(); const s = () => reopened.store.getState();
    assert.equal(s().draft, null); assert.equal(s().resumeDraft(null, 'shared', ID), true);
    assert.equal(s().draft.name, 'Edited received'); assert.equal(s().draft.workouts[0].color, 'purple');
    assert.equal(s().draft.workouts[0].exercises[1].portable.metric, 'duration');
    s().discardDraft(); await settle(); assert.equal(s().resumeDraft(null), true); assert.equal(s().draft.name, 'Local unfinished');
  } finally { h.sql.close(); reopened?.sql.close(); }
});

test('final save commits an independent copy without profile/history/activation changes and clears only its slot', async () => {
  const h = harness(); await settle();
  try {
    const original = h.database.importPortableSplitSync(routine());
    h.database.writeProfile({ name: 'Recipient', experienceLevel: 'intermediate', weeklyGoal: 3, trainingDays: [1, 3, 5],
      onboardingCompleted: true, activeSplitId: original.splitId, programMode: 'custom', autoIncreaseWeight: true,
      weightIncrement: 0.5, weightIncrementLbs: 5, weightUnit: 'kg' });
    const before = snapshot(h);
    h.store.getState().initializeDraft('Unfinished', 1, 'library'); h.open(); h.open(OTHER); h.open(ID);
    const unfinished = h.store.getState().drafts.new;
    const saved = await h.save();
    assert.notEqual(saved.splitId, original.splitId); assert.equal(saved.name, 'Received routine 2');
    const detail = await h.database.getCustomSplitDetailAsync(saved.splitId);
    assert.deepEqual(detail.workouts.map(day => [day.name, day.color, day.exercises.map(item => item.name)]),
      [['Push', 'purple', ['Bench Press', 'Staged hold']], ['Empty named workout', 'teal', []], ['', null, ['Staged hold', 'Back Squat']]]);
    assert.deepEqual(h.store.getState().drafts.new, unfinished); assert.ok(h.store.getState().drafts[`shared:${OTHER}`]);
    assert.equal(h.store.getState().drafts[`shared:${ID}`], undefined); assert.equal(h.store.getState().draft, null);
    for (const table of ['profile', 'sessions', 'session_exercises', 'sets']) assert.deepEqual(snapshot(h)[table], before[table]);
    assert.equal(count(h, 'exercises'), before.exercises.length, 'equivalent custom reused');
    h.database.renameCustomSplitSync(saved.splitId, 'Independent edited');
    assert.equal((await h.database.getCustomSplitDetailAsync(original.splitId)).name, 'Received routine');
  } finally { h.sql.close(); }
});

test('custom conflicts disambiguate on save, while staged metadata stays intact until commit', async () => {
  const h = harness(); await settle();
  try {
    h.database.createCustomExerciseSync('Staged hold', 'core', 'Core', 'Cable', 'external_weight', 'reps');
    const before = snapshot(h); h.open(); assert.deepEqual(snapshot(h), before);
    const saved = await h.save(); const detail = await h.database.getCustomSplitDetailAsync(saved.splitId);
    assert.equal(detail.workouts[0].exercises[1].name, 'Staged hold (shared)');
    assert.equal(detail.workouts[0].exercises[1].metric, 'duration');
    assert.equal(detail.workouts[0].exercises[1].equipment, null);
  } finally { h.sql.close(); }
});

for (const table of ['exercises', 'custom_split_workouts', 'custom_split_workout_exercises', 'shared_split_import_receipts']) {
  test(`failed ${table} transaction rolls back catalog and routine graph, retaining draft for retry`, async () => {
    const h = harness(); await settle();
    try {
      h.store.getState().initializeDraft('Keep', 1, 'library'); h.open(); const before = snapshot(h);
      const draft = h.store.getState().draft;
      h.sql.exec(`CREATE TRIGGER fail_shared BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'injected'); END;`);
      await assert.rejects(h.save(), /injected/);
      assert.deepEqual(snapshot(h), before); assert.equal(h.store.getState().draft, draft); assert.ok(h.store.getState().drafts.new);
      h.sql.exec('DROP TRIGGER fail_shared'); await h.save();
      assert.equal(count(h, 'custom_splits'), 1); assert.equal(count(h, 'shared_split_import_receipts'), 1);
    } finally { h.sql.close(); }
  });
}

test('rapid saves coalesce; failed cleanup keeps the draft and retry uses the committed import receipt', async () => {
  const fail = {}, h = harness({ fail }); await settle();
  try {
    h.store.getState().initializeDraft('Keep', 1, 'library'); h.open();
    fail.reject = value => !JSON.parse(value).state.drafts[`shared:${ID}`];
    const first = h.save(), second = h.save(); assert.equal(first, second);
    await assert.rejects(first);
    assert.equal(count(h, 'custom_splits'), 1); assert.ok(h.store.getState().draft);
    fail.reject = null; await h.save();
    assert.equal(count(h, 'custom_splits'), 1); assert.equal(h.store.getState().drafts[`shared:${ID}`], undefined);
    assert.ok(h.store.getState().drafts.new);
  } finally { h.sql.close(); }
});

test('unreadable or unwritable draft storage prevents final commit without losing other drafts', async () => {
  const fail = {}, h = harness({ fail }); await settle();
  try {
    h.store.getState().initializeDraft('Keep', 1, 'library'); h.open(); const before = snapshot(h);
    fail.write = true; await assert.rejects(h.save());
    assert.deepEqual(snapshot(h), before); assert.ok(h.store.getState().drafts.new); assert.ok(h.store.getState().draft);
    fail.write = false; await h.save(); assert.equal(count(h, 'custom_splits'), 1);
  } finally { h.sql.close(); }
});

test('temporary custom identities are never reused after removal, so Undo cannot restore the wrong exercise', async () => {
  const h = harness(); await settle();
  try {
    h.open(); const state = () => h.store.getState(); const day = state().activeWorkoutId;
    const original = state().draft.workouts[0].exercises[1]; state().removeExercise(day, original.id);
    const id = state().allocateSharedExerciseId(); assert.ok(id < original.id);
    const added = h.build.stageSharedCustomExercise(state().draft, [], { name: 'Another exercise', workoutType: 'core',
      primaryMuscle: 'Core', equipment: null, loadType: 'bodyweight', metric: 'reps', isCustom: true }, id);
    state().addExercise(day, added); state().restoreExercise(day, original, 1);
    assert.deepEqual(state().draft.workouts[0].exercises.map(exercise => exercise.name), ['Bench Press', 'Staged hold', 'Another exercise']);
  } finally { h.sql.close(); }
});
