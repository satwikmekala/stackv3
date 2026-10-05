import { create } from 'zustand';
import { useWorkoutStore } from './workoutStore';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { createWorkoutLaunchCoordinator, type LaunchState } from '@/features/workout-launch/coordinator';

export const useWorkoutLaunch = create<LaunchState>(() => ({ intent: null, unit: 'kg', busy: false, error: null }));
export const workoutLaunch = createWorkoutLaunchCoordinator({
  current: useWorkoutStore.getState,
  needsConfirmation: () => ONBOARDING_PREVIEW_ENABLED,
  confirmUnit: unit => { useWorkoutStore.getState().confirmWorkoutWeightUnit(unit); },
  start: intent => {
    const store = useWorkoutStore.getState();
    if (intent.kind === 'empty') store.startEmptyWorkout();
    else if (intent.kind === 'custom') store.startWorkoutFromCustomWorkout(intent.splitId, intent.workoutId);
    else store.startWorkoutFromArchetype(intent.archetypes, intent.variants);
  },
  publish: state => useWorkoutLaunch.setState(state),
});
