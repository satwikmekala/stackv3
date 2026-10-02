import { readSplitImportToken } from '@/features/sharing/splitTransport';

/** Expo Router's iOS initial URL comes from Expo Linking. A cold custom-scheme
 * launch can instead exist only in React Native's launch options. Map just
 * this feature's URL to an internal route; never reopen an external URL. */
export const splitImportRouteFromUrl = (url: string | null) => {
  if (!url || !/^stack:\/\/\/?import-split(?:[?#]|$)/i.test(url)) return null;
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const payloadCount = query.split('&').filter((pair) => pair.split('=')[0] === 'd').length;
  return {
    pathname: '/import-split' as const,
    // Ambiguous/missing parameters go to the normal invalid-link preview.
    params: { d: payloadCount === 1 ? readSplitImportToken(url) ?? '' : '' },
  };
};
