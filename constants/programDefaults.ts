import type { TrainingExperience } from '@/types/database';
import type { MuscleGroup, TrainingGoal } from '@/types/program';

export interface GoalParams {
  sets: number;
  repMin: number;
  repMax: number;
  rpe: number;
  weightMultiplier: number;
}

export interface ExperienceModifier {
  setsMultiplier: number;
  rpeOffset: number;
}

export type ProgramSplitDayType =
  | 'Full Body'
  | 'Upper'
  | 'Upper A'
  | 'Upper B'
  | 'Lower'
  | 'Lower A'
  | 'Lower B'
  | 'Push'
  | 'Push A'
  | 'Push B'
  | 'Pull'
  | 'Pull A'
  | 'Pull B'
  | 'Legs'
  | 'Legs A'
  | 'Legs B'
  | 'Full Body Deload';

export interface SplitDayDefinition {
  type: ProgramSplitDayType;
  muscleGroups: MuscleGroup[];
  compoundEmphasis: boolean;
}

export interface GeneratorDefaults {
  compoundPrioritySlots: number;
  deloadEveryWeeks: number;
  deloadWeightFactor: number;
  deloadRpeReduction: number;
  progressiveOverloadPerWeek: number;
  periodizationRpeRampDelta: number;
  accessorySetReduction: number;
  accessoryRpeReduction: number;
  cyclePhaseSetReduction: number;
  cyclePhaseRpeReduction: number;
  minSets: number;
  minRpe: number;
  maxRpe: number;
  minutesPerSet: number;
  transitionMinutesPerExercise: number;
  minExercisesPerDay: number;
  lowFrequencyExerciseCount: number;
  mediumFrequencyExerciseCount: number;
  highFrequencyExerciseCount: number;
  lowFrequencyMaxDays: number;
  mediumFrequencyMaxDays: number;
}

export const GOAL_PARAMS: Readonly<Record<TrainingGoal, GoalParams>> = {
  strength: { sets: 5, repMin: 3, repMax: 5, rpe: 8.5, weightMultiplier: 1.0 },
  hypertrophy: { sets: 4, repMin: 8, repMax: 12, rpe: 7.5, weightMultiplier: 0.75 },
  endurance: { sets: 3, repMin: 15, repMax: 20, rpe: 6.0, weightMultiplier: 0.5 },
  fat_loss: { sets: 3, repMin: 12, repMax: 15, rpe: 7.0, weightMultiplier: 0.6 },
  general_fitness: { sets: 3, repMin: 8, repMax: 12, rpe: 7.0, weightMultiplier: 0.7 },
};

export const EXPERIENCE_MODIFIERS: Readonly<Record<TrainingExperience, ExperienceModifier>> = {
  beginner: { setsMultiplier: 0.85, rpeOffset: -1.0 },
  intermediate: { setsMultiplier: 1.0, rpeOffset: 0.0 },
  advanced: { setsMultiplier: 1.15, rpeOffset: 0.5 },
};

export const SPLIT_DAYS: Readonly<Record<ProgramSplitDayType, SplitDayDefinition>> = {
  'Full Body': {
    type: 'Full Body',
    muscleGroups: ['Legs', 'Chest', 'Back', 'Shoulders', 'Core'],
    compoundEmphasis: true,
  },
  'Full Body Deload': {
    type: 'Full Body Deload',
    muscleGroups: ['Legs', 'Chest', 'Back', 'Shoulders', 'Core'],
    compoundEmphasis: false,
  },
  Upper: {
    type: 'Upper',
    muscleGroups: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
    compoundEmphasis: true,
  },
  'Upper A': {
    type: 'Upper A',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps'],
    compoundEmphasis: true,
  },
  'Upper B': {
    type: 'Upper B',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps'],
    compoundEmphasis: false,
  },
  Lower: {
    type: 'Lower',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    compoundEmphasis: true,
  },
  'Lower A': {
    type: 'Lower A',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    compoundEmphasis: true,
  },
  'Lower B': {
    type: 'Lower B',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    compoundEmphasis: false,
  },
  Push: {
    type: 'Push',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    compoundEmphasis: true,
  },
  'Push A': {
    type: 'Push A',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    compoundEmphasis: true,
  },
  'Push B': {
    type: 'Push B',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    compoundEmphasis: false,
  },
  Pull: {
    type: 'Pull',
    muscleGroups: ['Back', 'Biceps'],
    compoundEmphasis: true,
  },
  'Pull A': {
    type: 'Pull A',
    muscleGroups: ['Back', 'Biceps'],
    compoundEmphasis: true,
  },
  'Pull B': {
    type: 'Pull B',
    muscleGroups: ['Back', 'Biceps'],
    compoundEmphasis: false,
  },
  Legs: {
    type: 'Legs',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    compoundEmphasis: true,
  },
  'Legs A': {
    type: 'Legs A',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    compoundEmphasis: true,
  },
  'Legs B': {
    type: 'Legs B',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    compoundEmphasis: false,
  },
};

export const SPLIT_STRUCTURE: Readonly<Record<number, ProgramSplitDayType[]>> = {
  1: ['Full Body'],
  2: ['Upper', 'Lower'],
  3: ['Push', 'Pull', 'Legs'],
  4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
  7: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', 'Full Body Deload'],
};

export const DAY_INDEXES: Readonly<Record<number, number[]>> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export const WORKOUT_NAMES: Readonly<Record<ProgramSplitDayType, string>> = {
  'Full Body': 'Full Body',
  'Full Body Deload': 'Full Body (Deload)',
  Upper: 'Upper Body',
  'Upper A': 'Upper Body A',
  'Upper B': 'Upper Body B',
  Lower: 'Lower Body',
  'Lower A': 'Lower Body A',
  'Lower B': 'Lower Body B',
  Push: 'Push Day',
  'Push A': 'Push Day A',
  'Push B': 'Push Day B',
  Pull: 'Pull Day',
  'Pull A': 'Pull Day A',
  'Pull B': 'Pull Day B',
  Legs: 'Leg Day',
  'Legs A': 'Leg Day A',
  'Legs B': 'Leg Day B',
};

export const GOAL_LABELS: Readonly<Record<TrainingGoal, string>> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Endurance',
  fat_loss: 'Fat Loss',
  general_fitness: 'General Fitness',
};

export const COMPOUND_EQUIPMENT: ReadonlySet<string> = new Set(['Barbell', 'Dumbbell']);

export const GENERATOR_DEFAULTS: GeneratorDefaults = {
  compoundPrioritySlots: 2,
  deloadEveryWeeks: 4,
  deloadWeightFactor: 0.7,
  deloadRpeReduction: 2.0,
  progressiveOverloadPerWeek: 0.05,
  periodizationRpeRampDelta: 1.5,
  accessorySetReduction: 1,
  accessoryRpeReduction: 0.5,
  cyclePhaseSetReduction: 1,
  cyclePhaseRpeReduction: 0.5,
  minSets: 2,
  minRpe: 5.0,
  maxRpe: 10.0,
  minutesPerSet: 2.5,
  transitionMinutesPerExercise: 2,
  minExercisesPerDay: 3,
  lowFrequencyExerciseCount: 6,
  mediumFrequencyExerciseCount: 5,
  highFrequencyExerciseCount: 4,
  lowFrequencyMaxDays: 2,
  mediumFrequencyMaxDays: 4,
};
