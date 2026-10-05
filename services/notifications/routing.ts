import { NOTIFICATION_DESTINATION, NOTIFICATION_PREFIX } from '@/constants/notifications';

type TapState = {
  isHydrated: boolean;
  hydrationError: string | null;
  onboardingCompleted: boolean;
  entryReady: boolean;
  sharingLinkPending: boolean;
};
export function notificationTapDecision(state: TapState): 'wait' | 'ignore' | 'navigate' {
  if (state.hydrationError) return 'ignore';
  if (!state.isHydrated) return 'wait';
  if (!state.onboardingCompleted || state.sharingLinkPending) return 'ignore';
  return state.entryReady ? 'navigate' : 'wait';
}

export function isStackNotificationTap(identifier: string, url: unknown): boolean {
  return identifier.startsWith(NOTIFICATION_PREFIX) && url === NOTIFICATION_DESTINATION;
}
