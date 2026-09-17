import assert from 'node:assert/strict';
import test from 'node:test';
import { entryLoadDefaults, loadUnitLabel, exerciseLoadLabel } from '../../features/workouts/loadPresentation';
import { createWorkoutDraft, updateWorkoutSet, workoutFinalizationPayload } from '../../features/workouts/contracts';
import { draftToExercises } from '../../features/workouts/workoutPresentation';
import { projectCompletedOccurrence } from '../../features/workouts/effectiveOccurrence';

test('blank pound-based exercises show LB without generating an actual measurement', () => {
  const draft = createWorkoutDraft({ ownerId: 'a', programId: 'p', programDayId: 'd', stableDayId: 'd', prescriptionRevisionId: 'r', workoutName: 'Test', startedAt: '2026-09-17T12:00:00Z', timezone: 'UTC', slots: [{ slotId: 's', prescribedExerciseId: 'e', order: 1, prescribedSetCount: 1, sets: [{ setId: 'set', order: 1, plannedRepsMin: 8, plannedRepsMax: 12, plannedLoad: null, loadSide: 'unknown', ...entryLoadDefaults('unknown', 'none') }] }] });
  const card = draftToExercises(draft)[0];
  assert.equal(loadUnitLabel(card.sets[0]), 'LB');
  assert.equal(exerciseLoadLabel(card.sets), 'LOAD (LB)');
  assert.equal(card.sets[0].weight, '');
  assert.equal(draft.slots[0].sets[0].actualLoad, null);
  assert.equal(draft.slots[0].sets[0].logged, false);
  const kg = updateWorkoutSet(draft, { setId: 'set', loadUnit: 'kg' });
  const snapshot = workoutFinalizationPayload(kg, '2026-09-17T12:10:00Z').frozenPrescription as typeof draft.frozenPrescription;
  const completed = projectCompletedOccurrence(snapshot, []).exercises[0].sets[0];
  assert.equal(completed.loadUnit, 'kg');
  assert.equal(completed.loadValue, null);
  assert.equal(draft.frozenPrescription.slots[0].sets[0].loadUnit, 'lb');
});
test('legacy blank defaults do not reinterpret historical values or mixed load semantics', () => {
  const blank = { weight: '', logged: false, loadKind: 'unknown', loadUnit: 'none' };
  assert.equal(loadUnitLabel(blank), 'LB');
  assert.equal(loadUnitLabel({ ...blank, weight: '20', logged: true }), 'UNIT?');
  assert.equal(loadUnitLabel({ ...blank, loadUnit: 'kg' }), 'KG');
  assert.equal(loadUnitLabel({ ...blank, loadKind: 'assistance', loadUnit: 'kg' }), '−KG');
  assert.equal(loadUnitLabel({ ...blank, loadKind: 'bodyweight' }), 'BW');
  assert.equal(exerciseLoadLabel([blank, { ...blank, loadUnit: 'kg' }]), 'LOAD');
  assert.deepEqual(entryLoadDefaults('bodyweight', 'kg'), { loadKind: 'bodyweight', loadUnit: 'none' });
  assert.deepEqual(entryLoadDefaults('assistance', 'kg'), { loadKind: 'assistance', loadUnit: 'kg' });
});
