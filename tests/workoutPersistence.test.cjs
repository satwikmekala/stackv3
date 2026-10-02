// Run with Node 22+: node --test tests/workoutPersistence.test.cjs
// Production store/actions and SQL, adapted to a disposable real SQLite database.
/* global __dirname, Buffer */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const RealDate = Date;
class Clock extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [2026, 8, 16, 12]));
  }
  static now() {
    return new Clock().valueOf();
  }
}
function harness({ schema } = {}) {
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
      try {
        fn();
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  adapter.execAsync = async (query) => sql.exec(query);
  adapter.runAsync = async (...args) => adapter.runSync(...args);
  adapter.withTransactionAsync = async (fn) => {
    sql.exec('BEGIN');
    try { await fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; }
  };
  adapter.getAllAsync = async (...args) => adapter.getAllSync(...args);
  adapter.getFirstAsync = async (...args) => adapter.getFirstSync(...args);
  const cache = new Map();
  const alerts = [];
  function load(id) {
    if (id === 'expo-sqlite') return { openDatabaseAsync: async () => adapter };
    if (id === 'react-native')
      return { Alert: { alert: (...args) => alerts.push(args) } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const file = path.join(root, id.slice(2) + '.ts');
    let source = fs.readFileSync(file, 'utf8');
    if (id === '@/store/workoutDatabase')
      source +=
        '\ndatabase = testDatabase; databasePromise = Promise.resolve(testDatabase); exports.testReadCurrentSessionSync = () => sessionsFromRows(testDatabase.getAllSync(sessionJoinSql("WHERE s.completed = 0")))[0] ?? null; exports.testMigrateWorkoutState = ensureWorkoutStateColumnsAsync; exports.testReopenDatabase = () => { database = null; databasePromise = null; return initializeWorkoutDatabase(); };';
    const exports = {};
    cache.set(id, exports);
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    new Function('exports', 'require', 'testDatabase', 'Date', '__DEV__', code)(
      exports,
      (request) => load(request.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(id), request)) : request),
      adapter,
      Clock,
      false,
    );
    return exports;
  }
  const database = load('@/store/workoutDatabase');
  sql.exec(schema ?? database.WORKOUT_DATABASE_SCHEMA);
  // Legacy fixture schemas predate the metric column; migration reconciles it.
  const hasMetric = sql.prepare('PRAGMA table_info(exercises)').all().some((column) => column.name === 'metric');
  for (const seed of database.EXERCISE_SEEDS) {
    adapter.runSync(
      hasMetric
        ? 'INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, load_type, metric) VALUES (?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, load_type) VALUES (?, ?, ?, ?, ?)',
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle,
      seed.loadType,
      ...(hasMetric ? [seed.metric] : []),
    );
  }
  // Seed deliberately conspicuous targets to expose any accidental fabrication.
  const lifts = sql
    .prepare("SELECT id, name FROM exercises WHERE load_type = 'external_weight' LIMIT 2")
    .all();
  lifts.forEach((lift, i) =>
    adapter.runSync(
      'INSERT INTO archetype_templates (archetype, variant, exercise_id, position, target_reps, target_weight) VALUES (?, ?, ?, ?, ?, ?)',
      'push',
      'a',
      lift.id,
      i,
      99,
      999,
    ),
  );
  const store = load('@/store/workoutStore').useWorkoutStore;
  store
    .getState()
    .setProfile({
      name: 'Test',
      weeklyGoal: 3,
      experienceLevel: 'intermediate',
      trainingDays: [0, 2, 4],
      onboardingCompleted: true,
      autoIncreaseWeight: true,
      weightIncrement: 0.5,
      weightUnit: 'kg',
      weightIncrementLbs: 5,
      activeSplitId: null,
    });
  return { sql, adapter, database, store, load, alerts, lifts };
}

test('Build projects persisted completions identically to store history without changing SQLite', () => {
  const h = harness();
  try {
    const finish = (weight) => {
      h.store.getState().startWorkoutFromArchetype(['push']);
      h.store.getState().updateExerciseSet(0, 0, 8, weight);
      h.store.getState().toggleSetCompleted(0, 0);
      return h.store.getState().completeWorkout('medium');
    };
    const first = finish(50);
    h.store.getState().logArchetypeCompletedRetroactively(['push'], '2026-09-15');
    const second = finish(55);
    h.store.getState().startWorkoutFromArchetype(['push']); // Incomplete sessions never cast.
    const { adaptBuildHistory } = h.load('@/features/build/adapter');
    const saved = h.database.readCompletedSessionsSync();
    const changes = h.sql.prepare('SELECT total_changes() AS count').get().count;
    const result = adaptBuildHistory(saved, new Clock());
    assert.deepEqual(result.state.pieces.map((piece) => piece.sessionId), [first.id, second.id]);
    assert.equal(result.state.pieces[1].height, 1.15);
    assert.equal(result.state.pieces[1].records.length, 1);
    assert.equal(result.state.metrics.volumeKg, 840);
    assert.deepEqual(result.state.metrics, adaptBuildHistory(h.store.getState().sessions, new Clock()).state.metrics);
    assert.equal(h.sql.prepare('SELECT total_changes() AS count').get().count, changes);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    assert.deepEqual(adaptBuildHistory(h.database.readCompletedSessionsSync(), new Clock()), result);
  } finally { h.sql.close(); }
});
test('Build keeps a completed custom split session when the active split changes', () => {
  const h = harness();
  try {
    const splitA = h.database.createCustomSplitSync('Split A');
    const workoutA = h.database.addWorkoutToSplitSync(splitA, 'Workout A');
    h.database.addExerciseToWorkoutSync(workoutA, h.lifts[0].id);
    const splitB = h.database.createCustomSplitSync('Split B');
    h.store.getState().setActiveSplit(splitA);
    assert.equal(h.store.getState().startWorkoutFromCustomWorkout(splitA, workoutA), true);
    h.store.getState().updateExerciseSet(0, 0, 8, 50);
    h.store.getState().toggleSetCompleted(0, 0);
    const completed = h.store.getState().completeWorkout('medium');
    assert.ok(completed);
    assert.equal(completed.customSplitId, splitA);
    assert.equal(completed.customSplitWorkoutId, workoutA);

    const project = () => {
      const saved = h.database.readCompletedSessionsSync();
      const historical = saved.find((item) => item.id === completed.id);
      const piece = h.load('@/features/build/adapter')
        .adaptBuildHistory(saved, new Clock()).state.pieces
        .find((item) => item.sessionId === completed.id);
      assert.ok(historical);
      assert.ok(piece);
      assert.equal(historical.customSplitId, splitA);
      assert.equal(historical.customSplitWorkoutId, workoutA);
      return piece;
    };
    const originalPiece = project();
    h.store.getState().setActiveSplit(splitB);
    assert.equal(h.store.getState().profile.activeSplitId, splitB);
    assert.deepEqual(project(), originalPiece);
    h.store.getState().setActiveSplit(splitA);
    assert.deepEqual(project(), originalPiece);
  } finally { h.sql.close(); }
});
test('Legacy fabricated action still persists template-derived completed sets through its existing store API', () => {
  const h = harness();
  h.store.getState().logArchetypeCompletedRetroactively(['push'], '2026-09-15');
  const sets = h.sql.prepare('SELECT * FROM sets').all();
  assert.equal(sets.length, 6);
  assert.deepEqual(
    sets.map((set) => ({ reps: set.reps, weight: set.weight, completed: set.completed })),
    Array.from({ length: 6 }, () => ({ reps: 99, weight: 999, completed: 1 })),
  );
  h.sql.close();
});

test('next-session baseline and suggestion are independent of Increase Between Sets', () => {
  const h = harness();
  const progression = h.load('@/store/workoutProgression');
  const template = {
    name: 'Bench Press',
    loadType: 'external_weight',
    sets: [{ reps: 8, weight: 40 }],
  };
  const logged = {
    name: 'Bench Press',
    loadType: 'external_weight',
    sets: [{ reps: 8, weight: 50, targetReps: 8, targetWeight: 50 }],
  };
  const profile = h.store.getState().profile;

  const enabled = progression.createSessionExercise(template, logged, profile);
  h.store.getState().updateProfile({ autoIncreaseWeight: false });
  const disabledProfile = h.store.getState().profile;
  const disabled = progression.createSessionExercise(template, logged, disabledProfile);

  // Slice 3: the baseline is what was lifted; progression is only a suggestion.
  assert.equal(enabled.sets[0].weight, 50);
  assert.equal(disabled.sets[0].weight, 50);
  assert.equal(enabled.sets[0].targetWeight, 50);
  assert.equal(disabled.sets[0].targetWeight, 50);
  for (const p of [profile, disabledProfile]) {
    assert.equal(progression.getProgressionSuggestion({ ...logged.sets[0], completed: true }, 'external_weight', p, 'kg').suggestedKg, 50.5);
  }
  assert.equal(h.sql.prepare('SELECT auto_increase_weight FROM profile').get().auto_increase_weight, 0);
  assert.equal(h.database.readProfileSync().autoIncreaseWeight, false);

  h.store.getState().updateProfile({ autoIncreaseWeight: true });
  assert.equal(h.sql.prepare('SELECT auto_increase_weight FROM profile').get().auto_increase_weight, 1);
  h.sql.close();
});

test('the canonical catalog classifies the complete reviewed bodyweight pool', () => {
  const h = harness();
  const bodyweightNames = h.database.EXERCISE_SEEDS
    .filter((exercise) => exercise.loadType === 'bodyweight')
    .map((exercise) => exercise.name);

  assert.deepEqual(bodyweightNames, [
    'Chest Dips',
    'Push-ups',
    'Pull-ups',
    'Chin-ups',
    'Inverted Row',
    'Tricep Dips',
    'Nordic Hamstring Curl',
    'Plank',
    'Crunches',
    'Hanging Leg Raise',
    'Leg Raises',
    'Ab Wheel Rollout',
    'Mountain Climbers',
    'Side Plank',
    'Hanging Knee Raise',
    'Reverse Crunch',
    'Bicycle Crunch',
    'Dead Bug',
    'V-Ups',
    'Hollow Body Hold',
    'Decline Crunch',
    'Toe Touches',
    'Bird Dog',
  ]);
  assert.equal(h.database.readExerciseLoadTypeSync('Bench Press'), 'external_weight');
  assert.equal(h.database.readExerciseLoadTypeSync('Weighted Sit-Up'), 'external_weight');
  assert.equal(h.database.readExerciseLoadTypeSync('Assisted Dip'), 'external_weight');
  assert.equal(h.database.readExerciseLoadTypeSync('Pull-ups'), 'bodyweight');

  const customId = h.database.createCustomExerciseSync(
    'Custom Movement',
    'core',
    'Core',
    'None',
  );
  const custom = h.database.readExerciseCatalogSync().find((item) => item.id === customId);
  assert.equal(custom.loadType, 'external_weight');
  h.sql.close();
});

test('bodyweight history seeds reps without carrying or progressing a hidden weight', async () => {
  const h = harness();
  const progression = h.load('@/store/workoutProgression');
  const template = {
    name: 'Pull-ups',
    loadType: 'bodyweight',
    sets: [{ reps: 8, weight: 0 }],
  };
  const logged = {
    name: 'Pull-ups',
    loadType: 'bodyweight',
    sets: [{ reps: 10, weight: 25, targetReps: 8, targetWeight: 25 }],
  };

  const next = progression.createSessionExercise(
    template,
    logged,
    h.store.getState().profile,
  );
  assert.equal(next.sets[0].reps, 8);
  assert.equal(next.sets[0].weight, 0);
  assert.equal(next.sets[0].targetWeight, 0);

  const session = h.database.replaceCurrentSession({
    id: '',
    date: '2026-09-16T12:00:00.000Z',
    archetype: null,
    secondaryArchetype: null,
    archetypeVariant: null,
    secondaryArchetypeVariant: null,
    workoutTypes: ['back'],
    exercises: [{
      name: 'Pull-ups',
      entryUnit: 'kg',
      loadType: 'bodyweight',
      sets: Array.from({ length: 3 }, () => ({ reps: 8, weight: 0 })),
    }],
    completed: false,
    retroactive: false,
  });
  h.store.setState({ currentSession: session });
  h.store.getState().updateExerciseSet(0, 0, 10, 40);
  h.store.getState().toggleSetCompleted(0, 0);

  let sets = h.store.getState().currentSession.exercises[0].sets;
  assert.equal(sets[0].weight, 0);
  assert.equal(sets[1].weight, 0);
  assert.equal(sets[1].reps, 8);

  h.store.getState().updateProfile({ autoIncreaseWeight: false });
  h.store.getState().updateExerciseSet(0, 1, 12, 40);
  h.store.getState().toggleSetCompleted(0, 1);
  sets = h.store.getState().currentSession.exercises[0].sets;
  assert.equal(sets[1].weight, 0);
  assert.equal(sets[2].weight, 0);
  assert.equal(sets[2].reps, 12);

  const reopened = (await h.database.readInitialWorkoutSnapshot()).currentSession;
  assert.equal(reopened.exercises[0].loadType, 'bodyweight');
  assert.ok(reopened.exercises[0].sets.every((set) => set.weight === 0));
  h.sql.close();
});

test('Increase Between Sets on preserves progression from a manually edited baseline', () => {
  const h = harness();
  h.store.getState().startWorkoutFromArchetype(['push']);
  const before = h.store.getState().currentSession.exercises[0].sets;
  const startingReps = before[0].reps;
  const originalSecondSetReps = before[1].reps;

  h.store.getState().updateExerciseSet(0, 0, startingReps, 55);
  h.store.getState().toggleSetCompleted(0, 0);

  const sets = h.store.getState().currentSession.exercises[0].sets;
  assert.equal(sets[0].completed, true);
  assert.equal(sets[1].reps, originalSecondSetReps);
  assert.equal(sets[1].weight, 55.5);
  assert.equal(sets[1].targetWeight, 55.5);
  assert.equal(sets[0].reps, startingReps);
  h.sql.close();
});

test('Increase Between Sets off carries completed set values through subsequent sets', async () => {
  const h = harness();
  h.store.getState().updateProfile({ autoIncreaseWeight: false });
  h.store.getState().startWorkoutFromArchetype(['push']);

  h.store.getState().updateExerciseSet(0, 0, 11, 55);
  h.store.getState().toggleSetCompleted(0, 0);

  let sets = h.store.getState().currentSession.exercises[0].sets;
  assert.deepEqual(
    {
      reps: sets[1].reps,
      weight: sets[1].weight,
      targetReps: sets[1].targetReps,
      targetWeight: sets[1].targetWeight,
    },
    { reps: 11, weight: 55, targetReps: 11, targetWeight: 55 },
  );

  h.store.getState().toggleSetCompleted(0, 1);
  sets = h.store.getState().currentSession.exercises[0].sets;
  assert.deepEqual(
    {
      reps: sets[2].reps,
      weight: sets[2].weight,
      targetReps: sets[2].targetReps,
      targetWeight: sets[2].targetWeight,
    },
    { reps: 11, weight: 55, targetReps: 11, targetWeight: 55 },
  );

  const persistedSets = h.sql
    .prepare(
      `SELECT st.set_index, st.reps, st.weight
       FROM sets st
       JOIN session_exercises se ON se.id = st.session_exercise_id
       WHERE se.position = 0
       ORDER BY st.set_index`,
    )
    .all();
  assert.deepEqual(
    persistedSets.map((set) => ({
      index: set.set_index,
      reps: set.reps,
      weight: set.weight,
    })),
    [
      { index: 0, reps: 11, weight: 55 },
      { index: 1, reps: 11, weight: 55 },
      { index: 2, reps: 11, weight: 55 },
    ],
  );

  const reopenedSets = (await h.database.readInitialWorkoutSnapshot())
    .currentSession.exercises[0].sets;
  assert.deepEqual(
    reopenedSets.map((set) => ({ reps: set.reps, weight: set.weight })),
    [
      { reps: 11, weight: 55 },
      { reps: 11, weight: 55 },
      { reps: 11, weight: 55 },
    ],
  );
  h.sql.close();
});

test('retroactive sessions do not seed exercise history or workout-type history', () => {
  const h = harness();
  const exercise = h.lifts[0];
  const insertSession = (date, retroactive, weight) => {
    const sessionId = h.adapter.runSync(
      `INSERT INTO sessions (date, completed, retroactive) VALUES (?, 1, ?)`,
      date,
      retroactive,
    ).lastInsertRowId;
    h.adapter.runSync(
      `INSERT INTO session_workout_types (session_id, workout_type, position)
       VALUES (?, 'chest', 0)`,
      sessionId,
    );
    const sessionExerciseId = h.adapter.runSync(
      `INSERT INTO session_exercises (session_id, exercise_id, position)
       VALUES (?, ?, 0)`,
      sessionId,
      exercise.id,
    ).lastInsertRowId;
    h.adapter.runSync(
      `INSERT INTO sets
        (session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed)
       VALUES (?, 0, 8, ?, 8, ?, 1)`,
      sessionExerciseId,
      weight,
      weight,
    );
    return sessionId;
  };

  const genuineSessionId = insertSession('2026-09-14', 0, 60);
  insertSession('2026-09-15', 1, 5);

  assert.equal(h.database.readLastExerciseHistorySync(exercise.name).sets[0].weight, 60);
  assert.equal(h.database.readLastWorkoutOfTypeSync('chest').id, String(genuineSessionId));
  const nextSession = h.database.startWorkoutFromArchetype(['push']);
  assert.equal(
    nextSession.exercises.find((item) => item.name === exercise.name).sets[0].weight,
    60,
  );
  h.sql.close();
});

test('retroactive sessions do not seed swap or append exercise history', () => {
  const h = harness();
  const existingExercise = h.sql.prepare(
    "SELECT id, name FROM exercises WHERE name = 'Incline Dumbbell Press'",
  ).get();
  const replacementExercise = h.sql.prepare(
    "SELECT id, name FROM exercises WHERE name = 'Bench Press'",
  ).get();
  const insertSession = (date, retroactive, weight) => {
    const sessionId = h.adapter.runSync(
      `INSERT INTO sessions (date, completed, retroactive) VALUES (?, 1, ?)`,
      date,
      retroactive,
    ).lastInsertRowId;
    h.adapter.runSync(
      `INSERT INTO session_workout_types (session_id, workout_type, position)
       VALUES (?, 'chest', 0)`,
      sessionId,
    );
    const sessionExerciseId = h.adapter.runSync(
      `INSERT INTO session_exercises (session_id, exercise_id, position)
       VALUES (?, ?, 0)`,
      sessionId,
      replacementExercise.id,
    ).lastInsertRowId;
    h.adapter.runSync(
      `INSERT INTO sets
        (session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed)
       VALUES (?, 0, 8, ?, 8, ?, 1)`,
      sessionExerciseId,
      weight,
      weight,
    );
  };

  insertSession('2026-09-14', 0, 60);
  insertSession('2026-09-15', 1, 5);

  assert.equal(
    h.database.readLastExerciseSync('chest', replacementExercise.name).sets[0].weight,
    60,
  );

  const makeCurrentSession = () => h.database.replaceCurrentSession({
    id: '',
    date: '2026-09-16T12:00:00.000Z',
    archetype: null,
    secondaryArchetype: null,
    archetypeVariant: null,
    secondaryArchetypeVariant: null,
    workoutTypes: ['chest'],
    exercises: [{
      name: existingExercise.name,
      entryUnit: 'kg',
      sets: [{ reps: 8, weight: 40, targetReps: 8, targetWeight: 40 }],
    }],
    completed: false,
    retroactive: false,
  });

  h.store.setState({ currentSession: makeCurrentSession() });
  h.store.getState().swapCurrentSessionExercise(0, replacementExercise.name);
  assert.equal(h.store.getState().currentSession.exercises[0].sets[0].weight, 60);

  h.store.setState({ currentSession: makeCurrentSession() });
  h.store.getState().appendExerciseToSession(replacementExercise.name);
  assert.equal(h.store.getState().currentSession.exercises[1].sets[0].weight, 60);
  h.sql.close();
});

