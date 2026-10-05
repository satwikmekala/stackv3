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
  assert.ok(!/store\/|Database|services\//.test(resolved), 'Welcome example and motion have no persistence or workout dependencies');
  if (cache.has(resolved)) return cache.get(resolved);
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, name => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw new Error(`Unexpected runtime dependency: ${name}`);
  });
  cache.set(resolved, exports);
  return exports;
}
const { welcomeFrame, WELCOME_DURATION_MS } = load('features/build/welcomeMotion.ts');
const { WELCOME_SLABS, WELCOME_EXERCISES, welcomeComposition } = load('features/onboarding/welcomeExample.ts');
const { createSlabGeometry } = (() => {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(root, 'features/build/geometry.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, name => name.startsWith('.')
    ? load(`features/build/${name.slice(2)}.ts`) : require(name));
  return exports;
})();

test('release builds cannot enable the preview, even with the preview environment flag', () => {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, 'features/onboarding/config.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const dev of [false, true]) for (const flag of [undefined, '0', '1']) {
    const exports = {};
    new Function('exports', '__DEV__', 'process', js)(exports, dev, { env: { EXPO_PUBLIC_ONBOARDING_PREVIEW: flag } });
    assert.equal(exports.ONBOARDING_PREVIEW_ENABLED, dev && flag === '1');
    assert.equal(exports.FIRST_RUN_ROUTE, dev && flag === '1' ? '/onboarding-preview' : '/(onboarding)/welcome');
  }
  assert.equal(welcomeComposition(undefined), 'object');
  assert.equal(welcomeComposition('unknown'), 'object');
  assert.equal(welcomeComposition('workout'), 'workout');
});

test('the workout precedes formation; landing is continuous, bounded, and stops in the final position', () => {
  assert.equal(welcomeFrame(0).visible, false);
  assert.equal(welcomeFrame(849).phase, 'workout');
  assert.equal(welcomeFrame(850).phase, 'forming');
  assert.equal(welcomeFrame(1500).phase, 'joining');
  for (let elapsed = 0; elapsed <= WELCOME_DURATION_MS + 1000; elapsed += 8) {
    const frame = welcomeFrame(elapsed);
    assert.ok(frame.scale >= 0.08 && frame.scale <= 1);
    assert.ok(frame.lift >= 0 && frame.lift <= 0.985);
    const next = welcomeFrame(elapsed + 8);
    assert.ok(Math.abs(frame.lift - next.lift) < 0.03, 'No camera or landing jump across a beat boundary');
    if (frame.done) assert.deepEqual([frame.visible, frame.scale, frame.lift, frame.phase], [true, 1, 0, 'settled']);
  }
  assert.deepEqual(welcomeFrame(-100), welcomeFrame(0));
  assert.deepEqual(welcomeFrame(0, true), welcomeFrame(WELCOME_DURATION_MS));
});

test('the static example uses the existing geometry, matching exercise colors without evidence or mutation', () => {
  const before = JSON.stringify(WELCOME_SLABS);
  const final = WELCOME_SLABS.at(-1);
  assert.deepEqual(final.layers.map(layer => layer.color), [...WELCOME_EXERCISES].reverse().map(exercise => exercise.color));
  for (const slab of WELCOME_SLABS) {
    assert.ok(slab.id.startsWith('welcome:'));
    assert.ok(slab.layers.every(layer => layer.record === false));
    const geometry = createSlabGeometry(slab, load('features/build/model.ts').DEFAULT_TUNING, 'strata');
    assert.ok(geometry.getAttribute('position').count > 0);
    assert.ok(Array.from(geometry.getAttribute('position').array).every(Number.isFinite));
    geometry.dispose();
  }
  assert.equal(JSON.stringify(WELCOME_SLABS), before);
});
