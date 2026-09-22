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
  assert.ok(!/workoutStore|workoutDatabase/.test(resolved), 'Evidence must not load the native store or database');
  if (cache.has(resolved)) return cache.get(resolved);
  const exports = {};
  cache.set(resolved, exports);
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, (name) => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw new Error(`Unexpected runtime dependency: ${name}`);
  });
  return exports;
}
const { deriveBuildState } = load('features/build/evidence.ts');
const { adaptBuildHistory, buildStateToSlabs } = load('features/build/adapter.ts');
const { EVIDENCE_DEMO_SESSIONS, EVIDENCE_DEMO_NOW } = load('features/build/evidenceDemo.ts');
const { splitColors } = load('constants/theme.ts');
const set = (weight, reps, extra = {}) => ({ weight, reps, completed: true, ...extra });
const lift = (name, sets, loadType = 'external_weight') => ({ name, sets, loadType });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false,
  archetype: null, secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null, workoutTypes: ['chest'], ...extra });
const now = () => new Date(2026, 8, 23, 12);
const derive = (sessions, rules) => deriveBuildState(sessions, now(), rules);
function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  return value;
}

test('only verified completions create pieces, including an honest zero-metric completed session', () => {
  const history = [
    session(1, '2026-09-21', []),
    session(2, '2026-09-22', [lift('Bench', [set(50, 8)])]),
    session(3, '2026-09-22', [lift('Bench', [set(999, 8)])], { retroactive: true }),
    session(4, '2026-09-22', [lift('Bench', [set(999, 8)])], { completed: false }),
  ];
  const result = derive(history);
  assert.deepEqual(result.pieces.map((piece) => piece.sessionId), ['1', '2']);
  assert.equal(result.pieces[0].height, 1);
  assert.deepEqual(result.metrics, { workouts: 2, volumeKg: 400, liftsUp: 0, records: 0 });
});

test('0/1/2/3+ improved exercises produce the four buckets with evidence and no input mutation', () => {
  for (let count = 0; count <= 4; count++) {
    const prior = session(1, '2026-09-14', Array.from({ length: 4 }, (_, i) => lift(`Lift ${i}`, [set(40, 8)])));
    const current = session(2, '2026-09-22', Array.from({ length: 4 }, (_, i) => lift(`Lift ${i}`, [set(i < count ? 42.5 : 40, 8)])));
    const input = deepFreeze([current, prior]);
    const result = derive(input);
    assert.deepEqual(result, derive([...input].reverse()));
    assert.equal(result.pieces[1].height, [1, 1.15, 1.3, 1.45][Math.min(3, count)]);
    assert.equal(result.pieces[1].eligibleExercises, 4);
    assert.equal(result.pieces[1].metrics.liftsUp, count);
    assert.equal(result.pieces[1].comparisons.filter((c) => c.improvedSets.length).length, count);
    if (count) assert.deepEqual(result.pieces[1].comparisons[0].improvedSets[0], {
      regularSetIndex: 0, previous: { weightKg: 40, reps: 8 }, current: { weightKg: 42.5, reps: 8 },
    });
  }
});

test('skipped regular slots retain their positions and bonus sets cannot create thickness', () => {
  const history = [
    session(1, '2026-09-14', [lift('Bench', [set(100, 8), set(50, 8), set(200, 1, { type: 'pr' })])]),
    session(2, '2026-09-22', [lift('Bench', [set(100, 8, { skipped: true }), set(50, 9), set(201, 1, { type: 'extra' })])]),
  ];
  const piece = derive(history).pieces[1];
  assert.equal(piece.metrics.liftsUp, 1);
  assert.equal(piece.comparisons[0].comparableSets, 1);
  assert.equal(piece.comparisons[0].improvedSets[0].regularSetIndex, 1);
  assert.equal(piece.metrics.volumeKg, 651);
  const bonusOnly = derive([history[0], session(3, '2026-09-23', [lift('Bench', [set(201, 1, { type: 'extra' })])])]).pieces[1];
  assert.equal(bonusOnly.height, 1);
  assert.equal(bonusOnly.metrics.records, 1);
});

