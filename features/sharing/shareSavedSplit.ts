import { Share } from 'react-native';
import { BUILT_IN_EXERCISE_NAMES, getCustomSplitDetailAsync } from '@/store/workoutDatabase';
import { prepareSplitShare } from '@/features/sharing/shareSplit';

export const shareSavedSplit = async (splitId: number): Promise<void> => {
  const split = await getCustomSplitDetailAsync(splitId);
  if (!split) throw new Error('This split is no longer saved on this device.');
  const content = prepareSplitShare(split, BUILT_IN_EXERCISE_NAMES);
  if (!content.ok) throw new Error(content.error.message);
  // Include the link in the message on both platforms, so Copy also receives
  // the full program link. A separate iOS URL would repeat it in some apps.
  await Share.share({ title: content.value.title, message: content.value.message });
};
