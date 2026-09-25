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

test('introPages: a failed write still marks the intro seen for this app session', async () => {
  const introduction = createBuildIntroduction({ getItem: async () => null, setItem: async () => { throw new Error('write failed'); } });
  pages.createIntroExit(introduction).exit('back');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await introduction.shouldShow(), false);
});
