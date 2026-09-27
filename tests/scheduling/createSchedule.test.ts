import assert from 'node:assert/strict';
import test from 'node:test';

import { createOperationId } from '../../features/kernel/operationId';
import { createScheduleCommand, type ScheduleCreatePort } from '../../features/scheduling/createSchedule';
import { createScheduleOperationStore } from '../../features/scheduling/operationStore';
import type { PlacementPreviewInput } from '../../features/scheduling/placementPreview';
import type { CreateScheduleReceipt } from '../../features/scheduling/repository';

function fixture(): PlacementPreviewInput {
  const revision = createOperationId();
  const dayId = createOperationId();
  return {
    programId: createOperationId(), expectedProgramRevisionId: revision, programSchemaVersion: 2, durationWeeks: 1,
    timezone: 'UTC',
    uncompletedProgramDays: [{
      id: dayId, stable_day_id: createOperationId(), program_revision_id: revision,
      week_number: 1, day_index: 1, is_rest_day: false, program_day_exercises: [{ set_count: 3 }],
    }],
    explicitPlacements: [{ occurrenceId: createOperationId(), programDayId: dayId, localDate: '2026-11-01' }],
  };
}

function harness(input: PlacementPreviewInput) {
  const entries = new Map<string, string>();
  const store = createScheduleOperationStore({
    getItem: async (key) => entries.get(key) ?? null,
    setItem: async (key, value) => { entries.set(key, value); },
    removeItem: async (key) => { entries.delete(key); },
  });
  const sent: string[] = [];
  let available = true;
  let account = 'owner-a';
  let revision = input.expectedProgramRevisionId;
  let verify = true;
  let sendError: Error | null = null;
  let replay = false;
  const receiptId = createOperationId();
  const port: ScheduleCreatePort = {
    assertCreateAvailable: async (owner) => {
      if (!available) throw new Error('Schedule capability unavailable');
      if (owner !== account) throw new Error('Schedule account changed');
    },
    currentRevision: async () => revision,
    sendCreate: async (owner, json) => {
      if (owner !== account) throw new Error('Schedule account changed');
      sent.push(json);
      if (sendError) throw sendError;
      const request: { operationId: string; programId: string } = JSON.parse(json);
      return {
        operationId: request.operationId, programId: request.programId,
        scheduleId: receiptId, revision: 1, replayed: replay,
      } satisfies CreateScheduleReceipt;
    },
    verifyCreate: async () => verify,
  };
  return {
    store, sent, command: createScheduleCommand(port, store),
    setAvailable: (value: boolean) => { available = value; },
    setAccount: (value: string) => { account = value; },
    setRevision: (value: string) => { revision = value; },
    setVerify: (value: boolean) => { verify = value; },
    setSendError: (value: Error | null) => { sendError = value; },
    setReplay: (value: boolean) => { replay = value; },
  };
}

test('confirmation writes exact request before RPC and clears only after authoritative verification', async () => {
  const input = fixture();
  const flow = harness(input);
  flow.setVerify(false);
  const first = await flow.command.create('owner-a', input);
  assert.equal(first.status, 'pending');
  const pending = await flow.store.load('owner-a', input.programId);
  assert.equal(pending?.expectedRevision, 0);
  assert.equal(pending?.requestJson, flow.sent[0]);
  assert.equal((await flow.command.create('owner-a', input)).status, 'conflict');
  flow.setVerify(true);
  flow.setReplay(true);
  assert.equal((await flow.command.retry('owner-a', input.programId)).status, 'replayed');
  assert.deepEqual(flow.sent, [pending?.requestJson, pending?.requestJson]);
  assert.equal(await flow.store.load('owner-a', input.programId), null);
});

test('offline/uncertain response retains the same operation across restart, not a success', async () => {
  const input = fixture();
  const flow = harness(input);
  flow.setSendError(new Error('Network request failed'));
  assert.equal((await flow.command.create('owner-a', input)).status, 'pending');
  const pending = await flow.store.load('owner-a', input.programId);
  flow.setSendError(null);
  flow.setRevision(createOperationId());
  flow.setReplay(true);
  assert.equal((await flow.command.retry('owner-a', input.programId)).status, 'replayed');
  assert.deepEqual(flow.sent, [pending?.requestJson, pending?.requestJson]);
});

test('account switch retains original account request, never submits under another owner', async () => {
  const input = fixture();
  const flow = harness(input);
  flow.setVerify(false);
  await flow.command.create('owner-a', input);
  const prior = await flow.store.load('owner-a', input.programId);
  flow.setAccount('owner-b');
  assert.equal((await flow.command.retry('owner-a', input.programId)).status, 'auth_required');
  assert.equal(await flow.store.load('owner-b', input.programId), null);
  assert.equal((await flow.store.load('owner-a', input.programId))?.requestJson, prior?.requestJson);
  assert.equal(flow.sent.length, 1);
});

test('stale initial program revision and missing capability never create pending writes', async () => {
  const input = fixture();
  const flow = harness(input);
  flow.setRevision(createOperationId());
  assert.equal((await flow.command.create('owner-a', input)).status, 'conflict');
  assert.equal(await flow.store.load('owner-a', input.programId), null);
  flow.setAvailable(false);
  await assert.rejects(flow.command.create('owner-a', input), /capability unavailable/);
  assert.equal(flow.sent.length, 0);
});

test('unknown-date schema-v1 empty non-rest sends only an explicit unplaced intent', async () => {
  const input = fixture();
  const flow = harness(input);
  const emptyDay = { ...input.uncompletedProgramDays[0], program_day_exercises: [] };
  const occurrenceId = createOperationId();
  const outcome = await flow.command.create('owner-a', {
    ...input, programSchemaVersion: 1, uncompletedProgramDays: [emptyDay],
    explicitPlacements: [{ occurrenceId, programDayId: emptyDay.id, kind: 'workout',
      status: 'unplaced', reason: 'Legacy empty prescription; original date unknown.' }],
  });
  assert.equal(outcome.status, 'created');
  const request = JSON.parse(flow.sent[0]) as { days: Record<string, unknown>[] };
  assert.deepEqual(request.days[0], { occurrenceId, programDayId: emptyDay.id, kind: 'workout',
    status: 'unplaced', reason: 'Legacy empty prescription; original date unknown.' });
});

test('server revision conflict is retained for exact retry, not silently replaced', async () => {
  const input = fixture();
  const flow = harness(input);
  flow.setSendError(new Error('stale_revision: program changed'));
  assert.equal((await flow.command.create('owner-a', input)).status, 'conflict');
  const pending = await flow.store.load('owner-a', input.programId);
  assert.equal(pending?.state, 'conflict');
  assert.equal((await flow.command.create('owner-a', input)).status, 'conflict');
  assert.equal((await flow.store.load('owner-a', input.programId))?.requestJson, pending?.requestJson);
});