test('load with fewer reps may earn the existing load-first PR but not progression thickness', () => {
  const piece = derive([
    session(1, '2026-09-14', [lift('Bench', [set(80, 8)])]),
    session(2, '2026-09-22', [lift('Bench', [set(85, 5)])]),
  ]).pieces[1];
  assert.equal(piece.height, 1);
  assert.equal(piece.metrics.liftsUp, 0);
  assert.equal(piece.records.length, 1);
  assert.equal(piece.records[0].previous.weight, 80);
  assert.equal(piece.records[0].current.weight, 85);
});

test('bodyweight progression uses reps and comparisons do not cross load types', () => {
  const result = derive([
    session(1, '2026-09-14', [lift('Push-up', [set(0, 10)], 'bodyweight')]),
    session(2, '2026-09-22', [lift('Push-up', [set(0, 12)], 'bodyweight')]),
    session(3, '2026-09-23', [lift('Push-up', [set(10, 12)], 'external_weight')]),
  ]);
  assert.equal(result.pieces[1].metrics.liftsUp, 1);
  assert.equal(result.pieces[1].metrics.records, 1);
  assert.equal(result.pieces[1].metrics.volumeKg, 0);
  assert.equal(result.pieces[2].eligibleExercises, 0);
  assert.equal(result.pieces[2].height, 1);
});

test('skipped-only appearances do not erase usable history; new regular sets alone do not count', () => {
  const pieces = derive([
    session(1, '2026-09-14', [lift('Bench', [set(50, 8)])]),
    session(2, '2026-09-15', [lift('Bench', [set(50, 8, { skipped: true })])]),
    session(3, '2026-09-22', [lift('Bench', [set(50, 9)])]),
    session(4, '2026-09-23', [lift('Bench', [set(50, 9), set(60, 9)])]),
  ]).pieces;
  assert.equal(pieces[2].comparisons[0].previousSessionId, '1');
  assert.equal(pieces[2].metrics.liftsUp, 1);
  assert.equal(pieces[3].metrics.liftsUp, 0);
});

test('first session is baseline, duplicate exercise entries count once, and PR compares all earlier history', () => {
  const pieces = derive([
    session(1, '2026-09-14', [lift('Bench', [set(50, 8)]), lift('Bench', [set(60, 8)])]),
    session(2, '2026-09-15', [lift('Bench', [set(40, 8)])]),
    session(3, '2026-09-22', [lift('Bench', [set(50, 9)])]),
    session(4, '2026-09-23', [lift('Bench', [set(65, 9)]), lift('Bench', [set(70, 9, { type: 'pr' })])]),
  ]).pieces;
  assert.equal(pieces[0].records.length, 0);
  assert.equal(pieces[2].metrics.liftsUp, 1);
  assert.equal(pieces[2].records.length, 0);
  assert.equal(pieces[3].metrics.liftsUp, 1);
  assert.equal(pieces[3].records.length, 1);
  assert.equal(pieces[3].records[0].previous.sessionId, '1');
  assert.equal(pieces[3].records[0].current.weight, 70);
});

test('ties and a manually marked PR set do not award gold; skipped and invalid values never become evidence', () => {
  const pieces = derive([
    session(1, '2026-09-14', [lift('Bench', [set(50, 8)])]),
    session(2, '2026-09-22', [lift('Bench', [set(50, 8, { type: 'pr' }), set(100, 8, { skipped: true }),
      set(200, 8, { completed: false }), set(NaN, 8), set(-10, 8), set(900, 0)])]),
  ]).pieces;
  assert.equal(pieces[1].metrics.records, 0);
  assert.equal(pieces[1].metrics.volumeKg, 400);
  assert.equal(pieces[1].height, 1);
});