test('casting only follows a committed completion; failure/skip/replay never duplicate saved pieces', async () => {
  const h = harness();
  try {
    const { completionDestination, castingGate, once } = h.load('@/features/build/casting');
    h.store.getState().startWorkoutFromArchetype(['push']);
    h.store.getState().updateExerciseSet(0, 0, 8, 50);
    h.store.getState().toggleSetCompleted(0, 0);
    const id = h.store.getState().currentSession.id;
    h.store.getState().toggleSetCompleted(0, 0);
    h.sql.exec("CREATE TRIGGER fail_completion BEFORE UPDATE OF completed ON sessions WHEN NEW.completed = 1 BEGIN SELECT RAISE(ABORT, 'save failed'); END;");
    const failed = h.store.getState().completeWorkout('medium');
    assert.equal(failed, undefined);
    assert.equal(completionDestination(failed, true), null);
    assert.equal(h.database.readCompletedSessionsSync().length, 0);
    assert.equal(h.store.getState().currentSession.id, id);
    h.sql.exec('DROP TRIGGER fail_completion');
    const saved = h.store.getState().completeWorkout('medium');
    assert.equal(h.database.readCompletedSessionsSync().length, 1);
    const before = JSON.stringify(h.database.readCompletedSessionsSync());
    const changes = h.sql.prepare('SELECT total_changes() AS count').get().count;
    const target = completionDestination(saved, true);
    assert.equal(target.pathname, '/build-casting');
    assert.equal(target.params.sessionId, id);
    assert.equal(await castingGate.claim(id, { getItem: async () => null, setItem: async () => {} }), true);
    let summaryCalls = 0;
    const finish = once(() => { summaryCalls++; });
    finish(); finish(); finish();
    assert.equal(summaryCalls, 1);
    assert.equal(await castingGate.claim(id, { getItem: async () => null, setItem: async () => {} }), false);
    assert.equal(h.store.getState().completeWorkout('medium'), undefined);
    assert.equal(JSON.stringify(h.database.readCompletedSessionsSync()), before);
    assert.equal(h.sql.prepare('SELECT total_changes() AS count').get().count, changes);
    const { adaptBuildHistory } = h.load('@/features/build/adapter');
    assert.equal(adaptBuildHistory(h.database.readCompletedSessionsSync(), new Clock()).state.pieces.length, 1);
  } finally { h.sql.close(); }
});

test('weekly presentation markers never write workout data and relaunch keeps the same sealed history', async () => {
  const h = harness();
  try {
    h.store.getState().startWorkoutFromArchetype(['push']);
    h.store.getState().updateExerciseSet(0, 0, 8, 50);
    h.store.getState().toggleSetCompleted(0, 0);
    h.store.getState().completeWorkout('medium');
    const { adaptBuildHistory } = h.load('@/features/build/adapter');
    const { createFusionCoordinator } = h.load('@/features/build/fusion');
    let marker = null;
    const storage = { getItem: async () => marker, setItem: async (_, value) => { marker = value; } };
    const coordinator = createFusionCoordinator(storage);
    const sessions = h.database.readCompletedSessionsSync();
    const before = JSON.stringify(sessions);
    const changes = h.sql.prepare('SELECT total_changes() AS count').get().count;
    assert.equal(await coordinator.reconcile(adaptBuildHistory(sessions, new Clock()).state), null);
    const later = adaptBuildHistory(sessions, new Date(2026, 9, 12, 12));
    assert.equal(await coordinator.reconcile(later.state), 'week:2026-09-14');
    assert.equal(await createFusionCoordinator(storage).reconcile(later.state), null);
    assert.deepEqual(adaptBuildHistory(h.database.readCompletedSessionsSync(), new Date(2026, 9, 12, 12)), later);
    assert.equal(JSON.stringify(h.database.readCompletedSessionsSync()), before);
    assert.equal(h.sql.prepare('SELECT total_changes() AS count').get().count, changes);
    assert.equal(later.state.sealedWeeks.length, 1);
    assert.equal(later.state.sealedWeeks[0].pieces.length, 1);
  } finally { h.sql.close(); }
});

test('shared workout focus tracks navigation without changing sets or progression', () => {
  const h = harness();
  h.store.getState().startWorkoutFromArchetype(['push']);
  const session = h.store.getState().currentSession;
  assert.deepEqual(h.store.getState().workoutFocus, { workoutId: session.id, exerciseIndex: 0, exerciseId: h.database.readCurrentSetTarget(0, 0).exerciseId });
  const before = JSON.stringify(session);
  h.store.getState().setWorkoutExerciseIndex(1);
  assert.equal(h.store.getState().workoutFocus.exerciseIndex, 1);
  assert.equal(JSON.stringify(h.store.getState().currentSession), before);
  h.store.getState().setWorkoutExerciseIndex(999);
  assert.equal(h.store.getState().workoutFocus.exerciseIndex, 1);
  h.store.getState().setWorkoutExerciseIndex(0);
  for (let i = 0; i < session.exercises[0].sets.length; i++) h.store.getState().toggleSetSkipped(0, i);
  // Skipping the last set must still wait on the screen's existing Next action.
  assert.equal(h.store.getState().workoutFocus.exerciseIndex, 0);
  const payload = h.load('@/services/liveActivity/state').deriveWorkoutLiveActivityState(h.store.getState());
  assert.equal(payload.exerciseName, session.exercises[0].name);
  h.store.getState().discardWorkout();
  assert.equal(h.store.getState().workoutFocus, null);
  assert.equal(h.store.getState().currentSession, null);
  h.sql.close();
});

test('live payload uses real store progression, unit changes and next-exercise selection', () => {
  const h = harness();
  h.store.setState({ isHydrated: true });
  h.store.getState().startWorkoutFromArchetype(['push']);
  const { deriveWorkoutLiveActivityState: derive } = h.load('@/services/liveActivity/state');
  const { formatWeight } = h.load('@/store/weightUnits');
  h.store.getState().updateExerciseSet(0, 0, 8, 80);
  h.store.getState().toggleSetCompleted(0, 0);
  let payload = derive(h.store.getState());
  const next = h.store.getState().currentSession.exercises[0].sets[1];
  assert.equal(payload.setNumber, 2);
  assert.equal(payload.weight, String(next.weight));
  assert.equal(payload.reps, next.reps);
  h.store.getState().updateProfile({ weightUnit: 'lbs' });
  payload = derive(h.store.getState());
  assert.equal(payload.unit, 'kg');
  h.store.getState().setExerciseEntryUnit(h.store.getState().getActiveSetTarget(), 'lbs');
  payload = derive(h.store.getState());
  assert.equal(payload.weight, formatWeight(next.weight, 'lbs'));
  h.store.getState().setWorkoutExerciseIndex(1);
  assert.equal(derive(h.store.getState()).setNumber, 1);
  h.store.getState().completeWorkout('medium');
  assert.equal(derive(h.store.getState()), null);
  assert.equal(h.store.getState().workoutFocus, null);
  h.sql.close();
});

// Slice 4 exercises the actual store, SQL, action decoding and bridge together.
function actionHarness() {
  const h = harness();
  h.store.getState().startWorkoutFromArchetype(['push']);
  h.store.setState({ isHydrated: true });
  const actions = h.load('@/services/liveActivity/actions');
  const queue = [];
  const applied = [];
  const errors = [];
  let sequence = 0;
  let ready = true;
  let refreshes = 0;
  const drain = actions.createLiveActivityActionBridge({
    isReady: () => ready,
    isCurrentActivity: (id) => id === 'current-activity',
    takePending: () => queue.splice(0),
    apply: (target, action, step) => h.store.getState().applyActiveSetAction(target, action, step),
    onApplied: (target, result) => applied.push({ target, result }),
    reconcile: () => { refreshes++; },
    onError: (error) => errors.push(error),
  });
  const enqueue = (action, target = h.store.getState().getActiveSetTarget(), overrides = {}) => {
    const event = { id: `tap-${++sequence}`, source: 'current-activity', timestamp: Date.now(),
      target: actions.createLiveActivityActionTargets(target, false)[action], ...overrides };
    queue.push(event);
    return event;
  };
  const act = (action, target, overrides) => { enqueue(action, target, overrides); drain(); };
  const active = () => {
    const target = h.store.getState().getActiveSetTarget();
    return h.store.getState().currentSession.exercises[target.exerciseIndex].sets[target.setIndex];
  };
  return { ...h, actions, queue, applied, errors, drain, enqueue, act, active,
    ready: (value) => { ready = value; }, refreshes: () => refreshes };
}

test('widget weight/reps +/- use current values, custom increments, bounds and SQLite', () => {
  const h = actionHarness();
  h.store.getState().updateExerciseSet(0, 0, 1, 0.25);
  h.act('increaseWeight');
  assert.equal(h.active().weight, 0.75);
  h.act('decreaseWeight');
  assert.equal(h.active().weight, 0.25);
  h.act('decreaseWeight');
  h.act('decreaseReps');
  assert.equal(h.active().weight, 0);
  assert.equal(h.active().reps, 1);
  h.act('increaseReps');
  assert.equal(h.active().reps, 2);
  h.act('decreaseReps');
  const row = h.sql.prepare('SELECT * FROM sets WHERE id = ?').get(Number(h.store.getState().getActiveSetTarget().setId));
  assert.equal(row.reps, 1);
  assert.equal(row.weight, 0);
  h.sql.close();
});

test('lbs step converts once to canonical kg and uses latest configured step', () => {
  const h = actionHarness();
  const units = h.load('@/store/weightUnits');
  const target = h.store.getState().getActiveSetTarget();
  h.store.getState().updateExerciseSet(0, 0, 8, 10.125);
  h.store.getState().updateProfile({ weightUnit: 'lbs', weightIncrementLbs: 2.5 });
  h.store.getState().setExerciseEntryUnit(target, 'lbs');
  h.act('increaseWeight', target);
  assert.ok(Math.abs(h.active().weight - (10.125 + units.lbsToKg(2.5))) < 1e-10);
  h.act('decreaseWeight', target);
  assert.ok(Math.abs(h.active().weight - 10.125) < 1e-10);
  h.sql.close();
});

test('rapid increments serialize without lost updates; duplicate event IDs do not replay', () => {
  const h = actionHarness();
  const before = { ...h.active() };
  const first = h.enqueue('increaseWeight');
  for (let i = 0; i < 19; i++) h.enqueue('increaseWeight');
  for (let i = 0; i < 10; i++) h.enqueue('increaseReps');
  h.queue.push(first);
  h.drain();
  assert.equal(h.active().weight, before.weight + 10);
  assert.equal(h.active().reps, before.reps + 10);
  assert.equal(h.applied.length, 30);
  h.sql.close();
});

test('double Done completes only the referenced set, preserves Increase Between Sets', () => {
  const h = actionHarness();
  h.store.getState().updateExerciseSet(0, 0, 12, 40.5);
  const old = h.store.getState().getActiveSetTarget();
  h.enqueue('completeSet', old);
  h.enqueue('completeSet', old);
  h.enqueue('increaseReps', old);
  h.drain();
  const sets = h.store.getState().currentSession.exercises[0].sets;
  assert.equal(sets.filter((s) => s.completed).length, 1);
  assert.equal(sets[1].weight, 41);
  assert.equal(h.applied.length, 1);
  assert.equal(h.store.getState().getActiveSetTarget().setIndex, 1);
  assert.equal(h.sql.prepare('SELECT target_weight FROM sets WHERE id = ?').get(Number(h.store.getState().getActiveSetTarget().setId)).target_weight, 41);
  h.sql.close();
});

test('Increase Between Sets off carries values through the shared completion action', () => {
  const h = actionHarness();
  h.store.getState().updateProfile({ autoIncreaseWeight: false });
  h.store.getState().updateExerciseSet(0, 0, 11, 42.25);
  h.act('completeSet');
  assert.equal(h.active().weight, 42.25);
  assert.equal(h.active().reps, 11);
  h.sql.close();
});

test('final-set progression selects the next exercise then requests normal feedback without saving prematurely', () => {
  const h = actionHarness();
  for (let i = 0; i < 3; i++) h.act('completeSet');
  assert.equal(h.store.getState().getActiveSetTarget().exerciseIndex, 1);
  assert.equal(h.applied.at(-1).result.needsFeedback, false);
  for (let i = 0; i < 3; i++) h.act('completeSet');
  assert.equal(h.store.getState().getActiveSetTarget(), null);
  assert.equal(h.applied.at(-1).result.needsFeedback, true);
  assert.equal(h.store.getState().currentSession.completed, false);
  assert.equal(h.store.getState().sessions.length, 0);
  assert.ok(h.store.getState().completeWorkout('medium'));
  assert.equal(h.store.getState().currentSession, null);
  h.sql.close();
});

test('stale session, activity, selection, name and replaced SQLite set identities are rejected', () => {
  const h = actionHarness();
  const target = h.store.getState().getActiveSetTarget();
  const before = h.active().weight;
  h.act('increaseWeight', target, { source: 'old-activity' });
  for (const override of [{ workoutId: 'other' }, { workoutStartedAt: 'other' }, { exerciseName: 'other' }, { setId: 'other' }, { exerciseId: 'other' }]) {
    h.act('increaseWeight', { ...target, ...override });
  }
  h.store.getState().setWorkoutExerciseIndex(1);
  h.act('completeSet', target);
  h.store.getState().setWorkoutExerciseIndex(0);
  assert.equal(h.active().weight, before);
  // Replace with the same name at the same position: IDs must still reject it.
  h.database.replaceCurrentSessionExercise(0, h.store.getState().currentSession.exercises[0]);
  h.act('completeSet', target);
  assert.equal(h.applied.length, 0);
  assert.equal(h.active().completed, false);
  h.store.getState().discardWorkout();
  h.act('increaseWeight', target);
  h.store.getState().startWorkoutFromArchetype(['push']);
  h.act('completeSet', target);
  assert.equal(h.applied.length, 0);
  h.sql.close();
});

test('bodyweight has no weight commands, rejects forged weight actions and keeps completion weight zero', () => {
  const h = actionHarness();
  const name = h.sql.prepare("SELECT name FROM exercises WHERE load_type = 'bodyweight' LIMIT 1").get().name;
  h.store.getState().appendExerciseToSession(name);
  h.store.getState().setWorkoutExerciseIndex(2);
  const target = h.store.getState().getActiveSetTarget();
  const targets = h.actions.createLiveActivityActionTargets(target, true);
  assert.equal(targets.increaseWeight, undefined);
  assert.equal(targets.decreaseWeight, undefined);
  h.act('increaseWeight');
  h.act('decreaseWeight');
  assert.equal(h.applied.length, 0);
  const reps = h.active().reps;
  h.act('increaseReps');
  assert.equal(h.active().reps, reps + 1);
  h.act('completeSet');
  assert.equal(h.active().weight, 0);
  h.sql.close();
});

test('hydration blocks mutation and a startup inbox drains when the host is ready', () => {
  const h = actionHarness();
  const before = h.active().reps;
  h.ready(false);
  h.enqueue('increaseReps');
  h.drain();
  assert.equal(h.queue.length, 1);
  h.ready(true);
  h.drain();
  assert.equal(h.active().reps, before + 1);
  h.store.setState({ isHydrated: false });
  h.act('increaseReps');
  h.store.setState({ isHydrated: true, hydrationError: 'failed' });
  h.act('increaseReps');
  assert.equal(h.active().reps, before + 1);
  h.sql.close();
});

test('persistence failure leaves both completion/progression rows and Zustand unchanged', () => {
  const h = actionHarness();
  const beforeState = h.store.getState().currentSession;
  const beforeRows = h.sql.prepare('SELECT * FROM sets').all();
  const run = h.adapter.runSync;
  let writes = 0;
  h.adapter.runSync = (query, ...args) => {
    if (query.includes('UPDATE sets') && ++writes === 3) throw Error('disk full on next set');
    return run(query, ...args);
  };
  h.act('completeSet');
  assert.equal(h.store.getState().currentSession, beforeState);
  assert.deepEqual(h.sql.prepare('SELECT * FROM sets').all(), beforeRows);
  assert.equal(h.applied.length, 0);
  assert.equal(h.alerts.length, 1);
  h.adapter.runSync = () => { throw Error('write unavailable'); };
  h.act('increaseWeight');
  assert.equal(h.store.getState().currentSession, beforeState);
  h.adapter.runSync = run;
  h.act('increaseReps');
  assert.equal(h.applied.length, 1);
  assert.ok(h.refreshes() >= 3);
  h.sql.close();
});

test('malformed native events cannot prevent later valid actions', () => {
  const h = actionHarness();
  for (const target of ['bad', 'stack.workout.v2:{#increaseReps', 'stack.workout.v2:null#increaseReps', 'stack.workout.v2:{}#delete']) {
    h.enqueue('increaseReps', undefined, { target });
  }
  const before = h.active().reps;
  h.enqueue('increaseReps');
  h.drain();
  assert.equal(h.active().reps, before + 1);
  assert.equal(h.applied.length, 1);
  h.sql.close();
});

test('widget action publishes authoritative Slice 3 redraws and finishing ends the activity', async () => {
  const h = actionHarness();
  const { createWorkoutLiveActivityCoordinator } = h.load('@/services/liveActivity/coordinator');
  const { deriveWorkoutLiveActivityState } = h.load('@/services/liveActivity/state');
  const events = [];
  const instances = [];
  const instance = {
    getId: () => 'native',
    update: async (state) => { events.push(['update', state]); },
    end: async () => { events.push(['end']); instances.splice(0); },
  };
  const coordinator = createWorkoutLiveActivityCoordinator({
    factory: {
      getInstances: () => [...instances],
      start: (state) => { instances.push(instance); events.push(['start', state]); return instance; },
    },
    endTestActivities: async () => {},
    onError: (error) => { throw error; },
  });
  const sync = () => coordinator.sync(deriveWorkoutLiveActivityState(h.store.getState()), true);
  const unsubscribe = h.store.subscribe(sync);
  await sync();
  h.act('increaseWeight');
  await sync();
  assert.equal(events.at(-1)[1].weight, String(h.active().weight));
  h.act('completeSet');
  await sync();
  assert.equal(events.at(-1)[1].setNumber, 2);
  assert.equal(events.at(-1)[1].weight, String(h.active().weight));
  for (let i = 0; i < 5; i++) h.act('completeSet');
  await sync();
  assert.equal(instances.length, 1);
  h.store.getState().completeWorkout('medium');
  await sync();
  assert.equal(events.at(-1)[0], 'end');
  assert.equal(instances.length, 0);
  unsubscribe();
  h.sql.close();
});

const widgetRuntime = require('./helpers/widgetRuntime.cjs');
let localRuntime;
const localWidget = () => localRuntime ??= widgetRuntime();
const interactive = (h) => h.load('@/services/liveActivity/presentation').deriveInteractiveWorkoutPresentation(
  h.store.getState(), h.database.readCurrentSetTarget);
const press = (frame, action) => localWidget().press(frame, frame.actionTarget + action);

