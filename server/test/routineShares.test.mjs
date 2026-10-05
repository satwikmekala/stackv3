import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createApp } from '../src/app.mjs';
import { loadConfig } from '../src/config.mjs';
import { openRoutineShareStore, generateRoutineShareId, ROUTINE_SHARE_ID_PATTERN } from '../src/routineShareStore.mjs';
import { parseSharedSplitJson, serializeSharedSplit, SHARED_SPLIT_LIMITS } from '../src/stack/splitProtocol.mjs';

const wire = () => ({ type: 'stack.split', v: 1, name: 'Snapshot routine', workouts: [
  { name: 'Push', exercises: ['Bench Press', 'My Cable Fly'] },
], custom: [{ name: 'My Cable Fly', workoutType: 'chest', primaryMuscle: 'Chest',
  equipment: 'Cable', loadType: 'external_weight' }] });
const canonical = (input) => {
  const parsed = parseSharedSplitJson(JSON.stringify(input));
  assert.equal(parsed.ok, true);
  const result = serializeSharedSplit(parsed.value);
  assert.equal(result.ok, true);
  return result.value;
};

const start = async ({ env = {}, storeOverride, generateShareId } = {}) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'stack-shares-'));
  const filename = path.join(dir, 'shares.sqlite');
  const store = openRoutineShareStore(filename);
  const config = loadConfig(env);
  const logs = [], aiCalls = [];
  const server = http.createServer(createApp({ config, shareStore: storeOverride === undefined ? store : storeOverride,
    generateShareId, fetch: (...args) => { aiCalls.push(args); throw new Error('Sharing must not use AI'); },
    log: entry => logs.push(entry) }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, options) => {
    const response = await fetch(`${base}${route}`, options);
    const text = await response.text();
    return { status: response.status, headers: response.headers, text,
      body: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : null };
  };
  const post = (payload, headers = {}) => request('/v1/routine-shares', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
  const get = (id, headers = {}) => request(`/v1/routine-shares/${id}`, { headers });
  return { store, filename, logs, aiCalls, config, base, request, post, get,
    close: async () => { await new Promise(resolve => server.close(resolve)); store.close(); rmSync(dir, { recursive: true }); } };
};

test('creates a canonical immutable snapshot, retrieves it without auth, and survives reopening storage', async () => {
  const app = await start();
  try {
    const source = wire();
    const expected = canonical(source);
    const result = await app.post(source);
    assert.equal(result.status, 201);
    assert.match(result.body.id, ROUTINE_SHARE_ID_PATTERN);
    assert.equal(result.body.url, `https://liftwithstack.com/r/${result.body.id}`);
    assert.deepEqual(Object.keys(result.body), ['id', 'url']);
    source.name = 'Edited after sharing'; source.workouts[0].exercises.reverse();
    assert.equal(app.store.get(result.body.id), expected);
    const retrieved = await app.get(result.body.id);
    assert.equal(retrieved.status, 200);
    assert.equal(retrieved.text, expected);
    assert.equal(retrieved.headers.get('cache-control'), 'no-store');
    const reopened = openRoutineShareStore(app.filename);
    assert.equal(reopened.get(result.body.id), expected);
    reopened.close();
    const db = new DatabaseSync(app.filename);
    const row = db.prepare('SELECT * FROM routine_shares').get();
    assert.equal(row.protocol_version, 1); assert.ok(Number.isFinite(Date.parse(row.created_at)));
    assert.throws(() => db.prepare('UPDATE routine_shares SET payload = ?').run('{}'), /immutable/);
    assert.throws(() => db.exec('DELETE FROM routine_shares'), /cannot be deleted/);
    db.close();
    assert.equal(app.aiCalls.length, 0);
  } finally { await app.close(); }
});

test('existing validator normalizes and filters unknown/private fields at every level', async () => {
  const app = await start();
  try {
    const source = wire(); source.name = '  Snapshot routine  ';
    Object.assign(source, { id: 111, userId: 'private-user', analyticsId: 'private-analytics', history: [{ weight: 999 }], notes: 'private notes', createdAt: 'private time' });
    Object.assign(source.workouts[0], { name: ' Push ', id: 222, sets: [999], settings: { units: 'lbs' } });
    Object.assign(source.custom[0], { id: 333, pr: 999, weight: 999, notes: 'private', loggedSets: [999] });
    const result = await app.post(JSON.stringify(source, null, 2));
    assert.equal(result.status, 201);
    const stored = app.store.get(result.body.id);
    assert.equal(stored, canonical(wire()));
    assert.doesNotMatch(stored, /private|999|111|222|333/);
  } finally { await app.close(); }
});

test('uses the configured HTTPS public origin and rejects invalid origin/database config', async () => {
  const app = await start({ env: { ROUTINE_SHARE_PUBLIC_ORIGIN: 'https://sharing.example/' } });
  try {
    const result = await app.post(wire());
    assert.equal(result.body.url, `https://sharing.example/r/${result.body.id}`);
  } finally { await app.close(); }
  for (const origin of ['http://example.com', 'https://example.com/r', 'https://u:p@example.com', 'https://example.com/?q=x', 'https://example.com/#x']) {
    assert.throws(() => loadConfig({ ROUTINE_SHARE_PUBLIC_ORIGIN: origin }));
  }
  for (const filename of [':memory:', 'relative.sqlite']) {
    assert.throws(() => loadConfig({ ROUTINE_SHARES_DB_PATH: filename }));
    assert.throws(() => openRoutineShareStore(filename));
  }
  assert.throws(() => openRoutineShareStore(null));
  assert.throws(() => loadConfig({ RAILWAY_PROJECT_ID: 'project', ROUTINE_SHARES_DB_PATH: '/data/shares.sqlite' }));
  assert.throws(() => loadConfig({ RAILWAY_PROJECT_ID: 'project', RAILWAY_VOLUME_MOUNT_PATH: '/data', ROUTINE_SHARES_DB_PATH: '/tmp/shares.sqlite' }));
  assert.throws(() => loadConfig({ RAILWAY_PROJECT_ID: 'project', RAILWAY_VOLUME_MOUNT_PATH: '/data', ROUTINE_SHARES_DB_PATH: '/data/../tmp/shares.sqlite' }));
  assert.equal(loadConfig({ RAILWAY_PROJECT_ID: 'project', RAILWAY_VOLUME_MOUNT_PATH: '/data', ROUTINE_SHARES_DB_PATH: '/data/shares.sqlite' }).routineSharesDbPath, '/data/shares.sqlite');
});

test('IDs use 16 random bytes, are unpadded canonical base64url, and are not sequential', () => {
  const ids = Array.from({ length: 1000 }, generateRoutineShareId);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.equal(id.length, 22); assert.match(id, ROUTINE_SHARE_ID_PATTERN);
    assert.equal(Buffer.from(id, 'base64url').length, 16);
    assert.equal(Buffer.from(id, 'base64url').toString('base64url'), id);
  }
});

