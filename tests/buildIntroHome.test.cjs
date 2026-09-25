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
const { homeModuleCopy } = load('features/build/homeModuleCopy.ts');
const intro = load('features/build/introCopy.ts');
const pages = load('features/build/introPages.ts');
const { createBuildIntroduction, BUILD_INTRO_KEY } = load('features/build/introduction.ts');
const home = (seen, weeksBuilt, piecesThisWeek) => { const { kicker, title, detail } = homeModuleCopy({ seen, weeksBuilt, piecesThisWeek }); return [kicker, title, detail]; };

test('Home: seen intro with weeks built, pieces this week (plural and singular)', () => {
  assert.deepEqual(home(true, 11, 2), ['YOUR STACK', '11 weeks built', '2 pieces this week']);
  assert.deepEqual(home(true, 1, 1), ['YOUR STACK', '1 week built', '1 piece this week']);
});

test('Home: seen intro, 0 pieces this week', () => {
  assert.deepEqual(home(true, 4, 0), ['YOUR STACK', '4 weeks built', 'This week is open']);
  assert.deepEqual(home(true, 1, 0), ['YOUR STACK', '1 week built', 'This week is open']);
});

test('Home: seen intro, 0 weeks built but pieces this week never says "0 weeks built"', () => {
  assert.deepEqual(home(true, 0, 3), ['YOUR STACK', '3 pieces this week', null]);
  assert.deepEqual(home(true, 0, 1), ['YOUR STACK', '1 piece this week', null]);
});

test('Home: not seen intro, weeks built (singular spelled out)', () => {
  assert.deepEqual(home(false, 7, 2), ['YOUR STACK', "You've already built 7 weeks.", 'See it']);
  assert.deepEqual(home(false, 1, 0), ['YOUR STACK', "You've already built one week.", 'See it']);
});

test('Home: not seen intro, 0 weeks built, pieces this week', () => {
  assert.deepEqual(home(false, 0, 3), ['YOUR STACK', 'Your first pieces are in.', 'See it']);
  assert.deepEqual(home(false, 0, 1), ['YOUR STACK', 'Your first piece is in.', 'See it']);
});

test('Home: no history, seen or not', () => {
  assert.deepEqual(home(false, 0, 0), ['YOUR STACK', 'Starts with your next workout.', null]);
  assert.deepEqual(home(true, 0, 0), ['YOUR STACK', 'Starts with your next workout.', null]);
});

test('Home: "0 weeks built" never renders, and the spoken label reads as sentences', () => {
  for (const seen of [true, false]) for (const weeks of [0, 1, 2, 12]) for (const pieces of [0, 1, 2]) {
    const copy = homeModuleCopy({ seen, weeksBuilt: weeks, piecesThisWeek: pieces });
    assert.ok(![copy.title, copy.detail, copy.a11y].some((text) => text && /\b0 weeks?\b/.test(text)), `${seen}/${weeks}/${pieces}`);
  }
  assert.equal(homeModuleCopy({ seen: true, weeksBuilt: 11, piecesThisWeek: 2 }).a11y, 'Your Stack. 11 weeks built. 2 pieces this week.');
  assert.equal(homeModuleCopy({ seen: false, weeksBuilt: 1, piecesThisWeek: 0 }).a11y, "Your Stack. You've already built one week. See it.");
});

test('intro copy: four pages, exact strings, position, CTA with and without history', () => {
  assert.deepEqual(intro.INTRO_PAGES.map((page) => page.title), ['Every workout\nstacks up.', 'Progress\nshows.', 'Every week\nbecomes a layer.', "Don't slack.\nJust stack."]);
  assert.deepEqual(intro.INTRO_PAGES.map((page) => page.body), [
    'Finish a session and it becomes a piece of your Stack. Stay consistent and it keeps building.',
    'Beat your last numbers and the piece grows thicker. Hit a PR and it lands with a line of gold.',
    'When the week ends, its pieces press into one block. Look back and see exactly where you pushed, and where you eased off.',
    'Get to the gym as often as you can. Every session you finish goes up.',
  ]);
  assert.equal(intro.introPosition(1), '2 / 4');
  assert.equal(intro.introAnnouncement(3), "Introduction 4 of 4. Don't slack. Just stack.");
  assert.equal(intro.introNextLabel(0), 'Continue to introduction 2 of 4');
  assert.equal(intro.introCta(true, true), 'See your Stack');
  assert.equal(intro.introCta(true, false), 'Start building');
  assert.equal(intro.introCta(false, true), 'Loading your Stack…');
});

test('introPages: played = finished or visited', () => {
  const finished = [true, false, false, false];
  const visited = new Set([1]);
  assert.deepEqual([0, 1, 2, 3].map((page) => pages.isPlayed(page, finished, visited)), [true, true, false, false]);
  assert.equal(pages.isPlayed(2, [false, false, false, false], new Set()), false);
});

test('introPages: Skip and the next arrow only on pages 1–3; offsets settle on a page', () => {
  assert.deepEqual([0, 1, 2, 3].map(pages.showsSkip), [true, true, true, false]);
  assert.deepEqual([0, 1, 2, 3].map(pages.showsNext), [true, true, true, false]);
  assert.deepEqual([0, 190, 402, 1206, 5000, -20].map((x) => pages.pageFromOffset(x, 402)), [0, 0, 1, 3, 3, 0]);
  assert.equal(pages.pageFromOffset(300, 0), 0);
});

