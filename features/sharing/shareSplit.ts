import type { CustomSplit } from '@/store/customSplits';
import { portableSplitFromCustomSplit } from '@/features/sharing/customSplitAdapter';
import { serializeSharedSplit, type SharedSplitResult } from '@/features/sharing/splitProtocol';

export interface SplitShareContent {
  title: string;
  message: string;
  url: string;
}

export interface SplitShareSnapshot {
  title: string;
  payload: string;
}

export const prepareSplitShare = (
  split: CustomSplit,
  builtInNames: ReadonlySet<string>
): SharedSplitResult<SplitShareSnapshot> => {
  const portable = portableSplitFromCustomSplit(split, builtInNames);
  const serialized = serializeSharedSplit(portable);
  if (!serialized.ok) return serialized;
  return { ok: true, value: {
    title: portable.name.trim(),
    payload: serialized.value,
  } };
};

export const composeSplitShare = (snapshot: SplitShareSnapshot, url: string): SplitShareContent => ({
  title: snapshot.title,
  message: `${snapshot.title}\n\nShared from Stack\n\n${url}`,
  url,
});
