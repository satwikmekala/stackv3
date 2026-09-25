const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../..');

// Execute the actual Expo runtime bundle and the actual Babel-serialized layout,
// rather than copying the optimistic algorithm into a unit-test helper.
module.exports = function widgetRuntime() {
  const code = babel.transformFileSync(path.join(root, 'components/live-activity/WorkoutLiveActivityLayout.tsx'), {
    cwd: root, caller: { name: 'metro', platform: 'ios' },
  }).code;
  const exports = {};
  new Function('exports', 'require', code)(exports, () => ({}));
  const layout = exports.WorkoutLiveActivityLayout;
  if (typeof layout !== 'string') throw Error('The Expo widget directive must compile to a serialized function');
  const context = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(root, 'node_modules/expo-widgets/bundle/build/ExpoWidgets.bundle'), 'utf8'), context);
  vm.runInContext(`globalThis.stackLayout = (${layout});
    globalThis.__expoWidgetLayout = (props, environment) => stackLayout(props, environment).banner;`, context);
  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  return {
    layout,
    press: (props, target) => clone(context.__expoWidgetHandlePress(props, { target, timestamp: Date.now() })),
    render: (props) => context.stackLayout(props, {}),
  };
};
