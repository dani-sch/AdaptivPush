# AdaptivPush — Feature Implementation Plan

> **Status**: In Progress — Phase 0–4 implemented; bug fixes applied  
> **Scope**: Program generation, progressive overload engine, workout swap modal, exercise history modal  
> **Stack**: React Native + Expo Router + Supabase + TypeScript  
> **Model**: Claude Opus 4.6

---

## ⚠️ Schema Reconciliation (Updated from Real Supabase Schema)

The original plan was written before the actual schema was confirmed. The following corrections apply **everywhere** in this document:

| Originally Assumed | Actual Table / Field | Impact |
|--------------------|----------------------|--------|
| `workout_session_exercises` | **`workout_exercise_sets`** (already exists!) | Migration `001_workout_session_exercises.sql` is **OBSOLETE — do not run it** |
| `workout_history` | **`workout_sessions`** | All save/query code uses `workout_sessions` |
| `readiness_checkins` | **`readiness_logs`** | Progression engine reads from `readiness_logs` |
| `readiness_checkins.sleep_hours` | **`readiness_logs.sleep_score`** | Field name change |
| `readiness_checkins.stress_level` | **`readiness_logs.stress`** (+ `soreness`, `motivation`) | More granular fields |
| `user_profile.experience_level` | **`user_profile.experience_level`** | ✅ Correct — `training_experience` in earlier plan drafts was wrong; confirmed field is `experience_level` |
| `workout_session_exercises.workout_history_id` | **`workout_exercise_sets.session_id`** | FK to `workout_sessions.id` |
| `exercises` (assumed not seeded) | **`exercises` already seeded** with `secondary_muscles`, `target_muscle`, `instructions` | `lib/exerciseDatabase.ts` is fallback only; query Supabase first |

### Additional Schema Fields Discovered

**`programs`** also has: `days_per_week` (int4)  
**`program_days`** also has: `is_rest_day` (bool), `is_deload_week` (bool)  
**`workout_sessions`** also has: `checkin_id` (uuid), `light_day_applied` (bool)  
**`exercises`** also has: `secondary_muscles` (text), `target_muscle` (text), `instructions` (text)  
**`user_profile`** also has: `days_per_week` (int4), `training_goal` (text), `experience_level` (text — **confirmed column name**; earlier plan drafts said `training_experience` which is wrong), `cycle_enabled` (bool)

### Pre-existing Code Bugs to Fix (while in those files)

`app/(tabs)/history.tsx` and `app/(tabs)/profile/index.tsx` reference `workout_history` (wrong table).  
`app/(tabs)/home.tsx` references `readiness_checkins` (wrong table).  
These should be corrected to `workout_sessions` and `readiness_logs` respectively when touching those files.

---

---

## Table of Contents

