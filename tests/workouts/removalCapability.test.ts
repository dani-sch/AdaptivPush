import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRemovalCapability } from '../../features/workouts/removalCapability';

test('removal requires the exact supported contract; missing RPC differs from failed auth/connectivity', async () => {
  for (const data of [null, 0, '1', 2]) assert.equal((await checkRemovalCapability(async () => ({ data, error: null }))).status, 'unsupported');
  assert.equal((await checkRemovalCapability(async () => ({ data: 1, error: null }))).status, 'available');
  assert.equal((await checkRemovalCapability(async () => ({ data: null, error: { code: 'PGRST202' } }))).status, 'unsupported');
  for (const error of [{ status: 401 }, { status: 503 }, { message: 'Could not connect to the server' }]) {
    assert.equal((await checkRemovalCapability(async () => ({ data: null, error }))).status, 'failed');
    assert.equal((await checkRemovalCapability(async () => { throw error; })).status, 'failed');
  }
});
test('a failed removal check can be retried successfully without caching false support', async () => {
  assert.equal((await checkRemovalCapability(async () => { throw Error('fetch failed'); })).status, 'failed');
  assert.equal((await checkRemovalCapability(async () => ({ data: 1, error: null }))).status, 'available');
});
