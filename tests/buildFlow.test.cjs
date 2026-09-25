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
  assert.ok(!/workoutStore|workoutDatabase/.test(resolved), 'Flow rules must not load the native store or database');
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
const { createPresentationRun } = load('features/build/presentation.ts');
const { createCastingGate } = load('features/build/casting.ts');
const { createFusionCoordinator, reconcileFusion, readFusionMarker, FUSION_MARKER_KEY } = load('features/build/fusion.ts');
const { castingCopy, castingStaticContent, castingAnnouncement } = load('features/build/castingCopy.ts');
const { fusionCopy, fusionStaticContent, fusionAnnouncement } = load('features/build/fusionCopy.ts');
const { homeModuleCopy } = load('features/build/homeModuleCopy.ts');
const { buildCounts, pendingWeekClose } = load('features/build/buildCounts.ts');
const { deriveBuildState } = load('features/build/evidence.ts');
const { pieceCategory } = load('features/build/buildFormat.ts');
const { makeMonolithDemo, MONOLITH_DEMO_NOW } = load('features/build/monolithDemo.ts');
const { scheduleCtaFallback, PAGE4_CTA_FALLBACK_MS } = load('features/build/introPages.ts');
const { buildIntents, performBuildIntent, unpackedWeekHref } = load('features/build/buildNavigation.ts');
const { getStartOfWeek, toLocalCalendarDate } = load('store/workoutCalendar.ts');

const memoryStorage = () => { const values = new Map(); return { values, getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } }; };
const fakeTimers = () => {
  let now = 0; let next = 1; const pending = new Map();
  return {
    set: (callback, ms) => { pending.set(next, { at: now + ms, callback }); return next++; },
    clear: (handle) => pending.delete(handle),
    advance(ms) { now += ms; for (const [handle, timer] of [...pending]) if (timer.at <= now) { pending.delete(handle); timer.callback(); } },
  };
};
const lift = (name, sets) => ({ name, sets, loadType: 'external_weight' });
const set = (weight, reps) => ({ weight, reps, completed: true });
const session = (id, date, exercises = [lift('Bench press', [set(60, 8)])]) => ({ id: String(id), date, exercises, completed: true, retroactive: false,
  archetype: 'push', secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null, workoutTypes: ['chest'] });
const derive = (sessions, today) => deriveBuildState(sessions, new Date(`${today}T12:00:00`));
const weekOf = (date) => toLocalCalendarDate(getStartOfWeek(date));

// ---- Fix 1: ceremonies are only consumed when seen
const runWithLog = () => { const log = []; return { log, run: createPresentationRun({ commit: () => log.push('commit'), release: () => log.push('release') }) }; };

test('persistence: the final beat commits once; nothing is released afterwards', () => {
  const { log, run } = runWithLog();
  run.finalBeat(); run.finalBeat(); run.skip(); run.dispose();
  assert.deepEqual(log, ['commit']);
  assert.equal(run.status, 'committed');
});

test('persistence: Skip commits', () => {
  const { log, run } = runWithLog();
  run.skip(); run.dispose();
  assert.deepEqual(log, ['commit']);
});

test('persistence: background before the final beat ends the run without persisting', () => {
  const { log, run } = runWithLog();
  assert.deepEqual(['inactive', 'background'].map((state) => run.appState(state)), ['pause', 'end']);
  assert.deepEqual(log, ['release']);
  assert.equal(run.appState('active'), 'none');
  run.finalBeat(); run.dispose();
  assert.deepEqual(log, ['release'], 'an ended run can never commit');
});

test('persistence: inactive pauses and active resumes, without committing or releasing', () => {
  const { log, run } = runWithLog();
  assert.equal(run.appState('inactive'), 'pause');
  assert.equal(run.paused, true);
  assert.equal(run.appState('inactive'), 'none');
  assert.equal(run.appState('active'), 'resume');
  assert.equal(run.paused, false);
  assert.equal(run.appState('active'), 'none');
  assert.deepEqual(log, []);
  run.finalBeat();
  // After the final beat, backgrounding only pauses: the screen waits for Done.
  assert.deepEqual(['inactive', 'background', 'active'].map((state) => run.appState(state)), ['pause', 'none', 'resume']);
  assert.deepEqual(log, ['commit']);
});

