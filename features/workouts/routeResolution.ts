import type { CurrentProgram, ProgramWorkout } from '@/types/program';
import { validateWorkoutDraft, type WorkoutDraft } from './contracts';
import { activeWorkoutDraftMatches, workoutDraftMatches, type WorkoutDraftLookup } from './draftStore';

export interface WorkoutRouteTarget {
  programId?: string;
  revisionId?: string;
  stableDayId?: string;
  programDayId?: string;
  workoutId?: string;
}

/** Shared by previews and entry; a readable legacy plan is not yet startable. */
export function workoutEntryIssue(program: CurrentProgram | null, workout: ProgramWorkout | null): string | null {
  if (!program || !workout) return 'This workout no longer matches your active plan. Return to Plan and refresh.';
  if (!program.currentRevisionId || !workout.prescriptionRevisionId || !workout.stableDayId
    || workout.exercises.some((exercise) => !exercise.stableSlotId)) {
    return 'This plan is available to view, but starting workouts needs the program service update. Your existing program and history are preserved.';
  }
  if (workout.prescriptionRevisionId !== program.currentRevisionId) {
    return 'This workout belongs to an earlier program revision. Return to Plan and refresh.';
  }
  if (workout.exercises.length === 0 || workout.exercises.some((exercise) => !exercise.exerciseId)) {
    return 'This workout has an incomplete exercise prescription. Return to Plan and refresh.';
  }
  return null;
}

export function workoutRouteParams(program: CurrentProgram, workout: ProgramWorkout) {
  return {
    programId: program.id,
    revisionId: workout.prescriptionRevisionId ?? program.currentRevisionId ?? '',
    stableDayId: workout.stableDayId ?? '',
    programDayId: workout.id,
  };
}

export function draftLookupForRoute(
  target: WorkoutRouteTarget,
  workout?: ProgramWorkout,
): WorkoutDraftLookup {
  return {
    programId: target.programId,
    prescriptionRevisionId: target.revisionId ?? workout?.prescriptionRevisionId,
    stableDayId: target.stableDayId ?? workout?.stableDayId,
    programDayId: target.programDayId ?? target.workoutId ?? workout?.id,
  };
}

export function resolveProgramWorkout(
  program: CurrentProgram | null,
  target: WorkoutRouteTarget,
): ProgramWorkout | null {
  if (!program) return null;
  if (target.programId && target.programId !== program.id) return null;
  const legacyDayId = target.programDayId ?? target.workoutId;
  if (!target.stableDayId && !legacyDayId) return null;

  const match = program.workouts.find((workout) => {
    if (target.stableDayId && workout.stableDayId !== target.stableDayId) return false;
    if (legacyDayId && workout.id !== legacyDayId) return false;
    if (target.revisionId && workout.prescriptionRevisionId !== target.revisionId) return false;
    return true;
  });
  return match ?? null;
}

export type WorkoutAvailability = 'loading' | 'ready' | 'unavailable';

export function workoutAvailability(input: {
  authLoading: boolean;
  programLoading: boolean;
  program: CurrentProgram | null;
  programWorkout: ProgramWorkout | null;
  draft: WorkoutDraft | null;
  ownerId: string | null;
  route: WorkoutRouteTarget;
}): WorkoutAvailability {
  if (input.authLoading) return 'loading';
  if (input.draft && input.ownerId) {
    const lookup = draftLookupForRoute(input.route, input.programWorkout ?? undefined);
    if (validateWorkoutDraft(input.draft).ok
      && (workoutDraftMatches(input.draft, input.ownerId, lookup)
        || activeWorkoutDraftMatches(input.draft, input.ownerId, lookup))) {
      return 'ready';
    }
  }
  if (input.programLoading) return 'loading';
  return 'unavailable';
}
