/* global __dirname */
// macOS/Xcode + an isolated booted iOS simulator. Executes production UIKit code;
// substitutes Expo bridge types only. Does not install or modify the Stack app.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const device = process.argv[2];
if (!device) throw Error('Pass the UUID of a booted QA simulator');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-weight-qa-'));
const run = (args) => execFileSync('xcrun', args, { encoding: 'utf8' });
const id = 'dev.stack.weight-picker-qa';
const source = fs.readFileSync(path.join(root, 'modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift'), 'utf8');
const start = source.indexOf('final class StackWeightPickerView:');
const end = source.indexOf('/// Reps share', start);
if (start < 0 || end < 0) throw Error('Production picker not found');
const app = path.join(temp, 'PickerQA.app');
fs.mkdirSync(app);
fs.writeFileSync(path.join(temp, 'Picker.swift'), 'import UIKit\n' + source.slice(start, end));
fs.copyFileSync(path.join(root, 'tests/native/weight-picker/main.swift'), path.join(temp, 'main.swift'));
fs.writeFileSync(path.join(app, 'Info.plist'), `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>${id}</string><key>CFBundleExecutable</key><string>PickerQA</string><key>CFBundlePackageType</key><string>APPL</string><key>UILaunchScreen</key><dict/><key>LSRequiresIPhoneOS</key><true/></dict></plist>`);
const sdk = run(['--sdk', 'iphonesimulator', '--show-sdk-path']).trim();
run(['--sdk', 'iphonesimulator', 'swiftc', '-sdk', sdk, '-target', 'arm64-apple-ios17.0-simulator', path.join(temp, 'Picker.swift'), path.join(temp, 'main.swift'), '-o', path.join(app, 'PickerQA')]);
run(['simctl', 'install', device, app]);
const container = run(['simctl', 'get_app_container', device, id, 'data']).trim();
const result = path.join(container, 'Documents/result.txt');
fs.rmSync(result, { force: true });
console.log(run(['simctl', 'launch', device, id]).trim());
console.log(`Result file: ${result}`);
console.log(`Build directory: ${temp}`);

(async () => {
  for (let attempt = 0; attempt < 60 && !fs.existsSync(result); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!fs.existsSync(result)) throw Error('Native assertions did not finish; inspect simulator crash logs');
  const output = fs.readFileSync(result, 'utf8');
  if (!output.startsWith('PASS:')) throw Error(output);
  console.log(output.trim());
})().catch(error => { console.error(error); process.exitCode = 1; });
