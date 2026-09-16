import assert from 'node:assert/strict';
import test from 'node:test';

import { correctCompletedWorkout } from '../../features/workouts/correctionCommands';
import {
  createCompletedWorkoutCorrection,
  validateCompletedWorkoutCorrection,
} from '../../features/workouts/correctionContracts';
import type { WorkoutCorrectionRepository } from '../../features/workouts/correctionRepository';
import type { WorkoutCorrectionStore } from '../../features/workouts/correctionStore';

const request = createCompletedWorkoutCorrection({
  ownerId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  expectedRevision: 0,
  sets: [{
    actualSetId: '33333333-3333-4333-8333-333333333333',
    prescriptionSlotId: '44444444-4444-4444-8444-444444444444',
    prescribedExerciseId: '55555555-5555-4555-8555-555555555555',
    exerciseId: '66666666-6666-4666-8666-666666666666',
    order: 1,
    reps: 8,
    loadValue: 25,
    loadUnit: 'kg',
    loadKind: 'external',
    loadSide: 'external_total',
    rpe: 8,
    loggedAt: '2026-09-15T12:00:00.000Z',
  }],
});

function memoryStore(): WorkoutCorrectionStore & { value: typeof request | null } {
  return {
    value: null,
    async load() { return this.value; },
    async save(value) { this.value = value; },
    async remove(_owner, _session, operationId) {
      if (this.value?.operationId === operationId) this.value = null;
    },
  };
}

const receipt = {
  operationId: request.operationId,
  sessionId: request.sessionId,
  revision: 1,
  completionClass: 'complete' as const,
  setCount: 1,
  totalVolumeLb: 440.92452436,
  correctedAt: '2026-09-15T12:05:00.000Z',
  replayed: false,
};

test('completed workout correction validates exercise, load, reps, RPE, and units', () => {
  assert.equal(validateCompletedWorkoutCorrection(request).ok, true);
  const invalid = structuredClone(request);
  invalid.sets[0].reps = 0;
  invalid.sets[0].loadValue = null;
  invalid.sets[0].rpe = 11;
  const result = validateCompletedWorkoutCorrection(invalid);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /reps/i);
  assert.match(result.errors.join(' '), /load/i);
  assert.match(result.errors.join(' '), /RPE/i);
});

test('response loss retries the exact correction operation and clears it after replay', async () => {
  const store = memoryStore();
  const submitted: string[] = [];
  let attempts = 0;
  const repository: WorkoutCorrectionRepository = {
    async correct(value) {
      submitted.push(JSON.stringify(value));
      attempts += 1;
      if (attempts === 1) throw new Error('network unavailable after request');
      return { ...receipt, replayed: true };
    },
  };
  const first = await correctCompletedWorkout(repository, store, request);
  assert.equal(first.status, 'pending');
  assert.equal(store.value?.operationId, request.operationId);
  const altered = { ...request, operationId: '77777777-7777-4777-8777-777777777777' as typeof request.operationId, sets: [] };
  const second = await correctCompletedWorkout(repository, store, altered);
  assert.equal(second.status, 'replay');
  assert.equal(submitted[0], submitted[1]);
  assert.equal(store.value, null);
});

test('stale correction is a conflict and permits a freshly loaded edit', async () => {
  const store = memoryStore();
  const repository: WorkoutCorrectionRepository = { correct: async () => { throw new Error('stale_revision'); } };
  const outcome = await correctCompletedWorkout(repository, store, request);
  assert.equal(outcome.status, 'conflict');
  assert.equal(store.value, null);
});

test('empty set list is a valid explicit correction to an abandoned workout', () => {
  const empty = createCompletedWorkoutCorrection({ ...request, sets: [] });
  assert.equal(validateCompletedWorkoutCorrection(empty).ok, true);
});
