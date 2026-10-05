/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('./hevyHarness.cjs');
const root = path.resolve(__dirname, '..');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/hevy-free-kg.csv'), 'utf8');
const headers = ['title', 'start_time', 'end_time', 'description', 'exercise_title', 'superset_id', 'exercise_notes',
  'set_index', 'set_type', 'weight_kg', 'reps', 'distance_km', 'duration_seconds', 'rpe'];
const row = (extra = {}) => ({ title: 'Upper', start_time: '1 Sep 2026, 10:00', end_time: '1 Sep 2026, 11:00', description: '',
  exercise_title: 'Bench Press (Barbell)', superset_id: '', exercise_notes: '', set_index: 0, set_type: 'normal',
  weight_kg: 60, reps: 8, distance_km: '', duration_seconds: '', rpe: '', ...extra });
const encode = value => `"${String(value).replace(/"/g, '""')}"`;
const csv = (rows = [row()], fields = headers) => [fields.map(encode).join(','), ...rows.map(r => fields.map(k => encode(r[k] ?? '')).join(','))].join('\n');
const parse = (h, text = fixture) => h.load('@/features/import/hevyCsv/parser').parseHevyExport(text,
  h.load('@/features/import/hevy/importPlan').readImportCatalog(h.adapter));
const isError = code => error => error.code === code && !error.message.includes('private');
const nativeMock = { File: { pickFileAsync: async () => ({ canceled: true, result: null }) } };

test('observed 14-column export parses quoted notes, dates, kg, set types, supersets and duration into the shared model', () => {
  const h = harness(); try {
    const data = parse(h);
    assert.equal(data.source, 'hevy'); assert.equal(data.accountId, 'hevy-csv-v1'); assert.equal(data.weightUnit, 'kg');
    assert.deepEqual(data.routines, []); assert.deepEqual(data.folders, []); assert.equal(data.workouts.length, 2);
    const workout = data.workouts[0];
    assert.equal(workout.name, 'Upper, Thursday'); assert.equal(workout.notes, 'Felt good,\nkept control.');
    assert.equal(workout.startedAt, new Date(2026, 8, 3, 10).toISOString());
    assert.equal(workout.endedAt, new Date(2026, 8, 3, 11).toISOString());
    assert.equal(workout.exercises[0].notes, 'Pause, then "press"');
    assert.deepEqual(workout.exercises[0].sets.map(set => [set.index, set.kind, set.weightKg, set.reps]), [[0, 'warmup', 999, 3], [1, 'normal', 70, 8], [2, 'dropset', 40, 6]]);
    assert.equal(workout.exercises[0].sets[1].rpe, 8);
    assert.equal(workout.exercises[1].supersetId, 0); assert.equal(workout.exercises[1].sets[0].durationS, 45);
    h.load('@/features/import/validation').validateImportSnapshot(data);
  } finally { h.sql.close(); }
});

test('imperial and independently selected distance units convert without rounding or changing source display units', () => {
  const h = harness(); try {
    const fields = headers.map(key => key === 'weight_kg' ? 'weight_lbs' : key === 'distance_km' ? 'distance_miles' : key);
    const data = parse(h, csv([row({ weight_lbs: 150, distance_miles: 1.5, duration_seconds: 900, reps: '' })], fields));
    assert.equal(data.weightUnit, 'lbs'); assert.equal(data.workouts[0].exercises[0].sets[0].weightKg, 150 * 0.45359237);
    assert.equal(data.workouts[0].exercises[0].sets[0].distanceM, 1.5 * 1609.344);
    assert.equal(h.plan(data).resolutions[0].compatible, false);
    const mixed = fields.map(key => key === 'distance_miles' ? 'distance_km' : key);
    assert.equal(parse(h, csv([row({ weight_lbs: 150, distance_km: 2 })], mixed)).workouts[0].exercises[0].sets[0].distanceM, 2000);
  } finally { h.sql.close(); }
});

