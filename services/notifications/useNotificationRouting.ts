import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isStackNotificationTap, notificationTapDecision } from './routing';

type Inputs = Parameters<typeof notificationTapDecision>[0] & { navigate: () => void };

export function useNotificationRouting(inputs: Inputs): void {
  const [pending, setPending] = useState(0);
  const consumed = useRef(0);
  const { navigate } = inputs;
  const seen = useRef(new Set<string>());
  const decision = notificationTapDecision(inputs);
  const decisionRef = useRef(decision);
  useEffect(() => { decisionRef.current = decision; }, [decision]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let disposed = false;
    try {
      Notifications.setNotificationHandler({ handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }) });
      const receive = (response: Notifications.NotificationResponse) => {
        if (disposed) return;
        const { request, date } = response.notification;
        if (!isStackNotificationTap(request.identifier, request.content.data?.url)) return;
        const key = `${request.identifier}:${date}:${response.actionIdentifier}`;
        if (seen.current.has(key)) return;
        seen.current.add(key);
        // Never carry a tap made during onboarding into its later completion.
        if (decisionRef.current !== 'ignore') setPending(value => value + 1);
        void Notifications.clearLastNotificationResponseAsync().catch(error => {
          console.error('[notifications] Clear tap response failed', error);
        });
      };
      const subscription = Notifications.addNotificationResponseReceivedListener(receive);
      void Notifications.getLastNotificationResponseAsync().then(response => {
        if (response) receive(response);
      }).catch(error => console.error('[notifications] Initial tap lookup failed', error));
      return () => { disposed = true; subscription.remove(); };
    } catch (error) {
      console.error('[notifications] Tap listener setup failed', error);
    }
  }, []);
  useEffect(() => {
    if (pending === consumed.current || decision === 'wait') return;
    consumed.current = pending;
    if (decision === 'navigate') navigate();
  }, [pending, decision, navigate]);
}
