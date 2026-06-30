import { ADAPTATION_POLICIES } from '@/constants/adaptationPolicies';
import { EVIDENCE_REGISTRY } from '@/constants/evidenceRegistry';
import {
  COMPOUND_EQUIPMENT,
  DAY_INDEXES,
  EXPERIENCE_MODIFIERS,
  GENERATOR_DEFAULTS,
  GOAL_LABELS,
  GOAL_PARAMS,
  SPLIT_DAYS,
  SPLIT_STRUCTURE,
  WORKOUT_NAMES,
  type GoalParams,
} from '@/constants/programDefaults';
import {
  type GeneratedExerciseSlot,
  type GeneratedProgram,
  type GeneratedProgramDay,
  type GeneratedProgramDayExplanation,
  type GeneratedProgramExplanation,
  type MuscleGroup,
  type ProgramGenParams,
  type GeneratedExerciseExplanation,
} from '@/types/program';
import { type TrainingExperience } from '@/types/database';
import {
  type AdaptationPolicyId,
  type EvidenceKey,
  type EvidenceReference,
  type ExplanationMetadata,
} from '@/types/evidence';
import { type CyclePhase } from '@/utils/cyclePhase';
import {
  exercisesByMuscleGroup,
  type LocalExercise,
} from '@/lib/exerciseDatabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEvidenceReferences(policyIds: readonly AdaptationPolicyId[]): EvidenceReference[] {
  const seenEvidenceKeys = new Set<EvidenceKey>();
  const evidence: EvidenceReference[] = [];

  for (const policyId of policyIds) {
    for (const evidenceKey of ADAPTATION_POLICIES[policyId].evidenceKeys) {
      if (seenEvidenceKeys.has(evidenceKey)) {
        continue;
      }

      const entry = EVIDENCE_REGISTRY[evidenceKey];
      evidence.push({
        key: entry.key,
        label: entry.label,
        strength: entry.strength,
        sourceRoute: entry.sourceRoute,
      });
      seenEvidenceKeys.add(evidenceKey);
    }
  }

  return evidence;
}

function uniquePolicyIds(policyIds: readonly AdaptationPolicyId[]): AdaptationPolicyId[] {
  const seen = new Set<AdaptationPolicyId>();
  const unique: AdaptationPolicyId[] = [];

  for (const policyId of policyIds) {
    if (!seen.has(policyId)) {
      seen.add(policyId);
      unique.push(policyId);
    }
  }

  return unique;
}

function buildExplanation(summary: string, policyIds: readonly AdaptationPolicyId[]): ExplanationMetadata {
  const normalizedPolicyIds = uniquePolicyIds(policyIds);

  return {
    summary,
    policyIds: normalizedPolicyIds,
    evidence: buildEvidenceReferences(normalizedPolicyIds),
  };
}

function isCompoundExercise(position: number, equipment: string): boolean {
  return position <= GENERATOR_DEFAULTS.compoundPrioritySlots || COMPOUND_EQUIPMENT.has(equipment);
}

/** In-place Fisher-Yates shuffle — returns the same array for convenience. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Round to nearest 2.5, floor at 0. */
function roundWeight(weight: number): number {
  return Math.max(Math.round(weight / 2.5) * 2.5, 0);
}

/**
 * Choose `count` exercises for a given muscle group.
 *
 * Selection preference:
 *   1. compound equipment (Barbell, Dumbbell) when compoundEmphasis=true
 *   2. fallback to any remaining exercises
 *
 * Already-used IDs (for the current week) are excluded unless there are not
 * enough alternatives.
 */
