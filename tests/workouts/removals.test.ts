import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkoutDraft, updateWorkoutSet, classifyWorkoutCompletion, validateWorkoutDraft, workoutFinalizationPayload } from '../../features/workouts/contracts';
import { removeDraftWork, addProgramRemoval } from '../../features/workouts/removals';
import { draftToExercises } from '../../features/workouts/workoutPresentation';
import { projectCompletedOccurrence } from '../../features/workouts/effectiveOccurrence';
import { externalActualSets } from '../../features/workouts/actualLoads';

function fixture() {
  return createWorkoutDraft({ ownerId: 'owner', programId: 'program', programDayId: 'day', stableDayId: 'stable-day', prescriptionRevisionId: 'revision',
    workoutName: 'Workout', startedAt: '2026-09-17T12:00:00Z', timezone: 'UTC', slots: [{
      slotId: 'slot', prescribedExerciseId: 'exercise', exerciseName: 'Press', order: 1, prescribedSetCount: 3,
      sets: [1, 2, 3].map(order => ({ setId: `set-${order}`, order, plannedRepsMin: 8, plannedRepsMax: 12,
        plannedLoad: 50, loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total' })),
    }] });
}
test('typing never logs a set; checking and later editing preserve explicit completion', () => {
  const typed = updateWorkoutSet(fixture(), { setId: 'set-1', reps: 8, load: 50 });
  assert.equal(typed.slots[0].sets[0].logged, false);
  const checked = updateWorkoutSet(typed, { setId: 'set-1', logged: true });
  const edited = updateWorkoutSet(checked, { setId: 'set-1', reps: null });
  assert.equal(edited.slots[0].sets[0].logged, true);
  assert.equal(validateWorkoutDraft(edited).ok, false);
});
test('removal keeps frozen counts and stable identities while visible numbering can close gaps', () => {
  const original = fixture();
  const removed = removeDraftWork(original, 'slot', 'set-2');
  assert.deepEqual(removed.frozenPrescription, original.frozenPrescription);
  assert.deepEqual(draftToExercises(removed)[0].sets.map(s => s.id), ['set-1', 'set-3']);
  assert.equal(removed.slots[0].sets[2].order, 3);
  assert.equal(validateWorkoutDraft(removed).ok, true);
  assert.equal(removed.programRemoval, undefined);
});
test('recorded removal erases current result, not original prescription; no synthetic performance', () => {
  const logged = updateWorkoutSet(fixture(), { setId: 'set-2', logged: true, reps: 8, load: 50 });
  const removed = removeDraftWork(logged, 'slot', 'set-2');
  assert.equal(removed.slots[0].sets[1].actualReps, null);
  assert.deepEqual(externalActualSets(removed, 'exercise'), []);
  assert.equal(classifyWorkoutCompletion(removed), 'abandoned');
  assert.throws(() => updateWorkoutSet(removed, { setId: 'set-2', logged: true }), /removed/);
});
test('removals survive serialization, finalization snapshot and completed projection', () => {
  const removed = JSON.parse(JSON.stringify(removeDraftWork(fixture(), 'slot', 'set-2')));
  const payload = workoutFinalizationPayload(removed, '2026-09-17T12:30:00Z');
  const snapshot = payload.frozenPrescription as typeof removed.frozenPrescription;
  assert.deepEqual(projectCompletedOccurrence(snapshot, []).exercises[0].sets.map(s => s.actualSetId), ['set-1', 'set-3']);
  assert.deepEqual(draftToExercises(removed)[0].sets.map(s => s.id), ['set-1', 'set-3']);
});
test('removing all requirements leaves an empty view with abandoned or partial evidence', () => {
  let draft = updateWorkoutSet(fixture(), { setId: 'set-1', reps: 8, load: 50, logged: true });
  draft = removeDraftWork(draft, 'slot', 'set-2');
  draft = removeDraftWork(draft, 'slot', 'set-3');
  assert.equal(classifyWorkoutCompletion(draft), 'partial');
  draft = removeDraftWork(draft, 'slot');
  assert.deepEqual(draftToExercises(draft), []);
  assert.equal(validateWorkoutDraft(draft).ok, true);
  assert.equal(classifyWorkoutCompletion(draft), 'abandoned');
});
test('program intents are immutable, deduplicated and pinned to one expected revision', () => {
  const context = { programId: 'program', expectedRevision: 2, expectedRevisionId: 'r2', currentStableDayId: 'day' };
  const intent = addProgramRemoval(undefined, context, { slotId: 'slot', order: 2 });
  assert.equal(addProgramRemoval(intent, context, { slotId: 'slot', order: 2 }).targets.length, 1);
  assert.throws(() => addProgramRemoval(intent, { ...context, expectedRevisionId: 'r3' }, { slotId: 'slot', order: 1 }), /changed/);
  const draft = removeDraftWork(fixture(), 'slot', 'set-2', intent);
  assert.deepEqual(JSON.parse(JSON.stringify(draft)).programRemoval, intent);
  assert.throws(() => removeDraftWork({ ...draft, finalizationEndedAt: '2026-09-17T12:30:00Z' }, 'slot'), /synchronization/);
});
test('shared presentation retains separate load kind, mixed units and bodyweight', () => {
  let draft = updateWorkoutSet(fixture(), { setId: 'set-1', loadKind: 'assistance', loadUnit: 'kg', load: 15 });
  draft = updateWorkoutSet(draft, { setId: 'set-2', loadKind: 'bodyweight', reps: 8 });
  draft = updateWorkoutSet(draft, { setId: 'set-2', logged: true });
  const sets = draftToExercises(draft)[0].sets;
  assert.deepEqual(sets.map(s => [s.loadKind, s.loadUnit]), [['assistance', 'kg'], ['bodyweight', 'none'], ['external', 'lb']]);
  assert.equal(draft.slots[0].sets[1].actualLoad, null);
});
