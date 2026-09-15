import { classifySupabaseError, reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';
import type { WorkoutCorrectionRepository } from './correctionRepository';
import type { WorkoutCorrectionStore } from './correctionStore';
import {
  type CompletedWorkoutCorrectionOutcome,
  type CompletedWorkoutCorrectionRequest,
  validateCompletedWorkoutCorrection,
} from './correctionContracts';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Workout changes could not be saved.';
}

export async function correctCompletedWorkout(
  repository: WorkoutCorrectionRepository,
  store: WorkoutCorrectionStore,
  requested: CompletedWorkoutCorrectionRequest,
): Promise<CompletedWorkoutCorrectionOutcome> {
  const pending = await store.load(requested.ownerId, requested.sessionId) ?? requested;
  const validation = validateCompletedWorkoutCorrection(pending);
  if (!validation.ok) return { status: 'validation', errors: validation.errors };
  await store.save(pending);
  try {
    const receipt = await repository.correct(pending);
    await store.remove(pending.ownerId, pending.sessionId, pending.operationId);
    return { status: receipt.replayed ? 'replay' : 'saved', receipt };
  } catch (error) {
    const raw = errorMessage(error).toLowerCase();
    if (raw.includes('stale_revision')) {
      await store.remove(pending.ownerId, pending.sessionId, pending.operationId);
      return { status: 'conflict', message: 'This workout changed elsewhere. Reload it before editing again.' };
    }
    const failure = classifySupabaseError(error);
    reportSupabaseFailure('workout.correct_completed', error);
    if (failure.category === 'schema_unavailable') {
      return { status: 'unavailable', message: 'This workout can be viewed, but updates are temporarily unavailable.' };
    }
    const message = supabaseUserMessage(
      error,
      'The update could not be confirmed. Your exact changes are saved on this device; retry to reconcile the same request.',
    );
    if (failure.category === 'forbidden' || failure.category === 'authentication_required' || failure.category === 'validation') {
      return { status: 'unavailable', message };
    }
    return { status: 'pending', message };
  }
}
