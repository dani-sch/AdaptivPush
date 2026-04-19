import {
  type GeneratedExerciseSlot,
  type GeneratedProgram,
  type GeneratedProgramDay,
  type MuscleGroup,
  type ProgramGenParams,
  type TrainingGoal,
} from '@/types/program';
import { type TrainingExperience } from '@/types/database';
import {
  exercisesByMuscleGroup,
  type LocalExercise,
} from '@/lib/exerciseDatabase';

// ─── Goal parameters ──────────────────────────────────────────────────────────

interface GoalParams {
  sets: number;
  repMin: number;
  repMax: number;
  rpe: number;
  weightMultiplier: number;
}

const GOAL_PARAMS: Record<TrainingGoal, GoalParams> = {
  strength:        { sets: 5, repMin: 3,  repMax: 5,  rpe: 8.5, weightMultiplier: 1.00 },
  hypertrophy:     { sets: 4, repMin: 8,  repMax: 12, rpe: 7.5, weightMultiplier: 0.75 },
  endurance:       { sets: 3, repMin: 15, repMax: 20, rpe: 6.0, weightMultiplier: 0.50 },
  fat_loss:        { sets: 3, repMin: 12, repMax: 15, rpe: 7.0, weightMultiplier: 0.60 },
  general_fitness: { sets: 3, repMin: 8,  repMax: 12, rpe: 7.0, weightMultiplier: 0.70 },
};

// ─── Split definitions ────────────────────────────────────────────────────────

type SplitDayType =
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

interface SplitDay {
  type: SplitDayType;
  muscleGroups: MuscleGroup[];
  /** prefer compound equipment (Barbell) over isolation on this day */
  compoundEmphasis: boolean;
}

