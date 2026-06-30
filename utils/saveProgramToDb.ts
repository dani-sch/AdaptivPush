import type {
  DepthMode,
  JsonObject,
  JsonValue,
  ProgramGenerationContextInsert,
  ProgramGenerationContextMode,
  TrainingExperience,
} from '@/types/database';
import type { ProgramGenParams, GeneratedProgram } from '@/types/program';

import { supabase } from '@/utils/supabase';
import { isMissingRelationOrColumnError } from '@/utils/profilePreferences';

const DEFAULT_POLICY_VERSION = 'phase2-baseline';
const DEFAULT_EVIDENCE_VERSION = 'phase1-evidence-baseline';

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
  const programGenerationContextMode = options.programGenerationContextMode ?? 'create';

  await supabase
    .from('programs')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  const todayISO = new Date().toISOString().split('T')[0];

  const { data: prog, error: progErr } = await supabase
    .from('programs')
    .insert({
      user_id:        userId,
      name:           generated.name,
      goal:           generated.goal,
      duration_weeks: generated.durationWeeks,
      days_per_week:  generated.daysPerWeek,
      start_date:     todayISO,
      is_active:      true,
      swap_interval_weeks: params.swapIntervalWeeks ?? 4,
    })
    .select('id')
    .single();

  if (progErr) throw progErr;
  const programId = prog.id as string;

  await persistSessionLengthPreference(userId, params.targetSessionMinutes);

  if (programGenerationContextMode === 'create') {
    const profile = await loadProgramContextProfile(userId);
    const programGenerationContext = buildProgramGenerationContext({
      userId,
      programId,
      params,
      generated,
      profile,
    });

    const { error: contextError } = await supabase
      .from('program_generation_context')
      .insert(programGenerationContext);

    if (contextError) {
      await supabase.from('programs').delete().eq('id', programId);
      throw contextError;
    }
  }

  const uniqueExercises = [...new Set(
    generated.days.flatMap(day => day.exercises.map(exercise => exercise.exerciseName)),
  )];

  const exerciseRows = uniqueExercises.map(name => ({ name }));

  const { data: exData, error: exErr } = await supabase
    .from('exercises')
    .upsert(exerciseRows, { onConflict: 'name', ignoreDuplicates: true })
    .select('id, name');

  if (exErr) throw exErr;

  const exIdByName = new Map<string, string>();

  if (exData) {
    for (const exercise of exData) {
      exIdByName.set(exercise.name as string, exercise.id as string);
    }
  }

  const missingNames = uniqueExercises.filter(name => !exIdByName.has(name));
  if (missingNames.length > 0) {
    const { data: fetchedEx, error: fetchErr } = await supabase
      .from('exercises')
      .select('id, name')
      .in('name', missingNames);

    if (fetchErr) throw fetchErr;

    for (const exercise of fetchedEx ?? []) {
      exIdByName.set(exercise.name as string, exercise.id as string);
    }
  }

  const dayInserts = generated.days.map(day => ({
    program_id:             programId,
    week_number:            day.weekNumber,
    day_index:              day.dayIndex,
    order_in_week:          day.orderInWeek,
    workout_name:           day.workoutName,
    estimated_duration_min: day.estimatedDurationMin,
  }));

  const { data: dayData, error: dayErr } = await supabase
    .from('program_days')
    .insert(dayInserts)
    .select('id, week_number, day_index');

  if (dayErr) throw dayErr;

  const dayIdByKey = new Map<string, string>();
  for (const day of dayData ?? []) {
    dayIdByKey.set(`${day.week_number}_${day.day_index}`, day.id as string);
  }

  const pdeInserts = generated.days.flatMap(day => {
    const dayId = dayIdByKey.get(`${day.weekNumber}_${day.dayIndex}`);
    if (!dayId) return [];

    return day.exercises
      .map(exercise => {
        const exerciseId = exIdByName.get(exercise.exerciseName);
        if (!exerciseId) return null;

        return {
          program_day_id:      dayId,
          exercise_id:         exerciseId,
          position:            exercise.position,
          set_count:           exercise.setCount,
          rep_range_min:       exercise.repRangeMin,
          rep_range_max:       exercise.repRangeMax,
          target_rpe:          exercise.targetRPE,
          suggested_weight_lb: exercise.suggestedWeightLb,
          notes:               null,
        };
      })
      .filter(Boolean);
  });

  const { error: pdeErr } = await supabase
    .from('program_day_exercises')
    .insert(pdeInserts);

  if (pdeErr) throw pdeErr;

  return programId;
}
