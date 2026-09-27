import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createScheduleOperationStore,
  type PendingScheduleOperation,
} from '../../features/scheduling/operationStore';

const operation: PendingScheduleOperation = {
  schemaVersion: 1,
  ownerId: 'owner-a',
  programId: 'program-a',
  operationId: 'operation-1',
  expectedRevision: 4,
  requestJson: '{"operationId":"operation-1","expectedRevision":4}',
  state: 'queued',
};

function memoryStore() {
  const data = new Map<string, string>();
  return { data, store: createScheduleOperationStore({
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  }) };
}

test('uncertain schedule response preserves the exact request and owner isolation', async () => {
  const { store } = memoryStore();
  await store.save(operation);
  await store.save({ ...operation, state: 'sending' });
  assert.deepEqual(await store.load('owner-a', 'program-a'), { ...operation, state: 'sending' });
  assert.equal(await store.load('owner-b', 'program-a'), null);
  await assert.rejects(store.save({ ...operation, operationId: 'operation-2' }));
  await assert.rejects(store.save({ ...operation, requestJson: '{"changed":true}' }));
  await store.remove('owner-a', 'program-a', 'operation-2');
  assert.notEqual(await store.load('owner-a', 'program-a'), null);
  await store.remove('owner-a', 'program-a', 'operation-1');
  assert.equal(await store.load('owner-a', 'program-a'), null);
});

test('corrupt or unsupported pending operation is never silently discarded', async () => {
  const { store, data } = memoryStore();
  await store.save(operation);
  const key = [...data.keys()][0];
  data.set(key, JSON.stringify({ ...operation, schemaVersion: 2 }));
  await assert.rejects(store.load('owner-a', 'program-a'), /safely replayed/);
  data.set(key, JSON.stringify({ ...operation, requestJson: '{"operationId":"different","expectedRevision":4}' }));
  await assert.rejects(store.load('owner-a', 'program-a'), /recovery identity/);
});