test('malformed IDs, absent snapshots, temporary failures and internal failures are distinct', async () => {
  const app = await start();
  try {
    for (const id of ['short', 'a'.repeat(21), 'a'.repeat(23), 'a'.repeat(22), '%20'.repeat(22), 'x/y']) {
      const result = await app.get(id);
      assert.deepEqual([result.status, result.body.error.code], [400, 'invalid_share_id']);
    }
    const missing = await app.get(generateRoutineShareId());
    assert.deepEqual([missing.status, missing.body.error.code], [404, 'share_not_found']);
  } finally { await app.close(); }
  for (const [storeOverride, status, code] of [
    [null, 503, 'storage_unavailable'],
    [{ get: () => { throw Object.assign(new Error('private failure'), { errcode: 5 }); }, insert: () => { throw Object.assign(new Error('private failure'), { errcode: 5 }); } }, 503, 'storage_unavailable'],
    [{ get: () => { throw new Error('private failure'); }, insert: () => { throw new Error('private failure'); } }, 500, 'internal_error'],
  ]) {
    const failed = await start({ storeOverride });
    try {
      for (const result of [await failed.get(generateRoutineShareId()), await failed.post(wire())]) {
        assert.deepEqual([result.status, result.body.error.code], [status, code]);
      }
      assert.doesNotMatch(JSON.stringify(failed.logs), /private failure/);
    } finally { await failed.close(); }
  }
});

test('collision is retried at the unique persistence boundary without overwriting the original', async () => {
  const first = generateRoutineShareId(), next = generateRoutineShareId();
  const ids = [first, first, next];
  const app = await start({ generateShareId: () => ids.shift() });
  try {
    const one = await app.post(wire());
    const changed = wire(); changed.name = 'Second snapshot';
    const two = await app.post(changed);
    assert.deepEqual([one.body.id, two.body.id], [first, next]);
    assert.equal(app.store.get(first), canonical(wire()));
    assert.equal(app.store.get(next), canonical(changed));
  } finally { await app.close(); }
});

