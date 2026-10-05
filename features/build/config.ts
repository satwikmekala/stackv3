import { Platform } from 'react-native';

// Keep the Stack tower available in iOS development sessions, including a
// standard Expo launch. The explicit flag also supports the isolated sandbox
// app and signed iOS builds; demo controls stay development-only.
export const BUILD_SANDBOX_ENABLED =
  Platform.OS === 'ios' &&
  (__DEV__ || process.env.EXPO_PUBLIC_BUILD_SANDBOX === '1');

export const BUILD_DEMO_ENABLED = __DEV__ && BUILD_SANDBOX_ENABLED;
