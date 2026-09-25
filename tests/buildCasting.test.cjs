/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const exportsForTest = {};
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../features/build/casting.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', code)(exportsForTest);
const { castingFrame, CASTING_DURATION_MS, createCastingGate, completionDestination, castingGate, once } = exportsForTest;
const memoryStorage = () => {
  const values = new Map();
  return { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
};

test('casting stays baseline before progression, reveals gold afterward, and lands exactly once', () => {
  for (const height of [1, 1.15, 1.30, 1.45]) {
    assert.equal(castingFrame(750, height).scaleY * height, 1);
    assert.equal(castingFrame(1800, height).scaleY, 1);
    assert.equal(castingFrame(1799, height).gold, 0);
    assert.equal(castingFrame(2400, height).gold, 1);
    assert.equal(castingFrame(2600, height).reveal, 0);
    assert.equal(castingFrame(3800, height).reveal, 1);
    assert.equal(castingFrame(4700, height).lift, 0);
    assert.equal(castingFrame(CASTING_DURATION_MS, height).done, true);
    const phases = new Set();
    for (let ms = 0; ms <= CASTING_DURATION_MS; ms += 10) {
      const frame = castingFrame(ms, height);
      phases.add(frame.phase);
      assert.ok(frame.scaleY > 0 && frame.scaleY <= 1);
      assert.ok(frame.lift >= 0 && frame.lift <= 1.3);
    }
    assert.deepEqual([...phases], ['form', 'progress', 'gold', 'reveal', 'land', 'stacked']);
  }
});

test('history links and cold starts do not animate; concurrent/repeated claims consume one presentation', async () => {
  const gate = createCastingGate();
  const storage = memoryStorage();
  assert.equal(await gate.claim('history', storage), false);
  gate.issue('loading-failure');
  gate.discard('loading-failure');
  assert.equal(await gate.claim('loading-failure', storage), false);
  gate.issue('saved');
  assert.deepEqual(await Promise.all([gate.claim('saved', storage), gate.claim('saved', storage)]), [true, false]);
  // The claim persists once its final beat is shown (or it is skipped).
  await gate.commit('saved', storage);
  gate.issue('saved');
  assert.equal(await gate.claim('saved', storage), false);
  const relaunched = createCastingGate();
  relaunched.issue('saved');
  assert.equal(await relaunched.claim('saved', storage), false);
});

test('presentation storage failures decline casting without retrying or changing a workout', async () => {
  const gate = createCastingGate();
  const storage = memoryStorage();
  storage.getItem = async () => { throw new Error('unavailable storage'); };
  gate.issue('saved');
  assert.equal(await gate.claim('saved', storage), false);
  assert.equal(await gate.claim('saved', memoryStorage()), false);
  // Claiming no longer writes; a failed write when the final beat is shown only allows a replay.
  const writes = createCastingGate();
  const failing = memoryStorage();
  failing.setItem = async () => { throw new Error('unavailable storage'); };
  writes.issue('saved');
  assert.equal(await writes.claim('saved', failing), true);
  await writes.commit('saved', failing);
  assert.equal(await writes.claim('saved', failing), false, 'no retry within the session');
});

test('only successful eligible completion opts in; normal app and retroactive attendance keep summary routing', async () => {
  const session = { id: 'completion', completed: true, retroactive: false };
  assert.equal(completionDestination(undefined, true), null);
  assert.equal(completionDestination(session, false).pathname, '/workout-summary');
  assert.equal(await castingGate.claim(session.id, memoryStorage()), false);
  assert.equal(completionDestination({ ...session, retroactive: true }, true).pathname, '/workout-summary');
  assert.equal(completionDestination(session, true).pathname, '/build-casting');
  assert.equal(await castingGate.claim(session.id, memoryStorage()), true);
});

test('skip, interruption, error, animation completion, and watchdog share one terminal navigation', () => {
  let navigations = 0;
  const finish = once(() => { navigations++; });
  for (const event of ['skip', 'background', 'renderer failure', 'complete', 'timeout']) { assert.ok(event); finish(); }
  assert.equal(navigations, 1);
});
