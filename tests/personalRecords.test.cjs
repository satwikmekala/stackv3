// Run with: node --test tests/personalRecords.test.cjs (Node 22+ for in-memory SQLite).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function declarations(file, names) {
  const text = source(file);
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).statements
    .filter((node) => names.includes(node.name?.text) || node.declarationList?.declarations.some((decl) => names.includes(decl.name.text)))
    .map((node) => node.getText()).join('\n');
}
function evaluate(text, requireModule = require, injected = {}) {
  const code = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', 'require', ...Object.keys(injected), code)(exports, requireModule, ...Object.values(injected));
  return exports;
}
const dates = evaluate(declarations('store/workoutStore.ts', ['parseSessionDate', 'toLocalCalendarDate']));
const verified = evaluate(source('store/verifiedSessions.ts'));
const theme = evaluate(source('constants/theme.ts'));
const records = evaluate(source('store/personalRecords.ts'), (id) => {
  if (id.endsWith('/workoutStore')) return dates;
  if (id.endsWith('/verifiedSessions')) return verified;
  if (id.endsWith('/theme')) return theme;
  throw new Error(`Unexpected dependency: ${id}`);
});
const set = (weight, reps, extra = {}) => ({ weight, reps, completed: true, ...extra });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false, ...extra });
const exercise = (name, ...sets) => ({ name, sets });
const fixtures = [
  session(1, '2026-09-01', [exercise('Cable Crunch', set(30, 12)), exercise('Bench Press', set(90, 5)), exercise('Overhead Press', set(50, 5))]),
  session(2, '2026-09-04', [exercise('Cable Crunch', set(25, 15), set(35, 10), set(35, 12), set(999, 1, { completed: false }), set(999, 1, { skipped: true }))]),
  session(3, '2026-09-11', [exercise('Cable Crunch', set(35, 12)), exercise('Custom Lift / A&B', set(0, 10)), exercise('Incline Dumbbell Press', set(30, 8))]),
  session(4, '2026-09-12', [exercise('Cable Crunch', set(300, 12)), exercise('Retro only', set(200, 10))], { retroactive: true }),
  session(5, '2026-09-13', [exercise('Unfinished only', set(300, 12))], { completed: false }),
  session(6, '2026-09-14', [exercise('Unconfirmed only', set(300, 12, { completed: false }))]),
];

test('all distinct verified exercises are tracked, ordered by last performance', () => {
  const before = JSON.stringify(fixtures);
  const list = records.derivePersonalRecords(fixtures);
  assert.equal(list.length, 5);
  assert.deepEqual(new Set(list.map((x) => x.name)), new Set(['Cable Crunch', 'Custom Lift / A&B', 'Incline Dumbbell Press', 'Bench Press', 'Overhead Press']));
  assert.ok(list.slice(0, 3).every((x) => dates.toLocalCalendarDate(x.lastPerformed) === '2026-09-11'));
  assert.equal(JSON.stringify(fixtures), before);
  assert.equal(list.find((x) => x.name === 'Custom Lift / A&B').best.weight, 0);
});

test('current best ranks weight, reps, then latest session, excluding retroactive and unfinished sets', () => {
  const best = records.derivePersonalRecords(fixtures).find((x) => x.name === 'Cable Crunch').best;
  assert.deepEqual([best.weight, best.reps, best.sessionId], [35, 12, '3']);
  assert.deepEqual(records.derivePersonalRecords([]), []);
  assert.deepEqual(records.derivePersonalRecords([fixtures[3], fixtures[4], fixtures[5]]), []);
});

test('partial case-insensitive search, highlights, counts, narrowed muscles and multi-select compose', () => {
  const list = records.derivePersonalRecords(fixtures).map((x) => ({ ...x, muscle: x.name === 'Overhead Press' ? 'shoulders' : x.name.includes('Press') ? 'chest' : 'core' }));
  const result = records.filterPersonalRecords(list, ' pReSs ', []);
  assert.equal(result.visibleRecords.length, 3);
  assert.deepEqual(result.muscles, ['chest', 'shoulders']);
  assert.equal(records.filterPersonalRecords(list, 'press', ['chest']).visibleRecords.length, 2);
  assert.equal(records.filterPersonalRecords(list, 'press', ['chest', 'shoulders']).visibleRecords.length, 3);
  assert.deepEqual(records.filterPersonalRecords(list, 'missing', []).muscles, []);
  assert.deepEqual(records.highlightExerciseName('Press / PRESS', 'press').filter((x) => x.matched).map((x) => x.text), ['Press', 'PRESS']);
  assert.deepEqual(records.highlightExerciseName('Cable Crunch', 'cru'), [{ text: 'Cable ', matched: false }, { text: 'Cru', matched: true }, { text: 'nch', matched: false }]);
});

