import assert from 'node:assert/strict';
import test from 'node:test';

import {
  amendWorkoutExercise,
  applyWorkoutRecalibrationLoad,
  classifyWorkoutCompletion,
  confirmWorkoutRecalibration,
  createWorkoutDraft,
  updateWorkoutSet,
  validateWorkoutDraft,
} from '../../features/workouts/contracts';
import { finalizeWorkout } from '../../features/workouts/commands';
import type { WorkoutDraftStore } from '../../features/workouts/draftStore';
import type { WorkoutRepository } from '../../features/workouts/repository';
import { RolloutDisabledError } from '../../features/kernel/rollout';
import { externalActualSets } from '../../features/workouts/actualLoads';

const ownerId = '11111111-1111-4111-8111-111111111111';
const programDayId = '22222222-2222-4222-8222-222222222222';
const prescriptionRevisionId = '33333333-3333-4333-8333-333333333333';
const prescribedExerciseId = '44444444-4444-4444-8444-444444444444';
const replacementExerciseId = '55555555-5555-4555-8555-555555555555';

function fixtureDraft() {
  return createWorkoutDraft({
    ownerId,
    programId: '12121212-1212-4121-8121-121212121212',
    programDayId,
    stableDayId: '13131313-1313-4131-8131-131313131313',
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
  assert.equal(swapped.slots[0].sets[0].setId, logged.slots[0].sets[0].setId);
  assert.equal(swapped.slots[0].sets[0].actualLoad, 100);
  assert.equal(swapped.slots[0].actualExerciseId, replacementExerciseId);
  assert.equal(swapped.slots[0].requiresRecalibration, true);
  assert.equal(swapped.slots[0].sets[1].enteredLoadText, '0');
  assert.equal(swapped.slots[0].sets[1].actualLoad, null);
  assert.equal(swapped.slots[0].sets[1].loadKind, 'unknown');
  assert.equal(swapped.revision, 3);

  const calibrated = applyWorkoutRecalibrationLoad(
    swapped,
    '66666666-6666-4666-8666-666666666666',
    40,
  );
  assert.equal(calibrated.slots[0].requiresRecalibration, false);
  assert.equal(calibrated.slots[0].sets[0].actualLoad, 100);
  assert.deepEqual(calibrated.slots[0].sets.slice(1).map((set) => set.actualLoad), [40, 40, 40]);
});

test('zero-set swap retains entered values and copies load only after explicit confirmation', () => {
  const typed = updateWorkoutSet(
    updateWorkoutSet(fixtureDraft(), {
      setId: '77777777-7777-4777-8777-777777777770',
      reps: 9,
      enteredRepsText: '9',
      rpe: 8,
      enteredRpeText: '8',
    }),
    {
      setId: '77777777-7777-4777-8777-777777777770',
      load: 25,
      enteredLoadText: '25',
    },
  );
  const swapped = amendWorkoutExercise(typed, {
    slotId: '66666666-6666-4666-8666-666666666666',
    replacementExerciseId,
    amendedAt: '2026-09-10T12:06:00.000Z',
  });

  assert.equal(swapped.slots[0].sets[0].enteredLoadText, '25');
  assert.equal(swapped.slots[0].sets[0].enteredRepsText, '9');
  assert.equal(swapped.slots[0].sets[0].enteredRpeText, '8');
  assert.equal(swapped.slots[0].sets[0].actualLoad, null);
  assert.equal(swapped.slots[0].sets[0].actualRpe, 8);
  assert.throws(
    () => confirmWorkoutRecalibration(swapped, '66666666-6666-4666-8666-666666666666'),
    /every remaining set/i,
  );

  const copied = applyWorkoutRecalibrationLoad(
    swapped,
    '66666666-6666-4666-8666-666666666666',
    30,
  );
  assert.equal(copied.slots[0].requiresRecalibration, false);
  assert.deepEqual(copied.slots[0].sets.map((set) => set.actualLoad), [30, 30, 30, 30]);
  assert.deepEqual(copied.slots[0].sets.map((set) => set.enteredLoadText), ['30', '30', '30', '30']);
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

test('an empty workout draft is rejected rather than finalized as abandoned', () => {
  const result = validateWorkoutDraft({ ...fixtureDraft(), slots: [] });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /at least one exercise slot/i);
});

test('response loss preserves the outbox operation and retry returns one receipt', async () => {
  const saved: ReturnType<typeof fixtureDraft>[] = [];
  const store: WorkoutDraftStore = {
    load: async () => saved.at(-1) ?? null,
    loadMatching: async () => saved.at(-1) ?? null,
    save: async (draft) => { saved.push(draft); },
    remove: async () => undefined,
  };
  let attempts = 0;
  const submittedEnds: string[] = [];
  const submittedPayloads: string[] = [];
  const repository: WorkoutRepository = {
    finalize: async (draft, endedAt) => {
      submittedEnds.push(endedAt);
      submittedPayloads.push(JSON.stringify({ operation: draft.operationId, revision: draft.revision, slots: draft.slots, endedAt }));
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
  assert.throws(() => updateWorkoutSet(pending, { setId: pending.slots[0].sets[0].setId, reps: 12 }), /submitted/i);
  // Retry from the mounted screen's stale draft, five minutes later.
  const second = await finalizeWorkout(repository, store, draft, '2026-09-10T12:15:00.000Z');
  assert.deepEqual(submittedEnds, ['2026-09-10T12:10:00.000Z', '2026-09-10T12:10:00.000Z']);
  assert.equal(submittedPayloads[0], submittedPayloads[1]);
  assert.equal(second.status, 'replay');
  assert.equal(saved.at(-1)?.lifecycle, 'finalized');
});

test('disabled finalization leaves the draft editable without a pending submission', async () => {
  const draft = updateWorkoutSet(fixtureDraft(), { setId: fixtureDraft().slots[0].sets[0].setId, reps: 8, load: 0, logged: true });
  let stored = draft;
  const store: WorkoutDraftStore = { load: async () => stored, loadMatching: async () => stored,
    save: async (value) => { stored = value; }, remove: async () => undefined };
  const outcome = await finalizeWorkout({ finalize: async () => { throw new RolloutDisabledError('Writer disabled'); } },
    store, draft, '2026-09-10T12:10:00.000Z');
  assert.equal(outcome.status, 'unavailable');
  assert.deepEqual(stored, draft);
  assert.doesNotThrow(() => updateWorkoutSet(stored, { setId: stored.slots[0].sets[1].setId, reps: 9 }));
});

test('missing RPC rejects accurately and preserves editing unless an earlier submission is uncertain', async () => {
  for (const priorPending of [false, true]) {
    const draft = updateWorkoutSet(fixtureDraft(), { setId: fixtureDraft().slots[0].sets[0].setId, reps: 8, load: 0, logged: true });
    if (priorPending) { draft.finalizationEndedAt = '2026-09-10T12:10:00.000Z'; draft.lifecycle = 'failed'; }
    let stored = draft;
    const store: WorkoutDraftStore = { load: async () => stored, loadMatching: async () => stored,
      save: async (value) => { stored = value; }, remove: async () => undefined };
    const outcome = await finalizeWorkout({ finalize: async () => { throw { code: 'PGRST202' }; } }, store, draft, '2026-09-10T12:12:00.000Z');
    assert.equal(outcome.status, 'unavailable');
    if (outcome.status === 'unavailable') assert.match(outcome.message, /service.*update/i);
    assert.equal(stored.finalizationEndedAt, draft.finalizationEndedAt);
    if (priorPending) assert.throws(() => updateWorkoutSet(stored, { setId: stored.slots[0].sets[1].setId, reps: 9 }), /submitted/i);
    else assert.doesNotThrow(() => updateWorkoutSet(stored, { setId: stored.slots[0].sets[1].setId, reps: 9 }));
  }
});

test('explicit zero changes unknown load to external but preserves assistance and bodyweight kinds', () => {
  for (const kind of ['unknown', 'external', 'assistance', 'bodyweight'] as const) {
    const draft = fixtureDraft();
    draft.slots[0].sets[0].loadKind = kind;
    const updated = updateWorkoutSet(draft, { setId: draft.slots[0].sets[0].setId, load: 0 });
    assert.equal(updated.slots[0].sets[0].loadKind, kind === 'unknown' ? 'external' : kind);
    assert.equal(updated.slots[0].sets[0].actualLoad, 0);
  }
});

test('legacy PR candidates use pounds and actual exercise attribution, excluding assistance', () => {
  const draft = fixtureDraft();
  const set = draft.slots[0].sets[0];
  Object.assign(set, { logged: true, actualExerciseId: prescribedExerciseId, actualReps: 8, actualLoad: 25, loadKind: 'external', loadUnit: 'kg' });
  assert.deepEqual(externalActualSets(draft, prescribedExerciseId), [{ weightLb: 25 * 2.2046226218, reps: 8 }]);
  assert.deepEqual(externalActualSets(draft, replacementExerciseId), []);
  set.loadKind = 'assistance';
  assert.deepEqual(externalActualSets(draft, prescribedExerciseId), []);
});
