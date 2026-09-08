---
title: "AdaptivPush FABLE-5 master implementation execution plan"
created: "2026-07-02"
status: active
workflow: direct
canonical_execution_driver: true
code_status_snapshot: "dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md"
execution_register: "dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md"
source_materials:
  - "reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md"
  - "reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md"
  - "reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md"
  - "research/deep-research-report.md"
estimated_effort: XL
---

# AdaptivPush FABLE-5 master implementation execution plan

> Executive implementation goal: Complete AdaptivPush as one coherent, polished, evidence-informed strength-training product by following this plan as the single canonical execution source, preserving strong existing work, closing disconnected or placeholder surfaces, and ensuring every important recommendation, adjustment, and explanation is clear, conservative, and user-controlled.

## Execution authority and current status

This document is the sole product and technical execution contract for completing AdaptivPush. Supporting documents have deliberately separate jobs:

- `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md` owns stable `F5-S*` stage identifiers, current stage status, bounded slices, prerequisites, and gates.
- `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md` owns the code-backed inventory of working, partial, scaffolded, missing, and externally unverified behavior.
- `dev-doc/main/TODO.md` owns only the immediate task board.
- The evidence-backed execution, UI, and implementation plans are source references. They do not control sequencing or status.

Current stage summary at the audited `74f9e8a` baseline:

| Stable stage | State | Meaning |
|---|---|---|
| `F5-S0` Evidence/policy foundation | complete | Registry, policies, generator metadata, lint, output comparison, and in-app generation smoke are recorded. |
| `F5-S1` Schema truth, RLS, compatibility, and authority closeout | active | Phase 2 code exists, but live schema/RLS and full new/legacy smoke validation remain. |
| `F5-S2` Feature gates and shared UX/state foundation | pending | No feature-gate layer exists; shared UI primitives remain minimal. |
| `F5-S3` through `F5-S8` | pending | Product completion work must follow the execution register dependencies. |

The older documents reused `Phase 1` and `Phase 2` for different work. New implementation, commits, logs, and handoffs must use only the stable `F5-S*` identifiers.

## A. Executive product definition

AdaptivPush is a calm, premium, evidence-informed mobile strength-training system that combines three equally important product pillars:

1. a smart program builder,
2. a conservative day-of adaptive coach,
3. and a transparent explanation layer that shows why the app recommended, adjusted, or withheld a change.

The finished product promise is:

> Better workouts, better decisions, and better understanding of those decisions.

### Product principles

- Preserve user agency. The app recommends, explains, and records overrides; it does not silently take control.
- Prefer stable, recoverable programming over novelty. Primary lifts and primary patterns stay stable long enough to measure progress.
- Treat readiness as context, not truth. Reduce volume before complexity, reduce complexity before load, and avoid overreacting to one bad day.
- Keep physiology-aware support optional, hidden by default, symptom-first, and privacy-conscious.
- Distinguish evidence from product choice. User-facing logic must label strong evidence, moderate evidence, mixed evidence, expert consensus, and product heuristics.
- Keep Essential mode truly simple. Advanced depth can expose more logic and analytics without contaminating the low-friction path.
- Make the system legible. Home, Next Workout, Plan, Program Overview, History, FAQ, and Recovery Library should all reuse the same explanation language and evidence model.
- Reuse good existing work. The app already contains a working client shell, generator foundation, persistence model, theme system, profile/settings surfaces, and history logging; the plan should evolve those seams instead of replacing them wholesale.

### Final product boundaries

#### In scope

- Onboarding and profile capture tied to meaningful personalization controls
- Evidence-informed program generation with split recommendation, volume targeting, stable exercise windows, overrides, and rationale
- Day-of adaptive coaching with one-tap and optional deeper readiness check-ins
- Progression, plateau detection, reactive deload recommendations, override handling, and adaptation history
- Optional symptom-first physiology-aware support
- Recovery education and FAQ content backed by a shared evidence registry
- Interpreted history and analytics rather than raw logging only
- Production-quality loading, empty, error, theme, accessibility, and privacy states

#### Out of scope for the completion target

- Nutrition coaching beyond lightweight recovery support
- Social features, coach marketplace, or community programming
- Black-box ML recommendations
- Mandatory wearable dependency
- Android-specific health integrations in the first full product completion pass

## B. Current-state audit

### Repository and runtime architecture

| Area | Current state | Implication |
|---|---|---|
| App shell | Expo Router app in `app/` with `(auth)`, `(qsetup)`, `(tabs)`, and detail routes in `app/_layout.tsx` | Keep the current navigation shell and refactor within it |
| Core state | `hooks/useCurrentProgram.ts` loads and mutates the active program, progression, archiving, swaps, and week advancement | This hook is the current orchestration seam and should be split, not bypassed |
| Persistence | Supabase Auth + Postgres via `utils/supabase.ts`; program, workout, readiness, profile, and PR data are already persisted | The finished app can remain client-heavy if data contracts are cleaned up |
| Program generation | `utils/programGenerator.ts` already uses typed defaults, split maps, exercise pinning, explanation metadata, and deload cadence | Preserve and expand; do not rebuild the generator from scratch |
| Exercise catalog source | Generator and some fallback selection logic still depend on the static `lib/exerciseDatabase.ts` catalog rather than reading directly from the full Supabase `exercises` table | Exercise database reseeding must also refresh the local generator catalog or generation coverage will remain incomplete |
| Explanation foundation | `types/evidence.ts`, `constants/evidenceRegistry.ts`, `constants/adaptationPolicies.ts`, and `constants/programDefaults.ts` already exist | `F5-S0` is complete, but no user-facing trust surface consumes it yet |
| Theme system | `contexts/ThemeContext.tsx`, `constants/themes.ts`, and `constants/palettes.ts` provide dark, light, system, and palette switching | Keep theme support complete and first-class |
| Design style | Screen-level styles are largely bespoke, gradient-heavy, and component-light | Introduce shared layout/surface primitives instead of rewriting with ad hoc screen styles again |
| Tooling | `npm run lint` exists; no test script or test files are present | The plan must include explicit manual regression plus minimal logic-test infrastructure when engine work begins |
| Application identity | `app.json` still uses `temp-app` / `tempapp` and declares no production bundle/package identifiers | Production identity and build configuration are completion requirements, not post-launch polish |

### Existing user-facing screens and flows