function selectExercises(
  muscleGroup: MuscleGroup,
  count: number,
  compoundEmphasis: boolean,
  usedIds: Set<string>,
  allowRepeat: boolean,
): LocalExercise[] {
  const all = exercisesByMuscleGroup[muscleGroup] ?? [];
  if (all.length === 0) return [];

  // Partition into preferred (compound) and secondary (isolation)
  const preferred: LocalExercise[] = [];
  const secondary: LocalExercise[] = [];

  for (const ex of all) {
    if (compoundEmphasis && COMPOUND_EQUIPMENT.has(ex.equipment)) {
      preferred.push(ex);
    } else {
      secondary.push(ex);
    }
  }

  // Filter by used IDs unless we're explicitly allowing repeats
  const filterUsed = (list: LocalExercise[]) =>
    allowRepeat ? list : list.filter((ex) => !usedIds.has(ex.id));

  const availablePreferred = shuffle([...filterUsed(preferred)]);
  const availableSecondary = shuffle([...filterUsed(secondary)]);

  // When compoundEmphasis is false, prefer secondary (isolation) exercises first
  const ordered = compoundEmphasis
    ? [...availablePreferred, ...availableSecondary]
    : [...availableSecondary, ...availablePreferred];

  // If we still don't have enough, fall back to the full pool (including used)
  if (ordered.length < count) {
    const fallback = shuffle([...all]).filter(
      (ex) => !ordered.some((o) => o.id === ex.id),
    );
    return [...ordered, ...fallback].slice(0, count);
  }

  return ordered.slice(0, count);
}

/**
 * Per-position parameter overrides.
 * Positions 1–2 are always treated as compound lifts.
 * Position 3+ defaults to accessory (reduced volume/intensity), UNLESS the
 * exercise uses compound equipment (Barbell or Dumbbell) — e.g. Barbell Row
 * landing at position 3 on a Full Body day still deserves full compound params.
 *
 * RPE periodization: ramps linearly from baseRPE - 1.5 (week 1) to baseRPE (final loading week).
 * Deload weeks handled separately in buildSlot.
 */
function resolveSlotParams(
  baseParams: GoalParams,
  position: number,
  effectiveWeek: number,
  totalLoadingWeeks: number,
  exercise: { equipment: string },
  experienceLevel: TrainingExperience,
  cyclePhase?: CyclePhase,
): GoalParams {
  // RPE ramp: week 1 starts at base - 1.5, linearly reaches base by final loading week
  const rpeRamp = totalLoadingWeeks > 1
    ? baseParams.rpe
        - GENERATOR_DEFAULTS.periodizationRpeRampDelta
        + (GENERATOR_DEFAULTS.periodizationRpeRampDelta * (effectiveWeek - 1)) / (totalLoadingWeeks - 1)
    : baseParams.rpe;
  const periodizedRPE = Math.round(Math.min(rpeRamp, baseParams.rpe) * 10) / 10;

  // Slot-type adjustment (compound vs accessory)
  const isCompound = isCompoundExercise(position, exercise.equipment);
  const slotSets = isCompound
    ? baseParams.sets
    : Math.max(baseParams.sets - GENERATOR_DEFAULTS.accessorySetReduction, GENERATOR_DEFAULTS.minSets);
  const slotRPE = isCompound
    ? periodizedRPE
    : Math.max(periodizedRPE - GENERATOR_DEFAULTS.accessoryRpeReduction, GENERATOR_DEFAULTS.minRpe);

  // Experience modifier
  const mod = EXPERIENCE_MODIFIERS[experienceLevel];
  let finalSets = Math.max(Math.round(slotSets * mod.setsMultiplier), GENERATOR_DEFAULTS.minSets);
  let finalRPE = Math.round(
    Math.min(
      Math.max(slotRPE + mod.rpeOffset, GENERATOR_DEFAULTS.minRpe),
      GENERATOR_DEFAULTS.maxRpe,
    ) * 10,
  ) / 10;

  // Cycle phase modifier — menstrual and luteal phases reduce intensity
  if (cyclePhase === 'menstrual' || cyclePhase === 'luteal') {
    finalSets = Math.max(
      isCompound ? finalSets - GENERATOR_DEFAULTS.cyclePhaseSetReduction : finalSets,
      GENERATOR_DEFAULTS.minSets,
    );
    finalRPE = Math.round(
      Math.max(finalRPE - GENERATOR_DEFAULTS.cyclePhaseRpeReduction, GENERATOR_DEFAULTS.minRpe) * 10,
    ) / 10;
  }

  return { ...baseParams, sets: finalSets, rpe: finalRPE };
}

