let AsyncStorage: any;
try {
  // runtime import; may throw in node test runner
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch (e) {
  AsyncStorage = undefined as any;
}

const PREFIX = '@adaptivpush/program-sequence-ops/v1';

export interface PendingSequenceOperation {
  ownerId: string;
  operationId: string;
  programId: string;
  kind: string;
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
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(k, v);
      return;
    }
    inMemory.set(k, v);
  },

  async loadPending(ownerId: string, operationId: string): Promise<PendingSequenceOperation | null> {
    const k = key(ownerId, operationId);
    let serialized: string | null = null;
    if (AsyncStorage && AsyncStorage.getItem) serialized = await AsyncStorage.getItem(k);
    else serialized = inMemory.get(k) ?? null;
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as PendingSequenceOperation;
    if (parsed.ownerId !== ownerId || parsed.operationId !== operationId) {
      throw new Error('Pending operation ownership mismatch.');
    }
    return parsed;
  },

  async removePending(ownerId: string, operationId: string): Promise<void> {
    const k = key(ownerId, operationId);
    if (AsyncStorage && AsyncStorage.removeItem) await AsyncStorage.removeItem(k);
    else inMemory.delete(k);
  },

  async listPendingForOwner(ownerId: string): Promise<PendingSequenceOperation[]> {
    const prefix = `${PREFIX}/${ownerId}/`;
    if (AsyncStorage && AsyncStorage.getAllKeys && AsyncStorage.multiGet) {
      const allKeys = await AsyncStorage.getAllKeys();
      const matching = allKeys.filter((k: string) => k.startsWith(prefix));
      const entries = await AsyncStorage.multiGet(matching);
      return entries.map(([_, v]: [string, string | null]) => JSON.parse(v!));
    }
    const entries: PendingSequenceOperation[] = [];
    for (const [k, v] of inMemory.entries()) {
      if (k.startsWith(prefix)) entries.push(JSON.parse(v));
    }
    return entries;
  },
};

export default sequenceOperationStore;
