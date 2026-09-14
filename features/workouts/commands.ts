import type { WorkoutDraftStore } from './draftStore';
import { RolloutDisabledError } from '../kernel/rollout';
import type { WorkoutRepository } from './repository';
import {
  type WorkoutCommandOutcome,
  type WorkoutDraft,
  type WorkoutFinalizationReceipt,
  validateWorkoutDraft,
} from './contracts';
import { classifySupabaseError, reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

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
  // A mounted screen may still hold its pre-submit draft after response loss.
  // Recover the persisted submission before constructing an identical retry.
  const stored = await store.load(draft.ownerId, draft.programDayId);
  if (stored?.draftId === draft.draftId && stored.finalizationEndedAt) draft = stored;
  if (draft.finalizedReceipt) return { status: 'replay', receipt: draft.finalizedReceipt };
  const validation = validateWorkoutDraft(draft);
  if (!validation.ok) return { status: 'validation', errors: validation.errors };

  const frozenEnd = draft.finalizationEndedAt ?? endedAt;
  if (!Number.isFinite(Date.parse(frozenEnd)) || Date.parse(frozenEnd) < Date.parse(draft.startedAt)) {
    return { status: 'validation', errors: ['Workout end time must be valid and follow its start time.'] };
  }

  const finalizing: WorkoutDraft = { ...draft, finalizationEndedAt: frozenEnd, lifecycle: 'finalizing', lastError: null };
  await store.save(finalizing);
  try {
    const receipt = await repository.finalize(finalizing, frozenEnd);
    const finalized: WorkoutDraft = {
      ...finalizing,
      lifecycle: 'finalized',
      finalizedReceipt: receipt,
    };
    await store.save(finalized);
    return { status: receipt.replayed ? 'replay' : 'finalized', receipt };
  } catch (error) {
    if (error instanceof RolloutDisabledError) {
      await store.save(draft);
      return { status: 'unavailable', message: error.message };
    }
    const rawMessage = errorMessage(error);
    const failure = classifySupabaseError(error);
    if (['schema_unavailable', 'authentication_required', 'forbidden', 'validation'].includes(failure.category)) {
      // Do not unlock a prior uncertain submission when this retry is rejected.
      const message = supabaseUserMessage(error, 'Your draft could not be submitted.');
      await store.save(draft.finalizationEndedAt ? { ...draft, lastError: message } : draft);
      reportSupabaseFailure('workout.finalize', error);
      return { status: 'unavailable', message };
    }
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
