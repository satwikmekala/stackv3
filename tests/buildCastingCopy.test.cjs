/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
// Follows real imports (relative and @/) so the copy runs against the shared formatters.
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved);
  const exported = {};
  cache.set(resolved, exported);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', code)(exported, (name) => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw new Error(`Unexpected runtime dependency: ${name}`);
  });
  return exported;
}
const casting = load('features/build/casting.ts');
const { castingFrame, castingTimeline, createStallWatchdog, CASTING_DURATION_MS, STALL_MS } = casting;
const { castingCopy, beatForPhase, beatHolds, pieceOrdinal } = load('features/build/castingCopy.ts');
const { formatMoved } = load('features/build/buildFormat.ts');

const set = (before, after) => ({ regularSetIndex: 0, previous: { weightKg: before[0], reps: before[1] }, current: { weightKg: after[0], reps: after[1] } });
const comparison = (exerciseName, improvedSets = []) => ({ exerciseName, loadType: 'external_weight', previousSessionId: 'p', comparableSets: 3, improvedSets });
const record = (exerciseName, weight, reps) => ({ exerciseName, previous: { weight: weight - 5, reps }, current: { weight, reps } });
const piece = ({ comparisons = [], records = [], volumeKg = 5240 } = {}) => ({
  id: 'session:x', sessionId: 'x', comparisons, records,
  metrics: { workouts: 1, volumeKg, liftsUp: comparisons.filter((item) => item.improvedSets.length).length, records: records.length },
});
const copyFor = (options = {}, context = {}) => castingCopy({ piece: piece(options), category: 'Push', weekPosition: 2, firstEver: false, unit: 'kg', ...context });
const phases = ['form', 'progress', 'gold', 'reveal', 'land', 'stacked'];
const sequence = (copy) => phases.map((phase) => beatForPhase(phase, copy.beats));

test('baseline workout goes Beat 1 → Beat 4 with only MOVED', () => {
  const copy = copyFor({ comparisons: [comparison('Bench press')] });
  assert.equal(copy.pieceLabel, 'PUSH · DONE');
  assert.deepEqual(copy.beats, [1, 4]);
  assert.deepEqual(sequence(copy), [1, 1, 1, 1, 4, 4]);
  assert.equal(beatForPhase(null, copy.beats), 1);
  assert.deepEqual(copy.landing, { title: 'Stacked.', subtitle: 'Second piece this week.', metrics: [{ value: '5,240 KG', label: 'MOVED' }], baseline: null });
});

test('lifts up without a PR shows progression rows, then lands without a PR row', () => {
  const copy = copyFor({ comparisons: [comparison('Bench press', [set([80, 8], [85, 8])]), comparison('Row'), comparison('Cable fly', [set([15, 12], [15, 14])])], volumeKg: 840 });
  assert.deepEqual(copy.beats, [1, 2, 4]);
  assert.deepEqual(sequence(copy), [1, 2, 2, 2, 4, 4]);
  assert.equal(copy.progress.title, 'Better than\nlast time.');
  assert.equal(copy.progress.heading, 'WHAT MADE IT THICKER');
  assert.deepEqual(copy.progress.rows, [
    { delta: '+5 kg', exercise: 'Bench press', change: '80 → 85 kg' },
    { delta: '+2 reps', exercise: 'Cable fly', change: '12 → 14' },
  ]);
  assert.equal(copy.progress.more, null);
  assert.deepEqual(copy.landing.metrics, [{ value: '840 KG', label: 'MOVED' }, { value: '2', label: 'LIFTS UP' }]);
});

test('a rep-only improvement at the same load reads in reps, singular for one', () => {
  assert.deepEqual(copyFor({ comparisons: [comparison('Pull-up', [set([0, 8], [0, 9])])] }).progress.rows, [{ delta: '+1 rep', exercise: 'Pull-up', change: '8 → 9' }]);
});

test('each exercise shows the set that moved most, keeping half-kilo loads', () => {
  const rows = copyFor({ comparisons: [comparison('Incline press', [set([40, 12], [40, 13]), set([40, 12], [42.5, 12])])] }).progress.rows;
  assert.deepEqual(rows, [{ delta: '+2.5 kg', exercise: 'Incline press', change: '40 → 42.5 kg' }]);
});

test('more than four improved lifts shows four rows and "+n more"', () => {
  const names = ['A', 'B', 'C', 'D', 'E', 'F'];
  const copy = copyFor({ comparisons: names.map((name) => comparison(name, [set([50, 5], [55, 5])])) });
  assert.deepEqual(copy.progress.rows.map((row) => row.exercise), ['A', 'B', 'C', 'D']);
  assert.equal(copy.progress.more, '+2 more');
});

test('one PR: NEW RECORD, one line, and a singular PR metric', () => {
  const copy = copyFor({ comparisons: [comparison('Bench press', [set([80, 8], [85, 8])])], records: [record('Bench press', 85, 8)] });
  assert.deepEqual(copy.beats, [1, 2, 3, 4]);
  assert.deepEqual(sequence(copy), [1, 2, 3, 3, 4, 4]);
  assert.deepEqual(copy.record, { heading: 'NEW RECORD', lines: ['Bench press · 85 kg × 8'], closing: 'Your best yet.' });
  assert.deepEqual(copy.landing.metrics.at(-1), { value: '1', label: 'PR' });
});

