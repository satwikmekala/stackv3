import { requireOptionalNativeModule } from 'expo';
import type { ComponentType } from 'react';

let NativeControls: ComponentType | undefined;

export function TestLiveActivityControls() {
  if (!requireOptionalNativeModule('ExpoWidgets') || !requireOptionalNativeModule('ExpoUI')) {
    return null;
  }

  if (!NativeControls) {
    // Load expo-widgets only in a custom native build that includes its modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeControls = (
      require('./TestLiveActivityControlsNative.ios') as typeof import('./TestLiveActivityControlsNative.ios')
    ).TestLiveActivityControls;
  }

  const Controls = NativeControls;
  return Controls ? <Controls /> : null;
}
