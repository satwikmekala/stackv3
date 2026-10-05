import type { ImportPlan, ImportResult, ImportSnapshot } from '../models';
import { hevyErrorCopy } from '../hevy/errors';
import { hevyExportErrorCopy } from './errors';

export type HevyFileState = {
  stage: 'instructions' | 'reading' | 'preview' | 'importing' | 'done';
  plan?: ImportPlan; result?: ImportResult; error?: string;
};
export function createHevyFileFlow(dependencies: {
  publish: (state: HevyFileState) => void;
  read: () => Promise<ImportSnapshot | null>;
  plan: (snapshot: ImportSnapshot) => Promise<ImportPlan>;
  persist: (plan: ImportPlan) => Promise<ImportResult>;
  finish: (unit: ImportSnapshot['weightUnit']) => Promise<void>;
  nextFrame?: () => Promise<void>;
}) {
  let state: HevyFileState = { stage: 'instructions' }, disposed = false, entered = false;
  let pending: Promise<void> | null = null;
  const publish = (next: HevyFileState) => { if (!disposed) { state = next; dependencies.publish(next); } };
  const nextFrame = dependencies.nextFrame ?? (() => new Promise<void>(resolve => setTimeout(resolve, 32)));
  const once = (action: () => Promise<void>) => {
    if (disposed || entered) return Promise.resolve();
    if (pending) return pending;
    pending = action().finally(() => { pending = null; });
    return pending;
  };
  return {
    choose: () => once(async () => {
      if (!['instructions', 'preview'].includes(state.stage)) return;
      const previous = state;
      publish({ stage: 'reading' });
      try {
        await nextFrame(); if (disposed) return;
        const snapshot = await dependencies.read(); if (disposed) return;
        if (snapshot === null) { publish(previous); return; }
        const plan = await dependencies.plan(snapshot);
        publish({ stage: 'preview', plan });
      } catch (error) { publish({ ...previous, error: hevyExportErrorCopy(error) }); }
    }),
    import: () => once(async () => {
      if (state.stage !== 'preview' || !state.plan) return;
      const plan = state.plan;
      publish({ stage: 'importing', plan });
      try {
        await nextFrame(); if (disposed) return;
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
    dispose: () => { disposed = true; state = { stage: 'instructions' }; },
  };
}
