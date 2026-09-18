import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkoutEditDraftStore } from '../../features/workouts/editDraftStore';

test('unsubmitted edits survive reauthentication and are isolated by owner and workout', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
  const store = createWorkoutEditDraftStore(storage);
  const draft = { ownerId: 'owner-a', sessionId: 'workout', revision: 4, exercises: [], removals: { version: 1 as const, slots: ['slot'], sets: [] } };
  await store.save(draft);
  const restarted = createWorkoutEditDraftStore(storage);
  assert.equal(await restarted.load('owner-b', 'workout'), null);
  assert.equal(await restarted.load('owner-a', 'other-workout'), null);
  assert.deepEqual(await restarted.load('owner-a', 'workout'), draft);
  const save = store.save({ ...draft, revision: 5 });
  const remove = store.remove('owner-a', 'workout');
  await Promise.all([save, remove]);
  assert.equal(await store.load('owner-a', 'workout'), null);
});
