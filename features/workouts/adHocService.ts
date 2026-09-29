import AsyncStorage from '@react-native-async-storage/async-storage';

import { createOperationId } from '@/features/kernel/operationId';
import { supabase } from '@/utils/supabase';
import { runSupabaseOperation } from '@/utils/supabaseResilience';
import {
  addAdHocExercises as addExercises,
  appendAdHocSet as appendSet,
  createAdHocFlow,
  createAdHocSet as makeSet,
  removeAdHocExercise,
  removeAdHocSet,
  type AdHocDraft,
  type AdHocDraftSet,
  type AdHocPayload,
} from './adHocFlow';

export type { AdHocDraft, AdHocDraftSet } from './adHocFlow';

export function createAdHocSet(exerciseId: string, exerciseName: string, order: number): AdHocDraftSet {
  return makeSet(exerciseId, exerciseName, order, createOperationId);
}

export function addAdHocExercises(draft: AdHocDraft,
  exercises: readonly { id: string; name: string; equipment: string }[]): AdHocDraft {
  return addExercises(draft, exercises, createOperationId);
}

export function appendAdHocSet(draft: AdHocDraft, exerciseId: string): AdHocDraft {
  return appendSet(draft, exerciseId, createOperationId);
}

export { removeAdHocExercise, removeAdHocSet };

export const adHocService = createAdHocFlow(AsyncStorage, {
  async finalize(payload: AdHocPayload): Promise<unknown> {
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc('finalize_ad_hoc_workout_v1', { p_payload: payload }).abortSignal(signal),
      { kind: 'write', operation: 'workout.finalize_ad_hoc' },
    );
    if (error) throw error;
    return data;
  },
  async session(ownerId: string, operationId: string): Promise<unknown> {
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.from('workout_sessions')
        .select('id,user_id,operation_id,draft_id,program_day_id,program_revision_id,workout_name,started_at,ended_at,duration_min,schema_version,revision,lifecycle,completion_class')
        .eq('user_id', ownerId).eq('operation_id', operationId).abortSignal(signal).maybeSingle(),
      { kind: 'read', operation: 'workout.verify_ad_hoc_session' },
    );
    if (error) throw error;
    return data;
  },
  async sets(sessionId: string): Promise<unknown> {
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.from('workout_exercise_sets')
        .select('session_id,actual_set_id,exercise_id,order_index,set_number,reps,load_value,load_unit,load_kind,load_side,rpe,logged_at')
        .eq('session_id', sessionId).abortSignal(signal),
      { kind: 'read', operation: 'workout.verify_ad_hoc_sets' },
    );
    if (error) throw error;
    return data;
  },
}, createOperationId, () => new Date().toISOString());
