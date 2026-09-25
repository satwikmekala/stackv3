import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Install a separate simulator app so the normal Stack app/database stays intact.
const root = fileURLToPath(new URL('..', import.meta.url));
const derived = process.env.STACK_BUILD_DERIVED_DATA || path.join(root, '.expo/build-sandbox-native');
const id = 'com.liftwithstack.buildsandbox';
const run = (file, args, extra = {}) => execFileSync(file, args, { cwd: root, stdio: 'inherit', ...extra });
const devices = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], { encoding: 'utf8' }));
const booted = Object.values(devices.devices).flat().filter((device) => device.state === 'Booted');
if (booted.length !== 1) throw new Error('Boot exactly one iPhone simulator before running this command.');
const udid = booted[0].udid;

if (!process.argv.includes('--skip-build')) {
  run('pod', ['install'], { cwd: path.join(root, 'ios') });
  run('xcodebuild', ['-workspace', 'ios/Stack.xcworkspace', '-scheme', 'Stack', '-configuration', 'Debug',
    '-sdk', 'iphonesimulator', '-destination', `platform=iOS Simulator,id=${udid}`, '-derivedDataPath', derived,
    `PRODUCT_BUNDLE_IDENTIFIER=${id}`, 'CODE_SIGNING_ALLOWED=NO']);
}
const app = path.join(derived, 'Build/Products/Debug-iphonesimulator/Stack.app');
const plist = path.join(app, 'Info.plist');
// Only the compiled artifact changes. The project's release identity is untouched.
run('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleDisplayName Stack Build', plist]);
run('/usr/libexec/PlistBuddy', ['-c', 'Set :RCTMetroPort 8087', plist]);
run('/usr/libexec/PlistBuddy', ['-c', 'Delete :CFBundleURLTypes', plist]);
for (const command of [
  'Add :CFBundleURLTypes array', 'Add :CFBundleURLTypes:0 dict',
  'Add :CFBundleURLTypes:0:CFBundleURLSchemes array',
  'Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string stackbuild',
]) run('/usr/libexec/PlistBuddy', ['-c', command, plist]);
run('xcrun', ['simctl', 'install', udid, app]);
run('xcrun', ['simctl', 'launch', '--terminate-running-process', udid, id, '-RCT_jsLocation', 'localhost:8087']);
run('xcrun', ['simctl', 'openurl', udid, 'stackbuild://build-sandbox']);
