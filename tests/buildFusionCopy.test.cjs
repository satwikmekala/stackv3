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
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', js)(exports, (name) => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw new Error(`Unexpected runtime dependency: ${name}`);
  });
  return exports;
}
const { deriveBuildState } = load('features/build/evidence.ts');
const { reconcileFusion, createFusionCoordinator } = load('features/build/fusion.ts');
const { fusionCopy, fusionBeat, builtCount, weeksBuilt } = load('features/build/fusionCopy.ts');
const { pieceCategory, formatDateRange: weekRange } = load('features/build/buildFormat.ts');

const set = (weight, reps) => ({ weight, reps, completed: true });
const lift = (name, sets) => ({ name, sets, loadType: 'external_weight' });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false,
  archetype: 'push', secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null, workoutTypes: ['chest'], ...extra });
const derive = (sessions, today = '2026-09-23') => deriveBuildState(sessions, new Date(`${today}T12:00:00`));
const copyOf = (sessions, state, weekId, { unit = 'kg', builtBefore = 0 } = {}) => fusionCopy({
  state, weekId, unit, builtBefore,
  category: (piece) => pieceCategory(sessions.find((item) => item.id === piece.sessionId), piece.label),
});
const memory = () => { let value = null; return { getItem: async () => value, setItem: async (_key, next) => { value = next; } }; };

test('one-piece week: singular title, one row, PIECE and no PR segment', () => {
  const sessions = [session(1, '2026-09-15', [lift('Bench press', [set(60, 8), set(60, 6)])])];
  const state = derive(sessions);
  const copy = copyOf(sessions, state, 'week:2026-09-14', { builtBefore: 0 });
  assert.deepEqual(copy.week, { range: '14–20 SEP', title: 'One piece.', rows: [{ title: 'Push · Tue', detail: '840 kg' }] });
  assert.deepEqual(copy.sealed, { kicker: '14–20 SEP · SEALED', title: 'One week.\nOne layer.', summary: '1 PIECE · 840 KG MOVED', thickest: null });
  assert.deepEqual(copy.stack, { label: 'YOUR STACK', before: 0, after: 1 });
});

test('multi-piece week with lifts up and PRs: chronological rows, aggregate tonnes, PRS', () => {
  const sessions = [
    session(1, '2026-09-08', [lift('Bench press', [set(80, 8)]), lift('Squat', [set(100, 5)])]),
    session(2, '2026-09-18', [lift('Bench press', [set(85, 8)]), lift('Squat', [set(105, 5)])]),
    session(3, '2026-09-14', [lift('Bench press', [set(80, 8)])], { archetype: 'pull', workoutTypes: ['back'] }),
    session(4, '2026-09-16', [lift('Squat', [set(100, 5)])], { archetype: null, workoutTypes: ['legs'] }),
  ];
  const state = derive(sessions);
  const copy = copyOf(sessions, state, 'week:2026-09-14', { builtBefore: 1 });
  assert.equal(copy.week.title, 'Three pieces.');
  assert.deepEqual(copy.week.rows, [
    { title: 'Pull · Mon', detail: '640 kg' },
    { title: 'Legs · Wed', detail: '500 kg' },
    { title: 'Push · Fri', detail: '1,205 kg · 2 lifts up · PRs' },
  ]);
  assert.equal(copy.sealed.summary, '3 PIECES · 2.3 T MOVED · 2 PRS');
  assert.equal(copy.sealed.kicker, '14–20 SEP · SEALED');
  assert.deepEqual(copy.stack, { label: 'YOUR STACK', before: 1, after: 2 });
});

test('a single PR shows "PR" in its row and "1 PR" in the summary', () => {
  const sessions = [session(1, '2026-09-08', [lift('Bench press', [set(80, 8)])]), session(2, '2026-09-15', [lift('Bench press', [set(80, 9)])])];
  const copy = copyOf(sessions, derive(sessions), 'week:2026-09-14');
  assert.deepEqual(copy.week.rows, [{ title: 'Push · Tue', detail: '720 kg · 1 lift up · PR' }]);
  assert.equal(copy.sealed.summary, '1 PIECE · 720 KG MOVED · 1 PR');
});

test('a zero-piece week never triggers, and an empty week has no copy', () => {
  const state = derive([session(1, '2026-09-08', [lift('Bench press', [set(60, 8)])])], '2026-09-23');
  assert.equal(reconcileFusion(state, { version: 1, observedWeek: '2026-09-14' }).weekId, null);
  assert.equal(copyOf([], state, 'week:2026-09-14'), null);
});

