# Possible Features & Fixes

A running list of ideas, improvements, and bugs surfaced during discussion.
Items here are not yet planned or committed — they're candidates for future work.

---

## 0. Double-Progression Weight Increase Rule (Implemented)

**File:** `hooks/useCurrentProgram.ts` → `applyProgressionToNextWeek()`

**Problem:**
The original progression logic increased weight whenever all sets hit `repMin` (the bottom of the rep range). This meant a user doing 8 reps on an 8–12 range immediately got a weight increase — before they'd built up through the range.

**Fix (implemented):**
Switched to the **double-progression model**: users first build reps within the range, then progress weight when they've mastered the top.

| Condition | Result |
|-----------|--------|
| ALL sets hit `repMax` with acceptable RPE | Weight increases by experience increment |
| Sets within `repMin–repMax` but not all at `repMax` | Weight holds |
| ALL sets missed `repMin` | Uniform weight decrease 5% |
| SOME sets missed `repMin`, others didn't | Per-set: missed sets decrease 5%, others hold |

**Note:** RPE condition (`rpe <= targetRPE + 0.5`) is still required alongside repMax to trigger an increase.

---

## 1. Compound/Accessory Cross-Check in Program Generation

**File:** `utils/programGenerator.ts` → `resolveSlotParams()`

**Problem:**
The current system uses slot *position* (1–2 = compound, 3+ = accessory) to assign sets/RPE params. On Full Body and Upper days, legitimate compound movements (Barbell Row, Dumbbell OHP) land in positions 3+ and incorrectly receive reduced volume and RPE — purely because of their iteration order through the muscle group list.

Example on a Full Body day:
- pos 1 → Squat (Barbell) — full params ✓
- pos 2 → Bench Press (Barbell) — full params ✓
- pos 3 → Barbell Row — gets −1 set, −0.5 RPE ✗
- pos 4 → OHP (Dumbbell) — gets −1 set, −0.5 RPE ✗
- pos 5 → Plank (bodyweight) — accessory params ✓

**Proposed fix:**
Cross-check the exercise's equipment type against `COMPOUND_EQUIPMENT` inside `resolveSlotParams()`. If the exercise is a Barbell or Dumbbell movement, give it full compound params regardless of position. Only apply the accessory reduction to true isolation movements (cables, machines, bodyweight, etc.).

```ts
const isCompound = COMPOUND_EQUIPMENT.has(exercise.equipment);
if (position <= 2 || isCompound) {
  return { ...baseParams, rpe: periodizedRPE };
}
return {
  ...baseParams,
  sets: Math.max(baseParams.sets - 1, 2),
  rpe: Math.max(periodizedRPE - 0.5, 5.0),
};
```

**Note:** This requires passing the `exercise` object into `resolveSlotParams()`, which currently only takes `GoalParams` and `position`.

**Trade-off:** Position-only logic has a valid fatigue argument (later exercises are done on a tired body, so less volume makes sense). The cross-check assumes compound identity should always override position, which may not match real-world programming for all users.

---

## 2. Best Practices Store for Exercise Variation / Sets / RPE

**File:** `utils/programGenerator.ts` + new `constants/programDefaults.ts`

**Goal:**
Replace the hardcoded magic numbers scattered through `programGenerator.ts` with a central config that encodes evidence-based defaults per split type (PPL, Full Body, Upper/Lower, etc.). Covers set ranges, RPE targets by week/phase, exercise variation rules (minimum compound count, accessory caps), and rest time defaults.

**Proposed approach:**
Create `constants/programDefaults.ts` that exports a `PROGRAM_DEFAULTS` map keyed by split type. `programGenerator.ts` imports from this map instead of inlining numbers. Generation logic stays the same; only the source of truth changes.

**Trade-off:**
Centralizing defaults makes tuning easier and opens the door to per-user overrides, but introduces a config layer that must stay in sync with generation logic. Any future split type needs a corresponding entry in the map.

---

## 3. Menstrual Cycle Adjustment

**File:** Profile screen, `utils/programGenerator.ts`, (optional) HealthKit integration

**Goal:**
Allow users to opt in to cycle-aware programming. During the luteal phase (typically days 15–28) reduce RPE targets and volume slightly; during the follicular/ovulatory phase allow normal or elevated intensity. This brings the app in line with sports-science research on hormonal periodization.

**Proposed approach:**
- Add optional `cycleTrackingEnabled` + `lastPeriodStartDate` to user profile
- Compute current cycle phase at generation/adjustment time
- Pass phase as a modifier into `resolveSlotParams()` — luteal → −0.5 RPE, −1 set on compounds; follicular → baseline or +0.5 RPE on peak week
- Optionally read last period date from Apple HealthKit (see feature 5)

**Trade-off:**
Cycle length varies significantly across users; a fixed 28-day assumption will be wrong for many. A more accurate version requires logging actual period dates over multiple cycles before making reliable adjustments.