test('same-date history uses numeric session IDs and duplicates cannot cast twice', () => {
  const a = session(2, '2026-09-22', [lift('Bench', [set(50, 8)])]);
  const b = session(10, '2026-09-22', [lift('Bench', [set(52.5, 8)])]);
  const state = derive([b, a, a]);
  assert.deepEqual(state.pieces.map((p) => p.sessionId), ['2', '10']);
  assert.equal(state.pieces[1].records[0].previous.sessionId, '2');
  assert.throws(() => derive([a, { ...a, date: '2026-09-23' }]), /Conflicting/);
});

test('category colors follow primary archetype, mixed sessions, and custom/legacy workout types', () => {
  const pieces = derive([
    session(1, '2026-09-21', [], { archetype: 'pull', secondaryArchetype: 'legs' }),
    session(2, '2026-09-21', [], { customSplitId: 4, customSplitWorkoutId: 7, workoutTypes: ['arms', 'core'] }),
    session(3, '2026-09-21', [], { archetype: 'full_body' }),
  ]).pieces;
  assert.equal(pieces[0].color, splitColors.back);
  assert.equal(pieces[0].label, 'Pull + Legs');
  assert.equal(pieces[1].color, splitColors.arms);
  assert.equal(pieces[2].color, splitColors.chest);
});

test('Monday sealing compresses geometry, preserves every piece and gold, and skips empty weeks', () => {
  const history = [session(1, '2026-08-31', [lift('Bench', [set(50, 8)])]), session(2, '2026-09-13', [lift('Bench', [set(55, 8)])])];
  const before = deriveBuildState(history, new Date(2026, 8, 13, 23, 59));
  assert.equal(before.currentWeek.pieces.length, 1);
  const after = deriveBuildState(history, new Date(2026, 8, 14));
  assert.equal(after.currentWeek.pieces.length, 0);
  assert.deepEqual(after.pieces, before.pieces);
  assert.deepEqual(after.sealedWeeks.map((week) => week.weekStart), ['2026-08-31', '2026-09-07']);
  assert.equal(after.sealedWeeks[1].weekEnd, '2026-09-13');
  assert.equal(buildStateToSlabs(after)[1].layers[0].record, true);
  assert.deepEqual(after.sealedWeeks[1].previousActiveWeek, { weekStart: '2026-08-31', volumeDeltaKg: 40 });
  const monthsLater = deriveBuildState(history, new Date(2027, 0, 1));
  assert.equal(monthsLater.sealedWeeks.length, 2);
  assert.equal(buildStateToSlabs(monthsLater).length, 2);
  assert.deepEqual(monthsLater.sealedWeeks.flatMap((week) => week.pieces), after.pieces);
});

test('local weeks behave across year rollover, DST and non-UTC time zones', () => {
  const previousTZ = process.env.TZ;
  try {
    for (const zone of ['America/New_York', 'Asia/Kolkata', 'UTC']) {
      process.env.TZ = zone;
      const year = deriveBuildState([session(1, '2025-12-31', [])], new Date(2026, 0, 1));
      assert.equal(year.currentWeek.weekStart, '2025-12-29');
      assert.equal(year.currentWeek.weekEnd, '2026-01-04');
      for (const [date, yearNumber, month, day, monday] of [['2026-03-08', 2026, 2, 9, '2026-03-02'], ['2026-11-01', 2026, 10, 2, '2026-10-26']]) {
        const result = deriveBuildState([session(1, date, [])], new Date(yearNumber, month, day));
        assert.equal(result.sealedWeeks[0].weekStart, monday);
        assert.equal(result.sealedWeeks[0].weekEnd, date);
      }
    }
    process.env.TZ = 'Asia/Kolkata';
    assert.equal(deriveBuildState([session(1, '2026-09-20T19:00:00Z', [])], new Date(2026, 8, 21, 12)).currentWeek.pieces.length, 1);
    process.env.TZ = 'America/New_York';
    assert.equal(deriveBuildState([session(1, '2026-09-20T19:00:00Z', [])], new Date(2026, 8, 21, 12)).sealedWeeks.length, 1);
  } finally {
    if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;
  }
});

