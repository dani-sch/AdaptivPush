import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOperationId, type OperationId } from '../kernel/operationId';

export interface PendingProgramLifecycle<T> {
  ownerId: string;
  operationId: OperationId;
  request: T;
}

export async function runPendingProgramLifecycle<T, R>(
  ownerId: string,
  intent: string,
  request: T,
  execute: (pending: PendingProgramLifecycle<T>) => Promise<R>,
): Promise<R> {
  if (!ownerId) throw new Error('An authenticated owner is required for program recovery.');
  const key = `@adaptivpush/program-lifecycle/v2/${ownerId}/${intent}`;
  const serialized = await AsyncStorage.getItem(key);
  const pending: PendingProgramLifecycle<T> = serialized
    ? JSON.parse(serialized) as PendingProgramLifecycle<T>
    : { ownerId, operationId: createOperationId(), request };
  if (pending.ownerId !== ownerId) throw new Error('Pending operation belongs to another account.');
  if (!serialized) await AsyncStorage.setItem(key, JSON.stringify(pending));
  let result: R;
  try {
    result = await execute(pending);
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
    // A definitive stale rejection committed nothing; let a refreshed retry
    // capture current state. Transport errors must retain the original request.
    if (message.includes('stale_revision')) await AsyncStorage.removeItem(key);
    throw error;
  }
  // A failed or lost response retains the exact operation and request for retry.
  await AsyncStorage.removeItem(key);
  return result;
}
