import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addAdHocExercises, appendAdHocSet, createAdHocFlow, createAdHocSet, freezeAdHocDraft,
  removeAdHocExercise, removeAdHocSet, verifyAdHocHistory,
  type AdHocDraft, type AdHocGateway, type AdHocPayload,
} from '../../features/workouts/adHocFlow';

const owner = 'a1000000-0000-4000-8000-000000000001';
const other = 'a1000000-0000-4000-8000-000000000002';
const exercise = 'a2000000-0000-4000-8000-000000000001';
let counter = 0;
const id = () => `a5000000-0000-4000-8000-${(++counter).toString().padStart(12, '0')}`;
const startedAt = '2026-09-27T11:00:00.000Z';
const endedAt = '2026-09-27T11:30:00.000Z';

function fixture() {
  counter = 0;
  const values = new Map<string, string>();
  const calls: AdHocPayload[] = [];
  let responseLost = false;
  let corrupt = false;
  const gateway: AdHocGateway = {
    async finalize(payload) {
      calls.push(structuredClone(payload));
      if (responseLost) { responseLost = false; throw new Error('response lost'); }
      return { sessionId: 'a6000000-0000-4000-8000-000000000001', operationId: payload.operationId,
        draftId: payload.draftId, revision: 1, completionClass: 'complete',
        setCount: payload.sets.length, replayed: calls.length > 1 };
    },
    async session(userId, operationId) {
      const payload = calls.at(-1)!;
      return { id: 'a6000000-0000-4000-8000-000000000001', user_id: userId, operation_id: operationId,
        draft_id: payload.draftId, program_day_id: corrupt ? 'a3000000-0000-4000-8000-000000000001' : null,
        program_revision_id: null, workout_name: payload.workoutName,
        started_at: '2026-09-27T11:00:00+00:00', ended_at: '2026-09-27T11:30:00+00:00',
        duration_min: payload.durationMin,
        schema_version: 2, revision: 1, lifecycle: 'finalized', completion_class: 'complete' };
    },
    async sets(sessionId) {
      return calls.at(-1)!.sets.map((set) => ({
        session_id: sessionId, actual_set_id: set.setId, exercise_id: set.exerciseId,
        set_number: set.order, order_index: set.order, reps: set.reps,
        load_value: set.loadValue, load_kind: set.loadKind, load_unit: set.loadUnit,
        load_side: set.loadSide, rpe: set.rpe, logged_at: set.loggedAt,
      }));
    },
  };
  const storage = {
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) { values.set(key, value); },
    async removeItem(key: string) { values.delete(key); },
  };
  let ticks = 0;
  const service = createAdHocFlow(storage, gateway, id, () => ticks++ === 0 ? startedAt : endedAt);
  return { service, storage, values, calls, setResponseLost: () => { responseLost = true; },
    setCorrupt: () => { corrupt = true; }, gateway };
}

async function enteredDraft(service: ReturnType<typeof createAdHocFlow>): Promise<AdHocDraft> {
  const draft = await service.start(owner);
  const set = createAdHocSet(exercise, 'Sequence press', 1, id);
  const entered = { ...draft, workoutName: ' Walk ', sets: [{ ...set, reps: '8', loadKind: 'external' as const,
    loadValue: '22.5', loadUnit: 'kg' as const, rpe: '7.5' }] };
  await service.save(entered);
  return entered;
}

test('draft restores under owner and freezes exact history-only payload before RPC', async () => {
  const { service, values, calls } = fixture();
  await enteredDraft(service);
  assert.equal((await service.load(owner)).draft?.sets[0].reps, '8');
  assert.equal((await service.load(other)).draft, null);
  assert.equal(await service.finish(owner), 'a6000000-0000-4000-8000-000000000001');
  assert.equal(values.size, 0);
  assert.deepEqual(Object.keys(calls[0]).sort(), [
    'draftId', 'durationMin', 'endedAt', 'operationId', 'schemaVersion', 'sets', 'startedAt', 'workoutName',
  ]);
  assert.equal(calls[0].sets[0].loadValue, 22.5);
  assert.equal(calls[0].sets[0].exerciseId, exercise);
  assert.equal(calls[0].sets[0].setId.startsWith('a5000000'), true);
  assert.equal(calls[0].sets[0].rpe, 7.5);
});

