import { confirmedSwapMessage } from '../../features/workouts/swapRecovery';
import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProgramExerciseRevisionRequest } from '../../features/programs/contracts';
import {
  compensationRequest,
  isNoFutureWorkoutsDetail,
  pendingSwapForRecovery,
  workoutOnlyReconciliationStep,
  workoutSwapSyncDisposition,
} from '../../features/workouts/swapRecovery';

const request: ProgramExerciseRevisionRequest = {
  programId: 'program-id',
  expectedRevision: 4,
  expectedRevisionId: 'revision-4',
  currentStableDayId: 'day-id',
  currentStableSlotId: 'slot-id',
  originalExerciseId: 'original-id',
  replacementExerciseId: 'replacement-id',
  scope: 'future_after_current',
};

test('deterministic no-future-workouts result does not become pending Retry state', () => {
  assert.deepEqual(
    workoutSwapSyncDisposition({ status: 'no_change', reason: 'no_future_workouts' }),
    { status: 'no_future_workouts' },
  );
  assert.equal(isNoFutureWorkoutsDetail('No later uncompleted occurrences remain.'), true);
  const stored = { request, lastError: 'No later uncompleted occurrences remain.' };
  assert.equal(pendingSwapForRecovery(stored), null);
  assert.equal(stored.request, request);
});

test('genuine response loss remains uncertain for exact-operation retry', () => {
  const outcome = {
    status: 'unavailable' as const,
    failure: { category: 'timeout' as const, retryable: true },
    message: 'request timed out',
  };

  assert.deepEqual(workoutSwapSyncDisposition(outcome), {
    status: 'uncertain',
    detail: 'request timed out',
  });
  const pending = { request, operationId: 'exact-id', lastError: outcome.message };
  assert.equal(pendingSwapForRecovery(pending), pending);
});

test('workout-only supersession reverses only the confirmed wider operation', () => {
  const reverse = compensationRequest(request, { revision: 5, revisionId: 'revision-5' });

  assert.deepEqual(reverse, {
    ...request,
    expectedRevision: 5,
    expectedRevisionId: 'revision-5',
    originalExerciseId: 'replacement-id',
    replacementExerciseId: 'original-id',
  });
});

test('workout-only supersession keeps an uncertain exact operation and compensates a replay', () => {
  const uncertain = workoutOnlyReconciliationStep('program_update', request, {
    status: 'unavailable',
    failure: { category: 'offline', retryable: true },
    message: 'response lost',
  });
  const confirmed = workoutOnlyReconciliationStep('program_update', request, {
    status: 'replay',
    receipt: {
      operationId: 'same-operation-id',
      programId: request.programId,
      baseRevisionId: request.expectedRevisionId,
      revisionId: 'revision-5',
      revision: 5,
      changedSlotCount: 2,
      revisedAt: '2026-09-15T12:00:00.000Z',
      replayed: true,
    },
  });

  assert.deepEqual(uncertain, { status: 'retry', detail: 'response lost' });
  assert.deepEqual(confirmed, {
    status: 'compensate',
    request: compensationRequest(request, { revision: 5, revisionId: 'revision-5' }),
  });
});

test('confirmed final-week swap reports this workout only when no future slots changed', () => {
  assert.equal(confirmedSwapMessage(0), 'Exercise swapped for this workout.');
  assert.equal(confirmedSwapMessage(2), 'Exercise swapped for this and future workouts.');
});
