import type { Archetype } from '@/constants/archetypes';
import type { UserProfile, WorkoutSession } from '@/store/workoutStore';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';

export type WorkoutIntent =
  | { kind: 'empty'; origin?: WorkoutLaunchOrigin }
  | { kind: 'stack'; archetypes: Archetype[]; variants: string[]; origin?: WorkoutLaunchOrigin }
  | { kind: 'custom'; splitId: number; workoutId: number; origin?: WorkoutLaunchOrigin };
export type WeightUnit = 'kg' | 'lbs';
export type LaunchState = { intent: WorkoutIntent | null; unit: WeightUnit; busy: boolean; error: string | null };
export type LaunchResult = { kind: 'ignored' | 'confirmation' | 'failed' } |
  { kind: 'started' | 'resume'; origin?: WorkoutLaunchOrigin };

/** One synchronous acceptance boundary for every user-created workout. */
export function createWorkoutLaunchCoordinator(dependencies: {
  current: () => { profile: UserProfile | null; currentSession: WorkoutSession | null };
  needsConfirmation: () => boolean;
  confirmUnit: (unit: WeightUnit) => void;
  start: (intent: WorkoutIntent) => void;
  publish: (state: LaunchState) => void;
}) {
  let state: LaunchState = { intent: null, unit: 'kg', busy: false, error: null };
  let handedOff = false;
  const publish = (update: Partial<LaunchState>) => { state = { ...state, ...update }; dependencies.publish(state); };
  const finish = (kind: 'started' | 'resume', intent?: WorkoutIntent): LaunchResult => {
    handedOff = true; publish({ intent: null, busy: false, error: null });
    return { kind, ...(kind === 'started' && intent?.origin ? { origin: intent.origin } : {}) };
  };
  const launch = (intent: WorkoutIntent): LaunchResult => {
    if (dependencies.current().currentSession) return finish('resume');
    dependencies.start(intent);
    if (!dependencies.current().currentSession) throw Error('Workout creation failed.');
    return finish('started', intent);
  };
  return {
    getState: () => state,
    didHandOff: () => handedOff,
    resetAfterNavigation() { if (!state.intent && !state.busy) handedOff = false; },
    request(intent: WorkoutIntent): LaunchResult {
      if (state.busy || state.intent || handedOff) return { kind: 'ignored' };
      if (dependencies.current().currentSession) return finish('resume');
      const profile = dependencies.current().profile;
      if (!profile) { publish({ error: 'Couldn’t load your profile. Try again.' }); return { kind: 'failed' }; }
      // Own a copy: later queue, picker or source-object changes cannot retarget the sheet.
      const captured: WorkoutIntent = intent.kind === 'stack'
        ? { ...intent, archetypes: [...intent.archetypes], variants: [...intent.variants], origin: intent.origin && { ...intent.origin } }
        : { ...intent, origin: intent.origin && { ...intent.origin } };
      if (dependencies.needsConfirmation() && !profile.weightUnitConfirmed) {
        publish({ intent: captured, unit: profile.weightUnit, error: null });
        return { kind: 'confirmation' };
      }
      publish({ busy: true, error: null });
      try { return launch(captured); }
      catch { publish({ busy: false, error: 'Couldn’t start your workout. Try again.' }); return { kind: 'failed' }; }
    },
    selectUnit(unit: WeightUnit) {
      if (!state.intent || state.busy || !['kg', 'lbs'].includes(unit)) return;
      publish({ unit, error: null });
    },
    confirm(): LaunchResult {
      if (!state.intent || state.busy || handedOff) return { kind: 'ignored' };
      const intent = state.intent;
      publish({ busy: true, error: null });
      // Resuming never asks for or writes a new unit, including a race while the sheet is open.
      if (dependencies.current().currentSession) return finish('resume');
      try {
        const profile = dependencies.current().profile;
        if (!profile?.weightUnitConfirmed || profile.weightUnit !== state.unit) dependencies.confirmUnit(state.unit);
      } catch {
        publish({ busy: false, error: 'Couldn’t save your weight unit. Try again.' }); return { kind: 'failed' };
      }
      try { return launch(intent); }
      catch { publish({ busy: false, error: 'Couldn’t start your workout. Try again.' }); return { kind: 'failed' }; }
    },
    cancel() { if (!state.busy) { handedOff = false; publish({ intent: null, error: null }); } },
  };
}
