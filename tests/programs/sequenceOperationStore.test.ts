import test from 'node:test';
import assert from 'node:assert/strict';

// Ensure AsyncStorage's window checks succeed in Node test runner
if (typeof (global as any).window === 'undefined') (global as any).window = {};

import { sequenceOperationStore } from '../../features/programs/sequenceOperationStore';

// These tests rely on AsyncStorage being available via the library's mocked implementation in test env.
// We test the save/load/remove/list behaviors.

test('save, load, remove pending operation', async () => {
  const pending = {
    ownerId: 'owner-1',
    operationId: 'op-1',
    programId: 'pid-1',
    kind: 'change',
    payload: { foo: 'bar' },
    createdAt: new Date().toISOString(),
    lastError: null,
  };
  await sequenceOperationStore.savePending(pending);
  const loaded = await sequenceOperationStore.loadPending('owner-1', 'op-1');
  assert.deepEqual(loaded?.operationId, 'op-1');
  assert.deepEqual(loaded?.payload, pending.payload);
  const listed = await sequenceOperationStore.listPendingForOwner('owner-1');
  assert.ok(listed.find(p => p.operationId === 'op-1'));
  await sequenceOperationStore.removePending('owner-1', 'op-1');
  const after = await sequenceOperationStore.loadPending('owner-1', 'op-1');
  assert.equal(after, null);
});
