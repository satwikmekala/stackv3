/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(id) {
  if (cache.has(id)) return cache.get(id);
  if (!id.startsWith('@/')) return require(id);
  const file = ['.ts', '.tsx'].map(ext => path.join(root, id.slice(2) + ext)).find(fs.existsSync);
  const exports = {}; cache.set(id, exports);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', js)(exports, load); return exports;
}
const id = 'AAAAAAAAAAAAAAAAAAAAAA';
const routing = load('@/features/sharing/splitLinkRouting');
const intent = load('@/app/+native-intent').redirectSystemPath;

test('exact branded Universal Links and explicit ID-only custom scheme map to the existing Block 2 entry', () => {
  for (const url of [`https://liftwithstack.com/r/${id}`, `https://liftwithstack.com/r/${id}?utm=x#preview`,
    `stack://shared-routine?id=${id}`, `stack:///shared-routine?id=${id}`]) {
    assert.deepEqual(routing.sharedRoutineRouteFromUrl(url), { pathname: '/shared-routine', params: { id } });
    for (const initial of [true, false]) assert.equal(intent({ path: url, initial }), `/shared-routine?id=${id}`);
  }
});
test('unrelated websites, branded website paths and app routes retain their ordinary routing', () => {
  for (const url of [`https://liftwithstack.com.evil.com/r/${id}`, `https://u:p@liftwithstack.com/r/${id}`,
    `http://liftwithstack.com/r/${id}`, `https://www.liftwithstack.com/r/${id}`, `https://liftwithstack.com:443/r/${id}`,
    'https://liftwithstack.com', 'https://liftwithstack.com/privacy', '/your-splits', 'stack://workout?id=7',
    `https://api.up.railway.app/r/${id}`]) {
    assert.equal(routing.sharedRoutineRouteFromUrl(url), null);
    assert.equal(intent({ path: url, initial: false }), url);
  }
});
test('malformed owned paths/IDs and ambiguous fallback parameters route only to broken-link UI', () => {
  for (const url of ['https://liftwithstack.com/r', 'https://liftwithstack.com/r/', 'https://liftwithstack.com/r/short',
    `https://liftwithstack.com/r/${id}/extra`, `https://liftwithstack.com/r/%41${id.slice(1)}`,
    'stack://shared-routine', 'stack://shared-routine?id=short', `stack://shared-routine?id=${id}&id=${id}`,
    'stack://shared-routine?id=' + 'a'.repeat(22)]) {
    assert.deepEqual(routing.sharedRoutineRouteFromUrl(url), { pathname: '/shared-routine', params: { id: '' } });
    assert.equal(intent({ path: url, initial: true }), '/shared-routine?id=');
  }
});
test('legacy payload links keep the strict legacy route on cold and warm launch', () => {
  const transport = load('@/features/sharing/splitTransport');
  const token = transport.encodeSharedSplit({ name: 'Legacy', workouts: [{ name: 'Empty day', exercises: [] }] }).value;
  const url = `stack://import-split?d=${token}`;
  for (const initial of [true, false]) assert.equal(intent({ path: url, initial }), `/import-split?d=${token}`);
  assert.equal(intent({ path: `${url}&d=${token}`, initial: true }), '/import-split?d=');
});
test('Expo source and tracked Release/Debug native targets both carry the exact production Associated Domains entitlement', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'))).expo;
  assert.equal(config.scheme, 'stack'); assert.equal(config.ios.bundleIdentifier, 'com.liftwithstack.stack');
  assert.deepEqual(config.ios.associatedDomains, ['applinks:liftwithstack.com']);
  const native = fs.readFileSync(path.join(root, 'ios/Stack/Stack.entitlements'), 'utf8');
  assert.match(native, /<key>com.apple.developer.associated-domains<\/key>\s*<array>\s*<string>applinks:liftwithstack.com<\/string>/);
  const project = fs.readFileSync(path.join(root, 'ios/Stack.xcodeproj/project.pbxproj'), 'utf8');
  assert.equal((project.match(/CODE_SIGN_ENTITLEMENTS = Stack\/Stack.entitlements;/g) ?? []).length, 2);
  const delegate = fs.readFileSync(path.join(root, 'ios/Stack/AppDelegate.swift'), 'utf8');
  assert.match(delegate, /RCTLinkingManager.application\(application, continue: userActivity/);
});
