import { stableJson } from '../kernel/stableJson';
import { asLocalDate, LocalDate as KernelLocalDate, validateTimeZone } from '../kernel/localDate';
import { asOperationId, createOperationId } from '../kernel/operationId';
export type LocalDate = KernelLocalDate;

export type OccurrenceId = string & { readonly __brand: 'OccurrenceId' };
export type CycleId = string & { readonly __brand: 'CycleId' };

export function asOccurrenceId(value: string): OccurrenceId {
  // Backend requires UUID; reuse existing operation UUID validator
  const validated = asOperationId(value);
  return (validated as unknown) as OccurrenceId;
}

export function createOccurrenceId(): OccurrenceId {
  return asOccurrenceId(createOperationId());
}

// Retain a stable key for frontend-only deterministic identity (not a backend UUID).
export function stableOccurrenceKey(programId: string, index: number, programDayId?: string, prescriptionId?: string): string {
  if (!programId) throw new Error('programId is required');
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('index must be a non-negative integer');
  return `occ:${stableJson({ programId, index, programDayId: programDayId ?? null, prescriptionId: prescriptionId ?? null })}`;
}

export function stableOccurrenceId(value: string): OccurrenceId {
  return asOccurrenceId(value);
}

export function stableCycleId(programId: string, cycleIndex: number): CycleId {
  if (!programId) throw new Error('programId is required');
  if (!Number.isSafeInteger(cycleIndex) || cycleIndex < 0) throw new Error('cycleIndex must be non-negative');
  const payload = stableJson({ programId, cycleIndex });
  return `cyc:${payload}` as CycleId;
}

export type PlacementKind = 'workout' | 'rest' | 'pause';

export interface PlacementIdentity {
  occurrenceId: OccurrenceId;
  cycleId: CycleId;
}

export interface Placement {
  schemaVersion: 1;
  identity: PlacementIdentity;
  kind: PlacementKind;
  originalDate: LocalDate;
  currentDate: LocalDate;
  timeZone: string;
  fixed?: boolean;
  preview?: boolean;
  unplaced?: boolean;
}

export function createPlacement(params: {
  identity: PlacementIdentity;
  kind: PlacementKind;
  originalDate: string;
  currentDate?: string;
  timeZone: string;
  fixed?: boolean;
  preview?: boolean;
  unplaced?: boolean;
}): Placement {
  validateTimeZone(params.timeZone);
  const original = asLocalDate(params.originalDate);
  const current = params.currentDate ? asLocalDate(params.currentDate) : original;
  return {
    schemaVersion: 1 as const,
    identity: params.identity,
    kind: params.kind,
    originalDate: original,
    currentDate: current,
    timeZone: params.timeZone,
    fixed: !!params.fixed,
    preview: !!params.preview,
    unplaced: !!params.unplaced,
  };
}

export function isAvailable(p: Placement): boolean {
  return p.kind === 'workout' && !p.unplaced;
}

export type RevisionNumber = number & { readonly __brand: 'Revision' };

export function asRevisionNumber(n: number): RevisionNumber {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Revision must be a non-negative integer');
  return n as RevisionNumber;
}

export interface BaseScheduleCommand {
  schemaVersion: 1;
  operationId: string;
  expectedRevision: RevisionNumber;
}

export interface MovePlacementCommand extends BaseScheduleCommand {
  type: 'move';
  occurrenceId: OccurrenceId;
  targetDate: LocalDate;
  asKind?: 'rest' | 'pause';
}

export interface CarryPlacementCommand extends BaseScheduleCommand {
  type: 'carry';
  occurrenceId: OccurrenceId;
  targetCycle: CycleId;
}

export interface SwapPlacementsCommand extends BaseScheduleCommand {
  type: 'swap';
  firstOccurrence: OccurrenceId;
  secondOccurrence: OccurrenceId;
}

export interface SkipPlacementCommand extends BaseScheduleCommand {
  type: 'skip';
  occurrenceId: OccurrenceId;
  asKind?: 'rest' | 'pause';
}

export interface RecurringCommand extends BaseScheduleCommand {
  type: 'recurring';
  occurrenceId: OccurrenceId;
  recurrence: { every: number; unit: 'day' | 'week' | 'month'; count?: number; until?: LocalDate };
}

export type ScheduleCommand = MovePlacementCommand | CarryPlacementCommand | SwapPlacementsCommand | SkipPlacementCommand | RecurringCommand;

export function validateBaseCommand(cmd: unknown): asserts cmd is BaseScheduleCommand {
  if (typeof cmd !== 'object' || cmd === null) throw new Error('Command must be an object');
  const record = cmd as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new Error('Unsupported command schemaVersion');
  if (typeof record.operationId !== 'string' || !record.operationId) throw new Error('operationId required');
  if (!Number.isSafeInteger(record.expectedRevision as number) || (record.expectedRevision as number) < 0) throw new Error('expectedRevision required');
}

export function validateCommand(cmd: unknown): asserts cmd is ScheduleCommand {
  validateBaseCommand(cmd);
  const r = cmd as unknown as Record<string, unknown>;
  if (r.type === 'move') {
    if (typeof r.occurrenceId !== 'string' || !r.occurrenceId) throw new Error('move requires occurrenceId');
    if (typeof r.targetDate !== 'string') throw new Error('move requires targetDate');
    asLocalDate(r.targetDate as string);
    if (r.asKind !== undefined && !['rest', 'pause'].includes(String(r.asKind))) throw new Error('move.asKind invalid');
    return;
  }
  if (r.type === 'carry') {
    if (typeof r.occurrenceId !== 'string' || !r.occurrenceId) throw new Error('carry requires occurrenceId');
    if (typeof r.targetCycle !== 'string' || !r.targetCycle) throw new Error('carry requires targetCycle');
    return;
  }
  if (r.type === 'swap') {
    if (typeof r.firstOccurrence !== 'string' || typeof r.secondOccurrence !== 'string') throw new Error('swap requires both occurrence ids');
    if (r.firstOccurrence === r.secondOccurrence) throw new Error('swap cannot target the same occurrence');
    return;
  }
  if (r.type === 'skip') {
    if (typeof r.occurrenceId !== 'string' || !r.occurrenceId) throw new Error('skip requires occurrenceId');
    if (r.asKind !== undefined && !['rest', 'pause'].includes(String(r.asKind))) throw new Error('skip.asKind invalid');
    return;
  }
  if (r.type === 'recurring') {
    if (typeof r.occurrenceId !== 'string' || !r.occurrenceId) throw new Error('recurring requires occurrenceId');
    const rec = r.recurrence as Record<string, unknown> | undefined;
    if (!rec || !Number.isSafeInteger(rec.every as number) || (rec.every as number) < 1) throw new Error('recurrence.every required');
    if (!['day', 'week', 'month'].includes(String(rec.unit))) throw new Error('recurrence.unit invalid');
    if (!Number.isSafeInteger(rec.count as number) && typeof rec.until !== 'string') throw new Error('recurrence must include count or until');
    if (typeof rec.until === 'string') asLocalDate(rec.until);
    return;
  }
  throw new Error('Unknown command type');
}

export function ensureRevisionMatch(expected: RevisionNumber, actual: RevisionNumber): void {
  if (expected !== actual) throw new Error('Revision conflict');
}

export function ensureNoAutomaticDebt(): void {
  throw new Error('Automatic creation of catch-up debt is prohibited; caller must explicitly create a replacement action');
}
