import { supabase } from '@/utils/supabase';
import { OperationFailureError, runSupabaseOperation } from '@/utils/supabaseResilience';
import { requireRollout, rollout } from '../kernel/rollout';
import { loadCompletedWorkout } from './occurrenceRepository';
import { sameStoredStructure } from './receiptVerification';

import { workoutFinalizationPayload, type WorkoutDraft, type WorkoutFinalizationReceipt } from './contracts';

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
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc(draft.structureVersion === 1 ? 'finalize_workout_structure_v1' : draft.removals || draft.programRemoval || draft.slots.some(s => s.sets.length > s.prescribedSetCount) ? 'finalize_workout_removals_v1' : 'finalize_workout_v2', {
        p_payload: workoutFinalizationPayload(draft, endedAt),
      }).setHeader('Authorization', `Bearer ${session.access_token}`).abortSignal(signal),
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
        throw new Error('Scheduled workout receipt does not match this submission. Exact recovery is preserved.');
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
