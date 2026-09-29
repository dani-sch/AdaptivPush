import type { AsyncStorageStatic } from '@react-native-async-storage/async-storage';

let AsyncStorage: AsyncStorageStatic | undefined;
if (process.env.NODE_ENV !== 'test') {
  const module = require('@react-native-async-storage/async-storage') as {
    default?: AsyncStorageStatic;
  } & Partial<AsyncStorageStatic>;
  AsyncStorage = module.default ?? (module as AsyncStorageStatic);
}

const PREFIX = '@adaptivpush/program-sequence-ops/v1';

export interface PendingSequenceOperation {
  ownerId: string;
  operationId: string;
  programId: string;
  kind: 'initialize' | 'change' | 'finalize_day' | 'finalize_ad_hoc';
  payload: Record<string, unknown>;
  createdAt: string;
  lastError?: string | null;
}

function key(ownerId: string, operationId: string) {
  return `${PREFIX}/${ownerId}/${operationId}`;
}

// Fallback in-memory store when AsyncStorage is not available (e.g., Node test runner)
const inMemory = new Map<string, string>();

export const sequenceOperationStore = {
  async savePending(pending: PendingSequenceOperation): Promise<void> {
    const k = key(pending.ownerId, pending.operationId);
    const v = JSON.stringify(pending);
    const previous = await this.loadPending(pending.ownerId, pending.operationId);
    if (previous && JSON.stringify(previous.payload) !== JSON.stringify(pending.payload)) {
      throw new Error('An operation ID cannot be reused with a different sequence request.');
    }
    if (AsyncStorage?.setItem) {
      await AsyncStorage.setItem(k, v);
      return;
    }
    if (process.env.NODE_ENV !== 'test') throw new Error('Sequence recovery storage is unavailable.');
    inMemory.set(k, v);
  },

  async loadPending(ownerId: string, operationId: string): Promise<PendingSequenceOperation | null> {
    const k = key(ownerId, operationId);
    let serialized: string | null = null;
    if (AsyncStorage?.getItem) serialized = await AsyncStorage.getItem(k);
    else if (process.env.NODE_ENV === 'test') serialized = inMemory.get(k) ?? null;
    else throw new Error('Sequence recovery storage is unavailable.');
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as PendingSequenceOperation;
    if (parsed.ownerId !== ownerId || parsed.operationId !== operationId) {
      throw new Error('Pending operation ownership mismatch.');
    }
    return parsed;
  },

  async removePending(ownerId: string, operationId: string): Promise<void> {
    const k = key(ownerId, operationId);
    if (AsyncStorage?.removeItem) await AsyncStorage.removeItem(k);
    else if (process.env.NODE_ENV === 'test') inMemory.delete(k);
    else throw new Error('Sequence recovery storage is unavailable.');
  },

  async listPendingForOwner(ownerId: string): Promise<PendingSequenceOperation[]> {
    const prefix = `${PREFIX}/${ownerId}/`;
    if (AsyncStorage?.getAllKeys && AsyncStorage.multiGet) {
      const allKeys = await AsyncStorage.getAllKeys();
      const matching = allKeys.filter((k: string) => k.startsWith(prefix));
      const entries = await AsyncStorage.multiGet(matching);
      return entries.map(([_, value]: [string, string | null]) => {
        if (!value) throw new Error('Pending sequence request is missing from storage.');
        const parsed: PendingSequenceOperation = JSON.parse(value);
        if (parsed.ownerId !== ownerId) throw new Error('Pending sequence operation belongs to another account.');
        return parsed;
      });
    }
    if (process.env.NODE_ENV !== 'test') throw new Error('Sequence recovery storage is unavailable.');
    const entries: PendingSequenceOperation[] = [];
    for (const [k, v] of inMemory.entries()) {
      if (k.startsWith(prefix)) entries.push(JSON.parse(v));
    }
    return entries;
  },
};

export default sequenceOperationStore;
