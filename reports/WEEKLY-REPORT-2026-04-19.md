# Weekly Progress Report — April 19, 2026

**Author:** dani23sch | **Commits:** 14 | **Focus:** Progression engine, readiness system, PR tracking, new content screens, and program generation improvements

---

## 🏋️ 1. Per-Set Weight Progression Engine

**Commits:** `39dc2e0`, `2df64f25`, `fbfd9b93`

Implemented granular per-set weight adjustment when a user has mixed hit/miss results in a session — a major upgrade over the previous uniform progression model.

**How it works:**
- `WorkoutExercise` type gains `perSetWeights?: number[]` to hold per-set override weights
- `applyProgressionToNextWeek()` in `hooks/useCurrentProgram.ts` analyzes the most recent session only (scoped by session ID to avoid cross-session mixing)
- **All sets hit** (reps ≥ min, RPE ≤ target + 0.5) → uniform weight increase
- **Mixed** → hit sets hold, missed sets drop 5%; result written to `program_day_exercises.per_set_weights_lb`
- **All miss** → uniform 5% decrease, `per_set_weights_lb` cleared to `null`
- `buildExercises()` in `next-workout.tsx` reads `perSetWeights` and renders each set with its own weight; readiness overlay still applies on top

**Files changed:** `hooks/useCurrentProgram.ts`, `types/program.ts`, `app/next-workout.tsx`

---

## 📊 2. Readiness System — 4-Factor Scoring

**Commits:** `82612402`, `175ab5b8`

Expanded the readiness check-in from a 2-factor model (sleep + stress) to a 4-factor weighted scoring system.

**Scoring formula:**

| Factor | Weight |
|---|---|
| Sleep | 35% |
| Stress | 25% |
| Soreness | 25% |
| Motivation | 15% |

