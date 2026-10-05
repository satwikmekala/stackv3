/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('./hevyHarness.cjs');
const KEY = '11111111-2222-3333-4444-555555555555';
const time = '2026-09-01T10:00:00.000Z';
const template = (id = '05293BCA', extra = {}) => ({ id, title: 'Bench Press (Barbell)', type: 'weight_reps', primary_muscle_group: 'chest', secondary_muscle_groups: ['triceps'], equipment: 'barbell', is_custom: false, ...extra });
const set = (index = 0, extra = {}) => ({ index, type: 'normal', weight_kg: 60, reps: 8, duration_seconds: null, distance_meters: null, rpe: 8, custom_metric: null, ...extra });
const exercise = (index = 0, extra = {}) => ({ index, title: 'Bench Press (Barbell)', exercise_template_id: '05293BCA', notes: 'Keep control.', superset_id: null, sets: [set()], ...extra });
const workout = (id = 'w1', extra = {}) => ({ id, title: 'Morning workout', routine_id: 'r1', description: 'Felt good.', start_time: time, end_time: '2026-09-01T11:00:00.000Z', created_at: time, updated_at: time, exercises: [exercise()], ...extra });
const routine = (id = 'r1', extra = {}) => ({ id, title: 'Upper', folder_id: 2, created_at: time, updated_at: time, exercises: [exercise(0, { rest_seconds: '90', sets: [set(0, { weight_kg: 25, rep_range: { start: 6, end: 10 } })] })], ...extra });
const folder = { id: 2, index: 0, title: 'Training', created_at: time, updated_at: time };
function snapshot(h, extra = {}) {
  const s = h.load('@/features/import/hevy/schemas');
  return { source: 'hevy', accountId: 'account-1', weightUnit: 'lbs', folders: [s.parseFolder(folder)], templates: [s.parseTemplate(template())], routines: [s.parseRoutine(routine())], workouts: [s.parseWorkout(workout())], incompleteWorkouts: 0, ...extra };
}
function api(pages = {}) {
  const requests = [];
  const defaults = { '/v1/user/info': { data: { id: 'account-1', weight_unit: 'lbs' } }, '/v1/workouts/count': { workout_count: 1 },
    '/v1/routine_folders': [folder], '/v1/routines': [routine()], '/v1/workouts': [workout()], '/v1/exercise_templates': [template()] };
  const names = { '/v1/routine_folders': 'routine_folders', '/v1/routines': 'routines', '/v1/workouts': 'workouts', '/v1/exercise_templates': 'exercise_templates' };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const u = new URL(url); const data = pages[u.pathname] ?? defaults[u.pathname];
    if (data instanceof Response) return data;
    if (typeof data === 'function') return data(u, options);
    if (!names[u.pathname]) return Response.json(data);
    const page = Number(u.searchParams.get('page'));
    const batches = Array.isArray(data[0]) ? data : [data];
    return Response.json({ page, page_count: batches.length, [names[u.pathname]]: batches[page - 1] });
  };
  return { fetch, requests };
}

