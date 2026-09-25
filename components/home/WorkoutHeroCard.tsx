import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { WorkoutBolt } from '@/components/WorkoutBolt';
import Animated, {
  FadeInDown,
  FadeOut,
  ReduceMotion,
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
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';

type WorkoutHeroCardProps = {
  type?: WorkoutType;
  archetypes?: Archetype[];
  exerciseCount: number;
  onPress?: (origin?: WorkoutLaunchOrigin) => void;
  completed?: boolean;
  /** When the queued workout is scheduled: "TODAY", "TOMORROW", "FRIDAY"… */
  whenLabel?: string;
  /** Custom Split overrides — the hierarchy stays identical, only the
   *  identity of the workout comes from the saved split instead of an
   *  archetype. */
  title?: string;
  groupLabel?: string;
  accentColor?: string;
  hideStartButton?: boolean;
  /** 0 is roomy, 1 is compact. Home derives this from the measured viewport. */
  verticalCompactness?: number;
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

// Opaque stops keep the charcoal fade consistent across native renderers.
function tintSurface(hex: string, amount: number) {
  const base = [23, 23, 22];
  const channels = base.map((channel, index) => {
    const accent = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
    return Math.round(channel + (accent - channel) * amount);
  });
  return `rgb(${channels.join(', ')})`;
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
  hideStartButton = false,
  verticalCompactness = 0,
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
  const pressScale = usePressScale('surface');
  const hasMountedContent = useRef(false);
  const buttonRef = useRef<View>(null);
  const compactness = Math.max(0, Math.min(1, verticalCompactness));
  const blend = (roomy: number, compact: number) =>
    roomy + (compact - roomy) * compactness;

  useEffect(() => {
    hasMountedContent.current = true;
  }, []);

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
      onPress={() => {
        if (!onPress) return;
        if (completed || !buttonRef.current) {
          onPress();
          return;
        }
        buttonRef.current.measureInWindow((x, y, width, height) => {
          onPress(width > 0 && height > 0
            ? { x: x + width / 2, y: y + height / 2, size: width, color }
            : undefined);
        });
      }}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[
        styles.card,
        {
          minHeight: blend(350, 328),
          paddingTop: blend(32, 28),
          paddingBottom: blend(118, 112),
        },
        pressScale.animatedStyle,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.cardBacklight, { shadowColor: color }]}
      />
      <View pointerEvents="none" style={styles.cardSurface}>
        <LinearGradient
          colors={[tintSurface(color, 0.38), tintSurface(color, 0.2), tintSurface(color, 0.09)]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            tintSurface(color, 0.17),
            tintSurface(color, 0.13),
            tintSurface(color, 0.085),
            tintSurface(color, 0.04),
            '#171716',
          ]}
          locations={[0, 0.28, 0.56, 0.82, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.cardFill}
        />
      </View>

      <Animated.View
        entering={hasMountedContent.current ? CONTENT_ENTER : undefined}
        exiting={CONTENT_EXIT}
        style={[styles.content, { gap: blend(22, 18) }]}
        key={`${whenLabel}\u0000${label}\u0000${group}\u0000${exerciseCount}`}
      >
        <View style={[styles.badge, { backgroundColor: rgba(color, 0.14), borderColor: rgba(color, 0.45) }]}>
          <View style={[styles.badgeDot, { backgroundColor: color, shadowColor: color }]} />
          <Text style={[styles.eyebrow, { color }]}>{completed ? 'GOAL MET' : whenLabel}</Text>
        </View>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={2}
          style={styles.title}
        >
          {label.replace(/,\s*/, ',\n')}
        </Text>
        <Text style={styles.meta}>
          {completed
            ? 'Your weekly target is complete'
            : `${group.toUpperCase()} · ${exerciseCount} ${exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES'}`}
        </Text>
      </Animated.View>

      <View pointerEvents="none" style={styles.actionRow}>
        <View ref={buttonRef} collapsable={false}
          style={[styles.playButton, {
            backgroundColor: color, shadowColor: color, opacity: hideStartButton ? 0 : 1,
          }]}>
          {completed ? (
            <Check color={redesignColors.ink} size={36} strokeWidth={3} />
          ) : (
            <WorkoutBolt />
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Include the entire start button in both layout and the touch target.
    borderRadius: 38,
    borderCurve: 'continuous',
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  cardBacklight: {
    ...StyleSheet.absoluteFill,
    bottom: 46,
    borderRadius: 38,
    borderCurve: 'continuous',
    backgroundColor: '#171716',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
  },
  cardSurface: {
    ...StyleSheet.absoluteFill,
    bottom: 46,
    borderRadius: 38,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#171716',
  },
  cardFill: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 37,
    borderCurve: 'continuous',
  },
  content: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 2.4,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.8,
    color: redesignColors.bone,
    textAlign: 'center',
    width: '100%',
  },
  meta: {
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    lineHeight: 19,
    letterSpacing: 1.5,
    color: redesignColors.ash,
    textAlign: 'center',
  },
  actionRow: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