test('actual Expo widget runtime shows 80 → 82.5 → 85 → 87.5 before any host mutation', () => {
  const h = actionHarness();
  h.store.getState().updateProfile({ weightIncrement: 2.5 });
  h.store.getState().updateExerciseSet(0, 0, 8, 80);
  let local = interactive(h);
  for (const expected of ['82.5', '85', '87.5']) {
    h.enqueue('increaseWeight', undefined, { target: local.actionTarget + 'increaseWeight' });
    local = press(local, 'increaseWeight');
    assert.equal(local.weight, expected);
    assert.equal(h.active().weight, 80);
  }
  h.drain();
  assert.equal(interactive(h).weight, local.weight);
  assert.equal(h.active().weight, 87.5);
  local = press(local, 'decreaseWeight');
  assert.equal(local.weight, '85');
  h.sql.close();
});

test('actual callback increments/decrements reps and enforces the same lower bounds', () => {
  const h = actionHarness();
  h.store.getState().updateExerciseSet(0, 0, 1, 0.25);
  let local = interactive(h);
  local = press(local, 'decreaseReps');
  assert.equal(local.reps, 1);
  local = press(local, 'increaseReps');
  assert.equal(local.reps, 2);
  local = press(local, 'decreaseWeight');
  assert.equal(local.weight, '0');
  assert.equal(h.active().weight, 0.25);
  h.sql.close();
});

test('Done renders the domain-derived next set immediately; rapid old Done cannot run again', () => {
  const h = actionHarness();
  h.store.getState().updateProfile({ weightIncrement: 2.5 });
  h.act('completeSet');
  h.store.getState().updateExerciseSet(0, 1, 8, 80);
  let local = interactive(h);
  local = press(local, 'increaseWeight');
  const doneTarget = local.actionTarget + 'completeSet';
  local = press(local, 'completeSet');
  assert.equal(local.setNumber, 3);
  assert.equal(local.weight, '85');
  assert.equal(local.completionPending, true);
  assert.equal(local.actions.completeSet, undefined);
  assert.equal(localWidget().press(local, doneTarget), undefined);
  assert.equal(h.store.getState().getActiveSetTarget().setIndex, 1);
  h.act('increaseWeight');
  h.act('completeSet');
  const authoritative = interactive(h);
  assert.equal(authoritative.weight, local.weight);
  assert.equal(authoritative.setNumber, local.setNumber);
  assert.equal(authoritative.actions.completeSet, 'completeSet');
  h.sql.close();
});

test('preview tracks edited reps/weight with Increase Between Sets off, including lbs', () => {
  const h = actionHarness();
  h.store.getState().updateProfile({ autoIncreaseWeight: false, weightUnit: 'lbs', weightIncrementLbs: 2.5 });
  h.store.getState().setExerciseEntryUnit(h.store.getState().getActiveSetTarget(), 'lbs');
  h.store.getState().updateExerciseSet(0, 0, 8, 20.125);
  let local = interactive(h);
  for (const action of ['increaseWeight', 'increaseReps', 'completeSet']) {
    h.enqueue(action, undefined, { target: local.actionTarget + action });
    local = press(local, action);
  }
  assert.equal(local.reps, 9);
  assert.equal(local.setNumber, 2);
  h.drain();
  assert.equal(interactive(h).weight, local.weight);
  assert.equal(interactive(h).reps, local.reps);
  h.sql.close();
});

test('next exercise preview is derived in the host; final workout Done only signals pending completion', () => {
  const h = actionHarness();
  h.act('completeSet'); h.act('completeSet');
  const before = interactive(h);
  const local = press(before, 'completeSet');
  assert.equal(local.exerciseName, h.store.getState().currentSession.exercises[1].name);
  assert.equal(local.setNumber, 1);
  h.act('completeSet');
  assert.equal(interactive(h).exerciseName, local.exerciseName);
  h.act('completeSet'); h.act('completeSet');
  const final = interactive(h);
  assert.equal(final.interaction.next, undefined);
  const done = press(final, 'completeSet');
  assert.equal(done.setNumber, final.setNumber);
  assert.equal(done.completionPending, true);
  assert.deepEqual(done.actions, {});
  assert.equal(h.store.getState().currentSession.completed, false);
  h.sql.close();
});

test('optimistic bodyweight presentation has no weight handler and keeps weight absent', () => {
  const h = actionHarness();
  const name = h.sql.prepare("SELECT name FROM exercises WHERE load_type = 'bodyweight' LIMIT 1").get().name;
  h.store.getState().appendExerciseToSession(name);
  h.store.getState().setWorkoutExerciseIndex(2);
  const local = interactive(h);
  assert.equal(press(local, 'increaseWeight'), undefined);
  assert.equal(press(local, 'decreaseWeight'), undefined);
  assert.equal(press(local, 'increaseReps').weight, '—');
  assert.equal(press(local, 'completeSet').weight, '—');
  h.sql.close();
});

test('failed and stale mirrored actions reconcile to real values instead of leaving optimistic values', () => {
  const h = actionHarness();
  h.store.getState().updateExerciseSet(0, 0, 8, 80);
  const before = interactive(h);
  const optimistic = press(before, 'increaseWeight');
  assert.equal(optimistic.weight, '80.5');
  const run = h.adapter.runSync;
  h.adapter.runSync = () => { throw Error('test write failure'); };
  h.enqueue('increaseWeight', undefined, { target: before.actionTarget + 'increaseWeight' });
  h.drain();
  h.adapter.runSync = run;
  assert.equal(interactive(h).weight, '80');
  const command = h.actions.parseLiveActivityAction(before.actionTarget + 'increaseWeight');
  h.store.getState().updateProfile({ weightIncrement: 2.5 });
  assert.equal(h.store.getState().applyActiveSetAction(command.target, command.action, command.weightStepKg).status, 'stale');
  assert.equal(h.active().weight, 80);
  assert.equal(h.refreshes(), 1);
  h.sql.close();
});

test('interactive ActivityKit content fits the 4 KB limit, with one shared target per presentation', () => {
  const h = actionHarness();
  const frame = interactive(h);
  const bytes = Buffer.byteLength(JSON.stringify({ name: 'StackWorkoutLiveActivity', props: JSON.stringify(frame) }));
  assert.ok(bytes < 4096, `Content uses ${bytes} bytes`);
  assert.equal(frame.actions.increaseWeight, 'increaseWeight');
  assert.ok(frame.actionTarget.includes('stack.workout.v2:'));
  h.sql.close();
});

// Oct-2 Slice 1: inspection/editing is separate from progression.
test('completed-set selection is read-only for SQL, progress, propagation and Live Activity', () => {
  const h = actionHarness();
  h.act('completeSet');
  const beforeSession = h.store.getState().currentSession;
  const beforeRows = h.sql.prepare('SELECT * FROM sets').all();
  const beforeFrame = interactive(h);
  const active = h.store.getState().getActiveSetTarget();
  const changes = h.sql.prepare('SELECT total_changes() AS n').get().n;
  h.store.getState().selectWorkoutSet(0, 0);
  assert.equal(h.store.getState().selectedSet.setId, h.database.readCurrentSetTarget(0, 0).setId);
  assert.equal(h.store.getState().getSetEditTarget().completed, true);
  assert.equal(h.store.getState().currentSession, beforeSession);
  assert.equal(beforeSession.exercises[0].sets[0].completed, true);
  assert.deepEqual(h.store.getState().getActiveSetTarget(), active);
  assert.deepEqual(interactive(h), beforeFrame);
  assert.deepEqual(h.sql.prepare('SELECT * FROM sets').all(), beforeRows);
  assert.equal(h.sql.prepare('SELECT total_changes() AS n').get().n, changes);
  // Widget commands keep operating on set 2 while the app inspects set 1.
  h.act('increaseReps');
  assert.equal(h.store.getState().currentSession.exercises[0].sets[1].reps, beforeSession.exercises[0].sets[1].reps + 1);
  assert.equal(h.store.getState().selectedSet.setIndex, 0);
  h.sql.close();
});

test('completed-set weight and reps corrections stay completed and do not touch adjacent sets or targets', () => {
  const h = actionHarness();
  h.act('completeSet');
  const later = structuredClone(h.store.getState().currentSession.exercises[0].sets.slice(1));
  h.store.getState().selectWorkoutSet(0, 0);
  const target = h.store.getState().getSetEditTarget();
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 80).status, 'applied');
  assert.equal(h.store.getState().applySetValueAction(target, 'setReps', 12).status, 'applied');
  const corrected = h.store.getState().currentSession.exercises[0].sets[0];
  assert.equal(corrected.completed, true);
  assert.equal(corrected.skipped, false);
  assert.equal(corrected.weight, 80);
  assert.equal(corrected.reps, 12);
  assert.equal(corrected.valueOrigin, 'user');
  assert.deepEqual(h.store.getState().currentSession.exercises[0].sets.slice(1), later);
  const row = h.sql.prepare('SELECT * FROM sets WHERE id = ?').get(Number(target.setId));
  assert.equal(row.completed, 1);
  assert.equal(row.weight, 80);
  assert.equal(row.reps, 12);
  assert.equal(row.value_origin, 'user');
  // All downstream projections use the corrected persisted data at save.
  const saved = h.store.getState().completeWorkout('medium');
  const persisted = h.database.readCompletedSessionsSync()[0];
  const summary = h.load('@/store/workoutSummary').deriveWorkoutSummary(persisted);
  assert.equal(summary.volumeKg, 960);
  assert.equal(summary.repCount, 12);
  const records = h.database.readExerciseRecordSetsSync(persisted.exercises[0].name, [persisted]);
  assert.deepEqual(records.map((set) => [set.weight, set.reps]), [[80, 12]]);
  const build = h.load('@/features/build/adapter').adaptBuildHistory([persisted], new Clock());
  assert.equal(build.state.metrics.volumeKg, 960);
  const log = h.load('@/store/liftLog').deriveLiftLog(persisted, [saved], 'kg');
  assert.equal(log.lines[0].value, '80');
  assert.equal(log.lines[0].scheme, '1 × 12');
  h.sql.close();
});

test('completed bonus and skipped sets can be corrected without changing flags or summary membership', () => {
  const h = actionHarness();
  h.store.getState().toggleSetSkipped(0, 0);
  h.store.getState().appendBonusSet(0, 'dropset', 6, 20);
  for (const index of [0, 3]) {
    h.store.getState().selectWorkoutSet(0, index);
    const target = h.store.getState().getSetEditTarget();
    assert.equal(h.store.getState().applySetValueAction(target, 'setReps', 10).status, 'applied');
    assert.equal(h.store.getState().applySetValueAction(target, 'increaseWeight').status, 'applied');
    assert.equal(h.store.getState().currentSession.exercises[0].sets[index].completed, true);
  }
  const sets = h.store.getState().currentSession.exercises[0].sets;
  assert.equal(sets[0].skipped, true);
  assert.equal(sets[3].type, 'dropset');
  assert.equal(sets[1].completed, false);
  const summary = h.load('@/store/workoutSummary').deriveWorkoutSummary(h.store.getState().currentSession);
  assert.equal(summary.setCount, 1);
  assert.equal(summary.repCount, 10);
  assert.equal(summary.specialSets.dropset, 1);
  h.sql.close();
});

for (const autoIncreaseWeight of [true, false]) {
  test(`explicit future values survive completion/re-completion and widget prediction (increase=${autoIncreaseWeight})`, () => {
    const h = actionHarness();
    h.store.getState().updateProfile({ autoIncreaseWeight });
    h.store.getState().updateExerciseSet(0, 0, 12, 40);
    h.store.getState().updateExerciseSet(0, 1, 7, 100);
    const next = structuredClone(h.store.getState().currentSession.exercises[0].sets[1]);
    let local = interactive(h);
    assert.equal(local.interaction.nextWeightOffsetKg, undefined);
    assert.equal(local.interaction.nextRepsFromCurrent, undefined);
    local = press(press(press(local, 'increaseWeight'), 'increaseReps'), 'completeSet');
    assert.equal(local.weight, '100');
    assert.equal(local.reps, 7);
    h.act('increaseWeight'); h.act('increaseReps'); h.act('completeSet');
    assert.deepEqual(h.store.getState().currentSession.exercises[0].sets[1], next);
    assert.equal(interactive(h).weight, local.weight);
    const rows = h.sql.prepare('SELECT * FROM sets').all();
    h.store.getState().toggleSetCompleted(0, 0); // legacy caller cannot reopen/replay it
    assert.deepEqual(h.sql.prepare('SELECT * FROM sets').all(), rows);
    const restored = h.database.readInitialWorkoutSnapshot();
    return restored.then((snapshot) => {
      assert.equal(snapshot.currentSession.exercises[0].sets[1].valueOrigin, 'user');
      h.sql.close();
    });
  });
}

test('skipping preserves custom values, stores both flags and uses targets only for next-session suggestions', () => {
  const h = actionHarness();
  const targets = { ...h.active() };
  h.store.getState().updateExerciseSet(0, 0, 6, 35);
  h.store.getState().toggleSetSkipped(0, 0);
  const skipped = h.store.getState().currentSession.exercises[0].sets[0];
  assert.deepEqual([skipped.reps, skipped.weight, skipped.completed, skipped.skipped, skipped.valueOrigin], [6, 35, true, true, 'user']);
  assert.deepEqual([skipped.targetReps, skipped.targetWeight], [targets.targetReps, targets.targetWeight]);
  const row = h.sql.prepare('SELECT * FROM sets WHERE id = ?').get(Number(h.database.readCurrentSetTarget(0, 0).setId));
  assert.deepEqual([row.reps, row.weight, row.completed, row.skipped], [6, 35, 1, 1]);
  h.store.getState().completeWorkout('medium');
  h.store.getState().startWorkoutFromArchetype(['push']);
  assert.equal(h.active().targetWeight, targets.targetWeight);
  assert.equal(h.active().targetReps, targets.targetReps);
  h.sql.close();
});

test('absolute commits reject an advanced active target even after explicit historical selection', () => {
  const h = actionHarness();
  const old = h.store.getState().getSetEditTarget();
  h.act('completeSet');
  const before = h.store.getState().currentSession;
  for (const action of ['setWeight', 'setReps']) {
    assert.equal(h.store.getState().applySetValueAction(old, action, 100).status, 'stale');
  }
  assert.equal(h.store.getState().currentSession, before);
  h.store.getState().selectWorkoutSet(0, 0);
  assert.equal(h.store.getState().applySetValueAction(old, 'setWeight', 100).status, 'stale');
  const historical = h.store.getState().getSetEditTarget();
  assert.equal(h.store.getState().applySetValueAction(historical, 'setWeight', 100).status, 'applied');
  assert.equal(h.store.getState().currentSession.exercises[0].sets[0].completed, true);
  assert.equal(h.active().weight, before.exercises[0].sets[1].weight);
  h.sql.close();
});

test('absolute commits validate every identity, selection, hydration, bounds and SQLite replacement', () => {
  const h = actionHarness();
  const target = h.store.getState().getSetEditTarget();
  for (const field of ['workoutId', 'workoutStartedAt', 'exerciseId', 'setId', 'exerciseName']) {
    assert.equal(h.store.getState().applySetValueAction({ ...target, [field]: 'invalid' }, 'setWeight', 100).status, 'stale');
  }
  for (const field of ['exerciseIndex', 'setIndex']) {
    assert.equal(h.store.getState().applySetValueAction({ ...target, [field]: 1 }, 'setReps', 10).status, 'stale');
  }
  for (const [action, value] of [['setWeight', NaN], ['setWeight', Infinity], ['setReps', 2.5], ['setReps', undefined]]) {
    assert.equal(h.store.getState().applySetValueAction(target, action, value).status, 'failed');
  }
  h.store.setState({ isHydrated: false });
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 100).status, 'unavailable');
  h.store.setState({ isHydrated: true });
  h.store.getState().setWorkoutExerciseIndex(1);
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 100).status, 'stale');
  h.store.getState().setWorkoutExerciseIndex(0);
  h.database.replaceCurrentSessionExercise(0, h.store.getState().currentSession.exercises[0]);
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 100).status, 'stale');
  h.sql.close();
});

test('absolute field commits merge with the latest other field and preserve completed edits on failure', () => {
  const h = actionHarness();
  let target = h.store.getState().getSetEditTarget();
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 50).status, 'applied');
  assert.equal(h.store.getState().applySetValueAction(target, 'setReps', 12).status, 'applied');
  h.act('completeSet');
  h.store.getState().selectWorkoutSet(0, 0);
  target = h.store.getState().getSetEditTarget();
  const before = h.store.getState().currentSession;
  const rows = h.sql.prepare('SELECT * FROM sets').all();
  const run = h.adapter.runSync;
  h.adapter.runSync = () => { throw Error('disk full'); };
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 70).status, 'failed');
  assert.equal(h.store.getState().currentSession, before);
  assert.deepEqual(h.sql.prepare('SELECT * FROM sets').all(), rows);
  h.adapter.runSync = run;
  assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', 70).status, 'applied');
  const corrected = h.store.getState().currentSession.exercises[0].sets[0];
  assert.deepEqual([corrected.reps, corrected.weight, corrected.completed], [12, 70, true]);
  h.sql.close();
});

test('stable exercise focus survives real store hydration, while inspection state is cleared', async () => {
  const h = actionHarness();
  h.store.getState().setWorkoutExerciseIndex(1);
  h.act('completeSet');
  h.store.getState().selectWorkoutSet(1, 0);
  const before = h.store.getState().workoutFocus;
  // Simulate losing all in-memory workout state and execute the app's hydration path.
  h.store.setState({ currentSession: null, workoutFocus: null, selectedSet: null, isHydrated: false });
  await h.load('@/store/workoutStore').initializeWorkoutStore();
  assert.deepEqual(h.store.getState().workoutFocus, before);
  assert.equal(h.store.getState().selectedSet, null);
  assert.equal(h.store.getState().getActiveSetTarget().exerciseIndex, 1);
  assert.equal(h.store.getState().getActiveSetTarget().setIndex, 1);
  assert.equal(interactive(h).exerciseName, h.store.getState().currentSession.exercises[1].name);
  h.store.getState().discardWorkout();
  assert.equal(h.database.readCurrentWorkoutFocusSync(), null);
  h.sql.close();
});

test('focus persistence failure leaves current exercise unchanged', () => {
  const h = actionHarness();
  const before = h.store.getState().workoutFocus;
  const run = h.adapter.runSync;
  h.adapter.runSync = () => { throw Error('disk full'); };
  h.store.getState().setWorkoutExerciseIndex(1);
  assert.equal(h.store.getState().workoutFocus, before);
  assert.deepEqual(h.database.readCurrentWorkoutFocusSync(), before);
  h.adapter.runSync = run;
  h.sql.close();
});

test('origins round-trip template/history/propagated/user without changing existing preload rules', async () => {
  const h = actionHarness();
  assert.equal(h.active().valueOrigin, 'template');
  h.act('completeSet');
  assert.equal(h.active().valueOrigin, 'propagated');
  h.act('increaseWeight');
  assert.equal(h.active().valueOrigin, 'user');
  let snapshot = await h.database.readInitialWorkoutSnapshot();
  assert.deepEqual(snapshot.currentSession.exercises[0].sets.map((s) => s.valueOrigin), ['template', 'user', 'template']);
  h.store.getState().completeWorkout('medium');
  h.store.getState().startWorkoutFromArchetype(['push']);
  snapshot = await h.database.readInitialWorkoutSnapshot();
  assert.deepEqual(snapshot.currentSession.exercises[0].sets.map((s) => s.valueOrigin), ['history', 'history', 'history']);
  h.sql.close();
});

