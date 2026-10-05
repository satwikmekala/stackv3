/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function harness({ available = true, platform = 'ios', printError, shareError } = {}) {
  const events = [], cache = new Map(), files = new Set();
  const mocks = {
    'react-native': { Platform: { OS: platform } },
    'expo-sharing': {
      isAvailableAsync: async () => available,
      shareAsync: async (uri, options) => { events.push(['share', uri, options]); if (shareError) throw shareError; },
    },
    'expo-print': {
      printToFileAsync: async options => {
        events.push(['print', options]);
        if (printError) throw printError;
        files.add('file:///cache/generated.pdf');
        return { uri: 'file:///cache/generated.pdf', numberOfPages: 1 };
      },
    },
    'expo-file-system': {
      Paths: { cache: 'file:///cache' },
      File: class {
        constructor(...parts) { this.uri = parts.join('/'); }
        get exists() { return files.has(this.uri); }
        delete() { files.delete(this.uri); events.push(['delete', this.uri]); }
        move(destination) {
          assert.ok(files.has(this.uri));
          files.delete(this.uri); files.add(destination.uri); this.uri = destination.uri;
          events.push(['move', this.uri]);
        }
      },
    },
  };
  function load(file) {
    if (mocks[file]) return mocks[file];
    const resolved = path.resolve(root, file.replace(/^@\//, '') + (file.endsWith('.ts') ? '' : '.ts'));
    if (cache.has(resolved)) return cache.get(resolved);
    const exports = {}; cache.set(resolved, exports);
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('exports', 'require', code)(exports, load);
    return exports;
  }
  return { ...load('features/report/shareWorkoutReport.ts'), events, files };
}

const report = {
  id: '7', title: 'Push day', dateLabel: 'Saturday, Oct 3, 2026',
  timeLabel: null, intensityLabel: null, stats: [], highlights: [],
  exercises: [{ position: 1, name: 'Bench Press', volume: '640 kg', notes: [], sets: [
    { ordinal: 1, text: '80 kg × 8', kind: 'working', skipped: false, record: false },
  ] }],
};

test('Share exports a named PDF attachment to the native app picker with document type metadata', async () => {
  const h = harness();
  await h.shareWorkoutReportPdf(report);
  assert.deepEqual(h.events.map(event => event[0]), ['print', 'move', 'share']);
  assert.ok(h.events[0][1].html.includes('80 kg × 8'));
  assert.equal(h.events[2][1], 'file:///cache/Push day - 7 - Workout report.pdf');
  assert.equal(h.events[2][2].mimeType, 'application/pdf');
  assert.equal(h.events[2][2].UTI, 'com.adobe.pdf');
  assert.ok(h.files.has(h.events[2][1]), 'Recipient retains access after the picker closes');
});

test('Repeated sharing replaces the cached attachment and shows the current workout data', async () => {
  const h = harness();
  await h.shareWorkoutReportPdf(report);
  await h.shareWorkoutReportPdf({ ...report, intensityLabel: 'Felt hard' });
  assert.equal(h.files.size, 1);
  assert.equal(h.events.filter(event => event[0] === 'delete').length, 1);
  assert.ok(h.events.filter(event => event[0] === 'print')[1][1].html.includes('Felt hard'));
});

test('Unavailable sharing does not generate a document', async () => {
  const h = harness({ available: false });
  await assert.rejects(h.shareWorkoutReportPdf(report), /not available/);
  assert.deepEqual(h.events, []);
});

test('Web never prints the summary screen or tries to share a local file URI', async () => {
  const h = harness({ platform: 'web' });
  await assert.rejects(h.shareWorkoutReportPdf(report), /mobile app/);
  assert.deepEqual(h.events, []);
});

test('PDF generation failure never opens a picker with a stale attachment', async () => {
  const h = harness({ printError: Error('printer failed') });
  await assert.rejects(h.shareWorkoutReportPdf(report), /printer failed/);
  assert.deepEqual(h.events.map(event => event[0]), ['print']);
});

test('Native share failure reaches the caller so the screen can recover', async () => {
  const h = harness({ shareError: Error('sharing failed') });
  await assert.rejects(h.shareWorkoutReportPdf(report), /sharing failed/);
});
