import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { FIRST_RUN_ROUTE, ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackLogo } from '@/components/StackLogo';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { SetupLoading } from '@/features/onboarding/SetupLoading';
import { loadSharedRoutineHandoff, onboardingDestination, useSharedRoutineHandoff } from '@/store/sharedRoutineHandoff';
import { initializeWorkoutStore, useWorkoutStore } from '@/store/workoutStore';

const LOGO_SIZE = 96;

const makeEntranceStyle = (
  progress: Animated.Value,
  fromX: number,
  fromY: number,
) => ({
  opacity: progress,
  transform: [
    {
      translateX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [fromX, 0],
      }),
    },
    {
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [fromY, 0],
      }),
    },
    {
      scale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.94, 1],
      }),
    },
  ],
});

export default function Splash() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useWorkoutStore((state) => state.profile);
  const isHydrated = useWorkoutStore((state) => state.isHydrated);
  const hydrationError = useWorkoutStore((state) => state.hydrationError);
  const handoff = useSharedRoutineHandoff();
  const [handoffAttempt, setHandoffAttempt] = useState(0);
  useEffect(() => { if (ONBOARDING_PREVIEW_ENABLED) void loadSharedRoutineHandoff().catch(() => {}); }, [handoffAttempt]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [mark] = useState(() => new Animated.Value(0));
  const [wordmark] = useState(() => new Animated.Value(0));
  const [screen] = useState(() => new Animated.Value(1));
  const shouldShowFirstRunSplash =
    Boolean(hydrationError) ||
    (isHydrated && !profile?.onboardingCompleted);

  useEffect(() => {
    if (pathname !== '/' || !shouldShowFirstRunSplash || ONBOARDING_PREVIEW_ENABLED && !hydrationError) return;

    let cancelled = false;
    let fadeAnimation: Animated.CompositeAnimation | null = null;

    const reveal = (value: Animated.Value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 650,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      });

    const minimumAnimation = Animated.sequence([
      reveal(mark),
      Animated.timing(wordmark, {
        toValue: 1,
        duration: 520,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.delay(3000),
    ]);

    const animationReady = new Promise<boolean>((resolve) => {
      minimumAnimation.start(({ finished }) => resolve(finished));
    });

    void Promise.all([animationReady, initializeWorkoutStore()])
      .then(([animationFinished]) => {
        if (!animationFinished || cancelled) return;

        fadeAnimation = Animated.timing(screen, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        });
        fadeAnimation.start(({ finished }) => {
          if (!finished || cancelled || pathname !== '/') return;
          const profile = useWorkoutStore.getState().profile;
          router.replace(
            profile?.onboardingCompleted ? '/(tabs)' : FIRST_RUN_ROUTE,
          );
        });
      })
      .catch((error) => {
        minimumAnimation.stop();
        mark.setValue(1);
        wordmark.setValue(1);
        screen.setValue(1);
        console.error('Failed to initialize workout database', error);
      });

    return () => {
      cancelled = true;
      minimumAnimation.stop();
      fadeAnimation?.stop();
    };
  }, [mark, pathname, router, screen, shouldShowFirstRunSplash, wordmark, hydrationError]);

  const retryInitialization = async () => {
    setIsRetrying(true);
    try {
      await initializeWorkoutStore();
      if (pathname !== '/') return;
      const profile = useWorkoutStore.getState().profile;
      router.replace(
        profile?.onboardingCompleted ? '/(tabs)' : FIRST_RUN_ROUTE,
      );
    } catch (error) {
      console.error('Failed to initialize workout database', error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (ONBOARDING_PREVIEW_ENABLED && isHydrated && !hydrationError && !profile?.onboardingCompleted) {
    return <Redirect href={FIRST_RUN_ROUTE} />;
  }
  if (ONBOARDING_PREVIEW_ENABLED && isHydrated && !hydrationError && profile?.onboardingCompleted) {
    if (!handoff.ready) return <SetupLoading error={handoff.error} retry={() => setHandoffAttempt(value => value + 1)} />;
    return <Redirect href={onboardingDestination()} />;
  }
  if (!shouldShowFirstRunSplash) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.screen, { opacity: screen }]}>
        <View
          accessibilityLabel="Stack"
          accessibilityRole="image"
          style={styles.brand}
        >
          <Animated.View style={makeEntranceStyle(mark, 10, 10)}>
            <StackLogo size={LOGO_SIZE} />
          </Animated.View>

          <Animated.View
            style={{
              opacity: wordmark,
              transform: [
                {
                  translateY: wordmark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.wordmark}>stack</Text>
          </Animated.View>

          {hydrationError ? (
            <View accessibilityLiveRegion="polite" style={styles.failure}>
              <Text style={styles.failureTitle}>Couldn’t open your workout data.</Text>
              <Text style={styles.failureMessage}>
                Your data hasn’t been reset. Try again.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isRetrying}
                onPress={() => void retryInitialization()}
                style={({ pressed }) => [
                  styles.retryButton,
                  (pressed || isRetrying) && styles.retryButtonPressed,
                ]}
              >
                <Text style={styles.retryButtonText}>
                  {isRetrying ? 'Trying again…' : 'Try again'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: 32,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  failure: {
    width: 280,
    marginTop: 28,
    alignItems: 'center',
  },
  failureTitle: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  failureMessage: {
    marginTop: 8,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 132,
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: redesignColors.bone,
  },
  retryButtonPressed: {
    opacity: 0.72,
  },
  retryButtonText: {
    color: redesignColors.ink,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    lineHeight: 20,
  },
});