| Surface | Current state | Retain / change / remove |
|---|---|---|
| `app/index.tsx` | Clean marketing-style landing with Sign In / Join | Retain, refresh trust copy and footer links |
| `app/(auth)/*` | Login and join exist; forgot-password has a TODO implementation gap | Retain auth flow, finish forgot-password |
| `app/(qsetup)/quick-setup.tsx` | Collects DOB, sex assigned at birth, gender identity, weight, experience, optional Apple Health toggle, then opens generator modal | Replace with true personalization onboarding; demographics should not be the only first-run capture |
| `components/GenerateProgramModal.tsx` | Captures days/week, duration, goal, focus muscles, session length, swap interval; generates and saves a program | Retain as seed for the future program builder, but expand into a richer recommendation-and-override flow |
| `app/(tabs)/home.tsx` | Shows next workout, basic stats, readiness prompt, accessory swap nudge, simple cycle advice, recovery shortcut | Rework into action-first command center with explicit "what changed today and why" |
| `app/next-workout.tsx` | Applies readiness and cycle modifiers as a display-time overlay; supports set logging, swaps, PR detection, and progression trigger on finish | Retain execution flow, replace opaque overlay logic with explicit adaptation summaries and user choices |
| `app/(tabs)/plan.tsx` | Shows current program week, workout cards, menu actions, program overview link, and custom-program CTA | Retain as plan hub, make it the home for program rationale and override-safe editing |
| `app/program-overview.tsx` | Lists weeks, days, exercises, rep prescriptions, and weights | Expand into rationale-rich overview with weekly volume targets, split explanation, and evidence affordances |
| `app/(tabs)/history.tsx` | Good raw history shell with workout summaries, PR count, session detail, and exercise drill-down | Retain and evolve into interpreted analytics and adaptation history |
| `app/workout-history.tsx` | Re-export only to `app/(tabs)/history.tsx` | Keep as routing alias or remove when route cleanup is safe |
| `app/(tabs)/profile/index.tsx` | Large profile/settings hub with experience level, cycle tracking, appearance, readiness settings, and links to settings subpages | Retain as settings hub, simplify IA and align controls with actual product logic |
| `app/faq.tsx` | Static FAQ copy | Replace content model; keep route |
| `app/recovery-library.tsx` | Static routines and static stretch-heavy recovery content | Replace content model; keep route |
| `app/create-program.tsx` | Full manual program builder with custom day naming and exercise picking | Keep only as an Advanced/manual editor path; do not treat it as the primary program flow |
| `app/archived-programs.tsx` | Basic archived-program list and restore flow | Retain; add version/replacement context and rationale history entry points |

### Current logic and domain gaps

| Area | Confirmed current gap |
|---|---|
| Onboarding | Missing core capture for goal, days/week, time budget, equipment detail, focus muscles, goal horizon, depth mode, explanation preference, adaptation style, and analytics depth |
| Readiness | Home still calculates a single weighted score from sleep, stress, soreness, and motivation; no pain, illness, life load, optional symptom burden, or one-tap state taxonomy |
| Adaptation authority | `applyReadinessAdjustmentOnly` is intentionally a no-op; the home-screen adjustment modal does not persist a real user decision |
| Next Workout transparency | The screen applies hidden weight/RPE overlays but does not show structured "what changed", "why", "confidence", or "override" controls |
| Cycle support | Current logic is calendar-first and blanket-reduction-based in `utils/cyclePhase.ts`, `utils/programGenerator.ts`, and `useCurrentProgram.ts`; profile controls are always visible rather than hidden until enabled |
| Program generation | Split choice is still mostly `daysPerWeek -> fixed split`; there is no explicit split family recommendation, muscle-group weekly set targeting, or rationale-first override UI |
| Exercise coverage | Supabase can contain more exercises and images than the local generator catalog; without catalog sync, generation and some swap fallbacks cannot use the full seeded dataset |
| Deload behavior | Generator still bakes in every-fourth-week deloads by default; this conflicts with the target product direction |
| Analytics | History shows totals, PRs, and session details but not readiness trends, fatigue interpretation, adaptation history, plateau flags, or deload reasoning |
| Trust surfaces | Evidence registry exists in code but not in UX; FAQ and Recovery Library still use static copy |
| Integrations | Apple Health / HealthKit is still a UI placeholder only |
| Rollout | No feature-flag system exists |
| Tests | No automated tests are present |
| Password recovery | The forgot-password screen validates input but does not call Supabase reset APIs |
| Support/privacy operations | Support, export, and deletion actions only write timestamps into auth metadata; no processor fulfills them |
| Application identity | Expo name, slug, and scheme are temporary; production platform identifiers are absent |

### Existing data and persistence posture

The schema reference in `lib/adaptivpush_database_schema.md` already includes the Phase 2 additive tables:

- `user_profile`
- `user_adaptation_preferences`
- `evidence_display_preferences`
- `programs`
- `program_days`
- `program_day_exercises`
- `workout_sessions`
- `workout_exercise_sets`
- `readiness_logs`
- `readiness_checkins`
- `cycle_symptom_logs`
- `program_generation_context`
- `adaptation_events`
- `deload_recommendations`
- `personal_records`

This is enough to support the full product without introducing a second backend service. The missing work is not raw schema breadth; it is consistent use of the richer tables and consistent retirement of legacy behavior.

Code inspection adds an important qualification: migrations 008-014 create user-owned and sensitive tables but do not themselves enable row-level security or define ownership policies. The live Supabase posture may differ, but `F5-S1` cannot close until live RLS is proven and any missing policies are added through an additive migration. Schema breadth without verified ownership isolation is not a production-ready foundation.

### Existing design system

- Theme tokens exist and are solid.
- Screen composition is still mostly one-off.
- Shared high-value product primitives are missing: screen scaffold, section header, trust badge, metric tile, rationale card, bottom action bar, settings row, empty-state block, and evidence sheet.

### Existing tests and verification

- `npm run lint` is the only documented local gate.
- No test files are present.
- Manual verification currently matters for onboarding, profile settings, generation, workout execution, and history.

### What to retain, change, merge, and remove

#### Retain

- Expo Router shell
- Supabase-backed persistence
- `useCurrentProgram` as the orchestration seam
- `generateProgram()` as the generator core
- `saveProgramToDb()` context snapshotting pattern
- ThemeContext and palette/theme tokens
- History session-detail structure

#### Change

- Quick setup into true onboarding
- Home into action + adaptation summary
- Next Workout into explicit coaching
- Program Overview into rationale-rich overview
- Profile settings into real product controls instead of partial toggles
- Generator rules from fixed mapping to recommendation engine
- Progression and deload rules from simplistic thresholds to explainable decision tables

