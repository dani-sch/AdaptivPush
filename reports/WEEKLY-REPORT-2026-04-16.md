# AdaptivPush — Weekly Progress Report
**Week of April 16, 2026**
**PRs merged:** #30, #31, #32, #33, #34, #35 → all landed on `main`

---

## Overview

This was a heavy bug-fixing and feature week. The core workout logging pipeline was broken — completed workouts weren't saving anything to the database. That was the starting point. From there, several new features were built on top of a working foundation: a way to manually advance your training week, a richer history tab, a full program overview screen, and a complete overhaul of how programs are generated to be scientifically sound.

---

## 1. Workout Saving Was Completely Broken — Fixed (PR #30)

**What was wrong:**  
Completing a workout appeared to work, but nothing was being saved to the database. The "Saving…" indicator never showed up, and next week's weights never updated.

**Root causes found and fixed:**

- **Silent FK failure** — The database requires every logged set to reference a valid exercise ID. In some cases that ID was `null` (exercises that weren't fully resolved from the DB), and one null in the batch caused the *entire* workout save to silently fail. Fixed by filtering those out before attempting to write.

- **Null reps crash** — The `reps` column in the database has a `NOT NULL` constraint. When a user left a set's rep field blank, the app was trying to insert `null`, which threw a database error. Fixed by filtering out any sets where reps weren't entered.

- **Saving overlay hidden inside closed modal** — The "Saving…" spinner was supposed to appear while data was being written, but the finish modal was being dismissed *before* the spinner was shown, so it never appeared.

- **Progression never ran** — After saving, the app is supposed to calculate next week's weights based on how the workout went (crushed it → go heavier, struggled → go lighter). This trigger was only hooked to a calendar week boundary check, not to actual workout completion. It now fires immediately after every completed workout.

- **Readiness was mutating the database** — The readiness check-in (how you're feeling before training) was supposed to adjust displayed weights for *that session only*. Instead it was writing those adjusted weights back to the database permanently, compounding with each workout. This was reverted: readiness now only affects what's shown on screen, never what's stored.

**Files changed:** `app/next-workout.tsx`, `hooks/useCurrentProgram.ts`

---

## 2. Start Week Button on Home Screen (PR #31)

**What was built:**  
A "Start Week N" button now appears on the home screen when the current week is complete. Previously the app used a purely calendar-based week system — you had to wait a full 7 real-world days before the next week's workouts appeared. That made testing and rapid iteration impossible, and was a poor UX for users who finish their week early.

**How it works technically:**  
The week number is calculated from the program's `start_date` in the database: `floor((today - start_date) / 7) + 1`. To advance to week N, the function back-dates `start_date` so that the formula naturally resolves to the target week. This approach requires zero schema changes and no extra "current week" column.

**Also fixed:** The readiness check-in popup was previously triggering weight changes. It's now purely informational — it tells you what adjustments would be made to your session, but doesn't mutate anything.

**Files changed:** `app/(tabs)/home.tsx`

---

## 3. Workout History — Drill-Down and Live Refresh (PR #32)

**What was built:**  
- Workout cards in the History tab are now tappable. Tapping one opens a detail sheet showing every exercise logged in that session with the actual sets, weights, and reps recorded.
- Each exercise in that detail view has a "History" button that opens a full performance history for that movement across all past sessions — with volume trends (▲/▼).
- The History tab now refreshes automatically every time you navigate to it.

**Notable technical issue fixed:**  
The live refresh fix was a one-liner but the cause was subtle. The tab was using `useEffect([], [])` which only fires once when the component mounts. After completing a workout and navigating back, the History tab was already mounted so `useEffect` didn't re-run. Replaced with `useFocusEffect` from `expo-router`, which fires every time the screen comes into focus.

**Another bug fixed here:**  
The exercise history "History" button inside the active workout screen was passing the wrong ID to the history lookup. It was passing the `program_day_exercises` row ID (an internal join table ID) instead of the `exercises` table ID that the history query actually joins on — so the query always returned empty. One-line fix.

**Known architectural note:**  
Stacking two transparent animated React Native Modals causes stale touch handlers when both close, leaving the screen beneath unscrollable. Fixed by consolidating into a single Modal and rendering the inner sheet as an absolute-positioned overlay inside it.

**Files changed:** `app/(tabs)/history.tsx`

---

## 4. Full Program Overview Screen (PR #33)

**What was built:**  
A new screen accessible from the Plan tab that shows the entire training program at a glance — every week, every workout day, every exercise with its programmed sets × reps @ RPE and suggested starting weight.

**Design decisions:**
- Weeks are accordion-collapsed by default; the current week auto-expands on load.
- Past weeks are visually muted (dimmed text) to reduce noise.
- The current week has a blue "Current" badge.
- Deload weeks have an amber "Deload" badge (see PR #34).
- Exercises show weight as a badge only when a weight is actually programmed (bodyweight exercises don't show a weight badge).

**Data loading:**  
Fetches all `program_days` for the active program in a single query with nested `program_day_exercises → exercises` join. Groups client-side by `week_number`, sorts by `day_index` and `position`.

**Files changed/added:** `app/program-overview.tsx` (new), `app/(tabs)/plan.tsx`, `app/_layout.tsx`

---

## 5. Program Generation — Consistent Exercises and Deload Weeks (PR #34 / #35)

This was a fundamental correctness fix to the program generation engine.

### Problem 1: Different exercises every week

**What was wrong:**  
The generator was running a fresh randomized exercise selection inside the week loop. Every week, a different set of exercises was picked. This is the opposite of progressive overload — the entire point of a structured program is to train the same movements repeatedly and add weight over time.

**How it was fixed:**  
The generator now runs in two phases:
1. **Phase 1 (once):** Pick exercises for each day slot using week 1 as the template.
2. **Phase 2 (all weeks):** Reuse those same exercises for every week, only recalculating weights/sets/RPE per week.

This means a Push Day will always have the same exercises — Barbell Bench Press, Overhead Press, Tricep Pushdown, etc. — and week over week those movements get heavier.

### Problem 2: No deload weeks

**What was built:**  
Every 4th week is now automatically a deload week. This follows the standard 3:1 loading-to-deload mesocycle structure used in most evidence-based strength and hypertrophy programs.

**Deload parameters:**
| Parameter | Normal Week | Deload Week |
|-----------|-------------|-------------|
| Sets | Goal default (e.g. 4) | −2 (minimum 2) |
| Weight | Progressive | 70% of current loading week |
| RPE | Goal default (e.g. 7.5) | −2.0 (minimum RPE 5) |
| Reps | Same range | Same range |

**Progressive overload tracking:**  
An `effectiveWeek` counter now advances only on loading weeks. Deload weeks don't count toward progression — so week 5 is loading week 4, not week 5. This prevents the progression calculation from treating a deload as a "missed" loading week.

**Deload badge:**  
The program overview screen shows an amber "Deload" badge on any week where workouts contain "(Deload)" in the name.

> ⚠️ These changes only apply to newly generated programs. Existing programs in the database were saved with the old randomized logic and won't be retroactively changed.

**Files changed:** `utils/programGenerator.ts`

---

## Files Changed This Week

| File | Type | What Changed |
|------|------|-------------|
| `app/next-workout.tsx` | Bug fix | Null exercise ID filter, null reps filter, saving overlay, progression trigger, readiness display-only, history button ID fix |
| `hooks/useCurrentProgram.ts` | Bug fix | Progression fires post-workout, readiness no longer mutates DB, `advanceToNextWeek()` added |
| `app/(tabs)/home.tsx` | Feature | "Start Week N" button, readiness modal made informational |
| `app/(tabs)/history.tsx` | Feature + fix | Tappable cards, session detail drill-down, exercise history per movement, `useFocusEffect` live refresh, Modal stacking fix |
| `app/program-overview.tsx` | New screen | Full program overview with week/day accordions, deload badges |
| `app/(tabs)/plan.tsx` | Feature | "View Full Program" entry point button |
| `app/_layout.tsx` | Routing | Registered `program-overview` route |
| `utils/programGenerator.ts` | Bug fix | Pinned exercises across weeks, auto-deload every 4th week, effective week progression counter |

---

## Pull Requests

| PR | Title | Merged |
|----|-------|--------|
| [#30](https://github.com/dani-sch/AdaptivPush/pull/30) | fix: workouts now properly save sets, weights, and reps | Apr 16 |
| [#31](https://github.com/dani-sch/AdaptivPush/pull/31) | feat: add Start Week button to home screen | Apr 16 |
| [#32](https://github.com/dani-sch/AdaptivPush/pull/32) | feat: tap workout history cards to see exercises and history | Apr 16 |
| [#33](https://github.com/dani-sch/AdaptivPush/pull/33) | feat: add full program overview screen | Apr 16 |
| [#34](https://github.com/dani-sch/AdaptivPush/pull/34) | fix: exercises consistent across all weeks + auto deload weeks | Apr 16 |
| [#35](https://github.com/dani-sch/AdaptivPush/pull/35) | feat: land all stacked changes to main | Apr 16 |

---

## What's Still Worth Noting

- **Existing programs need regeneration** to benefit from the exercise consistency and deload week fixes. The old data in the DB won't be touched automatically.
- **Exercise history** in the active workout screen was showing "No history yet" even for exercises that had been logged — now fixed, but users will only see data for workouts logged after the save fix (PR #30) landed.
- **The 4-weight model** in this app: (1) programmed weight in DB, (2) readiness-adjusted display weight, (3) what the user actually types, (4) what gets saved. Readiness only ever affects #2 now.
