import { routineLinkErrorCopy } from './routineCopy';
import { Share } from 'react-native';
import { BUILT_IN_EXERCISE_NAMES, getCustomSplitDetailAsync } from '@/store/workoutDatabase';
import { composeSplitShare, prepareSplitShare } from '@/features/sharing/shareSplit';
import { createRoutineShare } from './routineShareClient';

const shareSnapshot = async (splitId: number): Promise<void> => {
  const split = await getCustomSplitDetailAsync(splitId);
  if (!split) throw new Error('This routine is no longer saved on this device.');
  const snapshot = prepareSplitShare(split, BUILT_IN_EXERCISE_NAMES);
  if (!snapshot.ok) throw new Error(routineLinkErrorCopy(snapshot.error));
  const url = await createRoutineShare(snapshot.value.payload);
  const content = composeSplitShare(snapshot.value, url);
  // Include the link in the message on both platforms, so Copy also receives
  // the full program link. A separate iOS URL would repeat it in some apps.
  await Share.share({ title: content.title, message: content.message });
};

// Also coalesce callers from different buttons for the same saved routine.
// Keep the lock through upload AND the native sheet; failures permit retry.
const pendingShares = new Map<number, Promise<void>>();
export const shareSavedSplit = (splitId: number): Promise<void> => {
  const pending = pendingShares.get(splitId);
  if (pending) return pending;
  const action = Promise.resolve().then(() => shareSnapshot(splitId)).finally(() => pendingShares.delete(splitId));
  pendingShares.set(splitId, action);
  return action;
};
