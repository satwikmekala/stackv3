import { splitColors, workoutLoggingColors } from '@/constants/theme';
import type { WorkoutType } from '@/store/workoutStore';

export const MUSCLE_COLOR_PALETTE = {
  orange: { name: 'Orange', value: splitColors.chest },
  blue: { name: 'Blue', value: splitColors.back },
  purple: { name: 'Purple', value: splitColors.shoulders },
  teal: { name: 'Teal', value: splitColors.arms },
  lime: { name: 'Lime', value: splitColors.legs },
  pink: { name: 'Pink', value: splitColors.core },
} as const;
export type MuscleColor = keyof typeof MUSCLE_COLOR_PALETTE;
export type MuscleColorPreferences = Partial<Record<WorkoutType, MuscleColor | null>>;
export const isMuscleColor = (value: unknown): value is MuscleColor =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(MUSCLE_COLOR_PALETTE, value);

// Pure readers let catalog metadata, reports, and Build use the same preference
// without importing a React hook or a native storage dependency.
let preferences: MuscleColorPreferences = {};
export function applyMuscleColorPreferences(next: MuscleColorPreferences) {
  preferences = next;
}
export function getMuscleColorPreferences(): MuscleColorPreferences {
  return preferences;
}
export function hasMuscleColorPreference(type: WorkoutType): boolean {
  return Object.prototype.hasOwnProperty.call(preferences, type);
}
export function getMuscleColor(type: WorkoutType): string {
  const choice = preferences[type];
  return choice ? MUSCLE_COLOR_PALETTE[choice].value : splitColors[type];
}
export function getWorkoutLoggingColor(type: WorkoutType): string {
  return hasMuscleColorPreference(type) ? getMuscleColor(type) : workoutLoggingColors[type];
}
