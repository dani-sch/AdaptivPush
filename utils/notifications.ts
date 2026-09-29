import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { SCHEDULE_REMINDER_PREFIX } from '@/features/consistency/reminders';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function clearScheduledWorkoutReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existing) {
    if (notification.identifier === 'workout-reminder-daily'
      || notification.identifier.startsWith(SCHEDULE_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function cancelRestNotification(ownerId: string, draftId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(`rest-${ownerId}-${draftId}`);
}

export async function clearOtherOwnerDraftNotifications(ownerId: string | null): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existing) {
    if ((notification.identifier.startsWith('rest-')
      && (!ownerId || !notification.identifier.startsWith(`rest-${ownerId}-`)))
      || (notification.identifier.startsWith('inactivity-')
      && (!ownerId || !notification.identifier.startsWith(`inactivity-${ownerId}-`)))) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function clearOtherDraftNotifications(ownerId: string, draftId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existing) {
    for (const kind of ['inactivity', 'rest']) {
      if (notification.identifier.startsWith(`${kind}-${ownerId}-`)
        && notification.identifier !== `${kind}-${ownerId}-${draftId}`) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }
}

export async function cancelInactivityNotification(ownerId: string, draftId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(`inactivity-${ownerId}-${draftId}`);
}

export async function scheduleInactivityNotification(
  seconds: number, ownerId: string, draftId: string,
): Promise<boolean> {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Inactivity interval must be positive.');
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;
  await cancelInactivityNotification(ownerId, draftId);
  await Notifications.scheduleNotificationAsync({
    identifier: `inactivity-${ownerId}-${draftId}`,
    content: {
      title: 'Workout still in progress',
      body: 'No sets have been logged for five minutes. Your draft is still available.',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
  return true;
}

export async function scheduleRestNotification(
  seconds: number, ownerId: string, draftId: string,
): Promise<boolean> {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Rest interval must be positive.');
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;
  await cancelRestNotification(ownerId, draftId);
  await Notifications.scheduleNotificationAsync({
    identifier: `rest-${ownerId}-${draftId}`,
    content: { title: 'Rest timer complete', body: 'Your rest timer finished.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
  return true;
}