test('persistence: leaving early releases; a failure fallback counts as seen', () => {
  const early = runWithLog(); early.run.dispose(); early.run.dispose();
  assert.deepEqual(early.log, ['release']);
  const failed = runWithLog(); failed.run.failure(); failed.run.dispose();
  assert.deepEqual(failed.log, ['commit']);
});

test('casting gate: a claim is held, not written, until commit; release lets it play again', async () => {
  const storage = memoryStorage();
  const gate = createCastingGate();
  gate.issue('s1');
  assert.equal(await gate.claim('s1', storage), true);
  assert.equal(storage.values.size, 0, 'nothing persisted while playing');
  gate.release('s1');
  assert.equal(await gate.claim('s1', storage), true, 'released (backgrounded) casting plays again');
  // A force-quit before the final beat: storage is untouched, so nothing is used up.
  assert.equal(storage.values.size, 0);
  await gate.commit('s1', storage);
  assert.equal(storage.values.get('stack.build.casting.v1:s1'), 'consumed');
  const relaunched = createCastingGate();
  relaunched.issue('s1');
  assert.equal(await relaunched.claim('s1', storage), false, 'no replay once persisted');
});

test('fusion coordinator: the week is held until commit; release and force-quit replay it', async () => {
  const state = derive([session(1, '2026-09-15')], '2026-09-23');
  const storage = memoryStorage();
  await storage.setItem(FUSION_MARKER_KEY, JSON.stringify({ version: 1, observedWeek: '2026-09-14' }));
  const coordinator = createFusionCoordinator(storage);
  assert.deepEqual(await coordinator.claim(state), { weekId: 'week:2026-09-14', builtBefore: 0 });
  assert.equal(await coordinator.claim(state), null, 'one presentation at a time');
  assert.equal(readFusionMarker(storage.values.get(FUSION_MARKER_KEY)).observedWeek, '2026-09-14', 'not persisted while playing');
  coordinator.release();
  assert.deepEqual(await coordinator.claim(state), { weekId: 'week:2026-09-14', builtBefore: 0 }, 'backgrounded: plays again on the next entry');
  assert.deepEqual(await createFusionCoordinator(storage).claim(state), { weekId: 'week:2026-09-14', builtBefore: 0 }, 'force-quit: plays again');
  await coordinator.commit();
  assert.equal(readFusionMarker(storage.values.get(FUSION_MARKER_KEY)).observedWeek, '2026-09-21');
  assert.deepEqual(coordinator.getSnapshot(), { version: 1, observedWeek: '2026-09-21' }, 'Home sees the commit without a read');
  assert.equal(await coordinator.claim(state), null);
  assert.equal(await createFusionCoordinator(storage).claim(state), null, 'no replay once persisted');
});

test('fusion coordinator: a stale entry never holds the week, and load() reads once', async () => {
  const state = derive([session(1, '2026-09-15')], '2026-09-23');
  const storage = memoryStorage();
  await storage.setItem(FUSION_MARKER_KEY, JSON.stringify({ version: 1, observedWeek: '2026-09-14' }));
  let reads = 0;
  const counted = { getItem: async (key) => { reads++; return storage.getItem(key); }, setItem: storage.setItem };
  const coordinator = createFusionCoordinator(counted);
  assert.equal(coordinator.getSnapshot(), undefined);
  await Promise.all([coordinator.load(), coordinator.load()]);
  assert.deepEqual(coordinator.getSnapshot(), { version: 1, observedWeek: '2026-09-14' });
  await coordinator.load();
  assert.equal(reads, 1);
  assert.equal(await coordinator.claim(state, () => true), null);
  assert.deepEqual(await coordinator.claim(state), { weekId: 'week:2026-09-14', builtBefore: 0 }, 'the stale claim held nothing');
});

