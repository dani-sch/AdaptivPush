import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkoutDraft, updateWorkoutSet, validateWorkoutDraft } from '../../features/workouts/contracts';
import { activeWorkoutDraftMatches, workoutDraftMatches } from '../../features/workouts/draftStore';
import {
  draftLookupForRoute,
  resolveProgramWorkout,
  workoutAvailability,
  workoutRouteParams,
  workoutEntryIssue,
} from '../../features/workouts/routeResolution';
import type { CurrentProgram } from '../../types/program';

const ownerId = '10000000-0000-4000-8000-000000000001';
const programId = '20000000-0000-4000-8000-000000000001';
const revisionId = '30000000-0000-4000-8000-000000000001';
const stableDayId = '40000000-0000-4000-8000-000000000001';
const programDayId = '50000000-0000-4000-8000-000000000001';
const stableSlotId = '60000000-0000-4000-8000-000000000001';
const exerciseId = '70000000-0000-4000-8000-000000000001';
const setId = '80000000-0000-4000-8000-000000000001';

const program: CurrentProgram = {
  id: programId,
  currentRevision: 1,
  currentRevisionId: revisionId,
  name: 'Program',
  goal: 'strength',
  currentWeek: 1,
  totalWeeks: 4,
  daysPerWeek: 1,
  workouts: [{
    id: programDayId,
    stableDayId,
    prescriptionRevisionId: revisionId,
    name: 'Day 1',
    day: 'Monday',
    estimatedTime: 45,
    exercises: [{
      id: stableSlotId,
      stableSlotId,
      exerciseId,
      name: 'Squat',
      sets: 1,
      reps: '5-8',
      weight: 100,
    }],
  }],
};

const route = workoutRouteParams(program, program.workouts[0]);

test('legacy preview and workout entry agree without manufacturing durable identity', () => {
  const legacy = { ...program, currentRevisionId: undefined };
  const day = { ...program.workouts[0], prescriptionRevisionId: undefined, stableDayId: undefined };
  assert.match(workoutEntryIssue(legacy, day)!, /service update/);
  assert.equal(day.stableDayId, undefined);
  assert.equal(workoutEntryIssue(program, program.workouts[0]), null);
  assert.match(workoutEntryIssue(program, { ...program.workouts[0], prescriptionRevisionId: 'old-revision' })!, /earlier program revision/);
  assert.match(workoutEntryIssue(program, null)!, /no longer matches/);
});
const draft = createWorkoutDraft({
  ownerId,
  programId,
  programDayId,
  stableDayId,
  prescriptionRevisionId: revisionId,
  workoutName: 'Day 1',
  startedAt: '2026-09-11T12:00:00.000Z',
  timezone: 'America/New_York',
  slots: [{
    slotId: stableSlotId,
    prescribedExerciseId: exerciseId,
    exerciseName: 'Squat',
    order: 1,
    prescribedSetCount: 1,
    sets: [{
      setId,
      order: 1,
      plannedRepsMin: 5,
      plannedRepsMax: 8,
      plannedLoad: 100,
      loadKind: 'external',
      loadUnit: 'lb',
      loadSide: 'external_total',
    }],
  }],
});

test('Home and Plan serialize the complete immutable workout target', () => {
  assert.deepEqual(route, { programId, revisionId, stableDayId, programDayId });
  assert.equal(resolveProgramWorkout(program, route)?.id, programDayId);
});

test('loading never becomes unavailable before program and draft resolution settle', () => {
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: true,
    program: null,
    programWorkout: null,
    draft: null,
    ownerId,
    route,
  }), 'loading');
});

test('a resolved program workout remains loading while draft initialization is pending', () => {
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: true,
    program,
    programWorkout: program.workouts[0],
    draft: null,
    ownerId,
    route,
  }), 'loading');
});

test('a resolved program workout is unavailable when draft initialization settles without a draft', () => {
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: false,
    program,
    programWorkout: program.workouts[0],
    draft: null,
    ownerId,
    route,
  }), 'unavailable');
});

test('an exact owner-scoped draft recovers while the server program is unavailable', () => {
  assert.equal(workoutDraftMatches(draft, ownerId, draftLookupForRoute(route)), true);
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: false,
    program: null,
    programWorkout: null,
    draft,
    ownerId,
    route,
  }), 'ready');
});

test('a matching owned draft is ready after program-backed draft creation completes', () => {
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: false,
    program,
    programWorkout: program.workouts[0],
    draft,
    ownerId,
    route,
  }), 'ready');
});

test('a draft for another owner is unavailable after initialization settles', () => {
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: false,
    program,
    programWorkout: program.workouts[0],
    draft,
    ownerId: 'another-owner',
    route,
  }), 'unavailable');
});

