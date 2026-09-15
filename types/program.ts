import type { LoadKind, LoadUnit, LoadSide } from '@/features/workouts/contracts';
import type { ExplanationMetadata } from '@/types/evidence';

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
    stableSlotId?: string; // immutable prescription slot identity
    exerciseId?: string; // exercises.id (used for DB set writes)
    name: string;

    sets?: number;
    reps?: string;
    weight?: number;
    loadKind?: LoadKind;
    loadUnit?: LoadUnit;
    loadSide?: LoadSide;
    loadSuggestion?: {
        value: number;
        unit: 'lb' | 'kg';
        kind: 'external' | 'assistance';
        side: LoadSide;
    };
    /** Per-set weight overrides (lb). When present, set i uses perSetWeights[i] instead of weight. */
    perSetWeights?: number[];
    targetRpe?: number | null;

    muscleGroup?: MuscleGroup;
    equipment?: Equipment;

    imageUrl?: string;    // RapidAPI image endpoint URL (key added at request time)
    description?: string; // first instruction sentence
};

export interface GeneratedExerciseExplanation extends ExplanationMetadata {
  slotType: 'compound' | 'accessory';
}

export interface GeneratedProgramDayExplanation extends ExplanationMetadata {
  splitType: string;
  isDeloadWeek: boolean;
  targetExerciseCount: number;
}

export interface GeneratedProgramExplanation extends ExplanationMetadata {
  targetExercisesPerDay: number;
  deloadEveryWeeks: number;
}

export type ProgramWorkout = {
    sessionId?: string;
    isFinalized?: boolean;
    completionClass?: string;
    id: string;
    stableDayId?: string;
    prescriptionRevisionId?: string;
    name: string;
    day: string;            // e.g. "Monday"
    estimatedTime: number;  // minutes
    exercises: WorkoutExercise[];
    isCompleted?: boolean;  // full/reduced prescription fulfillment; partial finalization is separate
};

export type CurrentProgram = {
    id: string;
    currentRevision: number;
    currentRevisionId?: string;
    name: string;
    goal: string;
    currentWeek: number;
    totalWeeks: number;
    daysPerWeek: number;
    swapIntervalWeeks?: number;
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
  /** How often (in weeks) to prompt accessory swaps. Default 4. */
  swapIntervalWeeks?: number;
}

export interface GeneratedExerciseSlot {
  localExerciseId: string;       // matches LocalExercise.id
  exerciseName: string;          // display name used by the compatibility resolver; never a write authority
  exerciseDbId?: string;         // stable source ID when display name is not an exact catalog identity
  position: number;
  setCount: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRPE: number;
  suggestedWeightLb: number;
  explanation?: GeneratedExerciseExplanation;
}

export interface GeneratedProgramDay {
  weekNumber: number;
  dayIndex: number;              // 1 = Monday, 7 = Sunday
  orderInWeek: number;
  workoutName: string;
  estimatedDurationMin: number;
  exercises: GeneratedExerciseSlot[];
  explanation?: GeneratedProgramDayExplanation;
}

export interface GeneratedProgram {
  name: string;
  goal: TrainingGoal;
  durationWeeks: number;
  daysPerWeek: number;
  days: GeneratedProgramDay[];   // all weeks × days
  explanation?: GeneratedProgramExplanation;
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  workoutName: string;
  completedAt: string;           // ISO string
  sets: {
    setNumber: number;
    weightLb: number | null;
    reps: number | null;
    rpe: number | null;
  }[];
  totalVolumeLb: number;
}