test('v15 migration preserves legacy values, protects ambiguous edits, restores fallback focus and is idempotent', async () => {
  const h = actionHarness();
  h.act('completeSet'); h.act('completeSet'); h.act('completeSet');
  h.store.getState().updateExerciseSet(1, 1, 7, 100);
  const values = h.sql.prepare('SELECT id, reps, weight, target_reps, target_weight, completed, skipped FROM sets').all();
  h.sql.exec('ALTER TABLE sets DROP COLUMN value_origin; ALTER TABLE sessions DROP COLUMN focus_session_exercise_id; PRAGMA user_version = 14;');
  await h.database.testReopenDatabase();
  assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 18);
  assert.deepEqual(h.sql.prepare('SELECT id, reps, weight, target_reps, target_weight, completed, skipped FROM sets').all(), values);
  assert.ok(h.sql.prepare('SELECT value_origin FROM sets').all().every((s) => s.value_origin === 'user'));
  const focus = h.database.readCurrentWorkoutFocusSync();
  assert.equal(focus.exerciseIndex, 1);
  assert.equal(focus.exerciseId, h.database.readCurrentSetTarget(1, 0).exerciseId);
  h.database.writeCurrentWorkoutFocus(focus.workoutId, 0);
  await h.database.testMigrateWorkoutState(h.adapter);
  assert.equal(h.database.readCurrentWorkoutFocusSync().exerciseIndex, 0);
  assert.equal(h.sql.prepare('PRAGMA foreign_key_check').all().length, 0);
  h.sql.close();
});

test('dangerous unused split mutation APIs are removed from both store and database', () => {
  const h = actionHarness();
  for (const name of ['removeExerciseFromSplit', 'moveExerciseInSplit']) assert.equal(h.store.getState()[name], undefined);
  for (const name of ['removeExerciseFromSplitRecords', 'moveExerciseInSplitRecords']) assert.equal(h.database[name], undefined);
  h.sql.close();
});

test('automatic focus advance rolls back together with final-set completion on persistence failure', () => {
  const h = actionHarness();
  h.act('completeSet'); h.act('completeSet');
  const before = h.store.getState().currentSession;
  const focus = h.store.getState().workoutFocus;
  const rows = h.sql.prepare('SELECT * FROM sets').all();
  const run = h.adapter.runSync;
  h.adapter.runSync = (query, ...args) => {
    if (query.includes('UPDATE sessions SET focus_session_exercise_id')) throw Error('focus disk full');
    return run(query, ...args);
  };
  const target = h.store.getState().getActiveSetTarget();
  assert.equal(h.store.getState().applyActiveSetAction(target, 'completeSet').status, 'failed');
  assert.equal(h.store.getState().currentSession, before);
  assert.equal(h.store.getState().workoutFocus, focus);
  assert.deepEqual(h.database.readCurrentWorkoutFocusSync(), focus);
  assert.deepEqual(h.sql.prepare('SELECT * FROM sets').all(), rows);
  h.adapter.runSync = run;
  assert.equal(h.store.getState().applyActiveSetAction(target, 'completeSet').status, 'applied');
  assert.equal(h.store.getState().getActiveSetTarget().exerciseIndex, 1);
  assert.deepEqual(h.database.readCurrentWorkoutFocusSync(), h.store.getState().workoutFocus);
  h.sql.close();
});

test('historical absolute commits reject changed inspection and replacement/session identities', () => {
  const h = actionHarness();
  h.act('completeSet'); h.act('completeSet');
  h.store.getState().selectWorkoutSet(0, 0);
  const historical = h.store.getState().getSetEditTarget();
  h.store.getState().selectWorkoutSet(0, 1);
  assert.equal(h.store.getState().applySetValueAction(historical, 'setWeight', 100).status, 'stale');
  h.store.getState().selectWorkoutSet(0, 0);
  h.database.replaceCurrentSessionExercise(0, h.store.getState().currentSession.exercises[0]);
  assert.equal(h.store.getState().applySetValueAction(historical, 'setWeight', 100).status, 'stale');
  h.store.getState().startWorkoutFromArchetype(['push']);
  assert.equal(h.store.getState().selectedSet, null);
  assert.equal(h.store.getState().applySetValueAction(historical, 'setWeight', 100).status, 'stale');
  assert.equal(h.active().completed, false);
  h.sql.close();
});

// Slice 2: exercise logging units are persisted workout data. Settings remains
// the presentation preference for completed sessions, never an active unit.
const changeEntryUnit = (h, exerciseIndex, unit) => {
  h.store.getState().setWorkoutExerciseIndex(exerciseIndex);
  const target = h.store.getState().getSetEditTarget();
  assert.ok(target);
  assert.equal(h.store.getState().setExerciseEntryUnit(target, unit).status, 'applied');
};

for (const unit of ['kg', 'lbs']) {
  for (const pathName of ['legacy', 'archetype', 'custom']) {
    test(`new ${pathName} workout defaults every exercise to global ${unit}`, () => {
      const h = harness();
      try {
        h.store.setState({ isHydrated: true });
        h.store.getState().updateProfile({ weightUnit: unit });
        if (pathName === 'legacy') {
          h.lifts.forEach((lift, position) => h.adapter.runSync(
            'INSERT INTO split_templates (workout_type, exercise_id, position, target_reps, target_weight) VALUES (?, ?, ?, 8, 20)',
            'chest', lift.id, position));
          h.store.getState().startWorkout(['chest']);
        } else if (pathName === 'archetype') {
          h.store.getState().startWorkoutFromArchetype(['push']);
        } else {
          const splitId = h.database.createCustomSplitSync('Mixed');
          const workoutId = h.database.addWorkoutToSplitSync(splitId, 'Day');
          h.lifts.forEach((lift) => h.database.addExerciseToWorkoutSync(workoutId, lift.id));
          assert.equal(h.store.getState().startWorkoutFromCustomWorkout(splitId, workoutId), true);
        }
        const session = h.store.getState().currentSession;
        assert.ok(session.exercises.length >= 2);
        assert.ok(session.exercises.every((exercise) => exercise.entryUnit === unit));
        assert.ok(h.database.testReadCurrentSessionSync().exercises.every((exercise) => exercise.entryUnit === unit));
      } finally { h.sql.close(); }
    });
  }
}

test('exercise units survive navigation/reload without writing profile or canonical set values', () => {
  const h = actionHarness();
  try {
    h.store.getState().appendExerciseToSession('Bicep Curls');
    const before = h.sql.prepare('SELECT * FROM sets ORDER BY id').all();
    const profileBefore = h.sql.prepare('SELECT * FROM profile').get();
    changeEntryUnit(h, 1, 'lbs');
    for (const index of [2, 0, 1, 2, 1, 0]) h.store.getState().setWorkoutExerciseIndex(index);
    assert.deepEqual(h.store.getState().currentSession.exercises.map((exercise) => exercise.entryUnit), ['kg', 'lbs', 'kg']);
    assert.deepEqual(h.database.testReadCurrentSessionSync().exercises.map((exercise) => exercise.entryUnit), ['kg', 'lbs', 'kg']);
    assert.deepEqual(h.sql.prepare('SELECT * FROM profile').get(), profileBefore);
    assert.deepEqual(h.sql.prepare('SELECT * FROM sets ORDER BY id').all(), before);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    assert.deepEqual(h.store.getState().currentSession.exercises.map((exercise) => exercise.entryUnit), ['kg', 'lbs', 'kg']);
    const restored = h.database.testReadCurrentSessionSync();
    h.store.setState({ currentSession: restored, workoutFocus: h.database.readCurrentWorkoutFocusSync() });
    assert.deepEqual(restored.exercises.map((exercise) => exercise.entryUnit), ['kg', 'lbs', 'kg']);
  } finally { h.sql.close(); }
});

test('lb absolute input stays canonical and round trips without rounding saved weights', () => {
  const h = actionHarness();
  try {
    const { lbsToKg, formatWeight } = h.load('@/store/weightUnits');
    changeEntryUnit(h, 0, 'lbs');
    // The real keypad converts its entry to kg at the component boundary.
    const target = h.store.getState().getSetEditTarget();
    assert.equal(h.store.getState().applySetValueAction(target, 'setWeight', lbsToKg(180)).status, 'applied');
    const stored = h.sql.prepare('SELECT weight FROM sets WHERE id = ?').get(Number(target.setId)).weight;
    assert.ok(Math.abs(stored - 81.6466) < 0.001);
    assert.equal(formatWeight(stored, 'lbs'), '180');
    changeEntryUnit(h, 0, 'kg');
    assert.equal(formatWeight(h.active().weight, 'kg'), '81.6');
    changeEntryUnit(h, 0, 'lbs');
    assert.equal(formatWeight(h.active().weight, 'lbs'), '180');
    assert.equal(h.sql.prepare('SELECT weight FROM sets WHERE id = ?').get(Number(target.setId)).weight, stored);
    h.store.getState().applySetValueAction(target, 'setWeight', 100);
    assert.equal(formatWeight(h.active().weight, 'lbs'), '220.5');
    changeEntryUnit(h, 0, 'kg');
    assert.equal(h.active().weight, 100);
    // Complete and inspect a historical set: the exercise toggle covers it too.
    h.act('completeSet');
    h.store.getState().selectWorkoutSet(0, 0);
    changeEntryUnit(h, 0, 'lbs');
    const exercise = h.database.testReadCurrentSessionSync().exercises[0];
    assert.equal(exercise.sets[0].weight, 100);
    assert.equal(exercise.entryUnit, 'lbs');
    assert.equal(formatWeight(exercise.sets[0].weight, exercise.entryUnit), '220.5');
    assert.equal(formatWeight(exercise.sets[1].weight, exercise.entryUnit), formatWeight(100.5, 'lbs'));
  } finally { h.sql.close(); }
});

test('per-exercise +/- and between-set propagation use entry unit even after Settings changes', () => {
  const h = actionHarness();
  try {
    const { lbsToKg } = h.load('@/store/weightUnits');
    h.store.getState().updateExerciseSet(0, 0, 8, 100);
    h.act('increaseWeight');
    assert.equal(h.active().weight, 100.5);
    h.act('decreaseWeight');
    assert.equal(h.active().weight, 100);
    changeEntryUnit(h, 1, 'lbs');
    h.store.getState().updateExerciseSet(1, 0, 8, lbsToKg(180));
    h.act('increaseWeight');
    assert.ok(Math.abs(h.active().weight - lbsToKg(185)) < 1e-10);
    h.act('decreaseWeight');
    assert.ok(Math.abs(h.active().weight - lbsToKg(180)) < 1e-10);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    h.act('completeSet');
    assert.ok(Math.abs(h.active().weight - lbsToKg(185)) < 1e-10);
    h.store.getState().setWorkoutExerciseIndex(0);
    const edit = h.store.getState().getSetEditTarget();
    assert.equal(h.store.getState().applySetValueAction(edit, 'increaseWeight').status, 'applied');
    assert.equal(h.active().weight, 100.5);
    h.act('completeSet');
    assert.equal(h.active().weight, 101);
  } finally { h.sql.close(); }
});

test('Live Activity changes label, weight, action step and optimistic next exercise with focus', () => {
  const h = actionHarness();
  try {
    const { lbsToKg } = h.load('@/store/weightUnits');
    changeEntryUnit(h, 1, 'lbs');
    h.store.getState().updateExerciseSet(1, 0, 8, lbsToKg(180));
    let payload = interactive(h);
    assert.equal(payload.unit, 'lbs');
    assert.equal(payload.weight, '180');
    assert.equal(payload.interaction.weightStepKg, lbsToKg(5));
    assert.equal(press(payload, 'increaseWeight').weight, '185');
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    h.store.getState().setWorkoutExerciseIndex(0);
    h.store.getState().updateExerciseSet(0, 0, 8, 100);
    payload = interactive(h);
    assert.equal(payload.unit, 'kg');
    assert.equal(payload.weight, '100');
    assert.equal(payload.interaction.weightStepKg, 0.5);
    h.act('completeSet'); h.act('completeSet');
    const finalSet = interactive(h);
    const preview = press(finalSet, 'completeSet');
    assert.equal(preview.unit, 'lbs');
    assert.equal(preview.weight, '180');
    assert.equal(preview.interaction.weightStepKg, lbsToKg(5));
    h.act('completeSet');
    assert.equal(interactive(h).unit, preview.unit);
    assert.equal(interactive(h).weight, preview.weight);
  } finally { h.sql.close(); }
});

test('old Live Activity weight actions become stale after exercise unit changes', () => {
  const h = actionHarness();
  try {
    const oldFrame = interactive(h);
    const before = h.active().weight;
    changeEntryUnit(h, 0, 'lbs');
    h.enqueue('increaseWeight', undefined, { target: oldFrame.actionTarget + 'increaseWeight' });
    h.drain();
    assert.equal(h.active().weight, before);
    assert.equal(h.applied.length, 0);
    const frame = interactive(h);
    h.enqueue('increaseWeight', undefined, { target: frame.actionTarget + 'increaseWeight' });
    h.drain();
    assert.equal(h.applied.at(-1).result.status, 'applied');
  } finally { h.sql.close(); }
});

for (const displayUnit of ['kg', 'lbs']) {
  test(`mixed logging units finish, summarize and display in history using current global ${displayUnit}`, () => {
    const h = actionHarness();
    try {
      const { lbsToKg, formatWeight } = h.load('@/store/weightUnits');
      const { deriveWorkoutSummary, displayVolume } = h.load('@/store/workoutSummary');
      const { deriveLiftLog } = h.load('@/store/liftLog');
      const { deriveHistoryGroups } = h.load('@/store/workoutHistory');
      h.store.getState().updateProfile({ autoIncreaseWeight: false });
      h.store.getState().updateExerciseSet(0, 0, 8, 100);
      h.act('completeSet');
      changeEntryUnit(h, 1, 'lbs');
      h.store.getState().updateExerciseSet(1, 0, 8, lbsToKg(180));
      h.act('completeSet');
      h.store.getState().updateProfile({ weightUnit: displayUnit });
      const completed = h.store.getState().completeWorkout('medium');
      assert.deepEqual(completed.exercises.map((exercise) => exercise.entryUnit), ['kg', 'lbs']);
      let unit = h.store.getState().profile.weightUnit;
      let log = deriveLiftLog(completed, [], unit).lines;
      assert.deepEqual(log.map((row) => row.unit), [unit, unit]);
      assert.deepEqual(log.map((row) => row.value), [formatWeight(100, unit), formatWeight(lbsToKg(180), unit)]);
      const summary = deriveWorkoutSummary(completed);
      assert.ok(Math.abs(summary.volumeKg - (100 + lbsToKg(180)) * 8) < 1e-9);
      assert.equal(displayVolume(summary.volumeKg, unit), unit === 'kg' ? summary.volumeKg : summary.volumeKg * 2.20462);
      const history = h.database.readCompletedSessionsSync();
      assert.equal(deriveHistoryGroups(history).thisWeek[0].id, completed.id);
      const snapshot = h.sql.prepare('SELECT * FROM sets ORDER BY id').all();
      // Old history is reformatted when Settings changes later.
      h.store.getState().updateProfile({ weightUnit: unit === 'kg' ? 'lbs' : 'kg' });
      unit = h.store.getState().profile.weightUnit;
      log = deriveLiftLog(history[0], [], unit).lines;
      assert.deepEqual(log.map((row) => row.unit), [unit, unit]);
      assert.equal(log[1].value, formatWeight(lbsToKg(180), unit));
      assert.deepEqual(h.sql.prepare('SELECT * FROM sets ORDER BY id').all(), snapshot);
    } finally { h.sql.close(); }
  });
}

test('completion persists one timestamp with completed flag, preserving original start across reload', () => {
  const h = actionHarness();
  try {
    const startedAt = new RealDate(new Clock().valueOf() - 2 * 60 * 60 * 1000).toISOString();
    h.sql.prepare('UPDATE sessions SET date = ? WHERE completed = 0').run(startedAt);
    h.store.setState({ currentSession: h.database.testReadCurrentSessionSync() });
    h.store.getState().toggleSetCompleted(0, 0);
    const completed = h.store.getState().completeWorkout('hard');
    assert.ok(completed.completedAt);
    assert.ok(completed.completedAt >= startedAt);
    assert.equal(Date.parse(completed.completedAt) - Date.parse(startedAt), 2 * 60 * 60 * 1000);
    const row = h.sql.prepare('SELECT * FROM sessions WHERE id = ?').get(Number(completed.id));
    assert.equal(row.completed, 1);
    assert.equal(row.completed_at, completed.completedAt);
    assert.equal(row.date, startedAt);
    assert.equal(h.database.readCompletedSessionsSync()[0].completedAt, completed.completedAt);
    assert.equal(h.store.getState().completeWorkout('easy'), undefined);
    assert.equal(h.sql.prepare('SELECT completed_at FROM sessions').get().completed_at, completed.completedAt);
    h.store.getState().logArchetypeCompletedRetroactively(['push'], '2026-09-15');
    assert.equal(h.sql.prepare('SELECT completed_at FROM sessions WHERE retroactive = 1').get().completed_at, null);
  } finally { h.sql.close(); }
});

test('failed completion leaves both timestamp and completed flag unset', () => {
  const h = actionHarness();
  try {
    h.store.getState().toggleSetCompleted(0, 0);
    h.sql.exec("CREATE TRIGGER fail_completion BEFORE UPDATE OF completed ON sessions WHEN NEW.completed = 1 BEGIN SELECT RAISE(ABORT, 'test completion failure'); END;");
    assert.equal(h.store.getState().completeWorkout('hard'), undefined);
    const row = h.sql.prepare('SELECT completed, completed_at FROM sessions').get();
    assert.equal(row.completed, 0);
    assert.equal(row.completed_at, null);
    assert.ok(h.store.getState().currentSession);
    assert.equal(h.store.getState().sessions.length, 0);
  } finally { h.sql.close(); }
});

for (const preference of ['kg', 'lbs']) {
  test(`real v15 schema migrates with ${preference} fallback, preserves all values, and reopens idempotently`, async () => {
    const schema = fs.readFileSync(path.join(root, 'tests/fixtures/workout-v15.sql'), 'utf8');
    const h = harness({ schema });
    try {
      h.store.getState().updateProfile({ weightUnit: preference });
      const active = h.adapter.runSync('INSERT INTO sessions (date, completed) VALUES (?, 0)', '2026-09-16T10:00:00.000Z').lastInsertRowId;
      const finished = h.adapter.runSync('INSERT INTO sessions (date, completed) VALUES (?, 1)', '2026-09-15T10:00:00.000Z').lastInsertRowId;
      for (const sessionId of [active, finished]) {
        h.adapter.runSync("INSERT INTO session_workout_types (session_id, workout_type, position) VALUES (?, 'chest', 0)", sessionId);
        h.lifts.forEach((lift, index) => {
          const exerciseId = h.adapter.runSync('INSERT INTO session_exercises (session_id, exercise_id, position) VALUES (?, ?, ?)', sessionId, lift.id, index).lastInsertRowId;
          h.adapter.runSync("INSERT INTO sets (session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed, value_origin) VALUES (?, 0, 8, ?, 8, ?, ?, 'user')", exerciseId, 81.6466266 + index, 100.125 + index, sessionId === finished ? 1 : 0);
        });
      }
      assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 15);
      // v17 adds duration columns; every pre-existing column must be untouched.
      const legacySets = 'SELECT id, session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed, skipped, bonus_type, value_origin FROM sets ORDER BY id';
      const values = h.sql.prepare(legacySets).all();
      const profile = h.sql.prepare('SELECT * FROM profile').get();
      const oldExercises = h.sql.prepare('SELECT id, session_id, exercise_id, position FROM session_exercises ORDER BY id').all();
      await h.database.testReopenDatabase();
      assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 18);
      assert.deepEqual(h.sql.prepare(legacySets).all(), values);
      assert.deepEqual(h.sql.prepare('SELECT * FROM profile').get(), profile);
      assert.deepEqual(h.sql.prepare('SELECT id, session_id, exercise_id, position FROM session_exercises ORDER BY id').all(), oldExercises);
      assert.ok(h.sql.prepare('SELECT entry_unit FROM session_exercises').all().every((row) => row.entry_unit === preference));
      assert.equal(h.database.readCompletedSessionsSync()[0].completedAt, null);
      assert.equal(h.database.testReadCurrentSessionSync().completedAt, null);
      h.store.setState({ currentSession: h.database.testReadCurrentSessionSync(), workoutFocus: h.database.readCurrentWorkoutFocusSync(), isHydrated: true });
      changeEntryUnit(h, 0, preference === 'kg' ? 'lbs' : 'kg');
      h.store.getState().updateProfile({ weightUnit: preference === 'kg' ? 'lbs' : 'kg' });
      const expectedUnits = h.sql.prepare('SELECT * FROM session_exercises ORDER BY id').all();
      await h.database.testReopenDatabase();
      await h.database.testReopenDatabase();
      assert.deepEqual(h.sql.prepare('SELECT * FROM session_exercises ORDER BY id').all(), expectedUnits);
      assert.deepEqual(h.sql.prepare(legacySets).all(), values);
      assert.ok(h.sql.prepare('SELECT completed_at FROM sessions').all().every((row) => row.completed_at === null));
      // Rep-based lifts gain no fabricated duration.
      assert.ok(h.sql.prepare('SELECT duration_s, target_duration_s FROM sets').all().every((row) => row.duration_s === null && row.target_duration_s === null));
      assert.equal(h.sql.prepare('PRAGMA foreign_key_check').all().length, 0);
    } finally { h.sql.close(); }
  });
}

