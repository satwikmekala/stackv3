import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_CHANNEL, NOTIFICATION_PREFIX } from '@/constants/notifications';
import { useWorkoutStore } from '@/store/workoutStore';
import { getNextWorkoutNameForNotifications } from './nextWorkout';
import { buildNotificationPlan } from './plan';
import { ensureNotificationChannel, notificationPermissionGranted, readReminderPermission } from './permissions';

let revision = 0;
let processedRevision = 0;
let running: Promise<void> | null = null;

async function rebuild(expectedRevision: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of pending) {
    // Leave notifications owned by other features untouched during a rebuild.
    if (!notification.identifier.startsWith(NOTIFICATION_PREFIX)) continue;
    try { await Notifications.cancelScheduledNotificationAsync(notification.identifier); }
    catch (error) { console.error('[notifications] Cancel failed', notification.identifier, error); }
  }
  const permission = await readReminderPermission();
  const state = useWorkoutStore.getState();
  if (!state.isHydrated || state.hydrationError || !state.profile?.onboardingCompleted ||
      !permission || !notificationPermissionGranted(permission)) return;
  let nextName: string | null = null;
  try { nextName = await getNextWorkoutNameForNotifications(); }
  catch (error) { console.error('[notifications] Next workout lookup failed; using generic copy', error); }
  if (expectedRevision !== revision) return;
  const plan = buildNotificationPlan({
    now: new Date(), profile: state.profile, sessions: state.sessions,
    permissionGranted: true, inProgress: Boolean(state.currentSession), nextName,
  });
  await ensureNotificationChannel();
  for (const item of plan) {
    if (expectedRevision !== revision) return;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: { title: item.title, body: item.body, data: item.data, sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date,
          ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL } : {}) },
      });
    } catch (error) { console.error('[notifications] Schedule failed', item.identifier, error); }
  }
}

/** Serializes/coalesces rebuilds. Native failures never escape to workout actions. */
export function rescheduleNotifications(): Promise<void> {
  revision += 1;
  if (!running) {
    // Defer all native work until the calling store action has returned.
    running = Promise.resolve().then(async () => {
      while (processedRevision !== revision) {
        processedRevision = revision;
        try { await rebuild(processedRevision); }
        catch (error) { console.error('[notifications] Reschedule failed', error); }
      }
    }).finally(() => {
      running = null;
      if (processedRevision !== revision) void rescheduleNotifications();
    });
  }
  return running;
}

type State = ReturnType<typeof useWorkoutStore.getState>;
function schedulingProfileKey(state: State): string {
  const profile = state.profile;
  return JSON.stringify(profile && [profile.remindersEnabled, profile.reminderTime, profile.trainingDays,
    profile.weeklyGoal, profile.activeSplitId, profile.programMode, profile.programWeeklyGoal,
    profile.threeDayStructure, profile.onboardingCompleted]);
}

/** Store publishes these changes only after SQLite writes succeed. */
export function subscribeToNotificationInputs(): () => void {
  return useWorkoutStore.subscribe((state, previous) => {
    if (!state.isHydrated || state.hydrationError) return;
    if (state.isHydrated !== previous.isHydrated || state.hydrationError !== previous.hydrationError ||
        state.sessions !== previous.sessions || state.currentSession?.id !== previous.currentSession?.id ||
        state.currentCustomSplit !== previous.currentCustomSplit ||
        schedulingProfileKey(state) !== schedulingProfileKey(previous)) {
      void rescheduleNotifications();
    }
  });
}
