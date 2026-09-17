import { supabase } from '@/utils/supabase';
import type { ProgramRemovalRequest } from './removals';

export interface RemovalPreview extends Omit<ProgramRemovalRequest, 'targets'> { futureCount: number }
export interface ProgramRemovalMask { version: 1; orders: number[]; removed: boolean }
export async function removalsAvailable(): Promise<boolean> {
  const { data, error } = await supabase.rpc('workout_removal_capability_v1');
  return !error && data === 1;
}
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
