import type { WorkoutLiveActivityState } from './state';

export interface ActivityInstance {
  getId(): string;
  update(state: WorkoutLiveActivityState): Promise<void>;
  end(policy: 'immediate'): Promise<void>;
}

export interface ActivityFactory {
  getInstances(): ActivityInstance[];
  start(state: WorkoutLiveActivityState): ActivityInstance;
}

type Request = { state: WorkoutLiveActivityState | null; key: string; allowStart: boolean; forceRedraw: boolean };
type Options = {
  factory: ActivityFactory;
  endTestActivities: () => Promise<void>;
  onError: (error: unknown) => void;
};

// No timers or React dependency. Native operations are serialized, while edits
// received during an in-flight operation coalesce to the latest desired state.
export function createWorkoutLiveActivityCoordinator(options: Options) {
  let pending: Request | null = null;
  let running: Promise<void> | null = null;
  let requestedKey: string | undefined;
  let requestedAllowStart: boolean | undefined;
  let acknowledgedId: string | undefined;
  let acknowledgedKey: string | undefined;

  async function reconcile(request: Request) {
    const instances = options.factory.getInstances();
    if (!request.state) {
      for (const instance of instances) await instance.end('immediate');
      acknowledgedId = undefined;
      acknowledgedKey = undefined;
      return;
    }

    // Test factories are separate, but never leave a fake workout alongside a
    // real one. Test controls synchronously refuse starts while a session exists.
    await options.endTestActivities();
    if (pending) return;
    const primary = instances.find((instance) => instance.getId() === acknowledgedId) ?? instances[0];
    for (const instance of instances) {
      if (instance !== primary) await instance.end('immediate');
    }
    if (pending) return;

    if (!primary) {
      // ActivityKit requires foreground execution for local starts. Foreground
      // events retry discovery/start; existing activities can update in background.
      if (!request.allowStart) return;
      const created = options.factory.start(request.state);
      acknowledgedId = created.getId();
      acknowledgedKey = request.key;
    } else if (request.forceRedraw || primary.getId() !== acknowledgedId || request.key !== acknowledgedKey) {
      // expo-widgets exposes ID discovery but no content readback. A recovered
      // instance gets one authoritative update, then identical payloads are skipped.
      await primary.update(request.state);
      acknowledgedId = primary.getId();
      acknowledgedKey = request.key;
    }
  }

  async function drain() {
    while (pending) {
      const request = pending;
      pending = null;
      try {
        await reconcile(request);
      } catch (error) {
        // Widget failures must never interrupt a workout or roll back its state.
        // A relevant edit or next foreground event retries; no polling loop.
        options.onError(error);
      }
    }
    running = null;
  }

  return {
    sync(state: WorkoutLiveActivityState | null, allowStart: boolean, recover = false, forceRedraw = false): Promise<void> {
      const key = JSON.stringify(state);
      if (!recover && !forceRedraw && key === requestedKey && allowStart === requestedAllowStart) {
        return running ?? Promise.resolve();
      }
      requestedKey = key;
      requestedAllowStart = allowStart;
      pending = { state, key, allowStart, forceRedraw };
      // Defer one microtask so completing a set and selecting its next exercise
      // in the same event publishes only the final UI position to ActivityKit.
      if (!running) running = Promise.resolve().then(drain);
      return running;
    },
  };
}