// ---- Fix 3: static parity
const piece = ({ records = [], liftsUp = 0 } = {}) => ({
  id: 'session:x', sessionId: 'x', records,
  comparisons: Array.from({ length: liftsUp }, (_, index) => ({ exerciseName: `Lift ${index}`, loadType: 'external_weight', previousSessionId: 'p', comparableSets: 1, improvedSets: [{ regularSetIndex: 0, previous: { weightKg: 50, reps: 8 }, current: { weightKg: 55, reps: 8 } }] })),
  metrics: { workouts: 1, volumeKg: 5240, liftsUp, records: records.length },
});
const record = (exerciseName, weight, reps) => ({ exerciseName, previous: { weight: weight - 5, reps }, current: { weight, reps } });
const casting = (options, context = {}) => castingCopy({ piece: piece(options), category: 'Push', weekPosition: 2, firstEver: false, unit: 'kg', ...context });

test('static casting: baseline (first piece) shows Beat 4 only, with the baseline line', () => {
  const copy = casting({}, { firstEver: true, weekPosition: 1 });
  const content = castingStaticContent(copy);
  assert.equal(content.record, null);
  assert.deepEqual(content.landing, { title: 'Stacked.', subtitle: 'Your first piece.', metrics: [{ value: '5,240 KG', label: 'MOVED' }], baseline: 'Every lift today sets your baseline.' });
  assert.equal(castingAnnouncement(copy), 'Stacked. Your first piece. 5,240 KG MOVED. Every lift today sets your baseline.');
});

test('static casting: a PR shows the NEW RECORD block above Beat 4; progression rows are omitted', () => {
  const copy = casting({ records: [record('Bench press', 100, 5)], liftsUp: 2 });
  const content = castingStaticContent(copy);
  assert.deepEqual(content.record, { heading: 'NEW RECORD', lines: ['Bench press · 100 kg × 5'], closing: 'Your best yet.' });
  assert.deepEqual(Object.keys(content), ['record', 'landing'], 'no progression rows');
  assert.deepEqual(content.landing.metrics, [{ value: '5,240 KG', label: 'MOVED' }, { value: '2', label: 'LIFTS UP' }, { value: '1', label: 'PR' }]);
  assert.equal(content.landing.baseline, null);
  assert.equal(castingAnnouncement(copy), 'NEW RECORD. Bench press · 100 kg × 5. Your best yet. Stacked. Second piece this week. 5,240 KG MOVED. 2 LIFTS UP. 1 PR.');
});

test('static casting: no PR and not the first piece is Beat 4 alone', () => {
  const content = castingStaticContent(casting({ liftsUp: 1 }));
  assert.equal(content.record, null);
  assert.equal(content.landing.subtitle, 'Second piece this week.');
});

test('static fusion: Beat 3 in full with the count at its final value', () => {
  const sessions = [session(1, '2026-09-08'), session(2, '2026-09-15', [lift('Bench press', [set(60, 8), set(60, 6)])])];
  const state = derive(sessions, '2026-09-23');
  const copy = fusionCopy({ state, weekId: 'week:2026-09-14', unit: 'kg', builtBefore: 1, category: (item) => pieceCategory(sessions.find((s) => s.id === item.sessionId), item.label) });
  const content = fusionStaticContent(copy);
  assert.deepEqual(content.sealed, { kicker: '14–20 SEP · SEALED', title: 'One week.\nOne layer.', summary: '1 PIECE · 840 KG MOVED', thickest: null });
  assert.equal(content.stackLabel, 'YOUR STACK');
  assert.equal(content.built, '2 weeks built');
  assert.equal(fusionAnnouncement(copy), 'One week. One layer. 1 PIECE · 840 KG MOVED. 2 weeks built.');
});

// ---- Fix 4: Home doesn't spoil the week close
const home = (options) => { const { kicker, title, detail } = homeModuleCopy(options); return [kicker, title, detail]; };

test('Home pending close: pre-close count and "Last week became a layer."', () => {
  assert.deepEqual(home({ seen: true, weeksBuilt: 4, piecesThisWeek: 1, pendingClose: { builtBefore: 3, previousWeek: true } }), ['YOUR STACK', '3 weeks built', 'Last week became a layer.']);
  assert.deepEqual(home({ seen: true, weeksBuilt: 2, piecesThisWeek: 0, pendingClose: { builtBefore: 1, previousWeek: true } }), ['YOUR STACK', '1 week built', 'Last week became a layer.']);
  assert.equal(homeModuleCopy({ seen: true, weeksBuilt: 4, piecesThisWeek: 0, pendingClose: { builtBefore: 3, previousWeek: true } }).a11y, 'Your Stack. 3 weeks built. Last week became a layer.');
});

