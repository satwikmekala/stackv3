/** Temporary review entry. Neither the route nor its redirect exemption exists in release. */
export const ONBOARDING_PREVIEW_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_ONBOARDING_PREVIEW === '1';

export const FIRST_RUN_ROUTE = ONBOARDING_PREVIEW_ENABLED ? '/onboarding-preview' : '/(onboarding)/welcome';