test('response loss preserves frozen request across restart and rejects edits until exact replay verifies', async () => {
  const { service, storage, calls, setResponseLost, gateway } = fixture();
  const draft = await enteredDraft(service);
  setResponseLost();
  await assert.rejects(service.finish(owner), /response lost/);
  assert.equal((await service.load(owner)).pending, true);
  await assert.rejects(service.save({ ...draft, workoutName: 'Changed' }), /cannot be edited/);
  const restarted = createAdHocFlow(storage, gateway, () => { throw new Error('must not generate another ID'); }, () => endedAt);
  assert.equal(await restarted.finish(owner), 'a6000000-0000-4000-8000-000000000001');
  assert.deepEqual(calls[0], calls[1]);
  assert.equal((await restarted.load(owner)).draft, null);
});

test('stored program linkage or mismatched sets never clears exact pending recovery', async () => {
  const { service, calls, setCorrupt } = fixture();
  await enteredDraft(service);
  setCorrupt();
  await assert.rejects(service.finish(owner), /Stored ad-hoc session/);
  assert.equal((await service.load(owner)).pending, true);
  assert.equal(calls.length, 1);
});

test('storage failure prevents RPC, and corrupted frozen recovery is never replaced', async () => {
  const { service, storage, values, calls, gateway } = fixture();
  await enteredDraft(service);
  const failedStorage = {
    ...storage,
    async setItem(_key: string, _value: string) { throw new Error('storage unavailable'); },
  };
  const blocked = createAdHocFlow(failedStorage, gateway, id, () => endedAt);
  await assert.rejects(blocked.finish(owner), /storage unavailable/);
  assert.equal(calls.length, 0);
  const key = [...values.keys()][0];
  const record = JSON.parse(values.get(key)!) as {
    draft: AdHocDraft;
    pending: AdHocPayload | null;
  };
  record.pending = freezeAdHocDraft(record.draft, id(), endedAt);
  record.pending.workoutName = 'Tampered';
  values.set(key, JSON.stringify(record));
  await assert.rejects(service.load(owner), /Frozen ad-hoc request differs/);
  assert.equal(values.has(key), true);
});

test('validation refuses empty, duplicate, malformed and non-actual sets without freezing', async () => {
  const { service, calls } = fixture();
  const draft = await service.start(owner);
  await assert.rejects(service.finish(owner), /at least one actual set/);
  const first = createAdHocSet(exercise, 'Press', 1, id);
  const unfinished = { ...draft, workoutName: 'Press', sets: [first] };
  await service.save(unfinished);
  await assert.rejects(service.finish(owner), /Reps/);
  assert.equal((await service.load(owner)).pending, false);
  assert.equal(calls.length, 0);
  assert.throws(() => freezeAdHocDraft({ ...unfinished, sets: [
    { ...first, reps: '8' }, { ...first, reps: '9' },
  ] }, id(), endedAt), /identity/);
  assert.throws(() => freezeAdHocDraft({ ...unfinished, sets: [
    { ...first, reps: '8', loadKind: 'external', loadUnit: 'none', loadValue: '10' },
  ] }, id(), endedAt), /needs a value in lb or kg/);
  assert.throws(() => freezeAdHocDraft({ ...unfinished, sets: [
    { ...first, reps: '8', rpe: '11' },
  ] }, id(), endedAt), /RPE/);
  assert.throws(() => freezeAdHocDraft(unfinished, id(), '2026-09-27T10:00:00.000Z'), /finish time/);
});

test('verification checks set identities and actual values, not only receipt counts', async () => {
  const draft: AdHocDraft = { ownerId: owner, draftId: id(), workoutName: 'Walk', startedAt,
    sets: [{ ...createAdHocSet(exercise, 'Press', 1, id, 'Bodyweight'), reps: '8' }] };
  const payload = freezeAdHocDraft(draft, id(), endedAt);
  const receipt = { sessionId: id(), operationId: payload.operationId, draftId: payload.draftId,
    revision: 1, completionClass: 'complete', setCount: 1, replayed: false };
  const session = { id: receipt.sessionId, user_id: owner, operation_id: payload.operationId,
    draft_id: payload.draftId, program_day_id: null, program_revision_id: null,
    workout_name: payload.workoutName, started_at: startedAt, ended_at: endedAt, duration_min: payload.durationMin,
    schema_version: 2, revision: 1, lifecycle: 'finalized', completion_class: 'complete' };
  const row = { session_id: receipt.sessionId, actual_set_id: payload.sets[0].setId,
    exercise_id: exercise, order_index: 1, set_number: 1, reps: 8,
    load_value: null, load_kind: 'bodyweight', load_unit: 'none', load_side: 'unknown', rpe: null,
    logged_at: endedAt };
  assert.equal(verifyAdHocHistory(owner, payload, receipt, session, [row]), receipt.sessionId);
  assert.throws(() => verifyAdHocHistory(owner, payload, receipt, session, [{ ...row, reps: 9 }]), /set differs/);
  assert.throws(() => verifyAdHocHistory(owner, payload, receipt, session, [{ ...row, actual_set_id: id() }]), /identity/);
});

