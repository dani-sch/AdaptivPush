# AdaptivPush — Multi-Phase Implementation Plan

> Source of truth: `reports/plans/POSSIBLE-FEATURES.md` (feature specs)
> This document defines **what to build, in what order, and how** across 4 phases.
> Convert each phase into a sprint/branch when ready to execute.

---

## Git & PR Workflow

These rules apply to every section (A, B, C…) across all phases:

- **Multiple commits per section** — each logical unit of work within a section gets its own commit.
- **Commit messages must be approved first** — propose all commit messages to the user and wait for explicit approval before running any `git commit`.
- **PRs must be approved first** — propose the PR title and body to the user and wait for explicit approval before running `gh pr create`.
- **Never co-author with Claude** — no `Co-Authored-By` lines of any kind.
- **Always commit from the user's account** — git user is `dani-sch` / `dani23schlichting@gmail.com`. Never modify git config.
- **Never push to main directly** — all changes go through feature branches and PRs.

---

## Progress Tracker

| Section | Status |
|---------|--------|
| 1A — Exercise Swap | ✅ Complete |
| 1B — Compound/Accessory Cross-Check | ✅ Complete |
| 1C — Archive Restore with User Choice | ✅ Complete |
| 2A — Experience Modifier Constant | ✅ Complete |
| 2B — Experience Level Profile Display | ✅ Complete |
| 2C — Menstrual Cycle Tracking | ✅ Complete |
| 2D — Program Name Input | ✅ Complete |
| 3A — Light / Dark Mode | ✅ Complete |
| 3B — Colour Palette Themes | ✅ Complete |
| 3C — Profile Photo | ✅ Complete |
| 3D — Haptic Feedback | ✅ Complete |
| 4A — HealthKit Dependency + Entitlements | 🔲 Not started |
| 4B — `utils/healthKit.ts` | 🔲 Not started |
| 4C — HealthKit Settings Integration | 🔲 Not started |
| 4D — Workout Complete Hook | 🔲 Not started |
| 4E — Program Generation Body Weight Seeding | 🔲 Not started |

---

## Phase Overview

| Phase | Theme | Features | Key output |
|-------|-------|----------|------------|
| 1 ✅ | Bug Fixes + Data Foundation | 8, 1, 4 | Everything existing works correctly |
| 2 ✅ | Program Generation Intelligence | 2, 9, 3 | Smarter, more personalised programs |
| 3 ✅ | UI Personalisation | 6, 7, 11, 10 | Theming, profile photo, haptics |
| 4 🔲 | Integrations | 5 | Apple Health sync |

**Phase ordering rationale:**
- Phase 1 fixes what is currently broken before new features land on top of broken scaffolding.
- Phase 2 builds the generation intelligence layer that Phase 3's profile fields (experience level, cycle) feed into.
- Phase 3 is UI-only and has no downstream blockers — safe to execute after Phase 1.
- Phase 4 (HealthKit) is isolated and can begin in parallel with Phase 3 if needed.

---

## Phase 1 — Bug Fixes + Data Foundation ✅

**Branch:** `fix/data-foundation`
**Features:** 8 (exercise swap), 1 (compound/accessory), 4 (archive restore)

---

### 1A. Exercise Swap — Deploy Already-Written Changes (Feature 8) ✅

The code for this feature is complete. Phase 1 begins by deploying it.

**Step 1 — Run migration in Supabase SQL Editor:**
```sql
-- reports/migrations/002_exercises_add_gif_url.sql
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
```

**Step 2 — Re-seed the exercise library:**
```bash
npx ts-node scripts/seedExercises.ts
```
This backfills all ~1,300 exercises with:
- Corrected `primary_muscle` values (was lowercase ExerciseDB bodyPart, now app Title Case)
- `gif_url` from ExerciseDB CDN

**Verification:**
- Open the swap modal on any exercise. Should show 20–50 exercises per muscle group (not 1–2).
- Tap the `▾` chevron on any row. Should expand to show animated GIF + description.

---

### 1B. Compound/Accessory Cross-Check (Feature 1) ✅

