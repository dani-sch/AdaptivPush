import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InactivityNudge } from './inactivityPolicy';

const key = (ownerId: string, draftId: string): string => {
  if (!ownerId || !draftId) throw new Error('An owned workout draft is required.');
  return `@adaptivpush/inactivity-nudge/v1/${ownerId}/${draftId}`;
};

export const inactivityStore = {
  async load(ownerId: string, draftId: string): Promise<InactivityNudge | null> {
    const value = await AsyncStorage.getItem(key(ownerId, draftId));
    if (!value) return null;
    const state = JSON.parse(value) as InactivityNudge;
    if (state.ownerId !== ownerId || state.draftId !== draftId
      || !Number.isFinite(Date.parse(state.deadlineAt))
      || !Number.isFinite(Date.parse(state.lastActivityAt))
      || typeof state.notified !== 'boolean') {
      throw new Error('Stored inactivity nudge does not match the owned draft.');
    }
    return state;
  },
  async save(state: InactivityNudge): Promise<void> {
    await AsyncStorage.setItem(key(state.ownerId, state.draftId), JSON.stringify(state));
  },
  async remove(ownerId: string, draftId: string): Promise<void> {
    await AsyncStorage.removeItem(key(ownerId, draftId));
  },
};
