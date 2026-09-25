const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const settingsSource = fs.readFileSync(
  path.resolve(__dirname, '../app/settings.tsx'),
  'utf8',
);

test('settings presents the Increase Between Sets name and current-workout description', () => {
  assert.match(settingsSource, />\s*Increase Between Sets\s*</);
  assert.match(
    settingsSource,
    /Stack automatically increases your target during consecutive sets of the same exercise/,
  );
  assert.doesNotMatch(settingsSource, /Auto-increase Weight/);
  assert.doesNotMatch(settingsSource, /next session/);
});
