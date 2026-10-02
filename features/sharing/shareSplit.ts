import type { CustomSplit } from '@/store/customSplits';
import { portableSplitFromCustomSplit } from '@/features/sharing/customSplitAdapter';
import type { SharedSplitResult } from '@/features/sharing/splitProtocol';
import { buildSplitImportUrl, encodeSharedSplit } from '@/features/sharing/splitTransport';

// The protocol accepts larger documents; direct links have a stricter budget.
// Keep unusual programs out of a transport that messengers may truncate.
export const MAX_SPLIT_SHARE_URL_LENGTH = 8192;

export interface SplitShareContent {
  title: string;
  message: string;
  url: string;
}

export const prepareSplitShare = (
  split: CustomSplit,
  builtInNames: ReadonlySet<string>
): SharedSplitResult<SplitShareContent> => {
  const portable = portableSplitFromCustomSplit(split, builtInNames);
  const encoded = encodeSharedSplit(portable);
  if (!encoded.ok) return encoded;
  const url = buildSplitImportUrl(encoded.value);
  if (url.length > MAX_SPLIT_SHARE_URL_LENGTH) {
    return { ok: false, error: {
      code: 'payload_too_large',
      message: 'This split is too large to share as a link. Try sharing a smaller split with fewer workouts or exercises.',
    } };
  }
  return { ok: true, value: {
    title: portable.name.trim(),
    message: `${portable.name.trim()}\n\nShared from Stack\n\n${url}`,
    url,
  } };
};
