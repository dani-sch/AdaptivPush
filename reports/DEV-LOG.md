# AdaptivPush — Development Log (Dani)

> Chronological record of Dani's implemented features, fixes, and architectural decisions.  
> Most recent entries at the top.

---

## 2026-04-30 — Documentation | Full Final Report Markdown With Diagrams and Code Excerpts

**Status:** Working tree documentation update

- Added `reports/AdaptivPush_Full_Final_Report.md` as a Markdown version of the final report
- Preserved the report body while adding rendered Mermaid architecture/data-flow diagrams into the Markdown copy
- Added Appendix E code excerpts from `utils/programGenerator.ts`, `utils/saveProgramToDb.ts`, `utils/progressionEngine.ts`, and `hooks/useCurrentProgram.ts`
- Added short explanatory notes before each code excerpt so the appendix can stand on its own in Markdown form
- Added inline code snippets to Section 7 (Functionality and Implementation) so the implementation chapter itself now shows representative source excerpts for generation, orchestration, workout saving, progression, and readiness overlays
- Added a clearer DFD-style Mermaid diagram to the docs so the data-flow section now reads like a traditional external-entity / process / data-store diagram

---

## 2026-04-30 — Documentation | Final Report Outline Scope Correction

**Status:** Working tree documentation update

- Updated `reports/FINAL-REPORT-OUTLINE.md` Section 1.1 so the proposal summary no longer frames AdaptivPush as only "for women"
- Reworded the outline to reflect the actual product scope more accurately: AdaptivPush is a general adaptive strength-training app, and menstrual-cycle-aware adjustments are an additional optional feature rather than the app's sole audience definition

---

## 2026-03-26 — Week 9 | Graduated Readiness Modifier + Instruction Hygiene

**Commits:** `65a7be7`, `e56c2f0`  
**PR:** #26 (`feat/readiness-weight-rpe-adjustment`)

### Graduated Readiness Modifier for Weight & RPE

Replaced the original single-threshold readiness check (`score < 4 → −10%`) with a 5-band graduated modifier that affects both target weight and target RPE.

**`utils/progressionEngine.ts`**
- Exported `getReadinessModifier(score: number): ReadinessModifier` — shared helper returning `{ weightMultiplier, rpeDelta, label, description, isNeutral }` for each band:
  - 1–3 (Very Low): −10% weight, −1.0 RPE
  - 4–5 (Low): −5% weight, −0.5 RPE
  - 6–7 (Moderate): no change (neutral)
  - 8–9 (Good): +2.5% weight, +0.5 RPE
  - 10 (Excellent): +5% weight, +1.0 RPE
- Updated `computeProgression()` to use the shared modifier, eliminating duplicated band logic
- Added `suggestedRPE: number | null` to `ProgressionResult` — the engine now writes `target_rpe` back to `program_day_exercises` alongside `suggested_weight_lb`

**`types/progression.ts`**
- Added `currentTargetRPE: number | null` to `ProgressionContext`
- Added `suggestedRPE: number | null` to `ProgressionResult`

**`hooks/useCurrentProgram.ts`**
- Added `applyReadinessAdjustmentOnly(score: number)` — applies the readiness-only modifier to the first program day of the current week, updating both `suggested_weight_lb` and `target_rpe` in Supabase without triggering the full progression engine

**`app/(tabs)/home.tsx`**
- Added `ReadinessAdjustmentModal` — fires after the check-in Continue button when the user's score falls outside the neutral band
- Modal displays: color-coded score badge, band label + description, weight percentage impact pill, and Apply / Keep As-Is action buttons

Also bundled into this PR (previously staged):
- `utils/programGenerator.ts` — full program generation logic (split selection, exercise slot building, goal params)
- `utils/saveProgramToDb.ts` — Supabase persistence for generated programs (upserts exercises, inserts program/days/exercises rows)
- `utils/fetchExerciseHistory.ts` — fetches per-exercise set history grouped by session
- `components/ExerciseHistoryModal.tsx` — exercise history bottom sheet with session-grouped set data
- `components/GenerateProgramModal.tsx` — full program generation wizard modal
- `lib/exerciseDatabase.ts` — local exercise catalog (~742 exercises indexed by muscle group)
- `types/program.ts` — `GeneratedProgram`, `GeneratedProgramDay`, `GeneratedExerciseSlot`, `ProgramGenParams` type definitions

**Removed dead code:**
- `lib/mockCurrentProgram.ts` — replaced by live Supabase data
- `lib/mockData.ts` — replaced by live Supabase data
- `scripts/reset-project.js` + `reset-project` npm script — Expo boilerplate no longer needed

**Known bug logged:** `applyReadinessAdjustmentOnly` may return early if `program` state is still `null` at confirmation time (async load race condition). Tracked as `bug-readiness-apply`.

