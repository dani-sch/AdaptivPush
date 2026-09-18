import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkoutDraft, updateWorkoutSet, amendWorkoutExercise, validateWorkoutDraft } from '../../features/workouts/contracts';
import { draftToExercises } from '../../features/workouts/workoutPresentation';
import { removeDraftWork } from '../../features/workouts/removals';
import { createWorkoutEditingState } from '../../features/workouts/editingState';
import { addWorkoutExercise, addWorkoutSet, composeProgramSwap, correctionEffectiveSlots } from '../../features/workouts/structure';
import { projectCompletedOccurrence } from '../../features/workouts/effectiveOccurrence';
import { createRecoveryCheckpoint } from '../../features/workouts/recoveryCheckpoint';
import { createModalHandoff } from '../../features/workouts/modalHandoff';
import { verifyCorrectionReceipt } from '../../features/workouts/receiptVerification';
import { createCompletedWorkoutCorrection } from '../../features/workouts/correctionContracts';
import { correctionEntryErrors } from '../../features/workouts/correctionEditor';

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

test('checked-row deletion survives hydration and reports the exact field only on submission', () => {
  let d = updateWorkoutSet(fixture(), { setId: 'set-1', reps: 8, load: 30, logged: true });
  d = updateWorkoutSet(d, { setId: 'set-1', reps: null, enteredRepsText: '' });
  assert.equal(d.slots[0].sets[0].logged, true);
  assert.equal(draftToExercises(d)[0].sets[0].reps, '');
  assert.equal(validateWorkoutDraft(JSON.parse(JSON.stringify(d)), false).ok, true);
  assert.deepEqual(validateWorkoutDraft(d).errors, ['Press, set 1: enter positive whole-number reps.']);
  d = updateWorkoutSet(d, { setId: 'set-1', reps: 10, enteredRepsText: '10' });
  d = updateWorkoutSet(d, { setId: 'set-2', rpe: 99, enteredRpeText: '99' });
  assert.equal(validateWorkoutDraft(d).ok, true); // Unchecked text is never performance.
});

test('authoritative receipt comparison rejects lost structure and mismatched recorded values', () => {
  const d = addWorkoutSet(fixture(), 'slot');
  const set = { actualSetId: 'set-1', prescriptionSlotId: 'slot', prescribedExerciseId: 'press', exerciseId: 'press', order: 1,
    reps: 8, loadValue: 30, loadUnit: 'kg' as const, loadKind: 'external' as const, loadSide: 'external_total' as const, rpe: null, loggedAt: '2026-09-18T10:00:00Z' };
  const request = createCompletedWorkoutCorrection({ ownerId: 'owner', sessionId: 'session', expectedRevision: 0, sets: [set], effectiveSlots: d.slots });
  const receipt = { operationId: request.operationId, sessionId: 'session', revision: 1, setCount: 1, totalVolumeLb: 0, completionClass: 'partial' as const, correctedAt: '', replayed: false };
  const saved = { revision: 1, snapshot: { ...d.frozenPrescription, effectiveSlots: d.slots }, sets: [set] };
  assert.doesNotThrow(() => verifyCorrectionReceipt(request, receipt, saved));
  assert.throws(() => verifyCorrectionReceipt(request, receipt, { ...saved, snapshot: d.frozenPrescription }), /structure/);
  assert.throws(() => verifyCorrectionReceipt(request, receipt, { ...saved, sets: [{ ...set, reps: 9 }] }), /Saved set/);
  const editable = { ...set, prescribed: true, outcome: 'performed' as const, loadText: '30', repsText: '.', rpeText: '' };
  assert.deepEqual(correctionEntryErrors([{ name: 'Press', sets: [editable] }]), ['Press, set 1: enter positive whole-number reps.']);
  assert.deepEqual(correctionEntryErrors([{ name: 'Press', sets: [{ ...editable, outcome: 'not_attempted' }] }]), []);
});

