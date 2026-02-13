export type MuscleGroup =
    | 'Chest'
    | 'Back'
    | 'Shoulders'
    | 'Biceps'
    | 'Triceps'
    | 'Legs'
    | 'Glutes'
    | 'Core'
    | 'Full Body';

export type Equipment =
    | 'Barbell'
    | 'Dumbbell'
    | 'Machine'
    | 'Cable'
    | 'Bodyweight'
    | 'Band'
    | 'Kettlebell'
    | 'Other';

export type WorkoutExercise = {
    id: string;
    name: string;

    sets?: number;
    reps?: string;
    weight?: number;

    muscleGroup?: MuscleGroup;
    equipment?: Equipment;
};

export type ProgramWorkout = {
    id: string;
    name: string;
    day: string;            // e.g. "Monday"
    estimatedTime: number;  // minutes
    exercises: WorkoutExercise[];
};

export type CurrentProgram = {
    id: string;
    name: string;
    goal: string;
    currentWeek: number;
    totalWeeks: number;
    daysPerWeek: number;
    workouts: ProgramWorkout[];
};


