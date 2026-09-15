import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProgramExerciseRevisionRequest } from '@/features/programs/contracts';
import type { WorkoutExercise } from '@/types/program';

const PREFIX = '@adaptivpush/workout-swaps/v1';

export interface PendingWorkoutSwap {
  ownerId: string;
  draftId: string;
  slotId: string;
  request: ProgramExerciseRevisionRequest;
  original: WorkoutExercise;
  replacement: WorkoutExercise;
  currentSavedAt: string;
  lastError: string | null;
}

function key(ownerId: string, draftId: string): string {
  return `${PREFIX}/${ownerId}/${draftId}`;
}

export const workoutSwapOperationStore = {
  async load(ownerId: string, draftId: string): Promise<PendingWorkoutSwap | null> {
    const serialized = await AsyncStorage.getItem(key(ownerId, draftId));
    if (!serialized) return null;
    const pending = JSON.parse(serialized) as PendingWorkoutSwap;
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
};
