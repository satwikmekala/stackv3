import { workoutSetActions, type WorkoutSetAction, type WorkoutSetActionResult, type WorkoutSetTarget } from '@/store/workoutSetActions';

const prefix = 'stack.workout.v2:';
export const createActionTargetPrefix = (target: WorkoutSetTarget, weightStepKg?: number) =>
  prefix + JSON.stringify({ ...target, weightStepKg }) + '#';
export type LiveActivityActionTargets = Partial<Record<WorkoutSetAction, string>>;
export type LiveActivityActionEvent = { id: string; source: string; target: string; timestamp: number };

export function createLiveActivityActionTargets(target: WorkoutSetTarget | null, bodyweight: boolean, weightStepKg?: number): LiveActivityActionTargets {
  if (!target) return {};
  return Object.fromEntries(workoutSetActions
    .filter((action) => !bodyweight || (action !== 'increaseWeight' && action !== 'decreaseWeight'))
    .map((action) => [action, createActionTargetPrefix(target, weightStepKg) + action]));
}

export function parseLiveActivityAction(value: string): { target: WorkoutSetTarget; action: WorkoutSetAction; weightStepKg?: number } | null {
  if (!value.startsWith(prefix) || value.length > 2048) return null;
  try {
    const separator = value.lastIndexOf('#');
    const action = value.slice(separator + 1) as WorkoutSetAction;
    const { weightStepKg, ...target } = JSON.parse(value.slice(prefix.length, separator));
    if (weightStepKg !== undefined && (!Number.isFinite(weightStepKg) || weightStepKg <= 0)) return null;
    if (!workoutSetActions.includes(action) ||
        !['workoutId', 'workoutStartedAt', 'exerciseId', 'setId', 'exerciseName'].every((key) => typeof target[key] === 'string' && target[key].length > 0) ||
        !['exerciseIndex', 'setIndex'].every((key) => Number.isSafeInteger(target[key]) && target[key] >= 0)) return null;
    return { action, target, weightStepKg };
  } catch { return null; }
}

// Native FIFO -> synchronous store actions. No await between reading the active
// set and committing it, so rapid taps always increment the latest saved value.
export function createLiveActivityActionBridge(options: {
  isReady: () => boolean;
  isCurrentActivity: (id: string) => boolean;
  takePending: () => LiveActivityActionEvent[];
  apply: (target: WorkoutSetTarget, action: WorkoutSetAction, weightStepKg?: number) => WorkoutSetActionResult;
  onApplied: (target: WorkoutSetTarget, result: WorkoutSetActionResult) => void;
  reconcile: () => void;
  onError: (error: unknown) => void;
}) {
  let draining = false;
  const seen = new Set<string>();
  return () => {
    if (draining || !options.isReady()) return;
    draining = true;
    try {
      // Drain an event-driven inbox, not a polling loop. Native consumes one
      // command at a time so a process exit cannot discard an unhandled batch.
      while (true) {
        const batch = options.takePending();
        if (batch.length === 0) break;
        for (const event of batch) {
          try {
            if (!event.id || seen.has(event.id)) continue;
            seen.add(event.id);
            // Bound duplicate-delivery protection; the native FIFO itself consumes
            // each event once and never retries a failed mutation automatically.
            if (seen.size > 1024) seen.delete(seen.values().next().value!);
            const command = parseLiveActivityAction(event.target);
            if (!command || !options.isCurrentActivity(event.source)) continue;
            const result = options.apply(command.target, command.action, command.weightStepKg);
            if (result.status === 'applied') options.onApplied(command.target, result);
          } catch (error) { options.onError(error); }
        }
      }
    } catch (error) { options.onError(error); }
    finally {
      draining = false;
      options.reconcile();
    }
  };
}
