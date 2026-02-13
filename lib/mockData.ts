import type { MuscleGroup, WorkoutExercise } from '@/types/program';

const baseExercise = (
    id: string,
    name: string,
    muscleGroup: MuscleGroup,
    equipment: WorkoutExercise['equipment'],
): WorkoutExercise => ({
    id,
    name,
    muscleGroup,
    equipment,
    sets: 3,
    reps: '8–12',
});

export const exerciseAlternatives: Record<MuscleGroup, WorkoutExercise[]> = {
    Chest: [
        { id: 'ch-1', name: 'Bench Press', sets: 3, reps: '8–10', muscleGroup: 'Chest', equipment: 'Barbell' },
    ],
    Back: [
        { id: 'bk-1', name: 'Lat Pulldown', sets: 3, reps: '10–12', muscleGroup: 'Back', equipment: 'Cable' },
    ],
    Shoulders: [],
    Biceps: [],
    Triceps: [],
    Legs: [],
    Glutes: [],
    Core: [],
    'Full Body': [],
};