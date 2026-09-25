import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';

const DEFAULT_REST_SECONDS = 90;

interface RestTimerProps {
  accent: string;
  onFinish: () => void;
  onDismiss: () => void;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function RestTimer({ accent, onFinish, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(DEFAULT_REST_SECONDS);
  const finishedRef = useRef(false);
  const progress = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  // Predict just the next tick on the UI thread, then retarget from the
  // current visual position. Adjustments never snap or change the timer clock.
  useEffect(() => {
    progress.value = reducedMotion
      ? remaining / DEFAULT_REST_SECONDS
      : withTiming(Math.max(0, remaining - 1) / DEFAULT_REST_SECONDS, {
        duration: 1000,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      });
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion, remaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !finishedRef.current) {
      finishedRef.current = true;
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onFinish();
    }
  }, [onFinish, remaining]);

  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const handleSkipRest = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onDismiss();
  };

  const adjustRest = (seconds: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setRemaining((previous) => {
      const next = Math.max(0, previous + seconds);
      return next;
    });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(motionDuration.transition)
        .easing(motionEasing.decelerate)
        .reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(motionDuration.transition)
        .easing(motionEasing.accelerate)
        .reduceMotion(ReduceMotion.System)}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 28,
        backgroundColor: 'transparent',
      }}
    >
      <View
        style={{
          borderRadius: 22,
          padding: 16,
          backgroundColor: redesignColors.surface,
          borderWidth: 1,
          borderColor: redesignColors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            allowFontScaling={false}
            style={{
              flex: 1,
              fontFamily: redesignFonts.display,
              fontSize: 30,
              lineHeight: 36,
              color: redesignColors.bone,
            }}
          >
            Rest
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              marginLeft: 14,
              fontFamily: redesignFonts.monoBold,
              fontSize: 36,
              lineHeight: 42,
              color: redesignColors.bone,
            }}
          >
            {formatTime(remaining)}
          </Text>
        </View>

        <View
          style={{
            height: 3,
            marginTop: 12,
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: redesignColors.raised,
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: 3,
                borderRadius: 2,
                backgroundColor: `${accent}B8`,
                transformOrigin: 'left center',
              },
              progressFillStyle,
            ]}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 13 }}>
          <WorkoutTouchable
            accessibilityRole="button"
            accessibilityLabel="Remove 15 seconds from rest"
            activeOpacity={0.7}
            onPress={() => adjustRest(-15)}
            style={{
              height: 34,
              minWidth: 58,
              paddingHorizontal: 11,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: redesignColors.raised,
              borderWidth: 1,
              borderColor: redesignColors.border,
            }}
          >
            <Text
              allowFontScaling={false}
              style={{ fontFamily: redesignFonts.monoBold, fontSize: 11, color: redesignColors.bone }}
            >
              −15
            </Text>
          </WorkoutTouchable>

          <WorkoutTouchable
            accessibilityRole="button"
            accessibilityLabel="Skip rest"
            activeOpacity={0.7}
            onPress={handleSkipRest}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 34 }}
          >
            <Text
              allowFontScaling={false}
              style={{ fontFamily: redesignFonts.uiSemiBold, fontSize: 12, color: redesignColors.ash }}
            >
              Skip rest
            </Text>
          </WorkoutTouchable>

          <WorkoutTouchable
            accessibilityRole="button"
            accessibilityLabel="Add 15 seconds to rest"
            activeOpacity={0.7}
            onPress={() => adjustRest(15)}
            style={{
              height: 34,
              minWidth: 58,
              paddingHorizontal: 11,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: redesignColors.raised,
              borderWidth: 1,
              borderColor: redesignColors.border,
            }}
          >
            <Text
              allowFontScaling={false}
              style={{ fontFamily: redesignFonts.monoBold, fontSize: 11, color: redesignColors.bone }}
            >
              +15
            </Text>
          </WorkoutTouchable>
        </View>
      </View>
    </Animated.View>
  );
}