/** Build a GeneratedExerciseSlot from a LocalExercise + goal + weight params. */
function buildSlot(
  exercise: LocalExercise,
  position: number,
  goalParams: GoalParams,
  userWeightLb: number,
  experienceLevel: TrainingExperience,
  effectiveWeek: number,
  totalLoadingWeeks: number,
  isDeload: boolean,
  cyclePhase?: CyclePhase,
): GeneratedExerciseSlot {
  const slotParams = resolveSlotParams(goalParams, position, effectiveWeek, totalLoadingWeeks, exercise, experienceLevel, cyclePhase);
  const isCompound = isCompoundExercise(position, exercise.equipment);
  const expMult = exercise.experienceMultipliers[experienceLevel];
  const baseWeight =
    exercise.bodyweightMultiplier === 0
      ? 0
      : userWeightLb *
        exercise.bodyweightMultiplier *
        slotParams.weightMultiplier *
        expMult;

  // Progressive overload: +5% per effective loading week.
  // Deload weeks use 70% of the last loading week's weight.
  const weeklyFactor = 1 + GENERATOR_DEFAULTS.progressiveOverloadPerWeek * (effectiveWeek - 1);
  const deloadFactor = isDeload ? GENERATOR_DEFAULTS.deloadWeightFactor : 1.0;
  const suggested = roundWeight(baseWeight * weeklyFactor * deloadFactor);

  // Deload: reduce RPE by 2.0 from base (already periodized RPE doesn't matter for deload)
  const finalRPE = isDeload
    ? Math.max(slotParams.rpe - GENERATOR_DEFAULTS.deloadRpeReduction, GENERATOR_DEFAULTS.minRpe)
    : slotParams.rpe;
  const policyIds: AdaptationPolicyId[] = [
    'goal_prescription',
    'exercise_stability',
    'progressive_overload',
  ];

  if (isCompound) {
    policyIds.push('compound_priority');
  }
  if (experienceLevel !== 'intermediate') {
    policyIds.push('experience_scaling');
  }
  if (isDeload) {
    policyIds.push('deload_cadence');
  }
  if (cyclePhase === 'menstrual' || cyclePhase === 'luteal') {
    policyIds.push('cycle_phase_caution');
  }

  const explanation: GeneratedExerciseExplanation = {
    slotType: isCompound ? 'compound' : 'accessory',
    ...buildExplanation(
      isCompound
        ? `Compound-forward slot with ${slotParams.sets} sets in the ${slotParams.repMin}-${slotParams.repMax} rep range.`
        : `Accessory slot with recoverability-adjusted volume in the ${slotParams.repMin}-${slotParams.repMax} rep range.`,
      policyIds,
    ),
  };

  return {
    localExerciseId: exercise.id,
    exerciseName: exercise.name,
    position,
    setCount: slotParams.sets,
    repRangeMin: slotParams.repMin,
    repRangeMax: slotParams.repMax,
    targetRPE: finalRPE,
    suggestedWeightLb: suggested,
    explanation,
  };
}

/** Number of exercises to target per day based on total days/week and optional time cap. */
function exercisesPerDay(daysPerWeek: number, targetMinutes?: number | null, setCount?: number): number {
  // Default uncapped counts (same as before)
  let uncapped: number;
  if (daysPerWeek <= GENERATOR_DEFAULTS.lowFrequencyMaxDays) {
    uncapped = GENERATOR_DEFAULTS.lowFrequencyExerciseCount;
  } else if (daysPerWeek <= GENERATOR_DEFAULTS.mediumFrequencyMaxDays) {
    uncapped = GENERATOR_DEFAULTS.mediumFrequencyExerciseCount;
  } else {
    uncapped = GENERATOR_DEFAULTS.highFrequencyExerciseCount;
  }

  if (!targetMinutes || !setCount) return uncapped;

  // ~2.5 min per set (30-45s work + 60-90s rest) + 2 min transition per exercise
  const minutesPerExercise =
    setCount * GENERATOR_DEFAULTS.minutesPerSet + GENERATOR_DEFAULTS.transitionMinutesPerExercise;
  const maxFromTime = Math.max(
    GENERATOR_DEFAULTS.minExercisesPerDay,
    Math.floor(targetMinutes / minutesPerExercise),
  );
  return Math.min(uncapped, maxFromTime);
}

