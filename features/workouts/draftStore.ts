import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutDraft } from './contracts';

const PREFIX = '@adaptivpush/workout-drafts/v2';

export interface WorkoutDraftStore {
  load(ownerId: string, programDayId: string): Promise<WorkoutDraft | null>;
  save(draft: WorkoutDraft): Promise<void>;
  remove(ownerId: string, programDayId: string): Promise<void>;
}

function draftKey(ownerId: string, programDayId: string): string {
  if (!ownerId || !programDayId) throw new Error('Owner and program day are required for draft storage.');
  return `${PREFIX}/${ownerId}/${programDayId}`;
}

export const workoutDraftStore: WorkoutDraftStore = {
  async load(ownerId, programDayId) {
    const serialized = await AsyncStorage.getItem(draftKey(ownerId, programDayId));
    if (!serialized) return null;
    const draft = JSON.parse(serialized) as WorkoutDraft;
    if (draft.ownerId !== ownerId || draft.programDayId !== programDayId) {
      throw new Error('Stored workout draft ownership does not match the authenticated account.');
    }
    return draft;
  },
  async save(draft) {
    await AsyncStorage.setItem(draftKey(draft.ownerId, draft.programDayId), JSON.stringify(draft));
  },
  async remove(ownerId, programDayId) {
    await AsyncStorage.removeItem(draftKey(ownerId, programDayId));
  },
};
