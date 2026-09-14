import { stableJson } from '../kernel/stableJson';
import type { LoadKind, LoadSide, LoadUnit } from '../workouts/contracts';

export const PROGRAM_SCHEMA_VERSION = 2 as const;
export const PROGRAM_POLICY_VERSION = 'program-install-v2' as const;
export const DEFAULT_PROGRAM_NAME = 'My Training Program';

export type ProgramSource = 'generated' | 'manual' | 'migration_snapshot';

export interface ProgramArtifactExercise {
  slotId: string;
  exerciseId: string;
  position: number;
  setCount: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRpe: number | null;
  suggestedLoad: number | null;
  loadUnit: LoadUnit;
  loadKind: LoadKind;
  loadSide: LoadSide;
  notes?: string | null;
}

export interface ProgramArtifactDay {
  dayId: string;
  weekNumber: number;
  dayIndex: number;
  orderInWeek: number;
  workoutName: string;
  estimatedDurationMin: number | null;
  isRestDay?: boolean;
  isDeloadWeek?: boolean;
  exercises: ProgramArtifactExercise[];
}

export interface ProgramArtifact {
  name: string;
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  source: ProgramSource;
  schemaVersion: number;
  catalogVersion: string;
  policyVersion: string;
  days: ProgramArtifactDay[];
  context: Record<string, unknown> | null;
  swapIntervalWeeks?: number;
}

export interface NormalizedProgramArtifact extends ProgramArtifact {
  schemaVersion: typeof PROGRAM_SCHEMA_VERSION;
}

export interface ProgramInstallationReceipt {
  operationId: string;
  programId: string;
  revisionId: string;
  revision: number;
  installedAt: string;
  replacedProgramId: string | null;
  replayed: boolean;
}

export type ProgramCommandOutcome =
  | { status: 'installed'; receipt: ProgramInstallationReceipt }
  | { status: 'replay'; receipt: ProgramInstallationReceipt }
  | { status: 'validation'; errors: string[] }
  | { status: 'conflict'; message: string; activeProgramId: string | null }
  | { status: 'unavailable'; message: string; failure: import('@/utils/supabaseResilience').SupabaseFailure };

export interface ProgramExerciseRevisionRequest {
  programId: string;
  expectedRevision: number;
  expectedRevisionId: string;
  currentStableDayId: string;
  currentStableSlotId: string;
  originalExerciseId: string;
  replacementExerciseId: string;
  includeCurrentDay: boolean;
}

export interface ProgramExerciseRevisionReceipt {
  operationId: string;
  programId: string;
  baseRevisionId: string;
  revisionId: string;
  revision: number;
  changedSlotCount: number;
  revisedAt: string;
  replayed: boolean;
}

export type ProgramExerciseRevisionOutcome =
  | { status: 'revised' | 'replay'; receipt: ProgramExerciseRevisionReceipt }
  | { status: 'validation'; errors: string[] }
  | { status: 'conflict'; message: string }
  | { status: 'unavailable'; message: string; failure: import('@/utils/supabaseResilience').SupabaseFailure };

export function normalizeProgramArtifact(
  input: ProgramArtifact & { depthMode?: unknown; entitlement?: unknown },
): NormalizedProgramArtifact {
  const {
    depthMode: _depthMode,
    entitlement: _entitlement,
    ...artifact
  } = input;
  return {
    ...artifact,
    name: artifact.name.trim() || DEFAULT_PROGRAM_NAME,
    goal: artifact.goal.trim() || 'general_fitness',
    schemaVersion: PROGRAM_SCHEMA_VERSION,
    policyVersion: artifact.policyVersion || PROGRAM_POLICY_VERSION,
    days: artifact.days.map((day) => ({
      ...day,
      workoutName: day.workoutName.trim() || `Day ${day.orderInWeek}`,
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    })),
  };
}

export function validateProgramArtifact(input: ProgramArtifact): { ok: boolean; errors: string[] } {
  const artifact = normalizeProgramArtifact(input);
  const errors: string[] = [];
  if (!Number.isInteger(artifact.durationWeeks) || artifact.durationWeeks < 1 || artifact.durationWeeks > 52) {
    errors.push('Duration must be between 1 and 52 weeks.');
  }
  if (!Number.isInteger(artifact.daysPerWeek) || artifact.daysPerWeek < 1 || artifact.daysPerWeek > 7) {
    errors.push('Days per week must be between 1 and 7.');
  }
  if (!artifact.catalogVersion || !artifact.policyVersion) errors.push('Catalog and policy versions are required.');
  if (artifact.days.length === 0) errors.push('A program must contain at least one trainable day.');
  const dayIds = new Set<string>();
  const slotIds = new Set<string>();
  for (const day of artifact.days) {
    if (!day.dayId || dayIds.has(day.dayId)) errors.push('Program day identities must be present and unique.');
    dayIds.add(day.dayId);
    if (!Number.isInteger(day.weekNumber) || day.weekNumber < 1 || day.weekNumber > artifact.durationWeeks) {
      errors.push('Every program day must be within the declared duration.');
    }
    if (!Number.isInteger(day.dayIndex) || day.dayIndex < 1 || day.dayIndex > 7) {
      errors.push('Every program day requires a valid day index.');
    }
    if (!day.isRestDay && day.exercises.length === 0) errors.push('Every workout day must contain a trainable exercise.');
    for (const exercise of day.exercises) {
      if (!exercise.slotId || slotIds.has(exercise.slotId)) errors.push('Prescription slot identities must be present and unique.');
      slotIds.add(exercise.slotId);
      if (!exercise.exerciseId) errors.push('Every prescription slot requires a resolved catalog exercise identity.');
      if (!Number.isInteger(exercise.setCount) || exercise.setCount < 1) errors.push('Every prescription requires at least one set.');
      if (!Number.isInteger(exercise.repRangeMin) || exercise.repRangeMin < 1 || exercise.repRangeMax < exercise.repRangeMin) {
        errors.push('Every prescription requires a valid rep range.');
      }
      if (exercise.targetRpe !== null && (!Number.isFinite(exercise.targetRpe) || exercise.targetRpe < 0 || exercise.targetRpe > 10)) {
        errors.push('Target RPE must be between 0 and 10.');
      }
      if (exercise.suggestedLoad !== null && (!Number.isFinite(exercise.suggestedLoad) || exercise.suggestedLoad < 0)) {
        errors.push('Suggested load must be finite and nonnegative.');
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function programArtifactCanonicalPayload(input: ProgramArtifact): string {
  return stableJson(normalizeProgramArtifact(input));
}
