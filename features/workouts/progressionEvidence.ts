import type { FrozenWorkoutPrescription } from './contracts';

export interface ProgressionSessionEvidence {
  id: string;
  endedAt: string | null;
  prescriptionSnapshot: FrozenWorkoutPrescription | null;
  source: 'program' | 'ad_hoc';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFrozenWorkoutPrescription(value: unknown): value is FrozenWorkoutPrescription {
  return isRecord(value)
    && typeof value.revisionId === 'string'
    && typeof value.programDayId === 'string'
    && typeof value.workoutName === 'string'
    && Array.isArray(value.slots);
}

export function asFrozenWorkoutPrescription(value: unknown): FrozenWorkoutPrescription | null {
  if (!isFrozenWorkoutPrescription(value)) return null;
  return value;
}

export function toAdHocProgressionEvidence(value: unknown): ProgressionSessionEvidence | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || (value.ended_at !== null && typeof value.ended_at !== 'string')) {
    return null;
  }
  return {
    id: value.id,
    endedAt: value.ended_at,
    prescriptionSnapshot: null,
    source: 'ad_hoc',
  };
}

function timestamp(value: ProgressionSessionEvidence | null): number {
  if (!value?.endedAt) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value.endedAt);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function selectLatestProgressionEvidence(
  programSession: ProgressionSessionEvidence | null,
  adHocSession: ProgressionSessionEvidence | null,
): ProgressionSessionEvidence | null {
  if (!programSession) return adHocSession;
  if (!adHocSession) return programSession;
  return timestamp(adHocSession) > timestamp(programSession) ? adHocSession : programSession;
}

export function hasRequiredAdHocSetCoverage(actualSetCount: number, requiredSetCount: number): boolean {
  return Number.isSafeInteger(actualSetCount)
    && Number.isSafeInteger(requiredSetCount)
    && actualSetCount >= requiredSetCount;
}
