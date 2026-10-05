/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// The native style interop must receive a plain style object, never a callback
// or conditional array. Otherwise the native button loses its layout/hit area.
test('split controls retain geometry through press, release and hover; callbacks still fire', () => {
  let cursor = 0;
  const hooks = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = initial;
      return [hooks[i], value => { hooks[i] = value; }];
    },
  };
  const flatten = styles => !styles ? {} : Array.isArray(styles)
    ? Object.assign({}, ...styles.map(flatten)) : styles;
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/custom-split/SplitPressable.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  new Function('exports', 'require', 'React', code)(exports, id => id === 'react' ? react : {
    Pressable: 'NativePressable', StyleSheet: { flatten },
  }, react);
  const events = [];
  const input = {
    accessibilityLabel: 'Edit split',
    style: ({ pressed, hovered }) => [
      { minWidth: 44, minHeight: 48, flexDirection: 'row', paddingHorizontal: 16 },
      false, hovered && { backgroundColor: '#2A231C' }, pressed && { opacity: 0.65 },
    ],
    children: ({ pressed }) => pressed ? 'pressed' : 'resting',
    onPressIn: e => events.push(['in', e]), onPressOut: e => events.push(['out', e]),
    onPress: () => events.push(['tap']),
  };
  const render = () => { cursor = 0; return exports.SplitPressable(input); };
  let tree = render();
  const geometry = { minWidth: 44, minHeight: 48, flexDirection: 'row', paddingHorizontal: 16 };
  assert.deepEqual(tree.props.style, geometry);
  assert.equal(tree.props.accessibilityLabel, 'Edit split');
  tree.props.onPressIn('event'); tree = render();
  assert.deepEqual(tree.props.style, { ...geometry, opacity: 0.65 });
  assert.deepEqual(tree.props.children, ['pressed']);
  tree.props.onPressOut('event'); tree = render();
  assert.deepEqual(tree.props.style, geometry);
  tree.props.onPress(); assert.deepEqual(events, [['in', 'event'], ['out', 'event'], ['tap']]);
  tree.props.onHoverIn('event'); tree = render();
  assert.deepEqual(tree.props.style, { ...geometry, backgroundColor: '#2A231C' });
  tree.props.onHoverOut('event'); assert.deepEqual(render().props.style, geometry);
});
