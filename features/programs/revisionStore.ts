import AsyncStorage from '@react-native-async-storage/async-storage';

import { createOperationId, type OperationId } from '../kernel/operationId';
import type { ProgramExerciseRevisionRequest } from './contracts';

const PREFIX = '@adaptivpush/program-revisions/v2';

export interface PendingProgramExerciseRevision {
  ownerId: string;
  operationId: OperationId;
  request: ProgramExerciseRevisionRequest;
}

function key(ownerId: string, request: ProgramExerciseRevisionRequest): string {
  return `${PREFIX}/${ownerId}/${request.programId}/${request.expectedRevisionId}/${request.currentStableSlotId}/${request.replacementExerciseId}/${request.includeCurrentDay ? 'inclusive' : 'future'}`;
}

export async function getOrCreatePendingProgramExerciseRevision(
  ownerId: string,
  request: ProgramExerciseRevisionRequest,
): Promise<PendingProgramExerciseRevision> {
  if (!ownerId) throw new Error('Owner is required for revision storage.');
  const storageKey = key(ownerId, request);
  const serialized = await AsyncStorage.getItem(storageKey);
  if (serialized) {
    const pending = JSON.parse(serialized) as PendingProgramExerciseRevision;
    if (pending.ownerId === ownerId && JSON.stringify(pending.request) === JSON.stringify(request)) return pending;
  }
  const pending = { ownerId, operationId: createOperationId(), request };
  await AsyncStorage.setItem(storageKey, JSON.stringify(pending));
  return pending;
}

export async function clearPendingProgramExerciseRevision(
  ownerId: string,
  request: ProgramExerciseRevisionRequest,
  operationId: string,
): Promise<void> {
  const storageKey = key(ownerId, request);
  const serialized = await AsyncStorage.getItem(storageKey);
  if (!serialized) return;
  const pending = JSON.parse(serialized) as PendingProgramExerciseRevision;
  if (pending.ownerId === ownerId && pending.operationId === operationId) {
    await AsyncStorage.removeItem(storageKey);
  }
}
