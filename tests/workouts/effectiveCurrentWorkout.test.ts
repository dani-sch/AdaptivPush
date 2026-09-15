import assert from 'node:assert/strict';
import test from 'node:test';

import { amendWorkoutExercise, createWorkoutDraft } from '../../features/workouts/contracts';
import {
  effectiveCurrentWorkout,
  matchingActiveWorkoutDraft,
  workoutRouteParamsForDraft,
} from '../../features/workouts/effectiveCurrentWorkout';
import type { CurrentProgram } from '../../types/program';

const ownerId = '10000000-0000-4000-8000-000000000001';
const programId = '20000000-0000-4000-8000-000000000001';
const revisionId = '30000000-0000-4000-8000-000000000001';
const stableDayId = '40000000-0000-4000-8000-000000000001';
const programDayId = '50000000-0000-4000-8000-000000000001';
const stableSlotId = '60000000-0000-4000-8000-000000000001';
const originalExerciseId = '70000000-0000-4000-8000-000000000001';
const replacementExerciseId = '70000000-0000-4000-8000-000000000002';

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
      id: '80000000-0000-4000-8000-000000000001',
      stableSlotId,
      exerciseId: originalExerciseId,
      name: 'Back Squat',
      sets: 3,
      reps: '5-8',
    }],
  }],
};

function activeDraft() {
  return createWorkoutDraft({
    ownerId,
    programId,
    programDayId,
    stableDayId,
    prescriptionRevisionId: revisionId,
    workoutName: 'Day 1',
    startedAt: '2026-09-15T12:00:00.000Z',
    timezone: 'America/New_York',
    slots: [{
      slotId: stableSlotId,
      prescribedExerciseId: originalExerciseId,
      exerciseName: 'Back Squat',
      order: 1,
      prescribedSetCount: 3,
      sets: Array.from({ length: 3 }, (_, index) => ({
        setId: `90000000-0000-4000-8000-00000000000${index}`,
        order: index + 1,
        plannedRepsMin: 5,
        plannedRepsMax: 8,
        plannedLoad: 100,
        loadKind: 'external' as const,
        loadUnit: 'lb' as const,
        loadSide: 'external_total' as const,
      })),
    }],
  });
}

test('a workout-only replacement is the effective Home workout exercise', () => {
  const swapped = amendWorkoutExercise(activeDraft(), {
    slotId: stableSlotId,
    replacementExerciseId,
    replacementName: 'Goblet Squat',
    amendedAt: '2026-09-15T12:01:00.000Z',
  });

  const effective = effectiveCurrentWorkout(program, program.workouts[0], ownerId, swapped);

  assert.equal(effective?.exercises[0].name, 'Goblet Squat');
  assert.equal(effective?.exercises[0].exerciseId, replacementExerciseId);
  assert.equal(program.workouts[0].exercises[0].name, 'Back Squat');
});

test('only a valid matching non-finalized draft produces Continue Workout', () => {
  const draft = activeDraft();

  assert.equal(matchingActiveWorkoutDraft(program, program.workouts[0], ownerId, draft)?.draftId, draft.draftId);
  assert.equal(matchingActiveWorkoutDraft(program, program.workouts[0], 'another-owner', draft), null);
  assert.equal(matchingActiveWorkoutDraft({ ...program, id: 'another-program' }, program.workouts[0], ownerId, draft), null);
  assert.equal(matchingActiveWorkoutDraft(program, { ...program.workouts[0], stableDayId: 'another-day' }, ownerId, draft), null);
  assert.equal(matchingActiveWorkoutDraft(program, program.workouts[0], ownerId, { ...draft, slots: [] }), null);
  assert.equal(matchingActiveWorkoutDraft(program, program.workouts[0], ownerId, { ...draft, lifecycle: 'finalized' }), null);
});

test('Continue Workout routes to the exact existing draft identity', () => {
  const draft = activeDraft();

  assert.deepEqual(workoutRouteParamsForDraft(draft), {
    programId,
    revisionId,
    stableDayId,
    programDayId,
  });
});