1. [Codebase Current State](#1-codebase-current-state)
2. [Feature Overview](#2-feature-overview)
3. [Phase 0 — Shared Foundation](#phase-0--shared-foundation)
4. [Phase 1 — Personalized Program Generation](#phase-1--personalized-program-generation)
5. [Phase 2 — Workout Save + Progressive Overload](#phase-2--workout-save--progressive-overload)
6. [Phase 3 — Workout Swap Modal (Real Data)](#phase-3--workout-swap-modal-real-data)
7. [Phase 4 — Exercise History Modal](#phase-4--exercise-history-modal)
8. [Execution Order & Dependencies](#execution-order--dependencies)
9. [UI Standards Reference](#ui-standards-reference)

---

## 1. Codebase Current State

### Architecture
- **Framework**: React Native (Expo SDK), Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Language**: TypeScript (strict)
- **Navigation**: Bottom tabs + stack screens
- **State**: React hooks (`useState`, `useCallback`, `useMemo`) — no Redux/Zustand

### Confirmed Database Tables (verified from real schema)

| Table | Key Columns |
|-------|-------------|
| `programs` | `id`, `user_id`, `name`, `goal`, `duration_weeks`, `start_date`, `is_active`, `days_per_week` |
| `program_days` | `id`, `program_id`, `week_number`, `day_index` (1–7), `order_in_week`, `workout_name`, `estimated_duration_min`, `is_rest_day`, `is_deload_week` |
| `program_day_exercises` | `id`, `program_day_id`, `exercise_id`, `position`, `set_count`, `rep_range_min`, `rep_range_max`, `target_rpe`, `suggested_weight_lb`, `notes`, `updated_at` |
| `exercises` | `id`, `name`, `primary_muscle`, `target_muscle`, `secondary_muscles`, `equipment`, `instructions` — **already seeded** |
| `user_profile` | `user_id`, `full_name`, `date_of_birth`, `sex_assigned_at_birth`, `gender_identity`, `weight_lb`, `weight_kg`, `weight_unit_preference`, `experience_level`, `days_per_week`, `training_goal`, `cycle_enabled`, `healthkit_enabled`, `onboarded` |
| `readiness_logs` | `id`, `user_id`, `log_date`, `sleep_score`, `soreness`, `stress`, `motivation`, `readiness_score`, `created_at` |
| `workout_sessions` | `id`, `user_id`, `program_day_id`, `workout_name`, `started_at`, `ended_at`, `duration_min`, `total_volume_lb`, `pr_count`, `checkin_id`, `light_day_applied`, `notes` |
| `workout_exercise_sets` | `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight_lb`, `rpe`, `created_at` — **already exists** |

### Screen-by-Screen Status

| Screen | File | Status |
|--------|------|--------|
| Welcome | `app/index.tsx` | ✅ Complete |
| Sign Up | `app/(auth)/join.tsx` | ✅ Complete |
| Login | `app/(auth)/login.tsx` | ✅ Complete |
| Quick Setup | `app/(qsetup)/quick-setup.tsx` | ✅ Complete — triggers GenerateProgramModal post-signup |
| Home | `app/(tabs)/home.tsx` | ✅ Complete (readiness check-in works) |
| Plan | `app/(tabs)/plan.tsx` | ✅ "Generate Personal Program" button wired |
| History | `app/(tabs)/history.tsx` | ✅ Reads `workout_history` (session-level) |
| Active Workout | `app/next-workout.tsx` | ✅ Swap + History modals wired; workout saved on finish |
| Create Program | `app/create-program.tsx` | ✅ Manual creation works |

### Component Status

| Component | File | Status |
|-----------|------|--------|
| ExerciseCard | `components/ExerciseCard.tsx` | ✅ Full set-row UI; exposes `onPressHistory` + `onPressSwap` |
| SwapExerciseModal | `components/SwapExerciseModal.tsx` | ✅ Wired to Supabase; local DB fallback for null `primary_muscle`; height fixed |
| WorkoutTemplateModal | `components/WorkoutTemplateModal.tsx` | ✅ Works from Plan screen; height fixed for nested swap overlay |
| NextWorkoutCard | `components/NextWorkoutCard.tsx` | ✅ Displays upcoming workout |
| GenerateProgramModal | `components/GenerateProgramModal.tsx` | ✅ Complete — triggered post-signup and from Plan tab |
| ExerciseHistoryModal | `components/ExerciseHistoryModal.tsx` | ✅ Complete — shows per-session set history with volume trend |

### Type Definitions (current)

```typescript
// types/program.ts
type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Legs' | 'Glutes' | 'Core' | 'Full Body'
type Equipment = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Band' | 'Kettlebell' | 'Other'

WorkoutExercise { id, name, sets?, reps?, weight?, muscleGroup?, equipment? }
ProgramWorkout  { id, name, day, estimatedTime, exercises }
CurrentProgram  { id, name, goal, currentWeek, totalWeeks, daysPerWeek, workouts }

// types/database.ts
SexAssigned = 'male' | 'female' | 'prefer_not_to_say'
TrainingExperience = 'beginner' | 'intermediate' | 'advanced'
WeightUnit = 'lb' | 'kg'
```

---

## 2. Feature Overview

### 2.1 — Personalized Program Generation

**User story**: After completing the quick-setup survey, a modal appears offering to generate a personalized training program. The user fills in: training days per week, program duration (weeks), training goal, and any specific muscle groups to focus on. Tapping "Generate My Program" creates a complete multi-week program — every day, every exercise, every set — and stores it in Supabase. The generated program then appears immediately in the Plan tab.

**Access points**:
- ✅ Post-signup (after quick-setup completes)
- ✅ Plan tab → EmptyState → "Generate Personal Program" button
- ✅ Plan tab → active program menu → "Generate New Program"

### 2.2 — Progressive Overload Engine

**User story**: Each week, the app adjusts the recommended weights and rep ranges for the user's upcoming workouts based on how they performed last week. If they easily hit the top of their rep range with low RPE, the weight goes up. If they struggled, it holds or comes down. Their readiness check-in score also modifies how aggressively the app adjusts.

### 2.3 — Workout Save on Finish

**Prerequisite for 2.2 and 4**: Currently, tapping "Finish Workout" does nothing to the database. We must save the logged sets to Supabase so that progression and history have data to work from.

### 2.4 — Workout Swap Modal

**User story**: During an active workout or when viewing the program, the user taps the swap icon on an exercise. A bottom-sheet modal appears listing alternative exercises for the same muscle group (fetched from Supabase, with a local fallback). The user selects one and confirms. They can choose to apply the swap to this workout only or to the entire program going forward.

### 2.5 — Exercise History Modal

**User story**: During an active workout, the user taps the clock/history icon on an exercise. A bottom-sheet modal appears showing every previous time they performed that exercise — grouped by session, displaying date, workout name, each logged set (weight × reps @ RPE), and total volume for that session with a trend indicator vs the prior session.

---

## Phase 0 — Shared Foundation

These tasks have no dependencies and can be done first or in parallel with each other.

---

### Task 0.1 — ~~`workout_session_exercises` DB Table~~ **OBSOLETE**

> **✅ Already exists as `workout_exercise_sets`** — Do NOT run `reports/migrations/001_workout_session_exercises.sql`.

The real table (`workout_exercise_sets`) already exists in Supabase with the following schema:

```sql
-- Already exists — no migration needed
workout_exercise_sets (
  id          uuid PRIMARY KEY,
  session_id  uuid REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  set_number  int4 NOT NULL,
  reps        int4,
  weight_lb   numeric,
  rpe         numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
)
```

**Use `workout_exercise_sets` everywhere the plan previously said `workout_session_exercises`.**  
**Use `session_id` everywhere the plan previously said `workout_history_id`.**

---

### Task 0.2 — Local Exercise Database (Fallback Only)

**File**: `lib/exerciseDatabase.ts`

> **Updated**: The Supabase `exercises` table is **already seeded**. The program generator should query Supabase first (`select id, name, primary_muscle, equipment from exercises where primary_muscle = $1`). This local file serves as:
> 1. **Offline/speed fallback** if the Supabase query fails
> 2. **Source of `experienceMultipliers` and `bodyweightMultiplier`** — these are not in the DB schema
> 3. **Swap modal fallback** if Supabase is unavailable

The `exercises` table in Supabase has: `id`, `name`, `primary_muscle`, `target_muscle`, `secondary_muscles`, `equipment`, `instructions`. Use these fields for exercise selection and swap filtering instead of local data wherever possible.

**Interface** (used for local entries and to augment DB results):
```typescript
export interface LocalExercise {
  id: string;                    // slug: 'barbell-bench-press'
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  defaultRPE: number;
  bodyweightMultiplier: number;  // suggested_weight_lb = userWeight × this
  experienceMultipliers: {
    beginner:     number;
    intermediate: number;
    advanced:     number;
  };
}
```

**Coverage required** (minimum — add more for variety):

| MuscleGroup | Required Exercises |
|-------------|-------------------|
| Chest | Barbell Bench Press, Dumbbell Incline Press, Cable Fly, Dumbbell Chest Press, Push-up |
| Back | Barbell Row, Lat Pulldown, Seated Cable Row, Dumbbell Single-Arm Row, Pull-up |
| Shoulders | Barbell Overhead Press, Dumbbell Lateral Raise, Dumbbell Front Raise, Cable Face Pull, Machine Shoulder Press |
| Biceps | Barbell Curl, Dumbbell Hammer Curl, Cable Curl, Dumbbell Concentration Curl, Incline Dumbbell Curl |
| Triceps | Tricep Pushdown (Cable), Dumbbell Skull Crusher, Close-Grip Bench Press, Overhead Tricep Extension, Dip |
| Legs | Barbell Squat, Romanian Deadlift, Leg Press (Machine), Dumbbell Lunge, Leg Extension (Machine) |
| Glutes | Barbell Hip Thrust, Cable Kickback, Dumbbell Step-Up, Glute Bridge, Sumo Deadlift |
| Core | Plank, Cable Crunch, Hanging Leg Raise, Ab Wheel Rollout, Russian Twist |
| Full Body | Deadlift, Barbell Clean, Kettlebell Swing, Burpee, Dumbbell Thruster |

**Exports**:
```typescript
export const exercisesByMuscleGroup: Record<MuscleGroup, LocalExercise[]>

export function getAlternativesFor(
  muscleGroup: MuscleGroup,
  excludeIds?: string[]
): LocalExercise[]
// Returns all exercises for that muscle group, excluding any IDs in excludeIds
```

**Sample entry**:
```typescript
{
  id: 'barbell-bench-press',
  name: 'Barbell Bench Press',
  muscleGroup: 'Chest',
  equipment: 'Barbell',
  defaultSets: 4,
  defaultRepMin: 6,
  defaultRepMax: 10,
  defaultRPE: 8,
  bodyweightMultiplier: 0.65,   // ~65% of bodyweight as starting weight
  experienceMultipliers: {
    beginner: 0.60,
    intermediate: 0.85,
    advanced: 1.10,
  },
}
```

---

### Task 0.3 — New TypeScript Types

**File additions**:

**`types/program.ts`** — append:
```typescript
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
```

**New file `types/progression.ts`**:
```typescript
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
  experienceLevel: TrainingExperience;
  lastSessionSets: LoggedSet[];        // sets from the most recent logged session
  readinessScore: number | null;       // 0–10 composite; null if no recent check-in
}

export interface ProgressionResult {
  suggestedWeightLb: number;
  repRangeMin: number;
  repRangeMax: number;
  action: 'increase' | 'hold' | 'decrease';
  reason: string;                      // human-readable, useful for debugging/logging
}
```

---

## Phase 1 — Personalized Program Generation

---

### Task 1.1 — Program Generation Algorithm

**File**: `utils/programGenerator.ts`

**Exported function**:
```typescript
export function generateProgram(
  params: ProgramGenParams,
  userWeightLb: number,
  experienceLevel: TrainingExperience
): GeneratedProgram
```

#### Split Strategy by `daysPerWeek`

| Days | Split Name | Day Structure |
|------|-----------|---------------|
| 1 | Full Body | Full Body |
| 2 | Upper/Lower | Upper, Lower |
| 3 | Push/Pull/Legs | Push, Pull, Legs |
| 4 | Upper/Lower ×2 | Upper A, Lower A, Upper B, Lower B |
| 5 | PPL + Upper/Lower | Push, Pull, Legs, Upper, Lower |
| 6 | PPL ×2 | Push A, Pull A, Legs A, Push B, Pull B, Legs B |
| 7 | PPL ×2 + Deload | Push A, Pull A, Legs A, Push B, Pull B, Legs B, Full Body (deload) |

#### Day Index Assignment (default)

| Days | Assigned Day Indexes (1=Mon, 7=Sun) |
|------|-------------------------------------|
| 1 | [1] |
| 2 | [1, 4] |
| 3 | [1, 3, 5] |
| 4 | [1, 2, 4, 5] |
| 5 | [1, 2, 3, 5, 6] |
| 6 | [1, 2, 3, 4, 5, 6] |
| 7 | [1, 2, 3, 4, 5, 6, 7] |

#### Muscle Group → Split Day Mapping

Each split type defines which muscle groups are trained on which day:

```
Full Body day      → Legs + Chest + Back + Shoulders + Core (1–2 each)
Upper day/Push day → Chest, Shoulders, Triceps
Pull day           → Back, Biceps
Lower/Legs day     → Legs, Glutes, Core
Upper A vs Upper B → slight variation (e.g. A = Barbell emphasis, B = Dumbbell/Cable)
```

When `focusMuscleGroups` are selected, those groups get priority (extra exercises assigned, 2–3 instead of 1–2).

#### Exercise Count Per Day

| Split Days | Exercises Per Day |
|-----------|-----------------|
| 1–2 | 5–7 |
| 3–4 | 4–6 |
| 5–7 | 4–5 |

#### Exercise Selection Logic

```
For each day:
  1. Start with required muscles for that split type
  2. For each required muscle group:
     a. Get exercises from exerciseDatabase.ts for that group
     b. Prioritize compound movements (Barbell, Dumbbell) first
     c. Fill secondary slots with isolation movements (Cable, Machine, Band)
     d. If muscle is in focusMuscleGroups: assign 2 exercises instead of 1
  3. Shuffle within each muscle group to add variety across weeks
  4. Ensure no exact same exercise appears twice in the same week (across days)
     - Exception: Full Body days may repeat primary compounds
```

#### Set/Rep/Weight Assignment by Goal

| Goal | Sets | Rep Min | Rep Max | Target RPE | Weight Multiplier |
|------|------|---------|---------|------------|-------------------|
| `strength` | 5 | 3 | 5 | 8.5 | 1.00 |
| `hypertrophy` | 4 | 8 | 12 | 7.5 | 0.75 |
| `endurance` | 3 | 15 | 20 | 6.0 | 0.50 |
| `fat_loss` | 3 | 12 | 15 | 7.0 | 0.60 |
| `general_fitness` | 3 | 8 | 12 | 7.0 | 0.70 |

#### Weight Calculation

```typescript
const baseWeight = userWeightLb
  * exercise.bodyweightMultiplier
  * goalWeightMultiplier
  * experience.multiplier;

const rounded = Math.round(baseWeight / 2.5) * 2.5;  // nearest 2.5 lb
const suggested = Math.max(rounded, 0);
```

For bodyweight exercises (Plank, Push-up, Pull-up, etc.): `suggestedWeightLb = 0`.

#### Multi-Week Generation

Generate **all** `durationWeeks × daysPerWeek` program days, not just week 1.

- **Week 1**: use calculated base weights as above
- **Week N (N > 1)**: apply `baseWeight × (1 + 0.05 × (N - 1))` — 5% linear increase per week
- This baseline gets overridden by the progression engine once real data exists from logged workouts

#### Workout Name Generation

```
Full Body  → "Full Body"
Upper A    → "Upper Body A"
Lower A    → "Lower Body A"
Push A     → "Push Day"
Pull A     → "Pull Day"
Legs A     → "Leg Day"
(with A/B suffix if split has duplicates)
```

#### Estimated Duration

```
exercises × 4.5 min per set on average + 2 min transition per exercise
```

---

### Task 1.2 — Save Generated Program to Supabase

**File**: `utils/saveProgramToDb.ts`

```typescript
export async function saveProgramToDb(
  userId: string,
  params: ProgramGenParams,
  generated: GeneratedProgram
): Promise<string>  // returns new programs.id
```

**Steps in order**:

1. **Deactivate existing programs**
   ```sql
   UPDATE programs SET is_active = false, updated_at = now()
   WHERE user_id = $userId AND is_active = true
   ```

2. **Insert program row**
   ```sql
   INSERT INTO programs (user_id, name, goal, duration_weeks, start_date, is_active)
   VALUES ($userId, $name, $goal, $durationWeeks, today(), true)
   RETURNING id
   ```

3. **Upsert all exercises** (collect unique names from `generated.days[].exercises[]`):
   ```sql
   INSERT INTO exercises (name, primary_muscle, equipment)
   VALUES (...)
   ON CONFLICT (name) DO NOTHING
   RETURNING id, name
   ```
   Build a `Map<exerciseName, exerciseId>` from the result.

4. **Insert program_days** (all weeks × days):
   ```sql
   INSERT INTO program_days (program_id, week_number, day_index, order_in_week, workout_name, estimated_duration_min)
   VALUES (...)
   RETURNING id, week_number, day_index
   ```
   Build a `Map<weekNumber_dayIndex, programDayId>`.

5. **Insert program_day_exercises** for all days:
   ```sql
   INSERT INTO program_day_exercises (
     program_day_id, exercise_id, position,
     set_count, rep_range_min, rep_range_max,
     target_rpe, suggested_weight_lb, notes
   ) VALUES (...)
   ```

6. Return `programId`.

**Error handling**: if any step throws, the whole function throws. Caller wraps in try/catch and shows `Alert.alert`. No partial cleanup needed — the new program simply won't be active if it failed.

---

### Task 1.3 — GenerateProgramModal Component

**File**: `components/GenerateProgramModal.tsx`

**Props interface**:
```typescript
interface GenerateProgramModalProps {
  visible: boolean;
  onClose: () => void;
  onProgramCreated: () => void;
  defaultParams?: Partial<ProgramGenParams>;
}
```

**Complete UI specification**:

```
┌─────────────────────────────────────────────┐
│ ● Generate Your Program          [X]        │  ← header row
│ Build a custom plan based on your goals     │  ← subtitle
├─────────────────────────────────────────────┤
│ Days per week                               │
│ [1] [2] [3] [4] [5] [6] [7]               │  ← numbered circles, tap to select
│                                             │
│ Program Length                              │
│ ← [4 wk] [6 wk] [8 wk] [10 wk] [12 wk] [16 wk] →  ← horizontal scroll pills
│                                             │
│ Training Goal                               │
│ [Strength] [Hypertrophy] [Endurance]        │
│ [Fat Loss] [General Fitness]                │  ← chips, single-select
│                                             │
│ Focus Muscle Groups (Optional)              │
│ [Chest] [Back] [Shoulders] [Biceps]         │
│ [Triceps] [Legs] [Glutes] [Core]            │
│ [Full Body]                                 │  ← chips, multi-select
│                                             │
├─────────────────────────────────────────────┤
│ [          Generate My Program          ]   │  ← PRIMARY_COLOR, full width
│ [             Skip for now              ]   │  ← MUTED_BG, smaller text
└─────────────────────────────────────────────┘
```

**State**:
```typescript
const [daysPerWeek, setDaysPerWeek] = useState(defaultParams?.daysPerWeek ?? 3);
const [durationWeeks, setDurationWeeks] = useState(defaultParams?.durationWeeks ?? 8);
const [goal, setGoal] = useState<TrainingGoal>(defaultParams?.goal ?? 'general_fitness');
const [focusMuscles, setFocusMuscles] = useState<MuscleGroup[]>(defaultParams?.focusMuscleGroups ?? []);
const [loading, setLoading] = useState(false);
```

**Chip/circle styling** (active vs inactive):
- Active day circle: `backgroundColor: PRIMARY_COLOR`, `color: WHITE`
- Inactive day circle: `backgroundColor: MUTED_BG`, `borderColor: BORDER_COLOR`
- Active goal chip: `backgroundColor: PRIMARY_COLOR`, `borderColor: PRIMARY_COLOR`
- Inactive goal chip: `backgroundColor: 'transparent'`, `borderColor: BORDER_COLOR`
- Active muscle chip: `backgroundColor: SECONDARY_COLOR`, (secondary purple for visual distinction from goal)
- Inactive muscle chip: `backgroundColor: 'transparent'`, `borderColor: BORDER_COLOR`

**Generate handler**:
```typescript
const handleGenerate = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data: profile } = await supabase
      .from('user_profile')
      .select('weight_lb, experience_level')
      .eq('user_id', user.id)
      .single();

    const weightLb = profile?.weight_lb ?? 150;  // fallback if not set
    const experience = profile?.experience_level ?? 'beginner';

    const params: ProgramGenParams = { daysPerWeek, durationWeeks, goal, focusMuscleGroups: focusMuscles };
    const generated = generateProgram(params, weightLb, experience);
    await saveProgramToDb(user.id, params, generated);

    onProgramCreated();
    onClose();
  } catch (err: any) {
    Alert.alert('Could not generate program', err?.message ?? 'Please try again.');
  } finally {
    setLoading(false);
  }
};
```

**Bottom sheet structure** (identical to `SwapExerciseModal`):
```typescript
<View style={styles.backdrop}>
  <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onClose} />
  <View style={styles.sheet}>
    {/* header, scrollable body, footer */}
  </View>
</View>
```

**Wrap in `<Modal>` at call site**, not internally. The component just renders the backdrop + sheet, exactly like `SwapExerciseModal`.

---

### Task 1.4 — Post-Signup Trigger in Quick Setup

**File**: `app/(qsetup)/quick-setup.tsx`

**Current `handleContinue` end**:
```typescript
router.replace('/(tabs)/home');
```

**New state + flow**:
```typescript
const [showGenModal, setShowGenModal] = useState(false);

// In handleContinue, replace router.replace with:
setShowGenModal(true);

// Add below return JSX:
<Modal visible={showGenModal} transparent animationType="slide">
  <GenerateProgramModal
    visible={showGenModal}
    defaultParams={{ daysPerWeek: 3, durationWeeks: 8, goal: 'general_fitness', focusMuscleGroups: [] }}
    onClose={() => {
      setShowGenModal(false);
      router.replace('/(tabs)/home');
    }}
    onProgramCreated={() => {
      setShowGenModal(false);
      router.replace('/(tabs)/home');
    }}
  />
</Modal>
```

**User flow**: Quick Setup saves → modal appears → user either generates a program (or skips) → navigates to home. In both cases they land on the Plan tab with a program already created (or an empty state if they skipped).

---

### Task 1.5 — Plan Screen Entry Points

**File**: `app/(tabs)/plan.tsx`

**Change 1 — EmptyState component** (currently has 2 buttons):
```typescript
// Add third button between existing two (or below):
<Pressable
  disabled={busy}
  onPress={onGenerateProgram}     // new prop
  style={({ pressed }) => [
    {
      width: '100%',
      maxWidth: 420,
      backgroundColor: PRIMARY_COLOR,
      borderWidth: 1,
      borderColor: BORDER_COLOR,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: 'center',
      opacity: busy ? 0.6 : pressed ? 0.85 : 1,
      marginBottom: 10,
    },
  ]}
>
  <Text style={{ color: WHITE, fontWeight: '700' }}>Generate Personal Program</Text>
</Pressable>
```

**Change 2 — Top menu** (the `MoreVertical` `showMenu` state):
Add "Generate New Program" as the first menu item, above "Create Custom Program".

**Change 3 — State + Modal**:
```typescript
const [showGenModal, setShowGenModal] = useState(false);

// In JSX:
<Modal visible={showGenModal} transparent animationType="slide">
  <GenerateProgramModal
    visible={showGenModal}
    onClose={() => setShowGenModal(false)}
    onProgramCreated={() => {
      setShowGenModal(false);
      refresh();  // from useCurrentProgram
    }}
  />
</Modal>
```

---

## Phase 2 — Workout Save + Progressive Overload

---

### Task 2.1 — Save Workout on Finish

**File**: `app/next-workout.tsx`

**Current problem**: `handleFinish` clears the timer and calls `router.back()`. No data is saved.

**New `handleFinish`**:
```typescript
const [saving, setSaving] = useState(false);

const handleFinish = async () => {
  if (intervalRef.current) clearInterval(intervalRef.current);
  setShowFinishModal(false);
  setSaving(true);

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error('Not signed in');

    // Compute total volume from all logged sets
    const totalVolumeLb = exercises.reduce((total, ex) =>
      total + ex.sets
        .filter(s => s.logged)
        .reduce((setTotal, s) => {
          const weight = parseFloat(s.weight) || 0;
          const reps   = parseInt(s.reps)   || 0;
          return setTotal + weight * reps;
        }, 0),
      0
    );

    // Insert workout_sessions row
    const { data: sessionRow, error: sessionErr } = await supabase
      .from('workout_sessions')
      .insert({
        user_id:         user.id,
        program_day_id:  INITIAL_WORKOUT.programDayId ?? null,
        workout_name:    INITIAL_WORKOUT.name,
        started_at:      new Date(Date.now() - elapsed * 1000).toISOString(),
        ended_at:        new Date().toISOString(),
        duration_min:    Math.round(elapsed / 60),
        total_volume_lb: Math.round(totalVolumeLb),
      })
      .select('id')
      .single();

    if (sessionErr) throw sessionErr;

    // Collect all logged sets (workout_exercise_sets has no user_id — linked via session)
    const setRows = exercises.flatMap(ex =>
      ex.sets
        .filter(s => s.logged)
        .map((s, idx) => ({
          session_id:  sessionRow?.id,
          exercise_id: ex.exerciseId,   // must be the real UUID from program_day_exercises
          set_number:  idx + 1,
          weight_lb:   parseFloat(s.weight) || null,
          reps:        parseInt(s.reps)     || null,
          rpe:         parseFloat(s.rpe)    || null,
        }))
    );

    if (setRows.length > 0) {
      const { error: setsErr } = await supabase
        .from('workout_exercise_sets')
        .insert(setRows);
      if (setsErr) throw setsErr;
    }
  } catch (err) {
    // Non-blocking: log error but don't prevent navigation
    console.error('[handleFinish] Failed to save workout:', err);
  } finally {
    setSaving(false);
    router.back();
  }
};
```

**FinishModal changes**: Pass `saving` prop; disable confirm button and show "Saving…" text while `saving === true`.

**Future improvement note**: Once `next-workout.tsx` is connected to real program data (instead of the static `INITIAL_WORKOUT`), populate `exercise_id` and `program_day_exercise_id` from the actual `program_day_exercises` rows.

---

### Task 2.2 — Progression Engine

**File**: `utils/progressionEngine.ts`

```typescript
import type { ProgressionContext, ProgressionResult } from '@/types/progression';

export function computeProgression(ctx: ProgressionContext): ProgressionResult {
  const { lastSessionSets, experienceLevel, readinessScore,
          currentWeightLb, currentRepMin, currentRepMax } = ctx;

  // ── Edge case: no data ──────────────────────────────────────
  if (lastSessionSets.length === 0) {
    return {
      suggestedWeightLb: currentWeightLb,
      repRangeMin: currentRepMin,
      repRangeMax: currentRepMax,
      action: 'hold',
      reason: 'No logged sets found for this exercise. Holding current weight.',
    };
  }

  // ── Step 1: Compute averages ──────────────────────────────────
  const avgReps = lastSessionSets.reduce((s, x) => s + x.reps, 0) / lastSessionSets.length;
  const rpeValues = lastSessionSets.filter(x => x.rpe !== null).map(x => x.rpe!);
  const avgRPE = rpeValues.length > 0
    ? rpeValues.reduce((s, x) => s + x, 0) / rpeValues.length
    : 7.0;  // assume neutral if no RPE logged

  // ── Step 2: Determine performance signal ─────────────────────
  type Signal = 'crush' | 'solid' | 'struggle';
  let signal: Signal;

  if (avgReps >= currentRepMax && avgRPE <= 7.5) {
    signal = 'crush';   // hit top of range with room to spare
  } else if (avgReps < currentRepMin || avgRPE >= 9.0) {
    signal = 'struggle'; // fell short of rep target, or too hard
  } else {
    signal = 'solid';   // within range, appropriate effort
  }

  // ── Step 3: Weight increment by experience ───────────────────
  const incrementLb: Record<typeof experienceLevel, number> = {
    beginner:     5.0,
    intermediate: 2.5,
    advanced:     1.25,
  };
  const increment = incrementLb[experienceLevel];

  // ── Step 4: New weight by signal ─────────────────────────────
  let newWeight: number;
  let action: ProgressionResult['action'];
  let reason: string;

  switch (signal) {
    case 'crush':
      newWeight = currentWeightLb + increment;
      action = 'increase';
      reason = `Averaged ${avgReps.toFixed(1)} reps @ RPE ${avgRPE.toFixed(1)} — above target range with low effort. Adding ${increment} lb.`;
      break;
    case 'struggle':
      newWeight = currentWeightLb * 0.95;
      action = 'decrease';
      reason = `Averaged ${avgReps.toFixed(1)} reps @ RPE ${avgRPE.toFixed(1)} — below target range or too heavy. Reducing by 5%.`;
      break;
    default:
      newWeight = currentWeightLb;
      action = 'hold';
      reason = `Averaged ${avgReps.toFixed(1)} reps @ RPE ${avgRPE.toFixed(1)} — on target. Holding weight.`;
  }

  // ── Step 5: Readiness modifier ───────────────────────────────
  let readinessReason = '';
  if (readinessScore !== null) {
    if (readinessScore < 4) {
      newWeight *= 0.90;
      readinessReason = ` Readiness score ${readinessScore}/10 is low — reducing by an additional 10%.`;
    }
    // Scores 4–10: no additional modifier (high readiness doesn't grant extra weight)
  }

  // ── Step 6: Round to nearest 2.5 lb, floor at 0 ─────────────
  newWeight = Math.max(0, Math.round(newWeight / 2.5) * 2.5);

  return {
    suggestedWeightLb: newWeight,
    repRangeMin: currentRepMin,
    repRangeMax: currentRepMax,
    action,
    reason: reason + readinessReason,
  };
}
```

---

### Task 2.3 — Apply Progression in useCurrentProgram

**File**: `hooks/useCurrentProgram.ts`

Add a new exported function `applyProgressionToNextWeek`:

```typescript
const applyProgressionToNextWeek = useCallback(async () => {
  if (!program) return;

  const userId = await requireUserId();
  const nextWeek = program.currentWeek + 1;
  if (nextWeek > program.totalWeeks) return; // already on last week

  // Get today's (or most recent) readiness score — table is readiness_logs
  const { data: checkin } = await supabase
    .from('readiness_logs')
    .select('readiness_score, sleep_score, soreness, stress, motivation')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // readiness_score is pre-computed (numeric) — use directly
  const readinessScore = checkin?.readiness_score ?? null;

  // Fetch user experience level — field is experience_level
  const { data: profile } = await supabase
    .from('user_profile')
    .select('experience_level')
    .eq('user_id', userId)
    .single();
  const experienceLevel = (profile?.experience_level ?? 'beginner') as TrainingExperience;

  // Get next week's program_day_exercises
  const { data: nextDays } = await supabase
    .from('program_days')
    .select(`
      id,
      program_day_exercises (
        id,
        exercise_id,
        set_count,
        rep_range_min,
        rep_range_max,
        suggested_weight_lb,
        exercises ( name )
      )
    `)
    .eq('program_id', program.id)
    .eq('week_number', nextWeek);

  if (!nextDays) return;

  const updates: Promise<void>[] = [];

  for (const day of nextDays) {
    for (const pde of day.program_day_exercises) {
      const exerciseName = pde.exercises?.name ?? '';

      // Fetch most recent logged sets for this exercise via workout_exercise_sets
      // Filter by exercise_id and join through workout_sessions for user scoping
      const { data: recentSets } = await supabase
        .from('workout_exercise_sets')
        .select('set_number, weight_lb, reps, rpe, workout_sessions!inner(user_id)')
        .eq('exercise_id', pde.exercise_id)
        .eq('workout_sessions.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(pde.set_count);

      const lastSessionSets: LoggedSet[] = (recentSets ?? [])
        .filter(s => s.weight_lb !== null && s.reps !== null)
        .map(s => ({
          setNumber: s.set_number,
          weightLb:  s.weight_lb!,
          reps:      s.reps!,
          rpe:       s.rpe,
        }));

      const ctx: ProgressionContext = {
        pdeId:            pde.id,
        exerciseName,
        currentWeightLb:  pde.suggested_weight_lb ?? 0,
        currentRepMin:    pde.rep_range_min,
        currentRepMax:    pde.rep_range_max,
        experienceLevel,
        lastSessionSets,
        readinessScore,
      };

      const result = computeProgression(ctx);

      updates.push(
        supabase
          .from('program_day_exercises')
          .update({ suggested_weight_lb: result.suggestedWeightLb, updated_at: new Date().toISOString() })
          .eq('id', pde.id)
          .then(() => undefined)
      );
    }
  }

  await Promise.all(updates);
  await refresh();
}, [program, refresh]);
```

**When to call**: in `refresh()`, after computing `currentWeek`, check if week has advanced from last known week and call `applyProgressionToNextWeek()` if so. Add a `useRef<number>` to track the previous week value.

**Helper** (extract from home.tsx readiness logic into `utils/readiness.ts`):
```typescript
export function computeReadinessScore(sleepHours: number, stressLevel: number): number {
  const sleepScore  = Math.min(1, (sleepHours - 3) / (10 - 3)) * 10;
  const stressScore = 10 - stressLevel;
  return (sleepScore + stressScore) / 2;
}
```

---

## Phase 3 — Workout Swap Modal (Real Data)

---

### Task 3.1 — ✅ Wire SwapExerciseModal to Supabase — COMPLETE

**File**: `components/SwapExerciseModal.tsx`

**Implemented**: Supabase query with local DB fallback. Key runtime issue discovered and fixed:

**⚠️ Null `primary_muscle` gotcha**: AI-generated exercises may have `primary_muscle = null` in Supabase, causing `muscleGroup` to be `undefined` on the exercise object. The original early-return guard (`if (!muscleGroup) return`) caused "No exercises found" for these exercises.

**Fix applied**:
- When `muscleGroup` is undefined, search `exercisesByMuscleGroup` from `lib/exerciseDatabase.ts` by exercise name (case-insensitive) to infer the correct muscle group
- Store resolved group in `resolvedMuscleGroup` state for the section label (e.g., "CHEST EXERCISES")
- Changed `useEffect` dependency from `currentExercise?.muscleGroup` → `currentExercise?.id` so effect always fires when a new exercise is selected
- Fallback to all exercises only if name is not found in local DB at all

**Replacement approach**:

```typescript
const [alternatives, setAlternatives] = useState<WorkoutExercise[]>([]);
const [loadingExercises, setLoadingExercises] = useState(false);

useEffect(() => {
  if (!currentExercise) return;
  loadAlternatives(currentExercise.muscleGroup);
}, [currentExercise?.muscleGroup]);

async function loadAlternatives(muscleGroup: MuscleGroup) {
  setLoadingExercises(true);
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, primary_muscle, equipment')
      .eq('primary_muscle', muscleGroup)
      .order('name');

    if (!error && data && data.length > 0) {
      setAlternatives(data.map(ex => ({
        id:          ex.id,
        name:        ex.name,
        muscleGroup: ex.primary_muscle as MuscleGroup,
        equipment:   ex.equipment as Equipment,
        sets:        3,
        reps:        '8–12',
      })));
    } else {
      // Fallback: use local exercise database (Task 0.2)
      const local = getAlternativesFor(muscleGroup, [exerciseId]);
      setAlternatives(local.map(ex => ({
        id:          ex.id,
        name:        ex.name,
        muscleGroup: ex.muscleGroup,
        equipment:   ex.equipment,
        sets:        ex.defaultSets,
        reps:        `${ex.defaultRepMin}–${ex.defaultRepMax}`,
      })));
    }
  } finally {
    setLoadingExercises(false);
  }
}
```

**filteredAlternatives** (uncomment and update):
```typescript
const filteredAlternatives = useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  return alternatives.filter(ex => {
    if (ex.id === exerciseId) return false;
    if (currentExercise && ex.name === currentExercise.name) return false;
    if (!q) return true;
    return ex.name.toLowerCase().includes(q);
  });
}, [alternatives, searchQuery, exerciseId, currentExercise]);
```

**JSX list** (uncomment and update with `loadingExercises` state):
```tsx
{loadingExercises ? (
  <ActivityIndicator color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
) : filteredAlternatives.length === 0 ? (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyText}>No exercises found</Text>
  </View>
) : (
  filteredAlternatives.map(ex => {
    const isSelected = selectedExercise?.id === ex.id;
    return (
      <Pressable
        key={ex.id}
        onPress={() => setSelectedExercise(ex)}
        style={({ pressed }) => [styles.exerciseRow, isSelected && styles.exerciseRowSelected, pressed && { opacity: 0.92 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          <Text style={styles.exerciseMeta}>{ex.equipment}</Text>
          <View style={styles.exerciseStatsRow}>
            <Text style={styles.statText}>{ex.sets} sets</Text>
            <Text style={styles.statText}>{ex.reps} reps</Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkCircle}>
            <Check color={WHITE} size={14} />
          </View>
        )}
      </Pressable>
    );
  })
)}
```

---

### Task 3.2 — ✅ Swap from Active Workout Screen — COMPLETE

**File**: `app/next-workout.tsx`

The `Exercise` type in this file currently has no `muscleGroup` field. The static dummy data doesn't include it. For the swap modal to work, we need to extend `Exercise` (or use the `WorkoutExercise` type from `types/program.ts`).

**Approach**: add optional `muscleGroup?: MuscleGroup` to the local `Exercise` interface, and populate it in the static dummy data for now.

**State additions**:
```typescript
const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
```

**Change `onPressSwap`**:
```typescript
onPressSwap={() => setSwapTargetId(exercise.id)}
```

**Minimal mock CurrentProgram** (needed as SwapExerciseModal prop):
```typescript
const mockProgramForSwap = useMemo<CurrentProgram>(() => ({
  id: 'active-session',
  name: INITIAL_WORKOUT.name,
  goal: '',
  currentWeek: 1,
  totalWeeks: 1,
  daysPerWeek: 1,
  workouts: [{
    id: 'active-day',
    name: INITIAL_WORKOUT.name,
    day: 'Today',
    estimatedTime: 0,
    exercises: exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: undefined,
    })),
  }],
}), [exercises]);
```

**Add Modal**:
```tsx
<Modal visible={swapTargetId !== null} transparent animationType="slide">
  {swapTargetId && (
    <SwapExerciseModal
      program={mockProgramForSwap}
      exerciseId={swapTargetId}
      context="workout"
      onClose={() => setSwapTargetId(null)}
      onSwap={({ exerciseId, replacement }) => {
        // In-session only: update local state
        setExercises(prev =>
          prev.map(ex =>
            ex.id === exerciseId
              ? { ...ex, id: replacement.id, name: replacement.name, muscleGroup: replacement.muscleGroup }
              : ex
          )
        );
        setSwapTargetId(null);
      }}
    />
  )}
</Modal>
```

**Note**: `applyToProgram` toggle in SwapExerciseModal is context-aware. When `context="workout"`, it shows the toggle. If the user enables it and confirms, a separate call to `useCurrentProgram().swapExercise()` should be made. For the MVP, the in-session local swap is sufficient; program-level swap from the active workout can be a follow-up.

---

## Phase 4 — Exercise History Modal

---

### Task 4.1 — ✅ Exercise History Fetch Utility — COMPLETE

**File**: `utils/fetchExerciseHistory.ts`

```typescript
import { supabase } from '@/utils/supabase';
import type { ExerciseHistoryEntry } from '@/types/program';

export async function fetchExerciseHistory(
  exerciseName: string,
  limit = 10
): Promise<ExerciseHistoryEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch all sets for this exercise, newest first
    // Join workout_sessions for session metadata (no workout_history table — use workout_sessions)
    const { data: rows, error } = await supabase
      .from('workout_exercise_sets')
      .select(`
        id,
        session_id,
        set_number,
        weight_lb,
        reps,
        rpe,
        created_at,
        workout_sessions!inner (
          user_id,
          workout_name,
          ended_at
        )
      `)
      .eq('exercise_id', exerciseId)
      .eq('workout_sessions.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit * 8); // over-fetch since we group by session

    if (error || !rows) return [];

    // Group by session_id
    const sessionMap = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.session_id ?? row.created_at.slice(0, 10);
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(row);
    }

    // Convert to ExerciseHistoryEntry[], take at most `limit` sessions
    const entries: ExerciseHistoryEntry[] = [];
    for (const [key, sessionRows] of sessionMap) {
      if (entries.length >= limit) break;

      const firstRow = sessionRows[0];
      const sessionMeta = firstRow.workout_sessions as { workout_name?: string; ended_at?: string } | null;

      const sets = sessionRows
        .sort((a, b) => a.set_number - b.set_number)
        .map(r => ({
          setNumber: r.set_number,
          weightLb:  r.weight_lb !== null ? Number(r.weight_lb) : null,
          reps:      r.reps,
          rpe:       r.rpe !== null ? Number(r.rpe) : null,
        }));

      const totalVolumeLb = sets.reduce(
        (sum, s) => sum + ((s.weightLb ?? 0) * (s.reps ?? 0)),
        0
      );

      entries.push({
        sessionId:   key,
        workoutName: sessionMeta?.workout_name ?? 'Workout',
        completedAt: sessionMeta?.ended_at ?? firstRow.created_at,
        sets,
        totalVolumeLb,
      });
    }

    return entries; // already sorted newest-first
  } catch {
    return []; // never throw — empty is always a valid response
  }
}
```

---

### Task 4.2 — ✅ ExerciseHistoryModal Component — COMPLETE

**File**: `components/ExerciseHistoryModal.tsx`

**Props**:
```typescript
interface ExerciseHistoryModalProps {
  exerciseId: string;      // UUID from exercises table (passed from ExerciseCard via program_day_exercises)
  exerciseName: string;    // For display only
  onClose: () => void;
}
```

**Visual specification**:

```
┌─────────────────────────────────────────────┐
│ Exercise History               [X]          │  ← header
│ Barbell Bench Press                         │  ← exercise name subtitle
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │  Tue, Jan 14 · Upper Body A           │  │  ← session card header
│  │  Set 1    185 lb × 8    @ RPE 7.5    │  │
│  │  Set 2    185 lb × 8    @ RPE 8.0    │  │
│  │  Set 3    185 lb × 7    @ RPE 8.5    │  │
│  │  Set 4    185 lb × 6    @ RPE 9.0    │  │
│  │                                       │  │
│  │  Total: 5,920 lb  ▲ +240 lb          │  │  ← volume trend
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Thu, Jan 9 · Upper Body A            │  │
│  │  ...                                  │  │
│  │  Total: 5,680 lb                      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Loading skeleton** (3 placeholder cards while fetching):
```tsx
{loading && Array.from({ length: 3 }).map((_, i) => (
  <View key={i} style={[styles.sessionCard, { opacity: 0.4 }]}>
    <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
    <View style={[styles.skeletonLine, { width: '100%', height: 10, marginTop: 8 }]} />
    <View style={[styles.skeletonLine, { width: '100%', height: 10, marginTop: 6 }]} />
    <View style={[styles.skeletonLine, { width: '100%', height: 10, marginTop: 6 }]} />
  </View>
))}
```
Skeleton line: `backgroundColor: MUTED_BG, borderRadius: 4`

**Empty state**:
```tsx
{!loading && entries.length === 0 && (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>🏋️</Text>
    <Text style={styles.emptyTitle}>No history yet</Text>
    <Text style={styles.emptySubtitle}>
      Log a workout with this exercise and your history will appear here.
    </Text>
  </View>
)}
```

**Volume trend calculation**:
```typescript
const trendLb = idx < entries.length - 1
  ? entry.totalVolumeLb - entries[idx + 1].totalVolumeLb
  : null; // no previous session to compare

// Render:
{trendLb !== null && (
  <Text style={{ color: trendLb >= 0 ? SUCCESS : ERROR_COLOR_LIGHT }}>
    {trendLb >= 0 ? '▲' : '▼'} {Math.abs(trendLb).toLocaleString()} lb
  </Text>
)}
```

**Date formatting**:
```typescript
function formatSessionDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });
}
// → "Tue, Jan 14"
```

**Internal logic**:
```typescript
const [entries, setEntries] = useState<ExerciseHistoryEntry[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchExerciseHistory(exerciseName).then(data => {
    setEntries(data);
    setLoading(false);
  });
}, [exerciseName]);
```

---

### Task 4.3 — ✅ Wire History Modal from Active Workout — COMPLETE

**File**: `app/next-workout.tsx`

**State addition**:
```typescript
const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);
```

**Change `onPressHistory`**:
```typescript
onPressHistory={() => setHistoryExerciseName(exercise.name)}
```

**Add Modal** (alongside swap modal):
```tsx
<Modal visible={historyExerciseName !== null} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <Pressable style={StyleSheet.absoluteFill} onPress={() => setHistoryExerciseName(null)} />
    {historyExerciseName && (
      <ExerciseHistoryModal
        exerciseName={historyExerciseName}
        onClose={() => setHistoryExerciseName(null)}
      />
    )}
  </View>
</Modal>
```

---

## Execution Order & Dependencies

### Dependency Map

```
Task 0.1 (DB table)       ─────────────────────────────────► Task 2.1 (save workout)
                                                              │
                                                              ▼
Task 0.2 (exercise DB)    ──► Task 1.1 (gen algorithm)       Task 2.2 (progression engine)
                          │          │                        │
Task 0.3 (types)          ──► Task 1.1 ──► Task 1.2 (DB writer) ──► Task 1.3 (modal)
                          │                                   │
                          │                                   ▼
                          │    Task 1.3 ──► Task 1.4 (post-signup)  Task 2.3 (apply progression)
                          │            └──► Task 1.5 (plan btn)
                          │
                          └──► Task 3.1 (swap wire) ──► Task 3.2 (swap from workout)
                          │
Task 0.1 + 0.3            ──► Task 4.1 (history fetch) ──► Task 4.2 (modal) ──► Task 4.3 (wire)

Task 5.x (reports)        ── no deps
```

### Parallel Execution Groups

| Group | Tasks | Start Condition |
|-------|-------|-----------------|
| A | 0.1, 0.2, 0.3, reports | Immediately |
| B | 1.1, 2.2 | After 0.2 + 0.3 done |
| C | 1.2, 3.1, 4.1 | After 1.1 (for 1.2), 0.2 (for 3.1), 0.1+0.3 (for 4.1) |
| D | 1.3, 2.1 | After 1.2 (for 1.3), 0.1 (for 2.1) |
| E | 1.4, 1.5, 2.3, 3.2, 4.2 | After respective D tasks |
| F | 4.3 | After 4.2 |

### Full Task List

| ID | Title | Phase | Status |
|----|-------|-------|--------|
| 0.1 | ~~Create workout_session_exercises table~~ | Foundation | ✅ OBSOLETE — `workout_exercise_sets` already exists |
| 0.2 | Build lib/exerciseDatabase.ts (fallback only) | Foundation | ✅ Complete |
| 0.3 | Add TypeScript types | Foundation | ✅ Complete |
| 1.1 | Program generation algorithm | Program Gen | ✅ Complete |
| 1.2 | Save generated program to Supabase | Program Gen | ✅ Complete |
| 1.3 | GenerateProgramModal component | Program Gen | ✅ Complete |
| 1.4 | Post-signup trigger in quick-setup | Program Gen | ✅ Complete |
| 1.5 | Plan screen entry points | Program Gen | ✅ Complete |
| 2.1 | Save workout on finish | Progression | ✅ Complete |
| 2.2 | Progression engine | Progression | ✅ Complete |
| 2.3 | Apply progression in useCurrentProgram | Progression | ✅ Complete |
| 3.1 | Wire SwapExerciseModal to Supabase | Swap | ✅ Complete — includes null `primary_muscle` fallback |
| 3.2 | Swap from active workout screen | Swap | ✅ Complete |
| 4.1 | Exercise history fetch utility | History | ✅ Complete |
| 4.2 | ExerciseHistoryModal component | History | ✅ Complete |
| 4.3 | Wire history from active workout | History | ✅ Complete |

---

## UI Standards Reference

All new UI must match the existing look and feel precisely. Follow these rules without exception.

### Colors (from `constants/colors.ts`)

```typescript
PRIMARY_COLOR         = '#2563EB'   // blue — primary buttons, active state
SECONDARY_COLOR       = '#9333EA'   // purple — use for muscle focus chips
BACKGROUND_COLOR      = '#18181b'   // screen background
BACKGROUND_COLOR_DARK = '#09090b'   // darker bg (safe area, etc.)
CARD_BG               = '#111113'   // card/exercise card background
SURFACE_BG            = '#0f0f12'   // modal sheet background
MUTED_BG              = '#222226'   // inactive chip, secondary button
BORDER_COLOR          = '#27272a'   // all borders
TEXT_COLOR            = '#a1a1aa'   // secondary text, metadata
PLACEHOLDER_TEXT      = '#71717a'   // placeholder text
WHITE                 = '#ffffff'   // primary text, button labels
SUCCESS               = '#16a34a'   // positive trend indicator
ERROR_COLOR_LIGHT     = '#ef4444'   // negative trend indicator
```

### Bottom-Sheet Modal Pattern

Matches `SwapExerciseModal.tsx` exactly:

> **⚠️ Critical React Native gotcha — always pair `maxHeight` with `height`**  
> A `ScrollView` with `flex: 1` inside a container that only has `maxHeight` will collapse to zero height because `maxHeight` caps growth but provides no concrete size. Always set both:
> ```typescript
> sheet: { maxHeight: '90%', height: '75%', ... }
> ```
> This applies to `SwapExerciseModal`, `ExerciseHistoryModal`, `WorkoutTemplateModal` (sheet + nestedSheet), and any future bottom sheet modals.

> **⚠️ Nested sheet pattern (WorkoutTemplateModal / Plan page)**  
> On the Plan page, `SwapExerciseModal` is rendered inline inside a `View` overlay (not inside a React Native `<Modal>`). The outer container (`nestedSheet`) must also have explicit `height`:  
> `swapOverlay (absoluteFill)` → `nestedSheet (height: '72%')` → `backdrop (flex: 1)` → `sheet (height: '75%')` → `ScrollView (flex: 1)`

```typescript
// Outer: fill screen with semi-transparent overlay
backdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.82)',
  justifyContent: 'flex-end',
}

// Inner sheet: slides up from bottom
sheet: {
  backgroundColor: SURFACE_BG,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  borderWidth: 1,
  borderColor: BORDER_COLOR,
  overflow: 'hidden',
  maxHeight: '90%',
}

// Header inside sheet
header: {
  paddingHorizontal: 18,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: BORDER_COLOR,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}

// Close button
iconBtn: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: MUTED_BG,
  borderWidth: 1,
  borderColor: BORDER_COLOR,
  alignItems: 'center',
  justifyContent: 'center',
}
```

### Pressable Buttons

```typescript
// Primary action button
{
  backgroundColor: PRIMARY_COLOR,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
}
// Disabled state: opacity: 0.5
// Pressed state: ({ pressed }) => [styles.btn, pressed && { opacity: 0.92 }]

// Secondary / muted button
{
  backgroundColor: MUTED_BG,
  borderWidth: 1,
  borderColor: BORDER_COLOR,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center',
}
```

### Typography

```typescript
// Section label (above chips/sections)
{ color: PLACEHOLDER_TEXT, fontSize: 11, fontWeight: '700', letterSpacing: 1 }

// Card title
{ color: WHITE, fontSize: 18, fontWeight: '800' }

// Body text
{ color: TEXT_COLOR, fontSize: 13 }

// Button label (primary)
{ color: WHITE, fontSize: 15, fontWeight: '800' }
```

### Icons

- **Plan screen / Components**: use `lucide-react-native` (`X`, `Check`, `Search`, `ArrowLeftRight`, `Plus`, `ChevronRight`)
- **Workout screen**: use `@expo/vector-icons` Ionicons (`chevron-back`, `timer-outline`)
- **Do not mix** these libraries within the same component

### StyleSheet Rule

Always use `StyleSheet.create({ ... })`. Never define style objects inline except for dynamic values (widths, opacities based on state). Reuse existing style names where the style matches.

---

## Phase 5 — Readiness Score → Weight & RPE Adjustment

> **Status**: ✅ Mostly complete — one known bug outstanding (see below)

### What Was Built

**Graduated readiness modifier** replacing the original single-threshold check (`< 4 → −10%`). The engine now applies a bi-directional 5-band table that affects both `suggestedWeightLb` and a new `suggestedRPE` output:

| Score | Band | Weight Multiplier | RPE Delta |
|-------|------|-------------------|-----------|
| 1–3 | Very Low | ×0.90 (−10%) | −1.0 |
| 4–5 | Low | ×0.95 (−5%) | −0.5 |
| 6–7 | Moderate | ×1.00 (no change) | 0.0 |
| 8–9 | Good | ×1.025 (+2.5%) | +0.5 |
| 10 | Excellent | ×1.05 (+5%) | +1.0 |

RPE is clamped to [5.0, 10.0].

**Files changed:**

| File | Change |
|------|--------|
| `types/progression.ts` | Added `currentTargetRPE: number \| null` to `ProgressionContext`; added `suggestedRPE: number \| null` to `ProgressionResult` |
| `utils/progressionEngine.ts` | Replaced Step 5 with graduated 5-band table; exported new `getReadinessModifier()` helper and `ReadinessModifier` interface |
| `hooks/useCurrentProgram.ts` | Passes `currentTargetRPE` to context; writes `target_rpe` back to DB alongside `suggested_weight_lb`; added `applyReadinessAdjustmentOnly(score)` |
| `app/(tabs)/home.tsx` | Added `ReadinessAdjustmentModal` popup that fires after check-in Continue; shows adjustment direction/magnitude; "Apply Adjustment" / "Keep Weights As-Is" buttons |

### `getReadinessModifier(score)` — Exported Helper

```typescript
// Returns { weightMultiplier, rpeDelta, label, description, isNeutral }
// Used by progressionEngine.ts (Step 5) and home.tsx (popup preview)
import { getReadinessModifier } from '@/utils/progressionEngine';
```

### Readiness Adjustment Popup Flow

1. User completes readiness check-in → taps **Continue**
2. Score saved to `readiness_logs`
3. If score is **not** in the neutral band (6–7), `ReadinessAdjustmentModal` appears
4. Popup shows: score badge (color-coded), description, weight % pill, confirmation buttons
5. **Apply Adjustment** → calls `applyReadinessAdjustmentOnly(score)` which updates `suggested_weight_lb` + `target_rpe` on the first program day of the current week
6. **Keep Weights As-Is** → dismisses with no DB changes

---

### ⚠️ Known Bug — Readiness adjustment not persisting to next workout

**Symptom**: Tapping "Apply Adjustment" in the popup does not visibly change the suggested weight on the next workout screen.

**Root cause (suspected)**: `applyReadinessAdjustmentOnly` queries `program_days` filtered by `week_number = program.currentWeek` and `limit(1)`. However, `program` state in `home.tsx` may be `null` (since `useCurrentProgram` runs an async fetch on mount and the program may not be loaded yet when the popup is confirmed). If `program` is null, the function returns early without applying any changes.

**Fix needed**:
- Option A: Await program load before enabling the Apply button (disable it with a loading indicator until `!loading && program !== null`)
- Option B: Pass the `program.id` and `currentWeek` directly into `applyReadinessAdjustmentOnly` so it doesn't depend on hook state timing
- Option C: Trigger a `refresh()` call first inside `applyReadinessAdjustmentOnly`, then apply

**Recommended fix (Option A)**: In `HomeScreen`, destructure `{ applyReadinessAdjustmentOnly, program, loading }` from `useCurrentProgram()`. Disable the Apply button when `!program || loading`.

**Task ID for tracking**: `bug-readiness-apply`

---

## Codebase Cleanup Notes

> Files reviewed for necessity — no changes made yet, pending approval.

### Candidates for Deletion

| File | Reason |
|------|--------|
| `lib/mockCurrentProgram.ts` | `makeMockCurrentProgram()` is never imported anywhere in the project. Was used during early development before Supabase was wired. |
| `lib/mockData.ts` | Never imported anywhere. Same situation as above. |
| `scripts/reset-project.js` | Expo template scaffold script. The file itself states: *"You can remove the reset-project script from package.json and safely delete this file after running it."* The project has already been set up. |

### Keep — Confirmed Necessary

| File | Reason |
|------|--------|
| `index.js` | **Do not delete.** This is the app entry point (`"main": "./index.js"` in `package.json`). It installs a FormData polyfill required for Expo SDK 54 + Hermes (the `installFormDataPatch` function is referenced in `expo/build/winter/FormData.d.ts`). Removing it will break the app on device. |
| `scripts/seedExercises.ts` | Referenced as `npm run seed:exercises`. The exercises table is already seeded, but this script is useful documentation and a reseeding tool. Low priority to delete. |
| All files in `utils/`, `hooks/`, `components/`, `app/` | Actively imported and used. |

---

*End of Implementation Plan*
*Generated: planning session | Model: Claude Opus 4.6*
*Last updated: 2026-03-27 — Phase 5 readiness modifier + cleanup notes added*

