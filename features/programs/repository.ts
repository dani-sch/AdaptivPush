import { supabase } from '@/utils/supabase';

import type { OperationId } from '../kernel/operationId';
import { requireRollout, rollout } from '../kernel/rollout';
import type { ProgramArtifact, ProgramInstallationReceipt } from './contracts';

export interface ProgramRepository {
  install(input: {
    operationId: OperationId;
    artifact: ProgramArtifact;
    expectedActiveProgramId: string | null;
    expectedActiveRevision: number | null;
  }): Promise<ProgramInstallationReceipt>;
  archive(input: {
    operationId: OperationId;
    programId: string;
    expectedRevision: number;
    checkpoint: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  restore(input: {
    operationId: OperationId;
    programId: string;
    mode: 'exact' | 'restart' | 'legacy_approximate';
    expectedActiveProgramId: string | null;
  }): Promise<Record<string, unknown>>;
}

export const programRepository: ProgramRepository = {
  async install(input) {
    requireRollout(rollout.atomicProgramWriter, 'Atomic program installation');
    const { data, error } = await supabase.rpc('install_program_v2', {
      p_payload: {
        operationId: input.operationId,
        artifact: input.artifact,
        expectedActiveProgramId: input.expectedActiveProgramId,
        expectedActiveRevision: input.expectedActiveRevision,
      },
    });
    if (error) throw error;
    return data as unknown as ProgramInstallationReceipt;
  },
  async archive(input) {
    requireRollout(rollout.atomicProgramWriter, 'Program archiving');
    const { data, error } = await supabase.rpc('archive_program_v2', {
      p_operation_id: input.operationId,
      p_program_id: input.programId,
      p_expected_revision: input.expectedRevision,
      p_checkpoint: input.checkpoint,
    });
    if (error) throw error;
    return data as Record<string, unknown>;
  },
  async restore(input) {
    requireRollout(rollout.atomicProgramWriter, 'Program restoration');
    const { data, error } = await supabase.rpc('restore_program_v2', {
      p_operation_id: input.operationId,
      p_program_id: input.programId,
      p_mode: input.mode,
      p_expected_active_program_id: input.expectedActiveProgramId,
    });
    if (error) throw error;
    return data as Record<string, unknown>;
  },
};
