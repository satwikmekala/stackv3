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
  const exports = {}; cache.set(resolved, exports);
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', js)(exports, name => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(`${path.resolve(path.dirname(resolved), name)}.ts`);
    throw Error(`Unexpected dependency: ${name}`);
  });
  return exports;
}
const content = load('utils/content.ts');
const routine = load('features/sharing/routineCopy.ts');
const { settingsErrorCopy } = load('features/settings/copy.ts');
const { displayExerciseName } = load('constants/exerciseNames.ts');
const { homeModuleCopy } = load('features/build/homeModuleCopy.ts');
const { deriveBuildState } = load('features/build/evidence.ts');
const { unitLabel, formatWeight } = load('store/weightUnits.ts');

test('content: block counts, layer counts and My Stack keep distinct meanings', () => {
  const copy = homeModuleCopy({ seen: true, weeksBuilt: 12, piecesThisWeek: 3 });
  assert.equal(copy.title, '12 layers built'); assert.equal(copy.detail, '3 blocks this week');
  assert.equal(copy.a11y, 'My Stack. 12 layers built. 3 blocks this week.');
});
test('content: routine entries are workouts, including beyond the alphabet', () => {
  assert.deepEqual([0, 1, 25, 26].map(content.workoutEntryLabel), ['Workout A', 'Workout B', 'Workout Z', 'Workout 27']);
  assert.match(fs.readFileSync(path.join(root, 'features/settings/useSettings.ts'), 'utf8'), /Your weekly goal counts training days; Stack’s plan counts workouts/);
});
test('content: pounds display as lb while conversion still accepts the persisted lbs value', () => {
  assert.equal(unitLabel('lbs'), 'lb'); assert.equal(unitLabel('kg'), 'kg');
  assert.equal(formatWeight(80, 'lbs'), '176.4');
});
test('content: dates have stable month names, punctuation and compact ranges', () => {
  assert.equal(content.shortContentDate(new Date(2026, 8, 5)), '5 Sep');
  assert.equal(content.longContentDate(new Date(2026, 9, 5)), 'Monday, 5 Oct');
  assert.equal(content.contentDateRange(new Date(2026, 9, 5), new Date(2026, 9, 11)), '5–11 Oct');
  assert.equal(content.contentDateRange(new Date(2026, 8, 28), new Date(2026, 9, 4)), '28 Sep–4 Oct');
});
test('content: accessibility expands earned PRs, attempts and constrained BW', () => {
  assert.equal(content.spokenTrainingCopy('2 PRs. PR attempt. BW × 12.'), '2 personal records. personal record attempt. bodyweight × 12.');
});
test('content: shared routine errors hide protocol and SQL details', () => {
  assert.equal(routine.routineLinkErrorCopy({ code: 'unsupported_version' }), 'This routine needs a newer Stack. Update to open it.');
  assert.equal(routine.routineLinkErrorCopy({ code: 'too_many_workouts' }), 'This routine is too big to share as a link.');
  assert.equal(routine.routineLinkErrorCopy({ code: 'invalid_json' }), 'This link is broken. Ask for a new one.');
  assert.equal(routine.routineImportFailureCopy(Error('SQL shared_split invalid identifier')), 'Couldn’t add this routine. Try again.');
  assert.equal(settingsErrorCopy('restore', Error('SQL volume session')), 'Couldn’t restore this backup. Try another backup.');
});
test('content: display aliases keep unknown and authored exercise names intact', () => {
  assert.equal(displayExerciseName('Lateral Raises'), 'Lateral Raise');
  assert.equal(displayExerciseName('Bicep Curls'), 'Barbell Curl');
  assert.equal(displayExerciseName('My unusual exercise'), 'My unusual exercise');
});
test('content: thickness reflects improved exercises rather than moved weight or bonus attempts', () => {
  const set = (weight, reps, bonusType = null) => ({ weight, reps, completed: true, skipped: false, bonusType });
  const exercise = (name, sets) => ({ name, loadType: 'external_weight', metric: 'reps', sets });
  const session = (id, date, sets) => ({ id, date, completed: true, retroactive: false, archetype: 'push', workoutTypes: ['chest'], exercises: [exercise('Bench Press', sets)] });
  const state = deriveBuildState([
    session('1', '2026-10-05', [set(80, 8)]),
    session('2', '2026-10-06', [set(80, 8), set(80, 8), set(100, 8, 'pr')]),
    session('3', '2026-10-07', [set(82.5, 8)]),
  ], new Date(2026, 9, 8, 12));
  assert.deepEqual(state.pieces.map(piece => [piece.metrics.liftsUp, piece.height]), [[0, 1], [0, 1], [1, 1.15]]);
  assert.ok(state.pieces[1].metrics.volumeKg > state.pieces[0].metrics.volumeKg);
});
test('content: finalized onboarding choice and allowed brand verb remain intact', () => {
  const choice = fs.readFileSync(path.join(root, 'features/onboarding/StartingPointScreen.tsx'), 'utf8');
  assert.match(choice, /title="Give me workouts" description="Start with workouts from Stack\."/);
  assert.ok(!choice.includes('Get Stack’s plan'));
  assert.equal(load('features/build/introCopy.ts').INTRO_PAGES[0].title, 'Every workout\nstacks up.');
  const bonus = fs.readFileSync(path.join(root, 'components/BonusSet.tsx'), 'utf8');
  assert.match(bonus, /pr: \{ title: 'PR attempt', shortTitle: 'PR attempt', color: '#A99F91' \}/);
});