test('invalid and future-week dates surface diagnostics without fake geometry', () => {
  const state = derive([session(1, 'not-a-date', []), session(2, '2026-02-30', []), session(3, '2026-09-28', [])]);
  assert.deepEqual(state.issues, [{ sessionId: '1', reason: 'invalid-date' }, { sessionId: '2', reason: 'invalid-date' }, { sessionId: '3', reason: 'future-week' }]);
  assert.equal(state.pieces.length, 0);
  assert.equal(state.currentWeek.compositeHeight, 0);
  assert.deepEqual(buildStateToSlabs(state), []);
  assert.throws(() => deriveBuildState([], new Date(NaN)), /valid current date/);
});

test('tuning only changes visual material, respects bounds, and rejects unusable constants', () => {
  const regular = deriveBuildState(EVIDENCE_DEMO_SESSIONS, EVIDENCE_DEMO_NOW);
  const tuned = deriveBuildState(EVIDENCE_DEMO_SESSIONS, EVIDENCE_DEMO_NOW, { heights: [1, 1.2, 1.4, 1.6], compressionFactor: 2, minWeekHeight: 0.5, maxWeekHeight: 1.8 });
  assert.deepEqual(regular.metrics, tuned.metrics);
  assert.equal(tuned.sealedWeeks[0].compositeHeight, 1.8);
  assert.equal(tuned.currentWeek.pieces[0].height, 1.4);
  assert.equal(regular.pieces[0].records.length, 0);
  assert.equal(regular.pieces[1].metrics.records, 3);
  assert.equal(regular.pieces[2].metrics.records, 2);
  for (const rules of [{ compressionFactor: 0 }, { maxWeekHeight: -1 }, { heights: [1, 0, 2, 3] }]) assert.throws(() => derive([], rules), /Build rules/);
});

test('260 weeks retain all workouts while adapting to one mesh input per historical week', () => {
  const clock = new Date(2026, 8, 28, 12);
  const sessions = [];
  for (let week = 0; week < 260; week++) for (let day = 0; day < 4; day++) {
    const date = new Date(clock); date.setDate(date.getDate() - (260 - week) * 7 + day);
    const index = week * 4 + day;
    sessions.push(session(index, date.toISOString(), [lift('Bench', [set(40 + index * 0.5, 8)])]));
  }
  const result = adaptBuildHistory(sessions, clock);
  assert.equal(result.state.pieces.length, 1040);
  assert.equal(result.slabs.length, 260);
  assert.equal(result.state.metrics.records, 1039);
  assert.equal(result.state.metrics.liftsUp, 1039);
  assert.equal(result.state.currentWeek.pieces.length, 0);
  assert.equal(result.state.sealedWeeks.flatMap((week) => week.pieces).length, 1040);
  assert.ok(result.slabs.every((slab) => slab.sealed && slab.layers.length === 4));
});