test('several unseen weeks: only the most recent with pieces plays, the rest are seen, count includes them', async () => {
  const sessions = [
    session(1, '2026-08-25', [lift('Bench press', [set(60, 8)])]),
    session(2, '2026-09-01', [lift('Bench press', [set(60, 8)])]),
    session(3, '2026-09-09', [lift('Bench press', [set(60, 8)])]),
    session(4, '2026-09-24', [lift('Bench press', [set(60, 8)])]),
    // 2026-09-14 and 2026-09-28 weeks are empty.
  ];
  const state = derive(sessions, '2026-10-06');
  const storage = memory();
  await storage.setItem('stack.build.fusion.v1', JSON.stringify({ version: 1, observedWeek: '2026-08-31' }));
  const coordinator = createFusionCoordinator(storage);
  const claimed = await coordinator.claim(state);
  assert.deepEqual(claimed, { weekId: 'week:2026-09-21', builtBefore: 1 });
  const copy = copyOf(sessions, state, claimed.weekId, { builtBefore: claimed.builtBefore });
  assert.deepEqual(copy.stack, { label: 'YOUR STACK', before: 1, after: 4 });
  assert.deepEqual([0, 0.34, 0.67, 1].map((progress) => builtCount(copy.stack, progress)), [1, 2, 3, 4]);
  assert.equal(weeksBuilt(builtCount(copy.stack, 1)), '4 weeks built');
  assert.equal(await coordinator.claim(state), null, 'silent weeks are marked seen');
});

test('no replay after the sequence played or was skipped, even after relaunch', async () => {
  const sessions = [session(1, '2026-09-20', [lift('Bench press', [set(60, 8)])])];
  const storage = memory();
  const coordinator = createFusionCoordinator(storage);
  assert.equal(await coordinator.claim(derive(sessions, '2026-09-20')), null);
  const monday = derive(sessions, '2026-09-21');
  assert.deepEqual(await coordinator.claim(monday), { weekId: 'week:2026-09-14', builtBefore: 0 });
  // While presented, the claim is held: no second presentation.
  assert.equal(await coordinator.claim(monday), null);
  // Played to its final beat or skipped: the marker is written then.
  await coordinator.commit();
  assert.equal(await coordinator.claim(monday), null);
  assert.equal(await createFusionCoordinator(storage).claim(monday), null);
  assert.equal(await createFusionCoordinator(storage).reconcile(monday), null);
});

const week = (weekStart, compositeHeight) => ({ id: `week:${weekStart}`, weekStart, weekEnd: weekStart, sealed: true, compositeHeight,
  pieces: [{ id: `p:${weekStart}`, sessionId: 'x', date: weekStart, label: 'Push', records: [], metrics: { workouts: 1, volumeKg: 100, liftsUp: 0, records: 0 } }],
  metrics: { workouts: 1, volumeKg: 100, liftsUp: 0, records: 0 } });
const thickestFor = (heights) => {
  const sealedWeeks = heights.map((height, index) => week(`2026-0${index + 1}-05`, height));
  return fusionCopy({ state: { sealedWeeks }, weekId: sealedWeeks.at(-1).id, unit: 'kg', builtBefore: 0, category: () => 'Push' }).sealed.thickest;
};

test('"Your thickest layer yet." only when strictly thicker than every earlier sealed week', () => {
  assert.equal(thickestFor([1.1, 1.4, 1.6]), 'Your thickest layer yet.');
  assert.equal(thickestFor([1.1, 1.6, 1.6]), null, 'tie');
  assert.equal(thickestFor([1.1, 1.6, 1.2]), null, 'lighter week');
  assert.equal(thickestFor([1.6]), null, 'first sealed week');
});

test('date ranges match the Monolith, including across months', () => {
  assert.equal(weekRange('2026-09-14', '2026-09-20'), '14–20 SEP');
  assert.equal(weekRange('2026-09-28', '2026-10-04'), '28 SEP–4 OCT');
  const sessions = [session(1, '2026-09-29', [lift('Bench press', [set(60, 8)])])];
  assert.equal(copyOf(sessions, derive(sessions, '2026-10-07'), 'week:2026-09-28').sealed.kicker, '28 SEP–4 OCT · SEALED');
});

test('lb profiles: full pounds per session, lb aggregate in the summary', () => {
  const sessions = [
    session(1, '2026-09-14', [lift('Bench press', [set(100, 10)])]),
    session(2, '2026-09-16', [lift('Deadlift', [set(180, 5)])]),
  ];
  const copy = copyOf(sessions, derive(sessions), 'week:2026-09-14', { unit: 'lbs' });
  assert.deepEqual(copy.week.rows.map((row) => row.detail), ['2,205 lb', '1,984 lb']);
  assert.equal(copy.sealed.summary, '2 PIECES · 4,189 LB MOVED');
});

test('beats: the week while pieces lift, held through the press, sealed as the block seats', () => {
  assert.deepEqual([null, 'isolate', 'compress', 'fuse', 'seat', 'sealed'].map(fusionBeat), [1, 1, 2, 2, 3, 3]);
});
