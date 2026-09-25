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
const { deriveBuildState } = load('features/build/evidence.ts');
const { caseEntries, caseCards } = load('features/build/caseModel.ts');
const { caseHeader, caseCardCopy, unpackedHeader, pieceCardCopy } = load('features/build/caseCopy.ts');
const { pieceCategory } = load('features/build/buildFormat.ts');

const set = (weight, reps) => ({ weight, reps, completed: true });
const lift = (name, sets, loadType = 'external_weight') => ({ name, sets, loadType });
const session = (id, date, exercises, extra = {}) => ({ id: String(id), date, exercises, completed: true, retroactive: false,
  archetype: 'push', secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null, workoutTypes: ['chest'], ...extra });
const bench = (weight = 60) => [lift('Bench press', [set(weight, 8), set(weight, 6)])];
const TODAY = '2026-09-23'; // Current week starts Monday 21 SEP.
const derive = (sessions, today = TODAY) => deriveBuildState(sessions, new Date(`${today}T12:00:00`));
const archive = (sessions, unit = 'kg', today = TODAY) => {
  const state = derive(sessions, today);
  return { state, header: caseHeader(state), cards: caseCards(caseEntries(state)).map((card) => ({ kind: card.kind, ...caseCardCopy(card, unit) })) };
};
const pieceCopy = (sessions, piece, unit = 'kg') => pieceCardCopy(piece, pieceCategory(sessions.find((item) => item.id === piece.sessionId), piece.label), unit);

test('0 sealed weeks: Your Case, no count, no cards', () => {
  const { header, cards } = archive([]);
  assert.deepEqual(header, { title: 'Your Case', count: null, note: 'Every finished week is kept here.' });
  assert.deepEqual(cards, []);
});

test('0 sealed weeks with pieces this week: shelf still empty and the open week shown', () => {
  const { header, cards } = archive([session(1, '2026-09-22', bench())]);
  assert.deepEqual(header, { title: 'Your Case', count: null, note: 'Every finished week is kept here.' });
  assert.deepEqual(cards, [{ kind: 'week', title: 'THIS WEEK', detail: '1 stack · OPEN', a11y: 'This week, open, 1 stack' }]);
});

test('1 sealed week: singular headline, card range and aggregate', () => {
  const { header, cards } = archive([session(1, '2026-09-15', bench())]);
  assert.deepEqual(header, { title: 'Your Case', count: '1 WEEK', note: null });
  assert.deepEqual(cards, [{ kind: 'week', title: '14–20 SEP', detail: '1 stack · 840 KG', a11y: 'Week of 14 September, 1 stack' }]);
});

test('many sealed weeks, with the current week first when it has pieces', () => {
  const sessions = [session(1, '2026-09-01', bench()), session(2, '2026-09-08', bench()), session(3, '2026-09-10', bench(70)), session(4, '2026-09-15', bench()), session(5, '2026-09-21', bench()), session(6, '2026-09-22', bench())];
  const { header, cards } = archive(sessions);
  assert.deepEqual(header, { title: 'Your Case', count: '3 WEEKS', note: null });
  assert.deepEqual(cards.map((card) => [card.title, card.detail]), [
    ['THIS WEEK', '2 stacks · OPEN'],
    ['14–20 SEP', '1 stack · 840 KG'],
    ['7–13 SEP', '2 stacks · 1,820 KG'],
    ['31 AUG–6 SEP', '1 stack · 840 KG'],
  ]);
});

