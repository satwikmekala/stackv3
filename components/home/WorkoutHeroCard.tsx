import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Zap } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ARCHETYPE_COMPOSITIONS,
  getSessionWorkoutDisplay,
  type Archetype,
} from '@/constants/archetypes';
import type { WorkoutType } from '@/store/workoutStore';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { motionDuration, motionEasing } from '@/constants/motion';
import { usePressScale } from '@/hooks/usePressScale';

type WorkoutHeroCardProps = {
  type?: WorkoutType;
  archetypes?: Archetype[];
  exerciseCount: number;
  onPress?: () => void;
  completed?: boolean;
  /** When the queued workout is scheduled: "TODAY", "TOMORROW", "FRIDAY"… */
  whenLabel?: string;
  /** Custom Split overrides — the hierarchy stays identical, only the
   *  identity of the workout comes from the saved split instead of an
   *  archetype. */
  title?: string;
  groupLabel?: string;
  accentColor?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CONTENT_ENTER = FadeInDown.duration(motionDuration.transition)
  .easing(motionEasing.decelerate)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: 3 }],
  })
  .reduceMotion(ReduceMotion.System);
const CONTENT_EXIT = FadeOut.duration(motionDuration.feedback)
  .easing(motionEasing.accelerate)
  .reduceMotion(ReduceMotion.System);

function rgba(hex: string, opacity: number) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function WorkoutHeroCard({
  type,
  archetypes,
  exerciseCount,
  onPress,
  completed = false,
  whenLabel = 'TODAY',
  title,
  groupLabel,
  accentColor,
}: WorkoutHeroCardProps) {
  const primaryArchetype = archetypes?.[0];
  const sessionDisplay = getSessionWorkoutDisplay({
    archetype: primaryArchetype ?? null,
    secondaryArchetype: archetypes?.length === 2 ? archetypes[1] : null,
    workoutTypes: type ? [type] : [],
  });
  const color = completed
    ? redesignColors.accent
    : accentColor ?? sessionDisplay.color;
  const label = completed
    ? 'Nice work this week'
    : title ?? sessionDisplay.label;
  const group = completed
    ? 'Goal met'
    : groupLabel
      ? groupLabel
      : sessionDisplay.isMerged
        ? 'Merged day'
        : primaryArchetype
          ? ARCHETYPE_COMPOSITIONS[primaryArchetype].shortLabel
          : type
            ? workoutMeta[type].group
            : 'Training';
  const glow = useSharedValue(0);
  const pressScale = usePressScale('surface');
  const hasMountedContent = useRef(false);

  useEffect(() => {
    hasMountedContent.current = true;
  }, []);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [color, glow]);

  const buttonStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.24 + glow.value * 0.2,
    shadowRadius: 13 + glow.value * 6,
    transform: [{ scale: 1 + glow.value * 0.025 }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={completed ? 'Add a workout' : `Start ${label}`}
      accessibilityHint={
        completed
          ? 'Your weekly goal is complete'
          : `${group} workout with ${exerciseCount} exercises`
      }
      disabled={!onPress}
      onPress={onPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[styles.card, { borderColor: rgba(color, 0.72) }, pressScale.animatedStyle]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[rgba(color, 0.31), rgba(color, 0.13), 'rgba(29, 25, 21, 0.96)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={hasMountedContent.current ? CONTENT_ENTER : undefined}
        exiting={CONTENT_EXIT}
        key={`${whenLabel}\u0000${label}\u0000${group}\u0000${exerciseCount}`}
      >
        <Text style={[styles.eyebrow, { color }]}>{completed ? 'Goal met' : whenLabel}</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={2}
          style={styles.title}
        >
          {label}
        </Text>
        <Text style={styles.meta}>
          {completed
            ? 'Your weekly target is complete'
            : `${group.toUpperCase()} · ${exerciseCount} ${exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES'}`}
        </Text>
      </Animated.View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <Text style={[styles.tapLabel, { color }]}>
          {completed
            ? 'Add a workout'
            : whenLabel === 'TODAY'
              ? 'START YOUR WORKOUT'
              : 'START EARLY'}
        </Text>
        <Animated.View
          style={[
            styles.playButton,
            { backgroundColor: color, shadowColor: color },
            buttonStyle,
          ]}
        >
          {completed ? (
            <Check color={redesignColors.ink} size={28} strokeWidth={3} />
          ) : (
            <Zap
              color={redesignColors.ink}
              fill={redesignColors.ink}
              size={26}
              strokeWidth={2.5}
            />
          )}
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 246,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1.25,
    overflow: 'hidden',
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: redesignColors.surface,
  },
  eyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    letterSpacing: 2.2,
    marginBottom: 12,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.6,
    color: redesignColors.bone,
    marginBottom: 12,
  },
  meta: {
    fontFamily: redesignFonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.35,
    color: redesignColors.ash,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: redesignColors.hi,
    marginVertical: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.65,
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
