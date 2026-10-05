import { ARCHETYPE_COMPOSITIONS } from '@/constants/archetypes';
import { getWorkoutLetter } from '@/store/customSplitDraft';
import { resolveNextCustomWorkoutIndex } from '@/store/customSplitRotation';
import { getCustomSplitDetailAsync } from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';
import { getWeeklyQueueState } from '@/store/weeklyQueueEngine';

export async function getNextWorkoutNameForNotifications(): Promise<string | null> {
  const state = useWorkoutStore.getState();
  const profile = state.profile;
  if (profile?.programMode === 'stack') {
    const next = getWeeklyQueueState().nextUp[0];
    return next ? ARCHETYPE_COMPOSITIONS[next].label : null;
  }
  if (profile?.programMode !== 'custom' || profile.activeSplitId === null) return null;
  const split = state.currentCustomSplit?.id === profile.activeSplitId
    ? state.currentCustomSplit : await getCustomSplitDetailAsync(profile.activeSplitId);
  const workouts = split?.workouts ?? [];
  if (!workouts.length) return null;
  const index = resolveNextCustomWorkoutIndex(workouts, state.getLastCompletedCustomWorkoutId(profile.activeSplitId));
  return workouts[index].name.trim() || `Workout ${getWorkoutLetter(index)}`;
}