#### Merge

- Evidence registry + FAQ + Recovery Library + live coaching rationale
- Legacy readiness metadata + new adaptation preferences into one clear settings model
- Program generation context + adaptation events + analytics interpretation

#### Remove or retire from the main path

- Hidden readiness adjustment logic
- Mandatory demographic-first onboarding emphasis
- Automatic every-fourth-week deload as the product default
- Static recovery and FAQ copy as authoritative coaching surfaces
- Manual create-program flow as the default first-time experience

## C. Consolidated product requirements

### Requirement classification

| Category | Definition | Examples in this plan |
|---|---|---|
| Evidence-backed requirement | Directly supported by the research report and should shape defaults or constraints | Weekly volume visibility, volume-first readiness reduction, symptom-first optional cycle support |
| Product decision | Intentional product choice made to keep the experience coherent | Essential / Guided / Advanced depth modes, dedicated evidence screen, one-tap plus deeper readiness |
| Product heuristic | Explainable implementation rule used where evidence is incomplete | Confidence scoring, exact plateau thresholds, trigger counts for reactive deload recommendations |
| Open assumption | Requires inspection or validation before locking code | Exact production Supabase parity, health integration library path, whether old program rows need backfill beyond context labels |

### Consolidated feature specification

#### 1. Onboarding and personalization

- [Evidence-backed] Mandatory first-run inputs: primary goal, days available per week, training experience, equipment access, typical session duration.
- [Product decision] Also collect goal horizon, focus muscles, and product depth mode during onboarding.
- [Product decision] Move date of birth, sex assigned at birth, gender identity, and weight out of the critical path and into optional personal-information completion unless needed for a specific feature.
- [Product decision] Offer Essential, Guided, and Advanced modes with examples, not abstract labels only.
- [Product decision] Add separate settings for explanation verbosity, adaptation aggressiveness, and analytics depth; each setting must change visible behavior.
- [Product decision] Physiology-aware settings and external data connections stay hidden until the user opts in.

#### 2. Evidence-informed program generation

- [Evidence-backed] Recommend split family from goal, frequency, time budget, recovery reality, and focus muscles.
- [Evidence-backed] Show weekly set targets by muscle group and explain emphasis choices.
- [Product decision] Users can override split family, session length, focus emphasis, and variation cadence without breaking the generated plan.
- [Evidence-backed] Preserve primary lifts and patterns for measurable progress; rotate secondary work more freely.
- [Product decision] Each session must include exercise order, sets, reps, progression style, warm-up guidance, rest guidance, optional work, and rationale metadata.
- [Product heuristic] Exercise substitutions use movement pattern, primary target, equipment match, stability class, and current week context rather than random replacement.
- [Product decision] Program generation and swap coverage must be driven by the full intended exercise catalog, not a stale local subset; any exercise-database reseed must include image backfill plus a generator-catalog refresh step.

#### 3. Adaptive day-of-workout coaching

- [Evidence-backed] Support a one-tap readiness check-in and an optional deeper check-in.
- [Evidence-backed] Readiness inputs are contextual, trend-aware, and conservative; do not auto-cancel normal training from one poor signal.
- [Evidence-backed] Reduce volume before complexity, complexity before load.
- [Product decision] High readiness produces an optional push recommendation, not an automatic harder workout.
- [Product decision] Severe readiness can convert a session into a recovery-oriented training variant when warranted.
- [Product decision] Home and Next Workout must show what changed, why, effect, user options, and confidence level.

#### 4. Progression, plateaus, and deloads

- [Evidence-backed] Double progression remains the default model.
- [Evidence-backed] Plateau interpretation must consider repeated missed targets, repeated high RPE, stagnant estimated strength, adherence, fatigue, and frustration signals.
- [Evidence-backed] Reactive deloads are the default; scheduled deloads are optional for Advanced users only.
- [Product decision] Every deload recommendation must be explainable, deferrable, modifiable, and rejectable.
- [Product decision] Maintain an adaptation history trail with accepted and overridden changes.

#### 5. Physiology-aware personalization

- [Evidence-backed] Menstrual-cycle support is optional, hidden until enabled, symptom-first, and never universalized.
- [Product decision] Supported symptom tracking: cramps, fatigue, sleep disruption, mood, motivation, pain, bloating, optional notes, and period-start marker.
- [Product decision] The app must remain fully usable as a clean program builder and workout logger with all physiology-aware support off.

#### 6. Recovery and education

- [Evidence-backed] Recovery content is integrated coaching, not isolated reading.
- [Evidence-backed] Warm-up guidance is first-class; cooldown guidance is optional and framed honestly.
- [Product decision] FAQ, Recovery Library, and live rationale all read from one evidence registry.
- [Product decision] Trust affordances are progressive: badge -> Learn why -> rationale card -> evidence screen.

#### 7. Analytics and history

- [Product decision] History is not just a log; it is the explanation layer for change over time.
- [Evidence-backed] Highlight readiness trends, workload trends, consistency, plateau flags, focus-muscle progress, estimated strength trends where supported, adaptation history, and deload history.
- [Product heuristic] Use plain-language interpretation and confidence phrasing when data is incomplete or mixed.

#### 8. UX and design

- [Product decision] The app should feel premium, calm, trustworthy, one-handed, and intentionally minimal.
- [Product decision] Home prioritizes today's action; Plan prioritizes clarity plus rationale; History prioritizes interpretation; Trust surfaces stay compact by default.
- [Product decision] Preserve dark, light, and system themes and the current brand-palette concept.

### Resolved decisions and remaining validation before implementation continues

- `REQUIRES INSPECTION`: whether live Supabase exactly matches `lib/adaptivpush_database_schema.md`
- `REQUIRES INSPECTION`: whether `program_generation_context` rows already exist for all newly generated programs in the deployed environment
- `RESOLVED`: use `app/evidence/[key].tsx` as the primary evidence deep-link route; add an index only if evidence browsing becomes a user requirement
- `RESOLVED`: retain `app/create-program.tsx` as an Advanced-only manual editor behind the appropriate depth/feature gate
- `RESOLVED`: do not repurpose an ambiguous legacy check-in foreign key; prefer an additive `readiness_checkin_id` after live inspection
- `RESOLVED`: use app-level compatibility migration first for legacy auth metadata; use audited server-side backfill only if scale requires it
- `RESOLVED`: preserve current archive-week compatibility, but do not promise exact resume until explicit checkpoint/version state exists

