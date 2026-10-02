/* global __dirname, Buffer */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
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
const p = load('features/sharing/splitProtocol.ts');
const t = load('features/sharing/splitTransport.ts');
const { portableSplitFromCustomSplit } = load('features/sharing/customSplitAdapter.ts');

// Real built-in names, read from the seed source so fixtures stay realistic.
const SEED_NAMES = Array.from(
  fs.readFileSync(path.join(root, 'store/workoutDatabase.ts'), 'utf8').matchAll(/\{ name: '([^']+)', workoutType: '/g),
  (match) => match[1]
);

const b = (name) => ({ kind: 'builtin', name });
const c = (name, extra = {}) => ({ kind: 'custom', name, workoutType: 'shoulders', primaryMuscle: 'Shoulders', equipment: 'Cable', loadType: 'external_weight', metric: 'reps', ...extra });
const ppl = () => ({
  name: 'Push Pull Legs',
  workouts: [
    { name: 'Push', exercises: [b('Bench Press'), b('Incline Dumbbell Press'), b('Overhead Press'), c('Satwik Cable Rear Delt')] },
    { name: 'Pull', exercises: [b('Lat Pulldown'), c('Satwik Cable Rear Delt'), b('Barbell Curl')] },
    { name: 'Legs', exercises: [b('Back Squat'), b('Leg Press'), b('Leg Curl')] },
  ],
});

const ok = (result) => {
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error));
  return result.value;
};
const err = (result, code) => {
  assert.equal(result.ok, false, 'expected failure');
  assert.equal(result.error.code, code, JSON.stringify(result.error));
  assert.equal(typeof result.error.message, 'string');
  return result.error;
};
const roundTrip = (split) => ok(t.parseSharedSplit(ok(t.encodeSharedSplit(split))));
const wireJson = (wire) => JSON.stringify(wire);
const parseWire = (wire) => p.parseSharedSplitJson(wireJson(wire));
const baseWire = () => JSON.parse(ok(p.serializeSharedSplit(ppl())));

// ---------------------------------------------------------------------------
// Round trips
// ---------------------------------------------------------------------------

test('basic round trip: split → token → equivalent split', () => {
  assert.deepEqual(roundTrip(ppl()), ppl());
});

test('multi-day split preserves workout order and exercise order', () => {
  const split = { name: 'Week', workouts: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, index) => ({ name, exercises: SEED_NAMES.slice(index * 5, index * 5 + 5).reverse().map(b) })) };
  const parsed = roundTrip(split);
  assert.deepEqual(parsed.workouts.map((w) => w.name), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.deepEqual(parsed, split);
});

test('custom exercise metadata survives the round trip', () => {
  const custom = c('Landmine Press', { workoutType: 'chest', primaryMuscle: 'Chest', equipment: 'Barbell', loadType: 'bodyweight' });
  const parsed = roundTrip({ name: 'S', workouts: [{ name: 'A', exercises: [custom] }] });
  assert.deepEqual(parsed.workouts[0].exercises[0], custom);
});

test('null equipment round-trips as null', () => {
  const parsed = roundTrip({ name: 'S', workouts: [{ name: 'A', exercises: [c('Rope Thing', { equipment: null })] }] });
  assert.equal(parsed.workouts[0].exercises[0].equipment, null);
});

test('mixed built-in/custom keeps the portable distinction and hoists custom definitions once', () => {
  const wire = JSON.parse(ok(p.serializeSharedSplit(ppl())));
  assert.equal(wire.custom.length, 1, 'reused custom exercise is defined once');
  assert.deepEqual(wire.workouts[1].exercises, ['Lat Pulldown', 'Satwik Cable Rear Delt', 'Barbell Curl']);
  const kinds = roundTrip(ppl()).workouts[0].exercises.map((e) => e.kind);
  assert.deepEqual(kinds, ['builtin', 'builtin', 'builtin', 'custom']);
});

test('a custom exercise named like a built-in stays custom (collision preserved)', () => {
  const split = { name: 'S', workouts: [{ name: 'A', exercises: [c('Bench Press', { workoutType: 'chest', primaryMuscle: 'Chest', equipment: 'Machine' })] }] };
  const parsed = roundTrip(split);
  assert.equal(parsed.workouts[0].exercises[0].kind, 'custom');
  assert.equal(parsed.workouts[0].exercises[0].equipment, 'Machine');
});