test('real v14 schema (last committed) migrates straight to v18 with every column, backfill and an idempotent reopen', async () => {
  const columns = (sql) => Object.fromEntries(['exercises', 'split_templates', 'archetype_templates', 'sessions', 'session_exercises', 'sets', 'profile']
    .map((table) => [table, sql.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name).sort()]));
  const fresh = harness();
  const freshColumns = columns(fresh.sql);
  const freshObjects = fresh.sql.prepare("SELECT type, name FROM sqlite_master WHERE type IN ('index', 'trigger') ORDER BY name").all();
  fresh.sql.close();
  const h = harness({ schema: fs.readFileSync(path.join(root, 'tests/fixtures/workout-v14.sql'), 'utf8') });
  try {
    assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 14);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    const id = (name) => h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get(name).id;
    const addSession = (columnsSql, values, exercises) => {
      const sessionId = h.adapter.runSync(`INSERT INTO sessions (${columnsSql}) VALUES (${values.map(() => '?').join(', ')})`, ...values).lastInsertRowId;
      h.adapter.runSync("INSERT INTO session_workout_types (session_id, workout_type, position) VALUES (?, 'core', 0)", sessionId);
      exercises.forEach(([exerciseId, sets], position) => {
        const seId = h.adapter.runSync('INSERT INTO session_exercises (session_id, exercise_id, position) VALUES (?, ?, ?)', sessionId, exerciseId, position).lastInsertRowId;
        sets.forEach(([reps, weight, completed], setIndex) => h.adapter.runSync(
          'INSERT INTO sets (session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
          seId, setIndex, reps, weight, reps, weight, completed));
      });
    };
    addSession('date, completed, archetype', ['2026-09-14T10:00:00.000Z', 1, 'push'],
      [[id('Plank'), [[60, 0, 1], [45, 0, 1]]], [id('Bench Press'), [[8, 80, 1]]]]);
    addSession('date, completed', ['2026-09-15T10:00:00.000Z', 1], [[id('Bench Press'), [[5, 90, 1]]]]);
    addSession('date, completed, custom_split_id, custom_split_workout_id', ['2026-09-16T10:00:00.000Z', 0, 7, 8],
      [[id('Bench Press'), [[8, 82.5, 1], [8, 82.5, 0]]], [id('Plank'), [[60, 0, 0]]]]);
    const legacyRows = h.sql.prepare('SELECT id, session_exercise_id, set_index, weight, completed, skipped, bonus_type FROM sets ORDER BY id').all();

    await h.database.testReopenDatabase();
    assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 18);
    assert.deepEqual(columns(h.sql), freshColumns);
    assert.deepEqual(h.sql.prepare("SELECT type, name FROM sqlite_master WHERE type IN ('index', 'trigger') ORDER BY name").all(), freshObjects);
    assert.deepEqual(h.sql.prepare('SELECT origin, completed_at FROM sessions ORDER BY id').all().map((r) => [r.origin, r.completed_at]),
      [['archetype', null], ['legacy', null], ['custom', null]]);
    assert.ok(h.sql.prepare('SELECT entry_unit FROM session_exercises').all().every((r) => r.entry_unit === 'lbs'));
    assert.ok(h.sql.prepare('SELECT value_origin FROM sets').all().every((r) => r.value_origin === 'user'));
    assert.deepEqual(h.sql.prepare('SELECT id, session_exercise_id, set_index, weight, completed, skipped, bonus_type FROM sets ORDER BY id').all(), legacyRows);
    assert.deepEqual(h.sql.prepare('SELECT e.name, se.load_type, se.metric FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id ORDER BY se.id').all()
      .map((r) => [r.name, r.load_type, r.metric]), [
      ['Plank', 'bodyweight', 'duration'], ['Bench Press', 'external_weight', 'reps'], ['Bench Press', 'external_weight', 'reps'],
      ['Bench Press', 'external_weight', 'reps'], ['Plank', 'bodyweight', 'duration'],
    ]);
    assert.deepEqual(h.sql.prepare('SELECT reps, duration_s FROM sets ORDER BY id').all().map((r) => [r.reps, r.duration_s]),
      [[0, 60], [0, 45], [8, null], [5, null], [8, null], [8, null], [0, 60]]);
    // Focus is restored to the first unfinished set of the in-progress session.
    assert.equal(h.database.readCurrentWorkoutFocusSync().exerciseIndex, 0);

    const dump = () => ['sessions', 'session_exercises', 'sets', 'exercises', 'profile', 'split_templates', 'archetype_templates']
      .map((table) => h.sql.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    const migrated = dump();
    await h.database.testReopenDatabase();
    await h.database.testReopenDatabase();
    assert.deepEqual(dump(), migrated);
    assert.equal(h.sql.prepare('PRAGMA foreign_key_check').all().length, 0);

    // The migrated in-progress workout hydrates and finishes like any other.
    h.store.setState({ ...(await h.database.readInitialWorkoutSnapshot()), isHydrated: true });
    h.store.setState({ workoutFocus: h.database.readCurrentWorkoutFocusSync() });
    const current = h.store.getState().currentSession;
    assert.equal(current.origin, 'custom');
    assert.deepEqual(current.exercises.map((e) => [e.entryUnit, e.metric]), [['lbs', 'reps'], ['lbs', 'duration']]);
    assert.ok(h.store.getState().completeWorkout('medium'));
    const completed = h.sql.prepare('SELECT completed, completed_at FROM sessions WHERE id = 3').get();
    assert.equal(completed.completed, 1);
    assert.ok(completed.completed_at);
  } finally { h.sql.close(); }
});

test('exercise unit writes reject replaced targets and persistence failures without touching profile', () => {
  const h = actionHarness();
  try {
    const target = h.store.getState().getActiveSetTarget();
    const profileBefore = h.sql.prepare('SELECT * FROM profile').get();
    h.sql.exec("CREATE TRIGGER fail_unit BEFORE UPDATE OF entry_unit ON session_exercises BEGIN SELECT RAISE(ABORT, 'test unit failure'); END;");
    assert.equal(h.store.getState().setExerciseEntryUnit(target, 'lbs').status, 'failed');
    assert.equal(h.store.getState().currentSession.exercises[0].entryUnit, 'kg');
    assert.equal(h.database.testReadCurrentSessionSync().exercises[0].entryUnit, 'kg');
    h.sql.exec('DROP TRIGGER fail_unit;');
    h.database.replaceCurrentSessionExercise(0, h.store.getState().currentSession.exercises[0]);
    assert.equal(h.store.getState().setExerciseEntryUnit(target, 'lbs').status, 'stale');
    assert.equal(h.database.testReadCurrentSessionSync().exercises[0].entryUnit, 'kg');
    assert.deepEqual(h.sql.prepare('SELECT * FROM profile').get(), profileBefore);
  } finally { h.sql.close(); }
});

test('newly added and replacement exercises default to current Settings while existing choices survive', () => {
  const h = actionHarness();
  try {
    changeEntryUnit(h, 1, 'lbs');
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    h.store.getState().appendExerciseToSession('Bicep Curls');
    assert.deepEqual(h.store.getState().currentSession.exercises.map((exercise) => exercise.entryUnit), ['kg', 'lbs', 'lbs']);
    h.store.getState().swapCurrentSessionExercise(0, 'Cable Fly');
    assert.deepEqual(h.store.getState().currentSession.exercises.map((exercise) => exercise.entryUnit), ['lbs', 'lbs', 'lbs']);
    assert.deepEqual(h.database.testReadCurrentSessionSync().exercises.map((exercise) => exercise.entryUnit), ['lbs', 'lbs', 'lbs']);
  } finally { h.sql.close(); }
});

test('four-exercise product example retains canonical kg and reformats completed weights from Settings', () => {
  const h = harness();
  try {
    h.store.setState({ isHydrated: true });
    h.store.getState().updateProfile({ autoIncreaseWeight: false });
    const splitId = h.database.createCustomSplitSync('Example');
    const workoutId = h.database.addWorkoutToSplitSync(splitId, 'Mixed units');
    const names = ['Bench Press', 'Lat Pulldown', 'Seated Dumbbell Shoulder Press', 'Bicep Curls'];
    for (const name of names) {
      const catalogId = h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get(name).id;
      h.database.addExerciseToWorkoutSync(workoutId, catalogId);
    }
    assert.equal(h.store.getState().startWorkoutFromCustomWorkout(splitId, workoutId), true);
    const { lbsToKg } = h.load('@/store/weightUnits');
    const weights = [100, lbsToKg(180), 25, lbsToKg(40)];
    for (let index = 0; index < names.length; index++) {
      changeEntryUnit(h, index, index % 2 ? 'lbs' : 'kg');
      h.store.getState().updateExerciseSet(index, 0, 8, weights[index]);
      h.store.getState().toggleSetCompleted(index, 0);
    }
    const completed = h.store.getState().completeWorkout('medium');
    const saved = h.database.readCompletedSessionsSync()[0];
    assert.deepEqual(saved.exercises.map((exercise) => exercise.sets[0].weight), weights);
    const { deriveLiftLog } = h.load('@/store/liftLog');
    assert.deepEqual(deriveLiftLog(completed, [], h.store.getState().profile.weightUnit).lines.map((line) => `${line.value} ${line.unit}`), ['100 kg', '81.6 kg', '25 kg', '18.1 kg']);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    assert.deepEqual(deriveLiftLog(saved, [], h.store.getState().profile.weightUnit).lines.map((line) => `${line.value} ${line.unit}`), ['220.5 lbs', '180 lbs', '55.1 lbs', '40 lbs']);
    assert.deepEqual(h.database.readCompletedSessionsSync()[0].exercises.map((exercise) => exercise.sets[0].weight), weights);
  } finally { h.sql.close(); }
});

// Slice 3: next session starts from what was actually lifted; progression is a
// derived suggestion that is never written until the user accepts it.
const insertHistory = (h, { date, retroactive = 0, name = h.lifts[0].name, workoutType = 'chest', entryUnit = 'kg', sets }) => {
  const exerciseId = h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get(name).id;
  const sessionId = h.adapter.runSync(
    'INSERT INTO sessions (date, completed, retroactive) VALUES (?, 1, ?)', date, retroactive).lastInsertRowId;
  h.adapter.runSync(
    'INSERT INTO session_workout_types (session_id, workout_type, position) VALUES (?, ?, 0)', sessionId, workoutType);
  const sessionExerciseId = h.adapter.runSync(
    'INSERT INTO session_exercises (session_id, exercise_id, position, entry_unit) VALUES (?, ?, 0, ?)',
    sessionId, exerciseId, entryUnit).lastInsertRowId;
  sets.forEach((set, index) => h.adapter.runSync(
    `INSERT INTO sets (session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed, skipped, bonus_type, value_origin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')`,
    sessionExerciseId, index, set.reps, set.weight, set.targetReps ?? set.reps, set.targetWeight ?? set.weight,
    set.completed === false ? 0 : 1, set.skipped ? 1 : 0, set.type ?? null));
  h.store.setState({ sessions: h.database.readCompletedSessionsSync() });
  return String(sessionId);
};
const pyramid = [
  { reps: 10, weight: 60, targetReps: 10 },
  { reps: 10, weight: 65, targetReps: 10 },
  { reps: 8, weight: 70, targetReps: 10 },
];
const startPush = (h) => {
  h.store.setState({ isHydrated: true });
  h.store.getState().startWorkoutFromArchetype(['push']);
  return h.store.getState().currentSession.exercises[0];
};
const weightsOf = (h, exerciseIndex = 0) =>
  h.store.getState().currentSession.exercises[exerciseIndex].sets.map((set) => set.weight);
const suggestionFor = (h, setIndex, exerciseIndex = 0) => {
  const { getSetProgressionSuggestion } = h.load('@/store/workoutProgression');
  const state = h.store.getState();
  return getSetProgressionSuggestion(state.sessions, state.currentSession.exercises[exerciseIndex], setIndex, state.profile);
};

test('Slice 3: next session preloads exact previous pyramid values with history origin', () => {
  const h = harness();
  try {
    insertHistory(h, { date: '2026-09-14', sets: pyramid });
    const exercise = startPush(h);
    assert.deepEqual(exercise.sets.map((set) => set.weight), [60, 65, 70]);
    assert.deepEqual(exercise.sets.map((set) => set.targetWeight), [60, 65, 70]);
    assert.deepEqual(exercise.sets.map((set) => set.targetReps), [10, 10, 10]);
    assert.deepEqual(exercise.sets.map((set) => set.valueOrigin), ['history', 'history', 'history']);
    const rows = h.sql.prepare(`SELECT st.weight, st.value_origin FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id
      JOIN sessions s ON s.id = se.session_id WHERE s.completed = 0 AND se.position = 0 ORDER BY st.set_index`).all();
    assert.deepEqual(rows.map((row) => [row.weight, row.value_origin]),
      [[60, 'history'], [65, 'history'], [70, 'history']]);
  } finally { h.sql.close(); }
});

for (const autoIncreaseWeight of [true, false]) {
  test(`Slice 3: completing set 1 never rewrites history sets (Increase Between Sets ${autoIncreaseWeight ? 'on' : 'off'})`, async () => {
    const h = actionHarness();
    try {
      insertHistory(h, { date: '2026-09-14', sets: pyramid });
      h.store.getState().updateProfile({ autoIncreaseWeight });
      startPush(h);
      // Live Activity previews the real next set, not a propagated one.
      const local = interactive(h);
      assert.equal(local.weight, '60');
      assert.equal(local.interaction.nextWeightOffsetKg, undefined);
      assert.equal(local.interaction.nextRepsFromCurrent, undefined);
      assert.equal(local.interaction.next.weight, '65');
      assert.equal(press(press(local, 'increaseWeight'), 'completeSet').weight, '65');
      h.act('completeSet');
      assert.deepEqual(weightsOf(h), [60, 65, 70]);
      assert.deepEqual(h.store.getState().currentSession.exercises[0].sets.map((set) => set.valueOrigin), ['history', 'history', 'history']);
      assert.equal(interactive(h).weight, '65');
      h.act('completeSet');
      assert.deepEqual(weightsOf(h), [60, 65, 70]);
      const reopened = (await h.database.readInitialWorkoutSnapshot()).currentSession.exercises[0].sets;
      assert.deepEqual(reopened.map((set) => set.weight), [60, 65, 70]);
    } finally { h.sql.close(); }
  });
}

test('Slice 3: a user override on set 2 survives completing and correcting set 1', () => {
  const h = actionHarness();
  try {
    insertHistory(h, { date: '2026-09-14', sets: pyramid });
    startPush(h);
    h.store.getState().updateExerciseSet(0, 1, 10, 72.5);
    assert.equal(h.store.getState().currentSession.exercises[0].sets[1].valueOrigin, 'user');
    h.act('completeSet');
    assert.deepEqual(weightsOf(h), [60, 72.5, 70]);
    h.store.getState().selectWorkoutSet(0, 0);
    const edit = h.store.getState().getSetEditTarget();
    assert.equal(edit.completed, true);
    assert.equal(h.store.getState().applySetValueAction(edit, 'setWeight', 62.5).status, 'applied');
    h.store.getState().toggleSetCompleted(0, 0);
    assert.deepEqual(weightsOf(h), [62.5, 72.5, 70]);
    assert.equal(h.store.getState().currentSession.exercises[0].sets[1].valueOrigin, 'user');
  } finally { h.sql.close(); }
});

test('Slice 3: hit and exceeded targets suggest one configured increment; the baseline stays', () => {
  const h = harness();
  try {
    h.store.getState().updateProfile({ weightIncrement: 2.5 });
    insertHistory(h, { date: '2026-09-14', sets: [
      { reps: 10, weight: 60, targetReps: 10 },
      { reps: 12, weight: 65, targetReps: 10 },
      { reps: 8, weight: 70, targetReps: 10 },
    ] });
    startPush(h);
    assert.deepEqual(weightsOf(h), [60, 65, 70]);
    assert.deepEqual([suggestionFor(h, 0)?.suggestedKg, suggestionFor(h, 1)?.suggestedKg, suggestionFor(h, 2)], [62.5, 67.5, null]);
    assert.equal(suggestionFor(h, 0).baselineKg, 60);
    assert.equal(suggestionFor(h, 0).increment, 2.5);
  } finally { h.sql.close(); }
});

test('Slice 3: missed, skipped and unlogged previous sets repeat the baseline without a suggestion', () => {
  const h = harness();
  try {
    const { getProgressionSuggestion } = h.load('@/store/workoutProgression');
    const profile = h.store.getState().profile;
    assert.equal(getProgressionSuggestion({ reps: 8, weight: 60, targetReps: 10, completed: true }, 'external_weight', profile, 'kg'), null);
    assert.equal(getProgressionSuggestion({ reps: 10, weight: 60, targetReps: 10, completed: true, skipped: true }, 'external_weight', profile, 'kg'), null);
    assert.equal(getProgressionSuggestion({ reps: 10, weight: 60, targetReps: 10, completed: false }, 'external_weight', profile, 'kg'), null);
    assert.equal(getProgressionSuggestion({ reps: 10, weight: 60, targetReps: 10, completed: true, type: 'extra' }, 'external_weight', profile, 'kg'), null);
    assert.equal(getProgressionSuggestion({ reps: 12, weight: 0, targetReps: 10, completed: true }, 'bodyweight', profile, 'kg'), null);
    insertHistory(h, { date: '2026-09-14', sets: [
      { reps: 8, weight: 60, targetReps: 10 },
      // A skipped row keeps its intended target, never the unperformed edit.
      { reps: 6, weight: 35, targetReps: 10, targetWeight: 65, skipped: true },
      { reps: 10, weight: 72, targetReps: 10, targetWeight: 70, completed: false },
    ] });
    startPush(h);
    const sets = h.store.getState().currentSession.exercises[0].sets;
    assert.deepEqual(sets.map((set) => set.weight), [60, 65, 70]);
    assert.deepEqual(sets.map((set) => set.reps), [10, 10, 10]);
    assert.deepEqual([0, 1, 2].map((index) => suggestionFor(h, index)), [null, null, null]);
  } finally { h.sql.close(); }
});

