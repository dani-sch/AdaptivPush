import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifySupabaseError,
  loginErrorMessage,
  OperationFailureError,
  runSupabaseOperation,
  sanitizedSupabaseDiagnostic,
  supabaseSaveFailureMessage,
  SupabaseRequestTimeoutError,
  resilientSupabaseFetch,
} from '../../utils/supabaseResilience';

test('native fetch cancellation settles even if the transport ignores AbortSignal', async (t) => {
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(() => {}));
  const controller = new AbortController();
  const pending = resilientSupabaseFetch('https://example.supabase.co/auth/v1/token', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, error => classifySupabaseError(error).category === 'cancelled');
});

test('Expo native fetch, DNS/TLS and status-zero auth failures are retryable connection failures', () => {
  for (const error of [
    { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed: UnexpectedException: Could not connect to the server. (at ExpoModulesCore/Promise.swift:56)' },
    { name: 'AuthRetryableFetchError', status: 0 },
    new Error('The network connection was lost'), new Error('ECONNREFUSED'), new Error('TLS handshake failed'),
  ]) {
    const failure = classifySupabaseError(error);
    assert.equal(failure.category, 'offline');
    assert.equal(failure.retryable, true);
    assert.match(loginErrorMessage(error), /try again/);
    assert.doesNotMatch(loginErrorMessage(error), /password is incorrect/);
  }
});

test('classifies availability, auth, policy, and schema failures distinctly', () => {
  assert.equal(classifySupabaseError({ status: 502 }).category, 'retryable_service_unavailable');
  assert.equal(
    classifySupabaseError({ message: 'Failed to get project config.' }).category,
    'retryable_service_unavailable',
  );
  assert.equal(classifySupabaseError({ status: 503 }).category, 'retryable_service_unavailable');
  assert.equal(classifySupabaseError(new SupabaseRequestTimeoutError(10)).category, 'timeout');
  assert.equal(classifySupabaseError(new Error('Network request failed')).category, 'offline');
  assert.equal(classifySupabaseError(new Error('Project is paused')).category, 'project_unavailable');
  assert.equal(
    classifySupabaseError({ status: 503, message: 'Project has been paused' }).category,
    'project_unavailable',
  );
  assert.equal(classifySupabaseError({ status: 401, message: 'JWT expired' }).category, 'authentication_required');
  assert.equal(classifySupabaseError({ status: 403, code: '42501' }).category, 'forbidden');
  assert.equal(classifySupabaseError({ code: 'PGRST205' }).category, 'schema_unavailable');
});

test('login copy distinguishes invalid credentials and never exposes gateway JSON', () => {
  assert.equal(
    loginErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    'The email or password is incorrect.',
  );
  const copy = loginErrorMessage({
    status: 502,
    message: '{"message":"Bad Gateway","url":"https://example.supabase.co/auth/v1/token"}',
  });
  assert.match(copy, /temporarily unavailable/);
  assert.doesNotMatch(copy, /supabase|https|Bad Gateway|\{/i);
});

test('diagnostics retain only bounded non-sensitive fields', () => {
  const diagnostic = sanitizedSupabaseDiagnostic(
    'profile.load',
    {
      status: 503,
      code: 'gateway_timeout',
      message: 'token=secret https://example.supabase.co/rest/v1/user_profile',
    },
    new Date('2026-09-14T12:00:00.000Z'),
  );
  assert.deepEqual(diagnostic, {
    operation: 'profile.load',
    category: 'retryable_service_unavailable',
    retryable: true,
    status: 503,
    code: 'gateway_timeout',
    occurredAt: '2026-09-14T12:00:00.000Z',
  });
  assert.equal('message' in diagnostic, false);
});

test('reads retry only within the configured bound', async () => {
  let calls = 0;
  const result = await runSupabaseOperation(
    async () => {
      calls += 1;
      return calls === 1 ? { data: null, error: { status: 503 } } : { data: 'ok', error: null };
    },
    {
      kind: 'read',
      operation: 'test.read',
      maxAttempts: 2,
      baseDelayMs: 0,
      maxJitterMs: 0,
      sleep: async () => undefined,
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.data, 'ok');
});

test('writes are never automatically duplicated', async () => {
  let calls = 0;
  const result = await runSupabaseOperation(
    async () => {
      calls += 1;
      return { data: null, error: { status: 503 } };
    },
    { kind: 'write', operation: 'test.write', maxAttempts: 9 },
  );
  assert.equal(calls, 1);
  assert.equal(result.error && classifySupabaseError(result.error).category, 'retryable_service_unavailable');
});

test('save failures distinguish no-write from possible partial completion', () => {
  assert.match(supabaseSaveFailureMessage({ status: 503 }, 0), /unsaved changes are still here/i);
  assert.match(supabaseSaveFailureMessage({ status: 503 }, 1), /may already have saved/i);
});

test('save recovery reassurance appears once across typed and classified failures', () => {
  for (const error of [
    { category: 'feature_disabled', retryable: false },
    { category: 'validation', retryable: false },
    { code: 'PGRST205' },
    new OperationFailureError({ category: 'conflict', retryable: false },
      'Refresh your program. Your unsaved changes are still here.'),
  ]) {
    const message = supabaseSaveFailureMessage(error);
    assert.equal(message.match(/changes are still here\./gi)?.length, 1);
  }
});

test('a bounded request times out and cancellation prevents stale work', async () => {
  await assert.rejects(
    runSupabaseOperation(
      async () => new Promise<{ data: null; error: null }>(() => undefined),
      { kind: 'read', operation: 'test.timeout', timeoutMs: 5, maxAttempts: 1 },
    ),
    (error) => classifySupabaseError(error).category === 'timeout',
  );

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    runSupabaseOperation(async () => ({ data: null, error: null }), {
      kind: 'read',
      operation: 'test.cancel',
      signal: controller.signal,
    }),
    (error) => classifySupabaseError(error).category === 'cancelled',
  );

  const inFlightController = new AbortController();
  const inFlight = runSupabaseOperation(
    async () => new Promise<{ data: null; error: null }>(() => undefined),
    {
      kind: 'read',
      operation: 'test.in_flight_cancel',
      signal: inFlightController.signal,
      timeoutMs: 1_000,
    },
  );
  inFlightController.abort();
  await assert.rejects(
    inFlight,
    (error) => classifySupabaseError(error).category === 'cancelled',
  );
});