test('canonical V1 wire shape', () => {
  assert.deepEqual(JSON.parse(ok(p.serializeSharedSplit({ name: 'S', workouts: [{ name: '', exercises: [b('Bench Press')] }] }))), {
    type: 'stack.split', v: 1, name: 'S', workouts: [{ name: '', exercises: ['Bench Press'] }],
  });
});

// ---------------------------------------------------------------------------
// Privacy boundary
// ---------------------------------------------------------------------------

const FORBIDDEN_KEYS = /"(id|exerciseId|exercise_id|split_?[iI]d|workout_?[iI]d|session_?[iI]d|sessions?|sets?|reps|targetReps|target_reps|weight|targetWeight|target_weight|entryUnit|unit|weightUnit|history|prs?|personalRecords?|intensity|position|createdAt|updatedAt|completed|build|liveActivity)"/i;

test('local ids and personal training data never reach the payload, even when present on input', () => {
  const polluted = {
    id: 7, name: 'Push Pull Legs', createdAt: '2026-01-01', intensity: 'hard', weightUnit: 'kg',
    workouts: [{
      id: 41, splitId: 7, position: 0, name: 'Push', sessions: [{ id: 99 }],
      exercises: [
        { ...b('Bench Press'), id: 300, exerciseId: 1, position: 0, weight: 80, targetWeight: 80, reps: 8, sets: [{ weight: 80, reps: 8, completed: true }], entryUnit: 'kg', history: [], pr: 100 },
        { ...c('Satwik Cable Rear Delt'), id: 301, exerciseId: 212, isCustom: true, targetReps: 12, secondaryMuscle: 'Rear Delts' },
      ],
    }],
  };
  const json = ok(p.serializeSharedSplit(polluted));
  assert.doesNotMatch(json, FORBIDDEN_KEYS);
  assert.doesNotMatch(json, /80|212|300|kg|hard|Rear Delts/);
  const parsed = ok(p.parseSharedSplitJson(json));
  assert.deepEqual(Object.keys(parsed.workouts[0].exercises[0]).sort(), ['kind', 'name']);
  assert.deepEqual(Object.keys(parsed.workouts[0].exercises[1]).sort(), ['equipment', 'kind', 'loadType', 'metric', 'name', 'primaryMuscle', 'workoutType']);
});

test('adapter drops local ids/timestamps, follows position order, and never reads training data', () => {
  const builtIns = new Set(SEED_NAMES);
  const saved = {
    id: 3, name: 'Upper Lower', createdAt: 'x', updatedAt: 'y',
    workouts: [
      { id: 12, splitId: 3, name: 'Lower', position: 1, exercises: [
        { id: 51, exerciseId: 9, name: 'Leg Press', primaryMuscle: 'Quads', equipment: null, loadType: 'external_weight', workoutType: 'legs', isCustom: false, position: 0 },
      ] },
      { id: 11, splitId: 3, name: 'Upper', position: 0, exercises: [
        { id: 50, exerciseId: 200, name: 'Satwik Cable Rear Delt', primaryMuscle: 'Shoulders', equipment: 'Cable', loadType: 'external_weight', workoutType: 'shoulders', isCustom: true, position: 1 },
        { id: 49, exerciseId: 1, name: 'Bench Press', primaryMuscle: 'Chest', equipment: null, loadType: 'external_weight', workoutType: 'chest', isCustom: false, position: 0 },
        // A renamed built-in: catalog row, but no longer a seed name.
        { id: 48, exerciseId: 4, name: 'Flat Fly', primaryMuscle: 'Chest', equipment: 'Legacy Rig', loadType: 'external_weight', workoutType: 'chest', isCustom: false, position: 2 },
      ] },
    ],
  };
  const portable = portableSplitFromCustomSplit(saved, builtIns);
  assert.deepEqual(portable, {
    name: 'Upper Lower',
    workouts: [
      { name: 'Upper', exercises: [
        b('Bench Press'),
        c('Satwik Cable Rear Delt'),
        { kind: 'custom', name: 'Flat Fly', workoutType: 'chest', primaryMuscle: 'Chest', equipment: null, loadType: 'external_weight', metric: 'reps' },
      ] },
      { name: 'Lower', exercises: [b('Leg Press')] },
    ],
  });
  assert.doesNotMatch(ok(p.serializeSharedSplit(portable)), FORBIDDEN_KEYS);
});

