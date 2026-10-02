/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved);
  const exports = {};
  cache.set(resolved, exports);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', code)(exports, (name) => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw Error(`Unexpected dependency ${name}`);
  });
  return exports;
}
const {
  buildWorkoutReport, reportDuration, formatReportDuration, workoutReportText, REPORT_COMFORTABLE_MAX_ROWS,
} = load('features/report/workoutReport.ts');
const { lift, bodyweight, hold, reportSession, REPORT_FIXTURES } = load('features/report/reportFixtures.ts');
const { deriveWorkoutSummary } = load('store/workoutSummary.ts');

const kg = (session, extra = {}) => buildWorkoutReport(session, { unit: 'kg', ...extra });
const texts = (exercise) => exercise.sets.map((set) => set.text);
const fixture = (key) => REPORT_FIXTURES.find((item) => item.key === key);

test('weight + reps reads "80 kg × 10" per set, with traditional volume', () => {
  const report = kg(reportSession([lift('Bench Press', 80, [10, 10])]));
  const [bench] = report.exercises;
  assert.equal(bench.measure, 'weight_reps');
  assert.deepEqual(texts(bench), ['80 kg × 10', '80 kg × 10']);
  assert.deepEqual(bench.sets.map((set) => set.compactText), ['80 × 10', '80 × 10']);
  assert.equal(bench.volume, '1,600 kg');
});

test('varying reps keep every performed set, in order', () => {
  const [bench] = kg(reportSession([lift('Bench Press', 80, [10, 9, 8, 6])])).exercises;
  assert.deepEqual(texts(bench), ['80 kg × 10', '80 kg × 9', '80 kg × 8', '80 kg × 6']);
  assert.deepEqual(bench.sets.map((set) => set.ordinal), [1, 2, 3, 4]);
});

test('duration-only sets read as m:ss, never reps, with no volume', () => {
  const report = kg(reportSession([hold('Plank', [60, 45])]));
  const [plank] = report.exercises;
  assert.equal(plank.measure, 'duration');
  assert.deepEqual(texts(plank), ['1:00', '0:45']);
  assert.equal(plank.volume, null);
  assert.ok(!texts(plank).some((text) => /rep/.test(text)));
  assert.equal(report.stats.find((stat) => stat.key === 'volume'), undefined);
});

test('weight + duration reads "30 kg · 0:45" and never invents weight × time volume', () => {
  const report = kg(reportSession([hold('Farmer Carry', [45, 40], 30)]));
  const [carry] = report.exercises;
  assert.equal(carry.measure, 'weight_duration');
  assert.deepEqual(texts(carry), ['30 kg · 0:45', '30 kg · 0:40']);
  assert.equal(carry.unitHint, 'kg · time');
  assert.equal(carry.volume, null);
  assert.equal(report.stats.find((stat) => stat.key === 'volume'), undefined);
});

test('bodyweight reps read "20 reps" with no zero weight, and zero-volume workouts omit the stat', () => {
  const report = kg(reportSession([bodyweight('Push-Up', [20, 1])]));
  assert.deepEqual(texts(report.exercises[0]), ['20 reps', '1 rep']);
  assert.equal(report.exercises[0].volume, null);
  assert.deepEqual(report.stats.map((stat) => stat.key), ['duration', 'exercises', 'sets']);
  assert.ok(!workoutReportText(report).includes('0 kg'));
});

test('an unloaded set of a weighted lift reads as reps, not "0 kg"', () => {
  const [dip] = kg(reportSession([lift('Weighted Dip', 20, [10, { reps: 14, weight: 0, type: 'dropset' }])])).exercises;
  assert.deepEqual(texts(dip), ['20 kg × 10', '14 reps']);
});

test('lbs display converts canonical kg; entry unit never decides the report', () => {
  const session = reportSession([lift('Leg Curl', 90 / 2.20462, [12], 'lbs'), lift('Squat', 100, [5], 'kg')]);
  const inLbs = buildWorkoutReport(session, { unit: 'lbs' });
  assert.deepEqual(inLbs.exercises.map((exercise) => exercise.sets[0].text), ['90 lbs × 12', '220.5 lbs × 5']);
  assert.equal(inLbs.exercises[0].unitHint, 'lbs × reps');
  const inKg = kg(session);
  assert.deepEqual(inKg.exercises.map((exercise) => exercise.sets[0].text), ['40.8 kg × 12', '100 kg × 5']);
  // Canonical weights are untouched by building a report.
  assert.equal(session.exercises[1].sets[0].weight, 100);
});

test('volume stat agrees with the completion summary in either unit', () => {
  const { session } = fixture('push');
  const summary = deriveWorkoutSummary(session);
  assert.equal(kg(session).stats.find((stat) => stat.key === 'volume').value, summary.volumeKg.toLocaleString('en-US'));
  const lbs = buildWorkoutReport(session, { unit: 'lbs' }).stats.find((stat) => stat.key === 'volume');
  assert.deepEqual([lbs.value, lbs.unit], [Math.round(summary.volumeKg * 2.20462).toLocaleString('en-US'), 'lbs']);
});

