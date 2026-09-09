# TODO — AdaptivPush Feature Sprint

Refs: `reports/IMPLEMENTATION_PLAN.md`

> ⚠️ **Schema Update**: Real Supabase schema confirmed. Key changes:
> - `workout_exercise_sets` already exists (not `workout_session_exercises`) — **no migration needed**
> - `workout_sessions` is the session table (not `workout_history`)  
> - `readiness_logs` is the readiness table (not `readiness_checkins`)
> - `exercises` are already seeded — query Supabase first, local file is fallback only
> - `user_profile` uses `training_experience` (not `experience_level`)

---

## Phase 0 — Shared Foundation

* Major Task: Lay shared groundwork (no dependencies — do first or in parallel)
   * Mid-level Task: ~~Database migration~~ ✅ OBSOLETE — `workout_exercise_sets` already exists, no migration needed
   * Mid-level Task: Local exercise database (fallback only)
      * Minor task: Create `lib/exerciseDatabase.ts` with `LocalExercise` interface (reduced scope — Supabase is primary)
      * Minor task: Add exercises per MuscleGroup (used only if Supabase returns empty)
      * Minor task: Export `exercisesByMuscleGroup` record and `getAlternativesFor()` function
   * Mid-level Task: TypeScript types
      * Minor task: Add `TrainingGoal`, `ProgramGenParams`, `GeneratedProgram`, `ExerciseHistoryEntry` to `types/program.ts`
      * Minor task: Create `types/progression.ts` with `LoggedSet`, `ProgressionContext`, `ProgressionResult`

---

## Phase 1 — Personalized Program Generation

* Major Task: Build the program generation system
   * Mid-level Task: Generation algorithm
      * Minor task: Create `utils/programGenerator.ts`
      * Minor task: Implement split logic by `daysPerWeek` (1=Full Body → 7=PPL×2+Deload)
      * Minor task: Implement exercise selection (query Supabase `exercises` by `primary_muscle`; compound-first, focus muscle priority)
      * Minor task: Implement set/rep/weight assignment table by goal
      * Minor task: Implement weight calculation (user `weight_lb` from `user_profile` × multipliers, round to 2.5 lb)
      * Minor task: Generate all weeks (5% linear progression baseline for weeks 2+)
   * Mid-level Task: DB writer
      * Minor task: Create `utils/saveProgramToDb.ts`
      * Minor task: Deactivate existing active programs (`programs.is_active = false`)
      * Minor task: Match exercises to existing DB rows by name (no upsert needed — already seeded)
      * Minor task: Insert `programs` (include `days_per_week`), `program_days` (include `is_rest_day`, `is_deload_week`), `program_day_exercises` rows
   * Mid-level Task: GenerateProgramModal component
      * Minor task: Create `components/GenerateProgramModal.tsx`
      * Minor task: Pre-fill form from `user_profile.days_per_week`, `training_goal`, `training_experience`
      * Minor task: Days per week selector (7 numbered circles)
      * Minor task: Program length pills (4/6/8/10/12/16 wk)
      * Minor task: Training goal chips (5 options, single-select)
      * Minor task: Focus muscle group chips (9 options, multi-select)
      * Minor task: Generate CTA with `ActivityIndicator` loading state
      * Minor task: Skip button
      * Minor task: Wire to `generateProgram()` + `saveProgramToDb()`
   * Mid-level Task: Post-signup trigger
      * Minor task: Add `showGenModal` state to `app/(qsetup)/quick-setup.tsx`
      * Minor task: Replace `router.replace` in `handleContinue` with `setShowGenModal(true)`
      * Minor task: Add `GenerateProgramModal` with default params (3 days, 8 wk, general_fitness)
      * Minor task: On modal close (skip or success): `router.replace('/(tabs)/home')`
   * Mid-level Task: Plan screen entry points
      * Minor task: Add "Generate Personal Program" button to `EmptyState` (PRIMARY_COLOR)
      * Minor task: Add "Generate New Program" to active-program `MoreVertical` menu
      * Minor task: Wire both to `GenerateProgramModal` + `refresh()` on success