test('UTF-8 BOM, CRLF, header reordering and padded days preserve workout identity', () => {
  const h = harness(); try {
    const original = parse(h, csv());
    const text = '\uFEFF' + csv([row({ start_time: '01 Sep 2026, 10:00', end_time: '01 Sep 2026, 11:00' })], [...headers].reverse()).replace(/\n/g, '\r\n');
    assert.equal(parse(h, text).workouts[0].id, original.workouts[0].id);
  } finally { h.sql.close(); }
});

test('repeated exercises with reset set indices remain separate ordered exercise blocks', () => {
  const h = harness(); try {
    const data = parse(h, csv([row(), row({ set_index: 1, reps: 7 }), row({ reps: 6 }), row({ set_index: 1, reps: 5 })]));
    assert.equal(data.workouts.length, 1); assert.equal(data.workouts[0].exercises.length, 2);
    assert.deepEqual(data.workouts[0].exercises.map(e => [e.index, e.sets.map(s => s.reps)]), [[0, [8, 7]], [1, [6, 5]]]);
  } finally { h.sql.close(); }
});

test('full-content fingerprints keep same title/start workouts distinct and preserve identical nonadjacent occurrences', () => {
  const h = harness(); try {
    const a = row(), other = row({ title: 'Different' }), changed = row({ exercise_notes: 'Different facts', weight_kg: 61 });
    const data = parse(h, csv([a, other, changed, other, a]));
    assert.equal(data.workouts.length, 5); assert.equal(new Set(data.workouts.map(w => w.id)).size, 5);
    assert.notEqual(data.workouts[0].id, data.workouts[2].id); assert.notEqual(data.workouts[0].id, data.workouts[4].id);
    assert.match(data.workouts[0].id, /^csv-workout:[a-f0-9]{64}:0$/); assert.match(data.workouts[4].id, /:1$/);
    assert.equal(h.persist(data).workouts, 5); assert.equal(h.persist(parse(h, csv([a, other, changed, other, a]))).workouts, 0);
  } finally { h.sql.close(); }
});

test('CSV resolution uses the existing aliases/canonical names, creates custom identities and reuses their source mappings', () => {
  const h = harness(); try {
    const data = parse(h); const plan = h.plan(data);
    const bench = plan.resolutions.find(r => r.template.name === 'Bench Press (Barbell)');
    assert.equal(bench.name, 'Bench Press'); assert.equal(bench.method, 'alias'); assert.ok(bench.localId);
    assert.equal(plan.resolutions.find(r => r.template.name === 'Plank').metric, 'duration');
    assert.equal(plan.customExercises, 1);
    h.persist(data); const repeat = h.plan(parse(h));
    assert.equal(repeat.customExercises, 0);
    assert.equal(repeat.resolutions.find(r => r.template.name === 'Mystery press').method, 'source-id');
    assert.equal(parse(h, csv([row({ exercise_title: 'Bnech press' })])).templates[0].name, 'Bnech press');
    assert.equal(h.plan(parse(h, csv([row({ exercise_title: 'Bnech press' })]))).resolutions[0].method, 'custom');
  } finally { h.sql.close(); }
});

test('same file, expanded unchanged history and stale previews do not duplicate history or create saved routines', () => {
  const h = harness(); try {
    const data = parse(h), stale = h.plan(data);
    assert.deepEqual(h.persist(data), { routines: 0, workouts: 2, exercises: 1, alreadyImported: 0 });
    assert.deepEqual(h.load('@/features/import/persistence').persistHevyImport(h.adapter, stale), { routines: 0, workouts: 0, exercises: 0, alreadyImported: 2 });
    const extended = parse(h, fixture + '\n' + csv([row({ title: 'New workout', start_time: '5 Sep 2026, 10:00', end_time: '5 Sep 2026, 11:00' })]).split('\n').slice(1).join('\n'));
    assert.equal(h.persist(extended).workouts, 1);
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 3);
    for (const table of ['custom_splits', 'imported_routines', 'imported_routine_groups']) assert.equal(h.adapter.getFirstSync(`SELECT count(*) n FROM ${table}`).n, 0);
  } finally { h.sql.close(); }
});

