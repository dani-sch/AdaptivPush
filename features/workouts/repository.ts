import { supabase } from '@/utils/supabase';
import { runSupabaseOperation } from '@/utils/supabaseResilience';
import { requireRollout, rollout } from '../kernel/rollout';

import type { WorkoutDraft, WorkoutFinalizationReceipt } from './contracts';

export interface WorkoutRepository {
  finalize(draft: WorkoutDraft, endedAt: string): Promise<WorkoutFinalizationReceipt>;
}

import { workoutFinalizationPayload } from './contracts';
export { workoutFinalizationPayload } from './contracts';

export const workoutRepository: WorkoutRepository = {
  async finalize(draft, endedAt) {
    requireRollout(rollout.durableWorkoutWriter, 'Durable workout synchronization');
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc(draft.removals || draft.programRemoval || draft.slots.some(s => s.sets.length > s.prescribedSetCount) ? 'finalize_workout_removals_v1' : 'finalize_workout_v2', {
        p_payload: workoutFinalizationPayload(draft, endedAt),
      }).abortSignal(signal),
      { kind: 'write', operation: 'workout.finalize' },
    );
    if (error) throw error;
    if (!data || typeof data !== 'object') throw new Error('Workout finalization returned no receipt.');
    return data as unknown as WorkoutFinalizationReceipt;
  },
};
