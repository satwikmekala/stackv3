import { fetchRoutineShare } from './routineShareClient';
import { buildSharedRoutineDraft } from './sharedRoutineDraft';
import type { ExerciseSeed } from '@/store/workoutDatabase';
import type { useCustomSplitDraftStore } from '@/store/customSplitDraft';

/** One entry owns one load. Cancellation invalidates even uncooperative fetches. */
export function createSharedRoutineEntry(deps: {
  seeds: readonly ExerciseSeed[];
  getDraftStore: () => ReturnType<typeof useCustomSplitDraftStore.getState>;
  fetch?: typeof fetchRoutineShare;
  openEditor: (shareId: string, options: { signal: AbortSignal }) => void | Promise<void>;
}) {
  let current: AbortController | null = null;
  const cancel = () => { current?.abort(); current = null; };
  const load = async (id: unknown) => {
    cancel(); const request = new AbortController(); current = request;
    try {
      const split = await (deps.fetch ?? fetchRoutineShare)(id, { signal: request.signal });
      const workouts = buildSharedRoutineDraft(split, deps.seeds);
      if (current !== request || request.signal.aborted) return;
      deps.getDraftStore().initializeSharedDraft(id as string, split.name, workouts);
      await deps.openEditor(id as string, { signal: request.signal });
    } catch (error) {
      if (current !== request || request.signal.aborted) return;
      throw error;
    } finally { if (current === request) current = null; }
  };
  return { load, cancel };
}
