const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// R3F's native entry uses CommonJS. Keep one Three constructor registry across
// its native loader patches and the scene's ESM imports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'ios' && moduleName === 'three') {
    return { type: 'sourceFile', filePath: require.resolve('three') };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
