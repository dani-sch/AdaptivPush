import type { ProgramWorkout } from '@/types/program';
import type { WorkoutSummary } from '@/components/NextWorkoutCard';
import { visibleProgramExercises } from './visibleProgramExercises';

export function summarizeWorkout(workout: ProgramWorkout): WorkoutSummary {
  return {
    id: workout.stableDayId ?? workout.id,
    name: workout.name,
    durationMinutes: workout.estimatedTime || 60,
    exercises: visibleProgramExercises(workout.exercises).map(exercise => ({
      id: exercise.stableSlotId ?? exercise.id,
      name: exercise.name,
      prescription: `${exercise.sets ?? 3}×${(exercise.reps ?? '8-12').replace('-', '–')}`,
    })),
  };
}
