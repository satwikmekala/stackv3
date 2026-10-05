const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { harness } = require('./hevyHarness.cjs');
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(setImmediate); };
const source = () => ({ name: 'Push / Pull / Legs', workouts: [
  { name: 'Push', color: 'purple', exercises: [{ kind: 'builtin', name: 'Bench Press' },
    { kind: 'custom', name: 'Shared cable press', workoutType: 'chest', primaryMuscle: 'Chest',
      equipment: 'Cable', loadType: 'external_weight', metric: 'reps' }] },
  { name: 'Rest', exercises: [] },
] });

test('real short-share HTTP → cold/warm routing → editor draft → edited independent save, with immutable server snapshot', async () => {
  const { createApp } = await import('../server/src/app.mjs');
  const { loadConfig } = await import('../server/src/config.mjs');
  const { openRoutineShareStore } = await import('../server/src/routineShareStore.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-sharing-e2e-'));
  const store = openRoutineShareStore(path.join(dir, 'shares.sqlite'));
  const server = http.createServer(createApp({ config: loadConfig({}), shareStore: store, log() {} }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = process.env.STACK_SHARING_E2E_BASE_URL || `http://127.0.0.1:${server.address().port}`;
  const sheets = [];
  const sender = harness({ 'react-native': { Share: { share: async content => sheets.push(content) } },
    'react-native-url-polyfill': { URL } });
  const recipient = harness({ 'react-native-url-polyfill': { URL }, 'expo-modules-core': { uuid: { v4: randomUUID } } });
  const client = sender.load('@/features/sharing/routineShareClient');
  try {
    // Share exactly as the production sender does, including native-sheet Copy content.
    const split = sender.database.importPortableSplitSync(source());
    const actualCreate = client.createRoutineShare;
    client.createRoutineShare = payload => actualCreate(payload, { baseUrl });
    await sender.load('@/features/sharing/shareSavedSplit').shareSavedSplit(split.splitId);
    assert.equal(sheets.length, 1);
    const url = sheets[0].message.split('\n').at(-1);
    assert.match(url, /^https:\/\/liftwithstack\.com\/r\/[A-Za-z0-9_-]{22}$/);
    assert.equal(sheets[0].message, `Push / Pull / Legs\n\nShared from Stack\n\n${url}`);
    assert.doesNotMatch(sheets[0].message, /stack:\/\/|stack\.split|\?d=/);
    const id = url.split('/').at(-1);
    if (process.env.STACK_SHARING_E2E_BASE_URL) console.log(`Verified live routine: ${url}`);
    const raw = await (await fetch(`${baseUrl}/v1/routine-shares/${id}`)).text();
    sender.database.renameCustomSplitSync(split.splitId, 'Sender edited later');
    assert.equal(await (await fetch(`${baseUrl}/v1/routine-shares/${id}`)).text(), raw);

    const page = await fetch(`${baseUrl}/r/${id}`, { redirect: 'manual' });
    assert.equal(page.status, 200); assert.equal(page.headers.get('location'), null);
    const html = await page.text();
    for (const text of ['Push / Pull / Legs', 'Shared cable press', '2 workouts · 2 exercises',
      `property="og:url" content="${url}"`, 'property="og:site_name" content="Stack"',
      'name="twitter:card" content="summary_large_image"', `stack://shared-routine?id=${id}`]) assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /stack\.split|import-split|\?d=/);
    assert.equal((await fetch(`${baseUrl}/r/broken`)).status, 400);
    assert.equal((await fetch(`${baseUrl}/r/AAAAAAAAAAAAAAAAAAAAAA`)).status, 404);

    const existing = recipient.database.importPortableSplitSync({ ...source(), name: 'Existing active routine' });
    recipient.database.writeProfile({ name: 'Recipient', experienceLevel: 'intermediate', weeklyGoal: 3,
      trainingDays: [1, 3, 5], onboardingCompleted: true, activeSplitId: existing.splitId,
      programMode: 'custom', autoIncreaseWeight: true, weightIncrement: 0.5, weightIncrementLbs: 5, weightUnit: 'kg' });
    const profile = recipient.sql.prepare('SELECT * FROM profile').all();
    const active = await recipient.database.getCustomSplitDetailAsync(existing.splitId);
    const draftModule = recipient.load('@/store/customSplitDraft'); await settle();
    const draft = draftModule.useCustomSplitDraftStore;
    const before = recipient.sql.prepare('SELECT count(*) AS n FROM custom_splits').get().n;
    const navigated = [];
    const entry = recipient.load('@/features/sharing/sharedRoutineEntry').createSharedRoutineEntry({
      seeds: [...recipient.database.EXERCISE_SEEDS, ...recipient.database.ARCHETYPE_EXERCISE_SEEDS],
      getDraftStore: draft.getState,
      fetch: (shareId, options) => recipient.load('@/features/sharing/routineShareClient').fetchRoutineShare(shareId, { ...options, baseUrl }),
      openEditor: async shareId => { await draftModule.flushCustomSplitDrafts(); navigated.push(shareId); },
    });
    const intent = recipient.load('@/app/+native-intent');
    for (const initial of [true, false]) {
      assert.equal(intent.redirectSystemPath({ path: url, initial }), `/shared-routine?id=${id}`);
      await entry.load(id);
    }
    assert.deepEqual(navigated, [id, id]);
    assert.equal(recipient.sql.prepare('SELECT count(*) AS n FROM custom_splits').get().n, before);
    draft.getState().setSplitName('My edited routine');
    const dayId = draft.getState().draft.workouts[0].id;
    draft.getState().setWorkoutCustomName(dayId, 'Edited push');
    draft.getState().reorderExercise(dayId, 0, 1);
    await entry.load(id); // Reopening preserves this recipient's pending edits.
    assert.equal(draft.getState().draft.name, 'My edited routine');
    const save = recipient.load('@/features/sharing/saveSharedRoutineDraft').saveSharedRoutineDraft;
    const [saved, coalesced] = await Promise.all([save(), save()]);
    assert.equal(saved.splitId, coalesced.splitId); assert.notEqual(saved.splitId, existing.splitId);
    const detail = await recipient.database.getCustomSplitDetailAsync(saved.splitId);
    assert.equal(detail.name, 'My edited routine'); assert.equal(detail.workouts[0].name, 'Edited push');
    assert.deepEqual(detail.workouts[0].exercises.map(e => e.name), ['Shared cable press', 'Bench Press']);
    assert.deepEqual(recipient.sql.prepare('SELECT * FROM profile').all(), profile);
    assert.deepEqual(await recipient.database.getCustomSplitDetailAsync(existing.splitId), active);
    assert.equal(recipient.sql.prepare('SELECT count(*) AS n FROM custom_splits').get().n, before + 1);
    assert.equal(await (await fetch(`${baseUrl}/v1/routine-shares/${id}`)).text(), raw);
  } finally {
    sender.sql.close(); recipient.sql.close();
    await new Promise(resolve => server.close(resolve)); store.close(); fs.rmSync(dir, { recursive: true });
  }
});
