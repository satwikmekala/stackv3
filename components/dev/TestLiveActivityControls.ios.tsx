import { requireOptionalNativeModule } from 'expo';
import { useMemo } from 'react';

export function TestLiveActivityControls() {
  const Controls = useMemo(() => {
    if (!requireOptionalNativeModule('ExpoWidgets') || !requireOptionalNativeModule('ExpoUI')) {
      return null;
    }
    // Load expo-widgets only in a custom native build that includes its modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./TestLiveActivityControlsNative.ios') as typeof import('./TestLiveActivityControlsNative.ios'))
      .TestLiveActivityControls;
  }, []);

  return Controls ? <Controls /> : null;
}