test('catalog muscle identity supports custom exercises and splits biceps from triceps', () => {
  assert.equal(records.getRecordMuscle({ workoutType: 'arms', primaryMuscle: 'Biceps, Forearms' }), 'biceps');
  assert.equal(records.getRecordMuscle({ workoutType: 'arms', primaryMuscle: 'Triceps' }), 'triceps');
  assert.equal(records.getRecordMuscle({ workoutType: 'legs', primaryMuscle: 'Glutes' }), 'legs');
  assert.equal(records.getRecordMuscle(), 'other');
});

function databaseHistory() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE sessions (id INTEGER, date TEXT); CREATE TABLE exercises (id INTEGER, name TEXT); CREATE TABLE session_exercises (id INTEGER, session_id INTEGER, exercise_id INTEGER, position INTEGER); CREATE TABLE sets (id INTEGER, session_exercise_id INTEGER, set_index INTEGER, weight REAL, reps INTEGER, completed INTEGER, skipped INTEGER);');
  let eid = 0, seid = 0, sid = 0;
  for (const s of fixtures) {
    db.prepare('INSERT INTO sessions VALUES (?, ?)').run(Number(s.id), s.date);
    s.exercises.forEach((e, ei) => {
      db.prepare('INSERT INTO exercises VALUES (?, ?)').run(++eid, e.name);
      db.prepare('INSERT INTO session_exercises VALUES (?, ?, ?, ?)').run(++seid, Number(s.id), eid, ei);
      e.sets.forEach((st, i) => db.prepare('INSERT INTO sets VALUES (?, ?, ?, ?, ?, ?, ?)').run(++sid, seid, i, st.weight, st.reps, +!!st.completed, +!!st.skipped));
    });
  }
  const reader = evaluate(declarations('store/workoutDatabase.ts', ['readExerciseRecordSetsSync']), require, {
    getDatabase: () => ({ getAllSync: (sql, ...params) => db.prepare(sql).all(...params) }),
    getVerifiedSessions: verified.getVerifiedSessions,
  }).readExerciseRecordSetsSync;
  return { db, reader };
}

test('real SQLite query returns complete verified history outside the old top three and highlights historical PRs', () => {
  const { db, reader } = databaseHistory();
  try {
    const sets = reader('Cable Crunch', fixtures);
    assert.equal(sets.length, 5);
    assert.deepEqual(sets.map((x) => x.sessionId), ['3', '2', '2', '2', '1']);
    assert.deepEqual(sets.filter((x) => x.sessionId === '2').map((x) => x.setIndex), [0, 1, 2]);
    const groups = records.deriveRecentLifts(sets);
    assert.deepEqual(groups.map((x) => x.key), ['2026-09-11', '2026-09-04', '2026-09-01']);
    assert.equal(groups[0].hasPR, false); // Equal repeat is not another PR.
    assert.deepEqual(groups[1].sets.map((x) => x.isPR), [false, true, true]);
    assert.equal(groups[2].hasPR, true);
    const best = records.getCurrentBest(sets);
    assert.deepEqual([best.weight, best.reps, best.sessionId], [35, 12, '3']);
    assert.equal(reader('Retro only', fixtures).length, 0);
    assert.equal(reader('Unfinished only', fixtures).length, 0);
    assert.equal(reader('Custom Lift / A&B', fixtures).length, 1);
    assert.equal(reader("' OR 1=1 --", fixtures).length, 0);
    assert.equal(reader('Cable Crunch', []).length, 0);
  } finally { db.close(); }
});

test('same-day sessions retain separate set identities and latest tie wins', () => {
  const base = { date: dates.parseSessionDate('2026-09-11'), exerciseIndex: 0, setIndex: 0, weight: 35, reps: 12 };
  const sets = [{ ...base, id: 'a', sessionId: '9' }, { ...base, id: 'b', sessionId: '10' }];
  assert.equal(records.getCurrentBest(sets).id, 'b');
  const groups = records.deriveRecentLifts(sets);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].sets.map((x) => [x.id, x.isPR]), [['b', false], ['a', true]]);
});

test('legacy monthly timeline and fixed exercise restrictions are fully removed', () => {
  assert.doesNotMatch(source('app/records.tsx'), /deriveRecordHistory|groupByMonth|RecordItem|RECORD_ARCHETYPES|MONTHS/);
  assert.doesNotMatch(source('app/(tabs)/profile.tsx'), /PERSONAL_RECORD_EXERCISES|TRACKED_EXERCISES|function RecordCard/);
  assert.doesNotMatch(source('app/record-detail.tsx'), /StrengthProgressionDetail|StrengthCard|deriveStrengthMetrics/);
});