test('Home pending close: an older week reads "Your latest week", and a pre-close count of 0 is omitted', () => {
  assert.deepEqual(home({ seen: true, weeksBuilt: 5, piecesThisWeek: 0, pendingClose: { builtBefore: 4, previousWeek: false } }), ['YOUR STACK', '4 weeks built', 'Your latest week became a layer.']);
  assert.deepEqual(home({ seen: true, weeksBuilt: 1, piecesThisWeek: 2, pendingClose: { builtBefore: 0, previousWeek: true } }), ['YOUR STACK', 'Last week became a layer.', null]);
  assert.deepEqual(home({ seen: true, weeksBuilt: 1, piecesThisWeek: 0, pendingClose: { builtBefore: 0, previousWeek: false } }), ['YOUR STACK', 'Your latest week became a layer.', null]);
});

test('Home pending close: the not-seen-intro states take priority; no pending keeps the usual copy', () => {
  assert.deepEqual(home({ seen: false, weeksBuilt: 3, piecesThisWeek: 0, pendingClose: { builtBefore: 2, previousWeek: true } }), ['YOUR STACK', "You've already built 3 weeks.", 'See it']);
  assert.deepEqual(home({ seen: true, weeksBuilt: 3, piecesThisWeek: 0, pendingClose: null }), ['YOUR STACK', '3 weeks built', 'This week is open']);
});

test('pending close from the cheap selector matches fusion claim() on fixtures and edge cases', () => {
  const current = weekOf(MONOLITH_DEMO_NOW);
  for (const weeks of [12, 104, 260]) {
    const sessions = makeMonolithDemo(weeks);
    const { state } = { state: deriveBuildState(sessions, MONOLITH_DEMO_NOW) };
    const counts = buildCounts(sessions, current);
    for (const back of [0, 1, 2, 5, 9, 20, 60]) {
      const observed = new Date(MONOLITH_DEMO_NOW); observed.setDate(observed.getDate() - back * 7);
      const marker = { version: 1, observedWeek: weekOf(observed) };
      const expected = reconcileFusion(state, marker);
      const pending = pendingWeekClose(counts, current, marker);
      assert.equal(pending ? `week:${pending.weekStart}` : null, expected.weekId, `${weeks}/${back}`);
      if (pending) assert.equal(pending.builtBefore, expected.builtBefore, `${weeks}/${back} builtBefore`);
    }
    assert.equal(pendingWeekClose(counts, current, null), null, 'Build never entered: nothing pending');
  }
  // Latest week that is not the previous calendar week, with nothing built before it.
  const sessions = [session(1, '2026-09-08')];
  const counts = buildCounts(sessions, '2026-09-21');
  assert.deepEqual(pendingWeekClose(counts, '2026-09-21', { version: 1, observedWeek: '2026-09-07' }), { builtBefore: 0, weekStart: '2026-09-07', previousWeek: false });
  assert.equal(reconcileFusion(derive(sessions, '2026-09-23'), { version: 1, observedWeek: '2026-09-07' }).weekId, 'week:2026-09-07');
  assert.equal(pendingWeekClose(counts, '2026-09-21', { version: 1, observedWeek: '2026-09-21' }), null, 'already observed');
});