/** Estimated session duration in minutes. */
function estimateDuration(exerciseCount: number, setCount: number): number {
  return exerciseCount * (
    setCount * GENERATOR_DEFAULTS.minutesPerSet + GENERATOR_DEFAULTS.transitionMinutesPerExercise
  );
}

// ─── Slot-map helper ─────────────────────────────────────────────────────────

/**
 * Distribute exercise budget across muscle groups for a day.
 * Focus groups get 2 slots; others get 1. Surplus/deficit adjusted from
 * first (compound) or last (isolation) groups.
 */
function buildSlotMap(
  groupList: MuscleGroup[],
  focusSet: Set<MuscleGroup>,
  budget: number,
): Map<MuscleGroup, number> {
  const slotMap = new Map<MuscleGroup, number>();
  let allocated = 0;

  for (const mg of groupList) {
    const slots = focusSet.has(mg) ? 2 : 1;
    slotMap.set(mg, slots);
    allocated += slots;
  }

  if (allocated < budget) {
    for (const mg of groupList) {
      if (allocated >= budget) break;
      slotMap.set(mg, (slotMap.get(mg) ?? 1) + 1);
      allocated++;
    }
  }

  if (allocated > budget) {
    for (let i = groupList.length - 1; i >= 0 && allocated > budget; i--) {
      const mg = groupList[i];
      const current = slotMap.get(mg) ?? 1;
      if (current > 1) {
        slotMap.set(mg, current - 1);
        allocated--;
      }
    }
  }

  return slotMap;
}

// ─── Core generation ──────────────────────────────────────────────────────────

/**
 * Generates a complete multi-week workout program from the given parameters.
 *
 * Key principles:
 *  - Exercises are chosen ONCE (week-1 template) and reused across all weeks
 *    so users progressively overload the same movements.
 *  - Every 4th week is automatically a deload (3:1 loading-to-deload ratio —
 *    standard hypertrophy/strength best-practice).
 *  - Deload parameters: −2 sets (min 2), 70% of normal week weight, −2 RPE.
 *  - Progressive overload: +5% weight per effective loading week.
 *
 * Pure function — no async, no network calls.
 */