test('CSV facts produce chronological records, Progress and previous values; warmups stay out of records, drop sets out of baselines and all imports out of Your Stack', () => {
  const h = harness(); try {
    const data = parse(h, csv([row({ start_time: '3 Sep 2026, 10:00', end_time: '3 Sep 2026, 11:00', set_type: 'warmup', weight_kg: 999 }),
      row({ start_time: '3 Sep 2026, 10:00', end_time: '3 Sep 2026, 11:00', set_index: 1, weight_kg: 70 }),
      row({ start_time: '3 Sep 2026, 10:00', end_time: '3 Sep 2026, 11:00', set_index: 2, set_type: 'drop_set', weight_kg: 40 }), row()]));
    h.persist(data);
    const sessions = h.database.readCompletedSessionsSync(); assert.equal(sessions.length, 2);
    const lift = h.load('@/store/liftProgress').deriveLiftProgress(sessions)[0]; assert.equal(lift.latest.weight, 70); assert.equal(lift.previous.weight, 60);
    const records = h.load('@/store/personalRecords'); assert.equal(records.derivePersonalRecords(sessions)[0].best.weight, 70);
    const sets = h.database.readExerciseRecordSetsSync('Bench Press', sessions); assert.equal(sets.length, 3);
    assert.equal(records.deriveRecentLifts(sets).flatMap(g => g.sets).filter(s => s.isPR).length, 2);
    const previous = h.database.readLastExerciseHistorySync('Bench Press');
    assert.deepEqual(h.load('@/store/workoutProgression').getRegularSets(previous).map(set => set.weight), [70]);
    assert.equal(h.load('@/store/verifiedSessions').getBuildSessions(sessions).length, 0);
    assert.deepEqual(h.load('@/features/build/buildCounts').buildCounts(sessions, '2026-10-05'), { weeksBuilt: 0, piecesThisWeek: 0, hasHistory: false, sealedWeekStarts: [] });
  } finally { h.sql.close(); }
});

test('missing load, distance, unknown kinds, weighted bodyweight, assistance and ambiguous metrics stay reference-only', () => {
  const h = harness(); try {
    const cases = [row({ weight_kg: '' }), row({ distance_km: 1 }), row({ set_type: 'new_hevy_kind' }),
      row({ exercise_title: 'Pull-ups', weight_kg: 20 }), row({ exercise_title: 'Pull-ups (Assisted)', weight_kg: 20 }),
      row({ duration_seconds: 45 }), row({ exercise_title: 'Unknown no load', weight_kg: '' })];
    const data = parse(h, csv(cases.map((r, i) => ({ ...r, title: `Case ${i}` }))));
    h.persist(data);
    const sessions = h.database.readCompletedSessionsSync();
    assert.ok(sessions.every(session => session.exercises.every(e => e.sets.every(set => !set.completed))));
    assert.equal(h.load('@/store/personalRecords').derivePersonalRecords(sessions).length, 0);
    assert.ok(sessions.every(session => session.imported.exercises[0].sets.length === 1));
    assert.equal(sessions.find(s => s.imported.name === 'Case 1').imported.exercises[0].sets[0].distanceM, 1000);
    assert.equal(sessions.find(s => s.imported.name === 'Case 2').imported.exercises[0].sets[0].kind, 'new_hevy_kind');
  } finally { h.sql.close(); }
});