---

## Phase 2 — Workout Save + Progressive Overload

* Major Task: Persist workout data and compute progression
   * Mid-level Task: Save workout on finish
      * Minor task: Refactor `handleFinish` in `app/next-workout.tsx` to async
      * Minor task: Insert `workout_sessions` row (user_id, program_day_id, workout_name, started_at, ended_at, duration_min, total_volume_lb)
      * Minor task: Insert all logged sets into `workout_exercise_sets` (session_id, exercise_id, set_number, weight_lb, reps, rpe)
      * Minor task: Add `saving` state; disable FinishModal confirm while saving
      * Minor task: Fix `history.tsx` and `profile/index.tsx` to query `workout_sessions` (not `workout_history`)
      * Minor task: Fix `home.tsx` to query `readiness_logs` (not `readiness_checkins`)
   * Mid-level Task: Progression engine
      * Minor task: Create `utils/progressionEngine.ts`
      * Minor task: Compute avgReps and avgRPE from lastSessionSets
      * Minor task: Map signal → action (crush/solid/struggle)
      * Minor task: Apply experience-level increment (beginner 5 lb, intermediate 2.5 lb, advanced 1.25 lb)
      * Minor task: Apply readiness modifier (score < 4 → ×0.90, use `readiness_logs.readiness_score`)
      * Minor task: Round result to nearest 2.5 lb
      * Minor task: Handle all edge cases (empty sets, null RPE, null readiness)
   * Mid-level Task: Apply progression to useCurrentProgram
      * Minor task: Add `applyProgressionToNextWeek()` to `hooks/useCurrentProgram.ts`
      * Minor task: Fetch last session sets from `workout_exercise_sets` (filter by exercise_id, join workout_sessions for user scoping)
      * Minor task: Fetch today's readiness from `readiness_logs` (field: `readiness_score`)
      * Minor task: Read `user_profile.training_experience` for increment selection
      * Minor task: Call `computeProgression()` per PDE, batch UPDATE `suggested_weight_lb`
      * Minor task: Guard against re-running on same week (track previous week with useRef)

---

## Phase 3 — Workout Swap Modal (Real Data)

* Major Task: Connect swap modal to real exercise data
   * Mid-level Task: Wire SwapExerciseModal
      * Minor task: Add `useEffect` to query Supabase `exercises` by `primary_muscle` (also use `secondary_muscles` for broader matching)
      * Minor task: Add local fallback via `getAlternativesFor()` if Supabase returns empty
      * Minor task: Add `ActivityIndicator` loading state while fetching
      * Minor task: Uncomment `filteredAlternatives` useMemo and JSX list block
   * Mid-level Task: Swap from active workout
      * Minor task: Add `muscleGroup?: MuscleGroup` to local `Exercise` interface in `next-workout.tsx`
      * Minor task: Add `swapTargetId` state and `setSwapTargetId` in `next-workout.tsx`
      * Minor task: Wire `onPressSwap` to set `swapTargetId`
      * Minor task: Build minimal `mockProgramForSwap` from current `exercises` state
      * Minor task: Add Modal with `SwapExerciseModal` and in-session swap handler

---

## Phase 4 — Exercise History Modal

* Major Task: Show per-exercise history from past workouts
   * Mid-level Task: History fetch utility
      * Minor task: Create `utils/fetchExerciseHistory.ts` — accept `exerciseId` (UUID) and `exerciseName` (display)
      * Minor task: Query `workout_exercise_sets` filtered by `exercise_id`, join `workout_sessions!inner(user_id, workout_name, ended_at)`
      * Minor task: Filter by `workout_sessions.user_id = auth.uid()`
      * Minor task: Group rows by `session_id`, build `ExerciseHistoryEntry[]`
      * Minor task: Return newest first, never throw (empty array on error)
   * Mid-level Task: ExerciseHistoryModal component
      * Minor task: Create `components/ExerciseHistoryModal.tsx` (props: `exerciseId`, `exerciseName`, `onClose`)
      * Minor task: Bottom-sheet header with exercise name + X button
      * Minor task: Per-session cards (date from `ended_at`, `workout_name`, set rows with weight/reps/RPE)
      * Minor task: Volume total per session
      * Minor task: Volume trend indicator vs prior session (SUCCESS green / ERROR_COLOR_LIGHT red)
      * Minor task: 3 skeleton placeholder cards while loading
      * Minor task: Empty state (icon + message)
   * Mid-level Task: Wire from active workout
      * Minor task: Add `historyExercise` state (`{ id, name } | null`) to `next-workout.tsx`
      * Minor task: Wire `onPressHistory` to set exercise id+name (must come from `program_day_exercises.exercise_id`)
      * Minor task: Add Modal with `ExerciseHistoryModal`