test('100+ sealed weeks: the count stays in digits', () => {
  const sessions = Array.from({ length: 104 }, (_, index) => {
    const date = new Date(2026, 8, 16 - 7 * index);
    return session(index + 1, `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, bench());
  });
  assert.equal(archive(sessions).header.count, '104 WEEKS');
});

test('a single empty week gets its own NO SESSIONS card and is not tappable', () => {
  const { cards } = archive([session(1, '2026-09-01', bench()), session(2, '2026-09-15', bench())]);
  assert.deepEqual(cards, [
    { kind: 'week', title: '14–20 SEP', detail: '1 stack · 840 KG', a11y: 'Week of 14 September, 1 stack' },
    { kind: 'empty', title: '7–13 SEP', detail: 'NO SESSIONS', a11y: 'Week of 7 September, no sessions' },
    { kind: 'week', title: '31 AUG–6 SEP', detail: '1 stack · 840 KG', a11y: 'Week of 31 August, 1 stack' },
  ]);
});

test('consecutive empty weeks collapse into one card, across a month', () => {
  const { cards } = archive([session(1, '2026-08-05', bench()), session(2, '2026-09-16', bench())]);
  assert.deepEqual(cards, [
    { kind: 'week', title: '14–20 SEP', detail: '1 stack · 840 KG', a11y: 'Week of 14 September, 1 stack' },
    { kind: 'empty', title: '10 AUG–13 SEP', detail: 'NO SESSIONS', a11y: '10 August to 13 September, no sessions' },
    { kind: 'week', title: '3–9 AUG', detail: '1 stack · 840 KG', a11y: 'Week of 3 August, 1 stack' },
  ]);
  const collapsed = caseCards(caseEntries(derive([session(1, '2026-08-05', bench()), session(2, '2026-09-16', bench())])))[1];
  assert.deepEqual(collapsed, { id: 'case:2026-09-07', kind: 'empty', start: '2026-08-10', end: '2026-09-13', weeks: 5 });
});

test('no cards before the first piece, and an empty current week adds no card', () => {
  const { cards } = archive([session(1, '2026-09-09', bench()), session(2, '2026-09-15', bench())]);
  assert.deepEqual(cards.map((card) => card.title), ['14–20 SEP', '7–13 SEP']);
  assert.equal(cards.at(-1).kind, 'week');
});

test('unpacked current week: open header, singular and plural', () => {
  const one = derive([session(1, '2026-09-22', bench())]).currentWeek;
  assert.deepEqual(unpackedHeader(one, 'kg'), { title: 'This week', tiles: [{ value: '840', label: 'KG MOVED' }, { value: '1', label: 'STACK' }] });
  const two = derive([session(1, '2026-09-21', bench()), session(2, '2026-09-22', bench())]).currentWeek;
  assert.deepEqual(unpackedHeader(two, 'kg'), { title: 'This week', tiles: [{ value: '1,680', label: 'KG MOVED' }, { value: '2', label: 'STACKS' }] });
});

test('unpacked one-piece sealed week with zero lifts up: no zero segments', () => {
  const sessions = [session(1, '2026-09-15', bench())];
  const week = derive(sessions).sealedWeeks[0];
  assert.deepEqual(unpackedHeader(week, 'kg'), { title: '14–20 September', tiles: [{ value: '840', label: 'KG MOVED' }, { value: '1', label: 'STACK' }] });
  assert.deepEqual(pieceCopy(sessions, week.pieces[0]), { title: 'Push · Tue', detail: '840 kg moved', a11y: 'View Push summary, 15 September' });
});

test('multiple PRs in one piece fold into one PRs segment; summary uses PRS', () => {
  const sessions = [
    session(1, '2026-09-08', [lift('Bench press', [set(80, 8)]), lift('Squat', [set(100, 5)])]),
    session(2, '2026-09-15', [lift('Bench press', [set(85, 8)]), lift('Squat', [set(105, 5)])]),
    session(3, '2026-09-17', [lift('Bench press', [set(80, 8)])], { archetype: null, workoutTypes: ['back'] }),
  ];
  const week = derive(sessions).sealedWeeks.at(-1);
  assert.equal(pieceCopy(sessions, week.pieces[0]).detail, '1,205 kg moved · PRs: Bench press · 85 kg × 8, Squat · 105 kg × 5');
  assert.equal(pieceCopy(sessions, week.pieces[1]).title, 'Back · Thu');
  assert.deepEqual(unpackedHeader(week, 'kg'), { title: '14–20 September', tiles: [{ value: '1,845', label: 'KG MOVED' }, { value: '2', label: 'STACKS' }, { value: '2', label: 'PRS' }] });
});

test('a bodyweight PR reads Bodyweight × reps, and a bodyweight session reads Bodyweight', () => {
  const sessions = [
    session(1, '2026-09-08', [lift('Pull-up', [set(0, 12)], 'bodyweight')]),
    session(2, '2026-09-15', [lift('Pull-up', [set(0, 15)], 'bodyweight')]),
  ];
  const week = derive(sessions).sealedWeeks.at(-1);
  assert.equal(pieceCopy(sessions, week.pieces[0]).detail, 'Bodyweight · PR: Pull-up · Bodyweight × 15');
  assert.deepEqual(unpackedHeader(week, 'kg'), { title: '14–20 September', tiles: [{ value: '1', label: 'STACK' }, { value: '1', label: 'PR' }] });
});

test('lb profile: separators, no decimals on session values, lb aggregates', () => {
  const sessions = [session(1, '2026-09-08', [lift('Bench press', [set(100, 10)])]), session(2, '2026-09-15', [lift('Bench press', [set(102.5, 10)])])];
  const { header, cards } = archive(sessions, 'lbs');
  assert.equal(header.count, '2 WEEKS');
  assert.deepEqual(cards.map((card) => card.detail), ['1 stack · 2,260 LB', '1 stack · 2,205 LB']);
  const week = derive(sessions).sealedWeeks.at(-1);
  assert.equal(pieceCopy(sessions, week.pieces[0], 'lbs').detail, '2,260 lb moved · PR: Bench press · 226 lbs × 10');
  assert.deepEqual(unpackedHeader(week, 'lbs').tiles[0], { value: '2,260', label: 'LB MOVED' });
});