test('known bodyweight and timed measurements and clearly weighted custom duration sets remain usable history', () => {
  const h = harness(); try {
    const data = parse(h, csv([row({ exercise_title: 'Pull-ups', weight_kg: '', reps: 10 }),
      row({ exercise_title: 'Plank', weight_kg: '', reps: '', duration_seconds: 45 }),
      row({ exercise_title: 'Custom weighted hold', weight_kg: 12.5, reps: '', duration_seconds: 30 })]));
    assert.equal(h.persist(data).workouts, 1);
    const [session] = h.database.readCompletedSessionsSync();
    const pull = session.exercises.find(e => e.name === 'Pull-ups'); assert.equal(pull.loadType, 'bodyweight'); assert.equal(pull.sets[0].completed, true); assert.equal(pull.sets[0].reps, 10);
    const plank = session.exercises.find(e => e.name === 'Plank'); assert.equal(plank.metric, 'duration'); assert.equal(plank.sets[0].durationS, 45); assert.equal(plank.sets[0].completed, true);
    const hold = session.exercises.find(e => e.name === 'Custom weighted hold'); assert.equal(hold.metric, 'duration'); assert.equal(hold.sets[0].durationS, 30); assert.equal(hold.sets[0].weight, 12.5); assert.equal(hold.sets[0].completed, true);
    assert.deepEqual(h.load('@/store/personalRecords').derivePersonalRecords([session]).map(record => record.name), ['Pull-ups']);
  } finally { h.sql.close(); }
});

test('incomplete workouts are counted and excluded rather than inventing end times', () => {
  const h = harness(); try {
    const data = parse(h, csv([row(), row({ title: 'Unfinished', end_time: '' })]));
    assert.equal(data.workouts.length, 1); assert.equal(data.incompleteWorkouts, 1);
    assert.ok(h.plan(data).warnings.some(w => w.includes('Unfinished')));
    assert.throws(() => parse(h, csv([row({ end_time: '' })])), isError('empty'));
  } finally { h.sql.close(); }
});

test('malformed quotes, row lengths, impossible dates and invalid numeric values fail before preview with safe copy', () => {
  const h = harness(); try {
    for (const text of [csv() + '\n"unfinished', csv().replace('"Upper"', '"Upper"unexpected'), csv() + '\nx,y',
      csv([row({ start_time: '31 Feb 2026, 10:00' })]), csv([row({ end_time: '1 Sep 2026, 09:00' })]),
      csv([row({ reps: 3.5 })]), csv([row({ weight_kg: 'Infinity' })]), csv([row({ weight_kg: 'private error' })]),
      csv([row({ rpe: 11 })]), csv([row({ set_index: '' })]), csv([row({ exercise_title: '' })]), csv().replace('Upper', 'Up\0per')]) {
      assert.throws(() => parse(h, text), isError('invalid'));
    }
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 0);
  } finally { h.sql.close(); }
});

test('unknown headers, extra schema fields, localized/unrecognized dates and wrong export schemas stop as unsupported', () => {
  const h = harness(); try {
    for (const text of [csv().replace('weight_kg', 'weight'), csv([], [...headers, 'workout_id']), 'Date,Weight\n2026-09-01,60',
      csv([row({ start_time: '1 sept 2026, 10:00' })]), csv([row({ start_time: '2026-09-01T10:00:00Z' })])]) assert.throws(() => parse(h, text), isError('unsupported'));
    for (const text of ['', '\uFEFF\n', csv([])]) assert.throws(() => parse(h, text), isError('empty'));
  } finally { h.sql.close(); }
});

test('UTF-8 byte, set and workout limits fail safely without modifying the database', () => {
  const h = harness(); try {
    assert.throws(() => parse(h, 'é'.repeat(6 * 1024 * 1024)), isError('large'));
    const line = csv().split('\n')[1];
    assert.throws(() => parse(h, headers.join(',') + '\n' + (line + '\n').repeat(50_001)), isError('large'));
    assert.throws(() => parse(h, csv(Array.from({ length: 5001 }, (_, i) => row({ title: `Workout ${i}` })))), isError('large'));
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 0);
  } finally { h.sql.close(); }
});

test('dates use an explicit device-zone assumption; invalid DST gaps/folds are rejected and identity is independent of that zone', () => {
  const h = harness(), previousZone = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Kolkata'; const india = parse(h, csv()).workouts[0];
    process.env.TZ = 'America/New_York'; const usa = parse(h, csv()).workouts[0];
    assert.equal(india.id, usa.id); assert.notEqual(india.startedAt, usa.startedAt);
    assert.throws(() => parse(h, csv([row({ start_time: '8 Mar 2026, 02:30', end_time: '8 Mar 2026, 04:00' })])), isError('invalid'));
    assert.throws(() => parse(h, csv([row({ start_time: '1 Nov 2026, 01:30', end_time: '1 Nov 2026, 03:00' })])), isError('unsupported'));
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; h.sql.close(); }
});

