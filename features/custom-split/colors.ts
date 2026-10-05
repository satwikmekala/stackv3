import { redesignColors } from '@/constants/theme';
import { getMuscleColor, hasMuscleColorPreference, MUSCLE_COLOR_PALETTE, isMuscleColor, type MuscleColor } from '@/constants/muscleColors';
import type { WorkoutType } from '@/store/workoutStore';

export const DAY_COLORS = MUSCLE_COLOR_PALETTE;
export type DayColor = MuscleColor;
export const isDayColor = isMuscleColor;
export const resolveDayColor = (workout: {
  color?: DayColor | null;
  exercises: readonly { workoutType: WorkoutType }[];
}): string => {
  const type = workout.exercises[0]?.workoutType;
  if (type && hasMuscleColorPreference(type)) return getMuscleColor(type);
  if (workout.color && isDayColor(workout.color)) return DAY_COLORS[workout.color].value;
  return type ? getMuscleColor(type) : redesignColors.ash;
};