// ---------------------------------------------------------------------------
// Names, unicode, normalisation
// ---------------------------------------------------------------------------

test('unicode names round-trip byte-for-byte', () => {
  const split = { name: 'Push + Pull 💪', workouts: [
    { name: 'Épaules', exercises: [c('Élévations latérales', { primaryMuscle: 'Épaules' })] },
    { name: '脚', exercises: [c('深蹲 🏋️‍♀️', { workoutType: 'legs', primaryMuscle: '腿', equipment: 'Barbell' })] },
  ] };
  assert.deepEqual(roundTrip(split), split);
});

test('display case is preserved; only surrounding whitespace is trimmed', () => {
  const parsed = roundTrip({ name: '  my SPLIT ', workouts: [{ name: ' lat day ', exercises: [c('LAT pulldown (wide)')] }] });
  assert.equal(parsed.name, 'my SPLIT');
  assert.equal(parsed.workouts[0].name, 'lat day');
  assert.equal(parsed.workouts[0].exercises[0].name, 'LAT pulldown (wide)');
});

test('match key: case, whitespace and compatibility forms fold; display names do not', () => {
  const keys = ['Lat Pulldown', 'lat pulldown', 'LAT PULLDOWN', '  Lat   Pulldown ', 'Ｌａｔ Ｐｕｌｌｄｏｗｎ'].map(p.exerciseMatchKey);
  assert.equal(new Set(keys).size, 1);
  assert.equal(keys[0], 'lat pulldown');
  assert.notEqual(p.exerciseMatchKey('Bench Press'), p.exerciseMatchKey('Bench Presss'));
  assert.equal(p.exerciseMatchKey('Épaules'), p.exerciseMatchKey('ÉPAULES'));
});

test('the same exercise in one workout twice (any case) is rejected', () => {
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [b('Bench Press'), b('bench press')] }] }), 'duplicate_exercise');
});

test('the same exercise across workouts is allowed', () => {
  roundTrip({ name: 'S', workouts: [{ name: 'A', exercises: [b('Bench Press')] }, { name: 'B', exercises: [b('Bench Press')] }] });
});

test('one name key cannot mean two exercises in one split', () => {
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [b('Bench Press')] }, { name: 'B', exercises: [c('bench press')] }] }), 'ambiguous_exercise_name');
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [c('Fly')] }, { name: 'B', exercises: [c('Fly', { equipment: 'Machine' })] }] }), 'conflicting_custom_exercise');
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [b('Bench Press')] }, { name: 'B', exercises: [b('BENCH PRESS')] }] }), 'ambiguous_exercise_name');
});

test('control, bidi-override and lone-surrogate characters are rejected', () => {
  for (const bad of ['Bench\nPress', 'Bench\u0000', '‮evil', 'zero​width', 'half\uD83D']) {
    err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [c(bad)] }] }), 'invalid_string');
  }
  err(parseWire({ ...baseWire(), name: 'x⁦y' }), 'invalid_string');
});

// ---------------------------------------------------------------------------
// Versioning & type
// ---------------------------------------------------------------------------

test('unsupported newer version is rejected with an update message', () => {
  const error = err(parseWire({ ...baseWire(), v: 2 }), 'unsupported_version');
  assert.match(error.message, /newer version of Stack/);
});

test('invalid and missing versions fail safely', () => {
  for (const v of [0, -1, 1.5, '1', null, true, [], {}, 1e300]) err(parseWire({ ...baseWire(), v }), 'invalid_version');
  const { v, ...noVersion } = baseWire();
  void v;
  err(parseWire(noVersion), 'missing_version');
});

test('wrong or missing type is rejected (future single-workout shares use a new type)', () => {
  err(parseWire({ ...baseWire(), type: 'stack.workout' }), 'unsupported_type');
  const { type, ...noType } = baseWire();
  void type;
  err(parseWire(noType), 'unsupported_type');
});

test('unknown additive fields are ignored, so V1 can grow without a version bump', () => {
  const wire = baseWire();
  wire.coverColor = '#fff';
  wire.workouts[0].notes = 'future';
  wire.custom[0].secondaryMuscle = 'Rear Delts';
  assert.deepEqual(ok(parseWire(wire)), ppl());
});

