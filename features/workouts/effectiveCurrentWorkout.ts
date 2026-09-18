import type { CurrentProgram, ProgramWorkout, WorkoutExercise } from '@/types/program';

import { validateWorkoutDraft, type WorkoutDraft, type WorkoutDraftSlot } from './contracts';
import { activeWorkoutDraftMatches } from './draftStore';

function repRange(slot: WorkoutDraftSlot): string | undefined {
  const firstSet = slot.sets[0];
  if (!firstSet) return undefined;
  return firstSet.plannedRepsMin === firstSet.plannedRepsMax
    ? String(firstSet.plannedRepsMin)
    : `${firstSet.plannedRepsMin}-${firstSet.plannedRepsMax}`;
}

export function matchingActiveWorkoutDraft(
  program: CurrentProgram | null,
  workout: ProgramWorkout | null,
  ownerId: string | null,
  draft: WorkoutDraft | null,
): WorkoutDraft | null {
  if (!program || !workout?.stableDayId || !ownerId || !draft) return null;
  if (!validateWorkoutDraft(draft, false).ok) return null;
  return activeWorkoutDraftMatches(draft, ownerId, {
    programId: program.id,
    stableDayId: workout.stableDayId,
  }) ? draft : null;
}

export function matchingOccurrenceWorkoutDraft(
  program: CurrentProgram | null, workout: ProgramWorkout | null, ownerId: string | null, draft: WorkoutDraft | null,
): WorkoutDraft | null {
  return program && workout?.stableDayId && ownerId && draft && validateWorkoutDraft(draft, false).ok
    && draft.ownerId === ownerId && draft.programId === program.id && draft.stableDayId === workout.stableDayId ? draft : null;
}

function effectiveExercise(
  program: CurrentProgram,
  workout: ProgramWorkout,
  draft: WorkoutDraft,
  slot: WorkoutDraftSlot,
): WorkoutExercise {
  const prescribedSlot = workout.exercises.find((exercise) => exercise.stableSlotId === slot.slotId);
  const actualCatalogExercise = program.workouts
    .flatMap((candidate) => candidate.exercises)
    .find((exercise) => exercise.exerciseId === slot.actualExerciseId);
  const metadata = actualCatalogExercise
    ?? (prescribedSlot?.exerciseId === slot.actualExerciseId ? prescribedSlot : undefined);
  const wasReplaced = slot.actualExerciseId !== slot.prescribedExerciseId;

  return {
    ...metadata,
    id: prescribedSlot?.id ?? slot.slotId,
    stableSlotId: slot.slotId,
    exerciseId: slot.actualExerciseId,
    name: wasReplaced
      ? slot.replacementExerciseName ?? metadata?.name ?? 'Replacement exercise'
      : slot.exerciseName ?? prescribedSlot?.name ?? metadata?.name ?? 'Prescribed exercise',
    sets: slot.prescribedSetCount,
    removalMask: { version: 1, removed: Boolean(draft.removals?.slots.includes(slot.slotId)), orders: draft.removals?.sets.filter(s => s.slotId === slot.slotId).map(s => s.order) ?? [] },
    reps: repRange(slot) ?? prescribedSlot?.reps,
    loadSuggestion: slot.loadSuggestion,
  };
}

/**
 * Projects the current workout shown to the user. A valid owner/program/day-matched
 * active draft wins over a later server prescription without mutating either input.
 */
export function effectiveCurrentWorkout(
  program: CurrentProgram | null,
  workout: ProgramWorkout | null,
  ownerId: string | null,
  draft: WorkoutDraft | null,
): ProgramWorkout | null {
  if (!workout) return null;
  const activeDraft = matchingOccurrenceWorkoutDraft(program, workout, ownerId, draft);
  if (!program || !activeDraft) return workout;

  return {
    ...workout,
    name: activeDraft.workoutName,
    exercises: activeDraft.slots
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((slot) => effectiveExercise(program, workout, activeDraft, slot)),
  };
}

export function workoutRouteParamsForDraft(draft: WorkoutDraft) {
  return {
    programId: draft.programId,
    revisionId: draft.prescriptionRevisionId,
    stableDayId: draft.stableDayId,
    programDayId: draft.programDayId,
  };
}