test('a mid-transaction failure rolls back new custom exercises, source mappings and all history, then retries safely', () => {
  const h = harness(); try {
    h.persist(parse(h, csv([row({ title: 'Existing' })])));
    const backup = h.load('@/store/workoutBackup'), before = backup.captureWorkoutBackup(h.adapter, h.database.CURRENT_SCHEMA_VERSION).tables;
    h.sql.exec("CREATE TRIGGER fail_free BEFORE INSERT ON imported_workouts WHEN (SELECT count(*) FROM imported_workouts WHERE account_id = 'hevy-csv-v1') > 1 BEGIN SELECT RAISE(ABORT, 'private SQL detail'); END");
    assert.throws(() => h.persist(parse(h)), error => error.code === 'persistence' && !error.message.includes('private'));
    assert.deepEqual(backup.captureWorkoutBackup(h.adapter, h.database.CURRENT_SCHEMA_VERSION).tables, before);
    h.sql.exec('DROP TRIGGER fail_free'); assert.equal(h.persist(parse(h)).workouts, 2);
  } finally { h.sql.close(); }
});

test('backup and database reopen retain Free source fingerprints and repeat safety', async () => {
  const h = harness(); try {
    h.load('@/store/workoutStore').useWorkoutStore.getState().completeNoProgramOnboarding('Sam');
    h.persist(parse(h)); const backup = h.load('@/store/workoutBackup');
    const saved = backup.captureWorkoutBackup(h.adapter, h.database.CURRENT_SCHEMA_VERSION);
    await h.database.testReopen(); assert.equal(h.persist(parse(h)).workouts, 0);
    await backup.restoreWorkoutBackup(h.adapter, saved, h.database.CURRENT_SCHEMA_VERSION);
    assert.equal(h.persist(parse(h)).workouts, 0);
  } finally { h.sql.close(); }
});

test('native picker accepts CSV, returns cancellation unchanged, rejects type/size/read failures before reading oversized files', async () => {
  const h = harness({ 'expo-file-system': nativeMock }); try {
    const { pickHevyExportFile } = h.load('@/features/import/hevyCsv/file'); let options, reads = 0;
    const pick = file => async opts => { options = opts; return { canceled: false, result: file }; };
    assert.equal(await pickHevyExportFile(async () => ({ canceled: true, result: null })), null);
    const file = { name: 'workout_data.CSV', size: fixture.length, text: async () => { reads++; return fixture; } };
    assert.equal(await pickHevyExportFile(pick(file)), fixture); assert.ok(options.mimeTypes.includes('text/csv'));
    for (const [extra, code] of [[{ name: 'workout.json' }, 'invalid'], [{ size: 10 * 1024 * 1024 + 1 }, 'large'], [{ size: 0 }, 'empty']]) {
      await assert.rejects(pickHevyExportFile(pick({ ...file, ...extra })), isError(code));
    }
    assert.equal(reads, 1);
    await assert.rejects(pickHevyExportFile(pick({ ...file, text: async () => { throw Error('private path'); } })), isError('invalid'));
  } finally { h.sql.close(); }
});

function flowHarness(h, overrides = {}) {
  const states = [], calls = { plan: 0, save: 0, finish: 0 };
  const flow = h.load('@/features/import/hevyCsv/flow').createHevyFileFlow({ publish: state => states.push(state),
    nextFrame: async () => {}, read: async () => parse(h), plan: async snapshot => { calls.plan++; return h.plan(snapshot); },
    persist: async plan => { calls.save++; return h.load('@/features/import/persistence').persistHevyImport(h.adapter, plan); },
    finish: async unit => { calls.finish++; assert.equal(unit, 'kg'); }, ...overrides });
  return { flow, states, calls };
}