---

## 4. Restore Archived Program State on Un-archive

**File:** Archive logic (`ProgramCard`, archiving utils), program state management

**Goal:**
When a user archives a program and later un-archives it, resume at the exact week and day they left off rather than resetting to week 1 day 1. This matches how real athletes pause and resume training blocks.

**Proposed approach:**
- On archive: snapshot `lastActiveWeek`, `lastActiveDay`, `lastActiveDate` onto the program record
- On un-archive: restore those fields as the current position instead of defaulting to 0/0
- Display a "Resuming from week X, day Y" confirmation to the user

**Trade-off:**
If the user was mid-week when archiving, resuming mid-week may feel disjointed. Consider rounding to the start of the current week as an alternative default, with an option to resume exactly.

---

## 5. Apple HealthKit Integration

**File:** Workout logging flow, user settings, new `utils/healthKit.ts`

**Goal:**
Write completed workouts to HealthKit as workout sessions so they appear in the Health and Fitness apps. Optionally read bodyweight and resting heart rate from HealthKit to inform program adjustments.

**Proposed approach:**
- Add `expo-health` or `react-native-health` dependency
- After a workout is marked complete, call `saveWorkout()` with duration, calories (estimated), and exercise metadata
- In settings, add a HealthKit toggle with permission prompt on first enable
- (Optional) read `HKQuantityTypeIdentifierBodyMass` on program generation to seed starting weights

**Trade-off:**
HealthKit is iOS-only — this feature cannot be shipped to Android without a parallel Google Fit/Health Connect integration. Permissions flow adds onboarding friction.

---

## 6. Light / Dark Mode

**File:** Theme/colors config, settings screen

**Goal:**
Respect the device's system appearance setting (auto light/dark) with an optional manual override in app settings, so the UI is comfortable in both bright and low-light environments.

**Proposed approach:**
- Audit all hardcoded color values and move them into a theme token file with `light` and `dark` variants
- Use `useColorScheme()` (Expo/RN) to select the active variant at the root level
- Add a "Appearance" toggle in settings: System / Light / Dark — persist to AsyncStorage

**Trade-off:**
Every component that currently uses hardcoded colors needs to be updated to use tokens. This is a wide surface area; a phased rollout (screens first, then modals, then shared components) reduces regression risk.

---

## 7. Color Palette Themes

**File:** Theme/colors config, settings screen

**Goal:**
Let users personalize the app's accent colors from a set of curated palettes (Pink/Purple, Blue, Green, Black/Monochrome), selectable from settings and persisted across sessions.

**Proposed approach:**
- Define 4–5 palette objects in the theme config, each overriding `primary`, `accent`, `highlight`, and `tint` tokens
- Store the selected palette key in AsyncStorage (or user profile if server-synced)
- Inject the active palette via a `ThemeContext` at the app root
- Settings screen renders palette swatches as a horizontal picker

**Trade-off:**
More palettes = more QA surface. All UI states (disabled, error, success) must look acceptable in every palette. Start with 3–4 and validate before adding more.

---

## 8. Exercise Swap: Show More + Descriptions / Images

**Files:**
- `components/SwapExerciseModal.tsx` — swap UI
- `scripts/seedExercises.ts` — data seeding
- `reports/migrations/002_exercises_add_gif_url.sql` — schema change

---

### Part A — Root Cause: Only 1–2 Exercises Show Per Muscle Group

**Problem:**
The seed script stored ExerciseDB's raw `bodyPart` value directly as `primary_muscle` — lowercase, without transformation (e.g. `"chest"`, `"upper arms"`, `"upper legs"`). The app's `MuscleGroup` type uses Title Case (`"Chest"`, `"Biceps"`, `"Legs"`). When `SwapExerciseModal` queries `.eq('primary_muscle', muscleGroup)`, the strings never match, Supabase returns zero rows, and the modal falls back to the ~6-exercise hardcoded local database in `lib/exerciseDatabase.ts`.

**Fix — `scripts/seedExercises.ts`:**
Add a `mapMuscleGroup(bodyPart, target)` function that translates ExerciseDB values to the app's naming convention:

| ExerciseDB `bodyPart` | ExerciseDB `target` | App `MuscleGroup` |
|---|---|---|
| `chest` | any | `Chest` |
| `back` | any | `Back` |
| `shoulders` | any | `Shoulders` |
| `upper arms` | includes `"tricep"` | `Triceps` |
| `upper arms` | `"biceps"`, `"brachialis"` | `Biceps` |
| `lower arms` | any | `Biceps` |
| `upper legs` | `"glutes"` | `Glutes` |
| `upper legs` | other | `Legs` |
| `lower legs` | any | `Legs` |
| `waist` | any | `Core` |
| `cardio` | any | `Full Body` |

Also change `ignoreDuplicates: true` → `ignoreDuplicates: false` in the upsert so that re-running the seed script updates existing rows (backfills the corrected `primary_muscle` and new `gif_url` on all previously seeded exercises).

