/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the production sheet's hooks and handlers with controllable native capture/file promises.
function harness({ deferredCapture = false, deferredFile = false, failCapture = false } = {}) {
  const hooks = [], pendingEffects = [], cleanups = [], captures = [], writes = [], scrolls = [];
  let cursor = 0, dirty = false;
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  const effect = (fn, deps) => {
    const i = cursor++;
    if (!hooks[i] || deps.some((value, j) => value !== hooks[i][j])) {
      hooks[i] = deps;
      pendingEffects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
    }
  };
  const react = {
    createElement: element,
    useState(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = value;
      return [hooks[i], next => { next = typeof next === 'function' ? next(hooks[i]) : next; if (next !== hooks[i]) { hooks[i] = next; dirty = true; } }];
    },
    useRef(value) { const i = cursor++; return hooks[i] ?? (hooks[i] = { current: value }); },
    useEffect: effect, useLayoutEffect: effect,
    useCallback(fn) { cursor++; return fn; },
  };
  const snapshots = new Map();
  const native = {
    Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 390, height: 844 }),
    StyleSheet: { create: value => value, absoluteFill: {} },
    ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(name => [name, name])),
  };
  const mocks = {
    react: { ...react, default: react, __esModule: true }, 'react-native': native,
    'react-native-reanimated': {
      __esModule: true, default: { View: 'Animated.View' }, runOnJS: fn => fn,
      useAnimatedStyle: fn => fn(), useSharedValue: value => react.useRef({ value }).current,
    },
    '@/constants/motion': { withMotionTiming: (value, _options, callback) => { callback?.(true); return value; } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'react-native-view-shot': { captureRef: (target, options) => {
      const uri = `file:///card-${captures.length}.png`;
      const { ref, children, ...snapshot } = target.props;
      snapshots.set(uri, { design: target.type, ...snapshot });
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = () => yes(uri); reject = no; });
      captures.push({ target, options, resolve, reject, uri });
      if (failCapture) reject(Error('capture failed'));
      else if (!deferredCapture) resolve();
      return promise;
    } },
    'expo-file-system': { File: class {
      constructor(uri) { this.uri = uri; }
      base64() {
        if (!deferredFile) return Promise.resolve(snapshots.get(this.uri));
        return new Promise(resolve => { captures.find(capture => capture.uri === this.uri).read = () => resolve(snapshots.get(this.uri)); });
      }
    } },
    'expo-clipboard': { setImageAsync: async image => { writes.push(image); }, hasImageAsync: async () => true },
    '@/services/haptics': { notificationAsync() {}, selectionAsync() {}, NotificationFeedbackType: {} },
    'lucide-react-native': { Check: 'Check', Copy: 'Copy', FileText: 'FileText' },
    '@/constants/theme': { redesignColors: {}, redesignFonts: {} },
    '@/components/LiftLogCard': { LiftLogCard: 'LiftLogCard' },
    '@/components/StatStripCard': { StatStripCard: 'StatStripCard', STAT_STRIP_WIDTH: 1080, STAT_STRIP_HEIGHT: 1920 },
    '@/components/StackFrameCard': { StackFrameCard: 'StackFrameCard' },
  };
  const source = fs.readFileSync(path.join(__dirname, '../components/ShareSheet.tsx'), 'utf8') + '\nexports.testContent = ShareSheetContent;';
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const exports = {};
  new Function('exports', 'require', 'React', code)(exports, name => {
    assert.ok(mocks[name], `Unexpected dependency ${name}`);
    return mocks[name];
  }, react);
  return {
    captures, writes, scrolls, identity: props => exports.ShareSheet(props).props.key,
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
    render(props) {
      let tree;
      for (let pass = 0; pass < 8; pass++) {
        cursor = 0; dirty = false; tree = exports.testContent(props);
        for (const node of nodes(tree)) if (node.props?.ref) {
          node.props.ref.current = node.type === 'ScrollView' ? { scrollTo: value => scrolls.push(value) } : node;
        }
        while (pendingEffects.length) pendingEffects.shift()();
        if (!dirty) break;
      }
      return tree;
    },
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const copy = tree => nodes(tree).find(node => node.type === 'Pressable' && /(?:Copy .* image to clipboard|.* copied to clipboard)/.test(node.props?.accessibilityLabel));
const pager = tree => nodes(tree).find(node => node.type === 'ScrollView');
const swipe = (tree, page) => pager(tree).props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: page * 342 } } });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const props = () => ({ visible: true, workoutId: '1', onClose() {}, accent: '#ff7a3d', title: 'Push', date: '5 Oct',
  volumeValue: '1,144.8', volumeUnit: 'kg', setCount: 3, repCount: 27,
  liftLog: { lines: [{ name: 'Bench Press', value: '1,144.8', unit: 'kg', record: false }], more: 0 },
  frameExercises: [{ name: 'Bench Press', color: '#ff7a3d', setCount: 3, record: false }],
});