test('Slice 3: bonus sets never become working-set defaults and fewer previous sets fall back to the last one', () => {
  const h = harness();
  try {
    insertHistory(h, { date: '2026-09-13', sets: [...pyramid, { reps: 6, weight: 75, type: 'pr' }] });
    assert.deepEqual(startPush(h).sets.map((set) => set.weight), [60, 65, 70]);
    h.store.getState().discardWorkout();
    insertHistory(h, { date: '2026-09-14', sets: [
      { reps: 10, weight: 60, targetReps: 10 },
      { reps: 6, weight: 90, type: 'dropset' },
      { reps: 10, weight: 65, targetReps: 10 },
    ] });
    const exercise = startPush(h);
    assert.deepEqual(exercise.sets.map((set) => set.weight), [60, 65, 65]);
    assert.deepEqual(exercise.sets.map((set) => set.valueOrigin), ['history', 'history', 'propagated']);
    assert.equal(suggestionFor(h, 2), null);
    // The fallback is automatic, so Increase Between Sets may still recalculate it.
    h.store.getState().toggleSetCompleted(0, 0);
    h.store.getState().toggleSetCompleted(0, 1);
    assert.deepEqual(weightsOf(h), [60, 65, 65.5]);
  } finally { h.sql.close(); }
});

test('Slice 3: history is global by exercise across routines, swaps and appends; retroactive is ignored', () => {
  const h = harness();
  try {
    const name = 'Cable Fly';
    insertHistory(h, { date: '2026-09-10', name, workoutType: 'chest', sets: pyramid });
    insertHistory(h, { date: '2026-09-12', name, workoutType: 'legs', sets: [
      { reps: 10, weight: 80, targetReps: 10 }, { reps: 10, weight: 82.5, targetReps: 10 }, { reps: 10, weight: 85, targetReps: 10 },
    ] });
    insertHistory(h, { date: '2026-09-15', name, retroactive: 1, sets: [{ reps: 99, weight: 5 }] });
    const splitId = h.database.createCustomSplitSync('Upper');
    const workoutId = h.database.addWorkoutToSplitSync(splitId, 'Upper Day');
    h.database.addExerciseToWorkoutSync(workoutId, h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get(name).id);
    h.store.setState({ isHydrated: true });
    assert.equal(h.store.getState().startWorkoutFromCustomWorkout(splitId, workoutId), true);
    assert.deepEqual(weightsOf(h), [80, 82.5, 85]);
    assert.equal(suggestionFor(h, 0).baselineKg, 80);
    const { findLastExercisePerformance } = h.load('@/store/workoutProgression');
    assert.deepEqual(findLastExercisePerformance(h.store.getState().sessions, name),
      h.database.readLastExerciseHistorySync(name));
    h.store.getState().discardWorkout();
    startPush(h);
    h.store.getState().appendExerciseToSession(name);
    assert.deepEqual(weightsOf(h, 2), [80, 82.5, 85]);
    h.store.getState().swapCurrentSessionExercise(2, 'Chest Dips');
    assert.equal(h.store.getState().currentSession.exercises[2].name, 'Chest Dips');
    h.store.getState().swapCurrentSessionExercise(2, name);
    assert.deepEqual(weightsOf(h, 2), [80, 82.5, 85]);
  } finally { h.sql.close(); }
});

test('Slice 3: first-ever exercise keeps template values and normal propagation', () => {
  const h = harness();
  try {
    const exercise = startPush(h);
    assert.deepEqual(exercise.sets.map((set) => [set.weight, set.valueOrigin]), [[999, 'template'], [999, 'template'], [999, 'template']]);
    assert.equal(suggestionFor(h, 0), null);
    h.store.getState().updateExerciseSet(0, 0, 8, 50);
    h.store.getState().toggleSetCompleted(0, 0);
    const next = h.store.getState().currentSession.exercises[0].sets[1];
    assert.deepEqual([next.weight, next.valueOrigin], [50.5, 'propagated']);
  } finally { h.sql.close(); }
});

test('Slice 3: kg and lb suggestions step in the exercise entry unit, not global Settings', () => {
  const h = harness();
  try {
    const { lbsToKg, formatWeight } = h.load('@/store/weightUnits');
    h.store.getState().updateProfile({ weightIncrement: 2.5, weightIncrementLbs: 5 });
    insertHistory(h, { date: '2026-09-14', entryUnit: 'lbs', sets: [
      { reps: 10, weight: lbsToKg(180), targetReps: 10 }, { reps: 10, weight: 60, targetReps: 10 }, { reps: 10, weight: 70, targetReps: 10 },
    ] });
    startPush(h);
    let suggestion = suggestionFor(h, 1);
    assert.deepEqual([suggestion.unit, suggestion.increment, suggestion.suggestedKg], ['kg', 2.5, 62.5]);
    // Settings stay kg; this exercise is logged in lbs.
    changeEntryUnit(h, 0, 'lbs');
    assert.equal(h.store.getState().profile.weightUnit, 'kg');
    suggestion = suggestionFor(h, 0);
    assert.deepEqual([suggestion.unit, suggestion.increment], ['lbs', 5]);
    assert.ok(Math.abs(suggestion.suggestedKg - lbsToKg(185)) < 1e-9);
    assert.equal(formatWeight(suggestion.baselineKg, 'lbs'), '180');
    assert.equal(formatWeight(suggestion.suggestedKg, 'lbs'), '185');
    // The lb step lands on clean lb values, never kg-derived drift.
    assert.equal(formatWeight(suggestionFor(h, 1).suggestedKg, 'lbs'), '137.3');
    assert.equal(h.store.getState().currentSession.exercises[0].sets[0].weight, lbsToKg(180));
  } finally { h.sql.close(); }
});

test('Slice 3: accepting uses the validated absolute edit; Live Activity shows the baseline until then', () => {
  const h = actionHarness();
  try {
    h.store.getState().updateProfile({ weightIncrement: 2.5 });
    insertHistory(h, { date: '2026-09-14', sets: pyramid });
    startPush(h);
    const suggestion = suggestionFor(h, 0);
    assert.equal(suggestion.suggestedKg, 62.5);
    const before = interactive(h);
    assert.equal(before.weight, '60');
    assert.equal(h.load('@/services/liveActivity/state').deriveWorkoutLiveActivityState(h.store.getState()).weight, '60');
    const edit = h.store.getState().getSetEditTarget();
    h.act('completeSet');
    // A target captured before the set advanced is stale and cannot be accepted.
    assert.equal(h.store.getState().applySetValueAction(edit, 'setWeight', suggestion.suggestedKg).status, 'stale');
    assert.deepEqual(weightsOf(h), [60, 65, 70]);
    const next = suggestionFor(h, 1);
    assert.equal(next.suggestedKg, 67.5);
    assert.equal(h.store.getState().applySetValueAction(h.store.getState().getSetEditTarget(), 'setWeight', next.suggestedKg).status, 'applied');
    const accepted = h.store.getState().currentSession.exercises[0].sets[1];
    assert.deepEqual([accepted.weight, accepted.valueOrigin, accepted.completed], [67.5, 'user', false]);
    assert.equal(suggestionFor(h, 1), null);
    assert.equal(interactive(h).weight, '67.5');
    assert.deepEqual(weightsOf(h), [60, 67.5, 70]);
  } finally { h.sql.close(); }
});

test('Slice 3: suggestions never write SQLite or count as performed volume, records or Build evidence', () => {
  const h = harness();
  try {
    h.store.getState().updateProfile({ weightIncrement: 2.5 });
    insertHistory(h, { date: '2026-09-14', sets: pyramid });
    startPush(h);
    const changes = h.sql.prepare('SELECT total_changes() AS count').get().count;
    for (const index of [0, 1, 2]) suggestionFor(h, index);
    assert.equal(h.sql.prepare('SELECT total_changes() AS count').get().count, changes);
    // Repeat last time exactly (70 × 8), so no record can come from performance.
    h.store.getState().updateExerciseSet(0, 2, 8, 70);
    for (const index of [0, 1, 2]) h.store.getState().toggleSetCompleted(0, index);
    h.store.getState().toggleSetSkipped(1, 0);
    h.store.getState().toggleSetSkipped(1, 1);
    h.store.getState().toggleSetSkipped(1, 2);
    const completed = h.store.getState().completeWorkout('medium');
    assert.deepEqual(completed.exercises[0].sets.map((set) => set.weight), [60, 65, 70]);
    const saved = h.database.readCompletedSessionsSync().find((session) => session.id === completed.id);
    assert.deepEqual(saved.exercises[0].sets.map((set) => set.weight), [60, 65, 70]);
    const { adaptBuildHistory } = h.load('@/features/build/adapter');
    const piece = adaptBuildHistory(h.database.readCompletedSessionsSync(), new Clock()).state.pieces
      .find((item) => item.sessionId === completed.id);
    assert.ok(piece);
    assert.equal(piece.records.length, 0);
    const metrics = adaptBuildHistory([saved], new Clock()).state.metrics;
    assert.equal(metrics.volumeKg, 10 * 60 + 10 * 65 + 8 * 70);
  } finally { h.sql.close(); }
});

// ---------------------------------------------------------------------------
// Slice 4: exercise measurement (load type × metric)
// ---------------------------------------------------------------------------

const appendAndFocus = (h, name) => {
  h.store.getState().appendExerciseToSession(name);
  const index = h.store.getState().currentSession.exercises.findIndex((exercise) => exercise.name === name);
  h.store.getState().setWorkoutExerciseIndex(index);
  return index;
};
const exerciseRow = (h, index) => ({ ...h.sql.prepare(
  `SELECT se.load_type, se.metric FROM session_exercises se JOIN sessions s ON s.id = se.session_id
   WHERE s.completed = 0 AND se.position = ?`).get(index) });
const setRows = (h, index) => h.sql.prepare(
  `SELECT st.reps, st.weight, st.duration_s, st.target_reps, st.target_duration_s, st.value_origin
   FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id JOIN sessions s ON s.id = se.session_id
   WHERE s.completed = 0 AND se.position = ? ORDER BY st.set_index`).all(index).map((row) => ({ ...row }));
// Value actions are refused until the store is hydrated, exactly as in the app.
const hydratedHarness = (options) => {
  const h = harness(options);
  h.store.setState({ isHydrated: true });
  return h;
};
const target = (h, exerciseIndex, setIndex) => ({ ...h.database.readCurrentSetTarget(exerciseIndex, setIndex), completed: false });

test('catalog: rep exercises default to reps; only reviewed holds and carries are timed; Plank alone is legacy seconds', () => {
  const h = hydratedHarness();
  try {
    const timed = h.database.EXERCISE_SEEDS.filter((seed) => seed.metric === 'duration')
      .map((seed) => [seed.name, seed.loadType]);
    assert.deepEqual(timed, [
      ['Plank', 'bodyweight'], ['Side Plank', 'bodyweight'], ['Hollow Body Hold', 'bodyweight'],
      ['Suitcase Carry', 'external_weight'], ['Farmer Carry', 'external_weight'],
    ]);
    assert.deepEqual(h.database.LEGACY_SECONDS_EXERCISES, ['Plank']);
    const catalog = new Map(h.database.readExerciseCatalogSync().map((item) => [item.name, item]));
    for (const name of ['Bench Press', 'Push-ups', 'Crunches', 'Dead Bug', 'Mountain Climbers', 'Weighted Sit-Up']) {
      assert.equal(catalog.get(name).metric, 'reps', name);
    }
    assert.equal(catalog.get('Plank').metric, 'duration');
    // The shipped template target is seconds, not reps.
    const plank = h.database.SPLIT_TEMPLATE_SEEDS.find((seed) => seed.name === 'Plank');
    assert.deepEqual([plank.targetReps, plank.targetDurationS], [0, 60]);
    h.database.resetWorkoutDatabase();
    const core = h.database.readSplitTemplatesSync().core.find((exercise) => exercise.name === 'Plank');
    assert.equal(core.metric, 'duration');
    assert.deepEqual(core.sets.map((set) => [set.reps, set.durationS]), [[0, 60], [0, 60], [0, 60]]);
  } finally { h.sql.close(); }
});

