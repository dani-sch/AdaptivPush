import assert from 'node:assert/strict';
import test from 'node:test';

import {
  settleIndependentSections,
  withSavingState,
} from '../../features/profile/resilience';
import { runSupabaseOperation } from '../../utils/supabaseResilience';

test('independent profile sections retain partial success', async () => {
  let renderedValue: string | null = null;
  const success = Promise.resolve().then(() => {
    renderedValue = 'profile identity';
    return renderedValue;
  });
  const failure = Promise.reject(new Error('progress unavailable'));
  const results = await settleIndependentSections([success, failure]);

  assert.equal(renderedValue, 'profile identity');
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
});

test('profile saving state settles after success, error, timeout, and cancellation', async () => {
  const cases: Array<() => Promise<unknown>> = [
    async () => 'saved',
    async () => { throw new Error('save failed'); },
    () => runSupabaseOperation(
      async () => new Promise<{ data: null; error: null }>(() => undefined),
      { kind: 'write', operation: 'profile.test_timeout', timeoutMs: 5 },
    ),
    () => {
      const controller = new AbortController();
      const pending = runSupabaseOperation(
        async () => new Promise<{ data: null; error: null }>(() => undefined),
        { kind: 'write', operation: 'profile.test_cancel', signal: controller.signal },
      );
      controller.abort();
      return pending;
    },
  ];

  for (const operation of cases) {
    const states: boolean[] = [];
    await withSavingState((saving) => states.push(saving), operation).catch(() => undefined);
    assert.deepEqual(states, [true, false]);
  }
});