test('__proto__ keys cannot pollute or smuggle fields', () => {
  const json = ok(p.serializeSharedSplit(ppl())).replace('{"type"', '{"__proto__":{"polluted":1},"type"');
  const parsed = ok(p.parseSharedSplitJson(json));
  assert.equal({}.polluted, undefined);
  assert.equal(parsed.polluted, undefined);
});

// ---------------------------------------------------------------------------
// Malformed input
// ---------------------------------------------------------------------------

test('corrupt base64url is rejected safely', () => {
  const token = ok(t.encodeSharedSplit(ppl()));
  for (const bad of [token + '=', token.slice(0, -1) + '+', token.slice(0, -1) + '/', 'abc$', 'A', '', ' ' + token, token + 'é', token.slice(0, -2), null, 42, {}]) {
    const result = t.parseSharedSplit(bad);
    assert.equal(result.ok, false, String(bad).slice(0, 20));
    assert.ok(['invalid_encoding', 'invalid_json'].includes(result.error.code), result.error.code);
  }
});

test('non-canonical base64url padding bits are rejected', () => {
  assert.deepEqual(Array.from(t.base64UrlDecode('QQ')), [65]);
  assert.equal(t.base64UrlDecode('QR'), null);
  assert.deepEqual(Array.from(t.base64UrlDecode('QUI')), [65, 66]);
  assert.equal(t.base64UrlDecode('QUJ'), null);
});

test('malformed UTF-8 is rejected', () => {
  for (const bytes of [[0xc0, 0xaf], [0xe0, 0x80, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2, 0x82], [0xff]]) {
    err(t.parseSharedSplit(t.base64UrlEncode(Uint8Array.from(bytes))), 'invalid_encoding');
  }
  assert.equal(t.utf8Decode(t.utf8Encode('脚 💪 é')), '脚 💪 é');
});

test('invalid JSON and non-object roots are rejected safely', () => {
  for (const text of ['', '{', '{"type":"stack.split",}', 'undefined', 'NaN']) err(p.parseSharedSplitJson(text), 'invalid_json');
  for (const text of ['null', '[]', '"x"', '1', 'true']) err(p.parseSharedSplitJson(text), 'invalid_structure');
  err(p.parseSharedSplitJson(undefined), 'invalid_json');
  err(t.parseSharedSplit(t.base64UrlEncode(t.utf8Encode('not json'))), 'invalid_json');
});

test('duplicate JSON keys are rejected at any depth', () => {
  err(p.parseSharedSplitJson('{"type":"stack.split","v":1,"v":1,"name":"S","workouts":[]}'), 'duplicate_key');
  const json = ok(p.serializeSharedSplit(ppl())).replace('"name":"Push"', '"name":"Push","name":"Pwned"');
  err(p.parseSharedSplitJson(json), 'duplicate_key');
  // Escaped key spelling is still the same key.
  err(p.parseSharedSplitJson('{"type":"stack.split","\\u0076":1,"v":1}'), 'duplicate_key');
  // Identical keys in sibling objects are fine.
  ok(p.parseSharedSplitJson(ok(p.serializeSharedSplit(ppl()))));
});

test('deeply nested garbage fails closed instead of crashing', () => {
  const deep = '['.repeat(5000) + ']'.repeat(5000);
  assert.equal(p.parseSharedSplitJson(deep).ok, false);
  assert.equal(p.parseSharedSplitJson(`{"type":"stack.split","v":1,"name":"S","workouts":${deep}}`).ok, false);
});

test('invalid exercise metadata is rejected', () => {
  const cases = [
    [{ workoutType: 'cardio' }, 'unknown_enum_value'],
    [{ workoutType: 'Chest' }, 'unknown_enum_value'],
    [{ loadType: 'assisted' }, 'unknown_enum_value'],
    [{ equipment: 'Kettlebell' }, 'unknown_enum_value'],
    [{ primaryMuscle: '' }, 'empty_name'],
    [{ primaryMuscle: 7 }, 'invalid_string'],
    [{ primaryMuscle: 'x'.repeat(49) }, 'string_too_long'],
  ];
  for (const [patch, code] of cases) {
    err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [c('X', patch)] }] }), code);
    const wire = baseWire();
    Object.assign(wire.custom[0], patch);
    err(parseWire(wire), code);
  }
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [{ kind: 'mystery', name: 'X' }] }] }), 'unknown_enum_value');
  const wire = baseWire();
  delete wire.custom[0].equipment;
  err(parseWire(wire), 'invalid_structure');
  const wire2 = baseWire();
  wire2.workouts[0].exercises[0] = { name: 'Bench Press' };
  err(parseWire(wire2), 'invalid_string');
});

