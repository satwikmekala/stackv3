import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import { createApp } from '../src/app.mjs';
import { loadConfig } from '../src/config.mjs';

const KEY = 'sk-or-v1-test-secret-key-0123456789';
const TEXT = 'Push\nbench 3x8\nshoulder press 10 10 8\nshoulder burnout';

const modelRoutine = {
  routineName: null,
  notes: [],
  unsupported: [],
  workouts: [{
    name: 'Push',
    notes: [],
    exercises: [
      { rawName: 'bench', sets: 3, reps: 8, repsPerSet: null, repsMin: null, repsMax: null, durationSeconds: null, notes: [], group: null },
      { rawName: 'shoulder press', sets: null, reps: null, repsPerSet: [10, 10, 8], repsMin: null, repsMax: null, durationSeconds: null, notes: [], group: null },
      { rawName: 'shoulder burnout', sets: null, reps: null, repsPerSet: null, repsMin: null, repsMax: null, durationSeconds: null, notes: [], group: null },
    ],
  }],
};

const completion = (content, extra = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({
    model: 'google/gemini-3.1-flash-lite',
    provider: 'TestProvider',
    choices: [{ finish_reason: 'stop', message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }],
    usage: { prompt_tokens: 1200, completion_tokens: 300, cost: 0.0002 },
    ...extra,
  }),
});

