import * as NativeHaptics from 'expo-haptics';
import { useAppPreferences } from '@/store/appPreferences';

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
function enabled() {
  const state = useAppPreferences.getState();
  return state.ready && !state.error && state.haptics;
}
export function selectionAsync() {
  return enabled() ? NativeHaptics.selectionAsync() : Promise.resolve();
}
export function impactAsync(style?: NativeHaptics.ImpactFeedbackStyle) {
  return enabled() ? NativeHaptics.impactAsync(style) : Promise.resolve();
}
export function notificationAsync(type?: NativeHaptics.NotificationFeedbackType) {
  return enabled() ? NativeHaptics.notificationAsync(type) : Promise.resolve();
}
