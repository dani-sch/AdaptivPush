import { supabase } from '@/utils/supabase';
import { runSupabaseOperation } from '@/utils/supabaseResilience';

export interface ProgramSequenceCapability {
  supported: boolean;
}

export interface ProgramSequenceState {
  programId: string;
  revision: number;
  nextStableDayId?: string | null;
  // additional fields are passed-through as unknown
  [key: string]: unknown;
}

export const programSequenceRepository = {
  async capability(): Promise<boolean> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('program_sequence_capability_v1').abortSignal(signal), { kind: 'read', operation: 'program.sequence_capability' });
    if (error) throw error;
    return data === 1 || data === true;
  },

  async get(programId: string): Promise<ProgramSequenceState> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('get_program_sequence_v1', { p_program_id: programId }).abortSignal(signal), { kind: 'read', operation: 'program.get_sequence' });
    if (error) throw error;
    return data as ProgramSequenceState;
  },

  async initialize(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('initialize_program_sequence_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.initialize_sequence' });
    if (error) throw error;
    return data as Record<string, unknown>;
  },

  async change(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('change_program_sequence_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.change_sequence' });
    if (error) throw error;
    return data as Record<string, unknown>;
  },

  async finalizeDay(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('finalize_program_sequence_day_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.finalize_day' });
    if (error) throw error;
    return data as Record<string, unknown>;
  },

  async finalizeAdHoc(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('finalize_ad_hoc_workout_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.finalize_ad_hoc' });
    if (error) throw error;
    return data as Record<string, unknown>;
  },
};

export default programSequenceRepository;
