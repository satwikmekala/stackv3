import type { ImportPlan, ImportResult, ImportSnapshot } from '../models';
import { createHevyClient, type ScanProgress } from './client';
import { hevyErrorCopy } from './errors';

export type HevyFlowState = {
  stage: 'connect' | 'scanning' | 'preview' | 'importing' | 'done';
  progress?: ScanProgress; plan?: ImportPlan; result?: ImportResult; error?: string;
};

/** Owns one screen visit. No credential is kept in state, routes or a durable store. */
export function createHevyFlow(dependencies: {
  publish: (state: HevyFlowState) => void;
  plan: (snapshot: ImportSnapshot) => Promise<ImportPlan>;
  persist: (plan: ImportPlan) => Promise<ImportResult>;
  finish: (unit: ImportSnapshot['weightUnit']) => Promise<void>;
  client?: typeof createHevyClient;
}) {
  let state: HevyFlowState = { stage: 'connect' };
  let pending: Promise<void> | null = null;
  let abort: AbortController | null = null;
  let activeClient: ReturnType<typeof createHevyClient> | null = null;
  let disposed = false;
  let entered = false;
  function publish(next: HevyFlowState) { state = next; if (!disposed) dependencies.publish(next); }
  function once(action: () => Promise<void>) {
    if (disposed || entered) return Promise.resolve();
    if (pending) return pending;
    pending = action().finally(() => { pending = null; });
    return pending;
  }
  return {
    connect: (input: string) => once(async () => {
      if (state.stage !== 'connect') return;
      let client: ReturnType<typeof createHevyClient> | null = null;
      try {
        abort = new AbortController();
        client = (dependencies.client ?? createHevyClient)(input, { signal: abort.signal });
        activeClient = client;
        input = '';
        publish({ stage: 'scanning' });
        // scan verifies the account first; its finally block releases the credential.
        const snapshot = await client.scan(progress => publish({ stage: 'scanning', progress }));
        if (disposed) return;
        const plan = await dependencies.plan(snapshot);
        if (!disposed) publish({ stage: 'preview', plan });
      } catch (error) { publish({ stage: 'connect', error: hevyErrorCopy(error, 'network') }); }
      finally { input = ''; client?.dispose(); activeClient = null; abort = null; }
    }),
    import: () => once(async () => {
      const plan = state.plan;
      if (!plan || state.stage !== 'preview') return;
      publish({ stage: 'importing', plan });
      try {
        const result = await dependencies.persist(plan);
        publish({ stage: 'done', plan, result });
      } catch (error) { publish({ stage: 'preview', plan, error: hevyErrorCopy(error, 'persistence') }); }
    }),
    continue: () => once(async () => {
      if (state.stage !== 'done' || !state.plan) return;
      const done = state;
      try { await dependencies.finish(state.plan.snapshot.weightUnit); entered = true; }
      catch { publish({ ...done, error: 'Couldn’t finish your setup. Your imported workouts are saved. Try again.' }); }
    }),
    dispose: () => { disposed = true; abort?.abort(); activeClient?.dispose(); activeClient = null; state = { stage: 'connect' }; },
  };
}
