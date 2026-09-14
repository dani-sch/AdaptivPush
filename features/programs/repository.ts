import { supabase } from '@/utils/supabase';
import { OperationFailureError, runSupabaseOperation } from '@/utils/supabaseResilience';

import type { OperationId } from '../kernel/operationId';
import { requireRollout, rollout } from '../kernel/rollout';
import type {
  ProgramArtifact,
  ProgramExerciseRevisionReceipt,
  ProgramExerciseRevisionRequest,
  ProgramInstallationReceipt,
} from './contracts';

export interface ProgramRepository {
  install(input: {
    ownerId: string;
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
  reviseExercise(input: ProgramExerciseRevisionRequest & { operationId: OperationId }): Promise<ProgramExerciseRevisionReceipt>;
}

export const programRepository: ProgramRepository = {
  async install(input) {
    requireRollout(rollout.atomicProgramWriter, 'Atomic program installation');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || session.user.id !== input.ownerId) {
      if (sessionError) throw sessionError;
      throw new OperationFailureError({ category: 'authentication_required', retryable: false }, 'The authenticated account changed. Return to your account before retrying this installation.');
    }
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc('install_program_v2', {
        p_payload: {
          operationId: input.operationId,
          artifact: input.artifact,
          expectedActiveProgramId: input.expectedActiveProgramId,
          expectedActiveRevision: input.expectedActiveRevision,
        },
      }).setHeader('Authorization', `Bearer ${session.access_token}`).abortSignal(signal),
      { kind: 'write', operation: 'program.install' },
    );
    if (error) throw error;
    return data as unknown as ProgramInstallationReceipt;
  },
  async archive(input) {
    requireRollout(rollout.atomicProgramWriter, 'Program archiving');
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc('archive_program_v2', {
        p_operation_id: input.operationId,
        p_program_id: input.programId,
        p_expected_revision: input.expectedRevision,
        p_checkpoint: input.checkpoint,
      }).abortSignal(signal),
      { kind: 'write', operation: 'program.archive' },
    );
    if (error) throw error;
    return data as Record<string, unknown>;
  },
  async restore(input) {
    requireRollout(rollout.atomicProgramWriter, 'Program restoration');
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc('restore_program_v2', {
        p_operation_id: input.operationId,
        p_program_id: input.programId,
        p_mode: input.mode,
        p_expected_active_program_id: input.expectedActiveProgramId,
      }).abortSignal(signal),
      { kind: 'write', operation: 'program.restore' },
    );
    if (error) throw error;
    return data as Record<string, unknown>;
  },
  async reviseExercise(input) {
    requireRollout(rollout.atomicProgramWriter, 'Future program exercise updates');
    const { data, error } = await runSupabaseOperation(
      (signal) => supabase.rpc('revise_program_exercise_v2', {
        p_payload: {
          operationId: input.operationId,
          programId: input.programId,
          expectedRevision: input.expectedRevision,
          expectedRevisionId: input.expectedRevisionId,
          currentStableDayId: input.currentStableDayId,
          currentStableSlotId: input.currentStableSlotId,
          originalExerciseId: input.originalExerciseId,
          replacementExerciseId: input.replacementExerciseId,
          includeCurrentDay: input.includeCurrentDay,
        },
      }).abortSignal(signal),
      { kind: 'write', operation: 'program.revise_exercise' },
    );
    if (error) throw error;
    return data as unknown as ProgramExerciseRevisionReceipt;
  },
};
