import type { CurrentProgram, ProgramWorkout } from '@/types/program';
import type { WorkoutDraft } from './contracts';
import { activeWorkoutDraftMatches, workoutDraftMatches, type WorkoutDraftLookup } from './draftStore';

export interface WorkoutRouteTarget {
  programId?: string;
  revisionId?: string;
  stableDayId?: string;
  programDayId?: string;
  workoutId?: string;
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
    if (workoutDraftMatches(input.draft, input.ownerId, lookup)
      || activeWorkoutDraftMatches(input.draft, input.ownerId, lookup)) {
      return 'ready';
    }
  }
  if (input.programLoading) return 'loading';
  return 'unavailable';
}