test('cancelled picker preserves instructions/previous preview and performs no planning or persistence', async () => {
  const h = harness(); try {
    const x = flowHarness(h, { read: async () => null }); await x.flow.choose();
    assert.deepEqual(x.states.at(-1), { stage: 'instructions' }); assert.equal(x.calls.plan, 0); assert.equal(x.calls.save, 0);
    let reads = 0; const y = flowHarness(h, { read: async () => ++reads === 1 ? parse(h) : null });
    await y.flow.choose(); const preview = y.states.at(-1); await y.flow.choose(); assert.equal(y.states.at(-1), preview);
    assert.equal(y.calls.plan, 1); assert.equal(y.calls.save, 0); assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 0);
  } finally { h.sql.close(); }
});

test('Free flow reads once, previews without writes, retries persistence, imports once and finishes onboarding only on Continue', async () => {
  const h = harness(); try {
    let attempts = 0;
    const x = flowHarness(h, { persist: async plan => { if (++attempts === 1) throw Error('private SQL'); return h.load('@/features/import/persistence').persistHevyImport(h.adapter, plan); } });
    await Promise.all([x.flow.choose(), x.flow.choose()]); assert.equal(x.calls.plan, 1); assert.equal(x.states.at(-1).stage, 'preview');
    assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sessions').n, 0);
    await x.flow.import(); assert.equal(x.states.at(-1).stage, 'preview'); assert.equal(x.states.at(-1).error, 'Couldn’t finish the import. Your existing Stack data is safe. Try again.');
    await Promise.all([x.flow.import(), x.flow.import()]); assert.equal(attempts, 2); assert.equal(x.states.at(-1).stage, 'done');
    assert.equal(x.calls.finish, 0); await Promise.all([x.flow.continue(), x.flow.continue()]); await x.flow.continue(); assert.equal(x.calls.finish, 1);
  } finally { h.sql.close(); }
});

test('Free flow exposes static parser errors and disposal prevents late previews and pre-transaction writes', async () => {
  const h = harness(); try {
    const errorFlow = flowHarness(h, { read: async () => { throw Error('private file contents'); } });
    await errorFlow.flow.choose(); assert.equal(errorFlow.states.at(-1).error, 'Couldn’t read this Hevy export. Choose a valid file and try again.');
    let release; const x = flowHarness(h, { read: () => new Promise(resolve => { release = resolve; }) });
    const reading = x.flow.choose(); await new Promise(setImmediate); x.flow.dispose(); release(parse(h)); await reading;
    assert.equal(x.calls.plan, 0); assert.equal(x.states.length, 1);
    let frame = 0, advance; const y = flowHarness(h, { nextFrame: () => ++frame === 1 ? Promise.resolve() : new Promise(resolve => { advance = resolve; }) });
    await y.flow.choose(); const importing = y.flow.import(); y.flow.dispose(); advance(); await importing; assert.equal(y.calls.save, 0);
  } finally { h.sql.close(); }
});

function rendered(hevyPlan, contentState) {
  const routes = [], node = (type, props) => ({ type, props: props ?? {} });
  const h = harness({ react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx: node, jsxs: node, Fragment: 'Fragment' },
    'react-native': { Text: 'Text', View: 'View', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { Redirect: 'Redirect', Stack: { Screen: 'Stack.Screen' }, useLocalSearchParams: () => ({ hevyPlan }),
      useRouter: () => ({ push: href => routes.push(href), replace: href => routes.push(href), back: () => routes.push('back'), canGoBack: () => true }) },
    '@/components/custom-split/SplitPressable': { SplitPressable: 'Pressable' }, '@/components/custom-split/ui': { ui: {}, Action: 'Action' },
    '@/features/onboarding/OnboardingActions': { onboardingBackOptions: (_label, back) => ({ back }) },
    '@/store/onboardingDraft': { saveOnboardingDraft: async () => {} }, '@/store/workoutStore': { useWorkoutStore: select => select({ profile: null }) },
  });
  const tree = contentState ? h.load('@/features/import/hevyCsv/HevyFileContent').HevyFileContent({ state: contentState, choose() {}, save() {}, finish() {} })
    : h.load('@/app/bring-workouts').default();
  const nodes = [], text = [];
  function walk(x) { if (typeof x === 'string' || typeof x === 'number') { text.push(String(x)); return; } if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== 'object') return; nodes.push(x); walk(x.props.children); }
  walk(tree); return { h, nodes, routes, text: text.join(' ') };
}

