/** Inspect the actual signed .app from an archive/IPA, not the Expo JS export.
 * Does not sign, provision, deploy or modify the application. macOS required. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { STACK_IOS_APP_ID } from '../server/src/config.mjs';

const app = process.argv[2];
if (!app || !app.endsWith('.app')) throw Error('Usage: node scripts/verify-routine-universal-links.mjs /absolute/path/Stack.app');
const decode = xml => JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: xml, encoding: 'utf8' }));
const expected = process.env.STACK_IOS_APP_ID || STACK_IOS_APP_ID;
execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
const signed = decode(execFileSync('codesign', ['-d', '--entitlements', ':-', app], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const info = decode(readFileSync(path.join(app, 'Info.plist')));
// Provisioning profiles include date/data values that plutil cannot convert to JSON.
// Extract only the entitlement dictionary before decoding.
const profileXml = execFileSync('security', ['cms', '-D', '-i', path.join(app, 'embedded.mobileprovision')]);
const profileEntitlements = JSON.parse(execFileSync('plutil', ['-extract', 'Entitlements', 'json', '-o', '-', '-'], { input: profileXml, encoding: 'utf8' }));
assert.equal(info.CFBundleIdentifier, 'com.liftwithstack.stack', 'Wrong signed bundle');
assert.equal(signed['application-identifier'], expected, 'Signed app ID differs from AASA');
assert.equal(profileEntitlements['application-identifier'], expected, 'Provisioning profile app ID differs from AASA');
const domain = 'applinks:liftwithstack.com';
assert.ok(signed['com.apple.developer.associated-domains']?.includes(domain), 'Signed app is missing the Associated Domains entitlement');
const allowed = profileEntitlements['com.apple.developer.associated-domains'];
assert.ok(allowed?.includes(domain) || allowed?.includes('*'), 'Provisioning profile does not authorize Associated Domains');
console.log(JSON.stringify({ verified: 'signed app and embedded profile', applicationIdentifier: expected,
  associatedDomain: domain, distribution: signed['get-task-allow'] ? 'development' : 'distribution',
  physicalDeviceValidation: 'still required' }, null, 2));
