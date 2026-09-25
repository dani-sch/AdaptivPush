import { asLocalDate, toUtcDateFromLocal, validateTimeZone } from '../kernel/localDate';
import type { NotificationPreferences } from '@/utils/profilePreferences';

export const SCHEDULE_REMINDER_PREFIX = 'adaptivpush.schedule.v1:';

export interface ReminderOccurrence {
  occurrenceId: string;
  localDate: string;
  timeZone: string;
  kind: 'workout' | 'rest';
  status: 'planned' | 'in_progress' | 'unplaced' | 'skipped' | 'paused' | 'fulfilled';
}

export interface ReminderPlan {
  ownerId: string;
  programId: string;
  revision: number;
  occurrences: readonly ReminderOccurrence[];
  preferences: NotificationPreferences;
}

export interface DatedReminder {
  identifier: string;
  occurrenceId: string;
  at: Date;
}

function minutes(time: string): number {
  const match = /^(1[0-2]|[1-9]):([0-5]\d) (AM|PM)$/.exec(time);
  if (!match) throw new Error('Reminder time must use a selected local time.');
  return (Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

function inQuietHours(time: number, start: number, end: number): boolean {
  if (start === end) throw new Error('Quiet hours cannot begin and end at the same time.');
  return start < end ? time >= start && time < end : time >= start || time < end;
}

export function planDatedReminders(plan: ReminderPlan, now = new Date()): {
  scheduled: DatedReminder[];
  suppressed: string[];
} {
  if (!plan.ownerId || !plan.programId || !Number.isSafeInteger(plan.revision) || plan.revision < 1) {
    throw new Error('Accepted owner, program and schedule revision are required.');
  }
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid current time.');
  const chosen = minutes(plan.preferences.reminderTime);
  const quietStart = plan.preferences.quietHoursEnabled ? minutes(plan.preferences.quietHoursStart) : null;
  const quietEnd = plan.preferences.quietHoursEnabled ? minutes(plan.preferences.quietHoursEnd) : null;
  const scheduled: DatedReminder[] = [];
  const suppressed: string[] = [];
  const seen = new Set<string>();
  for (const occurrence of plan.occurrences) {
    if (!occurrence.occurrenceId || seen.has(occurrence.occurrenceId)) {
      throw new Error('Duplicate or missing schedule occurrence in reminder plan.');
    }
    seen.add(occurrence.occurrenceId);
    if (occurrence.kind !== 'workout' || occurrence.status !== 'planned') continue;
    validateTimeZone(occurrence.timeZone);
    const date = asLocalDate(occurrence.localDate);
    if (quietStart !== null && quietEnd !== null && inQuietHours(chosen, quietStart, quietEnd)) {
      suppressed.push(occurrence.occurrenceId);
      continue;
    }
    let at: Date;
    try {
      at = toUtcDateFromLocal(date, occurrence.timeZone,
        `${String(Math.floor(chosen / 60)).padStart(2, '0')}:${String(chosen % 60).padStart(2, '0')}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('DST gap')) {
        suppressed.push(occurrence.occurrenceId);
        continue;
      }
      throw error;
    }
    if (at.getTime() <= now.getTime()) continue;
    scheduled.push({
      identifier: `${SCHEDULE_REMINDER_PREFIX}${plan.ownerId}:${plan.programId}:${plan.revision}:${occurrence.occurrenceId}:${at.getTime()}`,
      occurrenceId: occurrence.occurrenceId,
      at,
    });
  }
  scheduled.sort((a, b) => a.at.getTime() - b.at.getTime() ||
    a.identifier.localeCompare(b.identifier));
  return { scheduled, suppressed };
}