test('Monolith selection maps each week onto the same slabs used by both cameras', () => {
  const { monolithWeeks, cameraFrame } = load('features/build/monolithModel.ts');
  const { layoutSlabs, BASE_HEIGHT } = load('features/build/model.ts');
  const { makeMonolithDemo, MONOLITH_DEMO_NOW } = load('features/build/monolithDemo.ts');
  for (const count of [0, 12, 104, 260]) {
    const sessions = makeMonolithDemo(count);
    assert.deepEqual(sessions, makeMonolithDemo(count));
    const history = adaptBuildHistory(sessions, MONOLITH_DEMO_NOW);
    deepFreeze(history);
    const before = JSON.stringify(history);
    const entries = monolithWeeks(history.state, history.slabs);
    const { items, top } = layoutSlabs(history.slabs);
    assert.equal(entries.length, history.state.sealedWeeks.length + 1);
    assert.deepEqual(entries.flatMap((entry) => entry.slabIds), history.slabs.map((slab) => slab.id));
    for (const entry of entries) {
      const members = items.filter((item) => entry.slabIds.includes(item.slab.id));
      if (!members.length) { assert.equal(entry.bottom, null); assert.equal(entry.top, null); continue; }
      assert.equal(entry.bottom, members[0].y);
      assert.equal(entry.top, members.at(-1).y + members.at(-1).slab.height * BASE_HEIGHT);
      const range = { bottom: entry.bottom, top: entry.top };
      for (const overview of [true, false]) {
        const frame = cameraFrame(top, 390, 430, overview, range);
        assert.ok(Number.isFinite(frame.zoom) && frame.zoom > 0);
        assert.equal(frame.targetY, overview ? top / 2 : (entry.top + entry.bottom) / 2);
      }
    }
    assert.equal(JSON.stringify(history), before, 'selection and cameras cannot mutate geometry or evidence');
    if (count) {
      assert.equal(history.state.currentWeek.pieces.length, 2);
      assert.ok(history.state.metrics.records > 0);
      assert.ok(history.state.sealedWeeks.length < count, 'demo includes genuine empty weeks');
    } else {
      assert.equal(history.slabs.length, 0);
      assert.equal(entries.length, 1);
      const frame = cameraFrame(top, 390, 430, false);
      assert.ok(frame.zoom > 0 && frame.targetY >= 0);
    }
  }
});

test('Focus ruler retains the selected week and never overlaps label touch targets', () => {
  const { pickRulerMarkers } = load('features/build/monolithModel.ts');
  const markers = Array.from({ length: 12 }, (_, i) => ({ id: String(i), top: i * 20 + 25 }));
  const visible = pickRulerMarkers(markers, '5');
  assert.equal(visible[0].id, '5');
  assert.ok(visible.length >= 3);
  for (const marker of visible) for (const other of visible) if (marker !== other) assert.ok(Math.abs(marker.top - other.top) >= 44);
});

const { reconcileFusion, createFusionCoordinator, readFusionMarker, fusionFrame, FUSION_DURATION_MS, FUSION_MARKER_KEY } = load('features/build/fusion.ts');
const datedHistory = (dates, today) => deriveBuildState(dates.map((date, i) => session(i + 1, date, [lift('Bench', [set(50 + i, 8)])])), new Date(`${today}T12:00:00`));
const fusionMemory = (initial = null) => {
  let value = initial;
  return { getItem: async (key) => { assert.equal(key, FUSION_MARKER_KEY); return value; }, setItem: async (key, next) => { assert.equal(key, FUSION_MARKER_KEY); value = next; } };
};

test('first Build entry accepts sealed backfill without queuing old fusion rewards', () => {
  const state = datedHistory(['2026-08-03', '2026-09-14'], '2026-09-23');
  const result = reconcileFusion(state, null);
  assert.equal(result.weekId, null);
  assert.equal(result.marker.observedWeek, '2026-09-21');
  assert.equal(state.sealedWeeks.length, 2);
  assert.equal(reconcileFusion(state, result.marker).weekId, null);
});

test('Monday boundary picks the completed open week, then consumes the transition', async () => {
  const storage = fusionMemory();
  const coordinator = createFusionCoordinator(storage);
  const sunday = datedHistory(['2026-09-20'], '2026-09-20');
  assert.equal(await coordinator.reconcile(sunday), null);
  assert.equal(sunday.currentWeek.pieces.length, 1);
  const monday = datedHistory(['2026-09-20'], '2026-09-21');
  assert.equal(await coordinator.reconcile(monday), 'week:2026-09-14');
  assert.equal(monday.currentWeek.pieces.length, 0);
  assert.equal(monday.sealedWeeks.length, 1);
  assert.equal(await coordinator.reconcile(monday), null);
  assert.equal(await createFusionCoordinator(storage).reconcile(monday), null, 'relaunch cannot replay an already claimed transition');
});