test('a PR without lifts up skips straight from Beat 1 to the record', () => {
  const copy = copyFor({ records: [record('Squat', 140, 3)] });
  assert.deepEqual(sequence(copy), [1, 1, 3, 3, 4, 4]);
});

test('multiple PRs: NEW RECORDS, one line each, "Your best yet." once, PRS', () => {
  const copy = copyFor({ records: [record('Bench press', 85, 8), record('Dips', 0, 15)] });
  assert.deepEqual(copy.record, { heading: 'NEW RECORDS', lines: ['Bench press · 85 kg × 8', 'Dips · Bodyweight × 15'], closing: 'Your best yet.' });
  assert.deepEqual(copy.landing.metrics.at(-1), { value: '2', label: 'PRS' });
});

test('first piece ever is Beat 1 → Beat 4 with the baseline line', () => {
  const copy = copyFor({ comparisons: [comparison('Bench press')], volumeKg: 720 }, { firstEver: true, weekPosition: 1 });
  assert.deepEqual(copy.beats, [1, 4]);
  assert.deepEqual(copy.landing, { title: 'Stacked.', subtitle: 'Your first piece.', metrics: [{ value: '720 KG', label: 'MOVED' }], baseline: 'Every lift today sets your baseline.' });
});

test('week ordinals are words through Seventh, digits from 8th', () => {
  assert.equal(copyFor({}, { weekPosition: 1 }).landing.subtitle, 'First piece this week.');
  assert.equal(copyFor({}, { weekPosition: 7 }).landing.subtitle, 'Seventh piece this week.');
  assert.equal(copyFor({}, { weekPosition: 8 }).landing.subtitle, '8th piece this week.');
  assert.deepEqual([11, 12, 13, 21, 22, 23, 101].map(pieceOrdinal), ['11th', '12th', '13th', '21st', '22nd', '23rd', '101st']);
});

test('lb profiles convert rows and records with the app formatter, and moved in LB', () => {
  const copy = copyFor({ comparisons: [comparison('Bench press', [set([80, 8], [85, 8])])], records: [record('Bench press', 85, 8)], volumeKg: 5240 }, { unit: 'lbs' });
  assert.deepEqual(copy.progress.rows, [{ delta: '+11 lbs', exercise: 'Bench press', change: '176.4 → 187.4 lbs' }]);
  assert.deepEqual(copy.record.lines, ['Bench press · 187.4 lbs × 8']);
  assert.deepEqual(copy.landing.metrics[0], { value: '11,552 LB', label: 'MOVED' });
});

test('a bodyweight-only workout with no load has no MOVED row', () => {
  assert.deepEqual(copyFor({ volumeKg: 0 }).landing.metrics, []);
});

// Walks playback in 10 ms steps exactly as the renderer does: wall time → animation time → phase → beat.
const play = (beats) => {
  const timeline = castingTimeline(beatHolds(beats));
  const shown = [];
  for (let wall = 0; wall <= timeline.totalMs; wall += 10) {
    const beat = beatForPhase(castingFrame(timeline.animationTime(wall), 1.3).phase, beats);
    if (shown.at(-1)?.beat !== beat) shown.push({ beat, from: wall });
  }
  return { totalMs: timeline.totalMs, shown: shown.map((entry, index) => ({ ...entry, ms: (shown[index + 1]?.from ?? timeline.totalMs) - entry.from })) };
};

test('Beat 4 appears on land; the camera reveal keeps the previous beat', () => {
  for (const [beats, held] of [[[1, 4], 1], [[1, 2, 4], 2], [[1, 3, 4], 3], [[1, 2, 3, 4], 3]]) {
    assert.equal(beatForPhase('reveal', beats), held);
    assert.equal(beatForPhase('land', beats), 4);
    assert.equal(beatForPhase('stacked', beats), 4);
  }
});

test('earned beats stay on screen for their minimum; skipped beats keep the fast timing', () => {
  assert.deepEqual(play([1, 4]), { totalMs: CASTING_DURATION_MS, shown: [{ beat: 1, from: 0, ms: 3800 }, { beat: 4, from: 3800, ms: 1800 }] });
  assert.deepEqual(play([1, 2, 4]).shown, [{ beat: 1, from: 0, ms: 800 }, { beat: 2, from: 800, ms: 3000 }, { beat: 4, from: 3800, ms: 1800 }]);
  assert.deepEqual(play([1, 3, 4]).shown, [{ beat: 1, from: 0, ms: 1800 }, { beat: 3, from: 1800, ms: 2000 }, { beat: 4, from: 3800, ms: 1800 }]);
  const full = play([1, 2, 3, 4]);
  assert.equal(full.totalMs, CASTING_DURATION_MS + 1200);
  assert.deepEqual(full.shown, [{ beat: 1, from: 0, ms: 800 }, { beat: 2, from: 800, ms: 2200 }, { beat: 3, from: 3000, ms: 2000 }, { beat: 4, from: 5000, ms: 1800 }]);
  for (const beats of [[1, 2, 4], [1, 3, 4], [1, 2, 3, 4]]) {
    for (const { beat, ms } of play(beats).shown) if (beat === 2) assert.ok(ms >= 2200); else if (beat === 3) assert.ok(ms >= 2000);
  }
  assert.deepEqual(beatHolds([1, 4]), []);
});

