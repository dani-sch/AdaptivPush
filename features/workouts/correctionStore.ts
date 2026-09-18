import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CompletedWorkoutCorrectionRequest } from './correctionContracts';
import { createWorkoutEditDraftStore } from './editDraftStore';

export const workoutEditDraftStore = createWorkoutEditDraftStore(AsyncStorage);

const PREFIX = '@adaptivpush/workout-corrections/v1';

export interface WorkoutCorrectionStore {
  load(ownerId: string, sessionId: string): Promise<CompletedWorkoutCorrectionRequest | null>;
  save(request: CompletedWorkoutCorrectionRequest): Promise<void>;
  remove(ownerId: string, sessionId: string, operationId: string): Promise<void>;
}

function key(ownerId: string, sessionId: string): string {
  if (!ownerId || !sessionId) throw new Error('Owner and workout identity are required for correction recovery.');
  return `${PREFIX}/${ownerId}/${sessionId}`;
}

export const workoutCorrectionStore: WorkoutCorrectionStore = {
  async load(ownerId, sessionId) {
    const serialized = await AsyncStorage.getItem(key(ownerId, sessionId));
    if (!serialized) return null;
    const request = JSON.parse(serialized) as CompletedWorkoutCorrectionRequest;
    if (request.ownerId !== ownerId || request.sessionId !== sessionId) {
      throw new Error('Pending workout correction belongs to another account.');
    }
    return request;
  },
  async save(request) {
    await AsyncStorage.setItem(key(request.ownerId, request.sessionId), JSON.stringify(request));
  },
  async remove(ownerId, sessionId, operationId) {
    const storageKey = key(ownerId, sessionId);
    const serialized = await AsyncStorage.getItem(storageKey);
    if (!serialized) return;
    const request = JSON.parse(serialized) as CompletedWorkoutCorrectionRequest;
    if (request.operationId === operationId) await AsyncStorage.removeItem(storageKey);
  },
};
