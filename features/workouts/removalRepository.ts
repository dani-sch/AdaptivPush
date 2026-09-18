import { supabase } from '@/utils/supabase';
import type { ProgramRemovalRequest } from './removals';
import { checkRemovalCapability } from './removalCapability';
import { OperationFailureError, runSupabaseOperation } from '@/utils/supabaseResilience';

export interface RemovalPreview extends Omit<ProgramRemovalRequest, 'targets'> { futureCount: number }
export interface ProgramRemovalMask { version: 1; orders: number[]; removed: boolean }
export async function removalsAvailable(): Promise<boolean> {
  const result = await readRemovalCapability();
  if (result.status === 'failed') throw new OperationFailureError(result.failure ?? { category: 'unknown', retryable: false }, result.message);
  return result.status === 'available';
}
export const readRemovalCapability = () => checkRemovalCapability(() => runSupabaseOperation(
  signal => supabase.rpc('workout_removal_capability_v1').abortSignal(signal),
  { kind: 'read', operation: 'workout.removal_capability' },
));
export async function previewRemoval(programId: string, dayId: string, slotId: string, order: number | null): Promise<RemovalPreview> {
  const { data, error } = await supabase.rpc('preview_workout_removal_v1', { p_program_id: programId, p_day_id: dayId, p_slot_id: slotId, p_order: order });
  if (error) throw error;
  return data as RemovalPreview;
}
export async function programRemovalState(programId: string): Promise<Record<string, ProgramRemovalMask>> {
  if (!await removalsAvailable()) return {};
  const { data, error } = await supabase.rpc('program_removal_state_v1', { p_program_id: programId });
  if (error) throw error;
  return data as Record<string, ProgramRemovalMask>;
}
