import { createLiveActivity } from 'expo-widgets';
import { WorkoutLiveActivityLayout } from '@/components/live-activity/WorkoutLiveActivityLayout';
import StackTestLiveActivity from '@/components/dev/StackTestLiveActivity';
import type { WorkoutLiveActivityState } from './state';

export const workoutActivity = createLiveActivity<WorkoutLiveActivityState>(
  'StackWorkoutLiveActivity',
  WorkoutLiveActivityLayout
);
export const testActivity = StackTestLiveActivity;
