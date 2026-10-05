import assert from 'node:assert/strict';
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { createApp } from '../src/app.mjs';
import { loadConfig, STACK_IOS_APP_ID } from '../src/config.mjs';
import { SHARE_PREVIEW_PATH } from '../src/routineShareWeb.mjs';

const id = 'AAAAAAAAAAAAAAAAAAAAAA';
const wire = { type: 'stack.split', v: 1, name: 'Push & pull', workouts: [
  { name: 'Push', exercises: ['Bench Press', 'Push Ups'] },
  { name: 'Empty', exercises: [] }, { name: 'Pull', exercises: ['Bench Press'] },
] };
async function start({ payload = JSON.stringify(wire), store, env = {} } = {}) {
  const logs = [], reads = [];
  const server = http.createServer(createApp({ config: loadConfig(env),
    shareStore: store === undefined ? { get: value => { reads.push(value); return payload; } } : store,
    log: value => logs.push(value) }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { logs, reads, base, get: (path, options) => fetch(base + path, { redirect: 'manual', ...options }),
    close: () => new Promise(resolve => server.close(resolve)) };
}

test('initial HTML renders the validated snapshot, exact counts, branded canonical metadata and ID-only CTA without scripts', async () => {
  const app = await start({ env: { STACK_CLIENT_KEY: 'private-key' } });
  try {
    const response = await app.get(`/r/${id}?tracking=private`);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const html = await response.text();
    for (const text of ['Push &amp; pull', '3 workouts · 3 exercises · Shared from Stack',
      'property="og:site_name" content="Stack"', 'property="og:type" content="website"',
      `property="og:url" content="https://liftwithstack.com/r/${id}"`,
      `property="og:image" content="https://liftwithstack.com${SHARE_PREVIEW_PATH}"`,
      'name="twitter:card" content="summary_large_image"', `href="stack://shared-routine?id=${id}"`]) assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /<script|private-key|tracking|railway|import-split|[?&]d=|Get Stack/);
    assert.ok(html.includes('aria-label="Workouts"'));
    assert.ok(html.includes('Bench Press · Push Ups'));
    assert.ok(html.includes('Rest day'));
    assert.ok(html.includes('Request beta access'));
    assert.ok(html.includes('#13110e'));
    assert.deepEqual(app.reads, [id]);
    assert.doesNotMatch(JSON.stringify(app.logs), new RegExp(`${id}|private|tracking|Push|railway`));
  } finally { await app.close(); }
});

test('HTML text, title, OG and Twitter attribute values escape hostile snapshot names', async () => {
  const name = `<img src=x onerror='x'> & "<script>"`;
  const app = await start({ payload: JSON.stringify({ ...wire, name }) });
  try {
    const html = await (await app.get(`/r/${id}`)).text();
    assert.doesNotMatch(html, /<img|<script>|content="<|onerror='/);
    assert.ok(html.includes('&lt;img src=x onerror=&#39;x&#39;&gt; &amp; &quot;&lt;script&gt;&quot;'));
    assert.equal((html.match(/&lt;img/g) ?? []).length, 4);
  } finally { await app.close(); }
});

test('malformed paths do not read storage; missing, failed, corrupt and future-version shares return branded error HTML', async () => {
  const app = await start();
  try {
    for (const path of ['/r', '/r/', '/r/short', `/r/${id}/extra`, `/r/%41${id.slice(1)}`, '/r/' + 'a'.repeat(22)]) {
      const res = await app.get(path); assert.equal(res.status, 400);
      assert.ok((await res.text()).includes('This routine link is broken.'));
    }
    assert.deepEqual(app.reads, []);
  } finally { await app.close(); }
  for (const [options, status, text] of [
    [{ payload: null }, 404, 'This routine is no longer available.'],
    [{ store: null }, 503, 'Couldn’t load this routine. Try again.'],
    [{ store: { get() { throw Error('private SQL ' + id); } } }, 503, 'Couldn’t load this routine. Try again.'],
    [{ payload: '{private corrupt JSON' }, 503, 'Couldn’t load this routine. Try again.'],
    [{ payload: JSON.stringify({ ...wire, v: 99 }) }, 422, 'This routine needs a newer Stack. Update to open it.'],
  ]) {
    const x = await start(options);
    try {
      const res = await x.get(`/r/${id}`); assert.equal(res.status, status);
      const html = await res.text(); assert.ok(html.includes(text));
      assert.doesNotMatch(html, /SQL|private|corrupt|Open in Stack|stack:\/\/|<script|stack\.split/);
      assert.doesNotMatch(JSON.stringify(x.logs), /SQL|private|corrupt/);
      assert.ok(!JSON.stringify(x.logs).includes(id));
    } finally { await x.close(); }
  }
});

test('AASA is exact HTTPS proxy-ready JSON with a verified app identifier and only /r/*, no redirects or website-wide match', async () => {
  const app = await start();
  try {
    const res = await app.get('/.well-known/apple-app-site-association');
    assert.equal(res.status, 200); assert.equal(res.headers.get('content-type'), 'application/json');
    assert.equal(res.headers.get('location'), null);
    assert.deepEqual(await res.json(), { applinks: { apps: [], details: [{ appID: STACK_IOS_APP_ID, paths: ['/r/*'] }] } });
    const head = await app.get('/.well-known/apple-app-site-association', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal((await app.get('/.well-known/apple-app-site-association.json')).status, 404);
    assert.equal((await app.get('/normal-site-page')).status, 404);
  } finally { await app.close(); }
});

test('one cacheable public PNG backs every preview without authentication or routine data', async () => {
  const app = await start({ env: { STACK_CLIENT_KEY: 'private-key' } });
  try {
    const res = await app.get(SHARE_PREVIEW_PATH); assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png'); assert.equal(res.headers.get('location'), null);
    assert.match(res.headers.get('cache-control'), /immutable/);
    const png = Buffer.from(await res.arrayBuffer()); assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
    assert.deepEqual(app.reads, []);
  } finally { await app.close(); }
});

test('App Store CTA is hidden by default and only accepts configured production listing URLs', async () => {
  assert.equal(loadConfig({}).stackAppStoreUrl, null);
  const listing = 'https://apps.apple.com/us/app/stack/id123456789'; // fixture, never used as a production default
  const app = await start({ env: { STACK_APP_STORE_URL: listing } });
  try {
    const html = await (await app.get(`/r/${id}`)).text();
    assert.ok(html.includes(`href="${listing}">Get Stack</a>`));
  } finally { await app.close(); }
  for (const url of ['https://example.com/app/id123', 'https://apps.apple.com.evil.com/app/id123', 'http://apps.apple.com/app/id123',
    'https://apps.apple.com/app/stack', 'https://u:p@apps.apple.com/app/id123', 'https://apps.apple.com/app/id123?q=x']) {
    assert.throws(() => loadConfig({ STACK_APP_STORE_URL: url }));
  }
  assert.throws(() => loadConfig({ STACK_IOS_APP_ID: 'UNKNOWN.com.wrong.app' }));
});

test('HEAD and method handling preserve routes and never render an SPA', async () => {
  const app = await start();
  try {
    const head = await app.get(`/r/${id}`, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
    const post = await app.get(`/r/${id}`, { method: 'POST' }); assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD'); assert.match(await post.text(), /This routine link is broken/);
  } finally { await app.close(); }
});
