import { AppState, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useWorkoutStore } from '@/store/workoutStore';
import { createWorkoutLiveActivityCoordinator } from './coordinator';
import { deriveWorkoutLiveActivityState } from './state';
import { deriveInteractiveWorkoutPresentation } from './presentation';
import { readCurrentSetTarget } from '@/store/workoutDatabase';

let detach: (() => void) | undefined;
let users = 0;
let refresh: (() => void) | undefined;
export const refreshWorkoutLiveActivity = () => refresh?.();
let coordinator: ReturnType<typeof createWorkoutLiveActivityCoordinator> | undefined;

export function startWorkoutLiveActivitySync(): () => void {
  const version = Number.parseFloat(String(Platform.Version));
  if (version < 16.2 || !requireOptionalNativeModule('ExpoWidgets') || !requireOptionalNativeModule('ExpoUI')) {
    return () => {};
  }
  if (!detach) {
    try {
      // Load only on a supported native build, after checking native modules.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { workoutActivity, testActivity } = require('./factories.ios') as typeof import('./factories.ios');
      coordinator ??= createWorkoutLiveActivityCoordinator({
        factory: workoutActivity,
        endTestActivities: async () => {
          for (const activity of testActivity.getInstances()) await activity.end('immediate');
        },
        onError: (error) => console.warn('[WorkoutLiveActivity] Synchronization failed', error),
      });
      const reconcile = (recover = false, forceRedraw = false) => {
        const state = useWorkoutStore.getState();
        // Never interpret the pre-SQLite empty store as a discarded workout.
        if (!state.isHydrated || state.hydrationError) return;
        let payload = deriveWorkoutLiveActivityState(state);
        const native = requireOptionalNativeModule<{ stackLiveActivityInteractionVersion?: number; getStackLiveActivityRevision?: () => number }>('ExpoWidgets');
        if (payload && version >= 17 && native?.stackLiveActivityInteractionVersion === 2) {
          try {
            payload = deriveInteractiveWorkoutPresentation(state, readCurrentSetTarget);
            if (payload) payload.acknowledgedRevision = native.getStackLiveActivityRevision!();
          } catch (error) {
            console.warn('[WorkoutLiveActivity] Cannot prepare interaction presentation', error);
            // No guessed target or revision on failure. Native keeps pending presentation.
          }
        }
        void coordinator!.sync(
          payload,
          AppState.currentState === 'active',
          recover,
          forceRedraw
        );
      };
      const unsubscribe = useWorkoutStore.subscribe(() => reconcile());
      refresh = () => reconcile(true, true);
      const appSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') reconcile(true);
      });
      detach = () => {
        unsubscribe();
        refresh = undefined;
        appSubscription.remove();
      };
      reconcile(true);
    } catch (error) {
      console.warn('[WorkoutLiveActivity] Unavailable in this build', error);
      return () => {};
    }
  }
  users += 1;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    users -= 1;
    if (users === 0) {
      detach?.();
      detach = undefined;
    }
    // Root unmount/background is not workout completion. Keep the activity alive.
  };
}
