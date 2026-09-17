import type { FrozenWorkoutPrescription, SetOutcome, WorkoutDraftSlot, WorkoutDraft } from './contracts';
import type { CompletedWorkoutSetCorrection } from './correctionContracts';

import { isRemoved } from './removals';

export type WorkoutMode = 'in_progress' | 'completed_view' | 'completed_edit';
export type OccurrenceState = 'unstarted' | 'in_progress' | 'pending_sync' | 'finalized';

export function isPrescriptionFulfilled(completionClass?: string): boolean {
  return completionClass === 'complete' || completionClass === 'reduced';
}

export function occurrenceState(draft: WorkoutDraft | null, sessionId?: string): OccurrenceState {
  if (sessionId || draft?.finalizedReceipt || draft?.lifecycle === 'finalized') return 'finalized';
  if (draft?.finalizationEndedAt) return 'pending_sync';
  return draft ? 'in_progress' : 'unstarted';
}

export function occurrenceAction(state: OccurrenceState, canCorrect = true): string {
  return state === 'finalized' ? canCorrect ? 'View or Update Workout' : 'View Workout'
    : state === 'pending_sync' ? 'Retry Sync' : state === 'in_progress' ? 'Continue Workout' : 'Start Workout';
}

/** A modal dismissal admits exactly one route push, including repeated native callbacks. */
export function createCompletedNavigation() {
  let target: string | null = null;
  let busy = false;
  return {
    request(sessionId: string) { if (busy) return false; busy = true; target = sessionId; return true; },
    dismiss() { const result = target; target = null; return result; },
    pending() { return target !== null; },
    reset() { target = null; busy = false; },
  };
}

export interface OccurrenceSet extends CompletedWorkoutSetCorrection {
  outcome: SetOutcome;
  prescribed: boolean;
}
export interface OccurrenceExercise {
  slotId: string;
  exerciseId: string;
  name: string;
  prescription: string;
  sets: OccurrenceSet[];
}

/** Durable actual rows win over snapshot outcomes; a correction never relies on a local draft. */
export function projectCompletedOccurrence(
  snapshot: FrozenWorkoutPrescription | null,
  actuals: CompletedWorkoutSetCorrection[],
  names: ReadonlyMap<string, string> = new Map(),
): { exercises: OccurrenceExercise[]; missingPrescription: boolean } {
  const consumed = new Set<string>();
  const exercises: OccurrenceExercise[] = (snapshot?.slots ?? []).filter(slot => !isRemoved(snapshot?.removals, slot.slotId)).map(slot => {
    const effective: WorkoutDraftSlot | undefined = snapshot?.effectiveSlots?.find(s => s.slotId === slot.slotId);
    const exerciseId = effective?.actualExerciseId ?? slot.prescribedExerciseId;
    const first = slot.sets?.[0];
    return {
      slotId: slot.slotId, exerciseId,
      name: names.get(exerciseId) ?? effective?.replacementExerciseName ?? slot.exerciseName ?? 'Prescribed exercise',
      prescription: `${(slot.sets ?? []).filter(set => !isRemoved(snapshot?.removals, slot.slotId, set.setId)).length} × ${first ? `${first.plannedRepsMin}–${first.plannedRepsMax}` : 'prescribed reps'}`,
      sets: (slot.sets ?? []).filter(set => !isRemoved(snapshot?.removals, slot.slotId, set.setId)).map(set => {
        const actual = actuals.find(a => a.actualSetId === set.setId
          || (a.prescriptionSlotId === slot.slotId && a.order === set.order));
        if (actual) consumed.add(actual.actualSetId);
        const saved = effective?.sets?.find(s => s.setId === set.setId);
        const corrected = snapshot?.setOutcomes?.find(s => s.setId === set.setId);
        const outcome = actual ? 'performed' : corrected?.outcome ?? (saved?.outcome === 'skipped' ? 'skipped' : 'not_attempted');
        return {
          prescriptionSlotId: slot.slotId,
          prescribedExerciseId: slot.prescribedExerciseId, exerciseId,
          order: set.order, reps: 0, loadValue: null, loadUnit: saved?.loadUnit ?? set.loadUnit ?? 'none',
          loadKind: saved?.loadKind ?? set.loadKind ?? 'unknown', loadSide: saved?.loadSide ?? set.loadSide ?? 'unknown', rpe: null, loggedAt: '',
          ...actual, actualSetId: set.setId, outcome, prescribed: true,
        };
      }),
    };
  });
  for (const actual of actuals.filter(s => !consumed.has(s.actualSetId) && !isRemoved(snapshot?.removals, s.prescriptionSlotId ?? s.exerciseId, s.actualSetId))) {
    let exercise = exercises.find(e => e.slotId === (actual.prescriptionSlotId ?? actual.exerciseId));
    if (!exercise) {
      exercise = { slotId: actual.prescriptionSlotId ?? actual.exerciseId, exerciseId: actual.exerciseId,
        name: names.get(actual.exerciseId) ?? 'Recorded exercise', prescription: 'Recorded sets', sets: [] };
      exercises.push(exercise);
    }
    exercise.sets.push({ ...actual, outcome: 'performed', prescribed: false });
  }
  for (const exercise of exercises) {
    const identities = new Set(exercise.sets.map(set => set.exerciseId));
    if (identities.size === 1 && exercise.sets.some(set => set.outcome === 'performed')) {
      exercise.exerciseId = exercise.sets[0].exerciseId;
      exercise.name = names.get(exercise.exerciseId) ?? exercise.name;
    }
  }
  return { exercises: exercises.filter(e => e.sets.length > 0), missingPrescription: !snapshot?.slots?.length || snapshot.slots.some(s => !s.sets?.length) };
}
