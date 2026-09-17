import type { WorkoutExercise } from '@/types/program';

/** Display-only projection; command/draft creation retains complete original prescriptions. */
export function visibleProgramExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.filter(e => !e.removalMask?.removed).map(e => ({ ...e,
    sets: e.sets === undefined ? undefined : Math.max(0, e.sets - (e.removalMask?.orders.filter(order => order <= e.sets!).length ?? 0)),
  })).filter(e => e.sets !== 0);
}
