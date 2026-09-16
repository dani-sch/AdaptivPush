import { createOperationId, type OperationId } from '../kernel/operationId';
import type { LoadKind, LoadSide, LoadUnit } from './contracts';

export const WORKOUT_CORRECTION_SCHEMA_VERSION = 1 as const;

export interface CompletedWorkoutSetCorrection {
  actualSetId: string;
  prescriptionSlotId: string | null;
  prescribedExerciseId: string | null;
  exerciseId: string;
  order: number;
  reps: number;
  loadValue: number | null;
  loadUnit: LoadUnit;
  loadKind: LoadKind;
  loadSide: LoadSide;
  rpe: number | null;
  loggedAt: string;
}

export interface CompletedWorkoutCorrectionRequest {
  schemaVersion: typeof WORKOUT_CORRECTION_SCHEMA_VERSION;
  operationId: OperationId;
  ownerId: string;
  sessionId: string;
  expectedRevision: number;
  sets: CompletedWorkoutSetCorrection[];
  setOutcomes?: { setId: string; slotId: string; order: number; outcome: 'performed' | 'skipped' | 'not_attempted' }[];
}

export interface CompletedWorkoutCorrectionReceipt {
  operationId: string;
  sessionId: string;
  revision: number;
  completionClass: 'complete' | 'partial' | 'abandoned' | 'legacy_unknown';
  setCount: number;
  totalVolumeLb: number;
  correctedAt: string;
  replayed: boolean;
}

export type CompletedWorkoutCorrectionOutcome =
  | { status: 'saved' | 'replay'; receipt: CompletedWorkoutCorrectionReceipt }
  | { status: 'validation'; errors: string[] }
  | { status: 'conflict'; message: string }
  | { status: 'pending'; message: string }
  | { status: 'unavailable'; message: string };

export function createCompletedWorkoutCorrection(input: Omit<
  CompletedWorkoutCorrectionRequest,
  'schemaVersion' | 'operationId'
> & { operationId?: OperationId }): CompletedWorkoutCorrectionRequest {
  return {
    ...input,
    schemaVersion: WORKOUT_CORRECTION_SCHEMA_VERSION,
    operationId: input.operationId ?? createOperationId(),
    sets: structuredClone(input.sets),
  };
}

export function validateCompletedWorkoutCorrection(
  request: CompletedWorkoutCorrectionRequest,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.ownerId || !request.sessionId || request.expectedRevision < 0) {
    errors.push('Owner, workout, and revision identity are required.');
  }
  const setIds = new Set<string>();
  const slotOrders = new Set<string>();
  for (const set of request.sets) {
    if (!set.actualSetId || setIds.has(set.actualSetId)) errors.push('Completed set identities must be present and unique.');
    setIds.add(set.actualSetId);
    if (!set.exerciseId) errors.push('Every completed set requires an exercise.');
    if (!Number.isInteger(set.order) || set.order < 1) errors.push('Set order must be a positive integer.');
    const orderKey = `${set.prescriptionSlotId ?? set.exerciseId}:${set.order}`;
    if (slotOrders.has(orderKey)) errors.push('Set order must be unique within an exercise slot.');
    slotOrders.add(orderKey);
    if (!Number.isInteger(set.reps) || set.reps < 1) errors.push('Completed sets require positive whole-number reps.');
    if (set.loadValue !== null && (!Number.isFinite(set.loadValue) || set.loadValue < 0)) {
      errors.push('Loads must be nonnegative numbers.');
    }
    if (set.loadKind === 'external' && (set.loadValue === null || set.loadUnit === 'none')) {
      errors.push('External loads require a value and unit.');
    }
    if ((set.loadKind === 'bodyweight' || set.loadKind === 'unknown') && set.loadUnit !== 'none') {
      errors.push('Bodyweight and unknown loads use no load unit.');
    }
    if (set.loadKind === 'assistance' && (set.loadValue === null || set.loadUnit === 'none')) {
      errors.push('Assistance requires a value and unit.');
    }
    if (set.rpe !== null && (!Number.isFinite(set.rpe) || set.rpe < 0 || set.rpe > 10)) {
      errors.push('RPE must be between 0 and 10.');
    }
    if (!Number.isFinite(Date.parse(set.loggedAt))) errors.push('Every completed set requires a valid recorded time.');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