test('an empty owned draft is unavailable rather than actionable', () => {
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: false,
    program,
    programWorkout: program.workouts[0],
    draft: { ...draft, slots: [] },
    ownerId,
    route,
  }), 'unavailable');
});

test('stale or malformed routes never substitute a different workout', () => {
  assert.equal(resolveProgramWorkout(program, { ...route, revisionId: 'stale' }), null);
  assert.equal(resolveProgramWorkout(program, {}), null);
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: false,
    program,
    programWorkout: null,
    draft: null,
    ownerId,
    route: { ...route, programDayId: 'stale' },
  }), 'unavailable');
});

test('draft matching rejects another owner, revision, stable day, or row identity', () => {
  const lookup = draftLookupForRoute(route);
  assert.equal(workoutDraftMatches(draft, 'another-owner', lookup), false);
  assert.equal(workoutDraftMatches(draft, ownerId, { ...lookup, prescriptionRevisionId: 'stale' }), false);
  assert.equal(workoutDraftMatches(draft, ownerId, { ...lookup, stableDayId: 'stale' }), false);
  assert.equal(workoutDraftMatches(draft, ownerId, { ...lookup, programDayId: 'stale' }), false);
});

test('an active frozen draft can bridge a successor revision only by owner, program, and stable day', () => {
  const successorRoute = {
    ...route,
    revisionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    programDayId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  };
  assert.equal(activeWorkoutDraftMatches(draft, ownerId, {
    programId: program.id,
    stableDayId,
  }), true);
  assert.equal(workoutAvailability({
    authLoading: false,
    programLoading: true,
    program: null,
    programWorkout: null,
    draft,
    ownerId,
    route: successorRoute,
  }), 'ready');
  assert.equal(activeWorkoutDraftMatches(draft, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
    programId: program.id,
    stableDayId,
  }), false);
  assert.equal(activeWorkoutDraftMatches(draft, ownerId, {
    programId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    stableDayId,
  }), false);
  assert.equal(activeWorkoutDraftMatches({ ...draft, lifecycle: 'finalized' }, ownerId, {
    programId: program.id,
    stableDayId,
  }), false);
});


// Exercise the same asynchronous restoration/recovery boundary used by the screen.
import { createWorkoutEditingState, resolveWorkoutEditingSession } from '../../features/workouts/editingState';
import { resumableWorkoutDraftMatches } from '../../features/workouts/routeResolution';
import { matchingActiveWorkoutDraft, matchingOccurrenceWorkoutDraft } from '../../features/workouts/effectiveCurrentWorkout';
import { finalizeWorkout } from '../../features/workouts/commands';
import type { WorkoutDraftStore } from '../../features/workouts/draftStore';
import type { WorkoutRepository } from '../../features/workouts/repository';

