/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('production drag callbacks reorder both staged negative and catalog positive identities and cancel safely', async () => {
  for (const ids of [[-1, -2], [1, 2]]) {
    const gestures = [], frames = [], layoutEffects = [], styles = [], events = [];
    const value = initial => ({ value: initial, set(next) { this.value = next; } });
    const react = { __esModule: true, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
      useCallback: fn => fn, useEffect() {}, useLayoutEffect: fn => layoutEffects.push(fn) };
    react.default = react;
    const file = path.resolve(__dirname, '../components/custom-split/SelectedExerciseList.tsx');
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
    const mocks = {
      react,
      'react-native': { Platform: { OS: 'web' }, View: 'View', Text: 'Text', AccessibilityInfo: { announceForAccessibility() {} } },
      'react-native-gesture-handler': { GestureDetector: 'GestureDetector', Gesture: { Pan() {
        const handlers = {}; gestures.push(handlers);
        const api = { activateAfterLongPress: () => api };
        for (const name of ['onStart', 'onUpdate', 'onEnd', 'onFinalize']) api[name] = fn => { handlers[name] = fn; return api; };
        return api;
      } } },
      'react-native-reanimated': { __esModule: true, default: { View: 'Animated.View' }, useSharedValue: value,
        useAnimatedStyle: fn => { styles.push(fn); return fn(); }, runOnJS: fn => fn, runOnUI: fn => fn,
        useFrameCallback: fn => frames.push(fn), withTiming: next => next, ReduceMotion: {}, scrollTo() {} },
      'lucide-react-native': {}, '@/constants/exerciseNames': { displayExerciseName: name => name },
      '@/store/muscleColors': { useMuscleColors() {} }, '@/constants/theme': { redesignColors: {} },
      '@/store/customSplitDraft': { MUSCLE_GROUP_COLORS: {}, getMuscleGroupForExercise: () => 'Chest' },
      '@/components/custom-split/SplitPressable': { SplitPressable: 'Pressable' },
      './ui': { ui: {} }, './showActions': {}, '@/services/haptics': {},
    };
    const exports = {};
    new Function('exports', 'require', 'React', js)(exports, name => { if (!(name in mocks)) throw Error(name); return mocks[name]; }, react);
    const list = exports.SelectedExerciseList({ exercises: ids.map(id => ({ id, name: `Lift ${id}` })),
      scrollRef: {}, scrollOffset: value(0), maxScrollOffset: value(0), measureViewport: async () => ({ top: 0, bottom: 800 }),
      onDragStateChange: dragging => events.push(['drag', dragging]), onRemove() {}, onReorder: (from, to) => events.push(['reorder', from, to]) });
    const visit = node => Array.isArray(node) ? node.flatMap(visit) : node && typeof node === 'object'
      ? [node, ...visit(node.props.children)] : [];
    for (const row of visit(list).filter(node => typeof node.type === 'function')) row.type(row.props);
    layoutEffects.forEach(fn => fn());
    assert.equal(styles[0]().zIndex, 0, 'the first staged ID is not mistaken for the idle marker');
    gestures[0].onStart({ absoluteY: 100 }); await new Promise(setImmediate);
    gestures[0].onUpdate({ translationY: 110, absoluteY: 210 }); frames[0]({ timeSincePreviousFrame: 16 });
    assert.equal(styles[0]().zIndex, 10); assert.equal(styles[1]().transform[0].translateY, -72);
    gestures[0].onEnd(); assert.ok(events.some(event => JSON.stringify(event) === '["reorder",0,1]'));
    layoutEffects.forEach(fn => fn());
    gestures[1].onStart({ absoluteY: 100 }); gestures[1].onFinalize({}, false);
    assert.equal(styles[1]().zIndex, 0); assert.deepEqual(events.at(-1), ['drag', false]);
  }
});
