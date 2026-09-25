import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PendingScheduleOperation {
  schemaVersion: 1;
  ownerId: string;
  programId: string;
  operationId: string;
  expectedRevision: number;
  requestJson: string;
  state: 'queued' | 'sending' | 'conflict' | 'auth_required';
}

export interface ScheduleStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function key(ownerId: string, programId: string): string {
  if (!ownerId || !programId || ownerId.includes('/') || programId.includes('/')) {
    throw new Error('Valid owner and program are required for schedule recovery');
  }
  return `@adaptivpush/schedule-operations/v1/${ownerId}/${programId}`;
}

function parse(value: string, ownerId: string, programId: string): PendingScheduleOperation {
  const record: unknown = JSON.parse(value);
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    throw new Error('Invalid stored schedule operation');
  }
  const operation = record as Partial<PendingScheduleOperation>;
  if (
    operation.schemaVersion !== 1 ||
    operation.ownerId !== ownerId ||
    operation.programId !== programId ||
    typeof operation.operationId !== 'string' ||
    !operation.operationId ||
    !Number.isSafeInteger(operation.expectedRevision) ||
    (operation.expectedRevision ?? -1) < 0 ||
    typeof operation.requestJson !== 'string' ||
    !['queued', 'sending', 'conflict', 'auth_required'].includes(operation.state ?? '')
  ) {
    throw new Error('Stored schedule operation cannot be safely replayed');
  }
  const request: unknown = JSON.parse(operation.requestJson);
  if (
    typeof request !== 'object' ||
    request === null ||
    Array.isArray(request) ||
    !('operationId' in request) ||
    !('expectedRevision' in request) ||
    request.operationId !== operation.operationId ||
    request.expectedRevision !== operation.expectedRevision
  ) {
    throw new Error('Stored schedule request differs from its recovery identity');
  }
  return operation as PendingScheduleOperation;
}

export function createScheduleOperationStore(storage: ScheduleStorage) {
  return {
    async load(ownerId: string, programId: string): Promise<PendingScheduleOperation | null> {
      const serialized = await storage.getItem(key(ownerId, programId));
      return serialized === null ? null : parse(serialized, ownerId, programId);
    },
    async save(operation: PendingScheduleOperation): Promise<void> {
      const storageKey = key(operation.ownerId, operation.programId);
      const existing = await storage.getItem(storageKey);
      if (existing !== null) {
        const pending = parse(existing, operation.ownerId, operation.programId);
        if (
          pending.operationId !== operation.operationId ||
          pending.requestJson !== operation.requestJson ||
          pending.expectedRevision !== operation.expectedRevision
        ) {
          throw new Error('A different schedule operation is pending reconciliation');
        }
      }
      parse(JSON.stringify(operation), operation.ownerId, operation.programId);
      await storage.setItem(storageKey, JSON.stringify(operation));
    },
    async remove(ownerId: string, programId: string, operationId: string): Promise<void> {
      const storageKey = key(ownerId, programId);
      const existing = await storage.getItem(storageKey);
      if (existing !== null && parse(existing, ownerId, programId).operationId === operationId) {
        await storage.removeItem(storageKey);
      }
    },
  };
}

export const scheduleOperationStore = createScheduleOperationStore(AsyncStorage);
