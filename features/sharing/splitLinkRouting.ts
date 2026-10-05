import { readSplitImportToken, ROUTINE_SHARE_ID_PATTERN } from '@/features/sharing/splitTransport';

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

/** Narrow ownership: the exact branded HTTPS host/path or explicit Stack
 * fallback. Never turn arbitrary websites into in-app routes. Invalid owned
 * links reach the existing broken-link UI with an empty ID. */
export const sharedRoutineRouteFromUrl = (url: string | null) => {
  if (!url) return null;
  const https = /^https:\/\/liftwithstack\.com(?=\/|[?#]|$)/i.test(url);
  const custom = /^stack:\/\/\/?shared-routine(?:[?#]|$)/i.test(url);
  if (!https && !custom) return null;
  let id = '';
  if (https) {
    const rest = url.replace(/^https:\/\/liftwithstack\.com/i, '');
    if (!/^\/r(?:\/|[?#]|$)/.test(rest)) return null;
    const match = /^\/r\/([^/?#]+)(?:[?#].*)?$/.exec(rest);
    if (match && ROUTINE_SHARE_ID_PATTERN.test(match[1])) id = match[1];
  } else {
    const pairs = (url.split('?')[1]?.split('#')[0] ?? '').split('&');
    const values = pairs.filter(pair => pair.split('=')[0] === 'id');
    if (values.length === 1) {
      const value = values[0].slice(3);
      if (ROUTINE_SHARE_ID_PATTERN.test(value)) id = value;
    }
  }
  return { pathname: '/shared-routine' as const, params: { id } };
};

export const routineLinkRouteFromUrl = (url: string | null) =>
  sharedRoutineRouteFromUrl(url) ?? splitImportRouteFromUrl(url);