test('long absence seals every elapsed active week but presents only the latest eligible one', () => {
  const state = datedHistory(['2026-09-14', '2026-09-22', '2026-09-29'], '2026-10-12');
  deepFreeze(state);
  const before = JSON.stringify(state);
  const result = reconcileFusion(state, { version: 1, observedWeek: '2026-09-14' });
  assert.equal(result.weekId, 'week:2026-09-28');
  assert.equal(result.marker.observedWeek, '2026-10-12');
  assert.equal(state.sealedWeeks.length, 3);
  assert.equal(JSON.stringify(state), before);
  assert.equal(reconcileFusion(state, result.marker).weekId, null);
});

test('empty elapsed weeks, older backfills and clock rollback do not create fusion rewards', () => {
  const previous = { version: 1, observedWeek: '2026-09-21' };
  assert.equal(reconcileFusion(datedHistory([], '2026-10-05'), previous).weekId, null);
  assert.equal(reconcileFusion(datedHistory(['2026-09-14'], '2026-09-28'), previous).weekId, null);
  const rollback = reconcileFusion(datedHistory(['2026-09-14'], '2026-09-14'), previous);
  assert.deepEqual(rollback.marker, previous);
  assert.equal(rollback.weekId, null);
});

test('fusion marker rejects damaged, obsolete, non-Monday and invalid calendar values', () => {
  for (const raw of [null, '{', '{}', 'null', JSON.stringify({ version: 2, observedWeek: '2026-09-21' }), JSON.stringify({ version: 1, observedWeek: '2026-09-22' }), JSON.stringify({ version: 1, observedWeek: '2026-02-30' })]) assert.equal(readFusionMarker(raw), null);
  assert.deepEqual(readFusionMarker('{"version":1,"observedWeek":"2026-09-21"}'), { version: 1, observedWeek: '2026-09-21' });
});

test('simultaneous entries claim only one fusion and persist before returning it', async () => {
  const state = datedHistory(['2026-09-14'], '2026-09-21');
  const storage = fusionMemory('{"version":1,"observedWeek":"2026-09-14"}');
  const coordinator = createFusionCoordinator(storage);
  assert.deepEqual(await Promise.all([coordinator.reconcile(state), coordinator.reconcile(state)]), ['week:2026-09-14', null]);
  assert.equal(readFusionMarker(await storage.getItem(FUSION_MARKER_KEY)).observedWeek, '2026-09-21');
});

test('storage failures suppress the presentation while sealed geometry remains available', async () => {
  const state = datedHistory(['2026-09-14'], '2026-09-21');
  const before = JSON.stringify(buildStateToSlabs(state));
  for (const method of ['getItem', 'setItem']) {
    const storage = fusionMemory('{"version":1,"observedWeek":"2026-09-14"}');
    storage[method] = async () => { throw new Error('storage unavailable'); };
    assert.equal(await createFusionCoordinator(storage).reconcile(state), null);
    assert.equal(JSON.stringify(buildStateToSlabs(state)), before);
  }
});

test('fusion uses Monday-local boundaries across DST and year changes', () => {
  const oldTimezone = process.env.TZ;
  try {
    for (const tz of ['America/New_York', 'Asia/Kolkata', 'UTC']) {
      process.env.TZ = tz;
      for (const [sunday, monday, start] of [['2026-03-08', '2026-03-09', '2026-03-02'], ['2026-11-01', '2026-11-02', '2026-10-26'], ['2027-01-03', '2027-01-04', '2026-12-28']]) {
        const state = datedHistory([sunday], monday);
        assert.equal(reconcileFusion(state, { version: 1, observedWeek: start }).weekId, `week:${start}`);
      }
    }
  } finally { if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone; }
});

