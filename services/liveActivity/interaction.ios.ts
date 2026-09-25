import { AppState } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useWorkoutStore } from '@/store/workoutStore';
import { createLiveActivityActionBridge, type LiveActivityActionEvent } from '@/services/liveActivity/actions';
import { refreshWorkoutLiveActivity } from '@/services/liveActivity/sync';

type NativeActions = {
  takeStackLiveActivityActions?: () => LiveActivityActionEvent[];
  isStackLiveActivityActive?: (id: string) => boolean;
  addListener: (event: string, listener: () => void) => { remove: () => void };
};

export function startWorkoutLiveActivityInteractions(onApplied: (workoutId: string, needsFeedback: boolean) => void) {
  const native = requireOptionalNativeModule<NativeActions>('ExpoWidgets');
  if (!native?.takeStackLiveActivityActions || !requireOptionalNativeModule('ExpoUI')) return () => {};
  try {
    // Local ActivityKit presentation is independent of RN. Consume the command
    // inbox whenever the hydrated host can run, including background execution.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { workoutActivity } = require('./factories.ios') as typeof import('./factories.ios');
    let feedbackWorkout: string | undefined;
    const deliverFeedback = () => {
      if (feedbackWorkout && AppState.currentState === 'active') {
        const id = feedbackWorkout;
        feedbackWorkout = undefined;
        if (useWorkoutStore.getState().currentSession?.id === id) onApplied(id, true);
      }
    };
    const drain = createLiveActivityActionBridge({
      isReady: () => {
        const state = useWorkoutStore.getState();
        return state.isHydrated && !state.hydrationError;
      },
      isCurrentActivity: (id) => native.isStackLiveActivityActive?.(id) === true &&
        workoutActivity.getInstances().some((activity) => activity.getId() === id),
      takePending: () => native.takeStackLiveActivityActions!(),
      apply: (target, action, step) => useWorkoutStore.getState().applyActiveSetAction(target, action, step),
      onApplied: (target, result) => {
        if (result.needsFeedback) { feedbackWorkout = target.workoutId; deliverFeedback(); }
      },
      reconcile: refreshWorkoutLiveActivity,
      onError: (error) => console.warn('[WorkoutLiveActivity] Interaction failed', error),
    });
    const subscription = native.addListener('onExpoWidgetsUserInteraction', drain);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') { drain(); deliverFeedback(); } });
    drain();
    return () => { subscription.remove(); foreground.remove(); };
  } catch (error) {
    console.warn('[WorkoutLiveActivity] Interactions unavailable', error);
    return () => {};
  }
}
