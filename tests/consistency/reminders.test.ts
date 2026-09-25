import assert from 'node:assert/strict';
import test from 'node:test';
import { planDatedReminders } from '../../features/consistency/reminders';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../utils/profilePreferences';

const base = {
  ownerId: 'owner', programId: 'program', revision: 2,
  preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, reminderTime: '8:00 AM' },
  occurrences: [
    { occurrenceId: 'work', localDate: '2026-03-08', timeZone: 'America/New_York',
      kind: 'workout' as const, status: 'planned' as const },
    { occurrenceId: 'rest', localDate: '2026-03-09', timeZone: 'America/New_York',
      kind: 'rest' as const, status: 'planned' as const },
  ],
};

test('accepted dates use the schedule timezone across DST without rest or duplicate alerts', () => {
  const first = planDatedReminders(base, new Date('2026-03-01T00:00:00Z'));
  const next = planDatedReminders(base, new Date('2026-03-01T00:00:00Z'));
  assert.equal(first.scheduled[0].at.toISOString(), '2026-03-08T12:00:00.000Z');
  assert.equal(first.scheduled[0].identifier, next.scheduled[0].identifier);
  assert.equal(first.scheduled.length, 1);
});

test('revision and accepted timezone change obsolete identifier without changing local reminder hour', () => {
  const first = planDatedReminders(base, new Date('2026-03-01T00:00:00Z'));
  const moved = planDatedReminders({ ...base, revision: 3,
    occurrences: [{ ...base.occurrences[0], timeZone: 'America/Los_Angeles' }] },
  new Date('2026-03-01T00:00:00Z'));
  assert.equal(moved.scheduled[0].at.toISOString(), '2026-03-08T15:00:00.000Z');
  assert.notEqual(first.scheduled[0].identifier, moved.scheduled[0].identifier);
});

test('quiet hours and DST gaps suppress, not silently shift, accepted work', () => {
  const quiet = planDatedReminders({ ...base,
    preferences: { ...base.preferences, quietHoursEnabled: true,
      quietHoursStart: '10:00 PM', quietHoursEnd: '9:00 AM' } },
  new Date('2026-03-01T00:00:00Z'));
  assert.deepEqual(quiet.suppressed, ['work']);
  const gap = planDatedReminders({ ...base,
    preferences: { ...base.preferences, reminderTime: '2:30 AM' } },
  new Date('2026-03-01T00:00:00Z'));
  assert.deepEqual(gap.suppressed, ['work']);
});

test('fulfilled, unavailable, or past work cannot create notifications', () => {
  const result = planDatedReminders({ ...base, occurrences: [
    { ...base.occurrences[0], status: 'fulfilled' },
  ] }, new Date('2026-03-10T00:00:00Z'));
  assert.deepEqual(result.scheduled, []);
  assert.throws(() => planDatedReminders({ ...base,
    occurrences: [base.occurrences[0], base.occurrences[0]] }), /Duplicate/);
});