test('a hold freezes an ordinary frame: grown piece, no gold yet', () => {
  const timeline = castingTimeline(beatHolds([1, 2, 3, 4]));
  for (let wall = 1799; wall <= 2999; wall += 100) {
    const frame = castingFrame(timeline.animationTime(wall), 1.3);
    assert.equal(frame.phase, 'progress');
    assert.equal(frame.scaleY, 1);
    assert.equal(frame.gold, 0);
  }
  assert.equal(timeline.animationTime(3000), 1800);
  assert.equal(castingFrame(timeline.animationTime(timeline.totalMs), 1.3).done, true);
});

const fakeTimers = () => {
  let now = 0; let next = 1; const pending = new Map();
  return {
    set: (callback, ms) => { pending.set(next, { at: now + ms, callback }); return next++; },
    clear: (handle) => pending.delete(handle),
    advance(ms) {
      now += ms;
      for (const [handle, timer] of [...pending]) if (timer.at <= now) { pending.delete(handle); timer.callback(); }
    },
  };
};

test('a completed playback never advances on its own; it waits for Done', () => {
  const timers = fakeTimers(); let finished = 0;
  const watchdog = createStallWatchdog(() => finished++, timers);
  for (let ms = 17; ms <= CASTING_DURATION_MS; ms += 17) { watchdog.frame(ms); timers.advance(17); }
  watchdog.complete();
  timers.advance(60_000);
  assert.equal(finished, 0);
});

test('the watchdog detects stalls on the playback clock, never a slow start or a long sequence', () => {
  // A slow cold start (GL context, shader compile, warm-up frames at 0 ms) never arms it.
  const cold = fakeTimers(); let coldStalls = 0;
  const slow = createStallWatchdog(() => coldStalls++, cold);
  slow.frame(0); cold.advance(10_000); slow.frame(0); cold.advance(10_000);
  assert.equal(coldStalls, 0, 'no progress yet means not armed');
  slow.frame(17); cold.advance(STALL_MS - 1);
  assert.equal(coldStalls, 0);

  // Playback that keeps advancing never fires, however long it runs (holds, slow devices).
  const steady = fakeTimers(); let steadyStalls = 0;
  const long = createStallWatchdog(() => steadyStalls++, steady);
  for (let ms = 34; ms <= 60_000; ms += 34) { long.frame(ms); steady.advance(1_000); }
  assert.equal(steadyStalls, 0);

  // A real stall: no progress for STALL_MS after the clock started.
  const stalled = fakeTimers(); let finished = 0;
  const stall = createStallWatchdog(() => finished++, stalled);
  stall.frame(17); stall.frame(34);
  stall.frame(34); stalled.advance(STALL_MS - 1);
  assert.equal(finished, 0);
  stalled.advance(1);
  assert.equal(finished, 1);
  stall.frame(51); stalled.advance(STALL_MS);
  assert.equal(finished, 1, 'fires once');

  // Paused (inactive) time is not a stall; resuming re-arms from zero.
  const pausedTimers = fakeTimers(); let pausedStalls = 0;
  const paused = createStallWatchdog(() => pausedStalls++, pausedTimers);
  paused.frame(17); paused.pause(); pausedTimers.advance(60_000);
  assert.equal(pausedStalls, 0);
  paused.resume(); pausedTimers.advance(STALL_MS);
  assert.equal(pausedStalls, 1);

  const disposed = fakeTimers(); let after = 0;
  const done = createStallWatchdog(() => after++, disposed);
  done.frame(17); done.dispose();
  disposed.advance(60_000);
  assert.equal(after, 0);
});

test('moved: sessions show full weight, aggregates keep tonnes (kg and lb)', () => {
  assert.equal(formatMoved(5240, 'kg', 'session'), '5,240 KG');
  assert.equal(formatMoved(138200, 'kg', 'session'), '138,200 KG');
  assert.equal(formatMoved(840, 'kg', 'session'), '840 KG');
  assert.equal(formatMoved(5240, 'kg', 'aggregate'), '5.2 T');
  assert.equal(formatMoved(138200, 'kg', 'aggregate'), '138.2 T');
  assert.equal(formatMoved(840, 'kg', 'aggregate'), '840 KG');
  assert.equal(formatMoved(5240, 'lbs', 'session'), '11,552 LB');
  assert.equal(formatMoved(5240, 'lbs', 'aggregate'), '11,552 LB');
  assert.equal(formatMoved(0, 'kg', 'session'), null);
  assert.equal(`${formatMoved(5240, 'kg', 'session').toLowerCase()} moved`, '5,240 kg moved');
});
