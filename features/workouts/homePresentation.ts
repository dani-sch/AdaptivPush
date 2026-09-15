export interface HomeExerciseItem {
  id: string;
  name: string;
  prescription: string;
}

export function visibleWorkoutExercises<T extends HomeExerciseItem>(
  exercises: T[],
  expanded: boolean,
): T[] {
  return expanded ? exercises : exercises.slice(0, 3);
}
