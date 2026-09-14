// Run with Node 22+: node --test tests/workoutPersistence.test.cjs
// Production store/actions and SQL, adapted to a disposable real SQLite database.
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
      load,
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
      'INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle) VALUES (?, ?, ?, ?)',
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle,
    );
  }
  // Seed deliberately conspicuous targets to expose any accidental fabrication.
  const lifts = sql.prepare('SELECT id, name FROM exercises LIMIT 2').all();
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
test('Legacy fabricated action still persists template-derived completed sets through its existing store API', () => {
  const h = harness();
  h.store.getState().logArchetypeCompletedRetroactively(['push'], '2026-09-15');
  const sets = h.sql.prepare('SELECT * FROM sets').all();
  assert.equal(sets.length, 6);
  assert.ok(
    sets.every((s) => s.reps === 99 && s.weight === 999 && s.completed === 1),
  );
  h.sql.close();
});

test('auto-increase setting gates only the successful-set weight bump', () => {
  const h = harness();
  const progression = h.load('@/store/workoutProgression');
  const template = { name: 'Bench Press', sets: [{ reps: 8, weight: 40 }] };
  const logged = {
    name: 'Bench Press',
    sets: [{ reps: 8, weight: 50, targetReps: 8, targetWeight: 50 }],
  };
  const profile = h.store.getState().profile;

  const enabled = progression.createSessionExercise(template, logged, profile);
  h.store.getState().updateProfile({ autoIncreaseWeight: false });
  const disabledProfile = h.store.getState().profile;
  const disabled = progression.createSessionExercise(template, logged, disabledProfile);

  assert.equal(enabled.sets[0].targetWeight, 50.5);
  assert.equal(disabled.sets[0].targetWeight, 50);
  assert.equal(h.sql.prepare('SELECT auto_increase_weight FROM profile').get().auto_increase_weight, 0);
  assert.equal(h.database.readProfileSync().autoIncreaseWeight, false);

  h.store.getState().updateProfile({ autoIncreaseWeight: true });
  assert.equal(h.sql.prepare('SELECT auto_increase_weight FROM profile').get().auto_increase_weight, 1);
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
