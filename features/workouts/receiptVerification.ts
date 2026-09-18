import type { CompletedWorkoutCorrectionRequest, CompletedWorkoutCorrectionReceipt, CompletedWorkoutSetCorrection } from './correctionContracts';
import type { FrozenWorkoutPrescription } from './contracts';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function sameStoredStructure(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }

export function verifyCorrectionReceipt(request: CompletedWorkoutCorrectionRequest, receipt: CompletedWorkoutCorrectionReceipt,
  saved: { revision: number; snapshot: FrozenWorkoutPrescription | null; sets: CompletedWorkoutSetCorrection[] }): void {
  if (receipt.operationId !== request.operationId || receipt.sessionId !== request.sessionId || receipt.revision !== request.expectedRevision + 1
    || receipt.setCount !== request.sets.length || saved.revision !== receipt.revision || saved.sets.length !== request.sets.length) {
    throw new Error('Workout confirmation does not match the submitted update. Exact recovery is preserved.');
  }
  if (request.effectiveSlots && !sameStoredStructure(request.effectiveSlots, saved.snapshot?.effectiveSlots)) {
    throw new Error('Saved workout structure does not match the submitted update. Exact recovery is preserved.');
  }
  for (const expected of request.sets) {
    const actual = saved.sets.find(s => s.actualSetId === expected.actualSetId);
    if (!actual || ['exerciseId','prescriptionSlotId','order','reps','loadValue','loadUnit','loadKind','loadSide','rpe'].some(key =>
      actual[key as keyof CompletedWorkoutSetCorrection] !== expected[key as keyof CompletedWorkoutSetCorrection])) {
      throw new Error('Saved set does not match the submitted update. Exact recovery is preserved.');
    }
  }
}