## D. Canonical information architecture and navigation map

### Primary navigation

| Route | Purpose | Notes |
|---|---|---|
| `/(tabs)/home` | Today command center | Highest-priority screen; shows next action, readiness state, and today's changes |
| `/(tabs)/plan` | Current program hub | Owns generation entry, plan summary, day editing, and overview navigation |
| `/(tabs)/history` | History and analytics | Owns interpretation, trends, adaptation history, and workout/session drill-down |
| `/(tabs)/profile` | Settings and account | Owns preferences, privacy, notifications, appearance, and optional physiology settings |

### Core secondary routes

| Route | Purpose |
|---|---|
| `/next-workout` | Execute today's session with adaptive coaching |
| `/program-overview` | View full weekly structure, targets, rationale, and evidence links |
| `/faq` | Reusable evidence-backed FAQ |
| `/recovery-library` | Recovery modules, warm-ups, mobility, active recovery, symptom-tolerant movement |
| `/archived-programs` | Restore prior program versions |
| `/evidence/[key]` | Canonical deep-dive evidence and claim explanation; optional `/evidence` index only if browsing is needed |

### Settings subroutes

| Route | Purpose |
|---|---|
| `/(tabs)/profile/personal-information` | Optional personal data completion and editing |
| `/(tabs)/profile/notifications` | Notification preferences |
| `/(tabs)/profile/privacy-data` | Privacy controls, export, deletion |
| `/(tabs)/profile/help-support` | Support and issue-reporting entry points |

### Auth and onboarding routes

| Route | Purpose |
|---|---|
| `/` | Landing / sign-in entry |
| `/(auth)/login` | Sign in |
| `/(auth)/join` | Sign up |
| `/(auth)/forgot-password` | Password reset |
| `/(qsetup)/quick-setup` | Replace with staged onboarding flow or rename to `/onboarding` later |

### Modal and sheet flows

| Flow | From | Purpose |
|---|---|---|
| Generate Program builder | Home, Plan, onboarding completion | Recommend split, collect inputs, preview rationale, save |
| Readiness check-in | Home, Next Workout | One-tap or deeper readiness capture |
| Adjustment summary / why sheet | Home, Next Workout, Program Overview | Explain recommendation or change |
| Swap exercise | Next Workout, Plan | Suggest safe substitutes |
| Exercise history | Next Workout, History | Show exercise-specific prior performance |
| Deload recommendation sheet | Home, Next Workout, History | Recommend, defer, accept, or reject deload |

### Global state expectations

- Empty states must explain the next action.
- Error states must preserve user context and offer retry.
- Sensitive settings must make privacy behavior explicit.
- Every route must work in dark, light, and system modes.

## E. Data and domain model

### Modeling strategy

- Keep `programs` as immutable program versions rather than introducing a separate version table immediately.
- Use additive normalized event tables for explainability and analytics.
- Use JSON only for versioned snapshots and explanation payloads.
- Prefer one canonical source per behavior, with explicit compatibility reads from legacy tables only during transition.

### Core entities

| Entity | Purpose | Required fields | Notes |
|---|---|---|---|
| `user_profile` | Stable profile defaults | `depth_mode`, `experience_level`, `days_per_week`, `training_goal`, `session_length_preference_min`, `primary_goal_horizon`, `equipment_profile`, `rpe_familiarity`, `injury_considerations`, `cycle_enabled`, `healthkit_enabled` | Keep this as the stable user-default record |
| `user_adaptation_preferences` | Coaching behavior controls | `readiness_enabled`, `readiness_checkin_mode`, `readiness_authority`, `adaptation_aggressiveness`, `cycle_support_enabled`, `symptom_tracking_enabled`, `wearables_enabled`, `wearables_priority` | Primary behavior-control table |
| `evidence_display_preferences` | Trust/explanation controls | `verbosity`, `show_evidence_badges`, `show_source_links`, `show_uncertainty_notes`, `auto_open_why_sheet` | Separate from behavior preferences |
| `programs` | Program version root | `name`, `goal`, `duration_weeks`, `days_per_week`, `start_date`, `is_active`, `swap_interval_weeks`, `last_active_week` | Each new generation or meaningful regeneration creates a new program row |
| `program_generation_context` | Snapshot of why a program was generated | `policy_version`, `evidence_version`, `depth_mode`, `goal`, `days_per_week`, `session_length_target_min`, `focus_muscle_groups`, `split_recommendation`, `volume_targets`, `input_snapshot`, `output_summary` | Required for new generated plans |
| `program_days` | Program structure by week/day | `week_number`, `day_index`, `order_in_week`, `workout_name`, `estimated_duration_min`, `is_deload_week` | Add flags only if needed; keep shape lean |
| `program_day_exercises` | Session prescriptions | `exercise_id`, `position`, `set_count`, `rep_range_min`, `rep_range_max`, `target_rpe`, `suggested_weight_lb`, `per_set_weights_lb`, `notes` | Extend `notes` or companion metadata only if the UI needs more detail |
| `exercises` | Exercise catalog | `name`, `primary_muscle`, `target_muscle`, `secondary_muscles`, `equipment`, `instructions`, `image_url` | Add substitution metadata in code first; persist later only if needed |
| `workout_sessions` | Completed sessions | `program_day_id`, `checkin_id`, `started_at`, `ended_at`, `duration_min`, `total_volume_lb`, `pr_count`, `light_day_applied`, `notes` | Session-level record ties day-of adaptation to execution |
| `workout_exercise_sets` | Logged set detail | `session_id`, `exercise_id`, `set_number`, `weight_lb`, `reps`, `rpe` | Source of progression and history |
| `readiness_checkins` | V2 readiness input | `checkin_mode`, `one_tap_state`, `sleep_hours`, `sleep_quality`, `stress_level`, `soreness_level`, `motivation_level`, `pain_level`, `illness_flag`, `life_load_level`, `derived_readiness_score`, `recommended_action`, `raw_payload` | Canonical readiness source after cutover |
| `cycle_symptom_logs` | Optional physiology symptom input | `calendar_phase_context`, `cramps_level`, `fatigue_level`, `sleep_disruption_level`, `mood_level`, `pain_level`, `motivation_level`, `bloating_level`, `period_started`, `notes` | Hidden unless enabled |
| `adaptation_events` | Durable change history | `event_type`, `trigger_source`, `accepted`, `before_snapshot`, `after_snapshot`, `explanation_payload`, `evidence_keys` | Critical for "why did this change?" |
| `deload_recommendations` | Deload lifecycle | `status`, `trigger_type`, `reason_summary`, `recommended_volume_factor`, `recommended_load_factor`, `preserve_skill_practice`, `target_days`, `evidence_keys` | Tracks reactive and optional scheduled deloads |
| `personal_records` | PR tracking | `exercise_id`, `weight_lb`, `reps`, `one_rep_max_lb`, `achieved_at`, `session_id` | Already present and usable |

