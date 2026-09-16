import assert from 'node:assert/strict';
import test from 'node:test';

import { requireRollout } from '../../features/kernel/rollout';
import { classifySupabaseError, OperationFailureError, sanitizedSupabaseDiagnostic, supabaseUserMessage } from '../../utils/supabaseResilience';

test('disabled atomic program installation fails with actionable recovery text', () => {
  assert.throws(
    () => requireRollout(false, 'Atomic program installation'),
    /Atomic program installation is not enabled for this build\. Your existing data has not been changed\./,
  );
});

test('enabled atomic program installation passes the rollout guard', () => {
  assert.doesNotThrow(() => requireRollout(true, 'Atomic program installation'));
});

test('disabled lifecycle errors retain classification through a command and UI exception', () => {
  for (const capability of ['Program restoration', 'Program archiving', 'Atomic program installation']) {
    try { requireRollout(false, capability); assert.fail('must reject'); }
    catch (error) {
      const failure = classifySupabaseError(error);
      const forwarded = new OperationFailureError(failure, supabaseUserMessage(error, 'Try again.'));
      assert.equal(classifySupabaseError(forwarded).category, 'feature_disabled');
      assert.equal(classifySupabaseError(forwarded).retryable, false);
      assert.doesNotMatch(supabaseUserMessage(forwarded, 'Try again.'), /try again|retry/i);
      assert.equal(sanitizedSupabaseDiagnostic('program.restore', forwarded).category, 'feature_disabled');
    }
  }
});

test('RPC failures distinguish schema, authentication, conflict, validation and transport', () => {
  for (const [error, category] of [
    [{ code: 'PGRST202', message: 'Function not found' }, 'schema_unavailable'],
    [{ code: '42703' }, 'schema_unavailable'],
    [{ code: 'P0001', message: 'unauthenticated' }, 'authentication_required'],
    [{ code: 'P0001', message: 'stale_revision' }, 'conflict'],
    [{ code: 'P0001', message: 'operation_payload_mismatch' }, 'conflict'],
    [{ code: 'P0001', message: 'invalid_input: duration' }, 'validation'],
    [{ status: 503 }, 'retryable_service_unavailable'],
  ] as const) {
    assert.equal(classifySupabaseError(error).category, category);
    const wrapped = new OperationFailureError(classifySupabaseError(error), 'sanitized');
    assert.equal(classifySupabaseError(wrapped).category, category);
  }
});