const SPLIT_DAYS: Record<SplitDayType, SplitDay> = {
  'Full Body':        { type: 'Full Body',        muscleGroups: ['Legs', 'Chest', 'Back', 'Shoulders', 'Core'],              compoundEmphasis: true  },
  'Full Body Deload': { type: 'Full Body Deload',  muscleGroups: ['Legs', 'Chest', 'Back', 'Shoulders', 'Core'],              compoundEmphasis: false },
  'Upper':            { type: 'Upper',             muscleGroups: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],         compoundEmphasis: true  },
  'Upper A':          { type: 'Upper A',           muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps'],         compoundEmphasis: true  },
  'Upper B':          { type: 'Upper B',           muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps'],         compoundEmphasis: false },
  'Lower':            { type: 'Lower',             muscleGroups: ['Legs', 'Glutes', 'Core'],                                  compoundEmphasis: true  },
  'Lower A':          { type: 'Lower A',           muscleGroups: ['Legs', 'Glutes', 'Core'],                                  compoundEmphasis: true  },
  'Lower B':          { type: 'Lower B',           muscleGroups: ['Legs', 'Glutes', 'Core'],                                  compoundEmphasis: false },
  'Push':             { type: 'Push',              muscleGroups: ['Chest', 'Shoulders', 'Triceps'],                           compoundEmphasis: true  },
  'Push A':           { type: 'Push A',            muscleGroups: ['Chest', 'Shoulders', 'Triceps'],                           compoundEmphasis: true  },
  'Push B':           { type: 'Push B',            muscleGroups: ['Chest', 'Shoulders', 'Triceps'],                           compoundEmphasis: false },
  'Pull':             { type: 'Pull',              muscleGroups: ['Back', 'Biceps'],                                          compoundEmphasis: true  },
  'Pull A':           { type: 'Pull A',            muscleGroups: ['Back', 'Biceps'],                                          compoundEmphasis: true  },
  'Pull B':           { type: 'Pull B',            muscleGroups: ['Back', 'Biceps'],                                          compoundEmphasis: false },
  'Legs':             { type: 'Legs',              muscleGroups: ['Legs', 'Glutes', 'Core'],                                  compoundEmphasis: true  },
  'Legs A':           { type: 'Legs A',            muscleGroups: ['Legs', 'Glutes', 'Core'],                                  compoundEmphasis: true  },
  'Legs B':           { type: 'Legs B',            muscleGroups: ['Legs', 'Glutes', 'Core'],                                  compoundEmphasis: false },
};

/** Split structure per daysPerWeek value */
const SPLIT_STRUCTURE: Record<number, SplitDayType[]> = {
  1: ['Full Body'],
  2: ['Upper', 'Lower'],
  3: ['Push', 'Pull', 'Legs'],
  4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
  7: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', 'Full Body Deload'],
};

/** Day-of-week indexes (1=Monday) assigned per daysPerWeek value */
const DAY_INDEXES: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

// ─── Workout name mapping ─────────────────────────────────────────────────────

const WORKOUT_NAMES: Record<SplitDayType, string> = {
  'Full Body':        'Full Body',
  'Full Body Deload': 'Full Body (Deload)',
  'Upper':            'Upper Body',
  'Upper A':          'Upper Body A',
  'Upper B':          'Upper Body B',
  'Lower':            'Lower Body',
  'Lower A':          'Lower Body A',
  'Lower B':          'Lower Body B',
  'Push':             'Push Day',
  'Push A':           'Push Day A',
  'Push B':           'Push Day B',
  'Pull':             'Pull Day',
  'Pull A':           'Pull Day A',
  'Pull B':           'Pull Day B',
  'Legs':             'Leg Day',
  'Legs A':           'Leg Day A',
  'Legs B':           'Leg Day B',
};

const GOAL_LABELS: Record<TrainingGoal, string> = {
  strength:        'Strength',
  hypertrophy:     'Hypertrophy',
  endurance:       'Endurance',
  fat_loss:        'Fat Loss',
  general_fitness: 'General Fitness',
};

// ─── Compound equipment (preferred for first slot) ────────────────────────────

const COMPOUND_EQUIPMENT = new Set(['Barbell', 'Dumbbell']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Build a GeneratedExerciseSlot from a LocalExercise + goal + weight params. */
function buildSlot(
  exercise: LocalExercise,
  position: number,
  goalParams: GoalParams,
  userWeightLb: number,
  experienceLevel: TrainingExperience,
  effectiveWeek: number,
  isDeload: boolean,
): GeneratedExerciseSlot {
  const expMult = exercise.experienceMultipliers[experienceLevel];
  const baseWeight =
    exercise.bodyweightMultiplier === 0
      ? 0
      : userWeightLb *
        exercise.bodyweightMultiplier *
        goalParams.weightMultiplier *
        expMult;

  // Progressive overload: +5% per effective loading week.
  // Deload weeks use 70% of the last loading week's weight.
  const weeklyFactor = 1 + 0.05 * (effectiveWeek - 1);
  const deloadFactor = isDeload ? 0.70 : 1.0;
  const suggested = roundWeight(baseWeight * weeklyFactor * deloadFactor);

  return {
    localExerciseId: exercise.id,
    exerciseName: exercise.name,
    position,
    setCount: goalParams.sets,
    repRangeMin: goalParams.repMin,
    repRangeMax: goalParams.repMax,
    targetRPE: goalParams.rpe,
    suggestedWeightLb: suggested,
  };
}

/** Number of exercises to target per day based on total days/week and optional time cap. */
function exercisesPerDay(daysPerWeek: number, targetMinutes?: number | null, setCount?: number): number {
  // Default uncapped counts (same as before)
  let uncapped: number;
  if (daysPerWeek <= 2) uncapped = 6;
  else if (daysPerWeek <= 4) uncapped = 5;
  else uncapped = 4;

  if (!targetMinutes || !setCount) return uncapped;

  // Invert estimateDuration: exerciseCount * (sets * 4.5 + 2) = targetMinutes
  const maxFromTime = Math.max(2, Math.floor(targetMinutes / (setCount * 4.5 + 2)));
  return Math.min(uncapped, maxFromTime);
}

/** Estimated session duration in minutes. */
function estimateDuration(exerciseCount: number, setCount: number): number {
  return exerciseCount * setCount * 4.5 + exerciseCount * 2;
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

  // effectiveWeek counts only loading weeks (deloads don't advance progression).
  let effectiveWeek = 0;

  for (let week = 1; week <= durationWeeks; week++) {
    // Every 4th week is a deload (weeks 4, 8, 12, 16, …).
    const isDeloadWeek = week % 4 === 0;
    if (!isDeloadWeek) effectiveWeek++;

    for (let orderInWeek = 0; orderInWeek < daysPerWeek; orderInWeek++) {
      const splitType = splitTypes[orderInWeek];
      const dayIndex = dayIndexes[orderInWeek];

      const dayGoalParams: GoalParams = isDeloadWeek
        ? {
            ...goalParams,
            sets: Math.max(goalParams.sets - 2, 2),
            rpe: Math.max(goalParams.rpe - 2.0, 5.0),
            weightMultiplier: goalParams.weightMultiplier, // handled in buildSlot
          }
        : goalParams;

      const template = dayTemplates.get(orderInWeek) ?? [];
      const exercises: GeneratedExerciseSlot[] = template.map(({ exercise, position }) =>
        buildSlot(exercise, position, dayGoalParams, userWeightLb, experienceLevel, effectiveWeek, isDeloadWeek),
      );

      const workoutName = isDeloadWeek
        ? `${WORKOUT_NAMES[splitType]} (Deload)`
        : WORKOUT_NAMES[splitType];

      allDays.push({
        weekNumber: week,
        dayIndex,
        orderInWeek: orderInWeek + 1,
        workoutName,
        estimatedDurationMin: Math.round(estimateDuration(exercises.length, dayGoalParams.sets)),
        exercises,
      });
    }
  }

  return {
    name: `${daysPerWeek}-Day ${GOAL_LABELS[goal]} Program`,
    goal,
    durationWeeks,
    daysPerWeek,
    days: allDays,
  };
}
