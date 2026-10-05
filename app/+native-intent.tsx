import { routineLinkRouteFromUrl } from '@/features/sharing/splitLinkRouting';

/** Expo Router invokes this for cold launches and foreground/background URL
 * events. The recipient screen retains all loading, draft and setup ownership. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const route = routineLinkRouteFromUrl(path);
  if (!route) return path;
  return route.pathname === '/shared-routine'
    ? `/shared-routine?id=${route.params.id}`
    : `/import-split?d=${encodeURIComponent(route.params.d)}`;
}