test('fusion compresses preserved color/PR strata to the exact weekly bounds before seating', () => {
  const { makeFusionPreview } = load('features/build/fusionDemo.ts');
  const { state, weekId } = makeFusionPreview();
  const slab = buildStateToSlabs(state).find((item) => item.id === weekId);
  deepFreeze(slab);
  const before = JSON.stringify(slab);
  const atFusion = fusionFrame(2200, slab.layers, slab.height);
  assert.ok(Math.abs(atFusion.height - slab.height * 0.28) < 1e-9);
  atFusion.pieces.forEach((piece, i) => {
    if (i) assert.ok(Math.abs(piece.y - (atFusion.pieces[i - 1].y + slab.layers[i - 1].height * 0.28 * piece.scaleY)) < 1e-9);
  });
  const phases = new Set();
  for (let elapsed = 0; elapsed <= FUSION_DURATION_MS; elapsed += 10) {
    const frame = fusionFrame(elapsed, slab.layers, slab.height);
    phases.add(frame.phase);
    assert.ok(frame.height > 0 && frame.lift >= 0 && frame.lift <= 1.1);
    assert.equal(frame.pieces.length, slab.layers.length);
  }
  assert.deepEqual([...phases], ['isolate', 'compress', 'fuse', 'seat', 'sealed']);
  assert.equal(fusionFrame(FUSION_DURATION_MS, slab.layers, slab.height).lift, 0);
  assert.equal(fusionFrame(FUSION_DURATION_MS, slab.layers, slab.height).done, true);
  assert.equal(JSON.stringify(slab), before);
  assert.ok(slab.layers.some((layer) => layer.record));
});

