import assert from 'node:assert/strict';
import test from 'node:test';

import { correctCompletedWorkout } from '../../features/workouts/correctionCommands';
import {
  createCompletedWorkoutCorrection,
  validateCompletedWorkoutCorrection,
} from '../../features/workouts/correctionContracts';
import type { WorkoutCorrectionRepository } from '../../features/workouts/correctionRepository';
import type { WorkoutCorrectionStore } from '../../features/workouts/correctionStore';
import { correctionLoadSelection, type EditableCorrectionSet } from '../../features/workouts/correctionEditor';

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

test('assistance survives unit changes and bodyweight clears external measurements', () => {
  const set: EditableCorrectionSet = { ...request.sets[0], prescribed: true, outcome: 'performed', loadText: '25', repsText: '8', rpeText: '8' };
  const assisted = { ...set, ...correctionLoadSelection(set, 'assistance') };
  assert.equal(correctionLoadSelection(assisted, 'lb').loadKind, 'assistance');
  assert.equal(correctionLoadSelection(assisted, 'external').loadKind, 'external');
  const bodyweight = { ...assisted, ...correctionLoadSelection(assisted, 'none') };
  assert.equal(bodyweight.loadText, ''); assert.equal(bodyweight.loadValue, null);
  assert.equal(bodyweight.loadUnit, 'none');
});

test('validation rejects invalid revisions, load enums and contradictory prescribed outcomes', () => {
  for (const expectedRevision of [NaN, Infinity, 0.5, -1]) assert.equal(validateCompletedWorkoutCorrection({ ...request, expectedRevision }).ok, false);
  const outcome = { setId: request.sets[0].actualSetId, slotId: request.sets[0].prescriptionSlotId!, order: 1, outcome: 'performed' as const };
  assert.equal(validateCompletedWorkoutCorrection({ ...request, setOutcomes: [outcome] }).ok, true);
  assert.equal(validateCompletedWorkoutCorrection({ ...request, setOutcomes: [outcome, outcome] }).ok, false);
  assert.equal(validateCompletedWorkoutCorrection({ ...request, setOutcomes: [{ ...outcome, outcome: 'skipped' }] }).ok, false);
  assert.equal(validateCompletedWorkoutCorrection({ ...request, sets: [], setOutcomes: [outcome] }).ok, false);
  assert.equal(validateCompletedWorkoutCorrection({ ...request, sets: [{ ...request.sets[0], loadUnit: 'invalid' as 'lb' }] }).ok, false);
});

test('definitive server validation frees the edit while uncertain requests stay recoverable', async () => {
  const store = memoryStore();
  const outcome = await correctCompletedWorkout({ correct: async () => { throw new Error('invalid_input: unknown exercise'); } }, store, request);
  assert.equal(outcome.status, 'validation'); assert.equal(store.value, null);
});

test('correction creation freezes prescribed outcomes for exact retries', () => {
  const setOutcomes = [{ setId: request.sets[0].actualSetId, slotId: request.sets[0].prescriptionSlotId!, order: 1, outcome: 'performed' as const }];
  const frozen = createCompletedWorkoutCorrection({ ...request, setOutcomes });
  setOutcomes[0].order = 2;
  assert.equal(frozen.setOutcomes?.[0].order, 1);
});
