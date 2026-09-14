import { createOperationId } from '../kernel/operationId';
import {
  normalizeProgramArtifact,
  type ProgramArtifact,
  type ProgramCommandOutcome,
  validateProgramArtifact,
  type ProgramExerciseRevisionOutcome,
  type ProgramExerciseRevisionRequest,
} from './contracts';
import {
  clearPendingProgramInstall,
  getOrCreatePendingProgramInstall,
} from './installStore';
import type { ProgramRepository } from './repository';
import {
  clearPendingProgramExerciseRevision,
  getOrCreatePendingProgramExerciseRevision,
} from './revisionStore';
import type { OperationId } from '../kernel/operationId';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Program installation failed.';
}

export async function installProgram(
  repository: ProgramRepository,
  ownerId: string,
  artifactInput: ProgramArtifact,
  expectedActiveProgramId: string | null,
  expectedActiveRevision: number | null,
): Promise<ProgramCommandOutcome> {
  const artifact = normalizeProgramArtifact(artifactInput);
  const validation = validateProgramArtifact(artifact);
  if (!validation.ok) return { status: 'validation', errors: validation.errors };
  const pending = await getOrCreatePendingProgramInstall(
    ownerId,
    artifact,
    expectedActiveProgramId,
    expectedActiveRevision,
  );
  try {
    const receipt = await repository.install({
      operationId: pending.operationId,
      artifact,
      expectedActiveProgramId: pending.expectedActiveProgramId,
      expectedActiveRevision: pending.expectedActiveRevision,
    });
    await clearPendingProgramInstall(ownerId, pending.operationId, pending.artifactCanonical);
    return { status: receipt.replayed ? 'replay' : 'installed', receipt };
  } catch (error) {
    const message = errorMessage(error);
    if (message.toLowerCase().includes('stale_revision')) {
      return { status: 'conflict', message: 'Your active program changed on another device. Refresh and try again.', activeProgramId: null };
    }
    reportSupabaseFailure('program.install', error);
    return { status: 'unavailable', message: supabaseUserMessage(error, 'Program installation is unavailable. Try again.') };
  }
}

export async function archiveProgram(
  repository: ProgramRepository,
  programId: string,
  expectedRevision: number,
  currentWeek: number,
): Promise<Record<string, unknown>> {
  return repository.archive({
    operationId: createOperationId(),
    programId,
    expectedRevision,
    checkpoint: { kind: 'revision_checkpoint', revision: expectedRevision, week: currentWeek },
  });
}

export async function restoreProgram(
  repository: ProgramRepository,
  programId: string,
  mode: 'exact' | 'restart' | 'legacy_approximate',
  expectedActiveProgramId: string | null,
): Promise<Record<string, unknown>> {
  return repository.restore({
    operationId: createOperationId(),
    programId,
    mode,
    expectedActiveProgramId,
  });
}

export async function executeProgramExerciseRevision(
  repository: ProgramRepository,
  operationId: OperationId,
  request: ProgramExerciseRevisionRequest,
): Promise<ProgramExerciseRevisionOutcome> {
  const required = [request.programId, request.expectedRevisionId, request.currentStableDayId,
    request.currentStableSlotId, request.originalExerciseId, request.replacementExerciseId];
  if (required.some((value) => !value) || request.expectedRevision < 1) {
    return { status: 'validation', errors: ['Complete program, revision, day, slot, and exercise identity is required.'] };
  }
  try {
    const receipt = await repository.reviseExercise({ operationId, ...request });
    return { status: receipt.replayed ? 'replay' : 'revised', receipt };
  } catch (error) {
    const message = errorMessage(error);
    if (message.toLowerCase().includes('stale_revision')) {
      return { status: 'conflict', message: 'Your active program changed on another device. Refresh and try again.' };
    }
    reportSupabaseFailure('program.revise_exercise', error);
    return { status: 'unavailable', message: supabaseUserMessage(error, 'The future program update is unavailable. Try again.') };
  }
}

export async function reviseProgramExercise(
  repository: ProgramRepository,
  ownerId: string,
  request: ProgramExerciseRevisionRequest,
): Promise<ProgramExerciseRevisionOutcome> {
  const pending = await getOrCreatePendingProgramExerciseRevision(ownerId, request);
  const outcome = await executeProgramExerciseRevision(repository, pending.operationId, request);
  if (outcome.status === 'revised' || outcome.status === 'replay') {
    await clearPendingProgramExerciseRevision(ownerId, request, pending.operationId);
  }
  return outcome;
}