test('wire-level custom definition integrity', () => {
  const unused = baseWire();
  unused.custom.push({ ...unused.custom[0], name: 'Ghost' });
  err(parseWire(unused), 'unreferenced_custom_exercise');
  const dup = baseWire();
  dup.custom.push({ ...dup.custom[0], name: 'SATWIK cable rear delt' });
  err(parseWire(dup), 'conflicting_custom_exercise');
  const mismatch = baseWire();
  mismatch.workouts[0].exercises[3] = 'satwik cable rear delt';
  err(parseWire(mismatch), 'exercise_name_mismatch');
  err(parseWire({ ...baseWire(), custom: {} }), 'invalid_structure');
});

test('empty structures follow product rules', () => {
  err(p.serializeSharedSplit({ name: '', workouts: [{ name: 'A', exercises: [b('Bench Press')] }] }), 'empty_name');
  err(p.serializeSharedSplit({ name: '   ', workouts: [{ name: 'A', exercises: [b('Bench Press')] }] }), 'empty_name');
  err(p.serializeSharedSplit({ workouts: [] }), 'invalid_string');
  err(p.serializeSharedSplit({ name: 'S', workouts: [] }), 'no_workouts');
  err(p.serializeSharedSplit({ name: 'S' }), 'invalid_structure');
  // Stack refuses to save a split with zero exercises overall…
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [] }] }), 'empty_split');
  // …but allows individual empty (named) workouts…
  roundTrip({ name: 'S', workouts: [{ name: 'Rest-ish', exercises: [] }, { name: 'A', exercises: [b('Bench Press')] }] });
  // …and unnamed workouts whose label Stack derives from exercises.
  roundTrip({ name: 'S', workouts: [{ name: '', exercises: [b('Bench Press')] }] });
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: '', exercises: [] }, { name: 'A', exercises: [b('Bench Press')] }] }), 'empty_workout');
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [b('')] }] }), 'empty_name');
  err(parseWire({ ...baseWire(), workouts: [] }), 'no_workouts');
});

test('length and count limits are enforced on both sides', () => {
  const L = p.SHARED_SPLIT_LIMITS;
  const one = [b('Bench Press')];
  roundTrip({ name: 'x'.repeat(L.splitNameMaxLength), workouts: [{ name: 'y'.repeat(L.workoutNameMaxLength), exercises: [c('z'.repeat(L.exerciseNameMaxLength))] }] });
  err(p.serializeSharedSplit({ name: 'x'.repeat(L.splitNameMaxLength + 1), workouts: [{ name: 'A', exercises: one }] }), 'string_too_long');
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'y'.repeat(L.workoutNameMaxLength + 1), exercises: one }] }), 'string_too_long');
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: [c('z'.repeat(L.exerciseNameMaxLength + 1))] }] }), 'string_too_long');
  err(p.serializeSharedSplit({ name: 'S', workouts: Array.from({ length: L.maxWorkouts + 1 }, (_, i) => ({ name: `W${i}`, exercises: one })) }), 'too_many_workouts');
  err(p.serializeSharedSplit({ name: 'S', workouts: [{ name: 'A', exercises: Array.from({ length: L.maxExercisesPerWorkout + 1 }, (_, i) => c(`Ex ${i}`)) }] }), 'too_many_exercises');
  roundTrip({ name: 'S', workouts: Array.from({ length: L.maxWorkouts }, (_, i) => ({ name: `W${i}`, exercises: one })) });
  const bigWire = baseWire();
  bigWire.workouts = Array.from({ length: L.maxWorkouts + 1 }, () => ({ name: 'A', exercises: ['Bench Press'] }));
  err(parseWire(bigWire), 'too_many_workouts');
  const wideWire = baseWire();
  wideWire.workouts[0].exercises = Array.from({ length: L.maxExercisesPerWorkout + 1 }, (_, i) => `Ex ${i}`);
  err(parseWire(wideWire), 'too_many_exercises');
  const totalWire = baseWire();
  totalWire.workouts = Array.from({ length: L.maxWorkouts }, (_, w) => ({ name: `W${w}`, exercises: Array.from({ length: L.maxExercisesPerWorkout }, (_, i) => `E${i}`) }));
  err(parseWire(totalWire), 'too_many_exercises');
});