### Additional derived domain concepts

| Concept | Implementation |
|---|---|
| Program version | One `programs` row plus one `program_generation_context` row |
| Workout prescription | `program_day_exercises` joined with exercise catalog plus explanation metadata from generator/rule services |
| Day-of adjustment | Derived from readiness, symptoms, preferences, and current workout prescription; persisted as an `adaptation_event` |
| Confidence level | Derived field in explanation payload, not a dedicated DB table |
| Analytics view model | Computed selector layer over sessions, sets, readiness, deloads, and adaptation events |

## F. Adaptation and progression rules

### Rule labeling

- `[EVIDENCE]` directly anchored in the research report
- `[PRODUCT]` intentional product choice
- `[HEURISTIC]` transparent implementation rule needed where evidence is incomplete

### 1. Readiness inputs and normalization

- `[PRODUCT]` One-tap check-in states: `low`, `moderate`, `high`.
- `[PRODUCT]` Deep check-in fields: sleep hours, sleep quality, stress, soreness, motivation, pain, illness, life load, optional symptom context.
- `[HEURISTIC]` Convert deep inputs into severity points:
  - sleep <= 5h: +2
  - sleep 5.5-6.5h: +1
  - sleep quality <= 2/5: +1
  - stress >= 8/10: +2; stress 6-7: +1
  - soreness >= 8/10: +2; soreness 6-7: +1
  - motivation <= 2/10: +1
  - pain 4-5/10: +2; pain >= 6/10: safety branch
  - illness flag: +3
  - life load >= 8/10: +2; life load 6-7: +1
  - high optional symptom burden: +1 to +2, never used alone for automatic severe downgrade

### 2. Safety-first overrides

- `[EVIDENCE]` Fever, chest symptoms, dizziness, unusual weakness, or sharp worsening asymmetric pain should not produce a normal training recommendation.
- `[PRODUCT]` When a safety branch is hit, the app should present:
  - "hard training not recommended today"
  - a recovery-oriented alternative if appropriate
  - a short non-diagnostic safety note
  - explicit user choice to stop, switch, or continue anyway

### 3. Day-of readiness state machine

| State | Trigger | Adjustment |
|---|---|---|
| Train as planned | one-tap `moderate` or deep points 0-1 | No change |
| Light trim | one-tap `low` with no pain/illness, or deep points 2-3 | Remove optional work first; trim accessory volume 20-25%; hold main-lift load |
| Conservative simplify | deep points 4-5, or pain 4-5 without red flag | Reduce total sets 25-40%; remove supersets/high-fatigue accessories; lower target RPE by 0.5; keep main movement practice |
| Recovery-oriented session | deep points 6+, illness flag, or high symptom burden with poor recovery stack | Keep 1-2 main patterns, halve work, lower RPE 1.0, remove optional work, offer mobility/active recovery finish |
| Optional push | one-tap `high` or deep points 0 with high motivation and good sleep | No automatic change; surface optional push only |

### 4. Adjustment hierarchy

- `[EVIDENCE]` Reduce volume before complexity.
- `[EVIDENCE]` Reduce complexity before load.
- `[PRODUCT]` Load reductions are only automatic in conservative simplify or recovery-oriented states.
- `[PRODUCT]` Single poor signal does not produce a severe downgrade if performance and other context are normal.

### 5. Optional push logic

- `[PRODUCT]` Optional push appears only if:
  - no pain/illness safety signal,
  - current workout is not a deload or recovery variant,
  - last exposure to the primary movement met the top rep target with average RPE <= target + 0.5,
  - adaptation aggressiveness is not `conservative`.
- `[HEURISTIC]` Push options:
  - add one top set to the first primary lift, or
  - add 2.5% load to the first primary lift only.
- `[PRODUCT]` User must opt in per workout.

### 6. Double progression and load movement

- `[EVIDENCE]` Double progression is the default.
- `[HEURISTIC]` Load increase rule:
  - primary compound lifts: increase after two consecutive exposures at top rep range with acceptable RPE
  - accessory lifts: increase after one to two successful exposures depending on load jump size
- `[HEURISTIC]` Default increases:
  - upper-body compound: +2.5 lb to +5 lb
  - lower-body compound: +5 lb to +10 lb
  - accessory/isolation: smallest available jump or rep progression instead
- `[PRODUCT]` If the next load jump is too large, prefer rep progression or one additional set before load increase.

### 7. Plateau detection

- `[HEURISTIC]` Raise a plateau flag when all are true:
  - same primary exercise has 3 consecutive exposures with no rep or load progress,
  - average RPE is >= target + 0.5 or reps repeatedly miss the top range,
  - adherence over the same span is >= 80%,
  - session notes or user feedback do not indicate a deliberate technique/reset week.
- `[PRODUCT]` Plateau handling order:
  1. audit sleep, stress, soreness, pain, life load, missed sessions, rushed rests, and variation changes,
  2. recommend a small volume reduction or extra recovery,
  3. only then suggest exercise change or deload.

### 8. Deload recommendation logic

- `[EVIDENCE]` Reactive deloads are more defensible than arbitrary scheduled deloads.
- `[HEURISTIC]` Recommend a reactive deload when at least 2 of the following persist across a rolling 10-14 day window:
  - plateau flag on one or more primary lifts,
  - two low-readiness or conservative-simplify days in the same week,
  - repeated average RPE >= 9 on target lifts,
  - pain or symptom burden affecting execution more than once,
  - declining estimated strength trend,
  - unusually high life load plus missed session cluster.
- `[PRODUCT]` Scheduled deloads exist only as an Advanced opt-in preference.
- `[PRODUCT]` Deload recommendation actions: accept, postpone one week, modify volume target, dismiss.
- `[HEURISTIC]` Default reactive deload prescription: volume factor 0.6, load factor 0.9, preserve main lift practice.

### 9. Confidence levels

| Confidence | Use when |
|---|---|
| High | Recent readiness data, performance data, and preferences are all present and aligned |
| Medium | Some inputs are missing or stale, but recent performance exists |
| Low | Recommendation depends mostly on heuristics, sparse history, or inferred context |