const available = (value: typeof draft | null, resolutionLoading = false, resolutionError: string | null = null) => workoutAvailability({
  authLoading: false, programLoading: false, program, programWorkout: program.workouts[0],
  draft: value, ownerId, route, resolutionLoading, resolutionError,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function lifecycle(value = draft) {
  const state = createWorkoutEditingState(); state.select('target');
  const input = { state, key: 'target', isCurrent: () => true, load: async () => value,
    matches: (d: typeof draft) => resumableWorkoutDraftMatches(d, ownerId, draftLookupForRoute(route)),
    recover: async (_d: typeof draft): Promise<unknown> => null, installed: (_d: typeof draft) => {} };
  return { state, input };
}

for (const text of ['', '.', '3.5']) test(`resume checked-row deletion/partial reps ${JSON.stringify(text)} reaches ready; Finish reports a field error`, async () => {
  let value = updateWorkoutSet(draft, { setId, reps: 8, load: 30, logged: true });
  value = updateWorkoutSet(value, { setId, reps: text === '3.5' ? 3.5 : null, enteredRepsText: text });
  const { state, input } = lifecycle(JSON.parse(JSON.stringify(value)));
  assert.equal((await resolveWorkoutEditingSession(input)).status, 'ready');
  assert.equal(available(state.read()), 'ready');
  assert.equal(matchingActiveWorkoutDraft(program, program.workouts[0], ownerId, state.read())?.draftId, value.draftId);
  assert.equal(matchingOccurrenceWorkoutDraft(program, program.workouts[0], ownerId, state.read())?.draftId, value.draftId);
  assert.equal(validateWorkoutDraft(state.read()!).ok, false);
  const store: WorkoutDraftStore = { load: async () => null, loadMatching: async () => null, save: async () => {}, remove: async () => {} };
  const repository: WorkoutRepository = { finalize: async submitted => ({ operationId: submitted.operationId, sessionId: 'session',
    draftId: draft.draftId, revision: 1, setCount: 1, completionClass: 'complete', finalizedAt: '2026-09-11T13:00:00Z', replayed: false }) };
  assert.equal((await finalizeWorkout(repository, store, state.read()!, '2026-09-11T13:00:00Z')).status, 'validation');
  state.replace(updateWorkoutSet(state.read()!, { setId, reps: 8, enteredRepsText: '8' }));
  assert.equal(available(state.read()), 'ready');
  assert.equal((await finalizeWorkout(repository, store, state.read()!, '2026-09-11T13:00:00Z')).status, 'finalized');
});

test('cancellation after installation resumes exact recovery on Retry without replacing newer typing', async () => {
  const { state, input } = lifecycle();
  const pending = { operationId: 'exact-operation', request: { revisionId, payload: ['unchanged'] } };
  const recovery = deferred<unknown>(); let current = true;
  const started = deferred<void>();
  const first = resolveWorkoutEditingSession({ ...input, isCurrent: () => current,
    recover: async () => { started.resolve(); return recovery.promise; } });
  await started.promise;
  assert.equal(available(state.read(), true), 'loading');
  state.replace(updateWorkoutSet(state.read()!, { setId, enteredLoadText: '3.' }));
  current = false; recovery.resolve(pending);
  assert.equal((await first).status, 'cancelled');
  const retry = await resolveWorkoutEditingSession({ ...input, load: async () => { throw new Error('must not reload installed draft'); }, recover: async () => pending });
  assert.deepEqual(retry, { status: 'ready', recovery: pending });
  assert.equal(available(state.read()), 'ready');
  assert.equal(state.read()!.slots[0].sets[0].enteredLoadText, '3.');
  assert.equal(state.read()!.operationId, draft.operationId);
});

test('recovery failure remains unavailable until existing-draft Retry settles successfully', async () => {
  const { state, input } = lifecycle();
  await assert.rejects(resolveWorkoutEditingSession({ ...input, recover: async () => { throw new Error('read failed'); } }), /read failed/);
  assert.equal(available(state.read(), false, 'read failed'), 'unavailable');
  assert.equal((await resolveWorkoutEditingSession(input)).status, 'ready');
  assert.equal(available(state.read()), 'ready');
});

test('delayed program refresh sharing an earlier empty read still creates and settles a draft', async () => {
  const { state, input } = lifecycle(); const storage = deferred<typeof draft | null>();
  let current = true;
  const first = resolveWorkoutEditingSession({ ...input, isCurrent: () => current, load: () => storage.promise });
  current = false;
  const refreshed = resolveWorkoutEditingSession(input);
  storage.resolve(null);
  assert.equal((await first).status, 'cancelled');
  assert.equal((await refreshed).status, 'ready');
  assert.equal(available(state.read()), 'ready');
});

test('account change during recovery discards readiness and preserves the other account draft', async () => {
  const { state, input } = lifecycle(); const recovery = deferred<unknown>(); const started = deferred<void>();
  const first = resolveWorkoutEditingSession({ ...input, recover: () => { started.resolve(); return recovery.promise; } });
  await started.promise;
  state.select('other-account');
  const other = { ...draft, ownerId: 'other-account' }; state.hydrate('other-account', other);
  recovery.resolve({ operationId: 'first-account-operation' });
  assert.equal((await first).status, 'cancelled');
  assert.equal(state.read(), other);
  assert.equal(available(state.read()), 'unavailable');
});

test('finalized occurrences redirect on re-entry and when program refresh reveals their session', async () => {
  const { state, input } = lifecycle(); await resolveWorkoutEditingSession(input);
  const result = await resolveWorkoutEditingSession({ ...input, completedSessionId: 'completed-session', recover: async () => { throw new Error('must redirect'); } });
  assert.deepEqual(result, { status: 'completed', sessionId: 'completed-session' });
  assert.equal(state.read()!.operationId, draft.operationId);
  const finalized = lifecycle({ ...draft, lifecycle: 'finalized', finalizedReceipt: { operationId: draft.operationId,
    sessionId: 'stored-session', draftId: draft.draftId, revision: 1, setCount: 1, completionClass: 'complete', finalizedAt: '', replayed: false } });
  assert.deepEqual(await resolveWorkoutEditingSession(finalized.input), { status: 'completed', sessionId: 'stored-session' });
});

test('same-revision wrong row, empty target, wrong program/day and malformed structure remain unavailable', async () => {
  for (const target of [{}, { ...route, programDayId: 'wrong' }, { ...route, programId: 'wrong' }, { ...route, stableDayId: 'wrong' }]) {
    assert.equal(workoutAvailability({ authLoading: false, programLoading: false, program, programWorkout: null, draft, ownerId, route: target }), 'unavailable');
  }
  const invalid = lifecycle({ ...draft, slots: [] });
  await assert.rejects(resolveWorkoutEditingSession(invalid.input), /invalid/);
  assert.equal(invalid.state.read(), null);
});
