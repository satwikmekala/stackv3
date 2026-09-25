// macOS/Xcode only. Tests the actual Expo JavaScriptCore runtime and native queue;
// ActivityKit is mocked for concurrency tests, so this is NOT physical-device QA.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-live-native-test-'));
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });
const plist = (executable, id, type) => `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>${id}</string><key>CFBundleExecutable</key><string>${executable}</string><key>CFBundlePackageType</key><string>${type}</string></dict></plist>`;
try {
  const app = path.join(temp, 'StackWidgetTest.app', 'Contents');
  const bin = path.join(app, 'MacOS', 'Runner');
  const resources = path.join(app, 'Resources', 'ExpoWidgets.bundle');
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  fs.mkdirSync(resources, { recursive: true });
  fs.writeFileSync(path.join(app, 'Info.plist'), plist('Runner', 'dev.stack.widget-runtime-test', 'APPL'));
  fs.writeFileSync(path.join(resources, 'Info.plist'), plist('', 'dev.stack.widget-runtime-resources', 'BNDL'));
  fs.copyFileSync(path.join(root, 'node_modules/expo-widgets/bundle/build/ExpoWidgets.bundle'), path.join(resources, 'ExpoWidgets.bundle'));
  const layout = path.join(temp, 'layout.txt');
  fs.writeFileSync(layout, require('./helpers/widgetRuntime.cjs')().layout);
  const runtime = 'node_modules/expo-widgets/ios/Widgets/WidgetsJSRuntime.swift';
  run('swiftc', [runtime, 'tests/native/live-activity-presentation/main.swift', '-o', bin]);
  run(bin, [layout]);
  // Extract the production executor verbatim; only ActivityKit/storage services
  // are replaced by test doubles. No copy of its ordering algorithm lives here.
  const intent = fs.readFileSync(path.join(root, 'node_modules/expo-widgets/ios/Widgets/AppIntent.swift'), 'utf8');
  const marker = '@available(iOS 16.2, *)\nactor StackLiveActivityPresentation';
  if (!intent.includes(marker)) throw Error('Production presentation executor not found');
  const actor = path.join(temp, 'ProductionActor.swift');
  fs.writeFileSync(actor, 'import Foundation\n' + intent.slice(intent.indexOf(marker)));
  run('swiftc', ['-parse-as-library', runtime, actor, 'tests/native/live-activity-ordering/TestSupport.swift', '-o', bin]);
  run(bin, [layout]);
  const inbox = path.join(temp, 'inbox-test');
  run('swiftc', ['node_modules/expo-widgets/ios/WidgetsEvents.swift', 'tests/native/live-activity-inbox/main.swift', '-o', inbox]);
  run(inbox, []);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