test('API authenticates with a header, reads stable account identity, and never puts the key in a URL or snapshot', async () => {
  const h = harness(); try {
    const mock = api(); const client = h.load('@/features/import/hevy/client').createHevyClient(KEY, { fetch: mock.fetch });
    assert.deepEqual(await client.verify(), { accountId: 'account-1', weightUnit: 'lbs' });
    const data = await client.scan(); assert.equal(data.workouts.length, 1); assert.equal(data.routines.length, 1);
    assert.ok(mock.requests.every(r => r.options.headers['api-key'] === KEY && !r.url.includes(KEY)));
    assert.equal(JSON.stringify(data).includes(KEY), false);
    await assert.rejects(client.verify(), error => error.code === 'cancelled');
  } finally { h.sql.close(); }
});
for (const status of [401, 403]) test(`API ${status} does not retry or reveal provider errors`, async () => {
  const h = harness(); try {
    let calls = 0;
    const client = h.load('@/features/import/hevy/client').createHevyClient(KEY, { fetch: async () => { calls++; return new Response(KEY, { status }); } });
    await assert.rejects(client.scan(), error => error.code === 'credentials' && !JSON.stringify(error).includes(KEY) && !error.message.includes(KEY));
    assert.equal(calls, 1); await assert.rejects(client.verify(), error => error.code === 'cancelled');
  } finally { h.sql.close(); }
});
test('API transient network, unavailable and rate-limit errors retry at most three times with a bounded delay', async () => {
  const h = harness(); try {
    const create = h.load('@/features/import/hevy/client').createHevyClient;
    for (const failure of ['network', 503, 429]) {
      let calls = 0; const delays = [];
      const client = create(KEY, { fetch: async () => { calls++; if (failure === 'network') throw Error(KEY); return new Response(KEY, { status: failure, headers: { 'Retry-After': '9999' } }); }, sleep: async ms => { delays.push(ms); } });
      await assert.rejects(client.scan(), error => error.code === 'network' && !error.message.includes(KEY));
      assert.equal(calls, 3); assert.equal(delays.length, 2); assert.ok(delays.every(ms => ms <= 30000));
    }
    let calls = 0;
    const client = create(KEY, { fetch: async () => { if (++calls === 1) return new Response('', { status: 503 }); return Response.json({ data: { id: 'a', weight_unit: 'kg' } }); }, sleep: async () => {} });
    assert.equal((await client.verify()).accountId, 'a'); assert.equal(calls, 2); client.dispose();
  } finally { h.sql.close(); }
});
test('API malformed JSON and schema errors stop without retry, and cancellation discards the credential', async () => {
  const h = harness(); try {
    const create = h.load('@/features/import/hevy/client').createHevyClient;
    for (const body of ['invalid JSON', '{}']) {
      let calls = 0; const client = create(KEY, { fetch: async () => { calls++; return new Response(body); } });
      await assert.rejects(client.scan(), error => error.code === 'reading'); assert.equal(calls, 1);
    }
    assert.throws(() => create('not a key'), error => error.code === 'credentials');
    const controller = new AbortController(); controller.abort();
    const client = create(KEY, { signal: controller.signal, fetch: async () => { throw Error('Must not fetch'); } });
    await assert.rejects(client.scan(), error => error.code === 'cancelled');
  } finally { h.sql.close(); }
});
test('API reads all workout, routine, template and folder pages sequentially, including missing template details', async () => {
  const h = harness(); try {
    const mock = api({ '/v1/workouts/count': { workout_count: 2 }, '/v1/workouts': [[workout()], [workout('w2', { exercises: [exercise(0, { exercise_template_id: 'extra' })] })]],
      '/v1/routines': [[routine()], [routine('r2')]], '/v1/exercise_templates': [[template()], [template('unused')]], '/v1/routine_folders': [[folder], [{ ...folder, id: 3, index: 1 }]],
      '/v1/exercise_templates/extra': template('extra', { title: 'My custom lift', is_custom: true }) });
    let active = 0, maxActive = 0;
    const client = h.load('@/features/import/hevy/client').createHevyClient(KEY, { fetch: async (...args) => { maxActive = Math.max(maxActive, ++active); try { return await mock.fetch(...args); } finally { active--; } } });
    const progress = []; const data = await client.scan(p => progress.push(p));
    assert.equal(data.workouts.length, 2); assert.equal(data.routines.length, 2); assert.equal(data.folders.length, 2);
    assert.deepEqual(data.templates.map(t => t.id), ['05293BCA', 'extra']); assert.equal(maxActive, 1);
    assert.ok(mock.requests.some(r => r.url.endsWith('workouts?page=2&pageSize=10')));
    assert.ok(mock.requests.some(r => r.url.endsWith('exercise_templates?page=2&pageSize=100')));
    assert.ok(progress.some(p => p.stage === 'workouts' && p.read === 2));
  } finally { h.sql.close(); }
});
test('API rejects changed, duplicated or truncated pages before any persistence; unfinished workouts are excluded', async () => {
  const h = harness(); try {
    const create = h.load('@/features/import/hevy/client').createHevyClient;
    for (const overrides of [
      { '/v1/workouts/count': { workout_count: 2 } },
      { '/v1/routines': [[routine()], [routine()]] },
      { '/v1/routines': u => Response.json({ page: Number(u.searchParams.get('page')), page_count: Number(u.searchParams.get('page')) === 1 ? 2 : 1, routines: [routine()] }) },
      { '/v1/routines': () => Response.json({ page: 1, page_count: 2, routines: [] }) },
    ]) await assert.rejects(create(KEY, { fetch: api(overrides).fetch }).scan(), error => error.code === 'reading');
    const data = await create(KEY, { fetch: api({ '/v1/workouts': [workout('unfinished', { end_time: null })] }).fetch }).scan();
    assert.equal(data.workouts.length, 0); assert.equal(data.incompleteWorkouts, 1);
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 0);
  } finally { h.sql.close(); }
});
test('schema uses explicit timestamps, ordered stable indices and actual routine targets', () => {
  const h = harness(); try {
    const s = h.load('@/features/import/hevy/schemas');
    const r = s.parseRoutine(routine('r', { exercises: [exercise(8), exercise(2, { rest_seconds: 60, sets: [set(9), set(3)] })] }));
    assert.deepEqual(r.exercises.map(e => e.index), [2, 8]); assert.deepEqual(r.exercises[0].sets.map(s => s.index), [3, 9]); assert.equal(r.exercises[0].restS, 60);
    assert.throws(() => s.parseWorkout(workout('bad', { start_time: '2026-09-01T10:00:00' })));
    assert.throws(() => s.parseWorkout(workout('bad', { end_time: '2026-08-01T10:00:00Z' })));
    assert.throws(() => s.parseRoutine(routine('bad', { exercises: [exercise(), exercise()] })));
    assert.equal(s.parseSet(set(0, { weight_kg: -30 })).weightKg, -30, 'assistance is preserved as a source fact');
  } finally { h.sql.close(); }
});
test('resolver prioritizes stable IDs, conservative aliases and equipment evidence; custom identities stay distinct', () => {
  const h = harness(); try {
    const s = h.load('@/features/import/hevy/schemas');
    const catalog = h.load('@/features/import/hevy/importPlan').readImportCatalog(h.adapter);
    const resolve = h.load('@/features/import/hevy/exerciseResolver').resolveHevyExercise;
    assert.equal(resolve(s.parseTemplate(template()), catalog).method, 'known-id');
    const alias = resolve(s.parseTemplate(template('alias', { title: 'Bicep Curls', primary_muscle_group: 'biceps' })), catalog);
    assert.equal(h.load('@/constants/exerciseNames').displayExerciseName(alias.name), 'Barbell Curl'); assert.notEqual(alias.localId, null);
    const unknown = resolve(s.parseTemplate(template('unknown', { title: 'Bench Press variant number 12' })), catalog);
    assert.equal(unknown.method, 'custom'); assert.equal(unknown.localId, null);
    assert.equal(resolve(s.parseTemplate(template('mine', { title: 'Bench Press', is_custom: true })), catalog).method, 'custom');
    assert.equal(resolve(s.parseTemplate(template('wrong-id', { title: 'Goblet Squat', type: 'duration' })), catalog).localId, null);
    assert.equal(resolve(s.parseTemplate(template('05293BCA', { equipment: 'dumbbell' })), catalog).localId, null, 'conflicting equipment must not resolve to a barbell exercise');
    const metadata = resolve(s.parseTemplate(template('metadata', { title: 'Hammer Curl (Dumbbell)', equipment: 'dumbbell' })),
      [{ id: 99, name: 'Dumbbell Hammer Curl', workoutType: 'arms', primaryMuscle: 'Biceps', loadType: 'external_weight', metric: 'reps', isCustom: false }]);
    assert.equal(metadata.method, 'metadata');
    assert.equal(resolve(s.parseTemplate(template()), catalog, alias.localId).method, 'source-id');
  } finally { h.sql.close(); }
});
test('atomic import preserves folder, routine/exercise order, actual dates, weights, notes and prescription separation', async () => {
  const h = harness(); try {
    const s = h.load('@/features/import/hevy/schemas'); const data = snapshot(h, { routines: [s.parseRoutine(routine('r2', { title: 'Second', exercises: [exercise(5), exercise(1)] })), s.parseRoutine(routine())] });
    const result = h.persist(data); assert.deepEqual(result, { routines: 2, workouts: 1, exercises: 0, alreadyImported: 0 });
    const detail = await h.database.getCustomSplitDetailAsync(h.adapter.getFirstSync('SELECT id FROM custom_splits').id);
    assert.equal(detail.name, 'Training'); assert.deepEqual(detail.workouts.map(w => w.name), ['Second', 'Upper']);
    const facts = JSON.parse(h.adapter.getFirstSync('SELECT data FROM imported_routines WHERE source_id = ?', 'r2').data);
    assert.deepEqual(facts.exercises.map(e => e.index), [1, 5]);
    const sessions = h.database.readCompletedSessionsSync(); assert.equal(sessions[0].date, time);
    assert.equal(sessions[0].completedAt, '2026-09-01T11:00:00.000Z');
    assert.equal(sessions[0].imported.name, 'Morning workout'); assert.equal(sessions[0].imported.notes, 'Felt good.');
    assert.equal(sessions[0].exercises[0].sets[0].weight, 60); assert.equal(sessions[0].exercises[0].sets[0].reps, 8);
    assert.equal(sessions[0].exercises[0].entryUnit, 'lbs');
    assert.equal(JSON.parse(h.adapter.getFirstSync('SELECT data FROM imported_routines WHERE source_id = ?', 'r1').data).exercises[0].sets[0].weightKg, 25);
    const units = h.load('@/store/weightUnits'); assert.equal(units.formatWeight(60, 'lbs'), '132.3'); assert.equal(units.formatWeight(60, 'kg'), '60');
    assert.equal((await h.database.getCustomSplitsAsync())[0].hasHevyDetails, true);
  } finally { h.sql.close(); }
});
test('repeat import is idempotent, source-account identities do not collide, and stale previews are rechecked', () => {
  const h = harness(); try {
    const data = snapshot(h); const stale = h.plan(data); h.persist(data);
    const repeat = h.load('@/features/import/persistence').persistHevyImport(h.adapter, stale);
    assert.deepEqual(repeat, { routines: 0, workouts: 0, exercises: 0, alreadyImported: 2 });
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 1);
    h.persist({ ...data, accountId: 'other-account' }); assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 2);
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM imported_routines').n, 2);
  } finally { h.sql.close(); }
});
test('mid-import SQL failure rolls everything back, keeps existing history and source mappings intact, and retries safely', () => {
  const h = harness(); try {
    h.persist(snapshot(h));
    const backup = h.load('@/store/workoutBackup'); const before = backup.captureWorkoutBackup(h.adapter, 23).tables;
    const s = h.load('@/features/import/hevy/schemas'); const data = snapshot(h, { templates: [s.parseTemplate(template('custom', { is_custom: true, title: 'Custom test' }))],
      routines: [s.parseRoutine(routine('new', { exercises: [exercise(0, { exercise_template_id: 'custom' })] }))], workouts: [s.parseWorkout(workout('new', { exercises: [exercise(0, { exercise_template_id: 'custom' })] }))] });
    h.sql.exec("CREATE TRIGGER fail_hevy BEFORE INSERT ON imported_workouts BEGIN SELECT RAISE(ABORT, 'simulated failure'); END");
    assert.throws(() => h.persist(data), error => error.code === 'persistence');
    assert.deepEqual(backup.captureWorkoutBackup(h.adapter, 23).tables, before);
    h.sql.exec('DROP TRIGGER fail_hevy'); assert.equal(h.persist(data).workouts, 1);
  } finally { h.sql.close(); }
});
test('valid working history informs Progress, chronological PRs and previous values while warmups and all imported Build evidence are excluded', () => {
  const h = harness(); try {
    const s = h.load('@/features/import/hevy/schemas');
    h.persist(snapshot(h, { workouts: [s.parseWorkout(workout('later', { start_time: '2026-09-03T10:00:00Z', end_time: '2026-09-03T11:00:00Z', exercises: [exercise(0, { sets: [set(0, { weight_kg: 999, type: 'warmup' }), set(1, { weight_kg: 70 })] })] })), s.parseWorkout(workout())] }));
    const sessions = h.database.readCompletedSessionsSync();
    const lift = h.load('@/store/liftProgress').deriveLiftProgress(sessions)[0]; assert.equal(lift.latest.weight, 70); assert.equal(lift.previous.weight, 60);
    const records = h.load('@/store/personalRecords'); assert.equal(records.derivePersonalRecords(sessions)[0].best.weight, 70);
    const sets = h.database.readExerciseRecordSetsSync(sessions[0].exercises[0].name, sessions); assert.equal(sets.length, 2);
    assert.equal(records.deriveRecentLifts(sets).flatMap(g => g.sets).filter(s => s.isPR).length, 2);
    const previous = h.database.readLastExerciseHistorySync(sessions[0].exercises[0].name); assert.equal(previous.sets[1].weight, 70);
    assert.equal(h.load('@/store/verifiedSessions').getBuildSessions(sessions).length, 0);
    assert.deepEqual(h.load('@/features/build/buildCounts').buildCounts(sessions, '2026-10-05'), { weeksBuilt: 0, piecesThisWeek: 0, hasHistory: false, sealedWeekStarts: [] });
    const build = h.load('@/features/build/adapter').adaptBuildHistory(sessions, new Date('2026-10-05T10:00:00Z'));
    assert.equal(build.state.sealedWeeks.length, 0); assert.equal(build.state.currentWeek.pieces.length, 0);
  } finally { h.sql.close(); }
});
test('unsupported measurements, assistance, incomplete working values and set kinds survive as facts without fabricated performance', () => {
  const h = harness(); try {
    const s = h.load('@/features/import/hevy/schemas');
    const data = snapshot(h, { templates: [s.parseTemplate(template('distance', { type: 'distance_duration', title: 'Rowing' })), s.parseTemplate(template())], routines: [],
      workouts: [s.parseWorkout(workout('source', { exercises: [exercise(0, { exercise_template_id: 'distance', sets: [set(0, { reps: null, weight_kg: null, duration_seconds: 120, distance_meters: 500 })] }),
        exercise(1, { sets: [set(0, { weight_kg: null }), set(1, { type: 'future-type', weight_kg: 500 })] })] }))] });
    assert.ok(h.plan(data).warnings.some(w => w.includes('Rowing'))); h.persist(data);
    const saved = h.database.readCompletedSessionsSync();
    assert.equal(saved[0].exercises.flatMap(e => e.sets).some(s => s.completed), false);
    assert.equal(saved[0].imported.exercises[0].sets[0].distanceM, 500); assert.equal(saved[0].imported.exercises[1].sets[0].weightKg, null);
    assert.equal(h.load('@/store/personalRecords').derivePersonalRecords(saved).length, 0); assert.equal(h.load('@/store/liftProgress').deriveLiftProgress(saved).length, 0);
    const usable = h.load('@/features/import/models').usableImportedSet;
    assert.equal(usable(s.parseTemplate(template('assist', { type: 'bodyweight_assisted_reps' })), s.parseSet(set())), false);
    assert.equal(usable(s.parseTemplate(template('time', { type: 'duration' })), s.parseSet(set(0, { reps: null, weight_kg: null, duration_seconds: 45.5 }))), false);
  } finally { h.sql.close(); }
});
test('routine launch uses only explicit routine targets and applicable previous sets without modifying imported facts', () => {
  const h = harness(); try {
    const store = h.load('@/store/workoutStore').useWorkoutStore;
    store.getState().completeNoProgramOnboarding('Sam', 'lbs');
    const data = snapshot(h); h.persist(data);
    const before = h.adapter.getAllSync('SELECT data FROM imported_workouts');
    const workoutId = h.adapter.getFirstSync('SELECT workout_id FROM imported_routines').workout_id;
    const splitId = h.adapter.getFirstSync('SELECT split_id FROM custom_split_workouts WHERE id = ?', workoutId).split_id;
    const launch = h.database.startWorkoutFromCustomWorkout(splitId, workoutId);
    assert.equal(launch.exercises[0].sets.length, 1);
    assert.equal(launch.exercises[0].sets[0].targetWeight, 25); assert.equal(launch.exercises[0].sets[0].targetReps, 6);
    assert.equal(launch.exercises[0].sets[0].weight, 60); assert.equal(launch.exercises[0].sets[0].completed, false);
    assert.deepEqual(h.adapter.getAllSync('SELECT data FROM imported_workouts'), before);
  } finally { h.sql.close(); }
});
test('backup and database reopen preserve source identities, raw facts and repeat-import safety', async () => {
  const h = harness(); try {
    h.load('@/store/workoutStore').useWorkoutStore.getState().completeNoProgramOnboarding('Sam');
    const data = snapshot(h); h.persist(data); const b = h.load('@/store/workoutBackup'); const original = b.captureWorkoutBackup(h.adapter, 23);
    b.restoreWorkoutBackup(h.adapter, JSON.parse(JSON.stringify(original)), 23);
    await h.database.testReopen(); assert.equal(h.persist(data).workouts, 0);
    assert.equal(h.database.readCompletedSessionsSync()[0].imported.exercises[0].notes, 'Keep control.');
    const old = structuredClone(original); old.schemaVersion = 22; for (const key of Object.keys(old.tables)) if (key.startsWith('imported_')) delete old.tables[key];
    const prepared = b.prepareWorkoutBackup(old, h.adapter, 23);
    assert.equal(prepared.schemaVersion, 23); assert.equal(prepared.tables.imported_workouts.length, 0);
  } finally { h.sql.close(); }
});
test('flow scans once, releases keys, retries persistence safely and completes onboarding only on Continue', async () => {
  const h = harness(); try {
    const mock = api(); const states = []; let scans = 0, imports = 0, finishes = 0, fail = true;
    const flow = h.load('@/features/import/hevy/flow').createHevyFlow({ publish: state => states.push(state),
      client: (key, options) => { scans++; return h.load('@/features/import/hevy/client').createHevyClient(key, { ...options, fetch: mock.fetch }); },
      plan: async data => h.plan(data), persist: async plan => { imports++; if (fail) throw Error(KEY); return h.load('@/features/import/persistence').persistHevyImport(h.adapter, plan); },
      finish: async unit => { finishes++; h.load('@/store/workoutStore').useWorkoutStore.getState().completeNoProgramOnboarding('Sam', unit); },
    });
    const first = flow.connect(KEY); assert.equal(flow.connect(KEY), first); await first;
    assert.equal(scans, 1); assert.equal(states.at(-1).stage, 'preview'); assert.equal(h.database.readProfileSync(), null);
    await flow.import(); assert.equal(states.at(-1).stage, 'preview'); assert.ok(states.at(-1).error); assert.equal(JSON.stringify(states).includes(KEY), false);
    fail = false; await flow.import(); assert.equal(imports, 2); assert.equal(states.at(-1).stage, 'done'); assert.equal(finishes, 0);
    await Promise.all([flow.continue(), flow.continue()]); await flow.continue(); assert.equal(finishes, 1);
    assert.equal(h.database.readProfileSync().onboardingCompleted, true); assert.equal(h.database.readProfileSync().programMode, 'none'); assert.equal(h.database.readProfileSync().weightUnit, 'lbs');
    flow.dispose();
  } finally { h.sql.close(); }
});
test('flow cancellation does not publish late scans or persist data and scan errors keep only safe copy', async () => {
  const h = harness(); try {
    const create = h.load('@/features/import/hevy/flow').createHevyFlow;
    let complete, signal; const states = []; let plans = 0, disposals = 0;
    const flow = create({ publish: state => states.push(state), client: (_key, options) => { signal = options.signal; return { scan: () => new Promise(resolve => { complete = resolve; }), dispose() { disposals++; } }; },
      plan: async data => { plans++; return h.plan(data); }, persist: async () => { throw Error('Must not persist'); }, finish: async () => {} });
    const pending = flow.connect(KEY); flow.dispose(); assert.equal(signal.aborted, true); assert.equal(disposals, 1, 'release the key immediately, before the aborted request settles'); complete(snapshot(h)); await pending;
    assert.equal(plans, 0); assert.equal(states.length, 1);
    const failed = create({ publish: state => states.push(state), client: () => { throw Error(KEY); }, plan: async () => {}, persist: async () => {}, finish: async () => {} });
    await failed.connect(KEY); assert.equal(states.at(-1).stage, 'connect'); assert.equal(JSON.stringify(states).includes(KEY), false);
  } finally { h.sql.close(); }
});
test('onboarding routing connects own workouts to import choices; placeholder has no parser and keys have no persistent connection', () => {
  const root = path.resolve(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(read('app/onboarding-preview/starting-point.tsx'), /onTrack=\{flow.bringWorkouts\}/);
  assert.match(read('features/onboarding/useCoreOnboarding.ts'), /router.push\('\/bring-workouts'\)/);
  assert.match(read('app/bring-workouts.tsx'), /router.push\('\/hevy-import'\)/);
  assert.match(read('app/bring-workouts.tsx'), /Coming soon/);
  assert.match(read('app/hevy-import.tsx'), /setKey\(''\)/); assert.match(read('app/hevy-import.tsx'), /secureTextEntry/);
  const source = read('features/import/hevy/client.ts') + read('features/import/hevy/flow.ts');
  assert.doesNotMatch(source, /console\.|AsyncStorage|analytics|captureException/);
  assert.match(read('app/onboarding-preview/index.tsx'), /draft.step === 'bring-workouts'/);
});
test('normalization validation rejects bad references and changed snapshots before preview and inside persistence', () => {
  const h = harness(); try {
    for (const mutate of [
      data => { data.workouts[0].exercises[0].templateId = 'missing'; },
      data => { data.routines[0].folderId = 999; },
      data => { data.workouts[0].exercises[0].sets[0].weightKg = NaN; },
      data => { data.workouts[0].endedAt = '2020-01-01T00:00:00Z'; },
    ]) { const data = snapshot(h); mutate(data); assert.throws(() => h.plan(data), error => error.code === 'reading'); }
    const plan = h.plan(snapshot(h)); plan.snapshot.workouts[0].exercises[0].sets[0].reps = -1;
    assert.throws(() => h.load('@/features/import/persistence').persistHevyImport(h.adapter, plan), error => error.code === 'persistence');
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 0);
  } finally { h.sql.close(); }
});
test('mixed unsupported historical sets cannot seed defaults; timed and bonus facts remain exact and supported', () => {
  const h = harness(); try {
    const s = h.load('@/features/import/hevy/schemas');
    h.persist(snapshot(h, { workouts: [s.parseWorkout(workout('mixed', { exercises: [exercise(0, { sets: [set(0, { weight_kg: null }), set(1, { weight_kg: 75 }), set(2, { type: 'dropset', weight_kg: 40 }), set(3, { type: 'failure', weight_kg: 55 })] })] }))] }));
    const history = h.database.readLastExerciseHistorySync('Bench Press');
    const regular = h.load('@/store/workoutProgression').getRegularSets(history);
    assert.deepEqual(regular.map(set => set.weight), [75, 55]);
    h.persist(snapshot(h, { templates: [s.parseTemplate(template('hold', { title: 'Custom hold', is_custom: true, type: 'weight_duration' }))], routines: [],
      workouts: [s.parseWorkout(workout('hold', { exercises: [exercise(0, { exercise_template_id: 'hold', sets: [set(0, { reps: null, duration_seconds: 45, weight_kg: 12.5 })] })] }))] }));
    const saved = h.database.readCompletedSessionsSync().find(session => session.imported.id === 'hold');
    assert.equal(saved.exercises[0].metric, 'duration'); assert.equal(saved.exercises[0].sets[0].durationS, 45); assert.equal(saved.exercises[0].sets[0].weight, 12.5); assert.equal(saved.exercises[0].sets[0].completed, true);
  } finally { h.sql.close(); }
});
test('thousands of historical workouts import atomically and remain idempotent without changing source weights', () => {
  const h = harness(); try {
    const base = snapshot(h); const count = 2000;
    base.workouts = Array.from({ length: count }, (_, i) => ({ ...structuredClone(base.workouts[0]), id: `bulk-${i}` }));
    assert.equal(h.persist(base).workouts, count); assert.equal(h.persist(base).workouts, 0);
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM imported_workouts').n, count);
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sets WHERE weight = 60 AND reps = 8').n, count);
    assert.equal(h.database.readCompletedSessionsSync().filter(session => session.imported).length, count);
  } finally { h.sql.close(); }
});
