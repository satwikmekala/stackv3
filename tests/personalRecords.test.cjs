// Run with: node --test tests/personalRecords.test.cjs (Node 22+ for in-memory SQLite).
/* global __dirname */
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
const dates = evaluate(source('store/workoutCalendar.ts'));
const verified = evaluate(source('store/verifiedSessions.ts'));
const theme = evaluate(source('constants/theme.ts'));
const muscleColors = evaluate(source('constants/muscleColors.ts'), () => theme);
const measurement = evaluate(source('store/exerciseMeasurement.ts'));
const weightUnits = evaluate(source('store/weightUnits.ts'));
const records = evaluate(source('store/personalRecords.ts'), (id) => {
  if (id.endsWith('/exerciseMeasurement')) return measurement;
  if (id.endsWith('/weightUnits')) return weightUnits;
  if (id.endsWith('/workoutCalendar')) return dates;
  if (id.endsWith('/verifiedSessions')) return verified;
  if (id.endsWith('/muscleColors')) return muscleColors;
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
  db.exec('CREATE TABLE sessions (id INTEGER, date TEXT); CREATE TABLE exercises (id INTEGER, name TEXT); CREATE TABLE session_exercises (id INTEGER, session_id INTEGER, exercise_id INTEGER, position INTEGER, metric TEXT); CREATE TABLE sets (id INTEGER, session_exercise_id INTEGER, set_index INTEGER, weight REAL, reps INTEGER, completed INTEGER, skipped INTEGER);');
  let eid = 0, seid = 0, sid = 0;
  for (const s of fixtures) {
    db.prepare('INSERT INTO sessions VALUES (?, ?)').run(Number(s.id), s.date);
    s.exercises.forEach((e, ei) => {
      db.prepare('INSERT INTO exercises VALUES (?, ?)').run(++eid, e.name);
      db.prepare('INSERT INTO session_exercises (id, session_id, exercise_id, position, metric) VALUES (?, ?, ?, ?, ?)').run(++seid, Number(s.id), eid, ei, e.metric ?? 'reps');
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
    const { milestones, matches } = records.deriveRecordProgression(sets);
    // 30×12 → 35×10 → 35×12; the earlier 25×15 and the later equal 35×12 never move the ceiling.
    assert.deepEqual(milestones.map((x) => [x.set.sessionId, x.set.weight, x.set.reps]), [['2', 35, 12], ['2', 35, 10], ['1', 30, 12]]);
    assert.equal(matches, 1); // Equal repeat is a match, not another PR.
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
  const progression = records.deriveRecordProgression(sets);
  assert.deepEqual(progression.milestones.map((x) => x.set.id), ['a']);
  assert.equal(progression.matches, 1);
});

test('legacy monthly timeline and fixed exercise restrictions are fully removed', () => {
  assert.doesNotMatch(source('app/records.tsx'), /deriveRecordHistory|groupByMonth|RecordItem|RECORD_ARCHETYPES|MONTHS/);
  assert.doesNotMatch(source('app/(tabs)/profile.tsx'), /PERSONAL_RECORD_EXERCISES|TRACKED_EXERCISES|function RecordCard/);
  assert.doesNotMatch(source('app/record-detail.tsx'), /StrengthProgressionDetail|StrengthCard|deriveStrengthMetrics/);
});

test('timed sets never enter the weight/reps record pipeline (in memory or SQLite)', () => {
  const timed = (name, durationS, weight = 0) => ({ name, metric: 'duration', loadType: weight ? 'external_weight' : 'bodyweight',
    sets: [{ weight, reps: 0, durationS, completed: true }] });
  const history = [
    session(10, '2026-09-20', [timed('Plank', 60), timed('Farmer Carry', 45, 30), exercise('Bench Press', set(80, 8))]),
    session(11, '2026-09-21', [timed('Plank', 90)]),
  ];
  const list = records.derivePersonalRecords(history);
  assert.deepEqual(list.map((record) => record.name), ['Bench Press']);

  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE sessions (id INTEGER, date TEXT); CREATE TABLE exercises (id INTEGER, name TEXT); CREATE TABLE session_exercises (id INTEGER, session_id INTEGER, exercise_id INTEGER, position INTEGER, metric TEXT); CREATE TABLE sets (id INTEGER, session_exercise_id INTEGER, set_index INTEGER, weight REAL, reps INTEGER, completed INTEGER, skipped INTEGER);');
    db.exec("INSERT INTO sessions VALUES (10, '2026-09-20'); INSERT INTO exercises VALUES (1, 'Plank'); INSERT INTO session_exercises VALUES (1, 10, 1, 0, 'duration'); INSERT INTO sets VALUES (1, 1, 0, 0, 0, 1, 0);");
    const reader = evaluate(declarations('store/workoutDatabase.ts', ['readExerciseRecordSetsSync']), require, {
      getDatabase: () => ({ getAllSync: (sql, ...params) => db.prepare(sql).all(...params) }),
      getVerifiedSessions: verified.getVerifiedSessions,
    }).readExerciseRecordSetsSync;
    assert.deepEqual(reader('Plank', history), []);
  } finally { db.close(); }
});

// ---- Record progression: only sets that moved the ceiling ----

const recordSet = (id, day, weight, reps, extra = {}) => ({
  id: String(id), sessionId: String(extra.sessionId ?? id), date: dates.parseSessionDate(day),
  exerciseIndex: 0, setIndex: extra.setIndex ?? 0, weight, reps,
});
const shape = (progression) => progression.milestones.map((x) => [dates.toLocalCalendarDate(x.set.date), x.set.weight, x.set.reps, x.isCurrent]);

test('progression keeps only PR-setting sets, newest first, from the product example', () => {
  const sets = [
    recordSet(1, '2026-01-01', 60, 8), recordSet(2, '2026-01-08', 60, 8), recordSet(3, '2026-01-15', 62.5, 8),
    recordSet(4, '2026-01-22', 60, 10), recordSet(5, '2026-02-01', 65, 8),
  ];
  const progression = records.deriveRecordProgression([...sets].reverse()); // Input order never matters.
  assert.deepEqual(shape(progression), [
    ['2026-02-01', 65, 8, true], ['2026-01-15', 62.5, 8, false], ['2026-01-01', 60, 8, false],
  ]);
  assert.equal(progression.current.set.id, '5');
  assert.equal(progression.matches, 0);
  assert.deepEqual(progression.milestones.map((x) => records.formatRecordDelta(x.delta, 'kg')), ['+2.5 kg', '+2.5 kg', null]);
  // Current PR in the list and on the detail agree on what and when.
  const best = records.getCurrentBest(sets);
  assert.deepEqual([best.weight, best.reps], [progression.current.set.weight, progression.current.set.reps]);
});

test('bodyweight progression counts reps and labels the record as bodyweight', () => {
  const sets = [recordSet(1, '2026-06-14', 0, 8), recordSet(2, '2026-07-01', 0, 7), recordSet(3, '2026-08-02', 0, 10),
    recordSet(4, '2026-09-18', 0, 12), recordSet(5, '2026-10-05', 0, 14)];
  const progression = records.deriveRecordProgression(sets);
  assert.deepEqual(progression.milestones.map((x) => x.set.reps), [14, 12, 10, 8]);
  assert.deepEqual(progression.milestones.map((x) => records.formatRecordDelta(x.delta, 'kg')), ['+2 reps', '+2 reps', '+2 reps', null]);
  const performance = records.recordPerformance(progression.current.set);
  assert.equal(performance.bodyweight, true);
  assert.equal(performance.reps, 14);
});

test('weighted progression: same load adds reps, heavier load wins even with fewer reps', () => {
  const sets = [recordSet(1, '2026-09-01', 80, 4), recordSet(2, '2026-09-08', 80, 5), recordSet(3, '2026-09-15', 82.5, 3),
    recordSet(4, '2026-09-22', 80, 9)];
  const progression = records.deriveRecordProgression(sets);
  assert.deepEqual(shape(progression).map((x) => x.slice(1, 3)), [[82.5, 3], [80, 5], [80, 4]]);
  assert.deepEqual(progression.milestones.map((x) => x.delta), [
    { kind: 'weight', from: 80, to: 82.5 }, { kind: 'reps', reps: 1 }, null,
  ]);
  assert.equal(records.formatRecordDelta({ kind: 'reps', reps: 1 }, 'kg'), '+1 rep');
});

test('ties never create milestones; repeated current PRs count distinct later sessions', () => {
  const sets = [
    recordSet(1, '2026-09-01', 100, 5), recordSet(2, '2026-09-01', 100, 5, { sessionId: 1, setIndex: 1 }),
    recordSet(3, '2026-09-08', 100, 5), recordSet(4, '2026-09-08', 100, 5, { sessionId: 3, setIndex: 1 }),
    recordSet(5, '2026-09-15', 100, 5), recordSet(6, '2026-09-20', 95, 8),
  ];
  const progression = records.deriveRecordProgression(sets);
  assert.equal(progression.milestones.length, 1);
  assert.equal(progression.current.set.id, '1'); // First time reached, not a later equal set.
  assert.equal(progression.current.delta, null);
  assert.equal(progression.matches, 2); // Sessions 3 and 5; another set inside session 1 is not a match.
});

test('single record, no sets, and decimal or unit-converted deltas', () => {
  const single = records.deriveRecordProgression([recordSet(1, '2026-09-01', 42.5, 5)]);
  assert.deepEqual(shape(single), [['2026-09-01', 42.5, 5, true]]);
  assert.deepEqual(records.deriveRecordProgression([]), { milestones: [], current: undefined, matches: 0 });
  assert.equal(records.formatRecordDelta({ kind: 'weight', from: 60, to: 61.25 }, 'kg'), '+1.3 kg');
  assert.equal(records.formatRecordDelta({ kind: 'weight', from: 60, to: 62.5 }, 'lbs'), '+5.5 lb'); // 132.3 → 137.8 as displayed.
  assert.equal(records.formatRecordDelta({ kind: 'weight', from: 0, to: 10 }, 'kg'), '+10 kg');
  assert.equal(records.formatRecordDelta({ kind: 'weight', from: 60, to: 60.001 }, 'kg'), null); // Invisible on screen.
  assert.equal(records.formatRecordDelta({ kind: 'reps', reps: 0 }, 'kg'), null);
});

test('list rows carry the date the current PR was first achieved, independent of session order', () => {
  const history = [
    session(3, '2026-09-28', [exercise('Bench Press', set(80, 6))]),
    session(1, '2026-09-14', [exercise('Bench Press', set(75, 6)), exercise('Chest Dip', set(0, 12))]),
    session(2, '2026-09-21', [exercise('Bench Press', set(80, 6)), exercise('Chest Dip', set(0, 14))]),
    session(4, '2026-10-02', [exercise('Bench Press', set(70, 10)), exercise('Overhead Press', set(42.5, 5))]),
  ];
  const list = records.derivePersonalRecords(history);
  const byName = Object.fromEntries(list.map((x) => [x.name, x]));
  assert.equal(dates.toLocalCalendarDate(byName['Bench Press'].achieved), '2026-09-21');
  assert.equal(dates.toLocalCalendarDate(byName['Bench Press'].lastPerformed), '2026-10-02');
  assert.deepEqual([byName['Bench Press'].best.weight, byName['Bench Press'].best.reps], [80, 6]);
  assert.equal(dates.toLocalCalendarDate(byName['Chest Dip'].achieved), '2026-09-21');
  assert.equal(dates.toLocalCalendarDate(byName['Overhead Press'].achieved), '2026-10-02');
  assert.deepEqual(records.sortPersonalRecords(list, 'recent').map((x) => x.name), ['Overhead Press', 'Bench Press', 'Chest Dip']);
  assert.deepEqual(records.sortPersonalRecords(list, 'name').map((x) => x.name), ['Bench Press', 'Chest Dip', 'Overhead Press']);
  assert.deepEqual(list.map((x) => x.name), ['Bench Press', 'Overhead Press', 'Chest Dip']); // Input list untouched by sorting.
});

test('detail is a record progression, not a second workout history', () => {
  const detail = source('app/record-detail.tsx');
  assert.match(detail, /deriveRecordProgression/);
  assert.doesNotMatch(detail, /deriveRecentLifts|SectionList|RECENT LIFTS|SETS LOGGED|ChevronLeft|router\.back/);
  assert.doesNotMatch(source('store/personalRecords.ts'), /export function deriveRecentLifts/);
  const list = source('app/records.tsx');
  assert.doesNotMatch(list, /ChevronLeft|lastPerformed|BEST SET/);
  assert.match(list, /item\.achieved/);
  // Both screens use the native stack header and its minimal back button, like History.
  const layout = source('app/_layout.tsx');
  for (const name of ['records', 'record-detail']) {
    const block = layout.slice(layout.indexOf(`name="${name}"`), layout.indexOf('/>', layout.indexOf(`name="${name}"`)));
    assert.match(block, /headerShown: true/);
    assert.match(block, /headerBackButtonDisplayMode: 'minimal'/);
  }
});
