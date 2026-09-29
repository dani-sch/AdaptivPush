import { programSequenceRepository } from '@/features/programs/sequenceRepository';
import { sequenceOperationStore } from '@/features/programs/sequenceOperationStore';
import { supabase } from '@/utils/supabase';
import { OperationFailureError, runSupabaseOperation } from '@/utils/supabaseResilience';

import { requireRollout, rollout } from '../kernel/rollout';
import {
  workoutFinalizationPayload, type WorkoutDraft, type WorkoutFinalizationReceipt,
} from './contracts';
import { loadCompletedWorkout } from './occurrenceRepository';
import { sameStoredStructure } from './receiptVerification';

export interface WorkoutRepository {
  finalize(draft: WorkoutDraft, endedAt: string): Promise<WorkoutFinalizationReceipt>;
}

export { workoutFinalizationPayload } from './contracts';

interface SequenceFinishRequest {
  schemaVersion: 1;
  programId: string;
  stableDayId: string;
  operationId: string;
  expectedRevision: number;
  workout: Record<string, unknown>;
}

function pendingFinishRequest(value: Record<string, unknown>, draft: WorkoutDraft): SequenceFinishRequest {
  const workout = value.workout;
  if (value.schemaVersion !== 1 || value.programId !== draft.programId
    || value.stableDayId !== draft.stableDayId || value.operationId !== draft.operationId
    || !Number.isInteger(value.expectedRevision)
    || !workout || typeof workout !== 'object' || Array.isArray(workout)) {
    throw new Error('Pending Finish does not match this program day. Keep the draft and inspect recovery.');
  }
  const submitted = workout as Record<string, unknown>;
  if (submitted.operationId !== draft.operationId || submitted.draftId !== draft.draftId
    || submitted.programDayId !== draft.programDayId
    || submitted.prescriptionRevisionId !== draft.prescriptionRevisionId) {
    throw new Error('Pending Finish belongs to a different workout. Keep the draft and inspect recovery.');
  }
  return value as unknown as SequenceFinishRequest;
}

export const workoutRepository: WorkoutRepository = {
  async finalize(draft, endedAt) {
    requireRollout(rollout.durableWorkoutWriter, 'Durable workout synchronization');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session || session.user.id !== draft.ownerId) {
      throw new OperationFailureError(
        { category: 'authentication_required', retryable: false },
        'Sign in to the draft’s account before finishing. Your exact workout is preserved.',
      );
    }
    if (!draft.programId || !draft.stableDayId || !draft.programDayId
      || !draft.prescriptionRevisionId) {
      throw new Error('Ad-hoc workouts need a separate history-only draft. Program Finish cannot substitute one.');
    }
    if (draft.scheduleOccurrenceId) {
      throw new Error('This saved draft still targets a dated placement. Keep the draft and select its program day explicitly.');
    }

    await programSequenceRepository.capability();
    const pending = await sequenceOperationStore.loadPending(draft.ownerId, draft.operationId);
    if (pending && pending.kind !== 'finalize_day') {
      throw new Error('This operation belongs to another pending request. Keep the draft for recovery.');
    }
    const request: SequenceFinishRequest = pending
      ? pendingFinishRequest(pending.payload, draft)
      : {
        schemaVersion: 1,
        programId: draft.programId,
        stableDayId: draft.stableDayId,
        operationId: draft.operationId,
        expectedRevision: (await programSequenceRepository.get(draft.programId)).revision,
        workout: workoutFinalizationPayload(draft, endedAt),
      };
    if (!pending) {
      await sequenceOperationStore.savePending({
        ownerId: draft.ownerId, operationId: draft.operationId, programId: draft.programId,
        kind: 'finalize_day', payload: request as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(), lastError: null,
      });
    }

    const { data, error } = await runSupabaseOperation(
      signal => supabase.rpc('finalize_program_sequence_day_v1', { p_payload: request }).abortSignal(signal),
      { kind: 'write', operation: 'workout.finalize_sequence' },
    );
    if (error) throw error;
    if (!data || typeof data !== 'object') throw new Error('Workout Finish returned no receipt. Keep the exact draft.');
    const receipt = data as WorkoutFinalizationReceipt & { sequenceRevision?: number; stableDayId?: string };
    if (receipt.operationId !== draft.operationId || receipt.draftId !== draft.draftId
      || receipt.revision !== draft.revision || receipt.stableDayId !== draft.stableDayId
      || receipt.sequenceRevision !== request.expectedRevision + 1
      || receipt.setCount !== draft.slots.flatMap(slot => slot.sets).filter(set => set.logged).length
      || receipt.scheduleOccurrenceId !== undefined || receipt.scheduleRevision !== undefined) {
      throw new Error('Workout receipt does not match this selected day. Exact recovery is preserved.');
    }
    const saved = await loadCompletedWorkout(supabase, draft.ownerId, receipt.sessionId);
    if (!sameStoredStructure(saved.snapshot?.effectiveSlots, draft.slots)
      || saved.sets.length !== receipt.setCount) {
      throw new Error('Saved workout structure does not match this submission. Exact recovery is preserved.');
    }
    for (const slot of draft.slots) for (const expected of slot.sets.filter(set => set.logged)) {
      const actual = saved.sets.find(set => set.actualSetId === expected.setId);
      if (!actual || actual.prescriptionSlotId !== slot.slotId
        || actual.exerciseId !== expected.actualExerciseId || actual.order !== expected.order
        || actual.reps !== expected.actualReps || actual.loadValue !== expected.actualLoad
        || actual.loadKind !== expected.loadKind || actual.loadUnit !== expected.loadUnit
        || actual.loadSide !== expected.loadSide || actual.rpe !== expected.actualRpe) {
        throw new Error('Saved set does not match this submission. Exact recovery is preserved.');
      }
    }
    await sequenceOperationStore.removePending(draft.ownerId, draft.operationId);
    return receipt;
  },
};
