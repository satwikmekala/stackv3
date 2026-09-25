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

test('Build requires iOS and explicit opt-in; demo controls require development', () => {
  const js = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../features/build/config.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const platform of ['ios', 'android', 'web']) for (const dev of [false, true]) for (const flag of [undefined, '0', '1']) {
    const exports = {};
    new Function('exports', 'require', '__DEV__', 'process', js)(exports,
      () => ({ Platform: { OS: platform } }), dev, { env: { EXPO_PUBLIC_BUILD_SANDBOX: flag } });
    assert.equal(exports.BUILD_SANDBOX_ENABLED, platform === 'ios' && flag === '1');
    assert.equal(exports.BUILD_DEMO_ENABLED, dev && platform === 'ios' && flag === '1');
  }
  const profiles = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../eas.json'), 'utf8')).build;
  assert.equal(profiles.preview.env.EXPO_PUBLIC_BUILD_SANDBOX, '1');
  assert.equal(profiles.production.env.EXPO_PUBLIC_BUILD_SANDBOX, '1');
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
  const gold = new Color(model.GOLD).multiplyScalar(1.35);
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

test('PR seams belong only to their source strata, including multiple PRs and the key corner', () => {
  const { Color } = require('three');
  const gold = new Color(model.GOLD).multiplyScalar(1.35);
  for (const flags of [[false, false, false], [false, true, false], [true, false, true]]) {
    const slab = { id: 'local-pr', sealed: true, height: 2, layers: flags.map((record, i) => ({ color: model.CATEGORY_COLORS[i], height: 1, record })) };
    const geometry = createSlabGeometry(slab, model.DEFAULT_TUNING, 'strata');
    const positions = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color');
    const normals = geometry.getAttribute('normal');
    const height = slab.height * model.BASE_HEIGHT;
    const band = height / flags.length;
    const seam = Math.min(band * 0.1, model.DEFAULT_TUNING.seam);
    const seams = new Set();
    const keyPigments = new Set();
    for (let i = 0; i < positions.count; i += 3) {
      const isGold = Math.abs(colors.getX(i) - gold.r) < 1e-5 && Math.abs(colors.getY(i) - gold.g) < 1e-5 && Math.abs(colors.getZ(i) - gold.b) < 1e-5;
      const ys = [0, 1, 2].map((j) => positions.getY(i + j));
      const side = Math.abs(normals.getY(i)) < 0.1;
      if (isGold && side) {
        const layer = flags.findIndex((record, index) => record && ys.every((y) => y >= (index + 1) * band - seam - 1e-5 && y <= (index + 1) * band + 1e-5));
        assert.ok(layer >= 0, 'gold side triangles must lie inside a PR layer’s thin upper seam');
        seams.add(layer);
      } else if (isGold) {
        assert.equal(flags.at(-1), true, 'only a top-layer PR can highlight the top perimeter');
      } else if (side && normals.getX(i) > 0.5 && normals.getZ(i) > 0.5) {
        keyPigments.add(Math.min(flags.length - 1, Math.floor((Math.min(...ys) + 1e-5) / band)));
      }
    }
    assert.deepEqual([...seams].sort(), flags.flatMap((record, index) => record ? [index] : []));
    assert.equal(keyPigments.size, flags.length, 'every workout pigment remains on the key corner');
    geometry.dispose();
  }
});

test('casting gold overlay contains only earned seam triangles and no workout pigment faces', () => {
  const { createRecordSeamGeometry } = load('features/build/geometry.ts');
  for (const record of [false, true]) {
    const slab = model.makeObjectFixture(2, record, false, 0.35)[0];
    const full = createSlabGeometry(slab, model.DEFAULT_TUNING, 'strata');
    const seam = createRecordSeamGeometry(slab, model.DEFAULT_TUNING);
    const mask = full.getAttribute('recordMask');
    const source = full.getAttribute('position');
    const expected = [];
    for (let i = 0; i < mask.count; i++) if (mask.getX(i)) expected.push(source.getX(i), source.getY(i), source.getZ(i));
    assert.deepEqual([...seam.getAttribute('position').array], expected);
    assert.equal(expected.length > 0, record);
    assert.ok(seam.getAttribute('position').count < source.count);
    full.dispose(); seam.dispose();
  }
});

test('batched fusion history preserves translated vertices and pigments at 260 weeks', () => {
  const { createHistoryGeometry } = load('features/build/geometry.ts');
  const { items } = model.layoutSlabs(model.makeHistoryFixture(260));
  const batched = createHistoryGeometry(items, model.DEFAULT_TUNING);
  let offset = 0;
  for (const { slab, y } of items) {
    const single = createSlabGeometry(slab, model.DEFAULT_TUNING, 'strata').translate(0, y, 0);
    for (const name of ['position', 'color']) {
      const expected = single.getAttribute(name).array;
      assert.deepEqual(batched.getAttribute(name).array.slice(offset, offset + expected.length), expected);
    }
    offset += single.getAttribute('position').array.length;
    single.dispose();
  }
  assert.equal(batched.getAttribute('position').array.length, offset);
  batched.dispose();
});
