import React, { useEffect, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { exerciseInfoAccents, type ExerciseInfoData } from '@/constants/exerciseInfo';
import { redesignColors, redesignFonts } from '@/constants/theme';

function MuscleChip({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={{
      minHeight: 28,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 15,
      backgroundColor: accent,
    }}>
      <Text allowFontScaling={false} style={{
        fontFamily: redesignFonts.uiBold,
        fontSize: 12,
        color: redesignColors.ink,
      }}>{label}</Text>
    </View>
  );
}

// Bottom sheet over the workout screen. Tapping the dimmed area above it or
// dragging it down dismisses it, matching SwapExerciseSheet.
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
  const sheetHeight = useSharedValue(height);
  const dragY = useSharedValue(0);
  const scrollOffsetRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const accent = exerciseInfoAccents[info.category];
  const heroHeight = Math.min(300, Math.max(200, height * 0.34));

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) dragY.set(0);
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 340 : 260,
      easing: visible ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished && !visible) runOnJS(onHidden)();
    });
  }, [dragY, onHidden, progress, visible]);

  const [dragResponder] = useState(() => {
    const finishDrag = (distance: number, velocity: number) => {
      if (distance > 80 || velocity > 0.85) {
        onCloseRef.current();
        return;
      }
      dragY.set(withSpring(0, { damping: 22, stiffness: 240, mass: 0.8 }));
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        scrollOffsetRef.current <= 0 &&
        gesture.dy > 4 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        dragY.set(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => finishDrag(gesture.dy, gesture.vy),
      onPanResponderTerminate: (_, gesture) => finishDrag(gesture.dy, gesture.vy),
    });
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // Closing continues from wherever a drag left the sheet.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value + (1 - progress.value) * (sheetHeight.value + 24) }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.68)' }, backdropStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close exercise info"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        {...dragResponder.panHandlers}
        accessibilityViewIsModal
        onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
        style={[{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: height - insets.top - 12,
          overflow: 'hidden',
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: redesignColors.border,
          backgroundColor: redesignColors.surface,
        }, sheetStyle]}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y; }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom + 20, 36),
          }}
        >
          <View style={{
            width: 38,
            height: 4,
            alignSelf: 'center',
            borderRadius: 2,
            backgroundColor: redesignColors.hi,
          }} />

          <View style={{
            marginTop: 16,
            alignSelf: 'flex-start',
            minHeight: 30,
            paddingHorizontal: 13,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            borderWidth: 1,
            borderColor: redesignColors.border,
            backgroundColor: redesignColors.raised,
            zIndex: 1,
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
            <Text allowFontScaling={false} style={{
              fontFamily: redesignFonts.monoBold,
              fontSize: 10,
              letterSpacing: 1.4,
              color: accent,
            }}>{info.category.toUpperCase()}</Text>
          </View>

          {/* The glow bleeds to the sheet edges so the artwork sits on the same
              surface as the text instead of in a separate panel. */}
          <View style={{ height: heroHeight, marginHorizontal: -24, marginTop: -8, justifyContent: 'center' }}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <RadialGradient id="exerciseGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={accent} stopOpacity="0.14" />
                  <Stop offset="45%" stopColor={accent} stopOpacity="0.05" />
                  <Stop offset="100%" stopColor={accent} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              {/* Stays inside the box so it fades out fully instead of clipping. */}
              <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#exerciseGlow)" />
            </Svg>
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
              <Image
                source={info.image}
                resizeMode="contain"
                accessibilityLabel={`${info.title} exercise illustration`}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          </View>

          <Text allowFontScaling={false} style={{
            marginTop: 4,
            fontFamily: redesignFonts.display,
            fontSize: 32,
            lineHeight: 35,
            letterSpacing: -0.7,
            color: redesignColors.bone,
          }}>{info.title}</Text>
          {/* Only the worked muscles are listed; secondary muscles stay in the data. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
            {info.primaryMuscles.map((muscle) => (
              <MuscleChip key={muscle} label={muscle} accent={accent} />
            ))}
          </View>
          <Text style={{
            marginTop: 12,
            fontFamily: redesignFonts.uiMedium,
            fontSize: 15,
            lineHeight: 23,
            color: redesignColors.bone,
          }}>{info.description}</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
