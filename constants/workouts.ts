import type { WorkoutType } from '@/store/workoutStore';
import { getMuscleColor } from '@/constants/muscleColors';

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
    label: 'Chest',
    shortLabel: 'Chest',
    group: 'Push',
    get color() { return getMuscleColor('chest'); },
  },
  back: {
    label: 'Back',
    shortLabel: 'Back',
    group: 'Pull',
    get color() { return getMuscleColor('back'); },
  },
  shoulders: {
    label: 'Shoulders',
    shortLabel: 'Shoulders',
    group: 'Push',
    get color() { return getMuscleColor('shoulders'); },
  },
  arms: {
    label: 'Arms',
    shortLabel: 'Arms',
    group: 'Upper',
    get color() { return getMuscleColor('arms'); },
  },
  legs: {
    label: 'Legs',
    shortLabel: 'Legs',
    group: 'Lower',
    get color() { return getMuscleColor('legs'); },
  },
  core: {
    label: 'Core',
    shortLabel: 'Core',
    group: 'Core',
    get color() { return getMuscleColor('core'); },
  },
};
