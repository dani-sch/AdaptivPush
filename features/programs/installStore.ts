import AsyncStorage from '@react-native-async-storage/async-storage';

import { createOperationId, type OperationId } from '../kernel/operationId';
import { programArtifactCanonicalPayload, type ProgramArtifact } from './contracts';
import { stableJson } from '../kernel/stableJson';

const PREFIX = '@adaptivpush/program-installs/v2';

export interface PendingProgramInstall {
  ownerId: string;
  operationId: OperationId;
  artifactCanonical: string;
  artifact?: ProgramArtifact;
  expectedActiveProgramId: string | null;
  expectedActiveRevision: number | null;
}

// Authoring screens allocate new draft IDs when Save is pressed again. Match
// the intent without those IDs, but always replay the first complete artifact.
export function programInstallIntentCanonical(artifact: ProgramArtifact): string {
  const normalized = JSON.parse(programArtifactCanonicalPayload(artifact)) as ProgramArtifact;
  return stableJson({ ...normalized, days: normalized.days.map(({ dayId: _dayId, ...day }) => ({
    ...day, exercises: day.exercises.map(({ slotId: _slotId, ...exercise }) => exercise),
  })) });
}

function artifactFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function installKey(ownerId: string, artifactCanonical: string): string {
  if (!ownerId) throw new Error('Owner is required for install storage.');
  return `${PREFIX}/${ownerId}/${artifactFingerprint(artifactCanonical)}`;
}

export async function getOrCreatePendingProgramInstall(
  ownerId: string,
  artifact: ProgramArtifact,
  expectedActiveProgramId: string | null,
  expectedActiveRevision: number | null,
): Promise<PendingProgramInstall> {
  const artifactCanonical = programInstallIntentCanonical(artifact);
  const key = installKey(ownerId, artifactCanonical);
  const serialized = await AsyncStorage.getItem(key);
  if (serialized) {
    const pending = JSON.parse(serialized) as PendingProgramInstall;
    if (pending.ownerId === ownerId && pending.artifactCanonical === artifactCanonical) return pending;
    throw new Error('A different pending installation occupies this storage key. Resolve it before retrying.');
  }
  const pending: PendingProgramInstall = {
    ownerId,
    operationId: createOperationId(),
    artifactCanonical,
    artifact: structuredClone(artifact),
    expectedActiveProgramId,
    expectedActiveRevision,
  };
  await AsyncStorage.setItem(key, JSON.stringify(pending));
  return pending;
}

export async function clearPendingProgramInstall(
  ownerId: string,
  operationId: string,
  artifactCanonical: string,
): Promise<void> {
  const key = installKey(ownerId, artifactCanonical);
  const serialized = await AsyncStorage.getItem(key);
  if (!serialized) return;
  const pending = JSON.parse(serialized) as PendingProgramInstall;
  if (pending.ownerId === ownerId && pending.operationId === operationId) await AsyncStorage.removeItem(key);
}
