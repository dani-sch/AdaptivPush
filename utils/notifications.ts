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
  if (prs.length === 0) return;
  const prefs = await getPrefs();
  if (!prefs?.pushEnabled || !prefs?.prCelebrations) return;
  if (!(await canNotify())) return;

  const title =
    prs.length === 1 ? `New PR — ${prs[0].name}!` : `${prs.length} new PRs today!`;
  const body =
    prs.length === 1
      ? `${prs[0].weight} lbs × ${prs[0].reps} reps — a new personal best!`
      : prs.map((p) => `${p.name}: ${p.weight} lbs × ${p.reps}`).join('\n');

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {}
}

export async function notifyDeloadWeek(): Promise<void> {
  const prefs = await getPrefs();
  if (!prefs?.pushEnabled || !prefs?.deloadReminder) return;
  if (!(await canNotify())) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Deload week — time to recover',
        body: 'Lower volume this week. Rest up and come back stronger.',
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}

// Fires a notification 5 seconds from now so the user can confirm the stack works.
// Background the app after saving to see it.
export async function sendTestNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Notifications are working',
        body: 'Your settings were saved successfully.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
  } catch {
    // Simulator / web — ignore
  }
}
