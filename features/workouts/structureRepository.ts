import { supabase } from '@/utils/supabase';
import { classifySupabaseError, runSupabaseOperation } from '@/utils/supabaseResilience';
import type { RemovalPreview } from './removalRepository';

export async function workoutStructureAvailable(): Promise<boolean> {
  const { data, error } = await runSupabaseOperation(signal => supabase.rpc('workout_structure_capability_v1').abortSignal(signal),
    { kind: 'read', operation: 'workout.structure_capability' });
  if (error) {
    if (classifySupabaseError(error).category === 'schema_unavailable') return false;
    throw error;
  }
  return data === 1;
}
export async function previewAddition(programId: string, dayId: string): Promise<RemovalPreview> {
  const { data, error } = await supabase.rpc('preview_workout_addition_v1', { p_program_id: programId, p_day_id: dayId });
  if (error) throw error;
  return data as RemovalPreview;
}
