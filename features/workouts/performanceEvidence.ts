import type { FrozenWorkoutPrescription } from './contracts';

/** Omission in another exercise is not failure evidence for this exercise. */
export function hasOriginalExerciseEvidence(snapshot: FrozenWorkoutPrescription | null | undefined, exerciseId: string,
  actuals: { prescription_slot_id: string | null; order_index: number | null }[]): boolean {
  if (!snapshot?.slots?.length) return false;
  const slots = snapshot.slots.filter(slot => (snapshot.effectiveSlots?.find(s => s.slotId === slot.slotId)?.actualExerciseId ?? slot.prescribedExerciseId) === exerciseId);
  return slots.length > 0 && slots.every(slot => slot.sets?.length === slot.prescribedSetCount && slot.sets.length > 0
    && slot.sets.every(set => actuals.some(actual => actual.prescription_slot_id === slot.slotId && actual.order_index === set.order)));
}
