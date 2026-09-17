import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/utils/supabase';
import { OperationFailureError, runSupabaseOperation } from '@/utils/supabaseResilience';
import type {
  CompletedWorkoutCorrectionReceipt,
  CompletedWorkoutCorrectionRequest,
} from './correctionContracts';

export interface WorkoutCorrectionRepository {
  correct(request: CompletedWorkoutCorrectionRequest): Promise<CompletedWorkoutCorrectionReceipt>;
}

export function createWorkoutCorrectionRepository(client: SupabaseClient): WorkoutCorrectionRepository {
  return {
    async correct(request) {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError || !session || session.user.id !== request.ownerId) {
        if (sessionError) throw sessionError;
        throw new OperationFailureError(
          { category: 'authentication_required', retryable: false },
          'The authenticated account changed. Return to the correct account before saving.',
        );
      }
      const { ownerId: _ownerId, ...payload } = request;
      const { data, error } = await runSupabaseOperation(
        (signal) => client.rpc(request.removals || request.programRemoval ? 'correct_workout_removals_v1' : 'correct_completed_workout_v1', { p_payload: payload })
          .setHeader('Authorization', `Bearer ${session.access_token}`)
          .abortSignal(signal),
        { kind: 'write', operation: 'workout.correct_completed' },
      );
      if (error) throw error;
      if (!data || typeof data !== 'object') throw new Error('Workout correction returned no receipt.');
      return data as unknown as CompletedWorkoutCorrectionReceipt;
    },
  };
}

export const workoutCorrectionRepository = createWorkoutCorrectionRepository(supabase);
