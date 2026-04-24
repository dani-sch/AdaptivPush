import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseNotificationPreferences } from './profilePreferences';
import { supabase } from './supabase';

import type { NotificationPreferences } from './profilePreferences';

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

export async function scheduleWorkoutReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_REMINDER_ID,
      content: {
        title: 'Time to train',
        body: "Your workout is scheduled for today. Let's go!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
  } catch {
    // Scheduling not supported (simulator / web)
  }
}

export async function cancelWorkoutReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WORKOUT_REMINDER_ID).catch(() => {});
}

export async function applyNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  if (Platform.OS === 'web') return;
  if (prefs.pushEnabled && prefs.workoutReminder) {
    await scheduleWorkoutReminder();
  } else {
    await cancelWorkoutReminder();
  }
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
