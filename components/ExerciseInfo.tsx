import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { exerciseInfoAccents, type ExerciseInfoData } from '@/constants/exerciseInfo';
import { redesignColors, redesignFonts } from '@/constants/theme';

function MuscleChip({ label, primary, accent }: { label: string; primary: boolean; accent: string }) {
  return (
    <View style={{
      minHeight: 28,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 15,
      borderWidth: primary ? 0 : 1,
      borderColor: redesignColors.border,
      backgroundColor: primary ? accent : 'transparent',
    }}>
      <Text allowFontScaling={false} style={{
        fontFamily: redesignFonts.uiBold,
        fontSize: 12,
        color: primary ? redesignColors.ink : redesignColors.ash,
      }}>{label}</Text>
    </View>
  );
}

export function ExerciseInfo({
  info,
  visible,
  onClose,
  onHidden,
}: {
  info: ExerciseInfoData;
  visible: boolean;
  onClose: () => void;
  onHidden: () => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const accent = exerciseInfoAccents[info.category];
  const stageHeight = Math.min(455, Math.max(340, height * 0.52));
  const heroHeight = Math.max(220, stageHeight - insets.top - 92);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 340 : 260,
      easing: visible ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished && !visible) runOnJS(onHidden)();
    });
  }, [onHidden, progress, visible]);

  const backgroundStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.28, 1], [0, 0.5, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [26, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.975, 1]) },
    ],
  }));
  const artworkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.32, 1], [0, 0.25, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [30, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: redesignColors.ink }, backgroundStyle]} />
      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ flex: 1 }}
        >
          <View style={{ height: stageHeight, paddingTop: insets.top + 12, overflow: 'hidden' }}>
            <View style={{
              height: 48,
              marginHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 2,
            }}>
              <View style={{
                minHeight: 30,
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                borderWidth: 1,
                borderColor: redesignColors.border,
                backgroundColor: redesignColors.raised,
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
                <Text allowFontScaling={false} style={{
                  fontFamily: redesignFonts.monoBold,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  color: accent,
                }}>{info.category.toUpperCase()}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close exercise info"
                onPress={onClose}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: redesignColors.border,
                  backgroundColor: redesignColors.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X color={redesignColors.bone} size={19} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                  <RadialGradient id="exerciseGlow" cx="50%" cy="52%" r="58%">
                    <Stop offset="0%" stopColor={accent} stopOpacity="0.13" />
                    <Stop offset="40%" stopColor={accent} stopOpacity="0.055" />
                    <Stop offset="100%" stopColor={accent} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Ellipse cx="50%" cy="52%" rx="63%" ry="66%" fill="url(#exerciseGlow)" />
              </Svg>
              <Animated.View style={[{ width: '100%', height: heroHeight, paddingHorizontal: 20, paddingVertical: 7 }, artworkStyle]}>
                <Image
                  source={info.image}
                  resizeMode="contain"
                  accessibilityLabel={`${info.title} exercise illustration`}
                  style={{ width: '100%', height: '100%' }}
                />
              </Animated.View>
            </View>
          </View>

          <View style={{
            flexGrow: 1,
            backgroundColor: redesignColors.surface,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: 28,
            paddingTop: 25,
            paddingBottom: Math.max(insets.bottom + 28, 48),
          }}>
            <Text allowFontScaling={false} style={{
              fontFamily: redesignFonts.display,
              fontSize: 32,
              lineHeight: 35,
              letterSpacing: -0.7,
              color: redesignColors.bone,
            }}>{info.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15 }}>
              {info.primaryMuscles.map((muscle) => (
                <MuscleChip key={`primary-${muscle}`} label={muscle} primary accent={accent} />
              ))}
              {info.secondaryMuscles.map((muscle) => (
                <MuscleChip key={`secondary-${muscle}`} label={muscle} primary={false} accent={accent} />
              ))}
            </View>
            <Text style={{
              marginTop: 20,
              fontFamily: redesignFonts.uiMedium,
              fontSize: 15,
              lineHeight: 23,
              color: redesignColors.bone,
            }}>{info.description}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
