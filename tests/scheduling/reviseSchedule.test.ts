import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScheduleRevision, createScheduleRevisionCommand, parseScheduleRevision,
  type ScheduleRevisionPayload,
} from '../../features/scheduling/reviseSchedule';
import { createScheduleOperationStore } from '../../features/scheduling/operationStore';
import type { ScheduledDay } from '../../features/scheduling/repository';

const workout: ScheduledDay = {
  id: 'occurrence-1', stableDayId: 'stable-1', programDayId: 'day-1',
  prescriptionRevisionId: 'revision-1', localDate: '2026-10-03', timeZone: 'America/New_York',
  kind: 'workout', status: 'planned', fulfillmentSessionId: null, fulfillmentClass: null,
};

function store() {
  const values = new Map<string, string>();
  return createScheduleOperationStore({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  });
}

test('move preview rejects collisions and preserves the source occurrence lineage', () => {
  assert.throws(() => buildScheduleRevision('program-1', 3, 'revision-1', [
    workout,
    { ...workout, id: 'occurrence-2', localDate: '2026-10-04' },
  ], { type: 'move', occurrence: workout, targetDate: '2026-10-04' }));

  const payload = buildScheduleRevision('program-1', 3, 'revision-1', [workout],
    { type: 'move', occurrence: workout, targetDate: '2026-10-05' },
    'ec2ae7b9-fb4a-4f8f-a5f8-9a2c9dd0a1dd');
  assert.deepEqual(payload.changes, [{
    occurrenceId: workout.id, status: 'planned', localDate: '2026-10-05',
  }]);
});

test('skip and rest replacement require explicit reasons without creating catch-up work', () => {
  assert.throws(() => buildScheduleRevision('program-1', 3, 'revision-1', [workout],
    { type: 'skip', occurrence: workout, reason: ' ' }));
  const payload = buildScheduleRevision('program-1', 3, 'revision-1', [workout],
    { type: 'replace_with_rest', occurrence: workout, reason: 'Travel' },
    'ec2ae7b9-fb4a-4f8f-a5f8-9a2c9dd0a1dd');
  assert.deepEqual(payload.changes, [{
    occurrenceId: workout.id, status: 'planned', localDate: '2026-10-03',
    kind: 'rest', reason: 'Travel',
  }]);
});

test('uncertain revision retries the exact persisted bytes and clears only after verification', async () => {
  const payload: ScheduleRevisionPayload = buildScheduleRevision('program-1', 3, 'revision-1', [workout],
    { type: 'move', occurrence: workout, targetDate: '2026-10-05' },
    'ec2ae7b9-fb4a-4f8f-a5f8-9a2c9dd0a1dd');
  let sent = '';
  const command = createScheduleRevisionCommand({
    assertRevisionAvailable: async () => {},
    currentRevision: async () => 'revision-1',
    sendRevision: async (_ownerId, requestJson) => {
      sent = requestJson;
      return {
        operationId: payload.operationId, programId: payload.programId,
        scheduleId: '123e4567-e89b-42d3-a456-426614174000', revision: 4, replayed: false,
      };
    },
    verifyRevision: async () => true,
  }, store());

  const result = await command.revise('owner-1', payload);
  assert.equal(result.status, 'revised');
  assert.equal(sent, JSON.stringify(payload));
});

test('saved revision parser rejects changed recovery identity', () => {
  assert.throws(() => parseScheduleRevision(JSON.stringify({
    schemaVersion: 1, operationId: 'ec2ae7b9-fb4a-4f8f-a5f8-9a2c9dd0a1dd',
    programId: 'program-1', expectedRevision: 3, expectedProgramRevisionId: 'revision-1',
    changes: [{ occurrenceId: 'occurrence-1', status: 'skipped' }],
  }), 'program-1', 'ec2ae7b9-fb4a-4f8f-a5f8-9a2c9dd0a1dd'));
});
