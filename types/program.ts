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
    id: string;         // program_day_exercises.id (used for swap targeting)
    exerciseId?: string; // exercises.id (used for DB set writes)
    name: string;

    sets?: number;
    reps?: string;
    weight?: number;
    /** Per-set weight overrides (lb). When present, set i uses perSetWeights[i] instead of weight. */
    perSetWeights?: number[];
    targetRpe?: number | null;

    muscleGroup?: MuscleGroup;
    equipment?: Equipment;
};

export type ProgramWorkout = {
    id: string;
    name: string;
    day: string;            // e.g. "Monday"
    estimatedTime: number;  // minutes
    exercises: WorkoutExercise[];
    isCompleted?: boolean;  // true if a workout_session exists for this day in the current week
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

export type TrainingGoal =
  | 'strength'
  | 'hypertrophy'
  | 'endurance'
  | 'fat_loss'
  | 'general_fitness';

export interface ProgramGenParams {
  daysPerWeek: number;           // 1–7
  durationWeeks: number;         // allowed: 4, 6, 8, 10, 12, 16
  goal: TrainingGoal;
  focusMuscleGroups: MuscleGroup[];
  /** Desired session length in minutes. null = no cap (90+ option). */
  targetSessionMinutes?: number | null;
}

export interface GeneratedExerciseSlot {
  localExerciseId: string;       // matches LocalExercise.id
  exerciseName: string;          // denormalized for DB upsert
  position: number;
  setCount: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRPE: number;
  suggestedWeightLb: number;
}

export interface GeneratedProgramDay {
  weekNumber: number;
  dayIndex: number;              // 1 = Monday, 7 = Sunday
  orderInWeek: number;
  workoutName: string;
  estimatedDurationMin: number;
  exercises: GeneratedExerciseSlot[];
}

export interface GeneratedProgram {
  name: string;
  goal: TrainingGoal;
  durationWeeks: number;
  daysPerWeek: number;
  days: GeneratedProgramDay[];   // all weeks × days
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  workoutName: string;
  completedAt: string;           // ISO string
  sets: Array<{
    setNumber: number;
    weightLb: number | null;
    reps: number | null;
    rpe: number | null;
  }>;
  totalVolumeLb: number;
}


