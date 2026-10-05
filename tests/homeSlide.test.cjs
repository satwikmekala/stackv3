/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../features/home/slideCommit.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const api = {};
new Function('exports', output)(api);
const { shouldCommitSlide } = api;
for (const travel of [140, 240, 340]) {
  test(`Slide on ${travel}pt track: only a successful release in final 10% commits`, () => {
    assert.equal(shouldCommitSlide(0, travel, 0, true), false);
    assert.equal(shouldCommitSlide(travel / 2, travel, 0, true), false);
    assert.equal(shouldCommitSlide(travel * 0.9 - 0.01, travel, 0, true), false);
    assert.equal(shouldCommitSlide(travel * 0.9, travel, 0, true), true);
    assert.equal(shouldCommitSlide(travel, travel, 0, true), true);
  });
  test(`Slide on ${travel}pt track: interruption and vertical escape cancel at the end`, () => {
    assert.equal(shouldCommitSlide(travel, travel, 0, false), false);
    assert.equal(shouldCommitSlide(travel, travel, 65, true), false);
    assert.equal(shouldCommitSlide(travel, travel, -65, true), false);
    assert.equal(shouldCommitSlide(travel, travel, 32, true), true);
  });
}
test('An unmeasured track cannot commit', () => {
  assert.equal(shouldCommitSlide(0, 0, 0, true), false);
});
test('Dragging back from the threshold restores cancellation', () => {
  assert.equal(shouldCommitSlide(195, 200, 0, true), true);
  assert.equal(shouldCommitSlide(120, 200, 0, true), false);
});