### 10. Missing or conflicting data fallback

- `[PRODUCT]` No readiness data -> train as planned and show "no check-in on file".
- `[PRODUCT]` Incomplete readiness data -> use only the provided fields; never fabricate missing values.
- `[PRODUCT]` Conflicting subjective and performance data -> favor performance for long-term progression, subjective context for day-of volume/complexity changes.
- `[PRODUCT]` No symptom data -> no physiology-aware change.
- `[PRODUCT]` Missing evidence mapping -> no badge rather than fake certainty.

## G. Screen-by-screen implementation plan

### Primary product screens

| Screen | Purpose | Entry points | Required data | Primary actions | Key states and explanations | Accessibility / theme / acceptance |
|---|---|---|---|---|---|---|
| Landing (`/`) | Marketing-grade entry and auth handoff | App open, sign-out | Theme, auth state | Sign in, join | Loading auth; offline session check; legal links | High-contrast CTA, clear focus order, theme parity, no dead footer links |
| Onboarding (`/(qsetup)/quick-setup` -> future `/onboarding`) | Capture the minimum inputs to generate a useful first plan | New account, incomplete profile | Goal, days/week, experience, equipment, session length, depth mode, focus muscles, optional goal horizon | Continue, skip optional sections, enable optional physiology/integration later | Must support Essential fast path; error on missing required fields only; explanations on why questions are asked | One-handed bottom CTA, accessible segmented controls, progressive disclosure, theme-complete |
| Home | Command center for today | Main tab, workout completion, deload/adaptation events | Active program, next workout, latest readiness, adaptation summary, deload state | Start workout, check in, open Learn why, accept/defer recommendations | No program, no workout today, no check-in, low-confidence recommendation, week complete, offline/error | Today's action always above the fold; concise trust surfaces; accessible cards and labels |
| Next Workout | Execute workout with explicit adaptive coaching | Home CTA, Plan day tap | Active workout prescription, set history, readiness state, day-of adjustments, substitutions, warm-up | Start warm-up, log sets, swap exercise, accept/override push or recovery variant, finish workout | Loading prescription, empty workout, save partial failure, PR state, adaptation applied/ignored | Large tap targets, persistent progress, clear spoken labels for set fields, dark/light parity |
| Plan | Own current program and generation entry | Tab, onboarding completion | Active program summary, current week, program actions, archived access | Generate new program, edit day, open overview, open archived, end program | No active program, archived available, generation blocked, legacy program without context | Must clearly distinguish current program vs archived versions; no dev-only CTA in user path |
| Program Overview | Show full plan plus rationale | Plan, generation success | Program days, weekly targets, split recommendation, explanation metadata, evidence keys | Expand week/day, Learn why, override non-destructive settings, open evidence | No context snapshot, sparse legacy program, loading, invalid program | Users can understand why emphasis, order, and structure exist without leaving the screen |
| History | Explain change over time | Tab, profile shortcuts | Sessions, PRs, readiness trends, adaptation events, deloads, workload summaries | Open workout detail, open adaptation history, inspect trends, open PR history | Empty history, sparse legacy data, loading, fetch error | Plain-language interpretation, not just charts; accessible trend summaries |
| Profile | Settings hub | Tab | User defaults, adaptation preferences, evidence preferences, privacy, notifications, appearance | Edit preferences, change depth mode, open subpages, enable optional physiology support | Loading, schema compatibility, save success/error, hidden optional sections when disabled | Controls must map to real behavior; sensitive options clearly labeled |

### Secondary and support screens

| Screen | Purpose | Primary actions | Key states / acceptance |
|---|---|---|---|
| Manual Program Editor (`/create-program`) | Advanced/manual authoring only | Create fully custom program, save | Keep behind Advanced or explicit "build manually"; must not compete with the main generator |
| Archived Programs | Restore prior program versions | Restore, resume from snapshot, restart from week 1 | Show version context, goal, duration, last active week, replacement reason |
| FAQ | Reuse evidence registry for common questions | Expand answer, Learn why, open evidence | No static unsupported claims; answers must align with live logic |
| Recovery Library | Structured recovery modules | Open module, mark as useful, launch contextual suggestion | Content categories: warm-up, mobility, active recovery, symptom-tolerant movement, optional cooldown |
| Notifications | Notification preferences | Toggle reminders, quiet hours, send test | Device permission state explicit; no fake enabled state when OS denies permission |
| Privacy & Data | Privacy controls | Toggle analytics/crash preferences, request export, request deletion | Sensitive-data messaging honest and specific |
| Personal Information | Optional personal data | Edit name, phone, birthday | Must not block program use; validation clear |
| Help & Support | Support and reporting | Contact, report bug, request feature | Keep lightweight; no dead actions |
| Forgot Password | Password recovery | Send reset email | Must be fully implemented, not TODO-only |

### Modal and sheet acceptance

- Generate Program: recommendation first, override second, save last.
- Readiness check-in: one-tap first, deep drill-down optional.
- Why sheet: short answer first, evidence detail on expansion.
- Deload sheet: recommendation, reason, effect, options, and confidence.

## H. Component and service architecture

### Shared UI primitives

| Layer | Reusable pieces |
|---|---|
| Screen scaffolds | `AppScreen`, `BottomActionBar`, `SectionHeader`, `EmptyStateBlock`, `InlineErrorBanner` |
| Trust UI | `EvidenceBadge`, `WhyButton`, `RationaleCard`, `ConfidencePill`, `AdjustmentSummaryCard` |
| Metrics | `MetricTile`, `TrendTile`, `WeeklyVolumeChip`, `WorkoutStatePill` |
| Settings | `SettingsSection`, `SettingsRow`, `ToggleRow`, `OptionChipGroup`, `DepthModeCard` |
| Sheets / modals | `EvidenceWhySheet`, `ReadinessCheckinSheet`, `DeloadRecommendationSheet`, `SwapExerciseSheet` |

### Services and hooks

| Module | Responsibility |
|---|---|
| `hooks/useCurrentProgram.ts` | Keep as orchestration shell, but move generator/progression/readiness detail into services/selectors |
| `hooks/useReadinessState.ts` | Today's readiness fetch, persistence, derived state, and recommendation payload |
| `hooks/useProgramOverview.ts` | Program + context + weekly targets + rationale view model |
| `hooks/useHistoryInsights.ts` | History, analytics, adaptation trend selectors |
| `services/programGenerationService.ts` | Generator coordination, split recommendation, context snapshot packaging |
| `services/readinessService.ts` | Check-in normalization, severity scoring, adjustment recommendation |
| `services/progressionService.ts` | Double progression, plateau rules, load steps |
| `services/deloadService.ts` | Reactive deload detection and recommendation lifecycle |
| `services/evidenceService.ts` | Evidence lookup, surface filtering, UI-ready rationale blocks |
| `repositories/*` | Thin Supabase persistence wrappers for programs, readiness, history, settings, and trust content |

