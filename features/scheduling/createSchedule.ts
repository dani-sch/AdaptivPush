import { asLocalDate, validateTimeZone } from '../kernel/localDate';
import { asOperationId } from '../kernel/operationId';
import { classifySupabaseError, reportSupabaseFailure } from '@/utils/supabaseResilience';
import type { ScheduleOperationStore } from './operationStore';
import type { CreateProgramSchedulePayload, PlacementPreviewInput } from './placementPreview';
import { buildCreateProgramSchedulePayload } from './placementPreview';
import type { CreateScheduleReceipt } from './repository';

export interface ScheduleCreatePort {
  assertCreateAvailable(ownerId: string): Promise<void>;
  currentRevision(ownerId: string, programId: string): Promise<string>;
  sendCreate(ownerId: string, requestJson: string): Promise<unknown>;
  verifyCreate(ownerId: string, payload: CreateProgramSchedulePayload,
    receipt: CreateScheduleReceipt): Promise<boolean>;
}

export type ScheduleCreateOutcome =
  | { status: 'created' | 'replayed'; receipt: CreateScheduleReceipt }
  | { status: 'pending' | 'conflict' | 'auth_required'; message: string };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved schedule request.');
  return value as Record<string, unknown>;
}

function parseRequest(requestJson: string, programId: string, operationId: string): CreateProgramSchedulePayload {
  const record = object(JSON.parse(requestJson) as unknown);
  if (record.programId !== programId || record.operationId !== operationId
    || record.expectedRevision !== 0 || typeof record.expectedProgramRevisionId !== 'string'
    || !record.expectedProgramRevisionId || typeof record.timezone !== 'string'
    || !Array.isArray(record.days) || record.days.length === 0) {
    throw new Error('Saved schedule request does not match this program or create contract.');
  }
  asOperationId(operationId);
  validateTimeZone(record.timezone);
  const ids = new Set<string>();
  const dates = new Set<string>();
  for (const item of record.days) {
    const day = object(item);
    if (typeof day.occurrenceId !== 'string' || typeof day.localDate !== 'string') {
      throw new Error('Saved schedule occurrence is incomplete.');
    }
    asOperationId(day.occurrenceId);
    asLocalDate(day.localDate);
    if (ids.has(day.occurrenceId) || dates.has(day.localDate)) throw new Error('Saved schedule occurrences collide.');
    ids.add(day.occurrenceId);
    dates.add(day.localDate);
    if (typeof day.programDayId === 'string' && day.programDayId) {
      if (day.kind !== undefined || day.cycleWeek !== undefined) throw new Error('Saved program-day placement has conflicting kind.');
    } else if (day.kind !== 'rest' || !Number.isSafeInteger(day.cycleWeek) || (day.cycleWeek as number) < 1) {
      throw new Error('Saved schedule-owned rest is incomplete.');
    }
  }
  return record as unknown as CreateProgramSchedulePayload;
}

function parseReceipt(value: unknown, request: CreateProgramSchedulePayload): CreateScheduleReceipt {
  const result = object(value);
  if (result.operationId !== request.operationId || result.programId !== request.programId
    || typeof result.scheduleId !== 'string'
    || result.revision !== 1 || typeof result.replayed !== 'boolean') {
    throw new Error('Schedule response cannot be verified; retry the saved operation.');
  }
  asOperationId(result.scheduleId);
  return {
    operationId: result.operationId,
    programId: result.programId,
    scheduleId: result.scheduleId,
    revision: 1,
    replayed: result.replayed,
  };
}

export function createScheduleCommand(port: ScheduleCreatePort, store: ScheduleOperationStore) {
  async function retry(ownerId: string, programId: string): Promise<ScheduleCreateOutcome> {
    const pending = await store.load(ownerId, programId);
    if (!pending) throw new Error('No pending schedule operation exists for this account and program.');
    const request = parseRequest(pending.requestJson, programId, pending.operationId);
    if (pending.expectedRevision !== 0) throw new Error('Saved schedule operation is not an initial placement.');
    try {
      await port.assertCreateAvailable(ownerId);
      await store.save({ ...pending, state: 'sending' });
      const response = await port.sendCreate(ownerId, pending.requestJson);
      const receipt = parseReceipt(response, request);
      if (!await port.verifyCreate(ownerId, request, receipt)) {
        return { status: 'pending', message: 'The exact request was sent, but its accepted placement cannot yet be verified. Retry without changing it.' };
      }
      await store.remove(ownerId, programId, pending.operationId);
      return { status: receipt.replayed ? 'replayed' : 'created', receipt };
    } catch (error) {
      reportSupabaseFailure('schedule.create', error);
      const failure = classifySupabaseError(error);
      if (failure.category === 'authentication_required' || (error instanceof Error && error.message.includes('account changed'))) {
        await store.save({ ...pending, state: 'auth_required' });
        return { status: 'auth_required', message: 'The account changed. Sign in to the original account before retrying its saved request.' };
      }
      if (failure.category === 'conflict') {
        await store.save({ ...pending, state: 'conflict' });
        return { status: 'conflict', message: 'The program or schedule changed. The exact request remains saved; refresh before resolving this conflict.' };
      }
      return { status: 'pending', message: 'Schedule saving could not be confirmed. Retry the exact saved request; no new dates will be submitted.' };
    }
  }

  return {
    async create(ownerId: string, input: PlacementPreviewInput): Promise<ScheduleCreateOutcome> {
      if (await store.load(ownerId, input.programId)) {
        return { status: 'conflict', message: 'A schedule request is already pending. Retry it before confirming a new placement.' };
      }
      const payload = buildCreateProgramSchedulePayload(input);
      await port.assertCreateAvailable(ownerId);
      if (await port.currentRevision(ownerId, input.programId) !== payload.expectedProgramRevisionId) {
        return { status: 'conflict', message: 'The program revision changed. Reload the days and choose dates again.' };
      }
      await store.save({
        schemaVersion: 1, ownerId, programId: input.programId, operationId: payload.operationId,
        expectedRevision: 0, requestJson: JSON.stringify(payload), state: 'queued',
      });
      return retry(ownerId, input.programId);
    },
    retry,
  };
}