/** Runs the app on a free port with a scripted OpenRouter. */
const start = async ({ env = {}, replies = [] } = {}) => {
  const calls = [];
  const logs = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    return typeof reply === 'function' ? reply(init) : reply;
  };
  const config = loadConfig({ OPENROUTER_API_KEY: KEY, PORT: '1', ...env });
  const server = http.createServer(createApp({ config, fetch: fakeFetch, log: (entry) => logs.push(entry) }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (body, headers = {}) => {
    const response = await fetch(`${base}/v1/routine-import/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  return { base, post, calls, logs, close: () => new Promise((resolve) => server.close(resolve)) };
};

test('parses, resolves and returns an import result without saving anything', async () => {
  const app = await start({ replies: [completion(modelRoutine)] });
  try {
    const { status, body } = await app.post({ text: TEXT });
    assert.equal(status, 200);
    assert.equal(body.type, 'stack.routineImport');
    assert.deepEqual(body.summary, { workouts: 1, exercises: 3, matched: 1, uncertain: 1, unresolved: 1 });
    const [bench, press, burnout] = body.routine.workouts[0].exercises;
    assert.deepEqual([bench.status, bench.matchedName, bench.sets, bench.reps], ['matched', 'Bench Press', 3, { type: 'fixed', value: 8 }]);
    assert.deepEqual([press.status, press.reps], ['uncertain', { type: 'perSet', values: [10, 10, 8] }]);
    assert.equal(burnout.status, 'unresolved');
    assert.equal(body.importDraft.ready, false);
    assert.equal(body.meta.model, 'google/gemini-3.1-flash-lite');
    assert.equal(body.meta.usage.costUsd, 0.0002);
    assert.ok(!JSON.stringify(body).includes(KEY));
  } finally {
    await app.close();
  }
});

test('OpenRouter request: key in the header only, configured model, strict schema, no data collection', async () => {
  const app = await start({ env: { OPENROUTER_MODEL: 'deepseek/deepseek-v3.2' }, replies: [completion(modelRoutine)] });
  try {
    await app.post({ text: TEXT });
    const [{ url, init, body }] = app.calls;
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
    assert.ok(!init.body.includes(KEY));
    assert.equal(body.model, 'deepseek/deepseek-v3.2');
    assert.equal(body.temperature, 0);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.deepEqual(body.provider, { require_parameters: true, data_collection: 'deny' });
    assert.equal(body.messages[1].content, TEXT);
    assert.ok(init.signal instanceof AbortSignal);
  } finally {
    await app.close();
  }
});

test('input limits: empty, missing, wrong type, too long, oversized body, bad JSON, wrong method and media type', async () => {
  const app = await start({ env: { MAX_TEXT_LENGTH: '200', MAX_BODY_BYTES: '2048' }, replies: [completion(modelRoutine)] });
  try {
    assert.equal((await app.post({ text: '   \n ' })).body.error.code, 'empty_text');
    assert.equal((await app.post({})).body.error.code, 'invalid_request');
    assert.equal((await app.post({ text: 42 })).body.error.code, 'invalid_request');
    assert.equal((await app.post([TEXT])).body.error.code, 'invalid_request');
    const long = await app.post({ text: 'a'.repeat(201) });
    assert.deepEqual([long.status, long.body.error.code], [413, 'text_too_long']);
    assert.equal((await app.post({ text: 'a'.repeat(3000) })).status, 413);
    assert.equal((await app.post('{"text":')).body.error.code, 'invalid_json');
    const plain = await fetch(`${app.base}/v1/routine-import/parse`, { method: 'POST', body: 'hi', headers: { 'Content-Type': 'text/plain' } });
    assert.equal(plain.status, 415);
    assert.equal((await fetch(`${app.base}/v1/routine-import/parse`)).status, 405);
    assert.equal((await fetch(`${app.base}/nope`)).status, 404);
    assert.equal(app.calls.length, 0, 'invalid input never reaches the AI');
  } finally {
    await app.close();
  }
});

test('malformed model output is retried once, then rejected', async () => {
  const retried = await start({ replies: [completion('not json'), completion(modelRoutine)] });
  try {
    const { status, body } = await retried.post({ text: TEXT });
    assert.equal(status, 200);
    assert.equal(body.meta.attempts, 2);
    assert.deepEqual(retried.logs[0].failures.map((f) => f.code), ['invalid_model_output']);
  } finally {
    await retried.close();
  }

  for (const bad of ['```json\n{"workouts": "nope"}\n```', { workouts: [{ exercises: [{ rawName: 5 }] }] }, '']) {
    const app = await start({ replies: [completion(bad)] });
    try {
      const { status, body } = await app.post({ text: TEXT });
      assert.deepEqual([status, body.error.code], [502, 'invalid_model_output']);
      assert.equal(app.calls.length, 2);
    } finally {
      await app.close();
    }
  }
});

test('a cut-off response is treated as malformed', async () => {
  const app = await start({ env: { AI_MAX_ATTEMPTS: '1' }, replies: [completion('{"workouts": [', { choices: [{ finish_reason: 'length', message: { content: '{"workouts": [' } }] })] });
  try {
    assert.equal((await app.post({ text: TEXT })).body.error.code, 'invalid_model_output');
  } finally {
    await app.close();
  }
});

test('slow AI requests time out', async () => {
  const hang = (init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  const app = await start({ env: { AI_TIMEOUT_MS: '1000', REQUEST_DEADLINE_MS: '1500' }, replies: [hang] });
  try {
    const started = Date.now();
    const { status, body } = await app.post({ text: TEXT });
    assert.deepEqual([status, body.error.code], [504, 'ai_timeout']);
    assert.ok(Date.now() - started < 2500);
  } finally {
    await app.close();
  }
});

test('provider errors never expose the key, and logs never contain the pasted text', async () => {
  const leak = { ok: false, status: 401, json: async () => ({ error: { message: `Invalid key ${KEY}` } }) };
  const app = await start({ replies: [leak] });
  try {
    const { status, body } = await app.post({ text: TEXT });
    assert.deepEqual([status, body.error.code], [503, 'ai_unavailable']);
    const everything = JSON.stringify(body) + JSON.stringify(app.logs);
    assert.ok(!everything.includes(KEY), 'key leaked');
    assert.ok(!everything.includes('shoulder burnout'), 'pasted text logged');
    assert.equal(app.logs[0].textChars, TEXT.length);
  } finally {
    await app.close();
  }

  const ok = await start({ replies: [completion(modelRoutine)] });
  try {
    await ok.post({ text: TEXT });
    const log = JSON.stringify(ok.logs);
    assert.ok(!log.includes('shoulder') && !log.includes('bench'), 'pasted text or model output logged');
    assert.deepEqual(ok.logs[0].summary, { workouts: 1, exercises: 3, matched: 1, uncertain: 1, unresolved: 1 });
  } finally {
    await ok.close();
  }
});

test('without an OpenRouter key the server answers 503 instead of calling out', async () => {
  const app = await start({ env: { OPENROUTER_API_KEY: '' }, replies: [completion(modelRoutine)] });
  try {
    assert.equal((await app.post({ text: TEXT })).body.error.code, 'ai_not_configured');
    assert.equal(app.calls.length, 0);
    const health = await (await fetch(`${app.base}/health`)).json();
    assert.deepEqual(health, { ok: true, model: 'google/gemini-3.1-flash-lite', aiConfigured: false });
  } finally {
    await app.close();
  }
});

test('optional client key and per-address rate limit', async () => {
  const app = await start({ env: { STACK_CLIENT_KEY: 'stack-app', RATE_LIMIT_PER_MINUTE: '2' }, replies: [completion(modelRoutine)] });
  try {
    assert.equal((await app.post({ text: TEXT })).status, 401);
    assert.equal((await app.post({ text: TEXT }, { 'x-stack-client-key': 'wrong' })).status, 401);
    const headers = { 'x-stack-client-key': 'stack-app', 'x-forwarded-for': '203.0.113.9' };
    assert.equal((await app.post({ text: TEXT }, headers)).status, 200);
    assert.equal((await app.post({ text: TEXT }, headers)).status, 200);
    const limited = await app.post({ text: TEXT }, headers);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await app.post({ text: TEXT }, { ...headers, 'x-forwarded-for': '203.0.113.10' })).status, 200);
  } finally {
    await app.close();
  }
});
