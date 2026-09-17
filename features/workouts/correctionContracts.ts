import { createOperationId, type OperationId } from '../kernel/operationId';
import type { LoadKind, LoadSide, LoadUnit } from './contracts';

import type { WorkoutRemovals, ProgramRemovalRequest } from './removals';

export const WORKOUT_CORRECTION_SCHEMA_VERSION = 1 as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  removals?: WorkoutRemovals;
  programRemoval?: ProgramRemovalRequest;
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
    setOutcomes: input.setOutcomes ? structuredClone(input.setOutcomes) : undefined,
  };
}

export function validateCompletedWorkoutCorrection(
  request: CompletedWorkoutCorrectionRequest,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (request.schemaVersion !== WORKOUT_CORRECTION_SCHEMA_VERSION || !request.operationId || !request.ownerId || !request.sessionId || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
    errors.push('Owner, workout, and revision identity are required.');
  }
  const setIds = new Set<string>();
  const slotOrders = new Set<string>();
  for (const set of request.sets) {
    if (!uuid.test(set.actualSetId) || setIds.has(set.actualSetId)) errors.push('Completed set identities must be valid and unique.');
    setIds.add(set.actualSetId);
    if (!uuid.test(set.exerciseId)) errors.push('Every completed set requires a valid catalog exercise.');
    if ((set.prescriptionSlotId !== null && !uuid.test(set.prescriptionSlotId))
      || (set.prescribedExerciseId !== null && !uuid.test(set.prescribedExerciseId))) errors.push('Prescription identities must be valid.');
    if (!['external', 'bodyweight', 'assistance', 'unknown'].includes(set.loadKind)
      || !['lb', 'kg', 'none'].includes(set.loadUnit)
      || !['external_total', 'per_hand', 'combined', 'unilateral', 'unknown'].includes(set.loadSide)) {
      errors.push('Select a valid load type, unit, and side.');
    }
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
    if ((set.loadKind === 'bodyweight' || set.loadKind === 'unknown') && set.loadValue !== null && set.loadValue !== 0) {
      errors.push('Bodyweight and unknown loads cannot contain an external load.');
    }
    if (set.loadKind === 'assistance' && (set.loadValue === null || set.loadUnit === 'none')) {
      errors.push('Assistance requires a value and unit.');
    }
    if (set.rpe !== null && (!Number.isFinite(set.rpe) || set.rpe < 0 || set.rpe > 10)) {
      errors.push('RPE must be between 0 and 10.');
    }
    if (!Number.isFinite(Date.parse(set.loggedAt))) errors.push('Every completed set requires a valid recorded time.');
  }
  const outcomes = new Set<string>();
  const outcomeOrders = new Set<string>();
  for (const outcome of request.setOutcomes ?? []) {
    const orderKey = `${outcome.slotId}:${outcome.order}`;
    if (!outcome.setId || !outcome.slotId || !Number.isInteger(outcome.order) || outcome.order < 1
      || outcomes.has(outcome.setId) || outcomeOrders.has(orderKey)
      || !['performed', 'skipped', 'not_attempted'].includes(outcome.outcome)) {
      errors.push('Prescribed outcomes require unique set identities and ordering.');
    }
    outcomes.add(outcome.setId);
    outcomeOrders.add(orderKey);
    const actual = request.sets.find(set => set.actualSetId === outcome.setId);
    if ((outcome.outcome === 'performed') !== Boolean(actual)
      || (actual && (actual.prescriptionSlotId !== outcome.slotId || actual.order !== outcome.order))) {
      errors.push('Prescribed outcomes must match their performed results.');
    }
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