test('introPages: every exit marks the intro seen, once', async () => {
  for (const reason of ['skip', 'cta', 'back', 'dismiss']) {
    const values = new Map();
    const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
    const gate = pages.createIntroExit(createBuildIntroduction(storage));
    assert.equal(gate.exit(reason), true);
    assert.equal(gate.exit('dismiss'), false, 'a later unmount does not exit twice');
    assert.equal(gate.exited, reason);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual([...values.entries()], [[BUILD_INTRO_KEY, 'seen']], reason);
    assert.equal(await createBuildIntroduction(storage).shouldShow(), false, `${reason} is remembered`);
  }
});

test('introduction: reset shows it again, in memory and in storage', async () => {
  const values = new Map([[BUILD_INTRO_KEY, 'seen']]);
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } };
  const introduction = createBuildIntroduction(storage);
  assert.equal(await introduction.shouldShow(), false);
  await introduction.reset();
  assert.equal(introduction.getSnapshot(), false);
  assert.equal(await introduction.shouldShow(), true);
  assert.equal(await createBuildIntroduction(storage).shouldShow(), true, 'reset is persisted');
});

test('introduction: a user who dismissed v1 sees the introduction again', async () => {
  const storage = { getItem: async (key) => (key === 'stack.build.introduction.v1' ? 'seen' : null), setItem: async () => {} };
  assert.equal(await createBuildIntroduction(storage).shouldShow(), true);
});

test('introPages: a failed write still marks the intro seen for this app session', async () => {
  const introduction = createBuildIntroduction({ getItem: async () => null, setItem: async () => { throw new Error('write failed'); } });
  pages.createIntroExit(introduction).exit('back');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await introduction.shouldShow(), false);
});

test('introOverview: every week drops in from above, lands inside the frame, and the camera ends on the whole tower', () => {
  const overview = load('features/build/introOverview.ts');
  const { cameraFrame } = load('features/build/monolithModel.ts');
  const { layoutSlabs, weeklyHeight, BASE_HEIGHT, DEFAULT_TUNING } = load('features/build/model.ts');
  const COS = Math.hypot(8, 10) / Math.hypot(8, 6, 10);
  const slab = (heights) => ({ height: weeklyHeight(heights.map((height) => ({ height })), DEFAULT_TUNING.compression) });
  // Mirrors BuildEntry's page 4 fixture: page 3's five weeks, then seven more dropped on top (no gaps).
  const base = [{ height: 1.08 }, { height: 1.32 }, { height: 0.52 }, { height: 0.94 }, slab([1, 1, 1, 1.45, 1])];
  const drops = [3, 4, 2, 4, 5, 3, 4].map((sessions, week) => slab(Array.from({ length: sessions }, (_, session) => 1 + ((week + session) % 3) * 0.15)));
  const { items, top } = layoutSlabs([...base, ...drops], 0);
  const dropItems = items.slice(base.length);
  const heights = dropItems.map(({ slab: s }) => s.height * BASE_HEIGHT);
  // How far a 2.22-wide top face's corners reach above its centre on screen, from the camera's (8, 6, 10) direction.
  const n = Math.hypot(8, 6, 10), f = [-8 / n, -6 / n, -10 / n], rl = Math.hypot(f[2], f[0]), r = [-f[2] / rl, f[0] / rl];
  const cornerReach = 1.11 * (Math.abs(r[1] * f[1]) + Math.abs(r[0] * f[1]));
  for (const [width, height] of [[340, 380], [340, 250], [300, 300], [260, 380]]) {
    const closeZoom = cameraFrame(top, width, height, false, { bottom: 0, top: 0.6 }).zoom;
    const path = { closeZoom, handoffY: 0.08 + 0.2 * height / (closeZoom * COS), overview: cameraFrame(top, width, height, true) };
    const lifts = overview.overviewDropLifts(dropItems.map(({ y }) => y), dropItems[0].y, heights, height, COS, path);
    assert.ok(lifts.every((lift) => lift >= 3.2 && lift < 6), `${width}x${height}: drop heights ${lifts}`);
    let progress = 0;
    let lastZoom = closeZoom;
    for (let elapsed = 0; elapsed <= overview.OVERVIEW_PULLBACK_END + 400; elapsed += 1000 / 60) {
      // A plain (unsprung) follow is the worst case for lag: the goal itself must keep landings in frame.
      progress = Math.max(progress, overview.overviewProgressTarget(elapsed, dropItems[0].y, heights, height, COS, path));
      const camera = overview.overviewCamera(progress, path);
      assert.ok(Math.abs(Math.log(camera.zoom / lastZoom)) * height / 2 < 4, `${width}x${height}: zoom jumps at ${Math.round(elapsed)}ms`);
      lastZoom = camera.zoom;
      const landedTop = dropItems.reduce((sum, item, index) => (elapsed >= overview.overviewLanding(index) ? item.y + heights[index] : sum), dropItems[0].y);
      const screenTop = (landedTop - camera.targetY) * COS + cornerReach;
      assert.ok(screenTop <= height / 2 / camera.zoom, `${width}x${height}: a landed week is above the frame at ${Math.round(elapsed)}ms`);
      dropItems.forEach((item, index) => {
        const drop = overview.overviewDrop(elapsed, index, lifts[index]);
        if (drop.visible && elapsed - overview.overviewLanding(index) + 300 < 17) {
          // Its lowest corner is still above the top edge on its first frame.
          assert.ok((item.y + drop.lift - camera.targetY) * COS - cornerReach > height / 2 / camera.zoom, `${width}x${height}: week ${index} appears inside the frame`);
        }
      });
    }
    assert.equal(progress, 1, `${width}x${height}: ends on the overview`);
  }
});