// ---- Fix 5: one bad row doesn't take down Home
test('conflicting duplicate session IDs keep the first row, never throw, and counts agree', () => {
  const first = session(7, '2026-09-15');
  const conflicting = { ...session(7, '2026-09-22'), exercises: [lift('Squat', [set(100, 5)])] };
  const state = derive([first, conflicting, session(8, '2026-09-22')], '2026-09-23');
  assert.deepEqual(state.pieces.map((item) => [item.sessionId, item.date]), [['7', '2026-09-15'], ['8', '2026-09-22']]);
  const counts = buildCounts([first, conflicting, session(8, '2026-09-22')], '2026-09-21');
  assert.deepEqual([counts.weeksBuilt, counts.piecesThisWeek], [1, 1]);
  // An invalid first row still wins, exactly as the derivation keeps it (and then drops it).
  const invalidFirst = [{ ...session(9, 'not a date') }, session(9, '2026-09-22')];
  assert.equal(derive(invalidFirst, '2026-09-23').pieces.length, 0);
  assert.equal(buildCounts(invalidFirst, '2026-09-21').hasHistory, false);
});

// ---- Fix 6: page 4 can always be left
test('page 4 reveals its call to action 3 s after the page is shown', () => {
  assert.equal(PAGE4_CTA_FALLBACK_MS, 3000);
  const timers = fakeTimers(); let revealed = 0;
  scheduleCtaFallback(() => revealed++, timers);
  timers.advance(2999);
  assert.equal(revealed, 0);
  timers.advance(1);
  assert.equal(revealed, 1);
  const left = fakeTimers(); let early = 0;
  const cancel = scheduleCtaFallback(() => early++, left);
  left.advance(1500); cancel(); left.advance(10_000);
  assert.equal(early, 0, 'leaving the page (or the animation revealing it) cancels the fallback');
});

// ---- Fix 7 + 8: navigation and back-stack order
const fakeRouter = (stack) => ({
  stack,
  push(href) { stack.push(typeof href === 'string' ? href : href.pathname); },
  back() { stack.pop(); },
  canGoBack() { return stack.length > 1; },
  dismissTo(href) { const index = stack.lastIndexOf(href); if (index >= 0) stack.length = index + 1; else stack[stack.length - 1] = href; },
  replace(href) { stack[stack.length - 1] = typeof href === 'string' ? href : href.pathname; },
});

test('unpacked week route: Monolith → week → workout, then Back, Back returns to Monolith', () => {
  assert.deepEqual(unpackedWeekHref('2026-09-14', 'saved'), { pathname: '/build-case/[week]', params: { week: '2026-09-14', source: 'saved' } });
  const router = fakeRouter(['/', '/build']);
  performBuildIntent(router, buildIntents.unpackWeek('2026-09-14', 'saved'));
  performBuildIntent(router, buildIntents.viewWorkout('42'));
  assert.deepEqual(router.stack, ['/', '/build', '/build-case/[week]', '/workout-summary']);
  router.back();
  assert.deepEqual(router.stack.at(-1), '/build-case/[week]', 'Back returns to the unpacked week');
  performBuildIntent(router, buildIntents.closeWeek(), '/build-case');
  assert.deepEqual(router.stack, ['/', '/build'], 'and then to Monolith, not the grid');
});

test('unpacked week route: Case grid → week → Close returns to the grid, then to Monolith', () => {
  const router = fakeRouter(['/', '/build']);
  performBuildIntent(router, buildIntents.openCase('saved'));
  performBuildIntent(router, buildIntents.unpackWeek('2026-09-14', 'saved'));
  assert.deepEqual(router.stack, ['/', '/build', '/build-case', '/build-case/[week]']);
  performBuildIntent(router, buildIntents.closeWeek(), '/build-case');
  assert.deepEqual(router.stack.at(-1), '/build-case');
  performBuildIntent(router, buildIntents.closeWeek());
  assert.deepEqual(router.stack, ['/', '/build']);
  const deepLink = fakeRouter(['/build-case/[week]']);
  performBuildIntent(deepLink, buildIntents.closeWeek(), '/build-case');
  assert.deepEqual(deepLink.stack, ['/build-case'], 'a deep link closes to the grid');
});

test('"Start a workout" returns to Home without replacing the stack', () => {
  const router = fakeRouter(['/', '/build']);
  performBuildIntent(router, buildIntents.startWorkout());
  assert.deepEqual(router.stack, ['/']);
  const fromSettings = fakeRouter(['/', '/settings', '/build']);
  performBuildIntent(fromSettings, buildIntents.startWorkout());
  assert.deepEqual(fromSettings.stack, ['/']);
});