**Chore:** Added `.claude/` instruction files to `.gitignore` (`e56c2f0`).

---

## 2026-03-13 — Week 8 | ExerciseDB Seed Script

**Commit:** `cd31aaf`  
**PR:** #24 (`feat/seed-exercises`)

**`scripts/seedExercises.ts`**
- One-time seed script that populates the Supabase `exercises` table from the ExerciseDB V1 dataset
- Normalizes exercise data: `name`, `primary_muscle`, `equipment`
- Invoked via `npm run seed:exercises` (uses `tsx` for TypeScript execution without a build step)

---

## 2026-03-12 — Version Fix | Start Workout Button

**Commit:** `a4ecfbf`

- Version fix — several file changes from the previous week weren't committed
- Restored and finalized `Start Workout` button functionality on the Next Workout screen

---

## 2026-03-06 — Week 7 | Next Workout Screen + ExerciseCard

**Commit:** `cf9bebb`  
**PR:** #22 (`feature/next-workout-screen`)

**`app/next-workout.tsx`**
- Built the active workout logging screen — users see today's exercises with target sets, reps, weight, and RPE
- Live session timer (elapsed time displayed)
- Per-set input rows for weight, reps, and RPE
- Checkboxes to mark individual sets and exercises as complete
- Finish Workout confirmation flow that writes data to Supabase and tracks session duration

**`components/ExerciseCard.tsx`**
- Reusable component rendering the per-set input table for a single exercise
- Manages logged/unlogged state for each row
- Also finalized architecture and implementation plan for the adaptive program engine — documented four system diagrams covering screens, components, hooks, utilities, and Supabase backend

---

## 2026-02-27 — Week 5 | Auth Flow Fix + Readiness Check-In

**Commits:** `0b95a66` (auth), `e1cff55` (readiness)  
**PRs:** #18 (auth), #19 (readiness)

### Auth Flow End-to-End Fix (`fix: connect auth flow end-to-end`)

- App was staying on the login screen after a successful sign-in because a redirect was commented out
- Returning users were forced to re-login every session because there was no startup session check
- Added Supabase `getSession()` call in `_layout.tsx` on mount to restore existing sessions
- Removed deprecated `unstable_settings.anchor` Expo Router config that was causing navigation errors

### Readiness Check-In with Supabase Persistence

**`app/(tabs)/home.tsx`**
- Wired the readiness check-in modal sliders to Supabase — sleep, stress, and relevant lifestyle factors now persist to the `readiness_checkins` table
- Implemented readiness scoring algorithm (composite 0–10 score computed from sub-scores)
- Fixed race condition where the home screen score wasn't updating after a check-in was saved (the fetch was calling Supabase before the router was fully initialized)

---

## 2026-02-13 — Week 3 | Home Screen + Check-In Modal + Next Workout Component

**Commits:** `ef932f4`, `af9db9d`

- Built frontend Home screen layout with current program summary
- Added check-in modal UI with sliders for readiness sub-scores
- Added `NextWorkoutCard` component — displays today's upcoming workout preview on the Home tab
- Fixed home screen background color

---

## 2026-02-11 — Week 2 | Quick Setup Backend + Color System

**Commit:** `1dfc06b`  
**PR:** #12

- Fixed dropdown selection bug in the Quick Setup form
- Implemented Quick Setup backend integration — form now writes DOB, sex, gender identity, weight, and training experience to the Supabase `user_profile` table
- Created `constants/colors.ts` with named design token constants
- Created `constants/theme.ts` with typography and spacing tokens

---

## 2026-02-05 — Week 2 | Cleanup + Dev Skip Button

**Commit:** `a47b3ba`

- Removed all Expo boilerplate sample screens from the project
- Added a dev skip button to the auth screens to bypass login/signup during development testing (avoids Supabase email rate limit friction)

---

## 2026-02-02 — Fix: Accidental File Overwrite

**Commit:** `b2b63d1`

- Accidentally overwrote a teammate's code during a `git push`
- Fixed by resetting to the previous commit and properly re-merging changes
- Adopted more careful pull/merge workflow going forward

---

## 2026-01-30 — Week 1 | Welcome Page + Routing

**Commits:** `d40a861`, `77526d9`, `23541ac`

- Completed Welcome Page UI (app landing screen)
- Added routing from Welcome → Login and Welcome → Join via Sign In and Join buttons
- Fixed back button routing: buttons were opening new screens instead of navigating back — resolved with a small routing syntax fix in Expo Router

---

## 2026-01-28 — Project Initialization

**Commits:** `e3e0954`, `c21372c`

- Set up the GitHub repository and Supabase project
- Added Supabase client integration (`utils/supabase.ts`) with API key environment variables
- Restructured initial project file layout for Expo Router conventions
- Added `SETUP.md` with development environment setup instructions