test('real v16 schema: Plank seconds move out of reps (history, active and template); everything else is untouched; idempotent', async () => {
  const schema = fs.readFileSync(path.join(root, 'tests/fixtures/workout-v16.sql'), 'utf8');
  const h = harness({ schema });
  try {
    assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 16);
    const id = (name) => h.sql.prepare('SELECT id FROM exercises WHERE name = ?').get(name).id;
    const custom = h.adapter.runSync("INSERT INTO exercises (name, workout_type, primary_muscle, is_custom, equipment, load_type) VALUES ('Wall Sit Hold', 'legs', 'Legs', 1, 'Machine', 'bodyweight')").lastInsertRowId;
    h.adapter.runSync('INSERT INTO split_templates (workout_type, exercise_id, position, target_reps, target_weight) VALUES (?, ?, 0, 60, 0)', 'core', id('Plank'));
    h.adapter.runSync('INSERT INTO split_templates (workout_type, exercise_id, position, target_reps, target_weight) VALUES (?, ?, 0, 8, 40)', 'chest', id('Bench Press'));
    const addSession = (date, completed, exercises) => {
      const sessionId = h.adapter.runSync('INSERT INTO sessions (date, completed, completed_at) VALUES (?, ?, NULL)', date, completed).lastInsertRowId;
      h.adapter.runSync("INSERT INTO session_workout_types (session_id, workout_type, position) VALUES (?, 'core', 0)", sessionId);
      exercises.forEach(([exerciseId, sets], position) => {
        const seId = h.adapter.runSync("INSERT INTO session_exercises (session_id, exercise_id, position, entry_unit) VALUES (?, ?, ?, 'kg')", sessionId, exerciseId, position).lastInsertRowId;
        sets.forEach(([reps, weight, targetReps, bonus], setIndex) => h.adapter.runSync(
          "INSERT INTO sets (session_exercise_id, set_index, reps, weight, target_reps, target_weight, completed, bonus_type, value_origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')",
          seId, setIndex, reps, weight, targetReps, weight, completed, bonus ?? null));
      });
      return sessionId;
    };
    addSession('2026-09-14T10:00:00.000Z', 1, [
      [id('Plank'), [[60, 0, 60], [60, 0, 60], [45, 0, 60], [30, 0, null, 'extra']]],
      [id('Bench Press'), [[8, 80, 8]]],
      [id('Side Plank'), [[10, 0, 10]]],
      [custom, [[30, 0, 30]]],
    ]);
    addSession('2026-09-16T10:00:00.000Z', 0, [[id('Plank'), [[60, 0, 60], [60, 0, 60]]]]);
    await h.database.testReopenDatabase();
    assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 18);

    const metric = Object.fromEntries(h.sql.prepare('SELECT name, metric FROM exercises').all().map((row) => [row.name, row.metric]));
    assert.deepEqual([metric.Plank, metric['Side Plank'], metric['Bench Press'], metric['Wall Sit Hold']], ['duration', 'duration', 'reps', 'reps']);
    const snapshot = h.sql.prepare('SELECT e.name, se.session_id, se.load_type, se.metric FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id ORDER BY se.id').all()
      .map((row) => [row.name, row.load_type, row.metric]);
    assert.deepEqual(snapshot, [
      ['Plank', 'bodyweight', 'duration'], ['Bench Press', 'external_weight', 'reps'],
      // No seeded target gave these reps a seconds meaning: they stay as recorded.
      ['Side Plank', 'bodyweight', 'reps'], ['Wall Sit Hold', 'bodyweight', 'reps'],
      ['Plank', 'bodyweight', 'duration'],
    ]);
    const sets = h.sql.prepare('SELECT reps, duration_s, target_reps, target_duration_s, weight, bonus_type FROM sets ORDER BY id').all()
      .map((row) => [row.reps, row.duration_s, row.target_reps, row.target_duration_s]);
    assert.deepEqual(sets, [
      [0, 60, null, 60], [0, 60, null, 60], [0, 45, null, 60], [0, 30, null, null],
      [8, null, 8, null], [10, null, 10, null], [30, null, 30, null],
      [0, 60, null, 60], [0, 60, null, 60],
    ]);
    assert.deepEqual(h.sql.prepare('SELECT target_reps, target_duration_s FROM split_templates ORDER BY id').all()
      .map((row) => [row.target_reps, row.target_duration_s]), [[0, 60], [8, null]]);

    const history = h.database.readCompletedSessionsSync()[0];
    const plank = history.exercises[0];
    assert.equal(plank.metric, 'duration');
    assert.deepEqual(plank.sets.map((set) => [set.reps, set.durationS, set.targetDurationS]), [[0, 60, 60], [0, 60, 60], [0, 45, 60], [0, 30, undefined]]);
    assert.ok(plank.sets.every((set) => set.targetReps === undefined));
    const { deriveWorkoutSummary, formatExerciseRecap } = h.load('@/store/workoutSummary');
    const summary = deriveWorkoutSummary(history);
    assert.equal(formatExerciseRecap(summary.exercises[0], 'kg').scheme, '1:00 · 1:00 · 0:45 · 0:30');
    assert.equal(summary.repCount, 8 + 10 + 30);
    assert.equal(h.database.testReadCurrentSessionSync().exercises[0].sets[0].durationS, 60);

    const tables = ['exercises', 'session_exercises', 'sets', 'split_templates', 'archetype_templates', 'sessions'];
    const dump = () => tables.map((table) => h.sql.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    const migrated = dump();
    await h.database.testReopenDatabase();
    await h.database.testReopenDatabase();
    assert.deepEqual(dump(), migrated);
    assert.equal(h.sql.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { h.sql.close(); }
});

test('session snapshot keeps a timed workout timed even if the catalog row changes afterwards', () => {
  const h = hydratedHarness();
  try {
    h.store.getState().startWorkoutFromArchetype(['push']);
    const index = appendAndFocus(h, 'Plank');
    assert.deepEqual(exerciseRow(h, index), { load_type: 'bodyweight', metric: 'duration' });
    h.store.getState().applySetValueAction(target(h, index, 0), 'setDuration', 75);
    h.store.getState().toggleSetCompleted(index, 0);
    const completed = h.store.getState().completeWorkout('medium');
    h.sql.exec("UPDATE exercises SET metric = 'reps', load_type = 'external_weight' WHERE name = 'Plank'");
    const stored = h.database.readCompletedSessionsSync().find((session) => session.id === completed.id)
      .exercises.find((exercise) => exercise.name === 'Plank');
    assert.equal(stored.metric, 'duration');
    assert.equal(stored.loadType, 'bodyweight');
    assert.equal(stored.sets[0].durationS, 75);
    assert.equal(stored.sets[0].reps, 0);
  } finally { h.sql.close(); }
});

test('the four measurement combinations persist only their own values', () => {
  const h = hydratedHarness();
  try {
    h.store.getState().startWorkoutFromArchetype(['push']);
    // Weight + reps (Bench-style lift from the template) is unchanged.
    assert.deepEqual(exerciseRow(h, 0), { load_type: 'external_weight', metric: 'reps' });
    assert.ok(setRows(h, 0).every((row) => row.duration_s === null && row.target_duration_s === null && row.reps > 0));

    const pushUps = appendAndFocus(h, 'Push-ups');
    assert.deepEqual(exerciseRow(h, pushUps), { load_type: 'bodyweight', metric: 'reps' });
    assert.equal(h.store.getState().applySetValueAction(target(h, pushUps, 0), 'setWeight', 20).status, 'unavailable');
    assert.equal(h.store.getState().applySetValueAction(target(h, pushUps, 0), 'setDuration', 30).status, 'unavailable');
    assert.equal(h.store.getState().applySetValueAction(target(h, pushUps, 0), 'setReps', 20).status, 'applied');
    assert.deepEqual(setRows(h, pushUps)[0], { reps: 20, weight: 0, duration_s: null, target_reps: 8, target_duration_s: null, value_origin: 'user' });

    const plank = appendAndFocus(h, 'Plank');
    const plankSets = h.store.getState().currentSession.exercises[plank].sets;
    // No Plank split template in this harness: first time is the 0:30 default.
    assert.deepEqual(plankSets.map((set) => [set.reps, set.durationS, set.targetDurationS, set.valueOrigin]),
      [[0, 30, 30, 'template'], [0, 30, 30, 'template'], [0, 30, 30, 'template']]);
    for (const action of ['setReps', 'increaseReps', 'decreaseReps', 'setWeight']) {
      assert.equal(h.store.getState().applySetValueAction(target(h, plank, 0), action, 60).status, 'unavailable', action);
    }
    assert.equal(h.store.getState().applySetValueAction(target(h, plank, 0), 'setDuration', 60).status, 'applied');
    assert.equal(h.store.getState().applySetValueAction(target(h, plank, 0), 'increaseDuration').status, 'applied');
    assert.deepEqual(setRows(h, plank)[0], { reps: 0, weight: 0, duration_s: 65, target_reps: null, target_duration_s: 30, value_origin: 'user' });
    assert.equal(h.store.getState().applySetValueAction(target(h, plank, 0), 'setDuration', 0).status, 'failed');
    assert.equal(h.store.getState().applySetValueAction(target(h, plank, 0), 'setDuration', 6000).status, 'failed');
    h.store.getState().applySetValueAction(target(h, plank, 0), 'setDuration', 3);
    h.store.getState().applySetValueAction(target(h, plank, 0), 'decreaseDuration');
    assert.equal(h.store.getState().currentSession.exercises[plank].sets[0].durationS, 1);

    const carry = appendAndFocus(h, 'Farmer Carry');
    assert.deepEqual(exerciseRow(h, carry), { load_type: 'external_weight', metric: 'duration' });
    assert.equal(h.store.getState().applySetValueAction(target(h, carry, 0), 'setWeight', 30).status, 'applied');
    assert.equal(h.store.getState().applySetValueAction(target(h, carry, 0), 'setDuration', 45).status, 'applied');
    assert.deepEqual(setRows(h, carry)[0], { reps: 0, weight: 30, duration_s: 45, target_reps: null, target_duration_s: 30, value_origin: 'user' });
    const memory = h.store.getState().currentSession.exercises[carry].sets[0];
    assert.deepEqual([memory.weight, memory.durationS, memory.reps], [30, 45, 0]);
    assert.deepEqual(h.database.testReadCurrentSessionSync().exercises[carry].sets[0].durationS, 45);
  } finally { h.sql.close(); }
});

test('timed history preloads exactly as held, positionally, with history origin and no Try suggestion', () => {
  const h = hydratedHarness();
  try {
    h.store.getState().startWorkoutFromArchetype(['push']);
    const plank = appendAndFocus(h, 'Plank');
    [60, 45, 70].forEach((seconds, setIndex) => {
      h.store.getState().applySetValueAction(target(h, plank, setIndex), 'setDuration', seconds);
      h.store.getState().toggleSetCompleted(plank, setIndex);
    });
    h.store.getState().completeWorkout('medium');
    h.store.setState({ sessions: h.database.readCompletedSessionsSync() });

    h.store.getState().startWorkoutFromArchetype(['push']);
    const next = appendAndFocus(h, 'Plank');
    const exercise = h.store.getState().currentSession.exercises[next];
    assert.deepEqual(exercise.sets.map((set) => [set.durationS, set.targetDurationS, set.valueOrigin, set.reps]),
      [[60, 60, 'history', 0], [45, 45, 'history', 0], [70, 70, 'history', 0]]);
    const { getSetProgressionSuggestion } = h.load('@/store/workoutProgression');
    for (let setIndex = 0; setIndex < 3; setIndex++) {
      assert.equal(getSetProgressionSuggestion(h.store.getState().sessions, exercise, setIndex, h.store.getState().profile), null);
    }

    // Completing an earlier timed set never overwrites history or user values.
    h.store.getState().updateExerciseSet(next, 2, 0, 0, 90);
    h.store.getState().toggleSetCompleted(next, 0);
    h.store.getState().toggleSetCompleted(next, 1);
    assert.deepEqual(h.store.getState().currentSession.exercises[next].sets.map((set) => [set.durationS, set.valueOrigin]),
      [[60, 'history'], [45, 'history'], [90, 'user']]);
    assert.deepEqual(setRows(h, next).map((row) => row.duration_s), [60, 45, 90]);
  } finally { h.sql.close(); }
});

test('rep history never seeds a timed exercise, and timed history never seeds reps', () => {
  const h = hydratedHarness();
  try {
    const { createSessionExercise } = h.load('@/store/workoutProgression');
    const profile = h.store.getState().profile;
    const timedTemplate = { name: 'Side Plank', loadType: 'bodyweight', metric: 'duration', sets: [{ reps: 0, weight: 0, durationS: 40 }] };
    const repHistory = { name: 'Side Plank', loadType: 'bodyweight', metric: 'reps', sets: [{ reps: 10, weight: 0, targetReps: 10, completed: true }] };
    const fromReps = createSessionExercise(timedTemplate, repHistory, profile);
    assert.deepEqual([fromReps.sets[0].durationS, fromReps.sets[0].reps, fromReps.sets[0].valueOrigin], [40, 0, 'template']);
    const repTemplate = { name: 'Crunches', loadType: 'bodyweight', metric: 'reps', sets: [{ reps: 20, weight: 0 }] };
    const timedHistory = { name: 'Crunches', loadType: 'bodyweight', metric: 'duration', sets: [{ reps: 0, weight: 0, durationS: 60, completed: true }] };
    const fromTimed = createSessionExercise(repTemplate, timedHistory, profile);
    assert.deepEqual([fromTimed.sets[0].reps, fromTimed.sets[0].durationS, fromTimed.sets[0].valueOrigin], [20, undefined, 'template']);
  } finally { h.sql.close(); }
});

test('timed propagation repeats the completed set into automatic values only, with no weight increase', () => {
  const h = hydratedHarness();
  try {
    h.store.getState().updateProfile({ autoIncreaseWeight: true, weightIncrement: 2.5 });
    h.store.getState().startWorkoutFromArchetype(['push']);
    const carry = appendAndFocus(h, 'Farmer Carry');
    h.store.getState().applySetValueAction(target(h, carry, 0), 'setWeight', 30);
    h.store.getState().applySetValueAction(target(h, carry, 0), 'setDuration', 50);
    h.store.getState().updateExerciseSet(carry, 2, 0, 0, 20);
    h.store.getState().toggleSetCompleted(carry, 0);
    const sets = () => h.store.getState().currentSession.exercises[carry].sets.map((set) => [set.weight, set.durationS, set.valueOrigin]);
    assert.deepEqual(sets(), [[30, 50, 'user'], [30, 50, 'propagated'], [0, 20, 'user']]);
    h.store.getState().toggleSetCompleted(carry, 1);
    assert.deepEqual(sets()[2], [0, 20, 'user']);
    assert.deepEqual(setRows(h, carry).map((row) => [row.weight, row.duration_s, row.target_duration_s]), [[30, 50, 30], [30, 50, 50], [0, 20, 30]]);
  } finally { h.sql.close(); }
});

test('timed bonus sets store seconds, never reps', () => {
  const h = hydratedHarness();
  try {
    h.store.getState().startWorkoutFromArchetype(['push']);
    const plank = appendAndFocus(h, 'Plank');
    h.store.getState().appendBonusSet(plank, 'extra', 12, 0, 40);
    const row = setRows(h, plank)[3];
    assert.deepEqual([row.reps, row.duration_s], [0, 40]);
    const bench = 0;
    h.store.getState().appendBonusSet(bench, 'extra', 6, 50, 40);
    assert.deepEqual([setRows(h, bench).at(-1).reps, setRows(h, bench).at(-1).duration_s], [6, null]);
  } finally { h.sql.close(); }
});

test('Live Activity: timed exercises expose TIME only (or WEIGHT + TIME) and the widget matches the store', () => {
  const h = actionHarness();
  try {
    const plank = appendAndFocus(h, 'Plank');
    h.store.getState().applySetValueAction(target(h, plank, 0), 'setDuration', 60);
    let local = interactive(h);
    assert.equal(local.metric, 'duration');
    assert.equal(local.duration, '1:00');
    assert.equal('reps' in local, false);
    assert.equal(local.unit, '');
    assert.deepEqual(Object.keys(local.actions).sort(), ['completeSet', 'decreaseDuration', 'increaseDuration']);
    assert.deepEqual([local.interaction.durationS, local.interaction.durationStepS], [60, 5]);
    for (const expected of ['1:05', '1:10']) {
      h.enqueue('increaseDuration', undefined, { target: local.actionTarget + 'increaseDuration' });
      local = press(local, 'increaseDuration');
      assert.equal(local.duration, expected);
    }
    // A rep command cannot edit seconds, even with a valid target.
    h.enqueue('increaseReps', undefined, { target: local.actionTarget + 'increaseReps' });
    h.drain();
    assert.equal(h.active().durationS, 70);
    assert.equal(interactive(h).duration, local.duration);
    h.act('decreaseDuration', undefined, { target: interactive(h).actionTarget + 'decreaseDuration' });
    assert.equal(h.active().durationS, 65);
    // Done previews the next set holding the same duration, then commits it.
    local = interactive(h);
    h.enqueue('completeSet', undefined, { target: local.actionTarget + 'completeSet' });
    local = press(local, 'completeSet');
    assert.deepEqual([local.setNumber, local.duration], [2, '1:05']);
    h.drain();
    assert.deepEqual([interactive(h).setNumber, interactive(h).duration], [local.setNumber, local.duration]);

    const carry = appendAndFocus(h, 'Farmer Carry');
    h.store.getState().applySetValueAction(target(h, carry, 0), 'setWeight', 30);
    const weighted = interactive(h);
    assert.deepEqual([weighted.weight, weighted.unit, weighted.duration], ['30', 'kg', '0:30']);
    assert.deepEqual(Object.keys(weighted.actions).sort(),
      ['completeSet', 'decreaseDuration', 'decreaseWeight', 'increaseDuration', 'increaseWeight']);
    assert.ok(Buffer.byteLength(JSON.stringify(weighted)) < 4096);
    assert.deepEqual(h.errors, []);
  } finally { h.sql.close(); }
});

test('custom exercises choose load and measure; timed customs log time and snapshot their measurement', () => {
  const h = hydratedHarness();
  try {
    const hold = h.store.getState().createCustomExercise('Wall Sit Hold', 'legs', 'Legs', 'Machine', 'bodyweight', 'duration');
    const sled = h.store.getState().createCustomExercise('Sled Hold', 'core', 'Core', 'Machine', 'external_weight', 'duration');
    const legacyDefault = h.store.getState().createCustomExercise('Plain Lift', 'chest', 'Chest', 'Cable');
    const catalog = new Map(h.database.readExerciseCatalogSync().map((item) => [item.id, item]));
    assert.deepEqual([catalog.get(hold).loadType, catalog.get(hold).metric], ['bodyweight', 'duration']);
    assert.deepEqual([catalog.get(sled).loadType, catalog.get(sled).metric], ['external_weight', 'duration']);
    assert.deepEqual([catalog.get(legacyDefault).loadType, catalog.get(legacyDefault).metric], ['external_weight', 'reps']);
    assert.throws(() => h.database.createCustomExerciseSync('Bad', 'core', 'Core', 'Cable', 'external_weight', 'distance'));

    h.store.getState().startWorkoutFromArchetype(['push']);
    const holdIndex = appendAndFocus(h, 'Wall Sit Hold');
    const sledIndex = appendAndFocus(h, 'Sled Hold');
    assert.deepEqual(exerciseRow(h, holdIndex), { load_type: 'bodyweight', metric: 'duration' });
    assert.deepEqual(exerciseRow(h, sledIndex), { load_type: 'external_weight', metric: 'duration' });
    assert.deepEqual(setRows(h, holdIndex)[0], { reps: 0, weight: 0, duration_s: 30, target_reps: null, target_duration_s: 30, value_origin: 'template' });
    // Built-in reconciliation never touches a custom exercise's measurement.
    h.sql.exec("UPDATE exercises SET name = name WHERE is_custom = 1");
    assert.equal(h.database.readExerciseMeasurementSync('Wall Sit Hold').metric, 'duration');
  } finally { h.sql.close(); }
});

test('weekly volume trend ignores timed sets', () => {
  const h = hydratedHarness();
  try {
    h.store.getState().startWorkoutFromArchetype(['push']);
    const carry = appendAndFocus(h, 'Farmer Carry');
    h.store.getState().applySetValueAction(target(h, carry, 0), 'setWeight', 40);
    h.store.getState().applySetValueAction(target(h, carry, 0), 'setDuration', 60);
    h.store.getState().toggleSetCompleted(carry, 0);
    h.store.getState().completeWorkout('medium');
    const trend = h.store.getState().getWeeklyVolumeTrend(1);
    assert.equal(trend[0].volume, 0);
  } finally { h.sql.close(); }
});

// Build on the Go — finalized v17 measurement baseline, origin migration v18.
function adhocHarness() {
  const h = harness();
  h.sql.exec('PRAGMA user_version = 18');
  h.store.setState({ isHydrated: true });
  assert.equal(h.store.getState().startEmptyWorkout(), true);
  return h;
}
async function reloadAdhoc(h) {
  await h.database.testReopenDatabase();
  h.store.setState({ ...(await h.database.readInitialWorkoutSnapshot()), selectedSet: null, isHydrated: true });
  h.store.setState({ workoutFocus: h.database.readCurrentWorkoutFocusSync() });
}
const addAdhoc = (h, name) => assert.equal(h.store.getState().appendExerciseToSession(name, h.store.getState().currentSession.id), true);
const performAdhoc = (h, index = 0) => h.store.getState().toggleSetCompleted(index, 0);

test('Adhoc: v17 origin migration conservatively backfills custom/archetype/legacy and survives reopen', async () => {
  const h = harness({ schema: fs.readFileSync(path.join(root, 'tests/fixtures/workout-v17.sql'), 'utf8') });
  try {
    h.sql.exec(`INSERT INTO sessions (date, completed, custom_split_id) VALUES ('2026-09-14', 1, 99);
      INSERT INTO sessions (date, completed, archetype) VALUES ('2026-09-14', 1, 'push');
      INSERT INTO sessions (date, completed) VALUES ('2026-09-14', 1);
      INSERT INTO sessions (date, completed, secondary_archetype_variant) VALUES ('2026-09-14', 0, 'b');`);
    await reloadAdhoc(h);
    assert.equal(h.sql.prepare('PRAGMA user_version').get().user_version, 18);
    assert.deepEqual(h.sql.prepare('SELECT origin FROM sessions ORDER BY id').all().map(r => r.origin), ['custom', 'archetype', 'legacy', 'archetype']);
    const snapshot = h.sql.prepare('SELECT * FROM sessions ORDER BY id').all();
    await reloadAdhoc(h);
    assert.deepEqual(h.sql.prepare('SELECT * FROM sessions ORDER BY id').all(), snapshot);
    assert.equal(h.store.getState().currentSession.origin, 'archetype');
  } finally { h.sql.close(); }
});

test('Adhoc: empty start has no fabricated children or provenance; relaunch preserves ID/date/focus', async () => {
  const h = adhocHarness();
  try {
    const before = h.store.getState().currentSession;
    assert.equal(before.origin, 'adhoc');
    for (const key of ['archetype', 'secondaryArchetype', 'archetypeVariant', 'secondaryArchetypeVariant', 'customSplitId', 'customSplitWorkoutId', 'completedAt']) assert.equal(before[key], null);
    assert.equal(before.completed, false);
    assert.deepEqual(before.exercises, []);
    assert.deepEqual(before.workoutTypes, []);
    assert.equal(h.store.getState().workoutFocus, null);
    assert.equal(h.store.getState().getActiveSetTarget(), null);
    for (const table of ['session_exercises','session_workout_types','sets']) assert.equal(h.sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
    await reloadAdhoc(h);
    assert.deepEqual(h.store.getState().currentSession, before);
    assert.equal(h.store.getState().workoutFocus, null);
    assert.equal(h.load('@/services/liveActivity/state').deriveWorkoutLiveActivityState(h.store.getState()), null);
  } finally { h.sql.close(); }
});

test('Adhoc: starting empty resumes active work and start failure creates no phantom session', () => {
  const h = actionHarness();
  try {
    performAdhoc(h);
    const before = h.store.getState().currentSession;
    assert.equal(h.store.getState().startEmptyWorkout(), true);
    assert.deepEqual(h.store.getState().currentSession, before);
    h.store.getState().discardWorkout();
    h.sql.exec("CREATE TRIGGER fail_empty BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'fail start'); END;");
    assert.equal(h.store.getState().startEmptyWorkout(), false);
    assert.equal(h.store.getState().currentSession, null);
    assert.equal(h.sql.prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
  } finally { h.sql.close(); }
});

test('Adhoc: first and mixed-category appends persist focus, retain logged rows and use independent Settings units', async () => {
  const h = adhocHarness();
  try {
    addAdhoc(h, 'Bench Press');
    performAdhoc(h);
    const firstRows = h.sql.prepare('SELECT * FROM sets ORDER BY id').all();
    const oldTarget = h.store.getState().getActiveSetTarget();
    h.store.getState().selectWorkoutSet(0, 0);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    addAdhoc(h, 'Bicep Curls');
    addAdhoc(h, 'Plank');
    addAdhoc(h, 'Lat Pulldown');
    assert.deepEqual(h.store.getState().currentSession.workoutTypes, ['chest','arms','core','back']);
    assert.deepEqual(h.store.getState().currentSession.exercises.map(e => e.entryUnit), ['kg','lbs','lbs','lbs']);
    assert.equal(h.store.getState().selectedSet, null);
    assert.equal(h.store.getState().workoutFocus.exerciseIndex, 3);
    assert.deepEqual(h.sql.prepare('SELECT * FROM sets ORDER BY id LIMIT 3').all(), firstRows);
    assert.equal(h.store.getState().applyActiveSetAction(oldTarget, 'completeSet').status, 'stale');
    const before = h.store.getState().currentSession;
    await reloadAdhoc(h);
    assert.deepEqual(h.store.getState().currentSession, before);
    assert.equal(h.store.getState().workoutFocus.exerciseIndex, 3);
  } finally { h.sql.close(); }
});

test('Adhoc: append rollback preserves empty session and focus; duplicate is visibly rejected at store and SQL', () => {
  const h = adhocHarness();
  try {
    h.sql.exec("CREATE TRIGGER fail_append BEFORE INSERT ON sets BEGIN SELECT RAISE(ABORT, 'fail append'); END;");
    assert.equal(h.store.getState().appendExerciseToSession('Bench Press'), undefined);
    assert.deepEqual(h.database.testReadCurrentSessionSync().exercises, []);
    assert.equal(h.database.readCurrentWorkoutFocusSync(), null);
    h.sql.exec('DROP TRIGGER fail_append');
    addAdhoc(h, 'Bench Press');
    const before = h.database.testReadCurrentSessionSync();
    assert.equal(h.store.getState().appendExerciseToSession('Bench Press'), false);
    assert.equal(h.alerts.at(-1)[0], 'Already added');
    assert.throws(() => h.database.appendCurrentSessionExercise(before.exercises[0], before.id, true), /already/);
    assert.deepEqual(h.database.testReadCurrentSessionSync(), before);
    assert.equal(h.store.getState().appendExerciseToSession('Plank', 'stale-session'), false);
  } finally { h.sql.close(); }
});

for (const [name, loadType, metric] of [
  ['Bench Press', 'external_weight', 'reps'], ['Push-ups', 'bodyweight', 'reps'],
  ['Plank', 'bodyweight', 'duration'], ['Farmer Carry', 'external_weight', 'duration'],
]) test(`Adhoc: ${loadType} + ${metric} logs, reloads, completes, summarizes and casts`, async () => {
  const h = adhocHarness();
  try {
    // Resolve the rep-only catalog spelling without inferring any measurement semantics.
    const selected = name === 'Push-ups' ? h.database.EXERCISE_SEEDS.find(e => e.loadType === loadType && e.metric === metric).name : name;
    addAdhoc(h, selected);
    const exercise = h.store.getState().currentSession.exercises[0];
    assert.deepEqual([exercise.loadType, exercise.metric], [loadType, metric]);
    h.store.getState().updateExerciseSet(0, 0, metric === 'reps' ? 12 : 0, loadType === 'bodyweight' ? 0 : 50, metric === 'duration' ? 75 : undefined);
    performAdhoc(h);
    await reloadAdhoc(h);
    const completed = h.store.getState().completeWorkout('medium');
    assert.equal(completed.origin, 'adhoc');
    assert.ok(completed.completedAt);
    await reloadAdhoc(h);
    const saved = h.database.readCompletedSessionsSync()[0];
    assert.deepEqual(saved, completed);
    assert.equal(h.store.getState().currentSession, null);
    const summary = h.load('@/store/workoutSummary').deriveWorkoutSummary(saved);
    assert.equal(summary.setCount, 1);
    assert.match(summary.title, /^Workout · /);
    assert.equal(summary.repCount, metric === 'duration' ? 0 : 12);
    const build = h.load('@/features/build/adapter').adaptBuildHistory([saved], new Clock()).state;
    assert.equal(build.pieces.length, 1);
    assert.equal(build.metrics.workouts, 1);
    if (metric === 'duration') {
      assert.equal(summary.volumeKg, 0);
      assert.equal(build.metrics.volumeKg, 0);
      assert.equal(build.pieces[0].records.length, 0);
    }
    assert.equal(h.database.readLastExerciseHistorySync(selected).sets[0].completed, true);
  } finally { h.sql.close(); }
});

for (const scenario of ['empty','unlogged','all-skipped']) test(`Adhoc: ${scenario} completion is rejected by both store and database`, () => {
  const h = adhocHarness();
  try {
    if (scenario !== 'empty') addAdhoc(h, 'Plank');
    if (scenario === 'all-skipped') for (let index = 0; index < 3; index++) h.store.getState().toggleSetSkipped(0, index);
    assert.equal(h.store.getState().completeWorkout('easy'), undefined);
    assert.throws(() => h.database.completeCurrentSession('easy'), /non-skipped/);
    assert.throws(() => h.sql.exec('UPDATE sessions SET completed = 1 WHERE completed = 0'), /non-skipped/);
    assert.equal(h.database.testReadCurrentSessionSync().completedAt, null);
    assert.equal(h.database.readCompletedSessionsSync().length, 0);
  } finally { h.sql.close(); }
});

test('Adhoc: catalog-only custom creation supports all metrics without template writes', () => {
  const h = adhocHarness();
  try {
    const before = h.sql.prepare('SELECT * FROM split_templates').all();
    for (const loadType of ['bodyweight','external_weight']) for (const metric of ['reps','duration']) {
      const name = `Custom ${loadType} ${metric}`;
      assert.ok(h.store.getState().createCustomExercise(name, 'arms', 'Biceps', 'Other', loadType, metric));
      addAdhoc(h, name);
      const e = h.store.getState().currentSession.exercises.at(-1);
      assert.deepEqual([e.loadType,e.metric], [loadType,metric]);
    }
    assert.deepEqual(h.sql.prepare('SELECT * FROM split_templates').all(), before);
  } finally { h.sql.close(); }
});

test('Adhoc: automatic Push remains next across Arms completion and reload, while attendance counts', async () => {
  const h = adhocHarness();
  try {
    const queue = h.load('@/store/weeklyQueueEngine').getWeeklyQueueState;
    const before = queue();
    assert.deepEqual(before.nextUp, ['push']);
    addAdhoc(h, 'Bicep Curls'); performAdhoc(h);
    h.store.getState().completeWorkout('medium');
    assert.deepEqual(queue().remaining, before.remaining);
    assert.deepEqual(queue().nextUp, ['push']);
    assert.equal(queue().unknownCompletedCount, 0);
    assert.equal(queue().completedToday, true);
    assert.equal(h.store.getState().getWeeklyProgress().completed, 1);
    assert.equal(h.store.getState().getWeekStreak().reduce((sum, d) => sum + d.workouts, 0), 1);
    await reloadAdhoc(h);
    assert.deepEqual(queue().nextUp, ['push']);
    assert.deepEqual(queue().remaining, before.remaining);
    assert.equal(h.store.getState().getWeeklyProgress().completed, 1);
  } finally { h.sql.close(); }
});

test('Adhoc: custom Push stays next after Arms and reload without advancing source IDs', async () => {
  const h = adhocHarness();
  try {
    const split = h.database.createCustomSplitSync('Plan');
    const push = h.database.addWorkoutToSplitSync(split, 'Push');
    const pull = h.database.addWorkoutToSplitSync(split, 'Pull');
    h.store.getState().setActiveSplit(split);
    const next = () => h.load('@/store/customSplitRotation').resolveNextCustomWorkoutIndex([{ id: push },{ id: pull }],h.database.readLastCompletedCustomWorkoutIdSync(split));
    assert.equal(next(),0);
    addAdhoc(h,'Bicep Curls'); performAdhoc(h);
    h.store.getState().completeWorkout('medium');
    assert.equal(next(),0);
    await reloadAdhoc(h);
    assert.equal(next(),0);
    assert.equal(h.store.getState().profile.activeSplitId,split);
  } finally { h.sql.close(); }
});

test('Adhoc: save is structure-only, ordered, non-activating, repeated-tap safe and launches with global previous history', async () => {
  const h = adhocHarness();
  try {
    h.store.getState().updateProfile({ autoIncreaseWeight: false });
    const active = h.database.createCustomSplitSync('Existing plan');
    h.store.getState().setActiveSplit(active);
    addAdhoc(h,'Bench Press');
    h.store.getState().updateExerciseSet(0,0,12,61.25); performAdhoc(h);
    h.store.getState().appendBonusSet(0,'extra',99,100);
    addAdhoc(h,'Bicep Curls'); // unperformed: omit
    addAdhoc(h,'Plank');
    h.store.getState().updateExerciseSet(2,0,0,0,47); performAdhoc(h,2);
    const source = h.store.getState().completeWorkout('hard');
    const before = h.sql.prepare('SELECT * FROM sessions WHERE id = ?').get(source.id);
    const name = h.load('@/store/adhocWorkout').defaultAdhocRoutineName(source,h.database.readExerciseCatalogSync());
    assert.equal(name, 'Chest, Core');
    const id = h.store.getState().saveAdhocRoutine(source.id,'  My routine  ');
    assert.ok(id);
    assert.equal(h.store.getState().saveAdhocRoutine(source.id,'Ignored double tap'),id);
    await h.store.getState().refreshCustomSplits();
    assert.equal(h.store.getState().profile.activeSplitId,active);
    assert.equal(h.database.readProfileSync().activeSplitId,active);
    assert.deepEqual(h.sql.prepare('SELECT * FROM sessions WHERE id = ?').get(source.id),before);
    const split = await h.database.getCustomSplitDetailAsync(id);
    assert.equal(split.name,'My routine');
    assert.equal(split.workouts.length,1);
    assert.equal(split.workouts[0].name,'My routine');
    assert.deepEqual(split.workouts[0].exercises.map(e => e.name),['Bench Press','Plank']);
    assert.deepEqual(h.sql.prepare('PRAGMA table_info(custom_split_workout_exercises)').all().map(r => r.name), ['id','workout_id','exercise_id','position']);
    assert.equal(h.sql.prepare('SELECT count(*) AS n FROM custom_splits').get().n,2);
    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    assert.equal(h.store.getState().startWorkoutFromCustomWorkout(id,split.workouts[0].id),true);
    const launched = h.store.getState().currentSession;
    assert.equal(launched.origin,'custom');
    assert.deepEqual(launched.exercises.map(e => e.entryUnit),['lbs','lbs']);
    assert.equal(launched.exercises[0].sets[0].weight,61.25);
    assert.equal(launched.exercises[0].sets[0].reps,source.exercises[0].sets[0].targetReps);
    assert.equal(launched.exercises[1].sets[0].durationS,47);
    assert.equal(launched.exercises[0].sets[0].valueOrigin,'history');
    assert.equal(launched.exercises[0].sets.length,3);
    assert.equal(h.database.readCompletedSessionsSync()[0].origin,'adhoc');
    await reloadAdhoc(h);
    assert.equal(h.store.getState().profile.activeSplitId,active);
  } finally { h.sql.close(); }
});

test('Adhoc: save rollback leaves no partial graph, retry succeeds, invalid source/name rejected', async () => {
  const h = adhocHarness();
  try {
    const sourceId = h.store.getState().currentSession.id;
    assert.throws(() => h.database.saveAdhocRoutineSync(sourceId,'Workout'),/completed/);
    addAdhoc(h,'Bench Press'); performAdhoc(h); addAdhoc(h,'Plank'); performAdhoc(h,1);
    h.store.getState().completeWorkout('easy');
    h.sql.exec("CREATE TRIGGER fail_routine BEFORE INSERT ON custom_split_workout_exercises WHEN NEW.position = 1 BEGIN SELECT RAISE(ABORT, 'fail routine'); END;");
    assert.equal(h.store.getState().saveAdhocRoutine(sourceId,'Workout'),undefined);
    for (const table of ['custom_splits','custom_split_workouts','custom_split_workout_exercises']) assert.equal(h.sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n,0);
    assert.equal(h.store.getState().savedAdhocRoutineIds[sourceId],undefined);
    h.sql.exec('DROP TRIGGER fail_routine');
    assert.throws(() => h.database.saveAdhocRoutineSync(sourceId,'   '),/name/);
    assert.ok(h.store.getState().saveAdhocRoutine(sourceId,'Workout'));
    await h.store.getState().refreshCustomSplits();
    assert.equal(h.database.readCompletedSessionsSync()[0].origin,'adhoc');
  } finally { h.sql.close(); }
});

test('Adhoc: Live Activity last-set completion retains session; append invalidates stale target and inspection lease', () => {
  const h = actionHarness();
  try {
    h.store.getState().discardWorkout(); h.store.getState().startEmptyWorkout(); addAdhoc(h,'Bench Press');
    for (let i=0;i<3;i++) h.act('completeSet');
    assert.ok(h.store.getState().currentSession);
    assert.equal(h.applied.at(-1).result.completedExercise,true);
    const lastTarget = h.applied.at(-1).target;
    h.store.getState().selectWorkoutSet(0,0);
    const lease = h.store.getState().getSetEditTarget();
    addAdhoc(h,'Plank');
    const before = h.database.testReadCurrentSessionSync();
    h.act('completeSet',lastTarget);
    assert.equal(h.store.getState().applySetValueAction(lease,'setWeight',999).status,'stale');
    assert.deepEqual(h.database.testReadCurrentSessionSync(),before);
    assert.equal(h.store.getState().getActiveSetTarget().exerciseIndex,1);
    h.act('completeSet');
    assert.equal(h.database.testReadCurrentSessionSync().exercises[1].sets[0].completed,true);
  } finally { h.sql.close(); }
});

test('Adhoc: explicit discard removes empty or logged sessions and all child rows', () => {
  const h = adhocHarness();
  try {
    for (const populated of [false,true]) {
      if (populated) { h.store.getState().startEmptyWorkout(); addAdhoc(h,'Plank'); performAdhoc(h); }
      h.store.getState().discardWorkout();
      assert.equal(h.database.testReadCurrentSessionSync(),null);
      assert.equal(h.store.getState().workoutFocus,null);
      for (const table of ['sessions','session_exercises','session_workout_types','sets']) assert.equal(h.sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n,0);
    }
  } finally { h.sql.close(); }
});

test('Adhoc: mixed display stays neutral, precise routine name excludes skipped work, global history drives progression and eligible PRs', async () => {
  const h = adhocHarness();
  try {
    h.store.getState().updateProfile({ autoIncreaseWeight: false });
    addAdhoc(h,'Bench Press');
    h.store.getState().updateExerciseSet(0,0,10,50);performAdhoc(h);
    const first=h.store.getState().completeWorkout('medium');
    h.store.getState().startEmptyWorkout();addAdhoc(h,'Bench Press');
    assert.equal(h.store.getState().currentSession.exercises[0].sets[0].weight,50);
    assert.ok(suggestionFor(h,0));
    h.store.getState().updateExerciseSet(0,0,10,60);performAdhoc(h);
    addAdhoc(h,'Seated Dumbbell Shoulder Press');performAdhoc(h,1);
    addAdhoc(h,'Rope Triceps Pushdown');performAdhoc(h,2);
    addAdhoc(h,'Plank');h.store.getState().toggleSetSkipped(3,0);
    const completed=h.store.getState().completeWorkout('hard');
    assert.equal(h.load('@/store/adhocWorkout').defaultAdhocRoutineName(completed,h.database.readExerciseCatalogSync()),'Chest, Shoulders, Triceps');
    const display=h.load('@/constants/archetypes').getSessionWorkoutDisplay(completed);
    assert.equal(display.label,'Workout · Chest / Shoulders / Arms / Core');
    assert.equal(display.color,h.load('@/constants/theme').redesignColors.ash);
    assert.equal(completed.archetype,null);
    const summary=h.load('@/store/workoutSummary').deriveWorkoutSummary(completed);
    assert.equal(summary.title,display.label);assert.equal(summary.accent,display.color);
    const piece=h.load('@/features/build/adapter').adaptBuildHistory([first,completed],new Clock()).state.pieces.at(-1);
    assert.equal(piece.label,display.label);assert.equal(piece.color,display.color);
    assert.equal(piece.records.length,1);assert.equal(piece.records[0].exerciseName,'Bench Press');
    await reloadAdhoc(h);
    assert.equal(h.store.getState().sessions.length,2);
    assert.equal(h.load('@/store/workoutSummary').deriveWorkoutSummary(h.store.getState().sessions.at(-1)).title,display.label);
  } finally { h.sql.close(); }
});

// Integration checkpoint: Build on the Go composed with Slice 2 units, Slice 4
// measurement types, the Workout Report, Build history and Save as routine.
test('Integration: empty start → mixed-metric appends → finish → summary/report/history/Build → save, rotation untouched', async () => {
  const h = adhocHarness();
  try {
    const liveState = () => h.load('@/services/liveActivity/state').deriveWorkoutLiveActivityState(h.store.getState());
    const queue = h.load('@/store/weeklyQueueEngine').getWeeklyQueueState;
    const nextBefore = queue().nextUp;
    assert.equal(liveState(), null);

    addAdhoc(h, 'Bench Press');
    assert.ok(h.store.getState().updateExerciseSet(0, 0, 8, 60));
    performAdhoc(h);
    assert.ok(liveState());

    h.store.getState().updateProfile({ weightUnit: 'lbs' });
    addAdhoc(h, 'Farmer Carry');
    assert.ok(h.store.getState().updateExerciseSet(1, 0, 0, 40, 45));
    performAdhoc(h, 1);
    addAdhoc(h, 'Plank');
    h.store.getState().toggleSetSkipped(2, 0);
    const active = h.store.getState().currentSession;
    assert.deepEqual(active.exercises.map((e) => [e.entryUnit, e.loadType, e.metric]), [
      ['kg', 'external_weight', 'reps'], ['lbs', 'external_weight', 'duration'], ['lbs', 'bodyweight', 'duration'],
    ]);
    assert.equal(h.store.getState().workoutFocus.exerciseIndex, 2);

    await reloadAdhoc(h);
    assert.deepEqual(h.store.getState().currentSession, active);
    const completed = h.store.getState().completeWorkout('medium');
    assert.equal(completed.origin, 'adhoc');
    assert.ok(completed.completedAt);

    const summary = h.load('@/store/workoutSummary').deriveWorkoutSummary(completed);
    assert.equal(summary.volumeKg, 480);
    assert.equal(summary.repCount, 8);
    const history = h.database.readCompletedSessionsSync();
    const report = h.load('@/features/report/workoutReport').buildWorkoutReport(completed, { unit: 'lbs', history });
    assert.equal(report.unit, 'lbs');
    assert.equal(report.title, summary.title);
    assert.deepEqual(report.exercises.map((e) => e.measure), ['weight_reps', 'weight_duration', 'duration']);
    assert.match(report.exercises[1].sets[0].text, /^88(\.\d+)? lb.* · 0:45$/);
    assert.equal(report.exercises[1].volume, null);
    assert.equal(report.exercises[2].skipped, true);
    assert.ok(report.durationLabel !== undefined);

    assert.equal(history.length, 1);
    assert.equal(history[0].origin, 'adhoc');
    // A skipped set keeps its preloaded value but is never counted as performed.
    assert.deepEqual(history[0].exercises.map((e) => [e.entryUnit, e.metric, e.sets[0].durationS ?? null, e.sets[0].skipped === true]),
      [['kg', 'reps', null, false], ['lbs', 'duration', 45, false], ['lbs', 'duration', 30, true]]);
    const pieces = h.load('@/features/build/adapter').adaptBuildHistory(history, new Clock()).state.pieces;
    assert.equal(pieces.length, 1);
    assert.deepEqual(queue().nextUp, nextBefore);
    assert.equal(h.store.getState().getWeeklyProgress().completed, 1);

    const routineId = h.store.getState().saveAdhocRoutine(completed.id, 'Gym floor');
    assert.ok(routineId);
    assert.equal(h.database.readProfileSync().activeSplitId, null);
    assert.equal(h.database.readCompletedSessionsSync()[0].origin, 'adhoc');
    assert.deepEqual(queue().nextUp, nextBefore);
  } finally { h.sql.close(); }
});

test('Integration: a bodyweight duration-only ad-hoc session completes; an all-skipped one cannot', () => {
  const h = adhocHarness();
  try {
    addAdhoc(h, 'Plank');
    h.store.getState().toggleSetSkipped(0, 0);
    assert.equal(h.store.getState().completeWorkout('easy'), undefined);
    assert.equal(h.alerts.at(-1)[0], 'Log a set first');
    assert.ok(h.store.getState().currentSession);
    // The SQL guard rejects the same state even if a caller bypasses the store.
    assert.throws(() => h.sql.exec('UPDATE sessions SET completed = 1 WHERE completed = 0'), /non-skipped set/);

    addAdhoc(h, 'Hollow Body Hold');
    assert.ok(h.store.getState().updateExerciseSet(1, 0, 0, 0, 30));
    performAdhoc(h, 1);
    const completed = h.store.getState().completeWorkout('easy');
    assert.ok(completed);
    assert.equal(completed.exercises[1].sets[0].durationS, 30);
    assert.equal(h.load('@/store/workoutSummary').deriveWorkoutSummary(completed).volumeKg, 0);
  } finally { h.sql.close(); }
});