test('an unnamed ad-hoc workout receives a neutral title without changing its actual sets', () => {
  const draft: AdHocDraft = { ownerId: owner, draftId: id(), workoutName: ' ', startedAt,
    sets: [{ ...createAdHocSet(exercise, 'Press', 1, id, 'Bodyweight'), reps: '8' }] };
  const payload = freezeAdHocDraft(draft, id(), endedAt);
  assert.equal(payload.workoutName, 'Ad-hoc workout');
  assert.equal(payload.sets[0].exerciseId, exercise);
});

test('catalog multi-selection creates distinct groups and derives blank load metadata', () => {
  const draft: AdHocDraft = { ownerId: owner, draftId: id(), workoutName: 'Training', startedAt, sets: [] };
  const bodyweightId = 'a2000000-0000-4000-8000-000000000002';
  const grouped = addAdHocExercises(draft, [
    { id: exercise, name: 'Press', equipment: 'Dumbbell' },
    { id: bodyweightId, name: 'Push-up', equipment: 'Bodyweight' },
  ], id);

  assert.deepEqual(grouped.sets.map(set => [set.exerciseId, set.order, set.loadKind, set.loadUnit, set.loadValue]), [
    [exercise, 1, 'external', 'lb', ''],
    [bodyweightId, 1, 'bodyweight', 'none', ''],
  ]);
  assert.notEqual(grouped.sets[0].setId, grouped.sets[1].setId);
  assert.equal(grouped.sets[0].loadSide, 'per_hand');
  assert.throws(() => addAdHocExercises(grouped, [{ id: exercise, name: 'Press', equipment: 'Dumbbell' }], id), /already/);
  assert.throws(() => addAdHocExercises(draft, [{ id: 'invalid', name: 'Press', equipment: 'Barbell' }], id), /catalog/);
});

test('adding and removing grouped sets keeps per-exercise order and preserves frozen actual identity', () => {
  const draft: AdHocDraft = { ownerId: owner, draftId: id(), workoutName: 'Training', startedAt, sets: [] };
  const otherExercise = 'a2000000-0000-4000-8000-000000000002';
  const initial = addAdHocExercises(draft, [
    { id: exercise, name: 'Press', equipment: 'Barbell' },
    { id: otherExercise, name: 'Row', equipment: 'Cable' },
  ], id);
  const withSecond = appendAdHocSet(initial, exercise, id);
  const withThird = appendAdHocSet(withSecond, exercise, id);
  const shortened = removeAdHocSet(withThird, withSecond.sets[2].setId);
  const entered = { ...shortened, sets: shortened.sets.map(set => ({ ...set, reps: '8', loadValue: '30' })) };
  const payload = freezeAdHocDraft(entered, id(), endedAt);

  assert.deepEqual(shortened.sets.map(set => [set.exerciseId, set.order]), [
    [exercise, 1], [otherExercise, 1], [exercise, 2],
  ]);
  assert.deepEqual(payload.sets.map(set => [set.setId, set.exerciseId, set.order]), shortened.sets.map(set =>
    [set.setId, set.exerciseId, set.order]));
  assert.deepEqual(removeAdHocExercise(shortened, exercise).sets.map(set => set.exerciseId), [otherExercise]);
  assert.throws(() => appendAdHocSet(draft, exercise, id), /Choose an exercise/);
});

test('multi-exercise draft restores and retries the same history-only request after a lost response', async () => {
  const { service, storage, gateway, calls, setResponseLost } = fixture();
  const initial = await service.start(owner);
  const secondExercise = 'a2000000-0000-4000-8000-000000000002';
  const grouped = appendAdHocSet(addAdHocExercises(initial, [
    { id: exercise, name: 'Press', equipment: 'Dumbbell' },
    { id: secondExercise, name: 'Push-up', equipment: 'Bodyweight' },
  ], id), exercise, id);
  const entered = { ...grouped, workoutName: 'Training',
    sets: grouped.sets.map(set => ({ ...set, reps: '8', loadValue: set.loadKind === 'external' ? '20' : '' })) };
  await service.save(entered);
  setResponseLost();

  await assert.rejects(service.finish(owner), /response lost/);
  const restarted = createAdHocFlow(storage, gateway, () => { throw new Error('must not create new ID'); }, () => endedAt);
  assert.deepEqual((await restarted.load(owner)).draft?.sets, entered.sets);
  await restarted.finish(owner);

  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0].sets.map(set => [set.exerciseId, set.order]), [
    [exercise, 1], [secondExercise, 1], [exercise, 2],
  ]);
  assert.equal((await restarted.load(owner)).draft, null);
});