test('oversized payloads are rejected before parsing, by JSON bytes and token length', () => {
  const L = p.SHARED_SPLIT_LIMITS;
  // Every field within limits, but the whole split is too big.
  const huge = { name: 'S', workouts: Array.from({ length: L.maxWorkouts }, (_, w) => ({ name: `W${w}`, exercises: Array.from({ length: 14 }, (_, i) => c(`${'名'.repeat(70)} ${w}-${i}`)) })) };
  err(p.serializeSharedSplit(huge), 'payload_too_large');
  err(t.encodeSharedSplit(huge), 'payload_too_large');
  err(p.parseSharedSplitJson(' '.repeat(L.maxPayloadBytes + 1)), 'payload_too_large');
  err(p.parseSharedSplitJson(`"${'é'.repeat(L.maxPayloadBytes / 2)}"`), 'payload_too_large');
  err(t.parseSharedSplit('A'.repeat(t.MAX_SHARED_SPLIT_TOKEN_LENGTH + 1)), 'payload_too_large');
});

test('serialization is deterministic for equivalent input', () => {
  const a = ok(p.serializeSharedSplit(ppl()));
  // Same split, different property order, extra whitespace and extra fields.
  const shuffled = { workouts: ppl().workouts.map((w) => ({ exercises: w.exercises.map((e) => Object.fromEntries(Object.entries({ ...e, id: 1 }).reverse())), name: ` ${w.name} ` })), name: 'Push Pull Legs  ' };
  assert.equal(ok(p.serializeSharedSplit(shuffled)), a);
  assert.equal(ok(t.encodeSharedSplit(ppl())), ok(t.encodeSharedSplit(shuffled)));
  // Parse → serialize is a fixed point.
  assert.equal(ok(p.serializeSharedSplit(ok(p.parseSharedSplitJson(a)))), a);
});

test('serializer and parser never throw on hostile input', () => {
  const hostile = [undefined, null, 1, 'x', [], { get name() { throw new Error('boom'); }, workouts: [] }, { name: 'S', workouts: [null] }, { name: 'S', workouts: [{ name: 'A', exercises: [null] }] }, { name: 'S', workouts: 'abc' }];
  for (const value of hostile) {
    assert.equal(p.serializeSharedSplit(value).ok, false);
    assert.equal(t.encodeSharedSplit(value).ok, false);
    assert.equal(p.validatePortableSplit(value).ok, false);
  }
});

test('import URL helpers carry the token unchanged', () => {
  const token = ok(t.encodeSharedSplit(ppl()));
  const url = t.buildSplitImportUrl(token);
  assert.ok(url.startsWith('stack://import-split?d='));
  assert.equal(encodeURIComponent(token), token, 'base64url needs no escaping');
  assert.equal(t.readSplitImportToken(url), token);
  assert.equal(t.readSplitImportToken(`stack://import-split?x=1&d=${token}#frag`), token);
  assert.equal(t.readSplitImportToken('stack://import-split'), null);
  assert.deepEqual(ok(t.parseSharedSplit(t.readSplitImportToken(url))), ppl());
});

// ---------------------------------------------------------------------------
// Size measurements
// ---------------------------------------------------------------------------

