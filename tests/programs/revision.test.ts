import assert from 'node:assert/strict';
import test from 'node:test';

import { executeProgramExerciseRevision } from '../../features/programs/commands';
import type {
  ProgramExerciseRevisionReceipt,
  ProgramExerciseRevisionRequest,
} from '../../features/programs/contracts';
import type { ProgramRepository } from '../../features/programs/repository';
import type { OperationId } from '../../features/kernel/operationId';

const operationId = '10000000-0000-4000-8000-000000000001' as OperationId;
const request: ProgramExerciseRevisionRequest = {
  programId: '20000000-0000-4000-8000-000000000001',
  expectedRevision: 1,
  expectedRevisionId: '30000000-0000-4000-8000-000000000001',
  currentStableDayId: '40000000-0000-4000-8000-000000000001',
  currentStableSlotId: '50000000-0000-4000-8000-000000000001',
  originalExerciseId: '60000000-0000-4000-8000-000000000001',
  replacementExerciseId: '60000000-0000-4000-8000-000000000002',
  scope: 'future_after_current',
};
const receipt: ProgramExerciseRevisionReceipt = {
  operationId,
  programId: request.programId,
  baseRevisionId: request.expectedRevisionId,
  revisionId: '30000000-0000-4000-8000-000000000002',
  revision: 2,
  changedSlotCount: 2,
  revisedAt: '2026-09-11T12:00:00.000Z',
  replayed: false,
};

function repository(reviseExercise: ProgramRepository['reviseExercise']): ProgramRepository {
  return {
    install: async () => { throw new Error('not used'); },
    archive: async () => { throw new Error('not used'); },
    restore: async () => { throw new Error('not used'); },
    reviseExercise,
  };
}

test('future revision success and replay preserve one explicit receipt', async () => {
  const success = await executeProgramExerciseRevision(
    repository(async () => receipt), operationId, request,
  );
  assert.equal(success.status, 'revised');
  if (success.status !== 'revised') return;
  assert.equal(success.receipt.revision, 2);
  assert.equal(success.receipt.changedSlotCount, 2);

  const replay = await executeProgramExerciseRevision(
    repository(async () => ({ ...receipt, replayed: true })), operationId, request,
  );
  assert.equal(replay.status, 'replay');
  if (replay.status === 'replay') assert.equal(replay.receipt.revisionId, receipt.revisionId);
});

test('stale future revision is an explicit conflict', async () => {
  const outcome = await executeProgramExerciseRevision(
    repository(async () => { throw new Error('stale_revision: active revision changed'); }),
    operationId,
    request,
  );
  assert.equal(outcome.status, 'conflict');
});

test('future revision failure leaves a distinct unavailable outcome', async () => {
  const outcome = await executeProgramExerciseRevision(
    repository(async () => { throw new Error('network unavailable'); }),
    operationId,
    request,
  );
  assert.deepEqual(outcome, {
    status: 'unavailable',
    failure: { category: 'offline', retryable: true, status: undefined, code: undefined },
    message: 'You appear to be offline. Check your connection and try again.',
  });
});

test('no later workouts is a deterministic no-change result rather than a retry failure', async () => {
  const outcome = await executeProgramExerciseRevision(
    repository(async () => { throw new Error('invalid_input: no eligible future uncompleted prescriptions'); }),
    operationId,
    request,
  );
  assert.deepEqual(outcome, { status: 'no_change', reason: 'no_future_workouts' });
});

test('incomplete revision identity is rejected before the repository call', async () => {
  let called = false;
  const outcome = await executeProgramExerciseRevision(
    repository(async () => { called = true; return receipt; }),
    operationId,
    { ...request, currentStableSlotId: '' },
  );
  assert.equal(outcome.status, 'validation');
  assert.equal(called, false);
});
