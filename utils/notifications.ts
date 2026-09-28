import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseNotificationPreferences } from './profilePreferences';
import { supabase } from './supabase';

import type { NotificationPreferences } from './profilePreferences';
import {
  planDatedReminders,
  SCHEDULE_REMINDER_PREFIX,
  type ReminderPlan,
} from '@/features/consistency/reminders';

const WORKOUT_REMINDER_ID = 'workout-reminder-daily';

async function getPrefs(): Promise<NotificationPreferences | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return parseNotificationPreferences(session.user.user_metadata?.notification_preferences);
}

async function canNotify(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function getDevicePushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : JSON.stringify(token.data);
  } catch {
    return null;
  }
}

export async function cancelWorkoutReminder(): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  if (existing.some(notification => notification.identifier === WORKOUT_REMINDER_ID)) {
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_REMINDER_ID);
  }
}

export async function clearScheduledWorkoutReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existing) {
    if (notification.identifier === WORKOUT_REMINDER_ID ||
      notification.identifier.startsWith(SCHEDULE_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function applyNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  if (Platform.OS === 'web') return;
  await clearScheduledWorkoutReminders();
  if (prefs.pushEnabled && prefs.workoutReminder && !(await canNotify())) {
    throw new Error('Notification permission is not granted');
  }
}

async function reconcileOnDevice(plan: ReminderPlan): Promise<{
  scheduled: number;
  suppressed: string[];
  deferred: number;
}> {
  if (Platform.OS === 'web') return { scheduled: 0, suppressed: [], deferred: 0 };
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  if (auth.session?.user.id !== plan.ownerId) {
    await clearScheduledWorkoutReminders();
    throw new Error('Workout reminders belong to a different signed-in account.');
  }
  const actual = parseNotificationPreferences(auth.session.user.user_metadata?.notification_preferences);
  if (actual.pushEnabled !== plan.preferences.pushEnabled ||
    actual.workoutReminder !== plan.preferences.workoutReminder ||
    actual.reminderTime !== plan.preferences.reminderTime ||
    actual.quietHoursEnabled !== plan.preferences.quietHoursEnabled ||
    actual.quietHoursStart !== plan.preferences.quietHoursStart ||
    actual.quietHoursEnd !== plan.preferences.quietHoursEnd) {
    await clearScheduledWorkoutReminders();
    throw new Error('Notification preferences changed; refresh the accepted schedule.');
  }
  const { scheduled, suppressed } = planDatedReminders(plan);
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const allowed = plan.preferences.pushEnabled && plan.preferences.workoutReminder;
  const permitted = allowed && await canNotify();
  const active = permitted ? scheduled.slice(0, 60) : [];
  const desired = new Set(active.map(reminder => reminder.identifier));
  for (const notification of existing) {
    if (notification.identifier === WORKOUT_REMINDER_ID ||
      notification.identifier.startsWith(SCHEDULE_REMINDER_PREFIX) && !desired.has(notification.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
  if (allowed && !permitted) throw new Error('Notification permission is not granted');
  const present = new Set(existing.map(notification => notification.identifier));
  for (const reminder of active) {
    if (present.has(reminder.identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: { title: 'Workout planned for today', body: 'Your scheduled workout is ready.', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
    });
  }
  return { scheduled: active.length, suppressed, deferred: permitted ? Math.max(0, scheduled.length - active.length) : 0 };
}

let reminderReconciliation = Promise.resolve();

export function reconcileWorkoutReminders(plan: ReminderPlan): Promise<{
  scheduled: number;
  suppressed: string[];
  deferred: number;
}> {
  const next = reminderReconciliation.then(() => reconcileOnDevice(plan));
  reminderReconciliation = next.then(() => undefined, () => undefined);
  return next;
}

export async function notifyPRCelebration(
  prs: Array<{ name: string; weight: number; reps: number }>,
): Promise<void> {
  // Disabled by Phase 3 client replacement: PR notifications suppressed.
  return;
}

export async function notifyDeloadWeek(): Promise<void> {
  // Disabled by Phase 3 client replacement: deload reminders suppressed.
  return;
}

// Fires a notification 5 seconds from now so the user can confirm the stack works.
// Background the app after saving to see it.
export async function sendTestNotification(): Promise<void> {
  // Disabled in Phase 3 replacement.
  return;
}

// Schedule a rest-timer completion notification after `seconds` seconds.
// Accept an optional identifier. If provided, cancel any existing scheduled notification
// with the same identifier to guarantee a single active rest notification per identifier.
export async function scheduleRestNotification(seconds: number, body?: string, identifier?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (identifier) {
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of existing) {
        if (n.identifier === identifier) {
          await Notifications.cancelScheduledNotificationAsync(identifier);
        }
      }
    }
    const id = await Notifications.scheduleNotificationAsync({
      identifier: identifier,
      content: { title: 'Rest timer complete', body: body ?? 'Your rest timer finished.', sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    // On some runtimes the returned id may differ from the requested identifier; if identifier provided, attempt to harmonize
    if (identifier && id !== identifier) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    }
  } catch {
    // ignore
  }
}

