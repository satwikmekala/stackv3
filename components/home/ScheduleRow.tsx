import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ScheduleDay } from '@/store/workoutStore';
import { getSessionWorkoutDisplay } from '@/constants/archetypes';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';

type ScheduleRowProps = {
  day: ScheduleDay;
  dayLabel: string;
  onPress?: () => void;
};

export function ScheduleRow({ day, dayLabel, onPress }: ScheduleRowProps) {
  const projectedType = day.projectedWorkoutTypes?.[0];
  const completedDisplay = day.completedWorkout
    ? getSessionWorkoutDisplay(day.completedWorkout)
    : null;

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
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${dayLabel}, rest day, tap to log a workout`}
        onPress={onPress}
        disabled={!onPress}
        style={styles.restRow}
      >
        <Text style={[styles.day, styles.muted]}>{dayLabel}</Text>
        <Text style={styles.rest}>Rest</Text>
      </Pressable>
    );
  }

  const projectedMeta = projectedType ? workoutMeta[projectedType] : null;
  const label = completedDisplay?.label ?? projectedMeta?.label ?? 'Workout';
  const color = completedDisplay?.color ?? projectedMeta?.color ?? redesignColors.ash;
  const completed = Boolean(completedDisplay);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${dayLabel}, ${label}${completed ? ', completed' : ''}`}
      onPress={onPress}
      disabled={!onPress}
      style={styles.workoutRow}
    >
      <Text style={styles.day}>{dayLabel}</Text>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={styles.workoutName}>
        {label}
      </Text>
      {!completed ? (
        <ChevronRight color={redesignColors.ashDim} size={22} strokeWidth={2.5} />
      ) : null}
    </Pressable>
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
    height: 48,
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
