import { supabase } from '@/utils/supabase';
import { OperationFailureError, runSupabaseOperation } from '@/utils/supabaseResilience';
import { requireRollout, rollout } from '../kernel/rollout';
import { loadCompletedWorkout } from './occurrenceRepository';
import { sameStoredStructure } from './receiptVerification';

import { workoutFinalizationPayload, type WorkoutDraft, type WorkoutFinalizationReceipt } from './contracts';
import { sequenceOperationStore } from '@/features/programs/sequenceOperationStore';


export interface WorkoutRepository {
  finalize(draft: WorkoutDraft, endedAt: string): Promise<WorkoutFinalizationReceipt>;
}

export { workoutFinalizationPayload } from './contracts';

export const workoutRepository: WorkoutRepository = {
  async finalize(draft, endedAt) {
    requireRollout(rollout.durableWorkoutWriter, 'Durable workout synchronization');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session || session.user.id !== draft.ownerId) throw new OperationFailureError(
      { category: 'authentication_required', retryable: false },
      'Sign in to the draft’s account before finishing. Your exact workout is preserved.',
    );

    const payload = workoutFinalizationPayload(draft, endedAt);

    // If the server supports program sequences and this program has a sequence,
    // use the sequence-aware finalize RPC which atomically links the selected day.
    try {
      const cap = await runSupabaseOperation((signal) => supabase.rpc('program_sequence_capability_v1').abortSignal(signal), { kind: 'read', operation: 'program.sequence_capability' });
      if (cap.error) {
        // Capability check failed — fail closed for program-linked workouts.
        throw new OperationFailureError({ category: 'schema_unavailable', retryable: false }, 'Program sequence capability could not be determined.');
      }
      if (cap.data === 1) {
        // Server supports sequences — attempt to read the sequence context for this program.
        const seq = await runSupabaseOperation((signal) => supabase.rpc('get_program_sequence_v1', { p_program_id: draft.programId }).abortSignal(signal), { kind: 'read', operation: 'program.get_sequence' });
        if (seq.error) {
          // Fail closed: if capability present but sequence read fails, do not fall back to legacy finalize for program-linked workouts.
          throw new OperationFailureError({ category: 'forbidden', retryable: false }, 'Program sequence context unavailable. Submit via program sequence APIs only.');
        }
        if (seq.data) {
          // Sequence exists for this owner/program — enforce sequence finalization path.
          const seqRevision = (seq.data as any).revision as number;

          // If this draft is program-linked (has a stableDayId), use the sequence finalize day RPC.
          if (draft.stableDayId) {
            if (draft.scheduleOccurrenceId) {
              throw new OperationFailureError({ category: 'validation', retryable: false }, 'This program uses server sequence authority. Remove scheduled occurrence linkage before finalizing.');
            }
            const seqPayload = {
              schemaVersion: 1,
              programId: draft.programId,
              stableDayId: draft.stableDayId,
              operationId: draft.operationId,
              expectedRevision: seqRevision,
              workout: { ...(payload as Record<string, unknown>), operationId: draft.operationId },
            };

            // persist the pending sequence finalize operation before calling the RPC
            await sequenceOperationStore.savePending({
              ownerId: draft.ownerId,
              operationId: draft.operationId,
              programId: draft.programId,
              kind: 'finalize_day',
              payload: seqPayload,
              createdAt: new Date().toISOString(),
              lastError: null,
            });

            try {
              const { data, error } = await runSupabaseOperation(
                (signal) => supabase.rpc('finalize_program_sequence_day_v1', { p_payload: seqPayload }).abortSignal(signal),
                { kind: 'write', operation: 'workout.finalize_sequence' },
              );
              if (error) throw error;
              if (!data || typeof data !== 'object') throw new Error('Workout finalization returned no receipt.');
              const receipt = data as unknown as WorkoutFinalizationReceipt;
              // verify basic consistency
              if (receipt.operationId !== draft.operationId || receipt.draftId !== draft.draftId || receipt.revision !== draft.revision
                || receipt.setCount !== draft.slots.flatMap(s => s.sets).filter(s => s.logged).length) throw new Error('Workout receipt does not match this submission. Exact recovery is preserved.');
              // No schedule fields expected from sequence finalization
              if (receipt.scheduleOccurrenceId !== undefined || receipt.scheduleRevision !== undefined) {
                throw new Error('Unexpected scheduled fulfillment receipt. Exact recovery is preserved.');
              }
              const saved = await loadCompletedWorkout(supabase, draft.ownerId, receipt.sessionId);
              if (!sameStoredStructure(saved.snapshot?.effectiveSlots, draft.slots) || saved.sets.length !== receipt.setCount) {
                throw new Error('Saved workout structure does not match this submission. Exact recovery is preserved.');
              }
              for (const slot of draft.slots) for (const expected of slot.sets.filter(set => set.logged)) {
                const actual = saved.sets.find(set => set.actualSetId === expected.setId);
                if (!actual || actual.prescriptionSlotId !== slot.slotId || actual.exerciseId !== expected.actualExerciseId
                  || actual.order !== expected.order || actual.reps !== expected.actualReps || actual.loadValue !== expected.actualLoad
                  || actual.loadKind !== expected.loadKind || actual.loadUnit !== expected.loadUnit
                  || actual.loadSide !== expected.loadSide || actual.rpe !== expected.actualRpe) {
                  throw new Error('Saved set does not match this submission. Exact recovery is preserved.');
                }
              }

              // remove pending operation after success (or replay)
              await sequenceOperationStore.removePending(draft.ownerId, draft.operationId);

              return receipt;
            } catch (err) {
              // leave pending stored for recovery; propagate error
              if (err instanceof Error) {
                await sequenceOperationStore.savePending({
                  ownerId: draft.ownerId,
                  operationId: draft.operationId,
                  programId: draft.programId,
                  kind: 'finalize_day',
                  payload: seqPayload,
                  createdAt: new Date().toISOString(),
                  lastError: err.message,
                });
              }
              throw err;
            }
          }

          // If this draft is NOT program-linked (ad-hoc), use the finalize_ad_hoc RPC if available.
          const adHocPayload = {
            schemaVersion: 1,
            operationId: draft.operationId,
            draftId: draft.draftId,
            // include the finalization payload but do not include any program identifiers
            ...(payload as Record<string, unknown>),
          };

          // persist the pending ad-hoc finalize operation before calling the RPC
          await sequenceOperationStore.savePending({
            ownerId: draft.ownerId,
            operationId: draft.operationId,
            programId: draft.programId ?? '',
            kind: 'finalize_ad_hoc',
            payload: adHocPayload,
            createdAt: new Date().toISOString(),
            lastError: null,
          });

          try {
            const { data, error } = await runSupabaseOperation(
              (signal) => supabase.rpc('finalize_ad_hoc_workout_v1', { p_payload: adHocPayload }).abortSignal(signal),
              { kind: 'write', operation: 'workout.finalize_ad_hoc' },
            );
            if (error) throw error;
            if (!data || typeof data !== 'object') throw new Error('Ad-hoc finalization returned no receipt.');
            const receipt = data as unknown as WorkoutFinalizationReceipt;
            // Basic consistency checks similar to program finalization
            if (receipt.operationId !== draft.operationId || receipt.draftId !== draft.draftId || receipt.revision !== draft.revision
              || receipt.setCount !== draft.slots.flatMap(s => s.sets).filter(s => s.logged).length) throw new Error('Ad-hoc receipt does not match this submission. Exact recovery is preserved.');

            const saved = await loadCompletedWorkout(supabase, draft.ownerId, receipt.sessionId);
            if (!sameStoredStructure(saved.snapshot?.effectiveSlots, draft.slots) || saved.sets.length !== receipt.setCount) {
              throw new Error('Saved ad-hoc workout structure does not match this submission. Exact recovery is preserved.');
            }

            // remove pending operation on success
            await sequenceOperationStore.removePending(draft.ownerId, draft.operationId);

            return receipt;
          } catch (err) {
            if (err instanceof Error) {
              await sequenceOperationStore.savePending({
                ownerId: draft.ownerId,
                operationId: draft.operationId,
                programId: draft.programId ?? '',
                kind: 'finalize_ad_hoc',
                payload: adHocPayload,
                createdAt: new Date().toISOString(),
                lastError: err.message,
              });
            }
            throw err;
          }
        }
      }
    } catch (e) {
      // Capability RPC missing / schema unavailable — fail closed for program-linked workouts.
      throw new OperationFailureError({ category: 'schema_unavailable', retryable: false }, 'Program sequence capability is unavailable.');
    }

    // Legacy finalize path (only when sequence capability explicitly not present)
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc(draft.structureVersion === 1 ? 'finalize_workout_structure_v1' : draft.removals || draft.programRemoval || draft.slots.some(s => s.sets.length > s.prescribedSetCount) ? 'finalize_workout_removals_v1' : 'finalize_workout_v2', {
        p_payload: payload,
      }).abortSignal(signal),
      { kind: 'write', operation: 'workout.finalize' },
    );
    if (error) throw error;
    if (!data || typeof data !== 'object') throw new Error('Workout finalization returned no receipt.');
    const receipt = data as unknown as WorkoutFinalizationReceipt;
    if (receipt.operationId !== draft.operationId || receipt.draftId !== draft.draftId || receipt.revision !== draft.revision
      || receipt.setCount !== draft.slots.flatMap(s => s.sets).filter(s => s.logged).length) throw new Error('Workout receipt does not match this submission. Exact recovery is preserved.');
    if (draft.scheduleOccurrenceId) {
      if (draft.expectedScheduleRevision === undefined
        || receipt.scheduleOccurrenceId !== draft.scheduleOccurrenceId
        || receipt.scheduleRevision !== draft.expectedScheduleRevision + 1) {
        throw new Error('Authoritative scheduled fulfillment could not be verified. Exact recovery is preserved.');
      }
      const occurrence = await supabase.from('scheduled_days')
        .select('schedule_id,status,fulfillment_session_id')
        .eq('id', draft.scheduleOccurrenceId).eq('user_id', draft.ownerId)
        .maybeSingle<{ schedule_id: string; status: string; fulfillment_session_id: string | null }>();
      if (occurrence.error) throw occurrence.error;
      const schedule = occurrence.data ? await supabase.from('program_schedules')
        .select('revision').eq('id', occurrence.data.schedule_id).eq('user_id', draft.ownerId)
        .single<{ revision: number }>() : null;
      if (!occurrence.data || occurrence.data.status !== 'fulfilled'
        || occurrence.data.fulfillment_session_id !== receipt.sessionId
        || !schedule || schedule.error || schedule.data.revision !== receipt.scheduleRevision) {
        if (schedule?.error) throw schedule.error;
        throw new Error('Authoritative scheduled fulfillment could not be verified. Exact recovery is preserved.');
      }
    } else if (receipt.scheduleOccurrenceId !== undefined || receipt.scheduleRevision !== undefined) {
      throw new Error('Unexpected scheduled fulfillment receipt. Exact recovery is preserved.');
    }
    const saved = await loadCompletedWorkout(supabase, draft.ownerId, receipt.sessionId);
    if (!sameStoredStructure(saved.snapshot?.effectiveSlots, draft.slots) || saved.sets.length !== receipt.setCount) {
      throw new Error('Saved workout structure does not match this submission. Exact recovery is preserved.');
    }
    for (const slot of draft.slots) for (const expected of slot.sets.filter(set => set.logged)) {
      const actual = saved.sets.find(set => set.actualSetId === expected.setId);
      if (!actual || actual.prescriptionSlotId !== slot.slotId || actual.exerciseId !== expected.actualExerciseId
        || actual.order !== expected.order || actual.reps !== expected.actualReps || actual.loadValue !== expected.actualLoad
        || actual.loadKind !== expected.loadKind || actual.loadUnit !== expected.loadUnit
        || actual.loadSide !== expected.loadSide || actual.rpe !== expected.actualRpe) {
        throw new Error('Saved set does not match this submission. Exact recovery is preserved.');
      }
    }
    return receipt;
  },
};
