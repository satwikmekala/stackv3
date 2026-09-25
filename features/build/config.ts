import { Platform } from 'react-native';

// Build is included in signed iOS builds; demo controls stay in development.
export const BUILD_SANDBOX_ENABLED =
  Platform.OS === 'ios' && process.env.EXPO_PUBLIC_BUILD_SANDBOX === '1';

export const BUILD_DEMO_ENABLED = __DEV__ && BUILD_SANDBOX_ENABLED;
