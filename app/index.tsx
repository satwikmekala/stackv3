import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';

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
  const light = useRef(new Animated.Value(0)).current;
  const medium = useRef(new Animated.Value(0)).current;
  const hard = useRef(new Animated.Value(0)).current;
  const wordmark = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const reveal = (value: Animated.Value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 650,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      });

    const animation = Animated.sequence([
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
      Animated.timing(screen, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (!finished) {
        return;
      }

      const profile = useWorkoutStore.getState().profile;
      router.replace(
        profile?.onboardingCompleted ? '/(tabs)' : '/(onboarding)/welcome',
      );
    });

    return () => animation.stop();
  }, [hard, light, medium, router, screen, wordmark]);

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
});
