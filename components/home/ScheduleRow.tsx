import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import type { ScheduleDay, WorkoutType } from '@/store/workoutStore';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';

type ScheduleRowProps = {
  day: ScheduleDay;
  dayLabel: string;
  onPress?: (type: WorkoutType) => void;
};

export function ScheduleRow({ day, dayLabel, onPress }: ScheduleRowProps) {
  const type = day.completedType ?? day.projectedType;

  if (!type) {
    return (
      <View style={styles.restRow} accessibilityLabel={`${dayLabel}, rest day`}>
        <Text style={[styles.day, styles.muted]}>{dayLabel}</Text>
        <Text style={styles.rest}>Rest</Text>
      </View>
    );
  }

  const meta = workoutMeta[type];
  const completed = Boolean(day.completedType);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${dayLabel}, ${meta.label}${completed ? ', completed' : ''}`}
      onPress={() => onPress?.(type)}
      disabled={!onPress}
      style={styles.workoutRow}
    >
      <Text style={styles.day}>{dayLabel}</Text>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text numberOfLines={1} style={styles.workoutName}>
        {meta.label}
      </Text>
      {completed ? (
        <Check color={meta.color} size={23} strokeWidth={2.8} />
      ) : (
        <ChevronRight color={redesignColors.ashDim} size={22} strokeWidth={2.5} />
      )}
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
  workoutName: {
    flex: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 17,
    color: redesignColors.bone,
  },
  rest: {
    fontFamily: redesignFonts.uiMedium,
    fontSize: 16,
    color: redesignColors.ashDim,
  },
});
