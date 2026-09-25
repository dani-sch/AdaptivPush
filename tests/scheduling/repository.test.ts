import test from 'node:test';
import assert from 'node:assert/strict';

import { canStartUndatedWorkout, parseScheduledDay, reminderPlanForSchedule, scheduledOutcomeLabel, scheduledPrescriptionsMatchRevision, selectScheduleToday, todayInScheduleZone, type ScheduleRead } from '../../features/scheduling/repository';
import { parseNotificationPreferences } from '../../utils/profilePreferences';

const placed: ScheduleRead = {
  state: 'ready', revision: 1, timeZone: 'America/New_York',
  days: [
    { id: 'occ-1', stableDayId: 'lineage-1', programDayId: 'day-1',
      prescriptionRevisionId: 'rev-1', localDate: '2026-09-25', timeZone: 'America/New_York',
      kind: 'rest', status: 'planned', fulfillmentSessionId: null, fulfillmentClass: null },
    { id: 'occ-2', stableDayId: 'lineage-2', programDayId: 'day-2',
      prescriptionRevisionId: 'rev-1', localDate: '2026-09-26', timeZone: 'America/New_York',
      kind: 'workout', status: 'planned', fulfillmentSessionId: null, fulfillmentClass: null },
  ],
};

test('today uses the confirmed schedule zone, not the device or UTC day', () => {
  const now = new Date('2026-09-26T02:30:00Z');
  assert.equal(todayInScheduleZone(now, 'America/New_York'), '2026-09-25');
  assert.equal(selectScheduleToday(placed, now).state, 'rest');
});

test('no dated occurrence is not inferred as a rest day or next unfinished workout', () => {
  assert.equal(selectScheduleToday(placed, new Date('2026-09-27T16:00:00Z')).state, 'unplaced');
  assert.equal(selectScheduleToday({ state: 'unplaced' }, new Date()).state, 'unplaced');
  assert.equal(selectScheduleToday({ state: 'unavailable', reason: 'not deployed' }, new Date()).state, 'unavailable');
});

test('duplicate date is a conflict and a completed occurrence is not startable', () => {
  if (placed.state !== 'ready') throw new Error('Invalid test fixture');
  const day = placed.days[0];
  assert.equal(selectScheduleToday({ ...placed, days: [...placed.days, { ...day, id: 'duplicate' }] },
    new Date('2026-09-25T16:00:00Z')).state, 'conflict');
  assert.equal(selectScheduleToday({ ...placed, days: [{ ...placed.days[1], status: 'fulfilled', fulfillmentSessionId: 'session-1', fulfillmentClass: 'full' }] },
    new Date('2026-09-26T16:00:00Z')).state, 'fulfilled');
});

test('legacy undated entry only remains available when absence is confirmed', () => {
  assert.equal(canStartUndatedWorkout(null, false), false);
  assert.equal(canStartUndatedWorkout(placed, false), false);
  assert.equal(canStartUndatedWorkout({ state: 'conflict', reason: 'pending' }, false), false);
  assert.equal(canStartUndatedWorkout({ state: 'unavailable', reason: 'Offline' }, false), false);
  assert.equal(canStartUndatedWorkout({ state: 'conflict', reason: 'Unsupported schedule version' }, false), false);
  assert.equal(canStartUndatedWorkout({ state: 'unplaced' }, false), true);
  assert.equal(canStartUndatedWorkout({ state: 'unplaced' }, true), false);
});

test('explicit rest without program day remains readable; workout without prescription is rejected', () => {
  const row = {
    id: 'rest-1', stable_day_id: 'rest-1', current_program_day_id: null,
    current_prescription_revision_id: 'rev-1', current_local_date: '2026-09-25',
    current_timezone: 'America/New_York', current_kind: 'rest',
    status: 'planned', fulfillment_session_id: null, fulfillment_class: null,
  };
  assert.equal(parseScheduledDay(row).programDayId, null);
  assert.throws(() => parseScheduledDay({ ...row, current_kind: 'workout' }));
});

test('fixed occurrences retain their own timezone after a schedule timezone change', () => {
  if (placed.state !== 'ready') throw new Error('Invalid test fixture');
  const fixed = { ...placed.days[0], timeZone: 'America/Los_Angeles' };
  const now = new Date('2026-09-26T03:30:00Z');
  assert.equal(selectScheduleToday({ ...placed, timeZone: 'America/New_York', days: [fixed] }, now).state, 'rest');
});

test('reminder plan uses accepted revision, actual occurrence dates and zones only', () => {
  if (placed.state !== 'ready') throw new Error('Invalid test fixture');
  const read = { ...placed, revision: 4, days: [
    { ...placed.days[0], kind: 'workout' as const, timeZone: 'America/Los_Angeles' },
    { ...placed.days[1], localDate: null, status: 'unplaced' as const },
  ] };
  const plan = reminderPlanForSchedule(read, 'owner-1', 'program-1', parseNotificationPreferences({}));
  assert.equal(plan.revision, 4);
  assert.deepEqual(plan.occurrences, [{
    occurrenceId: 'occ-1', localDate: '2026-09-25', timeZone: 'America/Los_Angeles',
    kind: 'workout', status: 'planned',
  }]);
});

test('abandoned and unknown finished sessions are never presented as completed workouts', () => {
  if (placed.state !== 'ready') throw new Error('Invalid test fixture');
  const day = placed.days[1];
  assert.equal(scheduledOutcomeLabel({ ...day, status: 'fulfilled', fulfillmentSessionId: 's1',
    fulfillmentClass: 'abandoned' }), 'Session ended without completed work');
  assert.equal(scheduledOutcomeLabel({ ...day, status: 'fulfilled', fulfillmentSessionId: 's1',
    fulfillmentClass: 'legacy_unknown' }), 'Workout outcome unknown');
  assert.throws(() => parseScheduledDay({
    id: 'occ-2', stable_day_id: 'day-2', current_program_day_id: 'day-2',
    current_prescription_revision_id: 'rev-1', current_local_date: '2026-09-26',
    current_timezone: 'UTC', current_kind: 'workout',
    status: 'fulfilled', fulfillment_session_id: 's1', fulfillment_class: null,
  }));
});

test('planned workouts with stale program revision are not accepted or reminded', () => {
  if (placed.state !== 'ready') throw new Error('Invalid test fixture');
  assert.equal(scheduledPrescriptionsMatchRevision(placed.days, 'rev-1'), true);
  assert.equal(scheduledPrescriptionsMatchRevision(placed.days, 'rev-2'), false);
  assert.equal(scheduledPrescriptionsMatchRevision(placed.days, null), false);
  assert.equal(scheduledPrescriptionsMatchRevision(
    placed.days.map((day) => day.kind === 'workout'
      ? { ...day, status: 'fulfilled' as const, fulfillmentSessionId: 's1', fulfillmentClass: 'full' as const }
      : day),
    'rev-2'), true);
});