**Implementation details:**
- `ReadinessCheckInModal` in `home.tsx` adds two new `SliderRow` inputs: **Soreness** and **Motivation**
- Upsert now stores `sleep_hours`, `soreness`, and `motivation` columns
- `fetchHomeData` selects all 4 factors so the modal pre-fills correctly on re-open
- Fixed a scoping bug: readiness queries now filter `readiness_logs` by `log_date = today` (was using `created_at DESC` ordering, which caused previous days' scores to bleed into the current workout)
- Replaced INSERT with **upsert on `(user_id, log_date)`** to prevent duplicate rows on re-submission

**Files changed:** `app/(tabs)/home.tsx`, `app/next-workout.tsx`

---

## ⚙️ 3. Program Generation — Compound/Accessory Differentiation + RPE Periodization

**Commits:** `91ca9693`, `fbfd9b93`

**Compound vs. Accessory logic:**
- `resolveSlotParams()` in `utils/programGenerator.ts` now differentiates by position:
  - Positions 1–2 = **compounds** → full goal sets + full RPE
  - Positions 3+ = **accessories** → −1 set (min 2), −0.5 RPE
- `estimatedDurationMin` now sums per-exercise time using each slot's actual `setCount` instead of a uniform value

**RPE Periodization:**
- Week 1 starts at `baseRPE − 1.5` and ramps linearly to `baseRPE` by the final loading week
- Deload weeks (every 4th) get an additional `−2.0` RPE on top

**Session Length Cap Fix:**
- Reduced the per-set time estimate from 4.5 min → **2.5 min/set**, fixing over-pruning (a 60-min hypertrophy block now generates 5 exercises instead of 3)

**Files changed:** `utils/programGenerator.ts`, `hooks/useCurrentProgram.ts`, `components/WorkoutTemplateModal.tsx`

---

## 🏆 4. PR Tracking System

**Commits:** `7d2fbbcf`, `5d3f1a82`, `283ea03c`, `b699991`

Built an end-to-end personal record detection and display system.

**Detection:** On workout save, each lifted weight is compared against the `personal_records` table. If it's a new max, a PR is inserted and a **celebration modal** is triggered.

**PR History Modal:**
- Accessible from a new summary card in the History tab
- Uses a two-step query (fetch records, then join exercise names) instead of a FK join — avoids schema dependency issues
- Card label shortened to **'PRs'** to prevent text wrapping

**Bug fixes in this area:**
- History and Profile screens were trying to read `pr_count`/`prs` columns from workout session rows (which don't exist); now queries `personal_records` table directly with a `COUNT(*)` query
- PR celebration modal: button no longer stretches vertically (removed `flex:1`)
- PR name only added to the confirmed list after a successful DB insert (insert error is now logged with failure reason)

**Files changed:** `app/(tabs)/history.tsx`, `app/(tabs)/profile/index.tsx`

---

## 📚 5. New Content Screens — FAQ & Recovery Library

**Commit:** `7d2fbbcf`

**FAQ Screen** (`app/faq.tsx` — new file, 235 lines):
- 15 items organized into accordion-style categories
- Linked from the **Help & Support** profile page

**Recovery & Mobility Library** (`app/recovery-library.tsx` — new file, 247 lines):
- 5 pre-built routines (e.g., post-leg, upper body mobility, etc.)
- Shortcut card added to the **home screen** for quick access

**Files changed:** `app/faq.tsx` *(new)*, `app/recovery-library.tsx` *(new)*, `app/(tabs)/profile/help-support.tsx`, `app/(tabs)/home.tsx`

---

## 🔄 6. Swap Nudge & Cycle Phase Recommendations

**Commits:** `7d2fbbcf`, `5d3f1a82`

**Swap Nudge Card:**
- Appears on the home screen when the accessory swap interval (set in program generation) has been reached
- Deload weeks (every 4th week) are excluded from nudge logic
- Navigates to the **Plan tab** (where swap is available) rather than the overview
- Styled to match home screen card language (BORDER_COLOR bg, `borderRadius 20`)

**Cycle Phase Recommendations:**
- Phase-specific banners shown during **Menstruation** and **Luteal** phases
- Card uses `marginHorizontal` and project color tokens for consistency

**Accessory Swap Interval Picker:**
- Added to `GenerateProgramModal.tsx` so users can configure the interval at program creation

**Files changed:** `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `components/GenerateProgramModal.tsx`, `types/program.ts`

---

## 🔐 7. Auth — Password Strength Meter

**Commit:** `ac29c449`

Enhanced the sign-up flow with a real-time password strength indicator.

**Requirements added** (on top of 8-char min):
- Uppercase letter
- Number
- Special character

**UI:**
- 4-segment bar: red → orange → yellow-green → green
- Live ✓/✗ checklist per criterion while typing
- Submit button disabled until all 4 criteria are met

**Files changed:** `app/(auth)/join.tsx`

---

## 🐛 8. Bug Fix — UTC vs. Local Date in `advanceToNextWeek`

**Commit:** `229b87ae`

`toISOString()` returns a UTC date string, which can be off by a day in US timezones. Since `computeWeekNumber()` uses local time, this caused the week number to remain the same after advancing — breaking the week progression logic.

**Fix:** Replaced `toISOString()` with a local-time date formatter so the date passed to `computeWeekNumber` matches the timezone the app runs in.

**Files changed:** `hooks/useCurrentProgram.ts`

---

## 📋 Summary Table

| Area | Type | Files Changed |
|---|---|---|
| Per-set progression engine | feat + fix | `useCurrentProgram.ts`, `types/program.ts`, `next-workout.tsx` |
| 4-factor readiness scoring | feat + fix | `home.tsx`, `next-workout.tsx` |
| Compound/accessory RPE + sets | feat | `programGenerator.ts` |
| PR tracking & history | feat + fix | `history.tsx`, `profile/index.tsx` |
| FAQ screen | feat | `faq.tsx` *(new)* |
| Recovery library screen | feat | `recovery-library.tsx` *(new)* |
| Swap nudge + cycle recs | feat + fix | `home.tsx`, `next-workout.tsx`, `GenerateProgramModal.tsx` |
| Password strength meter | feat | `join.tsx` |
| UTC/local date bug | fix | `useCurrentProgram.ts` |
| Visual consistency | fix | `home.tsx`, `history.tsx`, `_layout.tsx` |
