import type { TrainingExperience } from './database';

export interface LoggedSet {
  setNumber: number;
  weightLb: number;
  reps: number;
  rpe: number | null;
}

export interface ProgressionContext {
  pdeId: string;                       // program_day_exercises.id being updated
  exerciseName: string;
  currentWeightLb: number;
  currentRepMin: number;
  currentRepMax: number;
  currentTargetRPE: number | null;     // target_rpe from program_day_exercises; null if unset
  experienceLevel: TrainingExperience;
  lastSessionSets: LoggedSet[];        // sets from the most recent logged session
  readinessScore: number | null;       // 0–10 composite; null if no recent check-in
}

export interface ProgressionResult {
  suggestedWeightLb: number;
  repRangeMin: number;
  repRangeMax: number;
  suggestedRPE: number | null;         // adjusted target RPE; null when no baseline RPE exists
  action: 'increase' | 'hold' | 'decrease';
  reason: string;                      // human-readable, useful for debugging/logging
}
