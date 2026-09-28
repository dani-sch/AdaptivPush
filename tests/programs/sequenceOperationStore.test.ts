import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { sequenceOperationStore } = require('../../features/programs/sequenceOperationStore') as
  typeof import('../../features/programs/sequenceOperationStore');

test('save, load, remove pending operation', async () => {
  const pending = {
    ownerId: 'owner-1',
    operationId: 'op-1',
    programId: 'pid-1',
    kind: 'change' as const,
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

test('sequence recovery isolates owners and refuses reuse of a frozen operation ID', async () => {
  const pending = {
    ownerId: 'owner-a',
    operationId: 'op-frozen',
    programId: 'program-a',
    kind: 'change' as const,
    payload: { programId: 'program-a', operationId: 'op-frozen', kind: 'pause' },
    createdAt: '2026-09-27T00:00:00.000Z',
  };
  await sequenceOperationStore.savePending(pending);

  assert.equal(await sequenceOperationStore.loadPending('owner-b', pending.operationId), null);
  assert.deepEqual(await sequenceOperationStore.listPendingForOwner('owner-b'), []);
  await assert.rejects(
    sequenceOperationStore.savePending({ ...pending, payload: { ...pending.payload, kind: 'resume' } }),
    /cannot be reused/,
  );
  assert.deepEqual((await sequenceOperationStore.loadPending('owner-a', pending.operationId))?.payload, pending.payload);

  await sequenceOperationStore.removePending('owner-a', pending.operationId);
});
