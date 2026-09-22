// Run with Node 22+: node --test tests/workoutPersistence.test.cjs
// Production store/actions and SQL, adapted to a disposable real SQLite database.
/* global __dirname */
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
      try {
        fn();
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  adapter.getAllAsync = async (...args) => adapter.getAllSync(...args);
  adapter.getFirstAsync = async (...args) => adapter.getFirstSync(...args);
  const cache = new Map();
  const alerts = [];
  function load(id) {
    if (id === 'expo-sqlite') return {};
    if (id === 'react-native')
      return { Alert: { alert: (...args) => alerts.push(args) } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const file = path.join(root, id.slice(2) + '.ts');
    let source = fs.readFileSync(file, 'utf8');
    if (id === '@/store/workoutDatabase')
      source +=
        '\ndatabase = testDatabase; databasePromise = Promise.resolve(testDatabase);';
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
  sql.exec(database.WORKOUT_DATABASE_SCHEMA);
  for (const seed of database.EXERCISE_SEEDS) {
    adapter.runSync(
      'INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, load_type) VALUES (?, ?, ?, ?, ?)',
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle,
      seed.loadType,
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

test('session progression is independent of Increase Between Sets', () => {
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

  assert.equal(enabled.sets[0].targetWeight, 50.5);
  assert.equal(disabled.sets[0].targetWeight, 50.5);
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
    nextSession.exercises.find((item) => item.name === exercise.name).sets[0].targetWeight,
    60.5,
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
      sets: [{ reps: 8, weight: 40, targetReps: 8, targetWeight: 40 }],
    }],
    completed: false,
    retroactive: false,
  });

  h.store.setState({ currentSession: makeCurrentSession() });
  h.store.getState().swapCurrentSessionExercise(0, replacementExercise.name);
  assert.equal(h.store.getState().currentSession.exercises[0].sets[0].targetWeight, 60.5);

  h.store.setState({ currentSession: makeCurrentSession() });
  h.store.getState().appendExerciseToSession(replacementExercise.name);
  assert.equal(h.store.getState().currentSession.exercises[1].sets[0].targetWeight, 60.5);
  h.sql.close();
});
