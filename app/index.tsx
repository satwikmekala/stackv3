import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { initializeWorkoutStore, useWorkoutStore } from '@/store/workoutStore';

const CARD_SIZE = 72;
const CARD_OFFSET = 12;

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
  const [isRetrying, setIsRetrying] = useState(false);
  const light = useRef(new Animated.Value(0)).current;
  const medium = useRef(new Animated.Value(0)).current;
  const hard = useRef(new Animated.Value(0)).current;
  const wordmark = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;
  const shouldShowFirstRunSplash =
    Boolean(hydrationError) ||
    (isHydrated && !profile?.onboardingCompleted);

  useEffect(() => {
    if (pathname !== '/' || !shouldShowFirstRunSplash) return;

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
      Animated.stagger(180, [
        reveal(light),
        reveal(medium),
        reveal(hard),
      ]),
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

    // [BOOT] 8a — right before Promise.all([animationReady, initializeWorkoutStore()])
    console.log('[BOOT] app/index.tsx: calling Promise.all([animationReady, initializeWorkoutStore()])');
    void Promise.all([animationReady, initializeWorkoutStore()])
      .then(([animationFinished]) => {
        // [BOOT] 8b — Promise.all resolved
        console.log('[BOOT] app/index.tsx: Promise.all resolved, animationFinished:', animationFinished);
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
            profile?.onboardingCompleted ? '/(tabs)' : '/(onboarding)/welcome',
          );
        });
      })
      .catch((error) => {
        minimumAnimation.stop();
        light.setValue(1);
        medium.setValue(1);
        hard.setValue(1);
        wordmark.setValue(1);
        screen.setValue(1);
        console.error('Failed to initialize workout database', error);
      });

    return () => {
      cancelled = true;
      minimumAnimation.stop();
      fadeAnimation?.stop();
    };
  }, [hard, light, medium, pathname, router, screen, shouldShowFirstRunSplash, wordmark]);

  const retryInitialization = async () => {
    setIsRetrying(true);
    try {
      await initializeWorkoutStore();
      if (pathname !== '/') return;
      const profile = useWorkoutStore.getState().profile;
      router.replace(
        profile?.onboardingCompleted ? '/(tabs)' : '/(onboarding)/welcome',
      );
    } catch (error) {
      console.error('Failed to initialize workout database', error);
    } finally {
      setIsRetrying(false);
    }
  };

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
          <View style={styles.logoCanvas}>
            <Animated.View
              style={[
                styles.layer,
                styles.lightLayer,
                makeEntranceStyle(light, 10, 10),
              ]}
            >
              <Image
                accessibilityElementsHidden
                source={require('@/assets/images/logo light.png')}
                style={styles.card}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.layer,
                styles.mediumLayer,
                makeEntranceStyle(medium, 10, 10),
              ]}
            >
              <Image
                accessibilityElementsHidden
                source={require('@/assets/images/logo medium.png')}
                style={styles.card}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.layer,
                styles.hardLayer,
                makeEntranceStyle(hard, 10, 10),
              ]}
            >
              <Image
                accessibilityElementsHidden
                source={require('@/assets/images/logo hard.png')}
                style={styles.card}
              />
            </Animated.View>
          </View>

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
              <Text style={styles.failureTitle}>We couldn&apos;t open your workout data.</Text>
              <Text style={styles.failureMessage}>
                Your data hasn&apos;t been reset. Try again in case the problem is temporary.
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
  logoCanvas: {
    width: CARD_SIZE + CARD_OFFSET * 2,
    height: CARD_SIZE + CARD_OFFSET * 2,
  },
  layer: {
    position: 'absolute',
    width: CARD_SIZE,
    height: CARD_SIZE,
  },
  lightLayer: {
    left: CARD_OFFSET * 2,
    top: CARD_OFFSET * 2,
    zIndex: 1,
  },
  mediumLayer: {
    left: CARD_OFFSET,
    top: CARD_OFFSET,
    zIndex: 2,
  },
  hardLayer: {
    left: 0,
    top: 0,
    zIndex: 3,
  },
  card: {
    width: '100%',
    height: '100%',
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
