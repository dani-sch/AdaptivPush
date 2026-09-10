import assert from 'node:assert/strict';
import test from 'node:test';

import {
  amendWorkoutExercise,
  classifyWorkoutCompletion,
  confirmWorkoutRecalibration,
  createWorkoutDraft,
  updateWorkoutSet,
  validateWorkoutDraft,
} from '../../features/workouts/contracts';
import { finalizeWorkout } from '../../features/workouts/commands';
import type { WorkoutDraftStore } from '../../features/workouts/draftStore';
import type { WorkoutRepository } from '../../features/workouts/repository';

const ownerId = '11111111-1111-4111-8111-111111111111';
const programDayId = '22222222-2222-4222-8222-222222222222';
const prescriptionRevisionId = '33333333-3333-4333-8333-333333333333';
const prescribedExerciseId = '44444444-4444-4444-8444-444444444444';
const replacementExerciseId = '55555555-5555-4555-8555-555555555555';

function fixtureDraft() {
  return createWorkoutDraft({
    ownerId,
    programDayId,
    prescriptionRevisionId,
    workoutName: 'Strength A',
    startedAt: '2026-09-10T12:00:00.000Z',
    timezone: 'America/New_York',
    slots: [
      {
        slotId: '66666666-6666-4666-8666-666666666666',
        prescribedExerciseId,
        order: 1,
        prescribedSetCount: 4,
        sets: Array.from({ length: 4 }, (_, index) => ({
          setId: `77777777-7777-4777-8777-77777777777${index}`,
          order: index + 1,
          plannedRepsMin: 5,
          plannedRepsMax: 8,
          plannedLoad: 0,
          loadKind: 'bodyweight' as const,
          loadUnit: 'lb' as const,
          loadSide: 'external_total' as const,
        })),
      },
    ],
  });
}

test('zero load remains an explicit zero and one of four sets is partial', () => {
  const draft = updateWorkoutSet(fixtureDraft(), {
    setId: '77777777-7777-4777-8777-777777777770',
    reps: 8,
    load: 0,
    rpe: 7,
    logged: true,
    loggedAt: '2026-09-10T12:05:00.000Z',
  });

  assert.equal(draft.slots[0].sets[0].actualLoad, 0);
  assert.equal(classifyWorkoutCompletion(draft), 'partial');
  assert.equal(validateWorkoutDraft(draft).ok, true);
});

test('a temporary swap preserves completed set identity and requires recalibration', () => {
  const logged = updateWorkoutSet(fixtureDraft(), {
    setId: '77777777-7777-4777-8777-777777777770',
    reps: 6,
    load: 100,
    logged: true,
    loggedAt: '2026-09-10T12:05:00.000Z',
  });
  const swapped = amendWorkoutExercise(logged, {
    slotId: '66666666-6666-4666-8666-666666666666',
    replacementExerciseId,
    amendedAt: '2026-09-10T12:06:00.000Z',
  });

  assert.equal(swapped.slots[0].sets[0].actualExerciseId, prescribedExerciseId);
  assert.equal(swapped.slots[0].actualExerciseId, replacementExerciseId);
  assert.equal(swapped.slots[0].requiresRecalibration, true);
  assert.equal(swapped.revision, 3);

  const calibratedInput = updateWorkoutSet(swapped, {
    setId: '77777777-7777-4777-8777-777777777771',
    load: 40,
    enteredLoadText: '40',
  });
  const calibrated = confirmWorkoutRecalibration(
    calibratedInput,
    '66666666-6666-4666-8666-666666666666',
  );
  assert.equal(calibrated.slots[0].requiresRecalibration, false);
});

test('late prescription data cannot mutate a frozen draft', () => {
  const draft = fixtureDraft();
  assert.equal(Object.isFrozen(draft.frozenPrescription), true);
  assert.equal(draft.frozenPrescription.revisionId, prescriptionRevisionId);
});

test('invalid exercise identity is rejected rather than skipped', () => {
  const draft = fixtureDraft();
  const invalid = {
    ...draft,
    slots: [{ ...draft.slots[0], prescribedExerciseId: '' }],
  };
  const result = validateWorkoutDraft(invalid);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /exercise identity/i);
});

test('response loss preserves the outbox operation and retry returns one receipt', async () => {
  const saved: ReturnType<typeof fixtureDraft>[] = [];
  const store: WorkoutDraftStore = {
    load: async () => saved.at(-1) ?? null,
    save: async (draft) => { saved.push(draft); },
    remove: async () => undefined,
  };
  let attempts = 0;
  const repository: WorkoutRepository = {
    finalize: async (draft) => {
      attempts += 1;
      if (attempts === 1) throw new Error('network unavailable after request');
      return {
        sessionId: '99999999-9999-4999-8999-999999999999',
        operationId: draft.operationId,
        draftId: draft.draftId,
        revision: draft.revision,
        completionClass: 'partial',
        finalizedAt: '2026-09-10T12:10:00.000Z',
        setCount: 1,
        replayed: true,
      };
    },
  };
  const draft = updateWorkoutSet(fixtureDraft(), {
    setId: '77777777-7777-4777-8777-777777777770',
    reps: 8,
    load: 0,
    logged: true,
  });
  const first = await finalizeWorkout(repository, store, draft, '2026-09-10T12:10:00.000Z');
  assert.equal(first.status, 'pending');
  const pending = saved.at(-1)!;
  assert.equal(pending.operationId, draft.operationId);
  const second = await finalizeWorkout(repository, store, pending, '2026-09-10T12:10:00.000Z');
  assert.equal(second.status, 'replay');
  assert.equal(saved.at(-1)?.lifecycle, 'finalized');
});