---

### Part B — Schema: Add `gif_url` Column

**Migration — `reports/migrations/002_exercises_add_gif_url.sql`:**
```sql
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
```

Run in Supabase SQL Editor before re-seeding. The `instructions text[]` column already exists and serves as the exercise description.

**Seed script update:**
Add `gifUrl: string` to the `ExerciseDBItem` interface and include it in `mapExercise`:
```ts
gif_url: e.gifUrl ?? null,
```

---

### Part C — UI: Show Description + Expandable GIF in Swap Modal

**`components/SwapExerciseModal.tsx`:**

1. **Query update** — select `gif_url` and `instructions` alongside existing fields:
   ```ts
   .select('id, name, primary_muscle, equipment, gif_url, instructions')
   ```

2. **Local type** — introduce `SwapOption extends WorkoutExercise` with optional `gifUrl?: string` and `description?: string`. Map `instructions[0]` to `description` when building alternatives.

3. **Exercise card redesign:**
   - Outer `View` (card) contains main row + optional expanded panel
   - Main row (Pressable) selects the exercise; shows name, equipment, sets/reps, description (2-line truncated)
   - `▾ / ▴` chevron button (separate Pressable, `hitSlop: 8`) toggles expansion — only one card expanded at a time via `expandedId: string | null` state
   - Expanded panel shows: animated GIF (`Image`, 200px height, `resizeMode: contain`) + full first instruction text

4. **`handleSwap`** — destructure only the `WorkoutExercise` fields when calling `onSwap` so the extra `gifUrl`/`description` fields don't bleed into the program state.

---

**Trade-offs:**
- Animated GIFs from ExerciseDB CDN work natively on iOS via `Image`; Android requires `expo-image` or Fresco config for GIF animation. For now, lazy-load (only fetch GIF on expand) to avoid loading all GIFs in a long list.
- `ignoreDuplicates: false` means re-seeding will update all exercise rows. Run seed against the production Supabase project only after applying the migration.

---

## 9. Experience Level in Program Generation

**File:** Onboarding flow, user profile, `utils/programGenerator.ts`

**Goal:**
Beginners, intermediates, and advanced lifters have very different optimal volume and intensity prescriptions. Capturing experience level at onboarding (and allowing it to be updated in settings) lets the generator produce more appropriate programs out of the box.

**Proposed approach:**
- Add `experienceLevel: 'beginner' | 'intermediate' | 'advanced'` to user profile (set during onboarding)
- Map each level to a volume/intensity modifier in `programDefaults.ts` (see feature 2):
  - Beginner: 3×8–10, RPE 6–7, longer rest, fewer compound variations
  - Intermediate: 3–4×6–10, RPE 7–8, standard rest
  - Advanced: 4–5×4–8, RPE 8–9.5, shorter rest, higher variation
- Pass the modifier into `programGenerator.ts` alongside goal params

**Trade-off:**
Self-reported experience is unreliable — beginners often overestimate and advanced users sometimes underestimate. The classification should be editable and could eventually be inferred from logged performance data.

---

## 10. Haptic Feedback

**File:** Set logging component, rest timer logic, shared button components

**Goal:**
Add tactile feedback at key moments: confirming a logged set, completing a workout, swapping an exercise, and when the rest timer signals the user has been resting long enough to start the next set.

**Proposed approach:**
- Use `expo-haptics` (`ImpactFeedbackStyle.Light` for taps, `NotificationFeedbackType.Success` for workout complete, `ImpactFeedbackStyle.Medium` for rest-timer alert)
- Trigger on: log set confirm, workout complete, exercise swap confirm
- Rest-timer haptic: when the rest countdown reaches 0, fire a medium impact + schedule a notification vibration if the app is backgrounded
- Add a "Haptic feedback" toggle in settings (default on)

**Trade-off:**
Haptics are iOS-only in Expo's standard API; Android uses a different vibration model. Test on both platforms — excessive haptics can feel intrusive, so err on the side of fewer, more intentional triggers.

---

## 11. Profile Photo

**File:** Profile screen, user profile state/storage

**Goal:**
Allow users to set a profile photo that appears on the profile tab and any user-facing surfaces (e.g., a future social or sharing feature). This makes the app feel more personal and complete.

**Proposed approach:**
- Use `expo-image-picker` to let users select a photo from their library or camera
- Upload the chosen image to Supabase Storage (a `avatars` bucket, one file per user keyed by `user_id`)
- Store the public URL in the user profile row (`avatar_url TEXT`)
- Display it as a circular avatar on the profile screen
- Fall back to an initials-based placeholder when no photo is set

**Trade-off:**
Supabase Storage requires a bucket policy for public reads and authenticated writes. Image size should be capped before upload (resize to ≤ 400×400) to avoid storing large originals. `expo-image-picker` requires camera roll permission on iOS; handle the denial gracefully.

---
