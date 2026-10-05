// Shared by remotion.config.ts (CLI) and scripts that bundle through the Node API (run from film/).
// The film imports the app's Build geometry (features/build/*.ts), which imports `three` from the
// app's node_modules; pin `three` and React to this package's copies so the bundle holds one of each.
import path from 'node:path';

const local = (name) => path.resolve(process.cwd(), 'node_modules', name);
export const enableConfig = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias ?? {}), three: local('three'), react: local('react'), 'react-dom': local('react-dom') },
  },
});
