import { supabase } from '@/utils/supabase';
import { runSupabaseOperation } from '@/utils/supabaseResilience';
import { parseProgramSequenceState, type ProgramSequenceState } from './sequenceSelectors';

export type { ProgramSequenceState, ProgramSequenceDay } from './sequenceSelectors';

function requireSequenceReceipt(
  value: unknown, payload: Record<string, unknown>, expectedRevision?: number,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Program sequence command returned no authoritative receipt.');
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.programId !== payload.programId
    || (expectedRevision !== undefined && receipt.revision !== expectedRevision)
    || (receipt.replayed !== true && receipt.replayed !== false)) {
    throw new Error('Program sequence receipt does not match the requested program and revision.');
  }
  return receipt;
}

export const programSequenceRepository = {
  async capability(): Promise<boolean> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('program_sequence_capability_v1').abortSignal(signal), { kind: 'read', operation: 'program.sequence_capability' });
    if (error) throw error;
    if (data !== 1) throw new Error('Program sequence capability is unavailable.');
    return true;
  },

  async get(programId: string): Promise<ProgramSequenceState> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('get_program_sequence_v1', { p_program_id: programId }).abortSignal(signal), { kind: 'read', operation: 'program.get_sequence' });
    if (error) throw error;
    return parseProgramSequenceState(data);
  },

  async initialize(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('initialize_program_sequence_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.initialize_sequence' });
    if (error) throw error;
    return requireSequenceReceipt(data, payload, 1);
  },

  async change(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('change_program_sequence_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.change_sequence' });
    if (error) throw error;
    const expected = payload.expectedRevision;
    if (typeof expected !== 'number' || !Number.isInteger(expected)) {
      throw new Error('An expected sequence revision is required.');
    }
    return requireSequenceReceipt(data, payload, expected + 1);
  },

  async finalizeDay(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('finalize_program_sequence_day_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.finalize_day' });
    if (error) throw error;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Program Finish returned no authoritative receipt.');
    }
    const receipt = data as Record<string, unknown>;
    if (receipt.operationId !== payload.operationId || receipt.stableDayId !== payload.stableDayId
      || receipt.sequenceRevision !== Number(payload.expectedRevision) + 1
      || typeof receipt.sessionId !== 'string') {
      throw new Error('Program Finish receipt does not match the selected day.');
    }
    return receipt;
  },

  async finalizeAdHoc(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await runSupabaseOperation((signal) => supabase.rpc('finalize_ad_hoc_workout_v1', { p_payload: payload }).abortSignal(signal), { kind: 'write', operation: 'program.finalize_ad_hoc' });
    if (error) throw error;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Ad-hoc Finish returned no authoritative receipt.');
    }
    const receipt = data as Record<string, unknown>;
    if (receipt.operationId !== payload.operationId || receipt.draftId !== payload.draftId
      || typeof receipt.sessionId !== 'string' || receipt.completionClass !== 'complete') {
      throw new Error('Ad-hoc Finish receipt does not match the submitted actual workout.');
    }
    return receipt;
  },
};

export default programSequenceRepository;