const CUSTOM_POOL = [
  c('Satwik Cable Rear Delt'),
  c('Satwik Leaning Cable Lateral', { primaryMuscle: 'Shoulders' }),
  c('Seal Row on Bench (Wide)', { workoutType: 'back', primaryMuscle: 'Back', equipment: 'Machine' }),
  c('Behind-Body Cable Curl', { workoutType: 'arms', primaryMuscle: 'Biceps' }),
  c('Heels-Up Goblet Squat', { workoutType: 'legs', primaryMuscle: 'Legs', equipment: 'Dumbbell' }),
  c('Weighted Decline Sit-up', { workoutType: 'core', primaryMuscle: 'Core', equipment: 'Dumbbell' }),
];
const fixture = (workouts, perWorkout, customCount) => ({
  name: `${workouts}-Day Program`,
  workouts: Array.from({ length: workouts }, (_, w) => {
    const count = Array.isArray(perWorkout) ? perWorkout[w] : perWorkout;
    const customs = CUSTOM_POOL.slice(0, customCount).filter((_, i) => i % workouts === w);
    const builtins = SEED_NAMES.slice(w * 12, w * 12 + count - customs.length).map(b);
    return { name: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Arms + Abs', 'Full Body'][w], exercises: [...builtins, ...customs] };
  }),
});

const measure = (label, split) => {
  const json = ok(p.serializeSharedSplit(split));
  const token = ok(t.encodeSharedSplit(split));
  const url = t.buildSplitImportUrl(token);
  const deflated = t.base64UrlEncode(zlib.deflateRawSync(Buffer.from(json), { level: 9 }));
  const exercises = split.workouts.reduce((n, w) => n + w.exercises.length, 0);
  const custom = (JSON.parse(json).custom ?? []).length;
  assert.deepEqual(ok(t.parseSharedSplit(token)), ok(p.validatePortableSplit(split)));
  return { label, workouts: split.workouts.length, exercises, custom, jsonBytes: Buffer.byteLength(json), tokenChars: token.length, urlChars: url.length, deflatedTokenChars: deflated.length };
};

test('payload size measurements (small / medium / large / worst case)', (context) => {
  const rows = [
    measure('small 3×5', fixture(3, 5, 2)),
    measure('medium 5×8', fixture(5, 8, 4)),
    measure('large 7×10–12', fixture(7, [10, 11, 12, 10, 12, 11, 12], 6)),
    measure('max-length names 7×12', { name: 'N'.repeat(64), workouts: Array.from({ length: 7 }, (_, w) => ({ name: `${w}`.padEnd(48, 'w'), exercises: Array.from({ length: 12 }, (_, i) => c(`${w}-${i} `.padEnd(80, 'x'), { primaryMuscle: 'Shoulders' })) })) }),
  ];
  for (const row of rows) context.diagnostic(JSON.stringify(row));
  const large = rows[2];
  assert.ok(large.exercises >= 70 && large.exercises <= 84 && large.custom >= 6);
  assert.ok(large.urlChars < 4000, 'a realistic large split stays well inside a few KB');
  for (const row of rows) assert.ok(row.tokenChars <= Math.ceil((row.jsonBytes * 4) / 3) + 1);
});

test('timed custom exercises round-trip with metric = duration; rep payloads are unchanged', () => {
  const timed = c('Wall Sit Hold', { workoutType: 'legs', primaryMuscle: 'Legs', equipment: 'Machine', loadType: 'bodyweight', metric: 'duration' });
  const carry = c('Sled Hold', { workoutType: 'core', primaryMuscle: 'Core', equipment: null, metric: 'duration' });
  const split = { name: 'Holds', workouts: [{ name: 'Day', exercises: [b('Plank'), timed, carry, c('Satwik Cable Rear Delt')] }] };
  const parsed = roundTrip(split);
  assert.deepEqual(parsed, split);
  const wire = JSON.parse(ok(p.serializeSharedSplit(split)));
  assert.deepEqual(wire.custom.map((definition) => definition.metric), ['duration', 'duration', undefined]);
  // Existing rep-only payloads encode byte-for-byte as before the field existed.
  assert.doesNotMatch(ok(p.serializeSharedSplit(ppl())), /metric/);
  const legacy = baseWire();
  delete legacy.custom[0].metric;
  assert.equal(ok(parseWire(legacy)).workouts[0].exercises[3].metric, 'reps');
  const invalid = baseWire();
  invalid.custom[0].metric = 'distance';
  err(parseWire(invalid), 'unknown_enum_value');
  // A duration and a rep definition of one name are different exercises.
  err(p.serializeSharedSplit({ name: 'X', workouts: [
    { name: 'A', exercises: [c('Hold', { metric: 'duration' })] },
    { name: 'B', exercises: [c('Hold')] },
  ] }), 'conflicting_custom_exercise');
});

test('a timed custom exercise never leaks logged durations or other performance data', () => {
  const polluted = { name: 'Holds', workouts: [{ name: 'Day', exercises: [
    { ...c('Wall Sit Hold', { metric: 'duration' }), durationS: 754, targetDurationS: 613, sets: [{ durationS: 754, completed: true }], history: [{ durationS: 889 }] },
  ] }] };
  const json = ok(p.serializeSharedSplit(polluted));
  assert.doesNotMatch(json, /754|613|889|durationS|sets|history/);
  assert.match(json, /"metric":"duration"/);
});
