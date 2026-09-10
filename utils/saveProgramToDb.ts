import type {
  DepthMode,
  JsonObject,
  JsonValue,
  ProgramGenerationContextInsert,
  ProgramGenerationContextMode,
  TrainingExperience,
} from '@/types/database';
import type { ProgramGenParams, GeneratedProgram } from '@/types/program';
import {
  LOCAL_CATALOG_SNAPSHOT_VERSION,
  type CatalogExerciseRequest,
} from '@/features/catalog/contracts';
import { resolveCatalogExerciseRequests } from '@/features/catalog/repository';
import { createOperationId } from '@/features/kernel/operationId';
import { requireRollout, rollout } from '@/features/kernel/rollout';
import { installProgram } from '@/features/programs/commands';
import {
  PROGRAM_POLICY_VERSION,
  PROGRAM_SCHEMA_VERSION,
  type ProgramArtifact,
} from '@/features/programs/contracts';
import { programRepository } from '@/features/programs/repository';

import { supabase } from '@/utils/supabase';
import { isMissingRelationOrColumnError } from '@/utils/profilePreferences';

const DEFAULT_POLICY_VERSION = 'phase2-baseline';
const DEFAULT_EVIDENCE_VERSION = 'phase1-evidence-baseline';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Program save failed';
};

interface SaveProgramToDbOptions {
  programGenerationContextMode?: ProgramGenerationContextMode;
}

interface ProgramContextProfileRow {
  experience_level: TrainingExperience | null;
  cycle_enabled: boolean | null;
  depth_mode?: DepthMode | null;
}

const toJsonValue = (value: unknown): JsonValue =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'
    ? value
    : Array.isArray(value)
      ? value.map(toJsonValue)
      : Object.fromEntries(
          Object.entries((value ?? {}) as Record<string, unknown>).map(([key, nestedValue]) => [
            key,
            toJsonValue(nestedValue),
          ]),
        );

const buildSplitRecommendation = (generated: GeneratedProgram): JsonObject => {
  const firstWeekDays = generated.days
    .filter((day) => day.weekNumber === 1)
    .map((day) => ({
      orderInWeek: day.orderInWeek,
      workoutName: day.workoutName,
      exerciseCount: day.exercises.length,
    }));

  return {
    firstWeekDays: toJsonValue(firstWeekDays),
    generatedWorkoutCount: firstWeekDays.length,
  };
};

const buildVolumeTargets = (generated: GeneratedProgram): JsonObject => {
  const weeklySetTargets = generated.days.reduce<Record<string, number>>((accumulator, day) => {
    const weekKey = String(day.weekNumber);
    const daySetTotal = day.exercises.reduce(
      (setTotal, exercise) => setTotal + exercise.setCount,
      0,
    );

    return {
      ...accumulator,
      [weekKey]: (accumulator[weekKey] ?? 0) + daySetTotal,
    };
  }, {});

  const totalExercises = generated.days.reduce(
    (exerciseTotal, day) => exerciseTotal + day.exercises.length,
    0,
  );

  return {
    averageExercisesPerDay:
      generated.days.length > 0 ? totalExercises / generated.days.length : 0,
    weeklySetTargets: toJsonValue(weeklySetTargets),
  };
};

const buildProgramGenerationContext = ({
  userId,
  programId,
  params,
  generated,
  profile,
}: {
  userId: string;
  programId: string;
  params: ProgramGenParams;
  generated: GeneratedProgram;
  profile: ProgramContextProfileRow | null;
}): ProgramGenerationContextInsert => {
  const depthMode: DepthMode = profile?.depth_mode ?? 'guided';
  const workoutNames = generated.days.map((day) => day.workoutName);
  const uniqueWorkoutNames = Array.from(new Set(workoutNames));
  const deloadWeeks = Array.from(
    new Set(
      generated.days
        .filter((day) => day.explanation?.isDeloadWeek)
        .map((day) => day.weekNumber),
    ),
  );

  return {
    program_id: programId,
    user_id: userId,
    policy_version: DEFAULT_POLICY_VERSION,
    evidence_version: DEFAULT_EVIDENCE_VERSION,
    depth_mode: depthMode,
    experience_level: profile?.experience_level ?? 'intermediate',
    goal: params.goal,
    days_per_week: params.daysPerWeek,
    duration_weeks: params.durationWeeks,
    session_length_target_min: params.targetSessionMinutes ?? null,
    focus_muscle_groups: toJsonValue(params.focusMuscleGroups),
    split_recommendation: buildSplitRecommendation(generated),
    volume_targets: buildVolumeTargets(generated),
    readiness_strategy: 'phase2-compatibility-default',
    cycle_strategy: profile?.cycle_enabled ? 'calendar_context' : 'none',
    warmup_strategy: 'legacy_default_warmup',
    explanation_density: depthMode,
    input_snapshot: {
      generationParams: toJsonValue({
        daysPerWeek: params.daysPerWeek,
        durationWeeks: params.durationWeeks,
        goal: params.goal,
        focusMuscleGroups: params.focusMuscleGroups,
        targetSessionMinutes: params.targetSessionMinutes ?? null,
        swapIntervalWeeks: params.swapIntervalWeeks ?? 4,
      }),
    },
    output_summary: {
      programName: generated.name,
      totalProgramDays: generated.days.length,
      uniqueWorkoutNames: toJsonValue(uniqueWorkoutNames),
      deloadWeeks: toJsonValue(deloadWeeks),
      generatedGoal: generated.goal,
    },
  };
};

