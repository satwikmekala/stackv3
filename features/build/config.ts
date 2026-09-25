import { Platform } from 'react-native';

// Opt in explicitly. Never expose the native renderer in production or on web/Android.
export const BUILD_SANDBOX_ENABLED =
  __DEV__ && Platform.OS === 'ios' && process.env.EXPO_PUBLIC_BUILD_SANDBOX === '1';
