# AdaptivPush — Weekly Progress Report
## Week of March 24–27, 2026

**Developer:** Dani (dani23schlichting@gmail.com)  
**PRs Merged:** #25 (profile sub-pages), #26 (readiness weight/RPE adjustment)

---

## Summary

This week I built the logic and UI for the graduated readiness modifier system, wired up the `GenerateProgramModal` to the Plan screen, added exercise swap and history modals to the Next Workout screen, and expanded the Profile section into dedicated sub-pages. However, the three core adaptive features are not yet functional end-to-end: the readiness adjustment confirmation does not apply weight changes, the Next Workout screen still displays static dummy data instead of real program exercises, and completing all exercises does not transition the NextWorkoutCard or update next week's weights.

---

## What Was Completed

### 1. Graduated Readiness Modifier — Logic, Hook, and UI

**`utils/progressionEngine.ts`**
- Exported `getReadinessModifier(score)` — 5-band helper shared between the UI and the engine, returns `{ weightMultiplier, rpeDelta, label, description, isNeutral }`
- Updated `computeProgression()` to use the shared modifier and now outputs `suggestedRPE` in the result

**`types/progression.ts`**
- Added `currentTargetRPE: number | null` to `ProgressionContext`
- Added `suggestedRPE: number | null` to `ProgressionResult`

**`hooks/useCurrentProgram.ts`**
- Added `applyReadinessAdjustmentOnly(score)` — fetches the first program day of the current week, applies weight multiplier and RPE delta to each exercise, writes results to `program_day_exercises` in Supabase, then calls `refresh()`
- Added `applyProgressionToNextWeek()` — fetches next week's program days, looks up recent sets from `workout_exercise_sets`, runs `computeProgression()` per exercise, and updates `suggested_weight_lb` and `target_rpe` in Supabase. Triggered automatically when the computed week number advances.
- Exposed both functions in the hook's return value

**`app/(tabs)/home.tsx`**
- Fixed readiness table name: now writes to `readiness_logs` (was `readiness_checkins`) and reads `readiness_score` directly from the stored column instead of recomputing it
- Added `ReadinessAdjustmentModal` component — shows a color-coded score badge, band description, weight impact pill, and Apply / Keep As-Is buttons. Fires after check-in when the score is outside the neutral band (6–7).
- `handleReadinessSaved` → `handleApplyAdjustment` / `handleDismissAdjustment` wired up correctly

**Status:** Logic and UI built. **Not working** — the readiness adjustment confirmation popup does not successfully apply weight changes. `applyReadinessAdjustmentOnly` returns early when `program` is still `null` at confirm time (async race on initial load), so pressing "Apply Adjustment" does nothing.

---

### 2. Program Generation Modal — Plan Screen Integration

**`app/(tabs)/plan.tsx`**
- Added `GenerateProgramModal` to the empty state view (primary "Generate Personal Program" button)
- Added "Generate New Program" option to the program menu dropdown (when a program already exists)
- Exposed `refresh()` from `useCurrentProgram` so the plan screen reloads after generation

---

### 3. Next Workout Screen — Swap, History, and Session Save

**`app/next-workout.tsx`**
- Wired up `SwapExerciseModal` — pressing the swap icon on an `ExerciseCard` now opens the modal; confirming a swap replaces the exercise in local state
- Wired up `ExerciseHistoryModal` — pressing the history icon opens the exercise history bottom sheet for that exercise
- Added `saving` state to the Finish Workout confirmation modal (disables button, shows "Saving…" during async write)
- `handleFinish` now saves a `workout_sessions` row to Supabase (user ID, workout name, start/end timestamps, duration, total volume)
- Set logging (`workout_exercise_sets`) is attempted but **skipped non-fatally** — the screen uses static dummy exercise data without real exercise UUIDs, so the FK constraint (`exercise_id`) fails. A `console.warn` is logged and navigation proceeds.

**Status:** Session row saves to Supabase on finish. **Not working:**
- The screen still uses a hardcoded static exercise list (`INITIAL_WORKOUT`) — not connected to the user's real program from `useCurrentProgram`
- Because exercises have no real UUIDs, the `workout_exercise_sets` insert fails with an FK constraint error and is silently skipped
- Completing all exercises does not transition the NextWorkoutCard on the Home screen to the next workout
- With no set data written, `applyProgressionToNextWeek()` has nothing to read, so next week's weights are never updated

---

### 4. Profile Sub-Pages

Expanded `profile.tsx` into a nested Expo Router stack.

**Added:**
- `app/(tabs)/profile/_layout.tsx` — nested Stack navigator
- `app/(tabs)/profile/index.tsx` — profile menu (migrated from flat `profile.tsx`)
- `app/(tabs)/profile/personal-information.tsx` — name, DOB, sex, weight, experience level
- `app/(tabs)/profile/notifications.tsx` — push notification preference toggles
- `app/(tabs)/profile/privacy-data.tsx` — privacy settings and data management
- `app/(tabs)/profile/help-support.tsx` — FAQ accordion, contact, app info

**Status:** Frontend complete. None of the sub-pages are connected to Supabase yet.

---

## What Is Not Working

| Feature | Problem |
|---------|---------|
| Readiness adjustment apply | Pressing "Apply Adjustment" does nothing — `applyReadinessAdjustmentOnly` returns early because `program` is `null` at confirm time (async race) |
| Next Workout screen | Still shows static dummy exercises, not the user's real program data |
| Set logging | `workout_exercise_sets` insert is skipped because dummy exercises have no real `exercise_id` values (FK constraint fails) |
| NextWorkoutCard transition | Completing all exercises does not advance the card to the next scheduled workout |
| Progression engine | Cannot run — depends on set data that is never written due to the dummy data problem above; next week's weights are never updated |

---

## Next Steps

- **Drive Next Workout from real program data:** Replace `INITIAL_WORKOUT` with exercises from `useCurrentProgram` — this is the root fix that unblocks set logging, progression, and NextWorkoutCard transitions
- **Fix NextWorkoutCard transition:** After finishing a workout, the card should advance to the next scheduled workout day
- **Fix `bug-readiness-apply`:** Re-fetch or await program state before running the adjustment, so the Apply button actually writes to Supabase
- **Connect Profile sub-pages to Supabase** (`profiles` table)
- **Test full loop:** complete a real workout → sets write → progression engine runs → next week's weights update
