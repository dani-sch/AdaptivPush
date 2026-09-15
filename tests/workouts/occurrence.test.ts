import assert from 'node:assert/strict';
import test from 'node:test';
import { amendWorkoutExercise, createWorkoutDraft, updateWorkoutSet, validateWorkoutDraft, type WorkoutDraft } from '../../features/workouts/contracts';
import { createCompletedNavigation, occurrenceAction, occurrenceState, projectCompletedOccurrence } from '../../features/workouts/effectiveOccurrence';
import { draftToExercises } from '../../features/workouts/workoutPresentation';
import { externalActualSets } from '../../features/workouts/actualLoads';
import { workoutFinalizationPayload } from '../../features/workouts/contracts';
import { computeProgression } from '../../utils/progressionEngine';
import { loadCompletedWorkout } from '../../features/workouts/occurrenceRepository';
import { correctCompletedWorkout } from '../../features/workouts/correctionCommands';
import { createCompletedWorkoutCorrection } from '../../features/workouts/correctionContracts';
import type { SupabaseClient } from '@supabase/supabase-js';

function draft() {
  return createWorkoutDraft({ ownerId: 'owner', programId: 'program', programDayId: 'day', stableDayId: 'stable-day',
    prescriptionRevisionId: 'revision', workoutName: 'Upper A', startedAt: '2026-09-15T12:00:00Z', timezone: 'UTC',
    slots: Array.from({ length: 5 }, (_, i) => ({ slotId: `slot-${i}`, prescribedExerciseId: `exercise-${i}`,
      exerciseName: `Exercise ${i}`, order: i + 1, prescribedSetCount: 4,
      sets: Array.from({ length: 4 }, (_, j) => ({ setId: `set-${i}-${j}`, order: j + 1,
        plannedRepsMin: 8, plannedRepsMax: 12, plannedLoad: 40, loadKind: 'external' as const,
        loadUnit: 'lb' as const, loadSide: 'external_total' as const })),
    })),
  });
}
function actuals(d: WorkoutDraft) {
  return d.slots.flatMap(slot => slot.sets.filter(s => s.logged).map(s => ({ actualSetId: s.setId,
    prescriptionSlotId: slot.slotId, prescribedExerciseId: slot.prescribedExerciseId, exerciseId: s.actualExerciseId,
    order: s.order, reps: s.actualReps!, loadValue: s.actualLoad, loadUnit: s.loadUnit, loadKind: s.loadKind,
    loadSide: s.loadSide, rpe: s.actualRpe, loggedAt: s.loggedAt ?? '2026-09-15T12:10:00Z' })));
}
test('History admits one navigation only after dismissal and resets for a new detail', () => {
  const gate = createCompletedNavigation();
  assert.equal(gate.request('session'), true);
  assert.equal(gate.request('session'), false);
  assert.equal(gate.pending(), true);
  assert.equal(gate.dismiss(), 'session');
  assert.equal(gate.dismiss(), null);
  assert.equal(gate.request('session'), false);
  gate.reset();
  assert.equal(gate.pending(), false);
  assert.equal(gate.request('next-session'), true);
  assert.equal(gate.dismiss(), 'next-session');
});
test('blank sets can be skipped and undone without measurements; performed sets still require positive reps', () => {
  const skipped = updateWorkoutSet(draft(), { setId: 'set-0-0', outcome: 'skipped' });
  assert.equal(validateWorkoutDraft(skipped).ok, true);
  assert.equal(skipped.slots[0].sets[0].actualReps, null);
  assert.equal(skipped.slots[0].sets[0].logged, false);
  assert.equal(updateWorkoutSet(skipped, { setId: 'set-0-0', outcome: 'not_attempted' }).slots[0].sets[0].outcome, 'not_attempted');
  assert.throws(() => updateWorkoutSet(skipped, { setId: 'set-0-0', logged: true }), /positive/);
});
test('an entire exercise can be skipped, with zero PR candidates', () => {
  let d = draft();
  for (const s of d.slots[0].sets) d = updateWorkoutSet(d, { setId: s.setId, outcome: 'skipped' });
  assert.ok(d.slots[0].sets.every(s => s.outcome === 'skipped'));
  assert.deepEqual(externalActualSets(d, 'exercise-0'), []);
});
test('second swap preserves the stable slot and intermediate performed exercise identity', () => {
  const first = amendWorkoutExercise(draft(), { slotId: 'slot-0', replacementExerciseId: 'decline', replacementName: 'Decline', amendedAt: '' });
  const performed = updateWorkoutSet(first, { setId: 'set-0-0', reps: 8, load: 50, logged: true });
  const second = amendWorkoutExercise(performed, { slotId: 'slot-0', replacementExerciseId: 'incline', replacementName: 'Incline', amendedAt: '' });
  assert.equal(second.slots[0].slotId, 'slot-0');
  assert.equal(second.slots[0].sets[0].actualExerciseId, 'decline');
  assert.equal(second.slots[0].sets[1].actualExerciseId, 'incline');
  assert.equal(draftToExercises(second)[0].sets[0].exerciseName, 'Decline');
  assert.equal(second.frozenPrescription.slots[0].prescribedExerciseId, 'exercise-0');
});
test('durable snapshot reconstructs five exercises and twenty prescribed sets with one performed set', () => {
  let d = updateWorkoutSet(draft(), { setId: 'set-0-0', reps: 8, load: 40, logged: true });
  d = updateWorkoutSet(d, { setId: 'set-0-1', outcome: 'skipped' });
  d = amendWorkoutExercise(d, { slotId: 'slot-0', replacementExerciseId: 'incline', replacementName: 'Incline', amendedAt: '' });
  const payload = JSON.parse(JSON.stringify(workoutFinalizationPayload(d, '2026-09-15T12:30:00Z')));
  const projected = projectCompletedOccurrence(payload.frozenPrescription, actuals(d));
  assert.equal(projected.exercises.length, 5);
  assert.equal(projected.exercises.flatMap(e => e.sets).length, 20);
  assert.equal(projected.exercises[0].name, 'Incline');
  assert.deepEqual(projected.exercises[0].sets.map(s => s.outcome), ['performed', 'skipped', 'not_attempted', 'not_attempted']);
  assert.equal(projected.exercises[0].sets[0].exerciseId, 'exercise-0');
});
test('correction outcomes override frozen skipped state, actual rows override snapshot measurements', () => {
  const d = updateWorkoutSet(draft(), { setId: 'set-0-0', outcome: 'skipped' });
  const snapshot = { ...d.frozenPrescription, effectiveSlots: d.slots,
    setOutcomes: [{ setId: 'set-0-0', slotId: 'slot-0', order: 1, outcome: 'not_attempted' as const }] };
  assert.equal(projectCompletedOccurrence(snapshot, []).exercises[0].sets[0].outcome, 'not_attempted');
  const performed = updateWorkoutSet(draft(), { setId: 'set-0-0', reps: 12, load: 55, logged: true });
  const result = projectCompletedOccurrence(snapshot, actuals(performed));
  assert.equal(result.exercises[0].sets[0].loadValue, 55);
  assert.equal(result.exercises[0].sets[0].outcome, 'performed');
});
test('legitimate extra sets appear inside their exercise and legacy context is not invented', () => {
  const performed = updateWorkoutSet(draft(), { setId: 'set-0-0', reps: 8, load: 40, logged: true });
  const extra = { ...actuals(performed)[0], actualSetId: 'extra', order: 5 };
  const result = projectCompletedOccurrence(performed.frozenPrescription, [...actuals(performed), extra]);
  assert.equal(result.exercises[0].sets.length, 5);
  assert.equal(result.exercises[0].sets[4].prescribed, false);
  const legacy = projectCompletedOccurrence(null, [extra]);
  assert.equal(legacy.exercises[0].sets.length, 1);
  assert.equal(legacy.missingPrescription, true);
});
test('Home lifecycle actions distinguish unstarted, active, submitted, and finalized partial or complete', () => {
  assert.equal(occurrenceAction(occurrenceState(null)), 'Start Workout');
  assert.equal(occurrenceAction(occurrenceState(draft())), 'Continue Workout');
  assert.equal(occurrenceAction(occurrenceState({ ...draft(), finalizationEndedAt: 'now' })), 'Retry Sync');
  for (const completionClass of ['partial', 'complete', 'reduced'] as const) {
    const d: WorkoutDraft = { ...draft(), lifecycle: 'finalized', finalizedReceipt: {
      sessionId: 'session', operationId: 'op', draftId: 'draft', revision: 1, completionClass, finalizedAt: 'now', setCount: 1, replayed: false,
    } };
    assert.equal(occurrenceAction(occurrenceState(d)), 'View or Update Workout');
    assert.equal(draftToExercises(d)[0].readOnly, true);
    assert.throws(() => updateWorkoutSet(d, { setId: 'set-0-0', reps: 10 }), /submitted/);
  }
  assert.equal(occurrenceAction('finalized', false), 'View Workout');
});
test('one successful set out of four cannot increase load, even with high readiness', () => {
  const result = computeProgression({ pdeId: 'slot', exerciseName: 'Press', currentWeightLb: 50, currentRepMin: 8,
    currentRepMax: 12, currentTargetRPE: 8, experienceLevel: 'beginner', readinessScore: 10,
    requiredSetCount: 4, completionClass: 'partial', lastSessionSets: [{ setNumber: 1, weightLb: 50, reps: 12, rpe: 6 }] });
  assert.equal(result.action, 'hold');
  assert.equal(result.suggestedWeightLb, 50);
});
function readClient(options: { missingSession?: boolean; missingColumn?: boolean; missingRpc?: boolean; error?: object } = {}) {
  const query = (table: string) => {
    const response = { data: table === 'workout_sessions' ? options.missingSession ? null : {
      id: 'session', user_id: 'owner', lifecycle: 'finalized', correction_revision: options.missingColumn ? undefined : 0,
      prescription_snapshot: draft().frozenPrescription, ended_at: '2026-09-15T12:30:00Z',
    } : [], error: options.error ?? null };
    const chain = { select: () => chain, eq: () => chain, order: () => Promise.resolve(response), maybeSingle: () => Promise.resolve(response) };
    return chain;
  };
  return { from: query, rpc: async () => options.missingRpc ? { error: { code: 'PGRST202', message: 'function missing from schema cache' } } : { data: 2, error: null } } as unknown as SupabaseClient;
}
test('missing hosted correction RPC or column still returns a full read-only workout', async () => {
  for (const option of [{ missingRpc: true }, { missingColumn: true }]) {
    const loaded = await loadCompletedWorkout(readClient(option), 'owner', 'session');
    assert.equal(loaded.canCorrect, false);
    assert.equal(projectCompletedOccurrence(loaded.snapshot, loaded.sets).exercises.length, 5);
  }
});
test('ownership/not-found stays distinct from server read errors', async () => {
  await assert.rejects(loadCompletedWorkout(readClient({ missingSession: true }), 'owner', 'session'), /unavailable for this account/);
  const error = { code: '42703', message: 'missing column' };
  await assert.rejects(loadCompletedWorkout(readClient({ error }), 'owner', 'session'), e => e === error);
});
test('missing correction RPC returns an honest unavailable result and retains exact retry data', async () => {
  const request = createCompletedWorkoutCorrection({ ownerId: 'owner', sessionId: 'session', expectedRevision: 0, sets: [] });
  let saved: typeof request | null = null;
  const outcome = await correctCompletedWorkout({ correct: async () => { throw { code: 'PGRST202', message: 'function missing from schema cache' }; } },
    { load: async () => saved, save: async r => { saved = r; }, remove: async () => { saved = null; } }, request);
  assert.equal(outcome.status, 'unavailable');
  assert.ok('message' in outcome && outcome.message.includes('can be viewed'));
  assert.deepEqual(saved, request);
});