test('Import from Hevy opens plan-choice screen; Pro retains its route and Free opens file import; Paste stays Coming soon', () => {
  const first = rendered(), plan = rendered('choose'); try {
    first.nodes.find(n => n.props.accessibilityLabel === 'Import from Hevy').props.onPress();
    assert.deepEqual(first.routes, [{ pathname: '/bring-workouts', params: { hevyPlan: 'choose' } }]);
    assert.match(first.text, /Coming soon/); assert.equal(first.nodes.some(n => n.props.accessibilityLabel === 'Paste my routine. Coming soon.' && n.props.onPress), false);
    assert.match(plan.text, /Which Hevy plan do you use\?/);
    const cards = plan.nodes.filter(n => n.type === 'Pressable'); assert.equal(cards.length, 2);
    cards.find(n => n.props.accessibilityLabel === 'Hevy Pro').props.onPress(); cards.find(n => n.props.accessibilityLabel === 'Hevy Free').props.onPress();
    assert.deepEqual(plan.routes, ['/hevy-import', '/hevy-file-import']);
    plan.nodes.find(n => n.type === 'Stack.Screen').props.options.back(); assert.equal(plan.routes.at(-1), 'back');
  } finally { first.h.sql.close(); plan.h.sql.close(); }
});

test('Free instructions, preview and success have the required history-only copy and real callback actions', () => {
  const h = harness(); try {
    const plan = h.plan(parse(h));
    for (const state of [{ stage: 'instructions' }, { stage: 'preview', plan }, { stage: 'done', result: { workouts: 2, routines: 0, exercises: 1, alreadyImported: 0 } }]) {
      const view = rendered(undefined, state); try {
        if (state.stage === 'instructions') { assert.match(view.text, /Import your Hevy history/); assert.ok(view.nodes.some(n => n.props.title === 'Choose export file')); }
        if (state.stage === 'preview') { assert.match(view.text, /Workout history only/); assert.match(view.text, /2 workouts/); assert.match(view.text, /1 custom exercise/); assert.match(view.text, /time zone/); assert.ok(view.nodes.some(n => n.props.title === 'Import from Hevy')); }
        if (state.stage === 'done') { assert.match(view.text, /Imported from Hevy/); assert.match(view.text, /Your workout history is now in Stack\./); assert.doesNotMatch(view.text, /routine/i); assert.ok(view.nodes.some(n => n.props.title === 'Continue')); }
      } finally { view.h.sql.close(); }
    }
    const route = fs.readFileSync(path.join(root, 'app/hevy-file-import.tsx'), 'utf8');
    assert.match(route, /createHevyImportPlan/); assert.match(route, /persistHevyImport/); assert.match(route, /completeNoProgramOnboarding/); assert.match(route, /router.replace\('\/\(tabs\)'\)/);
    assert.match(fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8'), /pathname === '\/hevy-file-import'/);
  } finally { h.sql.close(); }
});

test('2,000 Free workouts parse/import/reimport with unchanged source loads through the existing transaction', () => {
  const h = harness(); try {
    const text = csv(Array.from({ length: 2000 }, (_, i) => row({ title: `Session ${i}` })));
    const data = parse(h, text); assert.equal(data.workouts.length, 2000); assert.equal(h.persist(data).workouts, 2000);
    assert.equal(h.persist(parse(h, text)).workouts, 0); assert.equal(h.adapter.getFirstSync('SELECT count(*) n FROM sets WHERE weight = 60 AND reps = 8').n, 2000);
  } finally { h.sql.close(); }
});
