import type { Exercise } from '@/components/ExerciseCard';
import type { WorkoutDraft } from './contracts';
import type { ProgramWorkout } from '@/types/program';

export function draftToExercises(draft: WorkoutDraft, workout?: ProgramWorkout): Exercise[] {
  return draft.slots.map((slot) => {
    const current = workout?.exercises.find((exercise) => exercise.stableSlotId === slot.slotId);
    const frozen = draft.frozenPrescription.slots.find((candidate) => candidate.slotId === slot.slotId);
    const originalExerciseName = frozen?.exerciseName ?? current?.name ?? 'the original exercise';
    const firstSet = slot.sets[0];
    const frozenRepDisplay = firstSet
      ? firstSet.plannedRepsMin === firstSet.plannedRepsMax
        ? String(firstSet.plannedRepsMin)
        : `${firstSet.plannedRepsMin}–${firstSet.plannedRepsMax}`
      : 'prescribed reps';
    const repDisplay = current?.reps?.replace("-", "–") ?? frozenRepDisplay;
    return {
      id: slot.slotId,
      exerciseId: slot.actualExerciseId,
      name: slot.actualExerciseId !== slot.prescribedExerciseId
        ? slot.replacementExerciseName ?? "Replacement exercise"
        : current?.name ?? slot.exerciseName ?? "Prescribed exercise",
      prescription: `${slot.prescribedSetCount}×${repDisplay}`,
      readOnly: Boolean(draft.finalizationEndedAt) || draft.lifecycle === 'finalized',
      loadLabel: firstSet?.loadUnit === 'kg' ? 'KG' : firstSet?.loadUnit === 'lb' ? 'LBS' : 'LOAD',
      muscleGroup: current?.muscleGroup,
      imageUrl: current?.imageUrl,
      description: current?.description,
      sets: slot.sets.map((set) => ({
        id: set.setId,
        weight: set.enteredLoadText,
        reps: set.enteredRepsText,
        rpe: set.enteredRpeText,
        logged: set.logged,
        outcome: set.outcome ?? (set.logged ? 'performed' : 'not_attempted'),
        loadUnit: set.loadUnit,
        exerciseName: set.actualExerciseName ?? (set.actualExerciseId === slot.actualExerciseId
          ? slot.replacementExerciseName ?? current?.name ?? slot.exerciseName
          : originalExerciseName),
      })),
      completed: slot.sets.length > 0 && slot.sets.every((set) => set.logged),
      loadSuggestion: slot.loadSuggestion
        ? `Previous ${slot.loadSuggestion.kind === 'assistance' ? 'assistance' : 'load'} for this exercise: ${slot.loadSuggestion.value} ${slot.loadSuggestion.unit}`
        : undefined,
    };
  });
}

