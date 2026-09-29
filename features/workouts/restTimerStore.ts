import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@adaptivpush/rest-timers/v1';

function key(ownerId: string, draftId: string) {
  return `${PREFIX}/${ownerId}/${draftId}`;
}

export interface RestTimerEntry {
  ownerId: string;
  draftId: string;
  endAt: string; // ISO
}

export interface RestTimerPreferences {
  seconds: number;
  alertEnabled: boolean;
}

const DEFAULT_PREFERENCES: RestTimerPreferences = { seconds: 60, alertEnabled: false };
const DURATIONS = [30, 60, 90, 120, 180] as const;

export const restTimerStore = {
  async save(entry: RestTimerEntry): Promise<void> {
    await AsyncStorage.setItem(key(entry.ownerId, entry.draftId), JSON.stringify(entry));
  },

  async load(ownerId: string, draftId: string): Promise<RestTimerEntry | null> {
    const serialized = await AsyncStorage.getItem(key(ownerId, draftId));
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as RestTimerEntry;
    if (parsed.ownerId !== ownerId || parsed.draftId !== draftId) throw new Error('Rest timer ownership mismatch.');
    return parsed;
  },

  async remove(ownerId: string, draftId: string): Promise<void> {
    const k = key(ownerId, draftId);
    await AsyncStorage.removeItem(key(ownerId, draftId));
  },
  async getPreferences(ownerId: string): Promise<RestTimerPreferences> {
    if (!ownerId) throw new Error('Sign in to load rest-timer preferences.');
    const serialized = await AsyncStorage.getItem(`${PREFIX}/preferences/${ownerId}`);
    if (!serialized) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid rest-timer preferences.');
    const preferences = parsed as Partial<RestTimerPreferences>;
    if (!DURATIONS.some(duration => duration === preferences.seconds)
      || typeof preferences.alertEnabled !== 'boolean') {
      throw new Error('Invalid rest-timer preferences.');
    }
    return preferences as RestTimerPreferences;
  },
  async savePreferences(ownerId: string, preferences: RestTimerPreferences): Promise<void> {
    if (!ownerId || !DURATIONS.some(duration => duration === preferences.seconds)
      || typeof preferences.alertEnabled !== 'boolean') throw new Error('Invalid rest-timer preferences.');
    await AsyncStorage.setItem(`${PREFIX}/preferences/${ownerId}`, JSON.stringify(preferences));
  },
};

export default restTimerStore;
