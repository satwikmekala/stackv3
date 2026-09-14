import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSegments } from 'expo-router';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { ActiveWorkoutCard } from '@/components/ActiveWorkoutCard';
import { useWorkoutMinimizeTarget } from '@/store/workoutMinimizeTarget';
import { useWorkoutStore } from '@/store/workoutStore';
import { resumeWorkout } from '@/utils/workoutResume';

// Match FloatingTabBar's existing 64px height + 12px bottom offset without
// changing the tab bar. Leave another 12px between the two controls.
const TAB_BAR_HEIGHT = 64;
const BOTTOM_GAP = 12;

export function ActiveWorkoutBar() {
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const resumingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const bottom =
    insets.bottom + BOTTOM_GAP +
    (segments[0] === '(tabs)' ? TAB_BAR_HEIGHT + BOTTOM_GAP : 0);

  useEffect(() => {
    resumingRef.current = false;
    if (pathname !== '/workout') {
      useWorkoutMinimizeTarget.setState({ bottom });
    }
  }, [bottom, pathname]);

  if (!currentSession || pathname === '/workout') return null;

  const bar = (
    <View
      collapsable={false}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { width, height }]}
    >
      <ActiveWorkoutCard
        session={currentSession}
        onPress={() => {
          if (resumingRef.current) return;
          resumingRef.current = true;
          resumeWorkout(router);
        }}
        onLayout={(event) => {
          useWorkoutMinimizeTarget.setState({ height: event.nativeEvent.layout.height });
        }}
        style={{ position: 'absolute', bottom, left: insets.left + 16, right: insets.right + 16 }}
      />
    </View>
  );

  // Settings is a native modal on iOS. A plain Stack sibling sits beneath it;
  // this existing screens primitive keeps the in-app bar above that modal.
  return Platform.OS === 'ios' ? (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      {bar}
    </FullWindowOverlay>
  ) : bar;
}

