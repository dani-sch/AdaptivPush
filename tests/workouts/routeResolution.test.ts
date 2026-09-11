import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkoutDraft } from '../../features/workouts/contracts';
import { activeWorkoutDraftMatches, workoutDraftMatches } from '../../features/workouts/draftStore';
import {
  draftLookupForRoute,
  resolveProgramWorkout,
  workoutAvailability,
  workoutRouteParams,
} from '../../features/workouts/routeResolution';
import type { CurrentProgram } from '../../types/program';

const ownerId = '10000000-0000-4000-8000-000000000001';
const programId = '20000000-0000-4000-8000-000000000001';
const revisionId = '30000000-0000-4000-8000-000000000001';
const stableDayId = '40000000-0000-4000-8000-000000000001';
const programDayId = '50000000-0000-4000-8000-000000000001';

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
    exercises: [],
  }],
};

const route = workoutRouteParams(program, program.workouts[0]);
const draft = createWorkoutDraft({
  ownerId,
  programId,
  programDayId,
  stableDayId,
  prescriptionRevisionId: revisionId,
  workoutName: 'Day 1',
  startedAt: '2026-09-11T12:00:00.000Z',
  timezone: 'America/New_York',
  slots: [],
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
