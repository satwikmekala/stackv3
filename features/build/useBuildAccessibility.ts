import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBuildPreferences, shouldSkipBuildReward } from './preferences';
export const buildPreferences = createBuildPreferences(AsyncStorage);
export function useBuildAccessibility() {
  const preferences = useSyncExternalStore(buildPreferences.subscribe, buildPreferences.getSnapshot, buildPreferences.getSnapshot);
  const [system, setSystem] = useState({ ready: false, reducedMotion: true, screenReader: false });
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    let mounted = true;
    let motionChanged = false;
    let readerChanged = false;
    void buildPreferences.load();
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([reducedMotion, screenReader]) => { if (mounted) setSystem((value) => ({ ready: true, reducedMotion: motionChanged ? value.reducedMotion : reducedMotion, screenReader: readerChanged ? value.screenReader : screenReader })); }).catch(() => { if (mounted) setSystem({ ready: true, reducedMotion: true, screenReader: true }); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reducedMotion) => { motionChanged = true; setSystem((value) => ({ ...value, reducedMotion })); });
    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', (screenReader) => { readerChanged = true; setSystem((value) => ({ ...value, screenReader })); });
    return () => { mounted = false; motion.remove(); reader.remove(); };
  }, []);
  return { ...preferences, ready: preferences.ready && system.ready, reducedMotion: system.reducedMotion || system.screenReader || preferences.reduceEffects,
    screenReader: system.screenReader, largeText: fontScale > 1.3,
    skipRewards: shouldSkipBuildReward(system.reducedMotion, system.screenReader, preferences.reduceEffects, fontScale) };
}