**File:** `utils/programGenerator.ts` → `resolveSlotParams()`

**Steps:**

1. Define the compound equipment set near the top of the file:
   ```ts
   const COMPOUND_EQUIPMENT = new Set(['Barbell', 'Dumbbell']);
   ```

2. Update `resolveSlotParams()` signature to receive the exercise:
   ```ts
   function resolveSlotParams(
     goal: GoalParams,
     position: number,
     exercise: { equipment: string },
   ): SlotParams
   ```

3. Inside `resolveSlotParams()`, replace the position-only gate:
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

4. Update all call sites of `resolveSlotParams()` to pass the exercise object.

**Verification:**
- Generate a Full Body program. Verify Barbell Row (position 3+) receives the same sets/RPE as Squat (position 1).
- Generate a PPL Push day. Verify Cable Fly (position 4+) still receives the reduced accessory params.

---

### 1C. Archive Restore with User Choice (Feature 4) ✅

**Files:** archive logic (`ProgramCard` or archiving util), program state

**Step 1 — Check if snapshot fields exist in the DB.**
If the user profile or programs table does not already have `last_active_week`, `last_active_day`, `last_active_date` columns, run a migration:
```sql
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS last_active_week  integer,
  ADD COLUMN IF NOT EXISTS last_active_day   integer,
  ADD COLUMN IF NOT EXISTS last_active_date  timestamptz;
```

**Step 2 — On archive:** before setting `archived = true`, write the current position:
```ts
await supabase.from('programs').update({
  archived: true,
  last_active_week: currentWeek,
  last_active_day:  currentDay,
  last_active_date: new Date().toISOString(),
}).eq('id', program.id);
```

**Step 3 — On un-archive:** if `last_active_week` is not null, show a choice prompt:

```
"Resume from Week {X}, Day {Y}?"
  [Resume]   [Restart from Week 1]
```