### Existing modules to preserve and reshape

- `utils/programGenerator.ts` -> keep as pure generation core
- `utils/saveProgramToDb.ts` -> keep as save coordinator
- `utils/profilePreferences.ts` -> keep as compatibility/parser layer
- `utils/progressionEngine.ts` -> refactor into progression service and lightweight math helpers
- `utils/cyclePhase.ts` -> keep only for fallback calendar context

## I. Evidence registry architecture

### Target structure

The current `constants/evidenceRegistry.ts` is a good base but is too thin for UI reuse. Expand each evidence entry to include:

- `key`
- `label`
- `summary_short`
- `summary_long`
- `strength`
- `source_type`
- `claim_scope`
- `surfaces`
- `source_links[]`
- `caveats[]`
- `product_rules[]`
- `user_copy.short`
- `user_copy.deep_dive`

### Reuse contract

| Surface | Consumes |
|---|---|
| Generator rationale | evidence keys + policy IDs + short summaries |
| Home / Next Workout | evidence keys + confidence note + practical effect copy |
| FAQ | grouped evidence entries + caveats |
| Recovery Library | evidence entries + "useful for comfort vs necessary" framing |
| Evidence screen | full entry + source links + caveats + rule mapping |

### Rule metadata contract

Each adaptive or planning rule should expose:

- `rule_id`
- `rule_type` (`evidence`, `best_practice`, `product_heuristic`)
- `display_label`
- `decision_summary`
- `evidence_keys[]`
- `confidence_strategy`
- `user_override_allowed`

## J. Build sequence

### `F5-S1` - Canonical contract, schema truth, RLS, and compatibility

- **Objective:** Close the gap between the new master plan and the actual deployed schema/app compatibility.
- **Files or systems likely affected:** `lib/adaptivpush_database_schema.md`, `types/database.ts`, `utils/profilePreferences.ts`, `dev-doc/main/*`, `reports/plans/*`
- **Detailed tasks:** validate live schema against documented schema; confirm Phase 2 tables/columns; prove or add RLS and ownership policies for migrations 008-014; run new/legacy onboarding, profile, and program-save smoke paths; audit the current exercise database seeding/image state; confirm whether `lib/exerciseDatabase.ts` is lagging the seeded `exercises` table; update active planning references; document any drift; retire contradictory assumptions.
- **Dependencies:** none
- **Risks:** schema drift, stale plan references
- **Validation:** manual Supabase schema/RLS review with two-user isolation proof, onboarding/profile/program-save smoke checks, `npm run lint`
- **Done criteria:** one authoritative plan, one authoritative schema reference, no conflicting active planning docs, verified user-row isolation, and recorded new/legacy compatibility results

### `F5-S2` - Shared UX, feature-gate, and state foundation

- **Objective:** Add reusable screen, trust, settings, and action primitives plus a lightweight feature-flag layer.
- **Files or systems likely affected:** `components/ui/*`, `constants/themes.ts`, `contexts/ThemeContext.tsx`, `constants/featureFlags.ts`, app shells
- **Detailed tasks:** create screen/layout primitives; introduce evidence/trust UI primitives; add deterministic in-repo feature flags; normalize empty/error/loading patterns.
- **Dependencies:** `F5-S1`
- **Risks:** UI churn without behavior changes
- **Validation:** `npm run lint`, manual theme parity pass on Home/Plan/Profile
- **Done criteria:** all later screens can reuse shared primitives instead of one-off styles

### `F5-S3` - Onboarding, profile, and preference completion

- **Objective:** Turn quick setup and profile into the real personalization/control layer.
- **Files or systems likely affected:** `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, settings subroutes, `types/database.ts`, `utils/profilePreferences.ts`
- **Detailed tasks:** replace demographic-first onboarding with goal/frequency/equipment/time/depth capture; add depth mode, verbosity, aggressiveness, analytics-depth controls; hide optional physiology/integration until enabled.
- **Dependencies:** `F5-S1`, `F5-S2`
- **Risks:** breaking current onboarding compatibility
- **Validation:** manual new-user flow, edit-profile flow, legacy-user fallback
- **Done criteria:** user controls materially alter prompts, explanations, and available settings

### `F5-S4` - Program generation and plan transparency

- **Objective:** Make the generator a transparent planning engine instead of a parameter picker.
- **Files or systems likely affected:** `components/GenerateProgramModal.tsx`, `utils/programGenerator.ts`, `utils/saveProgramToDb.ts`, `app/(tabs)/plan.tsx`, `app/program-overview.tsx`
- **Detailed tasks:** add split recommendation logic; compute weekly muscle-set targets; expose rationale and overrides; surface required vs optional work; replace baked-in deload default with declared policy plus optional schedule setting; add a canonical exercise-catalog regeneration/reseed path so generator and swap logic can use the full exercise dataset and complete image coverage.
- **Dependencies:** `F5-S1` through `F5-S3`
- **Risks:** generator complexity outgrowing current types
- **Validation:** generation matrix across goals, days/week, time budgets, depth modes, cycle support off/on
- **Done criteria:** a saved plan feels deliberate and explainable before the user ever trains

### `F5-S5` - Readiness v2 and day-of adaptive coaching

- **Objective:** Replace the hidden overlay model with explicit, conservative coaching.
- **Files or systems likely affected:** `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `readiness_checkins`, `adaptation_events`, readiness services/hooks
- **Detailed tasks:** build one-tap plus deep readiness; add severity/state machine; show adjustment summary and override controls; hide cycle inputs until enabled; record applied and ignored recommendations.
- **Dependencies:** `F5-S2` through `F5-S4`
- **Risks:** overly reactive or confusing coaching
- **Validation:** low/moderate/high readiness scenarios, pain/illness safety scenarios, no-check-in fallback, theme/accessibility review
- **Done criteria:** Home and Next Workout clearly show what changed today and why

### `F5-S6` - Workout execution, progression, plateaus, and deloads