test('bounded collision retries fail safely; invalid generated IDs never reach storage', async () => {
  const id = generateRoutineShareId();
  let attempts = 0;
  const app = await start({ generateShareId: () => { attempts++; return id; } });
  try {
    assert.equal((await app.post(wire())).status, 201);
    const result = await app.post(wire());
    assert.deepEqual([result.status, result.body.error.code], [500, 'internal_error']);
    assert.equal(attempts, 6);
    assert.equal(app.store.get(id), canonical(wire()));
  } finally { await app.close(); }
  const invalid = await start({ generateShareId: () => 'invalid' });
  try { assert.equal((await invalid.post(wire())).status, 500); }
  finally { await invalid.close(); }
});

test('size and protocol errors are rejected before persistence, including duplicate JSON keys', async () => {
  const app = await start();
  try {
    const huge = { ...wire(), ignored: 'x'.repeat(SHARED_SPLIT_LIMITS.maxPayloadBytes) };
    const result = await app.post(huge);
    assert.deepEqual([result.status, result.body.error.code], [413, 'body_too_large']);
    for (const [input, code] of [
      ['{', 'invalid_json'], ['{"type":"stack.split","v":1,"v":1}', 'duplicate_key'],
      [{ ...wire(), v: 99 }, 'unsupported_version'], [{ ...wire(), type: 'other' }, 'unsupported_type'],
      [{ ...wire(), name: '' }, 'empty_name'],
    ]) {
      const rejected = await app.post(input);
      assert.equal(rejected.status, 400); assert.equal(rejected.body.error.code, code);
    }
    const db = new DatabaseSync(app.filename);
    assert.equal(db.prepare('SELECT count(*) AS n FROM routine_shares').get().n, 0); db.close();
  } finally { await app.close(); }
});

test('body size limit also rejects chunked requests without a Content-Length header', async () => {
  const app = await start();
  try {
    const result = await new Promise((resolve, reject) => {
      const req = http.request(`${app.base}/v1/routine-shares`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.write(' '.repeat(SHARED_SPLIT_LIMITS.maxPayloadBytes)); req.end(' ');
    });
    assert.deepEqual([result.status, result.body.error.code], [413, 'body_too_large']);
  } finally { await app.close(); }
});

test('creation has its own rate limit and optional client key, reads remain public', async () => {
  const app = await start({ env: { STACK_CLIENT_KEY: 'app-key', ROUTINE_SHARE_RATE_LIMIT_PER_MINUTE: '1', RATE_LIMIT_PER_MINUTE: '1' } });
  try {
    assert.equal((await app.post(wire())).status, 401);
    const headers = { 'x-stack-client-key': 'app-key', 'x-forwarded-for': '203.0.113.9' };
    // A parse consumes its own window, even without AI configured.
    assert.equal((await app.request('/v1/routine-import/parse', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{"text":"bench 3x8"}' })).status, 503);
    const created = await app.post(wire(), headers); assert.equal(created.status, 201);
    const limited = await app.post(wire(), headers);
    assert.deepEqual([limited.status, limited.body.error.code], [429, 'rate_limited']);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await app.get(created.body.id)).status, 200);
    assert.equal((await app.post(wire(), { ...headers, 'x-forwarded-for': '203.0.113.10' })).status, 201);
  } finally { await app.close(); }
});

test('logs never include the payload, share ID or complete public URL, even on storage failures', async () => {
  const app = await start();
  try {
    const created = await app.post(wire());
    await app.get(created.body.id);
    await app.request(`/r/${created.body.id}`);
    const logs = JSON.stringify(app.logs);
    for (const secret of [created.body.id, created.body.url, 'Snapshot routine', 'My Cable Fly', 'Bench Press']) {
      assert.ok(!logs.includes(secret));
    }
    assert.equal(app.logs[1].path, '/v1/routine-shares/:id');
  } finally { await app.close(); }
});

test('route methods and content types are enforced', async () => {
  const app = await start();
  try {
    assert.equal((await app.request('/v1/routine-shares')).status, 405);
    assert.equal((await app.request(`/v1/routine-shares/${generateRoutineShareId()}`, { method: 'POST' })).status, 405);
    assert.equal((await app.post(wire(), { 'Content-Type': 'text/plain' })).status, 415);
  } finally { await app.close(); }
});
