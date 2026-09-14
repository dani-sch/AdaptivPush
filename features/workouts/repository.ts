import { supabase } from '@/utils/supabase';
import { runSupabaseOperation } from '@/utils/supabaseResilience';
import { requireRollout, rollout } from '../kernel/rollout';

import type { WorkoutDraft, WorkoutFinalizationReceipt } from './contracts';

export interface WorkoutRepository {
  finalize(draft: WorkoutDraft, endedAt: string): Promise<WorkoutFinalizationReceipt>;
}

export function workoutFinalizationPayload(draft: WorkoutDraft, endedAt: string): Record<string, unknown> {
  const started = new Date(draft.startedAt).getTime();
  const ended = new Date(endedAt).getTime();
  return {
    operationId: draft.operationId,
    draftId: draft.draftId,
    schemaVersion: draft.schemaVersion,
    policyVersion: draft.policyVersion,
    revision: draft.revision,
    programDayId: draft.programDayId,
    prescriptionRevisionId: draft.prescriptionRevisionId,
    workoutName: draft.workoutName,
    startedAt: draft.startedAt,
    endedAt,
    durationMin: Math.max(0, Math.round((ended - started) / 60_000)),
    timezone: draft.timezone,
    frozenPrescription: draft.frozenPrescription,
    slots: draft.slots,
  };
}

export const workoutRepository: WorkoutRepository = {
  async finalize(draft, endedAt) {
    requireRollout(rollout.durableWorkoutWriter, 'Durable workout synchronization');
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc('finalize_workout_v2', {
        p_payload: workoutFinalizationPayload(draft, endedAt),
      }).abortSignal(signal),
      { kind: 'write', operation: 'workout.finalize' },
    );
    if (error) throw error;
    if (!data || typeof data !== 'object') throw new Error('Workout finalization returned no receipt.');
    return data as unknown as WorkoutFinalizationReceipt;
  },
};