const loadProgramContextProfile = async (userId: string): Promise<ProgramContextProfileRow | null> => {
  const phaseTwoProfileResult = await supabase
    .from('user_profile')
    .select('experience_level, cycle_enabled, depth_mode')
    .eq('user_id', userId)
    .maybeSingle<ProgramContextProfileRow>();

  if (
    phaseTwoProfileResult.error &&
    !isMissingRelationOrColumnError(phaseTwoProfileResult.error, 'user_profile', 'depth_mode')
  ) {
    throw phaseTwoProfileResult.error;
  }

  if (!phaseTwoProfileResult.error) {
    return phaseTwoProfileResult.data ?? null;
  }

  const legacyProfileResult = await supabase
    .from('user_profile')
    .select('experience_level, cycle_enabled')
    .eq('user_id', userId)
    .maybeSingle<Omit<ProgramContextProfileRow, 'depth_mode'>>();

  if (legacyProfileResult.error) {
    throw legacyProfileResult.error;
  }

  return legacyProfileResult.data
    ? {
        ...legacyProfileResult.data,
        depth_mode: null,
      }
    : null;
};

const persistSessionLengthPreference = async (
  userId: string,
  targetSessionMinutes: number | null | undefined,
): Promise<void> => {
  if (targetSessionMinutes === undefined) {
    return;
  }

  const { error } = await supabase
    .from('user_profile')
    .upsert(
      {
        user_id: userId,
        session_length_preference_min: targetSessionMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (
    error &&
    !isMissingRelationOrColumnError(error, 'user_profile', 'session_length_preference_min')
  ) {
    throw error;
  }
};

export async function saveProgramToDb(
  userId: string,
  params: ProgramGenParams,
  generated: GeneratedProgram,
  options: SaveProgramToDbOptions = {},
): Promise<string> {
  requireRollout(rollout.atomicProgramWriter, 'Atomic program installation');

  const programGenerationContextMode = options.programGenerationContextMode ?? 'create';

  const catalogRequests: CatalogExerciseRequest[] = generated.days.flatMap((day) =>
    day.exercises.map((exercise) => ({
      localExerciseId: exercise.localExerciseId,
      displayName: exercise.exerciseName,
      exerciseDbId: exercise.exerciseDbId,
      source: 'local_snapshot',
      snapshotVersion: LOCAL_CATALOG_SNAPSHOT_VERSION,
    })),
  );
  const catalogExerciseByLocalId = await resolveCatalogExerciseRequests(catalogRequests);
  await persistSessionLengthPreference(userId, params.targetSessionMinutes);

  let context: Record<string, unknown> | null = null;
  if (programGenerationContextMode === 'create') {
    const profile = await loadProgramContextProfile(userId);
    const built = buildProgramGenerationContext({
      userId,
      programId: '00000000-0000-4000-8000-000000000000',
      params,
      generated,
      profile,
    });
    const { program_id: _programId, user_id: _userId, ...revisionContext } = built;
    context = revisionContext as unknown as Record<string, unknown>;
  }

  const artifact: ProgramArtifact = {
    name: generated.name,
    goal: generated.goal,
    durationWeeks: generated.durationWeeks,
    daysPerWeek: generated.daysPerWeek,
    source: 'generated',
    schemaVersion: PROGRAM_SCHEMA_VERSION,
    catalogVersion: LOCAL_CATALOG_SNAPSHOT_VERSION,
    policyVersion: PROGRAM_POLICY_VERSION,
    swapIntervalWeeks: params.swapIntervalWeeks ?? 4,
    context,
    days: generated.days.map((day) => ({
      dayId: createOperationId(),
      weekNumber: day.weekNumber,
      dayIndex: day.dayIndex,
      orderInWeek: day.orderInWeek,
      workoutName: day.workoutName,
      estimatedDurationMin: day.estimatedDurationMin,
      isRestDay: false,
      isDeloadWeek: day.explanation?.isDeloadWeek ?? false,
      exercises: day.exercises.map((exercise) => {
        const exerciseId = catalogExerciseByLocalId.get(exercise.localExerciseId)?.catalogExerciseId;
        if (!exerciseId) {
          throw new Error(
            `Resolved catalog identity disappeared for ${exercise.exerciseName}. The program was not installed.`,
          );
        }
        return {
          slotId: createOperationId(),
          exerciseId,
          position: exercise.position,
          setCount: exercise.setCount,
          repRangeMin: exercise.repRangeMin,
          repRangeMax: exercise.repRangeMax,
          targetRpe: exercise.targetRPE,
          suggestedLoad: exercise.suggestedWeightLb,
          loadUnit: 'lb' as const,
          loadKind: exercise.suggestedWeightLb > 0 ? 'external' as const : 'unknown' as const,
          loadSide: 'unknown' as const,
          notes: null,
        };
      }),
    })),
  };

  const { data: active, error: activeError } = await supabase
    .from('programs')
    .select('id,current_revision')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle<{ id: string; current_revision: number }>();
  if (activeError) throw activeError;

  const outcome = await installProgram(
    programRepository,
    userId,
    artifact,
    active?.id ?? null,
    active?.current_revision ?? null,
  );
  if (outcome.status === 'validation') throw new Error(outcome.errors.join(' '));
  if (outcome.status === 'conflict') throw new Error(`Program changed on another device. ${outcome.message}`);
  if (outcome.status === 'unavailable') throw new Error(outcome.message);
  return outcome.receipt.programId;
}