const { caseEntries, unpackWeek } = load('features/build/caseModel.ts');
test('Case adds neutral calendar niches only between active weeks', () => {
  const state = derive([session(1, '2026-08-24', []), session(2, '2026-09-14', [])]);
  const entries = caseEntries(state);
  assert.deepEqual(entries.map((entry) => entry.weekStart), ['2026-09-14', '2026-09-07', '2026-08-31', '2026-08-24']);
  assert.deepEqual(entries.map((entry) => !!entry.week), [true, false, false, true]);
  assert.deepEqual(caseEntries(derive([])), []);
});
test('Case reconstructs each session, height, color and earned PR for 260 weeks', () => {
  const { makeMonolithDemo, MONOLITH_DEMO_NOW } = load('features/build/monolithDemo.ts');
  const state = deriveBuildState(makeMonolithDemo(260), MONOLITH_DEMO_NOW);
  const weeks = caseEntries(state).flatMap((entry) => entry.week ? [entry.week] : []);
  assert.equal(weeks.reduce((sum, week) => sum + week.metrics.workouts, 0), state.metrics.workouts);
  assert.equal(weeks.reduce((sum, week) => sum + week.metrics.volumeKg, 0), state.metrics.volumeKg);
  assert.equal(weeks.reduce((sum, week) => sum + week.metrics.records, 0), state.metrics.records);
  assert.equal(new Set(weeks.flatMap((week) => week.pieces.map((piece) => piece.sessionId))).size, state.pieces.length);
  for (const week of weeks) {
    assert.deepEqual(unpackWeek(week), week.pieces.map((piece) => ({ id: piece.id, height: piece.height, sealed: false, layers: [{ color: piece.color, height: piece.height, record: piece.records.length > 0 }] })));
  }
});
test('Case calendar niches cross year and daylight-saving boundaries without missing Mondays', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const state = deriveBuildState([session(1, '2025-12-29', []), session(2, '2026-03-16', [])], new Date(2026, 2, 23));
    const entries = caseEntries(state);
    assert.equal(entries.length, 12);
    assert.equal(entries[0].weekStart, '2026-03-16');
    assert.equal(entries.at(-1).weekStart, '2025-12-29');
    assert.ok(entries.every((entry) => new Date(`${entry.weekStart}T12:00:00`).getDay() === 1));
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('fusion upload window stays bounded for long history and keeps blocks crossing its margin', () => {
  const { fusionVisibleHistory } = load('features/build/fusion.ts');
  const { layoutSlabs, makeHistoryFixture } = load('features/build/model.ts');
  const { cameraFrame } = load('features/build/monolithModel.ts');
  const { items, top } = layoutSlabs(makeHistoryFixture(260));
  const selected = items[259];
  for (const [width, height] of [[393, 350], [850, 250], [320, 800]]) {
    const framing = cameraFrame(top, width, height, false, { bottom: selected.y - .4, top: selected.y + 3 });
    const visible = fusionVisibleHistory(items, selected.y, framing.targetY, height, framing.zoom);
    assert.ok(visible.length > 0 && visible.length < 40);
    assert.equal(visible.at(-1), items[258]);
    const bottom = framing.targetY - height / framing.zoom - 4;
    assert.ok(visible[0].y <= bottom, 'include a slab crossing the lower margin');
    assert.ok(visible.every((item) => item.y < selected.y));
  }
});

const { createBuildIntroduction, BUILD_INTRO_KEY } = load('features/build/introduction.ts');
test('Build introduction persists completion or skip without consuming history events', async () => {
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const intro = createBuildIntroduction(storage);
  assert.equal(await intro.shouldShow(), true);
  assert.equal(await createBuildIntroduction(storage).shouldShow(), true, 'closing before dismissal allows another introduction');
  await intro.dismiss();
  assert.equal(await intro.shouldShow(), false);
  assert.equal(await createBuildIntroduction(storage).shouldShow(), false, 'cold entry remembers dismissal');
  assert.deepEqual([...values.entries()], [[BUILD_INTRO_KEY, 'seen']]);
});
test('Build introduction storage failures never block entry and dismissal survives in memory', async () => {
  const intro = createBuildIntroduction({ getItem: async () => { throw Error('read failed'); }, setItem: async () => { throw Error('write failed'); } });
  assert.equal(await intro.shouldShow(), true);
  await intro.dismiss();
  assert.equal(await intro.shouldShow(), false);
});

const { createBuildPreferences, shouldSkipBuildReward, BUILD_EFFECTS_KEY } = load('features/build/preferences.ts');
test('reduced effects persist, publish to all screens and serialize rapid toggles', async () => {
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const prefs = createBuildPreferences(storage);
  let updates = 0;
  const unsubscribe = prefs.subscribe(() => updates++);
  await prefs.load();
  await Promise.all([prefs.setReduceEffects(true), prefs.setReduceEffects(false), prefs.setReduceEffects(true)]);
  assert.deepEqual(prefs.getSnapshot(), { ready: true, reduceEffects: true });
  assert.equal(values.get(BUILD_EFFECTS_KEY), '1');
  assert.equal(updates, 4);
  unsubscribe();
  const cold = createBuildPreferences(storage);
  await cold.load();
  assert.equal(cold.getSnapshot().reduceEffects, true);
});
test('late preference reads cannot overwrite an explicit choice; failed storage remains usable', async () => {
  let resolve;
  const prefs = createBuildPreferences({ getItem: () => new Promise((done) => { resolve = done; }), setItem: async () => { throw Error('disk unavailable'); } });
  const load = prefs.load();
  await prefs.setReduceEffects(true);
  resolve('0');
  await load;
  assert.deepEqual(prefs.getSnapshot(), { ready: true, reduceEffects: true });
});
test('all accessibility reward exits bypass the timeline without changing training evidence', () => {
  assert.equal(shouldSkipBuildReward(false, false, false, 1), false);
  for (const options of [[true, false, false, 1], [false, true, false, 1], [false, false, true, 1], [false, false, false, 2]]) assert.equal(shouldSkipBuildReward(...options), true);
});