---

## Completed

*(move tasks here as they are done)*


Refs: `reports/IMPLEMENTATION_PLAN.md`

---

## Phase 0 — Shared Foundation

* Major Task: Lay shared groundwork (no dependencies — do first or in parallel)
   * Mid-level Task: Database migration
      * Minor task: Write `reports/migrations/001_workout_session_exercises.sql` ✅ DONE
      * Minor task: Run migration in Supabase dashboard SQL editor
   * Mid-level Task: Local exercise database
      * Minor task: Create `lib/exerciseDatabase.ts` with `LocalExercise` interface
      * Minor task: Add min 5 exercises per MuscleGroup (9 groups × 5 = 45+ entries)
      * Minor task: Export `exercisesByMuscleGroup` record and `getAlternativesFor()` function
   * Mid-level Task: TypeScript types
      * Minor task: Add `TrainingGoal`, `ProgramGenParams`, `GeneratedProgram`, `ExerciseHistoryEntry` to `types/program.ts`
      * Minor task: Create `types/progression.ts` with `LoggedSet`, `ProgressionContext`, `ProgressionResult`

---

## Phase 1 — Personalized Program Generation

* Major Task: Build the program generation system
   * Mid-level Task: Generation algorithm
      * Minor task: Create `utils/programGenerator.ts`
      * Minor task: Implement split logic by `daysPerWeek` (1=Full Body → 7=PPL×2+Deload)
      * Minor task: Implement exercise selection (compound-first, focus muscle priority)
      * Minor task: Implement set/rep/weight assignment table by goal
      * Minor task: Implement weight calculation (bodyweight × multipliers, round to 2.5 lb)
      * Minor task: Generate all weeks (5% linear progression baseline for weeks 2+)
   * Mid-level Task: DB writer
      * Minor task: Create `utils/saveProgramToDb.ts`
      * Minor task: Deactivate existing active programs
      * Minor task: Upsert exercises by name into `exercises` table
      * Minor task: Insert `programs`, `program_days`, `program_day_exercises` rows
   * Mid-level Task: GenerateProgramModal component
      * Minor task: Create `components/GenerateProgramModal.tsx`
      * Minor task: Days per week selector (7 numbered circles)
      * Minor task: Program length pills (4/6/8/10/12/16 wk)
      * Minor task: Training goal chips (5 options, single-select)
      * Minor task: Focus muscle group chips (9 options, multi-select)
      * Minor task: Generate CTA with `ActivityIndicator` loading state
      * Minor task: Skip button
      * Minor task: Wire to `generateProgram()` + `saveProgramToDb()`
   * Mid-level Task: Post-signup trigger
      * Minor task: Add `showGenModal` state to `app/(qsetup)/quick-setup.tsx`
      * Minor task: Replace `router.replace` in `handleContinue` with `setShowGenModal(true)`
      * Minor task: Add `GenerateProgramModal` with default params (3 days, 8 wk, general_fitness)
      * Minor task: On modal close (skip or success): `router.replace('/(tabs)/home')`
   * Mid-level Task: Plan screen entry points
      * Minor task: Add "Generate Personal Program" button to `EmptyState` (PRIMARY_COLOR)
      * Minor task: Add "Generate New Program" to active-program `MoreVertical` menu
      * Minor task: Wire both to `GenerateProgramModal` + `refresh()` on success

