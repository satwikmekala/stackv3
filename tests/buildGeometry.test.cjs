/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  const resolved = path.resolve(__dirname, '..', file);
  if (cache.has(resolved)) return cache.get(resolved);
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, (name) => name.startsWith('.')
    ? load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(resolved), `${name}.ts`))) : require(name));
  cache.set(resolved, exports);
  return exports;
}
const model = load('features/build/model.ts');
const { createSlabGeometry } = load('features/build/geometry.ts');

test('sandbox requires iOS, development mode and explicit opt-in', () => {
  const js = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../features/build/config.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const platform of ['ios', 'android', 'web']) for (const dev of [false, true]) for (const flag of [undefined, '0', '1']) {
    const exports = {};
    new Function('exports', 'require', '__DEV__', 'process', js)(exports,
      () => ({ Platform: { OS: platform } }), dev, { env: { EXPO_PUBLIC_BUILD_SANDBOX: flag } });
    assert.equal(exports.BUILD_SANDBOX_ENABLED, platform === 'ios' && dev && flag === '1');
  }
});

test('fixture is deterministic, empty means no slab, and historical weeks are single scene inputs', () => {
  assert.deepEqual(model.makeHistoryFixture(0), []);
  for (const count of model.HISTORY_PRESETS.slice(1)) {
    const slabs = model.makeHistoryFixture(count);
    assert.deepEqual(slabs, model.makeHistoryFixture(count));
    assert.equal(slabs.filter((slab) => slab.sealed).length, count);
    assert.equal(slabs.filter((slab) => !slab.sealed).length, 2);
    assert.equal(new Set(slabs.map((slab) => slab.id)).size, slabs.length);
    const { items } = model.layoutSlabs(slabs);
    items.slice(1).forEach((item, index) => assert.ok(item.y > items[index].y + items[index].slab.height * model.BASE_HEIGHT));
  }
  assert.throws(() => model.makeHistoryFixture(-1));
  assert.throws(() => model.makeHistoryFixture(261));
});

test('weekly compression remains bounded and preserves layer evidence', () => {
  const layers = [{ height: 1, color: '#FF7A3D', record: true }];
  assert.equal(model.weeklyHeight(layers, 0.35), 0.75);
  assert.equal(model.weeklyHeight(Array(20).fill(layers[0]), 0.35), 2.5);
  const regular = model.makeHistoryFixture(10, 0.25);
  const expanded = model.makeHistoryFixture(10, 0.5);
  regular.forEach((slab, index) => assert.deepEqual(slab.layers, expanded[index].layers));
});

test('all treatments and height buckets generate finite, outward-facing geometry within the shared footprint', () => {
  for (const lamination of ['strata-inlay', 'strata', 'edge-grain']) {
    for (let bucket = 0; bucket < 4; bucket++) {
      for (const record of [false, true]) {
        for (const sealed of [false, true]) {
          const slab = model.makeObjectFixture(bucket, record, sealed, 0.35)[0];
          const before = JSON.stringify(slab);
          const geometry = createSlabGeometry(slab, model.DEFAULT_TUNING, lamination);
          const positions = geometry.getAttribute('position');
          const normals = geometry.getAttribute('normal');
          assert.equal(positions.count % 3, 0);
          assert.equal(geometry.getAttribute('color').count, positions.count);
          for (const value of positions.array) assert.ok(Number.isFinite(value));
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            const ny = normals.getY(i);
            assert.ok(x >= -1 && x <= 1 && z >= -1 && z <= 1);
            if (ny > 0.5) assert.ok(Math.abs(y - slab.height * model.BASE_HEIGHT) < 0.00001);
            if (Math.abs(ny) < 0.1) assert.ok(normals.getX(i) * x + normals.getZ(i) * z > 0);
          }
          assert.equal(JSON.stringify(slab), before);
          geometry.dispose();
        }
      }
    }
  }
});

test('gold is present only for records, and survives all weekly material treatments', () => {
  const { Color } = require('three');
  const gold = new Color(model.GOLD).multiplyScalar(1.16);
  for (const treatment of ['strata-inlay', 'strata', 'edge-grain']) {
    for (const record of [false, true]) {
      const slab = model.makeObjectFixture(0, record, true, 0.35)[0];
      const geometry = createSlabGeometry(slab, model.DEFAULT_TUNING, treatment);
      const color = geometry.getAttribute('color');
      let found = false;
      for (let i = 0; i < color.count; i++) {
        if (Math.abs(color.getX(i) - gold.r) < 0.00001 && Math.abs(color.getY(i) - gold.g) < 0.00001 && Math.abs(color.getZ(i) - gold.b) < 0.00001) found = true;
      }
      assert.equal(found, record);
      geometry.dispose();
    }
  }
});
