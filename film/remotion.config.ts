import { Config } from '@remotion/cli/config';
import { enableConfig } from './scripts/webpack-override.mjs';

Config.setVideoImageFormat('png');
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setCrf(14);
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(4);

// The film imports the app's Build geometry (features/build/*.ts), which imports `three` from the
// app's node_modules. The override pins every `three`/React import to this package's copies so the
// bundle holds one Three.js and one React.
Config.overrideWebpackConfig(enableConfig);
