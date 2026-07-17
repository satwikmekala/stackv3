import type { WorkoutType } from '@/store/workoutStore';
import { splitColors } from '@/constants/theme';

export const WORKOUT_ORDER: WorkoutType[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
];

export const workoutMeta: Record<
  WorkoutType,
  { label: string; shortLabel: string; group: string; color: string }
> = {
  chest: {
    label: 'Chest Day',
    shortLabel: 'Chest',
    group: 'Push',
    color: splitColors.chest,
  },
  back: {
    label: 'Back Day',
    shortLabel: 'Back',
    group: 'Pull',
    color: splitColors.back,
  },
  shoulders: {
    label: 'Shoulders Day',
    shortLabel: 'Shoulders',
    group: 'Push',
    color: splitColors.shoulders,
  },
  arms: {
    label: 'Arms Day',
    shortLabel: 'Arms',
    group: 'Upper',
    color: splitColors.arms,
  },
  legs: {
    label: 'Legs Day',
    shortLabel: 'Legs',
    group: 'Lower',
    color: splitColors.legs,
  },
  core: {
    label: 'Core Day',
    shortLabel: 'Core',
    group: 'Core',
    color: splitColors.core,
  },
};