export function generateProgram(
  params: ProgramGenParams,
  userWeightLb: number,
  experienceLevel: TrainingExperience,
  cyclePhase?: CyclePhase,
): GeneratedProgram {
  const { daysPerWeek, durationWeeks, goal, focusMuscleGroups, targetSessionMinutes } = params;
  const goalParams = GOAL_PARAMS[goal];

  const splitTypes = SPLIT_STRUCTURE[daysPerWeek];
  const dayIndexes = DAY_INDEXES[daysPerWeek];
  const targetExercisesPerDay = exercisesPerDay(daysPerWeek, targetSessionMinutes, goalParams.sets);
  const focusSet = new Set<MuscleGroup>(focusMuscleGroups);

  // ── Phase 1: pin exercise selection (done once, reused every week) ─────────
  // Each entry: ordered list of exercises for that day slot (index = orderInWeek).
  type DayTemplate = { exercise: LocalExercise; position: number }[];
  const dayTemplates = new Map<number, DayTemplate>();

  {
    const usedIds = new Set<string>();
    for (let orderInWeek = 0; orderInWeek < daysPerWeek; orderInWeek++) {
      const splitType = splitTypes[orderInWeek];
      const splitDay = SPLIT_DAYS[splitType];
      const isFullBody = splitType === 'Full Body' || splitType === 'Full Body Deload';
      const slotMap = buildSlotMap(splitDay.muscleGroups, focusSet, targetExercisesPerDay);

      const template: DayTemplate = [];
      let position = 1;

      for (const muscleGroup of splitDay.muscleGroups) {
        const count = slotMap.get(muscleGroup) ?? 1;
        const selected = selectExercises(muscleGroup, count, splitDay.compoundEmphasis, usedIds, isFullBody);
        for (const ex of selected) {
          template.push({ exercise: ex, position });
          position++;
          if (!isFullBody) usedIds.add(ex.id);
        }
      }

      dayTemplates.set(orderInWeek, template);
    }
  }

  // ── Phase 2: build all weeks using the pinned template ────────────────────
  const allDays: GeneratedProgramDay[] = [];

  // Total loading weeks (non-deload) — used for RPE periodization ramp
  const totalLoadingWeeks = durationWeeks - Math.floor(durationWeeks / GENERATOR_DEFAULTS.deloadEveryWeeks);

  // effectiveWeek counts only loading weeks (deloads don't advance progression).
  let effectiveWeek = 0;

  for (let week = 1; week <= durationWeeks; week++) {
    // Every 4th week is a deload (weeks 4, 8, 12, 16, …).
    const isDeloadWeek = week % GENERATOR_DEFAULTS.deloadEveryWeeks === 0;
    if (!isDeloadWeek) effectiveWeek++;

    for (let orderInWeek = 0; orderInWeek < daysPerWeek; orderInWeek++) {
      const splitType = splitTypes[orderInWeek];
      const dayIndex = dayIndexes[orderInWeek];

      const dayGoalParams: GoalParams = isDeloadWeek
        ? {
            ...goalParams,
            sets: Math.max(goalParams.sets - 2, GENERATOR_DEFAULTS.minSets),
            weightMultiplier: goalParams.weightMultiplier, // handled in buildSlot
          }
        : goalParams;

      const template = dayTemplates.get(orderInWeek) ?? [];
      const exercises: GeneratedExerciseSlot[] = template.map(({ exercise, position }) =>
        buildSlot(exercise, position, dayGoalParams, userWeightLb, experienceLevel, effectiveWeek, totalLoadingWeeks, isDeloadWeek, cyclePhase),
      );

      const workoutName = isDeloadWeek
        ? `${WORKOUT_NAMES[splitType]} (Deload)`
        : WORKOUT_NAMES[splitType];
      const dayPolicyIds: AdaptationPolicyId[] = [
        'goal_prescription',
        'split_selection',
        'session_time_budget',
        'exercise_stability',
      ];

      if (SPLIT_DAYS[splitType].compoundEmphasis) {
        dayPolicyIds.push('compound_priority');
      }
      if (isDeloadWeek) {
        dayPolicyIds.push('deload_cadence');
      }
      if (cyclePhase === 'menstrual' || cyclePhase === 'luteal') {
        dayPolicyIds.push('cycle_phase_caution');
      }

      const explanation: GeneratedProgramDayExplanation = {
        splitType,
        isDeloadWeek,
        targetExerciseCount: targetExercisesPerDay,
        ...buildExplanation(
          isDeloadWeek
            ? `${splitType} day trimmed for a deload week while keeping the same movement pattern emphasis.`
            : `${splitType} day sized for about ${targetExercisesPerDay} exercises based on weekly frequency and session length.`,
          dayPolicyIds,
        ),
      };

      allDays.push({
        weekNumber: week,
        dayIndex,
        orderInWeek: orderInWeek + 1,
        workoutName,
        estimatedDurationMin: Math.round(
          exercises.reduce((sum, ex) => sum + estimateDuration(1, ex.setCount), 0),
        ),
        exercises,
        explanation,
      });
    }
  }

  const programPolicyIds: AdaptationPolicyId[] = [
    'goal_prescription',
    'split_selection',
    'session_time_budget',
    'exercise_stability',
    'progressive_overload',
    'deload_cadence',
  ];

  if (experienceLevel !== 'intermediate') {
    programPolicyIds.push('experience_scaling');
  }
  if (cyclePhase === 'menstrual' || cyclePhase === 'luteal') {
    programPolicyIds.push('cycle_phase_caution');
  }

  const explanation: GeneratedProgramExplanation = {
    targetExercisesPerDay,
    deloadEveryWeeks: GENERATOR_DEFAULTS.deloadEveryWeeks,
    ...buildExplanation(
      `${daysPerWeek}-day ${GOAL_LABELS[goal]} plan with a stable weekly template, gradual loading, and a simple deload rhythm.`,
      programPolicyIds,
    ),
  };

  return {
    name: `${daysPerWeek}-Day ${GOAL_LABELS[goal]} Program`,
    goal,
    durationWeeks,
    daysPerWeek,
    days: allDays,
    explanation,
  };
}
