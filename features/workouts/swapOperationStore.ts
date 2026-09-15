import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProgramExerciseRevisionRequest } from '@/features/programs/contracts';
import type { WorkoutExercise } from '@/types/program';

const PREFIX = '@adaptivpush/workout-swaps/v1';

export interface PendingWorkoutSwap {
  pendingId: string;
  ownerId: string;
  draftId: string;
  slotId: string;
  request: ProgramExerciseRevisionRequest;
  original: WorkoutExercise;
  replacement: WorkoutExercise;
  currentSavedAt: string;
  lastError: string | null;
  mode: 'program_update' | 'compensation';
}

function key(ownerId: string, draftId: string): string {
  return `${PREFIX}/${ownerId}/${draftId}`;
}

function normalizePending(pending: PendingWorkoutSwap): PendingWorkoutSwap {
  return {
    ...pending,
    pendingId: pending.pendingId
      ?? `legacy/${pending.draftId}/${pending.request.expectedRevisionId}/${pending.request.replacementExerciseId}`,
    mode: pending.mode ?? 'program_update',
  };
}

export const workoutSwapOperationStore = {
  async load(ownerId: string, draftId: string): Promise<PendingWorkoutSwap | null> {
    const serialized = await AsyncStorage.getItem(key(ownerId, draftId));
    if (!serialized) return null;
    const pending = normalizePending(JSON.parse(serialized) as PendingWorkoutSwap);
    if (pending.ownerId !== ownerId || pending.draftId !== draftId) {
      throw new Error('Pending swap belongs to another account or workout.');
    }
    return pending;
  },
  async save(pending: PendingWorkoutSwap): Promise<void> {
    await AsyncStorage.setItem(key(pending.ownerId, pending.draftId), JSON.stringify(pending));
  },
  async remove(ownerId: string, draftId: string): Promise<void> {
    await AsyncStorage.removeItem(key(ownerId, draftId));
  },
  async removeIfCurrent(ownerId: string, draftId: string, pendingId: string): Promise<boolean> {
    const storageKey = key(ownerId, draftId);
    const serialized = await AsyncStorage.getItem(storageKey);
    if (!serialized) return true;
    const current = normalizePending(JSON.parse(serialized) as PendingWorkoutSwap);
    if (current.ownerId !== ownerId || current.draftId !== draftId || current.pendingId !== pendingId) {
      return false;
    }
    await AsyncStorage.removeItem(storageKey);
    return true;
  },
  async replaceIfCurrent(
    ownerId: string,
    draftId: string,
    pendingId: string,
    replacement: PendingWorkoutSwap,
  ): Promise<boolean> {
    const storageKey = key(ownerId, draftId);
    const serialized = await AsyncStorage.getItem(storageKey);
    if (!serialized) return false;
    const current = normalizePending(JSON.parse(serialized) as PendingWorkoutSwap);
    if (current.ownerId !== ownerId || current.draftId !== draftId || current.pendingId !== pendingId) {
      return false;
    }
    await AsyncStorage.setItem(storageKey, JSON.stringify(replacement));
    return true;
  },
};
