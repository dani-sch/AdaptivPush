import { asLocalDate } from '../kernel/localDate';
import { asOperationId, createOperationId } from '../kernel/operationId';
import { classifySupabaseError, reportSupabaseFailure } from '@/utils/supabaseResilience';
import type { ScheduleOperationStore } from './operationStore';
import type { ScheduledDay } from './repository';

export type ScheduleRevisionChange = {
  occurrenceId: string;
  status: 'planned' | 'skipped';
  localDate?: string;
  kind?: 'rest';
  reason?: string;
};

export interface ScheduleRevisionPayload {
  schemaVersion: 1;
  operationId: string;
  programId: string;
  expectedRevision: number;
  expectedProgramRevisionId: string;
  changes: ScheduleRevisionChange[];
}

export interface ScheduleRevisionReceipt {
  operationId: string;
  programId: string;
  scheduleId: string;
  revision: number;
  replayed: boolean;
}

export interface ScheduleRevisionPort {
  assertRevisionAvailable(ownerId: string): Promise<void>;
  currentRevision(ownerId: string, programId: string): Promise<string>;
  sendRevision(ownerId: string, requestJson: string): Promise<unknown>;
  verifyRevision(ownerId: string, payload: ScheduleRevisionPayload,
    receipt: ScheduleRevisionReceipt): Promise<boolean>;
}

export type ScheduleRevisionOutcome =
  | { status: 'revised' | 'replayed'; receipt: ScheduleRevisionReceipt }
  | { status: 'pending' | 'conflict' | 'auth_required'; message: string };

type RevisionAction =
  | { type: 'move'; occurrence: ScheduledDay; targetDate: string }
  | { type: 'skip'; occurrence: ScheduledDay; reason: string }
  | { type: 'replace_with_rest'; occurrence: ScheduledDay; reason: string };

function requiredReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 256) {
    throw new Error('Explain this dated schedule change in 1 to 256 characters.');
  }
  return trimmed;
}

function mutableWorkout(day: ScheduledDay): void {
  if (day.kind !== 'workout' || day.status !== 'planned' || !day.localDate) {
    throw new Error('Only a planned dated workout can be changed here. Refresh if this schedule changed.');
  }
}

function ensureNoDateCollision(days: readonly ScheduledDay[], occurrenceId: string, date: string): void {
  if (days.some((day) => day.id !== occurrenceId && day.localDate === date
    && ['planned', 'in_progress', 'fulfilled'].includes(day.status))) {
    throw new Error('That date already has a scheduled occurrence. Choose another date or use a future swap control.');
  }
}