test('combined edits preserve unchecked extras, duplicate catalog additions, and distinct original evidence after reopening', () => {
  let d = updateWorkoutSet(fixture(), { setId: 'set-1', reps: 8, load: 30, logged: true });
  d = amendWorkoutExercise(d, { slotId: 'slot', replacementExerciseId: 'row', amendedAt: '' });
  d = addWorkoutSet(d, 'slot'); const extra = d.slots[0].sets.at(-1)!;
  assert.equal(extra.actualExerciseId, 'row'); assert.equal(extra.logged, false);
  d = updateWorkoutSet(d, { setId: extra.setId, enteredLoadText: '3.', enteredRepsText: '9' });
  const context = { programId: 'program', expectedRevision: 1, expectedRevisionId: 'revision', currentStableDayId: 'stable' };
  d = removeDraftWork(d, 'slot', 'set-2', { ...context, targets: [{ slotId: 'slot', order: 2 }] });
  d.programRemoval = composeProgramSwap(d.programRemoval, context, 'slot', 'row', true);
  assert.equal(d.programRemoval?.targets.length, 1); assert.equal(d.programRemoval?.swaps?.length, 1);
  d = addWorkoutExercise(d, { id: 'press', name: 'Press' });
  d = addWorkoutExercise(d, { id: 'press', name: 'Press' });
  assert.notEqual(d.slots[1].slotId, d.slots[2].slotId);
  assert.equal(d.frozenPrescription.slots.length, 1);
  d = JSON.parse(JSON.stringify(d));
  const snapshot = { ...d.frozenPrescription, effectiveSlots: d.slots, removals: d.removals };
  const actual = { actualSetId: 'set-1', prescriptionSlotId: 'slot', prescribedExerciseId: 'press', exerciseId: 'press',
    order: 1, reps: 8, loadValue: 30, loadUnit: 'lb' as const, loadKind: 'external' as const, loadSide: 'external_total' as const, rpe: null, loggedAt: '2026-09-18T10:00:00Z' };
  const reopened = projectCompletedOccurrence(snapshot, [actual]);
  assert.equal(reopened.exercises.length, 3);
  assert.equal(reopened.exercises[0].sets.at(-1)?.enteredLoadText, '3.');
  assert.equal(reopened.exercises[1].sets[0].prescribed, false);
  assert.equal(reopened.exercises[1].sets[0].outcome, 'not_attempted');
  const edited = reopened.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, loadText: s.enteredLoadText ?? '', repsText: s.enteredRepsText ?? '', rpeText: '' })) }));
  edited[0].exerciseId = 'third';
  const savedStructure = correctionEffectiveSlots(snapshot, edited);
  assert.equal(savedStructure[0].actualExerciseId, 'third');
  assert.equal(savedStructure[0].sets.at(-1)?.enteredLoadText, '3.');
  assert.equal(savedStructure[1].prescribedSetCount, 0);
  const afterSave = projectCompletedOccurrence({ ...snapshot, effectiveSlots: savedStructure }, [actual]);
  assert.equal(afterSave.exercises[0].exerciseId, 'third');
  assert.equal(afterSave.exercises.length, 3);
});

test('modal handoff executes once after dismissal, cancels on unmount, and rejects repeated presses', () => {
  const gate = createModalHandoff(); let calls = 0;
  assert.equal(gate.enqueue(() => calls++), true);
  assert.equal(gate.enqueue(() => calls++), false); assert.equal(calls, 0);
  gate.dismiss(); gate.dismiss(); assert.equal(calls, 1);
  gate.enqueue(() => calls++); gate.cancel(); gate.dismiss(); assert.equal(calls, 1);
});

test('swaps and removals of new exercises compose without forged program-slot lineage', () => {
  let d = addWorkoutExercise(fixture(), { id: 'press', name: 'Press' });
  const slot = d.slots.at(-1)!;
  const context = { programId: 'program', expectedRevision: 1, expectedRevisionId: 'revision', currentStableDayId: 'stable' };
  d.programRemoval = composeProgramSwap(undefined, context, slot.slotId, 'row', true, true);
  assert.deepEqual(d.programRemoval?.additions, [{ slotId: slot.slotId, exerciseId: 'row', setCount: 1 }]);
  d.programRemoval = composeProgramSwap(d.programRemoval, context, slot.slotId, 'press', false, true);
  assert.equal(d.programRemoval?.additions?.[0].exerciseId, 'row'); // Workout-only swap leaves the future intention alone.
  d = removeDraftWork(d, slot.slotId);
  assert.equal(d.programRemoval?.additions?.length, 0);
  assert.equal(d.slots.length, 1);
  d = removeDraftWork(d, 'slot');
  assert.equal(draftToExercises(d).length, 0);
  d = addWorkoutExercise(d, { id: 'row', name: 'Row' });
  assert.equal(draftToExercises(d).length, 1);
  assert.equal(d.frozenPrescription.slots.length, 1);
});

test('recovery checkpoint retains exact strings once, excluding other accounts and auth', async () => {
  const key = '@adaptivpush/workout-drafts/v2/owner/day';
  const db = new Map([[key, '{"ownerId":"owner", "raw":"3."}'], ['@adaptivpush/workout-swaps/v1/owner/draft', '{"pending":"exact"}'],
    ['@adaptivpush/workout-drafts/v2/other/day', 'private'], ['sb-auth-token', 'secret']]);
  const checkpoint = createRecoveryCheckpoint({ getAllKeys: async () => [...db.keys()], getItem: async k => db.get(k) ?? null,
    multiGet: async keys => keys.map(k => [k, db.get(k) ?? null] as const), setItem: async (k,v) => { db.set(k,v); } });
  await Promise.all([checkpoint('owner'), checkpoint('owner')]);
  const backup = db.get('@adaptivpush/workout-recovery/2026-09-18/owner')!;
  assert.equal(JSON.parse(backup).records[0][1], db.get(key));
  assert.equal(backup.includes('private'), false); assert.equal(backup.includes('secret'), false);
  db.set(key, 'new edits'); await checkpoint('owner');
  assert.equal(db.get('@adaptivpush/workout-recovery/2026-09-18/owner'), backup);
});
