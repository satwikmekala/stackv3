/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
function harness(mocks = {}) {
  const sql = new DatabaseSync(':memory:');
  const adapter = {
    getAllSync: (query, ...args) => sql.prepare(query).all(...args),
    getFirstSync: (query, ...args) => sql.prepare(query).get(...args) ?? null,
    runSync: (query, ...args) => { const r = sql.prepare(query).run(...args); return { ...r, lastInsertRowId: Number(r.lastInsertRowid) }; },
    withTransactionSync: fn => { sql.exec('BEGIN'); try { fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; } },
    execSync: query => sql.exec(query),
  };
  adapter.execAsync = async query => sql.exec(query);
  adapter.runAsync = async (...args) => adapter.runSync(...args);
  adapter.getAllAsync = async (...args) => adapter.getAllSync(...args);
  adapter.getFirstAsync = async (...args) => adapter.getFirstSync(...args);
  adapter.withTransactionAsync = async fn => { sql.exec('BEGIN'); try { await fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; } };
  const cache = new Map();
  const disk = new Map();
  function load(id) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === 'expo-sqlite') return { openDatabaseAsync: async () => adapter };
    if (id === 'react-native') return { Alert: { alert() {} } };
    if (id === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
      getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); }, removeItem: async key => { disk.delete(key); },
    } };
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const stem = path.join(root, id.slice(2));
    const file = fs.existsSync(stem + '.ts') ? stem + '.ts' : stem + '.tsx';
    let source = fs.readFileSync(file, 'utf8');
    if (id === '@/store/workoutDatabase') source += '\ndatabase = testDatabase; databasePromise = Promise.resolve(testDatabase); exports.testReopen = () => { database = null; databasePromise = null; return initializeWorkoutDatabase(); };';
    const exports = {}; cache.set(id, exports);
    const code = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    new Function('exports', 'require', 'testDatabase', '__DEV__', code)(exports, child => load(child.startsWith('.')
      ? path.posix.normalize(path.posix.join(path.posix.dirname(id), child)) : child), adapter, false);
    return exports;
  }
  const database = load('@/store/workoutDatabase');
  sql.exec(database.WORKOUT_DATABASE_SCHEMA);
  sql.exec(`PRAGMA user_version = ${database.CURRENT_SCHEMA_VERSION}`);
  for (const seed of database.EXERCISE_SEEDS) adapter.runSync('INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, load_type, metric) VALUES (?, ?, ?, ?, ?, ?)', seed.name, seed.workoutType, seed.primaryMuscle, seed.secondaryMuscle, seed.loadType, seed.metric);
  const plan = snapshot => load('@/features/import/hevy/importPlan').createHevyImportPlan(adapter, snapshot);
  const persist = snapshot => load('@/features/import/persistence').persistHevyImport(adapter, plan(snapshot));
  return { sql, adapter, database, load, plan, persist, disk };
}
module.exports = { harness };
