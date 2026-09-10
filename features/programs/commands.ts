import { createOperationId } from '../kernel/operationId';
import {
  normalizeProgramArtifact,
  type ProgramArtifact,
  type ProgramCommandOutcome,
  validateProgramArtifact,
} from './contracts';
import {
  clearPendingProgramInstall,
  getOrCreatePendingProgramInstall,
} from './installStore';
import type { ProgramRepository } from './repository';

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
      return { status: 'conflict', message, activeProgramId: null };
    }
    return { status: 'unavailable', message };
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