test('copies only the selected design with exactly its current rendered weights and reps; every tap captures afresh', async () => {
  const h = harness(), p = props();
  let tree = h.render(p);
  assert.equal(h.captures.length, 0, 'no offscreen warming captures');
  swipe(tree, 1); tree = h.render(p);
  copy(tree).props.onPress(); await flush();
  assert.equal(h.captures[0].target.type, 'LiftLogCard');
  assert.deepEqual(h.writes[0].lines, p.liftLog.lines);
  assert.deepEqual(h.captures[0].options, { width: 1080, height: 1920, quality: 1, format: 'png', result: 'tmpfile' });
  copy(h.render(p)).props.onPress(); await flush();
  assert.equal(h.captures.length, 2, 'never reuse a prior PNG');
  swipe(h.render(p), 2); copy(h.render(p)).props.onPress(); await flush();
  assert.equal(h.writes[2].design, 'StackFrameCard');
  h.unmount();
});

test('workout, units and individual exercise totals invalidate the rendered sheet identity', () => {
  const h = harness(), p = props(), key = h.identity(p);
  for (const update of [{ workoutId: '2' }, { volumeUnit: 'lb' }, { title: 'Pull' },
    { liftLog: { ...p.liftLog, lines: [{ ...p.liftLog.lines[0], value: '50' }] } },
    { liftLog: { ...p.liftLog, lines: [{ ...p.liftLog.lines[0], value: '1,200' }] } }]) {
    assert.notEqual(h.identity({ ...p, ...update }), key);
  }
  assert.equal(h.identity({ ...p, onClose() {}, onSharePdf() {} }), key, 'callback identity cannot reset an open sheet');
});

test('an old delayed capture cannot overwrite the clipboard after switching workouts or units', async () => {
  const old = harness({ deferredCapture: true }), p = props();
  swipe(old.render(p), 1); copy(old.render(p)).props.onPress();
  old.unmount();
  const current = harness(), next = { ...p, workoutId: '2', volumeUnit: 'lb',
    liftLog: { lines: [{ ...p.liftLog.lines[0], value: '2,513.3', unit: 'lb' }], more: 0 } };
  swipe(current.render(next), 1); copy(current.render(next)).props.onPress(); await flush();
  old.captures[0].resolve(); await flush();
  assert.deepEqual(old.writes, []);
  assert.deepEqual(current.writes[0].lines, next.liftLog.lines);
  current.unmount();
});

test('closing/reopening during capture or file read cancels the old copy and resets the visible page to Stat Strip', async () => {
  for (const deferred of ['deferredCapture', 'deferredFile']) {
    const h = harness({ [deferred]: true }), p = props();
    swipe(h.render(p), 1); copy(h.render(p)).props.onPress(); await flush();
    h.render({ ...p, visible: false }); h.render(p);
    assert.ok(h.scrolls.some(scroll => scroll.x === 0 && !scroll.animated));
    assert.equal(copy(h.render(p)).props.accessibilityLabel, 'Copy Stat Strip image to clipboard');
    if (deferred === 'deferredCapture') h.captures[0].resolve(); else h.captures[0].read();
    await flush(); assert.deepEqual(h.writes, []);
    h.unmount();
  }
});

test('fast double taps capture once; copy is disabled during a swipe and scrolling is locked during copy', async () => {
  const h = harness({ deferredCapture: true }), p = props();
  let tree = h.render(p);
  pager(tree).props.onScrollBeginDrag(); tree = h.render(p);
  assert.equal(copy(tree).props.disabled, true);
  copy(tree).props.onPress(); assert.equal(h.captures.length, 0);
  swipe(tree, 1); tree = h.render(p);
  copy(tree).props.onPress(); copy(tree).props.onPress();
  assert.equal(h.captures.length, 1);
  assert.equal(pager(h.render(p)).props.scrollEnabled, false);
  h.captures[0].resolve(); await flush();
  assert.equal(h.writes.length, 1);
  h.unmount();
});

test('failed captures do not copy a stale image and leave the current design available to retry', async () => {
  const h = harness({ failCapture: true }), p = props();
  swipe(h.render(p), 1); copy(h.render(p)).props.onPress(); await flush();
  assert.deepEqual(h.writes, []);
  const button = copy(h.render(p));
  assert.equal(button.props.disabled, false);
  assert.equal(button.props.accessibilityLabel, 'Copy Lift Log image to clipboard');
  h.unmount();
});
