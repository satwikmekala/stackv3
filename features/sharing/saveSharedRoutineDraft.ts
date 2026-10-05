import { uuid } from 'expo-modules-core';
import { BUILT_IN_EXERCISE_NAMES, importPortableSplitSync } from '@/store/workoutDatabase';
import { flushCustomSplitDrafts, splitDraftKey, useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { sharedDraftToPortable } from './sharedRoutineDraft';
import type { ImportedSplit } from '@/store/splitImport';

const pending = new Map<string, Promise<ImportedSplit>>();
export function saveSharedRoutineDraft(): Promise<ImportedSplit> {
  const state = useCustomSplitDraftStore.getState();
  if (state.source !== 'shared' || !state.sharedContext || !state.draft || !state.hydrated) {
    return Promise.reject(new Error('This draft is no longer available.'));
  }
  const key = splitDraftKey(null, 'shared', state.sharedContext.shareId);
  const previous = pending.get(key);
  if (previous) return previous;
  const action = Promise.resolve().then(async () => {
    const portable = sharedDraftToPortable(state.draft!, BUILT_IN_EXERCISE_NAMES);
    // Persist the attempt BEFORE SQLite. The importer's existing receipt makes
    // retry/recovery idempotent across a crash or a draft-cleanup write failure.
    const sharedContext = { ...state.sharedContext!, attemptId: state.sharedContext!.attemptId ?? uuid.v4() };
    const snapshot = { draft: state.draft!, activeWorkoutId: state.activeWorkoutId, source: 'shared' as const,
      editingSplitId: null, sourceRevision: null, sharedContext };
    const current = useCustomSplitDraftStore.getState();
    if (current.draft !== state.draft || current.sharedContext?.shareId !== sharedContext.shareId) throw new Error('Draft changed.');
    useCustomSplitDraftStore.setState({ sharedContext, drafts: { ...current.drafts, [key]: snapshot } });
    await flushCustomSplitDrafts();
    const ready = useCustomSplitDraftStore.getState();
    if (ready.draft !== state.draft || ready.sharedContext?.shareId !== sharedContext.shareId) throw new Error('Draft changed.');
    const result = importPortableSplitSync(portable, sharedContext.attemptId);
    ready.discardDraft();
    try { await flushCustomSplitDrafts(); }
    catch (error) {
      // Keep the draft visible for retry. A committed receipt prevents saving
      // a duplicate; on cold recovery the builder returns to the library.
      const latest = useCustomSplitDraftStore.getState();
      useCustomSplitDraftStore.setState({ ...(latest.draft ? {} : { ...snapshot, picker: null }),
        drafts: { [key]: snapshot, ...latest.drafts } });
      throw error;
    }
    return result;
  }).finally(() => pending.delete(key));
  pending.set(key, action);
  return action;
}