test('PR, drop and extra sets are tagged; a top set beating history is a new best', () => {
  const { session, history } = fixture('records');
  const report = kg(session, { history });
  const [bench, ohp, dip] = report.exercises;
  assert.deepEqual(bench.sets.map((set) => [set.kind, set.record]), [
    ['working', false], ['working', false], ['working', false], ['pr', true], ['extra', false],
  ]);
  assert.equal(bench.sets[3].text, '92.5 kg × 3');
  // Repeated equal top sets: only the first is marked.
  assert.deepEqual(ohp.sets.map((set) => set.record), [true, false, false]);
  assert.equal(dip.sets[2].kind, 'dropset');
  assert.deepEqual(report.highlights.slice(0, 4), ['2 new bests', '1 PR attempt', '1 drop set', '1 extra set']);
});

test('first-ever session of a lift is not a new best, and timed sets never are', () => {
  const report = kg(reportSession([lift('Bench Press', 100, [5]), hold('Plank', [90])]), { history: [] });
  assert.ok(report.exercises.every((exercise) => !exercise.hasRecord));
  assert.ok(!report.highlights.some((note) => note.includes('best')));
});

test('skipped sets stay visible but out of totals; fully skipped lifts are listed, unnumbered', () => {
  const session = reportSession([
    lift('Skull Crusher', 30, [12, { reps: 12, skipped: true }]),
    lift('Calf Raise', 40, [{ reps: 15, skipped: true }]),
    lift('Curl', 15, [10, { reps: 10, completed: false }]),
  ]);
  session.exercises[2].sets[1].completed = false;
  const report = kg(session);
  const [skull, calf, curl] = report.exercises;
  assert.deepEqual(texts(skull), ['30 kg × 12', 'Skipped']);
  assert.equal(skull.volume, '360 kg');
  assert.deepEqual([calf.skipped, calf.position, curl.position], [true, null, 2]);
  // Unreached sets (neither performed nor skipped) are not part of the record.
  assert.deepEqual(texts(curl), ['15 kg × 10']);
  assert.equal(report.stats.find((stat) => stat.key === 'exercises').value, '2');
  assert.equal(report.stats.find((stat) => stat.key === 'sets').value, '2');
  assert.ok(report.highlights.includes('2 sets skipped'));
});

test('long workouts switch to the compact grid; short ones stay one row per set', () => {
  assert.equal(kg(fixture('push').session).density, 'comfortable');
  const long = kg(fixture('long').session);
  assert.equal(long.density, 'compact');
  assert.equal(long.exercises.length, 10);
  assert.ok(long.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) > REPORT_COMFORTABLE_MAX_ROWS);
  assert.equal(long.exercises[2].name, 'Bulgarian Split Squat (Dumbbells, Rear Foot Elevated)');
});

test('missing completion timestamp omits duration rather than inventing one', () => {
  const report = kg(fixture('bodyweight').session);
  assert.equal(report.durationLabel, null);
  assert.equal(report.timeLabel, null);
  assert.equal(report.stats.find((stat) => stat.key === 'duration'), undefined);
  // Date-only history is its calendar day, not shifted by UTC parsing.
  assert.equal(report.dateLabel, 'Sunday, Sep 27, 2026');
});

test('duration is only trusted between real timestamps within a plausible span', () => {
  assert.equal(reportDuration({ date: '2026-10-02T18:05:00Z', completedAt: '2026-10-02T19:09:00Z' }), 64 * 60_000);
  assert.equal(reportDuration({ date: '2026-10-02', completedAt: '2026-10-02T19:09:00Z' }), null);
  assert.equal(reportDuration({ date: '2026-10-02T18:05:00Z', completedAt: '2026-10-02T18:05:20Z' }), null);
  assert.equal(reportDuration({ date: '2026-10-01T18:05:00Z', completedAt: '2026-10-02T19:09:00Z' }), null);
  assert.deepEqual([formatReportDuration(46 * 60_000), formatReportDuration(64 * 60_000)], ['46 min', '1h 04m']);
});

test('custom split title override and plain-text twin', () => {
  const report = kg(reportSession([lift('Bench Press', 80, [10]), hold('Plank', [60])]), { titleOverride: 'Heavy Day' });
  assert.equal(report.title, 'Heavy Day');
  const text = workoutReportText(report);
  assert.match(text, /^Heavy Day\n/);
  assert.match(text, /1\. Bench Press — 800 kg\n {3}1 {2}80 kg × 10/);
  assert.match(text, /2\. Plank\n {3}1 {2}1:00/);
});