- **Objective:** Close the loop between logging, progression, fatigue management, and plan change history.
- **Files or systems likely affected:** `hooks/useCurrentProgram.ts`, `utils/progressionEngine.ts`, progression/deload services, `workout_sessions`, `workout_exercise_sets`, `deload_recommendations`, `adaptation_events`
- **Detailed tasks:** implement double progression v2; add plateau flags; add reactive deload lifecycle; replace start-date week hack where possible with explicit progression/version behavior; connect completion flow to adaptation history.
- **Dependencies:** `F5-S4`, `F5-S5`
- **Risks:** progression bugs on legacy rows, confusion between plan version and week advancement
- **Validation:** targeted logic tests, manual multi-week progression scenarios, deload accept/defer/reject scenarios
- **Done criteria:** future programming changes are durable, explainable, and not hidden in ad hoc mutations

### `F5-S7` - History, analytics, and trust surfaces

- **Objective:** Make history interpretive and unify trust content with live behavior.
- **Files or systems likely affected:** `app/(tabs)/history.tsx`, `app/faq.tsx`, `app/recovery-library.tsx`, evidence route, analytics selectors
- **Detailed tasks:** add readiness trends, workload interpretation, adaptation history, deload history, focus-muscle progress, evidence-backed FAQ answers, purpose-driven recovery modules.
- **Dependencies:** `F5-S2`, `F5-S4`, `F5-S5`, `F5-S6`
- **Risks:** over-dense UX or fake precision
- **Validation:** sparse-data history, legacy data fallback, evidence route navigation, manual wording review for uncertainty language
- **Done criteria:** users can answer "what changed, why, and what should I do with that?" from inside the app

### `F5-S8` - Hardening, privacy, release, integrations, and cleanup

- **Objective:** Finish production states, privacy posture, rollout control, and remove dead/legacy paths from the default experience.
- **Files or systems likely affected:** all touched screens, feature flags, settings screens, `app/(auth)/forgot-password.tsx`, optional integration stubs
- **Detailed tasks:** complete forgot-password and callback handling; replace metadata-only support/export/deletion claims with real workflows or honest unavailable states; finalize privacy copy; tighten sensitive-data controls; make notification timing/quiet hours real; set production Expo and platform identity; gate optional integrations; position `create-program.tsx` as Advanced-only; remove dev-only affordances; align copy across all routes.
- **Dependencies:** all prior phases
- **Risks:** stale legacy copy, hidden unsupported paths, rollout regressions
- **Validation:** end-to-end manual sweep, theme sweep, accessibility sweep, privacy sweep
- **Done criteria:** no placeholder logic, no disconnected screens, no unsupported trust claims, no dead primary flows

## K. Testing and QA plan

### Unit tests

- Generator rule tests: split recommendation, weekly set targeting, exercise stability windows, session-length trimming
- Readiness tests: state scoring, safety override, volume/complexity/load hierarchy, optional push gating
- Progression tests: double progression, smallest jump fallback, plateau detection, deload trigger evaluation
- Evidence tests: evidence-key mapping, rule metadata coverage, missing-key fallback

### Integration tests

- Onboarding -> save defaults -> generate first program
- Profile preference changes -> Home / Plan / Next Workout behavior changes
- Readiness check-in -> Next Workout summary -> finish workout -> adaptation event created
- Program regeneration -> old program archived -> new context snapshot saved
- Deload recommendation -> accept / postpone / dismiss -> history reflects outcome

### End-to-end and manual flow tests

- New user in Essential mode
- Existing user upgrading to Guided
- Advanced user enabling cycle support
- No readiness data day
- Low readiness training day
- High readiness optional push day
- Reactive deload recommendation week
- Archived program restore
- Privacy export / deletion request initiation

### Edge cases

- Missing or partial profile rows
- Missing Phase 2 tables in a legacy environment
- Sparse history with zero PRs
- Long program durations with archived/restored weeks
- Symptom tracking enabled with irregular dates
- User disables cycle support after prior symptom history exists
- App offline during workout save

### Accessibility and theme checks

- VoiceOver / TalkBack labels on check-ins, sliders, chips, and set-entry controls
- Dynamic text and truncation on Home, Next Workout, Program Overview, and History
- Color contrast for badges, charts, and primary actions in dark and light themes
- One-handed reach for main actions on Home, Next Workout, onboarding, and settings

### Privacy checks

- Optional physiology data hidden until enabled
- Disable cycle support removes it from live UX immediately
- Sensitive fields do not appear in analytics when masking is enabled
- Trust copy matches actual storage behavior

## L. Final completion checklist

- [ ] Onboarding captures the right personalization inputs without forcing unnecessary sensitive data
- [ ] Essential, Guided, and Advanced materially change prompts, explanations, and analytics depth
- [ ] Program generation recommends a split, volume plan, and rationale and survives user overrides
- [ ] Program Overview clearly shows weekly targets, emphasis, order rationale, and evidence affordances
- [ ] Home clearly answers "what should I do today?"
- [ ] Next Workout clearly answers "what changed today, why, and what are my options?"
- [ ] Readiness uses conservative, multi-signal logic with one-tap and deep paths
- [ ] High readiness produces optional push suggestions only
- [ ] Progression uses double progression by default and handles plateaus and load jumps sanely
- [ ] Deloads are reactive by default, optional on schedule, and always explainable
- [ ] Adaptation history records what changed, why, and whether the user accepted or overrode it
- [ ] Cycle support is optional, hidden by default, symptom-first, and privacy-conscious
- [ ] Recovery Library and FAQ are driven by the same evidence registry as live coaching
- [ ] History and analytics explain trends and implications in plain language
- [ ] Dark, light, and system themes all feel intentional
- [ ] All user-owned and sensitive Supabase tables have verified ownership isolation and RLS evidence
- [ ] Password reset, support contact, data export, and account deletion use real end-to-end workflows or are honestly marked unavailable
- [ ] Notification timing and quiet hours match saved preferences; unsupported channels are not presented as active
- [ ] Expo, iOS, and Android production identities and build configuration are finalized
- [ ] Pure generator, feature-gate, readiness, progression, deload, evidence, and analytics rules have automated tests
- [ ] No placeholder HealthKit behavior is exposed as if it were real
- [ ] No static recommendation text masquerades as live logic
- [ ] No disconnected screens remain in the primary product path
- [ ] Manual editor, archived flows, and legacy compatibility paths are clearly positioned and safe
- [ ] Accessibility, empty states, error states, and privacy states are complete
- [ ] The app feels like one coherent adaptive training product rather than a collection of gym features
