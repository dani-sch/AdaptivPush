import { createOperationId } from '../kernel/operationId';
import { nextRevision } from '../kernel/revisions';
import type { FrozenWorkoutPrescription, WorkoutDraft, WorkoutDraftSlot, WorkoutActualSet } from './contracts';
import type { OccurrenceExercise, OccurrenceSet } from './effectiveOccurrence';
import type { EditableCorrectionSet } from './correctionEditor';
import type { ProgramRemovalRequest } from './removals';
import { emptyRemovals } from './removals';
import type { RemovalPreview } from './removalRepository';

export function addWorkoutSet(draft: WorkoutDraft, slotId: string): WorkoutDraft {
  if (draft.finalizationEndedAt || draft.lifecycle !== 'draft') throw new Error('This workout is awaiting synchronization.');
  const slot = draft.slots.find(s => s.slotId === slotId);
  if (!slot) throw new Error('Exercise identity is missing.');
  const prior = slot.sets.at(-1);
  const set: WorkoutActualSet = {
    setId: createOperationId(), order: Math.max(0, ...slot.sets.map(s => s.order)) + 1,
    plannedRepsMin: prior?.plannedRepsMin ?? 8, plannedRepsMax: prior?.plannedRepsMax ?? 12, plannedLoad: null,
    loadKind: prior?.loadKind ?? 'external', loadUnit: prior?.loadUnit ?? 'lb', loadSide: prior?.loadSide ?? 'unknown',
    actualExerciseId: slot.actualExerciseId, actualExerciseName: slot.replacementExerciseName ?? slot.exerciseName,
    logged: false, outcome: 'not_attempted', loggedAt: null, actualLoad: null, actualReps: null, actualRpe: null,
    enteredLoadText: '', enteredRepsText: '', enteredRpeText: '',
  };
  return { ...draft, structureVersion: 1, revision: nextRevision(draft.revision), slots: draft.slots.map(s => s.slotId === slotId ? { ...s, sets: [...s.sets, set] } : s) };
}

export function addWorkoutExercise(draft: WorkoutDraft, exercise: { id: string; name: string }): WorkoutDraft {
  const slotId = createOperationId();
  const slot: WorkoutDraftSlot = { slotId, actualExerciseId: exercise.id, prescribedExerciseId: exercise.id,
    exerciseName: exercise.name, order: Math.max(0, ...draft.slots.map(s => s.order)) + 1, prescribedSetCount: 0, sets: [] };
  return addWorkoutSet({ ...draft, slots: [...draft.slots, slot] }, slotId);
}

export function addWorkoutExerciseWithScope(draft: WorkoutDraft, exercise: { id: string; name: string },
  wholeProgram: boolean, preview?: RemovalPreview): WorkoutDraft {
  const next = addWorkoutExercise(draft, exercise);
  if (!wholeProgram) return next;
  if (!preview?.futureCount) throw new Error('No eligible future workouts.');
  if (preview.programId !== draft.programId || preview.currentStableDayId !== draft.stableDayId
    || (draft.programRemoval && draft.programRemoval.expectedRevisionId !== preview.expectedRevisionId)) {
    throw new Error('The program changed. Your existing changes are preserved. Reopen Add exercise.');
  }
  next.removals ??= emptyRemovals();
  next.programRemoval = { ...preview, ...draft.programRemoval, targets: draft.programRemoval?.targets ?? [],
    additions: [...(draft.programRemoval?.additions ?? []), { slotId: next.slots.at(-1)!.slotId, exerciseId: exercise.id, setCount: 1 }] };
  return next;
}

export function composeProgramSwap(current: ProgramRemovalRequest | undefined, context: Omit<ProgramRemovalRequest, 'targets'>,
  slotId: string, exerciseId: string, wholeProgram: boolean, addedOccurrence = false): ProgramRemovalRequest | undefined {
  if (current && (current.expectedRevisionId !== context.expectedRevisionId || current.programId !== context.programId)) {
    throw new Error('The program changed elsewhere. Your changes are preserved; reload its scope before saving.');
  }
  if (!wholeProgram && !current) return undefined;
  const next = { ...context, ...current, targets: current?.targets ?? [] };
  if (next.additions?.some(a => a.slotId === slotId)) return { ...next,
    additions: wholeProgram ? next.additions.map(a => a.slotId === slotId ? { ...a, exerciseId } : a) : next.additions };
  if (addedOccurrence) return wholeProgram ? { ...next, additions: [...(next.additions ?? []), { slotId, exerciseId, setCount: 1 }] } : current;
  return { ...next, swaps: [...(next.swaps ?? []).filter(s => s.slotId !== slotId), ...(wholeProgram ? [{ slotId, exerciseId }] : [])] };
}

/** Effective structure is separate from immutable prescriptions and actual performance. */
export function correctionEffectiveSlots(snapshot: FrozenWorkoutPrescription | null,
  exercises: (Omit<OccurrenceExercise, 'sets'> & { sets: EditableCorrectionSet[] })[]): WorkoutDraftSlot[] {
  const slots: WorkoutDraftSlot[] = (snapshot?.slots ?? []).map(slot => ({ ...slot, actualExerciseId: slot.prescribedExerciseId,
    ...snapshot?.effectiveSlots?.find(s => s.slotId === slot.slotId), sets: [] }));
  for (const exercise of exercises) {
    let slot = slots.find(s => s.slotId === exercise.slotId);
    if (!slot) { slot = { slotId: exercise.slotId, prescribedExerciseId: exercise.exerciseId, actualExerciseId: exercise.exerciseId,
      exerciseName: exercise.name, order: slots.length + 1, prescribedSetCount: 0, sets: [] }; slots.push(slot); }
    slot.actualExerciseId = exercise.exerciseId; slot.replacementExerciseName = exercise.name;
    slot.sets = exercise.sets.map(set => ({
      setId: set.actualSetId, order: set.order, plannedRepsMin: 0, plannedRepsMax: 0, plannedLoad: null,
      ...snapshot?.slots.find(s => s.slotId === slot.slotId)?.sets.find(s => s.setId === set.actualSetId),
      actualExerciseId: set.exerciseId, loadKind: set.loadKind, loadUnit: set.loadUnit, loadSide: set.loadSide,
      logged: set.outcome === 'performed', outcome: set.outcome, loggedAt: set.loggedAt || null,
      actualLoad: set.outcome === 'performed' && set.loadText.trim() ? Number(set.loadText) : null,
      actualReps: set.outcome === 'performed' ? Number(set.repsText) : null,
      actualRpe: set.outcome === 'performed' && set.rpeText.trim() ? Number(set.rpeText) : null,
      enteredLoadText: set.loadText, enteredRepsText: set.repsText, enteredRpeText: set.rpeText,
    }));
  }
  return slots;
}

export function occurrenceSetFromEffective(set: WorkoutActualSet, slot: WorkoutDraftSlot, prescribed: boolean): OccurrenceSet {
  return { actualSetId: set.setId, prescriptionSlotId: slot.slotId,
    prescribedExerciseId: prescribed ? slot.prescribedExerciseId : slot.prescribedSetCount ? slot.prescribedExerciseId : null,
    exerciseId: set.actualExerciseId, order: set.order, reps: 0, loadValue: null, rpe: null, loggedAt: '',
    loadKind: set.loadKind, loadUnit: set.loadUnit, loadSide: set.loadSide, prescribed,
    outcome: set.outcome === 'skipped' ? 'skipped' : 'not_attempted',
    enteredLoadText: set.enteredLoadText, enteredRepsText: set.enteredRepsText, enteredRpeText: set.enteredRpeText };
}