---

## Phase 2 — Workout Save + Progressive Overload

* Major Task: Persist workout data and compute progression
   * Mid-level Task: Save workout on finish
      * Minor task: Refactor `handleFinish` in `app/next-workout.tsx` to async
      * Minor task: Insert `workout_history` row (title, duration_min, total_volume_lb)
      * Minor task: Insert all logged sets into `workout_session_exercises`
      * Minor task: Add `saving` state; disable FinishModal confirm while saving
   * Mid-level Task: Progression engine
      * Minor task: Create `utils/progressionEngine.ts`
      * Minor task: Compute avgReps and avgRPE from lastSessionSets
      * Minor task: Map signal → action (crush/solid/struggle)
      * Minor task: Apply experience-level increment (beginner 5 lb, intermediate 2.5 lb, advanced 1.25 lb)
      * Minor task: Apply readiness modifier (score < 4 → ×0.90)
      * Minor task: Round result to nearest 2.5 lb
      * Minor task: Handle all edge cases (empty sets, null RPE, null readiness)
   * Mid-level Task: Apply progression to useCurrentProgram
      * Minor task: Extract readiness score helper to `utils/readiness.ts`
      * Minor task: Add `applyProgressionToNextWeek()` to `hooks/useCurrentProgram.ts`
      * Minor task: Fetch last session sets from `workout_session_exercises` per exercise
      * Minor task: Fetch today's readiness from `readiness_checkins`
      * Minor task: Call `computeProgression()` per PDE, batch UPDATE `suggested_weight_lb`
      * Minor task: Guard against re-running on same week (track previous week with useRef)

---

## Phase 3 — Workout Swap Modal (Real Data)

* Major Task: Connect swap modal to real exercise data
   * Mid-level Task: Wire SwapExerciseModal
      * Minor task: Add `useEffect` to query Supabase `exercises` by `primary_muscle`
      * Minor task: Add local fallback via `getAlternativesFor()` if Supabase returns empty
      * Minor task: Add `ActivityIndicator` loading state while fetching
      * Minor task: Uncomment `filteredAlternatives` useMemo and JSX list block
   * Mid-level Task: Swap from active workout
      * Minor task: Add `muscleGroup?: MuscleGroup` to local `Exercise` interface in `next-workout.tsx`
      * Minor task: Add `swapTargetId` state and `setSwapTargetId` in `next-workout.tsx`
      * Minor task: Wire `onPressSwap` to set `swapTargetId`
      * Minor task: Build minimal `mockProgramForSwap` from current `exercises` state
      * Minor task: Add Modal with `SwapExerciseModal` and in-session swap handler

---

## Phase 4 — Exercise History Modal

* Major Task: Show per-exercise history from past workouts
   * Mid-level Task: History fetch utility
      * Minor task: Create `utils/fetchExerciseHistory.ts`
      * Minor task: Query `workout_session_exercises` with `ilike` on `exercise_name`
      * Minor task: Join `workout_history` for session title and completed_at
      * Minor task: Group rows by session, build `ExerciseHistoryEntry[]`
      * Minor task: Return newest first, never throw (empty array on error)
   * Mid-level Task: ExerciseHistoryModal component
      * Minor task: Create `components/ExerciseHistoryModal.tsx`
      * Minor task: Bottom-sheet header with exercise name + X button
      * Minor task: Per-session cards (date, workout name, set rows with weight/reps/RPE)
      * Minor task: Volume total per session
      * Minor task: Volume trend indicator vs prior session (SUCCESS green / ERROR_COLOR_LIGHT red)
      * Minor task: 3 skeleton placeholder cards while loading
      * Minor task: Empty state (icon + message)
   * Mid-level Task: Wire from active workout
      * Minor task: Add `historyExerciseName` state to `next-workout.tsx`
      * Minor task: Wire `onPressHistory` to set exercise name
      * Minor task: Add Modal with `ExerciseHistoryModal`

---

## Completed

*(move tasks here as they are done)*
