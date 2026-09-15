import type { FrozenWorkoutPrescription, SetOutcome, WorkoutDraftSlot, WorkoutDraft } from './contracts';
import type { CompletedWorkoutSetCorrection } from './correctionContracts';

export type WorkoutMode = 'in_progress' | 'completed_view' | 'completed_edit';
export type OccurrenceState = 'unstarted' | 'in_progress' | 'pending_sync' | 'finalized';

export function occurrenceState(draft: WorkoutDraft | null, sessionId?: string): OccurrenceState {
  if (sessionId || draft?.finalizedReceipt || draft?.lifecycle === 'finalized') return 'finalized';
  if (draft?.finalizationEndedAt) return 'pending_sync';
  return draft ? 'in_progress' : 'unstarted';
}

export function occurrenceAction(state: OccurrenceState, canCorrect = true): string {
  return state === 'finalized' ? canCorrect ? 'View or Update Workout' : 'View Workout'
    : state === 'pending_sync' ? 'Retry Sync' : state === 'in_progress' ? 'Continue Workout' : 'Start Workout';
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
  const exercises: OccurrenceExercise[] = (snapshot?.slots ?? []).map(slot => {
    const effective: WorkoutDraftSlot | undefined = snapshot?.effectiveSlots?.find(s => s.slotId === slot.slotId);
    const exerciseId = effective?.actualExerciseId ?? slot.prescribedExerciseId;
    const first = slot.sets[0];
    return {
      slotId: slot.slotId, exerciseId,
      name: names.get(exerciseId) ?? effective?.replacementExerciseName ?? slot.exerciseName ?? 'Prescribed exercise',
      prescription: `${slot.prescribedSetCount} × ${first ? `${first.plannedRepsMin}–${first.plannedRepsMax}` : 'prescribed reps'}`,
      sets: slot.sets.map(set => {
        const actual = actuals.find(a => a.actualSetId === set.setId
          || (a.prescriptionSlotId === slot.slotId && a.order === set.order));
        if (actual) consumed.add(actual.actualSetId);
        const saved = effective?.sets.find(s => s.setId === set.setId);
        const corrected = snapshot?.setOutcomes?.find(s => s.setId === set.setId);
        const outcome = actual ? 'performed' : corrected?.outcome ?? (saved?.outcome === 'skipped' ? 'skipped' : 'not_attempted');
        return {
          actualSetId: set.setId, prescriptionSlotId: slot.slotId,
          prescribedExerciseId: slot.prescribedExerciseId, exerciseId,
          order: set.order, reps: 0, loadValue: null, loadUnit: set.loadUnit,
          loadKind: set.loadKind, loadSide: set.loadSide, rpe: null, loggedAt: '',
          ...actual, outcome, prescribed: true,
        };
      }),
    };
  });
  for (const actual of actuals.filter(s => !consumed.has(s.actualSetId))) {
    let exercise = exercises.find(e => e.slotId === (actual.prescriptionSlotId ?? actual.exerciseId));
    if (!exercise) {
      exercise = { slotId: actual.prescriptionSlotId ?? actual.exerciseId, exerciseId: actual.exerciseId,
        name: names.get(actual.exerciseId) ?? 'Recorded exercise', prescription: 'Recorded sets', sets: [] };
      exercises.push(exercise);
    }
    exercise.sets.push({ ...actual, outcome: 'performed', prescribed: false });
  }
  return { exercises, missingPrescription: !snapshot?.slots?.length };
}
