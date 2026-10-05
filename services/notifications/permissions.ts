import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_CHANNEL, REMINDER_SETTINGS_COPY } from '@/constants/notifications';

export function notificationPermissionGranted(permission: Notifications.NotificationPermissionsStatus): boolean {
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
      name: REMINDER_SETTINGS_COPY.channel, importance: Notifications.AndroidImportance.DEFAULT,
      sound: null, showBadge: false,
    });
  }
}

/** Only the Settings toggle calls this. Scheduling never requests permission. */
export async function requestReminderPermission(): Promise<Notifications.NotificationPermissionsStatus | null> {
  if (Platform.OS === 'web') return null;
  // Android 13 requires a channel before its permission prompt can appear.
  await ensureNotificationChannel();
  return Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: false } });
}

export async function readReminderPermission(): Promise<Notifications.NotificationPermissionsStatus | null> {
  return Platform.OS === 'web' ? null : Notifications.getPermissionsAsync();
}
