import type {
  ProgramExerciseRevisionOutcome,
  ProgramExerciseRevisionRequest,
} from '@/features/programs/contracts';

export type WorkoutSwapSyncDisposition =
  | { status: 'confirmed' }
  | { status: 'no_future_workouts' }
  | { status: 'uncertain'; detail: string }
  | { status: 'rejected'; detail: string };

export function workoutSwapSyncDisposition(
  outcome: ProgramExerciseRevisionOutcome,
): WorkoutSwapSyncDisposition {
  if (outcome.status === 'revised' || outcome.status === 'replay') {
    return { status: 'confirmed' };
  }
  if (outcome.status === 'no_change') {
    return { status: 'no_future_workouts' };
  }
  if (outcome.status === 'unavailable' && outcome.failure.retryable) {
    return { status: 'uncertain', detail: outcome.message };
  }
  if (outcome.status === 'validation') {
    return { status: 'rejected', detail: outcome.errors.join(' ') };
  }
  if (outcome.status === 'conflict' || outcome.status === 'unavailable') {
    return { status: 'rejected', detail: outcome.message };
  }
  return { status: 'rejected', detail: 'The program update was not completed.' };
}

export function compensationRequest(
  request: ProgramExerciseRevisionRequest,
  confirmedRevision: { revision: number; revisionId: string },
): ProgramExerciseRevisionRequest {
  return {
    ...request,
    expectedRevision: confirmedRevision.revision,
    expectedRevisionId: confirmedRevision.revisionId,
    originalExerciseId: request.replacementExerciseId,
    replacementExerciseId: request.originalExerciseId,
  };
}

export function isNoFutureWorkoutsDetail(detail: string | null): boolean {
  return Boolean(detail?.toLowerCase().includes('no eligible future uncompleted prescriptions')
    || detail?.toLowerCase().includes('no later uncompleted occurrences'));
}

export type WorkoutOnlyReconciliationStep =
  | { status: 'complete' }
  | { status: 'retry'; detail: string }
  | { status: 'compensate'; request: ProgramExerciseRevisionRequest };

export function workoutOnlyReconciliationStep(
  mode: 'program_update' | 'compensation',
  request: ProgramExerciseRevisionRequest,
  outcome: ProgramExerciseRevisionOutcome,
): WorkoutOnlyReconciliationStep {
  const disposition = workoutSwapSyncDisposition(outcome);
  if (mode === 'compensation') {
    return disposition.status === 'confirmed' || disposition.status === 'no_future_workouts'
      ? { status: 'complete' }
      : { status: 'retry', detail: disposition.detail };
  }
  if (disposition.status === 'no_future_workouts' || disposition.status === 'rejected') {
    return { status: 'complete' };
  }
  if (disposition.status === 'uncertain') {
    return { status: 'retry', detail: disposition.detail };
  }
  if (!('receipt' in outcome)) {
    return { status: 'retry', detail: 'The program update was not completed.' };
  }
  return { status: 'compensate', request: compensationRequest(request, outcome.receipt) };
}
