import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canApplyOwnerScopedResult,
  programStateAfterFailure,
  programStateAfterSuccess,
} from '../../features/programs/availability';

test('a transient refresh failure preserves the current owner cached program', () => {
  const cached = { id: 'owner-a-program' };
  assert.deepEqual(programStateAfterFailure(cached, 'retryable_service_unavailable'), {
    program: cached,
    unavailable: true,
    failureCategory: 'retryable_service_unavailable',
  });
});

test('an initial program failure is unavailable rather than no-program success', () => {
  assert.deepEqual(programStateAfterFailure(null, 'timeout'), {
    program: null,
    unavailable: true,
    failureCategory: 'timeout',
  });
  assert.deepEqual(programStateAfterSuccess(null), {
    program: null,
    unavailable: false,
    failureCategory: null,
  });
});

test('stale or cancelled owner-scoped results cannot update state', () => {
  assert.equal(canApplyOwnerScopedResult('owner-a', 'owner-a', false), true);
  assert.equal(canApplyOwnerScopedResult('owner-a', 'owner-b', false), false);
  assert.equal(canApplyOwnerScopedResult('owner-a', 'owner-a', true), false);
});
