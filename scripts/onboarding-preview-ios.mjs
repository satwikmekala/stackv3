import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Reuse the installed development binary in a separate simulator container.
// No native project, normal app, or existing training database is changed.
const run = (file, args) => execFileSync(file, args, { stdio: 'inherit' });
const id = 'com.liftwithstack.onboardingpreview';
const source = execFileSync('xcrun', ['simctl', 'get_app_container', 'booted', 'com.liftwithstack.stack', 'app'], { encoding: 'utf8' }).trim();
const app = path.join(mkdtempSync(path.join(tmpdir(), 'stack-onboarding-preview-')), 'Stack.app');
cpSync(source, app, { recursive: true });
// Widgets are outside this visual preview and have the original app's bundle identity.
rmSync(path.join(app, 'PlugIns'), { recursive: true, force: true });
const plist = path.join(app, 'Info.plist');
for (const command of [
  `Set :CFBundleIdentifier ${id}`, 'Set :CFBundleDisplayName Stack Welcome Preview',
  'Set :RCTMetroPort 8087', 'Delete :CFBundleURLTypes',
  'Add :CFBundleURLTypes array', 'Add :CFBundleURLTypes:0 dict',
  'Add :CFBundleURLTypes:0:CFBundleURLSchemes array',
  'Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string stackwelcome',
]) run('/usr/libexec/PlistBuddy', ['-c', command, plist]);
run('xcrun', ['simctl', 'install', 'booted', app]);
run('xcrun', ['simctl', 'launch', '--terminate-running-process', 'booted', id, '-RCT_jsLocation', 'localhost:8087']);
run('xcrun', ['simctl', 'openurl', 'booted', 'stackwelcome://onboarding-preview']);