- Resume → restore `current_week = last_active_week`, `current_day = last_active_day`
- Restart → set `current_week = 1`, `current_day = 1`
- Either path clears `last_active_*` fields after restoring (they're stale once the program is active again)

**Verification:**
- Archive a program mid-week. Un-archive it. Confirm the prompt shows the correct week/day.
- Choose Resume → confirm the program opens at the saved position.
- Choose Restart → confirm the program opens at Week 1 Day 1.

---

## Phase 2 — Program Generation Intelligence ✅

**Branch:** `feat/generation-intelligence`
**Dependency:** Phase 1 merged and stable

**Execution order:** 2A → 2B → 2C → 2D (each builds on the previous)

---

### 2A. Experience Modifier Constant (invisible to users) ✅

**File:** `utils/programGenerator.ts`

**What and why:**
The generator already has `GOAL_PARAMS` (sets/reps/RPE per training goal) and already uses `experienceLevel` for weight calculations via `exercise.experienceMultipliers`. What's missing is applying experience level to **sets and RPE** — not just weight. Rather than creating a new file (which would require moving existing clean constants and risk breaking the generator), add `EXPERIENCE_MODIFIERS` directly alongside `GOAL_PARAMS`.

**New constant to add:**
```ts
interface ExperienceModifier {
  setsMultiplier: number;  // scales base sets (e.g. 0.85 → fewer sets for beginner)
  rpeOffset:      number;  // added to periodized RPE (e.g. −1.0 → easier for beginner)
}

const EXPERIENCE_MODIFIERS: Record<TrainingExperience, ExperienceModifier> = {
  beginner:     { setsMultiplier: 0.85, rpeOffset: -1.0 },
  intermediate: { setsMultiplier: 1.00, rpeOffset:  0.0 },
  advanced:     { setsMultiplier: 1.15, rpeOffset: +0.5 },
};
```

**Wiring:**
Apply the modifier inside `resolveSlotParams()` (already receives `exercise` from Phase 1). Pass `experienceLevel` through so the modifier can scale the final sets and RPE before returning:
```ts
const mod = EXPERIENCE_MODIFIERS[experienceLevel];
const finalSets = Math.max(Math.round(slotParams.sets * mod.setsMultiplier), 2);
const finalRPE  = Math.min(Math.max(slotParams.rpe + mod.rpeOffset, 5.0), 10.0);
```

**No behaviour change for intermediate users** (multiplier 1.0, offset 0) — existing programs generate identically for anyone at the intermediate level.

---

### 2B. Experience Level — Profile Display and Generator Wiring ✅

**Files:** Profile/settings screen, `utils/programGenerator.ts`, `hooks/useCurrentProgram.ts`

**No migration needed** — `experience_level` (type `training_experience`) already exists in `user_profile` and is set during onboarding.

**Step 1 — Profile screen:** add an "Experience Level" row that shows the current value and lets users change it.
- Display: Beginner / Intermediate / Advanced
- Tap to open a picker (action sheet or inline selector)
- On change: `UPDATE user_profile SET experience_level = $1, updated_at = now() WHERE user_id = $2`

**Step 2 — Generator wiring:** the generator already receives `experienceLevel: TrainingExperience` as a parameter and passes it to `buildSlot`. Extend this so `experienceLevel` is also passed into `resolveSlotParams()` where the modifier from 2A is applied.

**Step 3 — `GenerateProgramModal`:** when fetching user profile before generation, confirm `experience_level` is read and passed through. If null, default to `'intermediate'`.

**Verification:**
- Set experience to Beginner, generate a 3-day hypertrophy program. Confirm fewer sets and lower RPE than Intermediate.
- Set experience to Advanced. Confirm more sets and higher RPE.
- Change experience level in profile → re-generate → values update.

---

### 2C. Menstrual Cycle Tracking and Program Adjustment ✅

**Files:** Profile screen, `utils/programGenerator.ts`, `hooks/useCurrentProgram.ts` (progression), `app/(tabs)/home.tsx`

**Context:**
`cycle_enabled` (bool) already exists in `user_profile`. The home screen readiness modal has a manual `CycleSelector` that picks the phase for the day. 2C replaces/supplements this with profile-stored period data so the phase is computed automatically rather than manually entered each session. HealthKit integration (Phase 4) will eventually auto-populate `last_period_start_date` from Apple Health — the profile fields added here are the foundation for that.

**Step 1 — Migration:**
```sql
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS last_period_start_date date,
  ADD COLUMN IF NOT EXISTS avg_cycle_length_days  integer DEFAULT 28;
```

**Step 2 — Phase computation utility** (new `utils/cyclePhase.ts`):
```ts
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export function computeCyclePhase(
  lastPeriodStart: Date,
  avgCycleLength: number,
): CyclePhase {
  const dayOfCycle = differenceInCalendarDays(new Date(), lastPeriodStart) % avgCycleLength;
  if (dayOfCycle <= 4)  return 'menstrual';
  if (dayOfCycle <= 13) return 'follicular';
  if (dayOfCycle <= 16) return 'ovulatory';
  return 'luteal';
}
```

**Step 3 — Profile screen:** add a "Cycle Tracking" section below Experience Level.
- Toggle: `cycle_enabled` on/off (already in DB)
- When enabled, show:
  - Date picker: "Last period start date"
  - Number input: "Average cycle length" (default 28 days)
- Save on change to `user_profile`

**Step 4 — Home screen:** when `cycle_enabled = true` and `last_period_start_date` is set, auto-compute the phase and pre-fill the `CycleSelector` in the readiness modal instead of defaulting to `N/A`. The manual picker stays as an override.

**Step 5 — Generator modifier** (affects both initial generation and weekly progression):

Modifiers applied in `resolveSlotParams()`, stacked on top of experience level modifier:
| Phase | RPE offset | Sets change |
|-------|-----------|-------------|
| `menstrual` | −0.5 | −1 on compounds (min 2) |
| `luteal` | −0.5 | −1 on compounds (min 2) |
| `follicular` | 0 | none |
| `ovulatory` | 0 | none |

Same modifier applied in `applyProgressionToNextWeek()` so weekly weight/RPE targets also reflect current phase.

**Note on HealthKit:** Phase 4 will add a call to read `HKCategoryTypeIdentifierMenstrualFlow` from Apple Health to auto-populate `last_period_start_date`. The profile fields added here are the storage layer that Phase 4 will write into.

**Verification:**
- Enable cycle tracking, set last period to 20 days ago (luteal). Generate a program. Confirm compound sets and RPE are reduced.
- Set last period to 5 days ago (follicular). Confirm baseline params match non-cycle generation.
- Home screen readiness modal pre-fills cycle phase correctly.

---

### 2D. Program Name Input in Generation Flow ✅

**File:** `components/GenerateProgramModal.tsx`

**Goal:**
Let users give their generated program a custom name. No friction on the happy path — the auto-generated name is pre-filled.

**Steps:**

1. Add an optional "Program Name" text input as the **last step** of the generation modal, shown after the user taps "Generate" and the program is computed but before it's saved.
   - Pre-fill with the auto-generated name (e.g. "3-Day Hypertrophy Program").
   - Blank falls back to the auto-generated name.

2. Pass the final name into `saveProgramToDb()`:
   ```ts
   const programName = customName.trim() || generated.name;
   await saveProgramToDb(userId, params, { ...generated, name: programName });
   ```

3. No schema change needed — `programs.name` already exists.

**Verification:**
- Leave name blank → auto-name appears in plan tab.
- Enter a custom name → custom name appears in plan tab.
- Pressing back from the name step should return to params, not close the modal.

---

## Phase 3 — UI Personalisation ✅

**Branch:** `feat/ui-personalisation`
**Features:** 6 (light/dark), 7 (colour palettes), 11 (profile photo), 10 (haptics)
**Dependency:** None (can execute in parallel with Phase 2 if needed)
**Internal order:** 6 must come before 7. 11 and 10 are independent.

---

### 3A. Light / Dark Mode (Feature 6) ✅

**Files:** `constants/colors.ts` → `constants/themes.ts`, new `contexts/ThemeContext.tsx`, settings screen, all components

**Step 1 — Token audit:**
List every file that imports from `constants/colors.ts`. This defines the replacement surface.

**Step 2 — Create theme token sets:**
```ts
// constants/themes.ts
export const DARK_THEME  = { background: '#0f0f0f', surface: '...', card: '...', text: '...', ... };
export const LIGHT_THEME = { background: '#f5f5f5', surface: '...', card: '...', text: '...', ... };
```
Match every existing constant in `constants/colors.ts` to a token name.

**Step 3 — ThemeContext:**
```tsx
// contexts/ThemeContext.tsx
export const ThemeContext = createContext(DARK_THEME);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<'system' | 'light' | 'dark'>('system');

  // Load preference from AsyncStorage on mount
  // Derive activeTheme from preference + systemScheme
  // Persist preference to AsyncStorage on change

  return <ThemeContext.Provider value={{ theme, preference, setPreference }}>
    {children}
  </ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
```

**Step 4 — Component migration:** replace all direct `import { X_COLOR } from '@/constants/colors'` with `const { theme } = useTheme()` and `theme.X`. Migrate screen by screen.

**Step 5 — Settings screen:** add "Appearance" row with three options: System / Light / Dark.

**Verification:**
- Switch device to Light Mode. Confirm all screens are readable.
- Toggle to "Dark" in settings while device is in Light Mode. Confirm app stays dark.

---

### 3B. Colour Palette Themes (Feature 7) ✅

**Depends on:** 3A (ThemeContext must exist)

**Files:** new `constants/palettes.ts`, `contexts/ThemeContext.tsx`, settings screen

**Step 1 — Define palettes:**
```ts
// constants/palettes.ts
export const PALETTES = {
  'pink-purple': { primary: '#c084fc', accent: '#a855f7', highlight: '#e879f9', tint: '#f0abfc' },
  'blue':        { primary: '#38bdf8', accent: '#0ea5e9', highlight: '#7dd3fc', tint: '#bae6fd' },
  'green':       { primary: '#4ade80', accent: '#22c55e', highlight: '#86efac', tint: '#bbf7d0' },
  'mono':        { primary: '#e5e7eb', accent: '#9ca3af', highlight: '#ffffff', tint: '#d1d5db' },
} as const;

export type PaletteKey = keyof typeof PALETTES;
```

**Step 2 — Extend ThemeContext:** add `palette: PaletteKey` and `setPalette` to context. Merge the active palette's accent tokens into the active theme at render time. Persist palette key to AsyncStorage separately from appearance preference.

**Step 3 — Settings screen:** below the Appearance picker, add a horizontal row of circular colour swatches — one per palette. Tapping selects it immediately. Mark the active palette with a check ring.

**Verification:**
- Select each palette. Confirm primary buttons, active tabs, and highlights change colour throughout the app.
- Kill and reopen the app. Confirm the selected palette persists.

---

### 3C. Profile Photo (Feature 11) ✅

**Files:** Profile screen, new `utils/uploadAvatar.ts`, Supabase Storage, `user_profile` table

**Step 1 — Migration** (check if column exists first):
```sql
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS avatar_url text;
```

**Step 2 — Supabase Storage setup** (done once in Supabase dashboard or via CLI):
- Create bucket: `avatars` (public)
- RLS policy — INSERT/UPDATE: `auth.uid()::text = (storage.foldername(name))[1]`
- RLS policy — SELECT: public (bucket is public read)

**Step 3 — `utils/uploadAvatar.ts`:**
```ts
export async function uploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  const resized = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  const blob = await uriToBlob(resized.uri);
  const path = `${userId}/${Date.now()}.jpg`;
  await supabase.storage.from('avatars').upload(path, blob, { upsert: true });

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
```

**Dependencies to confirm/add:** `expo-image-picker`, `expo-image-manipulator`

**Step 4 — Profile screen:** replace the current placeholder/initials avatar with:
- If `avatar_url` exists: circular `Image` component
- Otherwise: initials circle (first letter of display name, coloured background)
- Tap the avatar on the main Profile screen → call `uploadAvatar()` → on success, update `user_profile.avatar_url` in Supabase + refresh local state

**Verification:**
- Select a photo. Confirm it uploads and displays within the app.
- Kill and reopen. Confirm avatar persists (loaded from Supabase on mount).
- Deny camera roll permission. Confirm graceful error message (no crash).

---

### 3D. Haptic Feedback (Feature 10) ✅

**Files:** Set logging component, rest timer component, Settings screen

**Step 1 — Confirm `expo-haptics` is available** (it's included in Expo SDK by default — no install needed).

**Step 2 — Rest timer note:**
The app currently has a workout duration timer, but no rest timer component. The implemented haptics cover set logging, exercise swap confirmation, workout completion, and a user-facing toggle in Settings. Rest timer haptics should be added if/when a rest timer is introduced.

**Step 3 — Add haptic calls:**

| Trigger | Haptic call |
|---------|-------------|
| Log set (confirm button) | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| Exercise swap confirm | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| Rest timer reaches 0 | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` *(deferred until a rest timer exists)* |
| Workout complete | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |

**Step 4 — Settings toggle:**
- Add "Haptic Feedback" toggle in Settings (default: on). Persist to AsyncStorage.
- Create a thin wrapper:
  ```ts
  async function haptic(fn: () => Promise<void>) {
    const enabled = await AsyncStorage.getItem('haptics_enabled');
    if (enabled !== 'false') await fn();
  }
  ```
- Wrap all haptic calls with `haptic(...)`.

**Verification:**
- Log a set. Confirm subtle tap.
- If a rest timer is added later, confirm medium impact on expiry.
- Complete a workout. Confirm success notification haptic.
- Disable haptics in Settings. Confirm none of the above trigger.

---

## Phase 4 — Apple HealthKit Integration 🔲

**Branch:** `feat/healthkit`
**Feature:** 5
**Dependency:** Phase 1 complete (workout complete flow should be stable)
**Platform:** iOS only

---

### 4A. Dependency + Entitlements 🔲

1. Add the library:
   ```bash
   npx expo install react-native-health
   ```
   (or `expo-health` if the Expo Go workflow requires it — confirm with `npx expo install` availability)

2. Add to `app.json` / `app.config.ts`:
   ```json
   {
     "ios": {
       "infoPlist": {
         "NSHealthShareUsageDescription": "AdaptivPush reads your body weight to suggest starting weights.",
         "NSHealthUpdateUsageDescription": "AdaptivPush saves your workouts to Apple Health."
       },
       "entitlements": {
         "com.apple.developer.healthkit": true
       }
     }
   }
   ```

3. Rebuild the dev client (`eas build --profile development` or `npx expo run:ios`).

---

### 4B. `utils/healthKit.ts` 🔲

```ts
export async function requestHealthKitPermissions(): Promise<boolean>
// Requests read (body mass) + write (workout) permissions.
// Returns true if granted. Safe to call multiple times (idempotent).

export async function saveWorkoutSession(params: {
  startDate:   Date;
  endDate:     Date;
  exercises:   { name: string; sets: number; reps: number; weightLb: number }[];
  caloriesBurned?: number;   // estimated if not tracked
}): Promise<void>
// Writes a HKWorkoutActivityTypeTraditionalStrengthTraining session.

export async function readBodyWeightLb(): Promise<number | null>
// Reads the most recent body mass sample from HealthKit.
// Returns null if unavailable or permission denied.
```

---

### 4C. Settings Integration 🔲

- Add "Apple Health" section in Settings.
- Toggle: "Sync workouts to Apple Health" (default: off).
- On enable → call `requestHealthKitPermissions()` immediately. If denied, show guidance ("Enable in Settings > Health > AdaptivPush").
- Persist toggle state to AsyncStorage as `healthkit_enabled`.

---

### 4D. Workout Complete Hook 🔲

In the workout completion flow (wherever the "Workout Complete" confirmation fires):

```ts
const isEnabled = await AsyncStorage.getItem('healthkit_enabled') === 'true';
if (isEnabled) {
  await saveWorkoutSession({
    startDate: workoutStartTime,
    endDate:   new Date(),
    exercises: loggedSets,
  });
}
```

Auto-write — no per-session prompt (user opted in globally via Settings toggle).

---

### 4E. Program Generation — Body Weight Seeding (Optional) 🔲

When generating a new program, after reading the user profile:
```ts
const hkWeight = await readBodyWeightLb();
const bodyWeight = hkWeight ?? userProfile.bodyWeightLb ?? 150; // fallback chain
```

Use `bodyWeight` for suggested starting weights rather than a hardcoded default.

**Verification:**
- Enable HealthKit in Settings. Complete a workout. Open Apple Health → Workouts. Confirm the session appears.
- Deny HealthKit permission mid-flow. Confirm the app handles the rejection gracefully (no crash, no silent failure).
- Check that disabling the toggle stops future writes without affecting past ones.

---

## Cross-Cutting Concerns

### Migrations Checklist
Before each phase, confirm which migrations are needed and run them in Supabase before starting any code that reads/writes those columns.

| Migration | Phase | File |
|-----------|-------|------|
| `exercises.gif_url` | 1A | `reports/migrations/002_exercises_add_gif_url.sql` |
| `programs.last_active_week/day/date` | 1C | create `003_programs_archive_state.sql` |
| `profiles.experience_level` | 2B | create `004_profiles_experience_level.sql` |
| `profiles.cycle_tracking_*` | 2C | create `005_profiles_cycle_tracking.sql` |
| `user_profile.avatar_url` | 3C | create `006_user_profile_avatar_url.sql` |

### Settings Screen
Features 3A, 3B, 3D, and 4 all add rows to the Settings screen. Implement them in phase order and use a consistent section/row pattern to avoid UI drift.

### Branch Strategy
Each phase is its own feature branch. Open a PR per phase. Do not merge Phase 2 until Phase 1 is shipped and stable.
