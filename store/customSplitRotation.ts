import type { CustomSplitWorkout } from '@/store/customSplits';

/**
 * Durable next-workout resolution for an active Custom Split.
 *
 * There is no persisted cursor: rotation is derived from the split's own
 * completed session history, so it survives relaunches, per-split switching
 * and manual "Change workout" detours without any extra state to migrate.
 *
 * `lastCompletedWorkoutId` is the stable `custom_split_workouts.id` recorded on
 * the split's most recent completed session. The next workout is whatever
 * follows it in the current saved order, wrapping at the end. A split with no
 * qualifying history — or one whose history points at a workout that no longer
 * exists — starts again at the first workout rather than guessing a position.
 */
export const resolveNextCustomWorkoutIndex = (
  workouts: Pick<CustomSplitWorkout, 'id'>[],
  lastCompletedWorkoutId: number | null
): number => {
  if (workouts.length === 0) return 0;
  if (lastCompletedWorkoutId === null) return 0;

  const lastIndex = workouts.findIndex(
    (workout) => workout.id === lastCompletedWorkoutId
  );
  if (lastIndex < 0) return 0;

  return (lastIndex + 1) % workouts.length;
};
