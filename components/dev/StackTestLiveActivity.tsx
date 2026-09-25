import { createLiveActivity } from 'expo-widgets';
import { WorkoutLiveActivityLayout } from '@/components/live-activity/WorkoutLiveActivityLayout';
import type { WorkoutLiveActivityDisplayState } from '@/services/liveActivity/state';

export type StackTestActivityState = WorkoutLiveActivityDisplayState;

// Retain the Slice 1 name so existing test activities can still be discovered.
export default createLiveActivity<StackTestActivityState>('StackTestLiveActivity', WorkoutLiveActivityLayout);
