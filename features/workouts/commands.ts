import type { WorkoutDraftStore } from './draftStore';
import type { WorkoutRepository } from './repository';
import {
  type WorkoutCommandOutcome,
  type WorkoutDraft,
  type WorkoutFinalizationReceipt,
  validateWorkoutDraft,
} from './contracts';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Workout could not be finalized.';
}

export async function finalizeWorkout(
  repository: WorkoutRepository,
  store: WorkoutDraftStore,
  draft: WorkoutDraft,
  endedAt: string,
): Promise<WorkoutCommandOutcome<WorkoutFinalizationReceipt>> {
  const validation = validateWorkoutDraft(draft);
  if (!validation.ok) return { status: 'validation', errors: validation.errors };

  const finalizing: WorkoutDraft = { ...draft, lifecycle: 'finalizing', lastError: null };
  await store.save(finalizing);
  try {
    const receipt = await repository.finalize(finalizing, endedAt);
    const finalized: WorkoutDraft = {
      ...finalizing,
      lifecycle: 'finalized',
      finalizedReceipt: receipt,
    };
    await store.save(finalized);
    return { status: receipt.replayed ? 'replay' : 'finalized', receipt };
  } catch (error) {
    const rawMessage = errorMessage(error);
    const lower = rawMessage.toLowerCase();
    const lifecycle = lower.includes('stale_revision') || lower.includes('conflict') ? 'conflict' : 'failed';
    const message = lifecycle === 'conflict'
      ? 'This workout changed on another device. Review it before retrying.'
      : supabaseUserMessage(error, 'Workout synchronization is unavailable. Your draft is safe on this device.');
    reportSupabaseFailure('workout.finalize', error);
    await store.save({ ...finalizing, lifecycle, lastError: message });
    if (lifecycle === 'conflict') return { status: 'conflict', message };
    if (lower.includes('target_unavailable')) return { status: 'unavailable', message };
    return { status: 'pending', message };
  }
}
