import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INACTIVITY_INTERVAL_MS, updateInactivityNudge,
} from '../../features/workouts/inactivityPolicy';

test('inactivity nudge is due exactly five minutes after the last logged set', () => {
  const started = '2026-09-27T12:00:00.000Z';
  const initial = updateInactivityNudge(null, 'owner', 'draft', started);
  assert.equal(Date.parse(initial.deadlineAt) - Date.parse(started), INACTIVITY_INTERVAL_MS);

  const resumed = updateInactivityNudge(initial, 'owner', 'draft', '2026-09-27T12:04:00.000Z');
  assert.equal(resumed.deadlineAt, '2026-09-27T12:09:00.000Z');
});

test('a notified draft never schedules a second inactivity nudge', () => {
  const initial = updateInactivityNudge(null, 'owner', 'draft', '2026-09-27T12:00:00.000Z');
  assert.deepEqual(updateInactivityNudge({ ...initial, notified: true }, 'owner', 'draft',
    '2026-09-27T12:10:00.000Z'), { ...initial, notified: true });
});

test('an owner or draft mismatch rejects a reused nudge state', () => {
  const initial = updateInactivityNudge(null, 'owner', 'draft', '2026-09-27T12:00:00.000Z');
  assert.throws(() => updateInactivityNudge(initial, 'other', 'draft',
    '2026-09-27T12:02:00.000Z'), /another workout/);
});
