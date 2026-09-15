import type { WorkoutDraft } from './contracts';

// The legacy PR table is pounds-only. Never relabel assistance/bodyweight or
// assign a completed pre-swap set to the replacement exercise.
export function externalActualSets(draft: WorkoutDraft, exerciseId: string) {
  return draft.slots.flatMap((slot) => slot.sets)
    .filter((set) => set.logged && set.actualExerciseId === exerciseId && set.loadKind === 'external'
      && (set.loadUnit === 'lb' || set.loadUnit === 'kg') && set.actualLoad !== null && (set.actualReps ?? 0) > 0)
    .map((set) => ({ weightLb: set.actualLoad! * (set.loadUnit === 'kg' ? 2.2046226218 : 1), reps: set.actualReps! }));
}
