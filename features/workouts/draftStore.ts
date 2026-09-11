import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutDraft } from './contracts';

const PREFIX = '@adaptivpush/workout-drafts/v2';
const STABLE_PREFIX = '@adaptivpush/workout-drafts/v3';

export interface WorkoutDraftLookup {
  programId?: string;
  prescriptionRevisionId?: string;
  stableDayId?: string;
  programDayId?: string;
}

export interface WorkoutDraftStore {
  load(ownerId: string, programDayId: string): Promise<WorkoutDraft | null>;
  loadMatching(ownerId: string, lookup: WorkoutDraftLookup): Promise<WorkoutDraft | null>;
  save(draft: WorkoutDraft): Promise<void>;
  remove(ownerId: string, programDayId: string): Promise<void>;
}

function draftKey(ownerId: string, programDayId: string): string {
  if (!ownerId || !programDayId) throw new Error('Owner and program day are required for draft storage.');
  return `${PREFIX}/${ownerId}/${programDayId}`;
}

function stableDraftKey(
  ownerId: string,
  lookup: Required<Pick<WorkoutDraftLookup, 'programId' | 'prescriptionRevisionId' | 'stableDayId'>>,
): string {
  return `${STABLE_PREFIX}/${ownerId}/${lookup.programId}/${lookup.prescriptionRevisionId}/${lookup.stableDayId}`;
}

export function workoutDraftMatches(
  draft: WorkoutDraft,
  ownerId: string,
  lookup: WorkoutDraftLookup,
): boolean {
  return draft.ownerId === ownerId
    && (!lookup.programId || draft.programId === lookup.programId)
    && (!lookup.prescriptionRevisionId || draft.prescriptionRevisionId === lookup.prescriptionRevisionId)
    && (!lookup.stableDayId || draft.stableDayId === lookup.stableDayId)
    && (!lookup.programDayId || draft.programDayId === lookup.programDayId);
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
  async loadMatching(ownerId, lookup) {
    const keys: string[] = [];
    if (lookup.programId && lookup.prescriptionRevisionId && lookup.stableDayId) {
      keys.push(stableDraftKey(ownerId, {
        programId: lookup.programId,
        prescriptionRevisionId: lookup.prescriptionRevisionId,
        stableDayId: lookup.stableDayId,
      }));
    }
    if (lookup.programDayId) keys.push(draftKey(ownerId, lookup.programDayId));

    for (const key of [...new Set(keys)]) {
      const serialized = await AsyncStorage.getItem(key);
      if (!serialized) continue;
      const parsed = JSON.parse(serialized) as WorkoutDraft;
      const draft: WorkoutDraft = {
        ...parsed,
        programId: parsed.programId ?? lookup.programId ?? '',
        stableDayId: parsed.stableDayId ?? lookup.stableDayId ?? '',
      };
      if (workoutDraftMatches(draft, ownerId, lookup)) return draft;
    }
    return null;
  },
  async save(draft) {
    const serialized = JSON.stringify(draft);
    await Promise.all([
      AsyncStorage.setItem(draftKey(draft.ownerId, draft.programDayId), serialized),
      AsyncStorage.setItem(stableDraftKey(draft.ownerId, {
        programId: draft.programId,
        prescriptionRevisionId: draft.prescriptionRevisionId,
        stableDayId: draft.stableDayId,
      }), serialized),
    ]);
  },
  async remove(ownerId, programDayId) {
    await AsyncStorage.removeItem(draftKey(ownerId, programDayId));
  },
};
