import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkoutDraft, updateWorkoutSet, amendWorkoutExercise } from '../../features/workouts/contracts';
import { draftToExercises } from '../../features/workouts/workoutPresentation';
import { removeDraftWork } from '../../features/workouts/removals';
import { createWorkoutEditingState } from '../../features/workouts/editingState';

function fixture() {
  return createWorkoutDraft({ ownerId: 'owner', programId: 'program', programDayId: 'day', stableDayId: 'stable',
    prescriptionRevisionId: 'revision', workoutName: 'Workout', startedAt: '2026-09-18T10:00:00Z', timezone: 'UTC',
    slots: [{ slotId: 'slot', prescribedExerciseId: 'press', exerciseName: 'Press', order: 1, prescribedSetCount: 3,
      sets: [1, 2, 3].map(order => ({ setId: `set-${order}`, order, plannedRepsMin: 8, plannedRepsMax: 12,
        plannedLoad: null, loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total' })) }] });
}

for (const swapped of [false, true]) test(`typing restored skipped rows after first check and removal, swapped=${swapped}`, () => {
  let d = updateWorkoutSet(fixture(), { setId: 'set-1', load: 30, reps: 8, logged: true });
  d = updateWorkoutSet(d, { setId: 'set-3', outcome: 'skipped' });
  if (swapped) d = amendWorkoutExercise(d, { slotId: 'slot', replacementExerciseId: 'row', amendedAt: '' });
  d = removeDraftWork(d, 'slot', 'set-2');
  d = JSON.parse(JSON.stringify(d));
  for (const raw of ['.', '3.', '3.5', '']) {
    d = updateWorkoutSet(d, { setId: 'set-3', enteredLoadText: raw });
    const visible = draftToExercises(d)[0].sets;
    assert.equal(visible.length, 2);
    assert.equal(visible[1].id, 'set-3');
    assert.equal(visible[1].weight, raw);
    assert.equal(visible[1].outcome, 'not_attempted');
    assert.equal(visible[1].logged, false);
    assert.equal(visible[0].logged, true);
  }
  assert.equal(d.frozenPrescription.slots[0].sets.length, 3);
});

test('late hydration and account changes cannot replace newer typing', () => {
  const state = createWorkoutEditingState(); state.select('owner/day');
  const old = fixture(); assert.equal(state.hydrate('owner/day', old), true);
  state.replace(updateWorkoutSet(state.read()!, { setId: 'set-2', enteredRepsText: '12' }));
  assert.equal(state.hydrate('owner/day', JSON.parse(JSON.stringify(old))), false);
  assert.equal(state.read()!.slots[0].sets[1].enteredRepsText, '12');
  state.select('other/day');
  assert.equal(state.hydrate('owner/day', old), false);
  assert.equal(state.read(), null);
});