export function buildScheduleRevision(
  programId: string,
  expectedRevision: number,
  expectedProgramRevisionId: string,
  days: readonly ScheduledDay[],
  action: RevisionAction,
  operationId: string = createOperationId(),
): ScheduleRevisionPayload {
  if (!programId || !expectedProgramRevisionId || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error('A current program and schedule revision are required.');
  }
  mutableWorkout(action.occurrence);
  const sourceDate = action.occurrence.localDate;
  if (!sourceDate) throw new Error('A planned dated workout is required.');
  let change: ScheduleRevisionChange;
  if (action.type === 'move') {
    const targetDate = asLocalDate(action.targetDate);
    if (targetDate === sourceDate) throw new Error('Choose a different date before previewing this move.');
    ensureNoDateCollision(days, action.occurrence.id, targetDate);
    change = { occurrenceId: action.occurrence.id, status: 'planned', localDate: targetDate };
  } else if (action.type === 'skip') {
    change = { occurrenceId: action.occurrence.id, status: 'skipped', reason: requiredReason(action.reason) };
  } else {
    change = {
      occurrenceId: action.occurrence.id,
      status: 'planned',
      localDate: sourceDate,
      kind: 'rest',
      reason: requiredReason(action.reason),
    };
  }
  return {
    schemaVersion: 1,
    operationId: asOperationId(operationId),
    programId,
    expectedRevision,
    expectedProgramRevisionId,
    changes: [change],
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved schedule revision.');
  return value as Record<string, unknown>;
}

export function parseScheduleRevision(requestJson: string, programId: string, operationId: string): ScheduleRevisionPayload {
  const record = object(JSON.parse(requestJson) as unknown);
  if (record.schemaVersion !== 1 || record.operationId !== operationId || record.programId !== programId
    || !Number.isSafeInteger(record.expectedRevision) || (record.expectedRevision as number) < 1
    || typeof record.expectedProgramRevisionId !== 'string' || !record.expectedProgramRevisionId
    || !Array.isArray(record.changes) || record.changes.length === 0) {
    throw new Error('Saved schedule revision does not match its recovery identity.');
  }
  asOperationId(operationId);
  const occurrenceIds = new Set<string>();
  for (const value of record.changes) {
    const change = object(value);
    if (typeof change.occurrenceId !== 'string' || !change.occurrenceId
      || !['planned', 'skipped'].includes(String(change.status))
      || occurrenceIds.has(change.occurrenceId)) {
      throw new Error('Saved schedule revision has invalid occurrence changes.');
    }
    occurrenceIds.add(change.occurrenceId);
    if (change.status === 'planned') {
      if (typeof change.localDate !== 'string') throw new Error('Saved schedule placement needs a date.');
      asLocalDate(change.localDate);
    } else if (change.localDate !== undefined || typeof change.reason !== 'string' || !change.reason.trim()) {
      throw new Error('Saved skipped workout needs an explicit reason.');
    }
    if (change.kind !== undefined && change.kind !== 'rest') throw new Error('Saved schedule replacement kind is invalid.');
    if (change.kind === 'rest' && (typeof change.reason !== 'string' || !change.reason.trim())) {
      throw new Error('Saved rest replacement needs an explicit reason.');
    }
  }
  return record as unknown as ScheduleRevisionPayload;
}

function parseReceipt(value: unknown, request: ScheduleRevisionPayload): ScheduleRevisionReceipt {
  const result = object(value);
  if (result.operationId !== request.operationId || result.programId !== request.programId
    || typeof result.scheduleId !== 'string'
    || result.revision !== request.expectedRevision + 1 || typeof result.replayed !== 'boolean') {
    throw new Error('Schedule response cannot be verified; retry the exact saved change.');
  }
  asOperationId(result.scheduleId);
  return {
    operationId: result.operationId,
    programId: result.programId,
    scheduleId: result.scheduleId,
    revision: result.revision,
    replayed: result.replayed,
  };
}

export function isScheduleRevisionRequest(requestJson: string): boolean {
  try {
    const value = object(JSON.parse(requestJson) as unknown);
    return value.schemaVersion === 1 && Array.isArray(value.changes);
  } catch {
    return false;
  }
}

export function createScheduleRevisionCommand(port: ScheduleRevisionPort, store: ScheduleOperationStore) {
  async function retry(ownerId: string, programId: string): Promise<ScheduleRevisionOutcome> {
    const pending = await store.load(ownerId, programId);
    if (!pending) throw new Error('No pending schedule revision exists for this account and program.');
    const request = parseScheduleRevision(pending.requestJson, programId, pending.operationId);
    try {
      await port.assertRevisionAvailable(ownerId);
      await store.save({ ...pending, state: 'sending' });
      const response = await port.sendRevision(ownerId, pending.requestJson);
      const receipt = parseReceipt(response, request);
      if (!await port.verifyRevision(ownerId, request, receipt)) {
        return { status: 'pending', message: 'The exact change was sent, but its accepted schedule could not yet be verified. Retry without changing it.' };
      }
      await store.remove(ownerId, programId, pending.operationId);
      return { status: receipt.replayed ? 'replayed' : 'revised', receipt };
    } catch (error) {
      reportSupabaseFailure('schedule.revise', error);
      const failure = classifySupabaseError(error);
      if (failure.category === 'authentication_required' || (error instanceof Error && error.message.includes('account changed'))) {
        await store.save({ ...pending, state: 'auth_required' });
        return { status: 'auth_required', message: 'The account changed. Sign in to the original account before retrying its saved change.' };
      }
      if (failure.category === 'conflict') {
        await store.save({ ...pending, state: 'conflict' });
        return { status: 'conflict', message: 'The schedule or program changed. The exact request remains saved; refresh before resolving this conflict.' };
      }
      return { status: 'pending', message: 'Schedule change could not be confirmed. Retry the exact saved request; no new dates will be submitted.' };
    }
  }

  return {
    async revise(ownerId: string, payload: ScheduleRevisionPayload): Promise<ScheduleRevisionOutcome> {
      if (await store.load(ownerId, payload.programId)) {
        return { status: 'conflict', message: 'A schedule request is already pending. Reconcile it before confirming another change.' };
      }
      await port.assertRevisionAvailable(ownerId);
      if (await port.currentRevision(ownerId, payload.programId) !== payload.expectedProgramRevisionId) {
        return { status: 'conflict', message: 'The program revision changed. Refresh before confirming this schedule change.' };
      }
      await store.save({
        schemaVersion: 1, ownerId, programId: payload.programId, operationId: payload.operationId,
        expectedRevision: payload.expectedRevision, requestJson: JSON.stringify(payload), state: 'queued',
      });
      return retry(ownerId, payload.programId);
    },
    retry,
  };
}
