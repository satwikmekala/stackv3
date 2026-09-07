import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import type { ScheduleDay } from '@/store/workoutStore';
import { getSessionWorkoutDisplay } from '@/constants/archetypes';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ScheduleRowProps = {
  day: ScheduleDay;
  dayLabel: string;
  onPress?: () => void;
};

export function ScheduleRow({ day, dayLabel, onPress }: ScheduleRowProps) {
  const pressScale = usePressScale('surface');
  const projectedType = day.projectedWorkoutTypes?.[0];
  const completedDisplay = day.completedWorkout
    ? getSessionWorkoutDisplay(day.completedWorkout)
    : null;
  const isActionable = Boolean(onPress) && !completedDisplay;

  const handlePress = () => {
    if (!onPress || !isActionable) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  if (!completedDisplay && day.status === 'future') {
    return (
      <View
        style={styles.workoutRow}
        accessibilityLabel={`${dayLabel}, open`}
      >
        <Text style={styles.day}>{dayLabel}</Text>
        <View style={[styles.dot, styles.scheduledDot]} />
        <Text numberOfLines={1} style={[styles.workoutName, styles.scheduledName]}>
          Open
        </Text>
      </View>
    );
  }

  if (!completedDisplay && day.status === 'past') {
    return (
      <AnimatedPressable
        accessibilityRole={isActionable ? 'button' : undefined}
        accessibilityLabel={
          isActionable
            ? `${dayLabel}, rest day, tap to log a workout`
            : `${dayLabel}, rest day`
        }
        onPress={handlePress}
        onPressIn={isActionable ? pressScale.onPressIn : undefined}
        onPressOut={isActionable ? pressScale.onPressOut : undefined}
        disabled={!isActionable}
        style={[styles.restRow, pressScale.animatedStyle]}
      >
        <Text style={[styles.day, styles.muted]}>{dayLabel}</Text>
        <Text style={styles.rest}>Rest</Text>
      </AnimatedPressable>
    );
  }

  const projectedMeta = projectedType ? workoutMeta[projectedType] : null;
  const label = completedDisplay?.label ?? projectedMeta?.label ?? 'Workout';
  const color = completedDisplay?.color ?? projectedMeta?.color ?? redesignColors.ash;
  const completed = Boolean(completedDisplay);

  return (
    <AnimatedPressable
      accessibilityRole={isActionable ? 'button' : undefined}
      accessibilityLabel={`${dayLabel}, ${label}${completed ? ', completed' : ''}`}
      onPress={handlePress}
      onPressIn={isActionable ? pressScale.onPressIn : undefined}
      onPressOut={isActionable ? pressScale.onPressOut : undefined}
      disabled={!isActionable}
      style={[styles.workoutRow, pressScale.animatedStyle]}
    >
      <Text style={styles.day}>{dayLabel}</Text>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={styles.workoutName}>
        {label}
      </Text>
      {!completed ? (
        <ChevronRight color={redesignColors.ashDim} size={22} strokeWidth={2.5} />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  workoutRow: {
    height: 60,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restRow: {
    height: 60,
    // Transparent border keeps the day label on the exact same x as the
    // bordered workout rows above and below it.
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  day: {
    width: 58,
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.25,
    color: redesignColors.ash,
  },
  muted: {
    color: redesignColors.ashDim,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  scheduledDot: {
    borderWidth: 1.5,
    borderColor: redesignColors.ashDim,
  },
  workoutName: {
    flex: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 17,
    color: redesignColors.bone,
  },
  scheduledName: {
    color: redesignColors.ash,
  },
  rest: {
    fontFamily: redesignFonts.uiMedium,
    fontSize: 16,
    color: redesignColors.ashDim,
  },
});
