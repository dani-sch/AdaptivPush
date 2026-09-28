let AsyncStorage: any;
try {
  // runtime import; may throw in node test runner
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch (e) {
  AsyncStorage = undefined as any;
}

const PREFIX = '@adaptivpush/rest-timers/v1';

function key(ownerId: string, draftId: string) {
  return `${PREFIX}/${ownerId}/${draftId}`;
}

const inMemory = new Map<string, string>();

export interface RestTimerEntry {
  ownerId: string;
  draftId: string;
  endAt: string; // ISO
}

export const restTimerStore = {
  async save(entry: RestTimerEntry): Promise<void> {
    const k = key(entry.ownerId, entry.draftId);
    const v = JSON.stringify(entry);
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(k, v);
      return;
    }
    inMemory.set(k, v);
  },

  async load(ownerId: string, draftId: string): Promise<RestTimerEntry | null> {
    const k = key(ownerId, draftId);
    let serialized: string | null = null;
    if (AsyncStorage && AsyncStorage.getItem) serialized = await AsyncStorage.getItem(k);
    else serialized = inMemory.get(k) ?? null;
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as RestTimerEntry;
    if (parsed.ownerId !== ownerId || parsed.draftId !== draftId) throw new Error('Rest timer ownership mismatch.');
    return parsed;
  },

  async remove(ownerId: string, draftId: string): Promise<void> {
    const k = key(ownerId, draftId);
    if (AsyncStorage && AsyncStorage.removeItem) await AsyncStorage.removeItem(k);
    else inMemory.delete(k);
  },
};

export default restTimerStore;
