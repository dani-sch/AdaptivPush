---
title: "AdaptivPush evidence-backed execution plan"
created: "2026-06-26"
status: source-reference
workflow: direct
superseded_by: "reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md"
execution_register: "dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md"
estimated_effort: XL
---

# AdaptivPush evidence-backed execution plan

> Source-reference notice: This document preserves the original evidence-backed schema design, rule rationale, and phase decomposition. It is not an active execution plan. Phase numbers in this file are legacy identifiers and must not be used for new work. Use the FABLE-5 master plan and `F5-S*` execution register.

## Executive summary

This document expands `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` into an execution-ready plan without re-deciding product strategy. It preserves the approved direction: a hybrid adaptive coach plus evidence-based planner plus transparent decision support, shipped through eight phases and packaged into visible milestones across Intelligence, Experience, and Trust.

[HISTORICAL BASELINE] The repository already had useful program generation, progression, cycle, readiness, active-program, and profile foundations when this plan was written. Since then, the reusable evidence/policy layer, Phase 2 schema/type scaffolding, generation-context writer, and `dev-doc/main/*` living-document spine have landed. HealthKit and feature flags remain unimplemented. Consult the code status document for current truth.

The first shippable milestone should not be architecture-only. It should ship:

1. a visible readiness upgrade,
2. a visible explanation surface (`Learn why` + evidence screen path),
3. and generation/context improvements that users can feel immediately.

## Historical source-of-truth contract

- Current canonical execution contract: `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`
- Current stable execution ledger: `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md`
- Historical approved strategy input: `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md`
- Research authority for evidence framing: `research/deep-research-report.md`
- Existing implementation/history context: `reports/plans/IMPLEMENTATION-PLAN.md`, `reports/plans/POSSIBLE-FEATURES.md`
- Current architecture and state: `dev-doc/main/ARCHITECTURE.md`, `dev-doc/main/CURRENT-STATE.md`, `dev-doc/main/TOC.md`
- Schema reference: `lib/adaptivpush_database_schema.md`

This document is retained as detailed source material and is superseded for execution by FABLE-5.

It intentionally preserves the implementation plan's product, scope, sequencing, and execution details while omitting raw evidence-link payloads and inline citation clutter from the master execution surface.

## Prerequisite reading and inspection checklist

### Approved strategy and research

- [x] `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` - approved strategy, product decisions, phase model, workstreams
- [x] `research/deep-research-report.md` - evidence hierarchy and research-backed constraints
- [x] `reports/plans/IMPLEMENTATION-PLAN.md` - prior implementation sequencing, current HealthKit placeholder history
- [x] `reports/plans/POSSIBLE-FEATURES.md` - prior proposed modules and trade-offs

### Repository architecture and runtime

- [x] `README.md` - minimal repo overview
- [x] `package.json` - available tooling, scripts, dependencies
- [x] `reports/ARCHITECTURE.md` - current Expo/Supabase architecture summary
- [x] `TABLE-OF-CONTENTS.md` - repository inventory substitute for missing `dev-doc/main/TOC.md`
- [x] `app.json` - current app/plugin configuration
- [x] `app/_layout.tsx` - root providers and registered screens

### Core execution seams

- [x] `utils/programGenerator.ts` - generation rules, split mapping, cycle modifier, experience modifier
- [x] `utils/progressionEngine.ts` - progression and readiness multipliers
- [x] `utils/cyclePhase.ts` - cycle phase calculation and phase modifier
- [x] `utils/saveProgramToDb.ts` - persistence for generated programs
- [x] `utils/profilePreferences.ts` - auth metadata preference parsing
- [x] `utils/supabase.ts` - Supabase client configuration
- [x] `utils/notifications.ts` - current deload/PR notification behavior
- [x] `hooks/useCurrentProgram.ts` - active program orchestration, progression updates, archiving behavior
- [x] `lib/exerciseDatabase.ts` - current local exercise catalog used by generator
- [x] `types/program.ts` - generated program contracts
- [x] `types/database.ts` - minimal profile typing
- [x] `types/progression.ts` - progression contracts

### UI surfaces that will be touched

- [x] `components/GenerateProgramModal.tsx`
- [x] `components/NextWorkoutCard.tsx`
- [x] `app/next-workout.tsx`
- [x] `app/(tabs)/home.tsx`
- [x] `app/(tabs)/plan.tsx`
- [x] `app/program-overview.tsx`
- [x] `app/(tabs)/history.tsx`
- [x] `app/workout-history.tsx`
- [x] `app/(tabs)/profile/index.tsx`
- [x] `app/(tabs)/profile/personal-information.tsx`
- [x] `app/(qsetup)/quick-setup.tsx`
- [x] `app/faq.tsx`
- [x] `app/recovery-library.tsx`
- [x] `app/archived-programs.tsx`

### Schema and migration reality

- [x] `lib/adaptivpush_database_schema.md`
- [x] `reports/migrations/001_workout_session_exercises.sql`
- [x] `reports/migrations/002_exercises_add_gif_url.sql`
- [x] `reports/migrations/003_programs_archive_state.sql`
- [x] `reports/migrations/004_exercises_rename_gif_to_image.sql`
- [x] `reports/migrations/005_exercises_add_exercisedb_id.sql`
- [x] `reports/migrations/006_user_profile_cycle_tracking.sql`

## Confirmed current-state architecture summary

| Area | Confirmed repository state | Planning implication |
|---|---|---|
| App shell | Expo Router app with root stack in `app/_layout.tsx`; Supabase-backed mobile client | New evidence and rollout surfaces should fit the current client-driven architecture rather than assume a separate backend service |
| Program generation | `utils/programGenerator.ts` is a pure local generator using hardcoded goal params, fixed split maps, `lib/exerciseDatabase.ts`, experience modifiers, and simple cycle-phase reductions | Phase 5 should refactor and extend this module, not replace it wholesale |
| Program persistence | `utils/saveProgramToDb.ts` writes `programs`, `program_days`, and `program_day_exercises`; it deactivates the current active program before insert | Program context snapshotting should extend save flow and stay compatible with existing rows |
| Active program orchestration | `hooks/useCurrentProgram.ts` loads active program, current week, day exercises, completion state, progression updates, and archiving | Adaptation events, deloads, and future-week logic should attach here |
| Readiness | `app/(tabs)/home.tsx` writes daily rows to `readiness_logs`; `app/next-workout.tsx` applies readiness as a display-time overlay; `useCurrentProgram` passes `readinessScore: null` into future progression updates | Phase 3 must formalize acute-vs-longitudinal adaptation rather than keep today-only overlay plus separate progression heuristics |
| Cycle support | `user_profile` already contains `cycle_enabled`, `last_period_start_date`, and `avg_cycle_length_days`; `home` and `next-workout` still rely on manual or inferred phase names; `utils/cyclePhase.ts` uses a simple scaled 28-day model | Phase 4 should preserve current fallback logic but add symptom-first optional support |
| Preferences | Small app preferences are split: profile columns in `user_profile`, richer toggles in `auth.user_metadata` via `utils/profilePreferences.ts` | New physiology-critical preferences should move into dedicated tables while keeping compatibility with current metadata-based toggles |
| Trust content | `app/faq.tsx` and `app/recovery-library.tsx` are static content surfaces without evidence keys, evidence levels, or source routing | Phase 7 must convert them into thin views over a shared evidence registry |
| Integrations | Apple Health appears only as UI toggles/copy in `quick-setup` and `profile`; there is no `utils/healthKit.ts`, no HealthKit dependency in `package.json`, and no HealthKit entitlements/plugins in `app.json` | Phase 8 should treat HealthKit as later enrichment only |
| Feature flags | No existing feature-flag or remote-config surface was found | Phase 8 must add lightweight deterministic gating first |
| Migration workflow | SQL migrations live under `reports/migrations/` and are written to run manually in the Supabase SQL editor | Additive migrations, compatibility windows, and rollback notes must be explicit in every phase |
| Verification | `package.json` exposes `npm run lint`; no existing test script is present | Validation should use `npm run lint` plus targeted manual regression slices until test automation matures |
| Planning docs | `dev-doc/main/*` now exists | Use FABLE-5, the execution register, the code status snapshot, and living docs as current authority |

## Confirmed gaps vs current code

1. [CONFIRMED] No central evidence registry, evidence-level taxonomy, or explanation payload contract exists today.
2. [CONFIRMED] Generation rules are still mostly hardcoded inside `utils/programGenerator.ts`.
3. [CONFIRMED] Readiness is still stored in `readiness_logs`, but the approved plan calls for richer `readiness_checkins`.
4. [CONFIRMED] Cycle support is calendar-phase-oriented today and has no symptom log table.
5. [CONFIRMED] The current profile/readiness settings claim local-only health storage while settings are also persisted to backend surfaces, so trust copy needs revision.
6. [CONFIRMED] There is no `program_generation_context`, `adaptation_events`, `deload_recommendations`, `user_adaptation_preferences`, or `evidence_display_preferences` persistence shape yet.
7. [CONFIRMED] `app/archived-programs.tsx` and `hooks/useCurrentProgram.ts` only snapshot `last_active_week`; the schema and migration set do not currently support archived day/date restoration.
8. [CONFIRMED] `types/database.ts` does not reflect the actual breadth of `user_profile` columns already listed in `lib/adaptivpush_database_schema.md`.
9. [CONFIRMED] No dedicated evidence screen route exists.
10. [CONFIRMED] No HealthKit implementation package or entitlement setup exists yet.

## Preserved implementation-plan detail

### Preserved direction summary

The approved implementation plan already resolved these choices and this execution plan preserves them:

- Positioning: hybrid adaptive coach + evidence-based planner + transparent decision support
- Tone: friendly evidence-informed, calm, quietly intelligent
- First-wave priority: balance generation, readiness/adaptation, and trust/transparency together
- Depth modes: Essential / Guided / Advanced
- Onboarding: minimal by default, optional deeper physiology later
- Readiness: moderate authority by default; one-tap plus optional deeper check-in; stronger controls only by opt-in/depth
- Cycle support: hidden unless enabled; hybrid model with symptom priority; privacy-forward
- Explanations: subtle `Learn why` affordances that open into a dedicated evidence surface
- HealthKit: foundation-ready now, later enrichment only
- Rollout: major physiology behavior behind feature flags aligned to depth mode
- Packaging: this file is the master execution plan and should remain compatible with separate milestone/workstream execution packets derived from it

### Preserved problem framing and scope

**Problem and approach**

- AdaptivPush already has meaningful adaptive-training primitives, but the current product only partially expresses the research-backed system it aims to become.
- The implementation wave should turn that research into one coherent product system spanning generation, day-of adaptation, recovery education, and transparent explanations.
- The work should be treated as a multi-phase product-architecture effort rather than a single feature drop.
- Execution should normalize evidence into stable product rules first, then harden the data model and engines, then layer behavior into generation, readiness, cycle/symptom personalization, workout execution, analytics, and education surfaces.

**In scope**

- Build an evidence-backed planning foundation for the full AdaptivPush experience.
- Expand physiology features into a coherent adaptive system across onboarding, profile, home, plan, next workout, progression, history, FAQ, and recovery-library surfaces.
- Add transparent explanation layers so research-backed decisions are visible in-app instead of hidden in code.
- Define the data model, engine boundaries, UI surfaces, rollout order, and verification strategy for implementation.

**Out of scope for the first implementation wave**

- Nutrition coaching beyond lightweight recovery/protein guidance
- Android health-platform integration parity if HealthKit ships first
- Coach marketplace, social features, or community programming
- Fully personalized ML recommendations; explicit rules and trend-based heuristics come first
- Replacing the full visual design system unless evidence display requires it

**Working assumptions preserved from the implementation plan**

- Research integration should remain autonomy-supportive and avoid overstating certainty.
- Existing readiness architecture starts from the current UI-overlay shape unless progression persistence is intentionally redesigned.
- Evidence-backed behavior should prefer conservative, reversible defaults.

### Preserved target experience

The end-state product should make a user feel:

- "My program matches my goal, time budget, equipment, and recovery reality."
- "The app explains why it suggested this workout structure."
- "If I'm under-recovered, it adapts intelligently instead of just telling me to push or quit."
- "If I track cycle symptoms, the app uses that respectfully and optionally."
- "Recovery, warm-up, deload, and progression guidance all feel like one coherent coaching system."

### Preserved planning decisions

- **Decision 1 - Primary product promise:** all three pillars equally from the start. Execution cannot be engine-first with education/UI deferred.
- **Decision 2 - Transparency is a product feature, not a documentation afterthought.** Home, Next Workout, Program Overview, FAQ, Recovery Library, and Profile must be treated as first-wave explanation surfaces.
- **Decision 3 - User depth should be configurable.** The app should not force every user into the same physiology-detail experience.

### Preserved detailed decision register

This section carries forward the implementation plan's resolved answers so later execution slices do not silently lose product detail.

#### A. Product positioning and core promise

- Position the product as a **hybrid** rather than a pure adaptive coach, evidence planner, or optimizer.
- Keep the public tone **friendly evidence-informed**.
- Balance **better decisions** and **better understanding of those decisions** equally.
- Balance **broad appeal** and **serious lifter credibility**.
- Aim for a product that is **more transparent than Fitbod or Boostcamp**, with a holistic, personalized, health-and-improvement focus that supports consistency.

#### B. User segmentation and depth modes

- Use **Essential / Guided / Advanced** depth modes.
- Set depth mode during onboarding and allow later changes, with small onboarding examples to explain the differences.
- Let depth mode influence **UI complexity, adaptation logic, and explanation density**.
- Shield beginners from RPE/RIR detail unless they opt in.
- Let advanced users opt into denser analytics and more assertive autoregulation.
- Allow separate tuning of **data depth**, **adaptation aggressiveness**, and **explanation verbosity**.

#### C. Onboarding and profile capture

- Keep mandatory onboarding focused on **primary goal, training days per week, experience level, equipment access, and session length/time budget**.
- Keep onboarding short and defer advanced physiology questions until after first workout or first program generation.
- Ask for somewhat richer equipment access detail than today.
- Ask about injury/pain history lightly and optionally.
- Ask about primary goal horizon, including physique, strength, general health, sport performance, and return from inconsistency.
- Ask about lifestyle constraints such as sleep schedule, job stress, or recovery time only optionally or later.
- Ask about prior familiarity with RPE, reps in reserve, and structured training mainly for Guided and Advanced contexts.

#### D. Program generation philosophy

- Keep generation **hybrid**: template-driven structure plus smarter decision rules.
- Balance split flexibility with user-directed control.
- Recommend a split and allow user override.
- Let focus muscles affect weekly volume and exercise order **moderately**.
- Expose weekly set targets by muscle group.
- Treat session length as a **soft target with override**, not a hard cap.
- Show exercise order, rest recommendations, and warm-up structure in generated programs by default.
- Keep exercise-stability windows automatic by default while allowing optional user control over variation cadence.
- Explain deload philosophy up front without scheduling deloads initially.

#### E. Readiness and daily adaptation

- Give readiness **moderate authority** over the planned workout by default.
- Let low readiness reduce **volume, complexity, and load** depending on severity.
- Do not auto-increase planned difficulty on high readiness; offer an optional **push** suggestion only.
- Support a one-tap simplified check-in plus a deeper optional check-in.
- Treat **sleep, stress, soreness, motivation, pain, illness, and workload/life load** as the first-wave readiness-v2 inputs.
- Let readiness shape both **today's session overlay** and **future progression**, with different rules.
- Allow users to ignore readiness adjustments without penalty or nudging.
- Allow the app to recommend converting a session into a recovery session.
- Show explanations when poor readiness drives an adjustment.

#### F. Menstrual-cycle and symptom support

- Keep cycle support completely hidden unless the user opts in.
- Use a **hybrid model with symptom priority** rather than a calendar-only model.
- Track cramps, fatigue, sleep disruption, mood, pain, motivation, and bloating.
- Show phase names lightly when relevant rather than making them dominant.
- Let cycle-aware guidance affect generation, day-of suggestions, recovery prompts, and analytics.
- Keep privacy reassurance clear but not overbearing.
- Store historical cycle patterns for later personalization.
- For irregular cycles or uncertain dates, use symptoms first and light calendar context only when available.

#### G. Progression, plateau, and deload logic

- Keep **double progression** as the universal default at first, with more advanced variants later.
- Reserve more explicit top-set/back-off or percentage-style options for later strength-focused depth.
- Let adherence and missed sessions affect progression **moderately**.
- Treat plateau signals as repeated missed top range, repeated high RPE, stagnant estimated strength, and explicit user frustration input.
- Support both **reactive** and **optionally scheduled** deloads.
- Proactively explain why a deload is recommended.
- Allow users to reject a suggested deload and continue normally.
- Prioritize volume reduction while preserving movement practice during deloads.

#### H. Warm-up, cooldown, mobility, and recovery content

- Support both auto-generated warm-up guidance and reusable templates.
- Frame cooldowns as optional comfort tools rather than recovery essentials.
- Tie mobility guidance to specific movement limitations instead of generic routines.
- Surface recovery content both in a library and contextually after certain sessions or readiness states.
- Explain why some popular recovery rituals are optional rather than required.
- Allow prehab/rehab-style modules more broadly, but de-emphasize them unless tied to a stated issue.

#### I. Transparency, explanations, and source-link handling

- Keep explanation entry points subtle, such as `Learn why`.
- Make every adaptive decision capable of showing a short rationale plus optional deep dive.
- Carry evidence labels such as **strong**, **moderate**, **mixed**, **emerging**, and **expert heuristic**.
- Distinguish between **research-backed**, **best-practice**, and **product heuristic** rules.
- Route deep dives through a dedicated evidence screen.
- Let users choose explanation verbosity by depth mode.
- Reuse the same evidence registry across live decisions, FAQ, and Recovery Library.

#### J. Analytics and insight surfaces

- Prioritize readiness trends, weekly volume, consistency streaks, plateau flags, and fatigue accumulation.
- Balance coaching interpretation with raw numbers.
- Surface "too much / too little / just right" workload guidance.
- Do **not** make planned-versus-completed comparison a primary analytics feature in this wave.
- Show when adjustments were driven by readiness, symptoms, or deload logic.
- Let users trace back why the program changed over the last four weeks.

#### K. Integrations and external signals

- Design the foundation for HealthKit now, but ship it later.
- Treat body mass, sleep, workouts, and cycle tracking as the first valuable HealthKit enrichments.
- Keep wearables secondary to subjective check-ins and training performance.
- Make integrations optional enhancements rather than central dependencies.
- Design core product parity for Android from the start even if integrations lag behind on Android.

#### L. UX and interaction style

- Keep the app calm and quietly intelligent rather than aggressively conversational.
- Use a hybrid explanation posture: some proactive explanation, some on-demand via `why?`.
- Prioritize today's action on the home screen.
- Let the program overview emphasize both prescription clarity and rationale.
- Progressively teach concepts like RPE over time.

#### M. Risk, privacy, and safety framing

- Be clear that the app does not replace medical advice.
- Include red-flag education in pain and symptom guidance.
- Avoid moralizing language around missed sessions, body composition, pain, or menstrual symptoms.
- Give sensitive physiology data dedicated privacy copy and controls.
- Let users disable physiology-aware adaptation entirely and still use the app as a clean logger/program builder.

#### N. Rollout and sequencing

- The first shippable milestone must include architecture plus visible UI wins immediately.
- The first visible milestone should balance generation, readiness, and research transparency rather than choosing one.
- Major physiology changes should roll out behind feature flags aligned to depth mode.
- The planning contract remains **one master plan plus separate execution plans per milestone/workstream** when additional execution packets are needed.

### Preserved user depth model

| Mode | Preserved characteristics | Best for |
|---|---|---|
| Essential | Fast onboarding, minimal readiness input, light explanations, simple generation, conservative adjustments, hidden advanced analytics | New lifters, casual users, low-friction adoption |
| Guided | Moderate onboarding detail, structured readiness, optional symptom prompts, more visible rationale, weekly insights, moderate explanation density | Most engaged users who want smarter coaching without overload |
| Advanced | Richer readiness and recovery input options, more detailed evidence displays, deeper analytics, more configurable adaptation settings, greater progression/deload transparency | Experienced lifters, coaches, high-agency users |

**Implementation implications of depth modes**

1. UI should progressively disclose complexity across onboarding, home, profile, FAQ, and analytics.
2. Core evidence rules stay consistent, but adaptation aggressiveness, prompt density, and explanation verbosity can vary by mode.
3. The data model must support richer inputs even if Essential users provide only a small subset.
4. Users should always be able to move up or down in depth without losing control.

### Preserved research-to-feature translation

| Research theme carried into execution | Product implication | Likely surfaces |
|---|---|---|
| Weekly volume matters strongly for hypertrophy | Show/generate weekly set targets and distribute them intelligently across split choices | Generate Program, Program Overview, History/Analytics |
| Frequency mostly distributes work rather than being magical | Explain split recommendations as logistics plus recoverability choices | Generate Program, FAQ, Program Overview |
| Progressive overload can be achieved via reps, sets, load, density, and quality | Broaden progression explanations beyond load-only thinking | Workout History, progression engine, FAQ |
| Primary lifts benefit from continuity | Add variation-cadence rules and explain why some lifts stay stable longer | Generator, swap flow, Program Overview |
| Low readiness should usually reduce volume first | Redesign readiness around a volume-first adaptation hierarchy | Home, Next Workout, progression logic |
| Subjective readiness is useful but imperfect | Treat readiness as context and trend rather than absolute truth | Home, analytics, readiness settings |
| Menstrual effects are mixed on average but symptoms matter individually | Make cycle support optional, symptom-first, and privacy-aware | Profile, readiness check-in, Next Workout, FAQ |
| Warm-ups have stronger support than cooldowns | Auto-generate warm-up support and frame cooldowns as optional comfort tools | Next Workout, Recovery Library, FAQ |
| Deloads are practical but not always necessary | Use reactive deload recommendations with clear rationale | Progression, notifications, analytics, FAQ |
| Preference and adherence matter | Offer depth modes and configurable explanation density | Onboarding, Profile, Home, FAQ |

### Preserved architecture additions from the implementation plan

**Core modules**

- `constants/evidenceRegistry.ts`
- `constants/programDefaults.ts`
- `constants/adaptationPolicies.ts`
- `utils/readinessEngine.ts`
- `utils/cycleAdaptation.ts`
- `utils/deloadEngine.ts`
- `utils/splitRecommendation.ts`
- `components/EvidenceWhySheet.tsx`
- `components/TodayAdjustmentSummary.tsx`
- `constants/recoveryProtocols.ts`

**Cross-cutting data entities**

- `user_adaptation_preferences`
- `readiness_checkins`
- `cycle_symptom_logs`
- `program_generation_context`
- `adaptation_events`
- `deload_recommendations`
- `evidence_display_preferences`

## Assumptions and explicit unknowns

### Assumptions used in this execution plan

- [ASSUMPTION] New physiology entities can be introduced with additive SQL migrations without breaking current mobile flows.
- [ASSUMPTION] The current Supabase schema is close enough to `lib/adaptivpush_database_schema.md` that planning can treat that file as the best available reference.
- [ASSUMPTION] Existing users can tolerate a dual-read/write compatibility window across at least one app release.
- [ASSUMPTION] The first feature-flag iteration should be local/app-deterministic, not dependent on an external remote-config service.

### REQUIRES INSPECTION

- [REQUIRES INSPECTION] Whether production Supabase already contains undocumented columns or policies beyond `lib/adaptivpush_database_schema.md`
- [REQUIRES INSPECTION] Whether SQL migrations in this project are allowed to read `auth.users.raw_user_meta_data` directly for backfill
- [REQUIRES INSPECTION] Which HealthKit library path is acceptable for Expo SDK 54 (`react-native-health` vs Expo-native alternative)
- [REQUIRES INSPECTION] Whether there is an existing server-side release/rollout control surface outside the repository
- [REQUIRES INSPECTION] Whether historical programs need partial `program_generation_context` backfill or can be labeled `legacy_context_unknown`

## Detailed schema migration strategy

### Migration principles

1. Add new structures first; do not remove or rename current live tables during the first wave.
2. Prefer normalized event tables for durable adaptation history and analytics.
3. Allow JSONB only where payloads are high-variance or versioned snapshots.
4. Keep current surfaces working through dual-read/write compatibility until rollout is complete.
5. Write each migration as a standalone SQL file under `reports/migrations/` with a paired rollback note in the same file header or companion document.

### Current baseline to preserve

- `user_profile` already holds stable identity/training fields plus cycle flags and HealthKit boolean.
- `readiness_logs` is the live source used by `home` and `next-workout`.
- `programs`, `program_days`, `program_day_exercises`, `workout_sessions`, and `workout_exercise_sets` are already live persistence surfaces.
- `auth.user_metadata` currently stores readiness, notification, and privacy preferences.

### 1. `user_profile` changes

Add stable top-level product-profile fields that are foundational and broadly consumed:

- `depth_mode text not null default 'guided' check (depth_mode in ('essential','guided','advanced'))`
- `session_length_preference_min integer null`
- `primary_goal_horizon text null`
- `equipment_profile jsonb null`
- `rpe_familiarity text null`
- `injury_considerations text null`

Why these belong here:

- They are user-level defaults that affect onboarding, generation defaults, and surface complexity.
- They are stable profile attributes, not per-day events.

Compatibility/backfill:

- Existing users: backfill `depth_mode = 'guided'`
- Existing `days_per_week`, `training_goal`, `experience_level`, `cycle_enabled`, `last_period_start_date`, `avg_cycle_length_days` remain unchanged
- If `GenerateProgramModal` already captures time budget independently, write that value back into `session_length_preference_min` on save

Rollback:

- Additive columns are safe to ignore if the client falls back to legacy defaults

### 2. `user_adaptation_preferences`

Create a dedicated table instead of continuing to overload `auth.user_metadata`.

Suggested shape:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `readiness_enabled boolean not null default true`
- `readiness_checkin_mode text not null default 'one_tap' check (readiness_checkin_mode in ('off','one_tap','guided','deep'))`
- `readiness_authority text not null default 'moderate' check (readiness_authority in ('low','moderate','strong'))`
- `adaptation_aggressiveness text not null default 'moderate' check (adaptation_aggressiveness in ('conservative','moderate','assertive'))`
- `cycle_support_enabled boolean not null default false`
- `symptom_tracking_enabled boolean not null default false`
- `wearables_enabled boolean not null default false`
- `wearables_priority text not null default 'secondary' check (wearables_priority in ('secondary','ignored'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Why a dedicated table:

- These preferences directly shape coaching behavior.
- They need auditability and clean joins with adaptation events.
- They are more durable than presentation-only auth metadata.

Compatibility/backfill:

- Phase 2 code should read legacy `auth.user_metadata.readiness_preferences` and write through to this table
- Keep legacy metadata writes until Phase 8 cutover completes

Rollback:

- Flag off the v2 readers and continue consuming auth metadata

### 3. `readiness_checkins`

Introduce `readiness_checkins` as the new v2 canonical surface instead of overextending `readiness_logs`.

Suggested shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `checkin_date date not null`
- `checkin_at timestamptz not null default now()`
- `checkin_mode text not null check (checkin_mode in ('one_tap','guided','deep','apple_health'))`
- `one_tap_state text null check (one_tap_state in ('low','moderate','high'))`
- `sleep_hours numeric(4,1) null`
- `sleep_quality integer null`
- `stress_level integer null`
- `soreness_level integer null`
- `motivation_level integer null`
- `pain_level integer null`
- `illness_flag boolean null`
- `life_load_level integer null`
- `derived_readiness_score numeric(4,1) null`
- `recommended_action text null`
- `source text not null default 'manual'`
- `raw_payload jsonb null`
- unique index on `(user_id, checkin_date)`

JSON vs normalized decision:

- Use explicit scalar columns for the currently approved inputs because the decision engine needs fast filtering and consistent analytics.
- Keep `raw_payload jsonb` for future enrichment (for example Apple Health source data or future workload descriptors).

Compatibility/backfill:

- Backfill from `readiness_logs` into `readiness_checkins`
- Preserve `readiness_logs` during rollout; Phase 3 should dual-write both tables
- Once all readers use `readiness_checkins`, either keep `readiness_logs` as a legacy mirror or replace it with a compatibility view in a later cleanup phase

Rollback:

- Turn off `readiness_v2`
- Keep reading `readiness_logs`
- Leave `readiness_checkins` in place but unused

### 4. `cycle_symptom_logs`

Create a separate privacy-forward symptom log rather than stuffing symptoms into readiness blobs.

Suggested shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `log_date date not null`
- `logged_at timestamptz not null default now()`
- `calendar_phase_context text null`
- `cramps_level integer null`
- `fatigue_level integer null`
- `sleep_disruption_level integer null`
- `mood_level integer null`
- `pain_level integer null`
- `motivation_level integer null`
- `bloating_level integer null`
- `period_started boolean null`
- `notes text null`
- `source text not null default 'manual'`
- unique index on `(user_id, log_date)`

Why this is separate:

- Cycle support is optional and hidden unless enabled.
- Symptoms are sensitive, user-controlled, and should remain detachable from general readiness usage.

Compatibility/backfill:

- No mandatory historical backfill
- If a user only has legacy phase selections in `readiness_logs.cycle_phase`, treat them as contextual hints only, not symptoms

Rollback:

- Disable cycle-symptom UI and stop writes
- Existing calendar fallback still works through `user_profile`

### 5. `program_generation_context`

Snapshot the decision context for every generated program.

Suggested shape:

- `id uuid primary key default gen_random_uuid()`
- `program_id uuid not null unique references programs(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `policy_version text not null`
- `evidence_version text not null`
- `depth_mode text not null`
- `experience_level text not null`
- `goal text not null`
- `days_per_week integer not null`
- `duration_weeks integer not null`
- `session_length_target_min integer null`
- `focus_muscle_groups jsonb not null`
- `split_recommendation jsonb not null`
- `volume_targets jsonb not null`
- `readiness_strategy text not null`
- `cycle_strategy text not null`
- `warmup_strategy text not null`
- `explanation_density text not null`
- `input_snapshot jsonb not null`
- `output_summary jsonb not null`

JSON vs normalized decision:

- Snapshotting is the point of this entity, so JSONB is appropriate for versioned inputs and outputs.
- Keep the most queryable fields duplicated as scalar columns for analytics and support.

Compatibility/backfill:

- New programs must always create this row in the same write transaction as `programs`
- Existing programs can be left as `legacy_context_unknown` unless the team explicitly wants partial reconstruction

Rollback:

- Safe additive table
- If writes fail, generated program save should fail loudly rather than silently creating a program with no context snapshot

### 6. `adaptation_events`

Create a normalized event trail for explainability, analytics, and rollback-safe behavior tracing.

Suggested shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `program_id uuid null references programs(id) on delete set null`
- `program_day_id uuid null references program_days(id) on delete set null`
- `workout_session_id uuid null references workout_sessions(id) on delete set null`
- `readiness_checkin_id uuid null references readiness_checkins(id) on delete set null`
- `cycle_symptom_log_id uuid null references cycle_symptom_logs(id) on delete set null`
- `deload_recommendation_id uuid null references deload_recommendations(id) on delete set null`
- `event_type text not null`
- `trigger_source text not null`
- `occurred_at timestamptz not null default now()`
- `accepted boolean null`
- `before_snapshot jsonb null`
- `after_snapshot jsonb null`
- `explanation_payload jsonb not null`
- `evidence_keys jsonb not null`

Why this is required:

- The approved product direction includes "why did my program change?" and transparency across readiness, symptoms, and deload logic.
- This is the durable trace for those answers.

Compatibility/backfill:

- No historical backfill required
- Start emitting events when Phase 3 and Phase 5 logic land

Rollback:

- If event writes are non-critical, queue them after the main mutation and surface errors in logs
- Do not allow missing event writes to corrupt core workout/program writes

### 7. `deload_recommendations`

Track reactive and optional scheduled deload decisions as first-class objects.

Suggested shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `program_id uuid not null references programs(id) on delete cascade`
- `week_number integer null`
- `status text not null check (status in ('recommended','accepted','dismissed','applied','expired'))`
- `trigger_type text not null`
- `reason_summary text not null`
- `recommended_volume_factor numeric(4,2) not null default 0.60`
- `recommended_load_factor numeric(4,2) not null default 0.90`
- `preserve_skill_practice boolean not null default true`
- `target_days jsonb null`
- `evidence_keys jsonb not null`
- `created_at timestamptz not null default now()`
- `resolved_at timestamptz null`

Compatibility/backfill:

- No legacy backfill needed
- `utils/notifications.ts` and day-of summaries should reference this entity rather than generic "deload week" assumptions

Rollback:

- Disable `reactive_deloads` flag
- Fall back to current scheduled-every-fourth-week behavior until Phase 6 fully replaces it

### 8. `evidence_display_preferences`

Create a dedicated table for explanation density and evidence-visibility controls.

Suggested shape:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `verbosity text not null default 'guided' check (verbosity in ('essential','guided','advanced'))`
- `show_evidence_badges boolean not null default true`
- `show_source_links boolean not null default true`
- `show_uncertainty_notes boolean not null default false`
- `auto_open_why_sheet boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Why not auth metadata:

- These preferences shape multiple product surfaces and need stable joins with depth mode and rollout logic.

Compatibility/backfill:

- Default from `user_profile.depth_mode`
- Keep FAQ/recovery surfaces readable even if this row does not exist yet

Rollback:

- Fall back to depth-mode defaults

### Migration ordering

Recommended file sequence:

1. `reports/migrations/007_user_profile_adaptive_defaults.sql`
2. `reports/migrations/008_user_adaptation_preferences.sql`
3. `reports/migrations/009_readiness_checkins.sql`
4. `reports/migrations/010_cycle_symptom_logs.sql`
5. `reports/migrations/011_program_generation_context.sql`
6. `reports/migrations/012_adaptation_events.sql`
7. `reports/migrations/013_deload_recommendations.sql`
8. `reports/migrations/014_evidence_display_preferences.sql`

Order rationale:

- Phase 2 schema must land before Phase 3/4 engines.
- `program_generation_context` must exist before generator-v2 rollout.
- Event/deload/evidence preference tables can follow once the new behaviors begin writing to them.

### Compatibility and backfill strategy

1. Add new tables and columns first.
2. Release code that dual-reads legacy and v2 sources.
3. Release code that dual-writes legacy and v2 sources where needed.
4. Backfill:
   - `readiness_logs` -> `readiness_checkins`
   - current profile defaults -> `user_profile.depth_mode` and `user_adaptation_preferences`
   - optionally current active program -> partial `program_generation_context`
5. Flip reader priority to v2 tables.
6. Defer legacy cleanup until the rollout has stabilized.

### Rollback concerns

- `readiness_logs` must remain intact until `readiness_checkins` is proven stable.
- `program_generation_context` should be considered required for new generator-v2 saves; if it cannot be written, the generation flow should fail rather than silently degrade.
- `adaptation_events` and `deload_recommendations` can be additive and initially best-effort if necessary, but should not be silently swallowed once Trust surfaces depend on them.
- Do not drop or rename legacy columns/tables during the first rollout wave.

## Dependency graph

### Phase dependency chain

1. Phase 1 -> Phase 2
2. Phase 2 -> Phase 3, Phase 4, Phase 5
3. Phase 3 + Phase 5 -> Phase 6
4. Phase 1 + Phase 3 + Phase 5 -> Phase 7
5. Phase 2 + Phase 3 + Phase 5 + Phase 6 + Phase 7 -> Phase 8

### Cross-cutting task graph

| Task | Depends on | Why |
|---|---|---|
| Evidence registry | - | Shared policy and explanation source |
| Physiology schema | Evidence registry | Data model should reflect the approved policy vocabulary |
| Readiness engine v2 | Evidence registry, physiology schema | Needs taxonomy plus persistence |
| Cycle personalization | Physiology schema | Needs opt-in storage and symptom logs |
| Generator v2 | Evidence registry, physiology schema | Needs policy extraction and context snapshotting |
| Progression + deload | Readiness engine v2, generator v2 | Needs both day-of and long-term logic clarified |
| Trust surfaces | Evidence registry, readiness engine v2, generator v2 | Needs explanation payloads and evidence keys |
| Rollout + integrations | All prior logic phases | Must gate real behavior, not placeholders |

## Phase-by-phase implementation plan

## Phase 1 - Evidence normalization and rule architecture

**Objective**

Create the canonical policy/evidence layer that every later engine and explanation surface will reuse.

**Why now / dependency rationale**

- Current rules are hardcoded in `utils/programGenerator.ts`.
- The approved plan requires evidence labels, source routing, and shared policy names before downstream features are implemented.

**Inspect before implementation**

- `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md`
- `research/deep-research-report.md`
- `utils/programGenerator.ts`
- `types/program.ts`
- `app/faq.tsx`
- `app/recovery-library.tsx`

**Create**

- `constants/evidenceRegistry.ts`
- `constants/programDefaults.ts`
- `constants/adaptationPolicies.ts`
- `types/evidence.ts`

**Modify**

- `utils/programGenerator.ts`
- `types/program.ts`

**Schema impact**

- None

**Feature flags**

- No user-facing flag required yet
- Internal compile-time guard only if registry wiring must land before UI uses it

**UI surfaces affected**

- No visible user-facing surface required in this phase
- Output contracts for future `Learn why` surfaces are defined here

**Engine/data implications**

- Introduce stable identifiers for evidence topics and rule keys
- Define explanation payload shape used by readiness, generation, and deload surfaces
- Extract hardcoded generation defaults into reusable policy modules

**Validation requirements**

- `npm run lint`
- Manual generation smoke check through `GenerateProgramModal`
- Confirm extracted defaults preserve current baseline outputs when flags are off

**Acceptance / exit criteria**

- Evidence registry exists and contains the approved evidence-strength vocabulary
- Generator can emit explanation metadata without changing live UX yet
- No downstream phase still needs to invent its own evidence-level labels

**Risk notes**

- Main risk is inventing a policy vocabulary that later phases cannot reuse cleanly; keep keys stable and generic

## Phase 2 - Data model and user-state expansion

**Objective**

Add the user-state and event schema needed for readiness-v2, optional cycle support, generation context snapshotting, deload tracking, and evidence display controls.

**Why now / dependency rationale**

- Phase 3 through Phase 7 all need durable storage beyond current `user_profile` and `readiness_logs`.
- Backfill and compatibility need to exist before new engines become live.

**Inspect before implementation**

- `lib/adaptivpush_database_schema.md`
- `types/database.ts`
- `utils/profilePreferences.ts`
- `utils/saveProgramToDb.ts`
- `app/(qsetup)/quick-setup.tsx`
- `app/(tabs)/profile/index.tsx`
- `reports/migrations/*.sql`

**Create**

- `reports/migrations/007_user_profile_adaptive_defaults.sql`
- `reports/migrations/008_user_adaptation_preferences.sql`
- `reports/migrations/009_readiness_checkins.sql`
- `reports/migrations/010_cycle_symptom_logs.sql`
- `reports/migrations/011_program_generation_context.sql`
- `reports/migrations/012_adaptation_events.sql`
- `reports/migrations/013_deload_recommendations.sql`
- `reports/migrations/014_evidence_display_preferences.sql`

**Modify**

- `lib/adaptivpush_database_schema.md`
- `types/database.ts`
- `utils/profilePreferences.ts`
- `utils/saveProgramToDb.ts`
- `app/(qsetup)/quick-setup.tsx`
- `app/(tabs)/profile/index.tsx`

**Schema impact**

- New columns on `user_profile`
- New tables: `user_adaptation_preferences`, `readiness_checkins`, `cycle_symptom_logs`, `program_generation_context`, `adaptation_events`, `deload_recommendations`, `evidence_display_preferences`

**Feature flags**

- `depth_mode_ui`
- `adaptation_preferences_v2`
- `program_context_snapshotting`

**UI surfaces affected**

- Onboarding/quick setup
- Profile settings
- Future generation flow defaults

**Engine/data implications**

- Move coaching-critical preferences out of auth metadata
- Add compatibility path from legacy metadata -> new tables
- Prepare save flow to persist generation-context snapshots alongside program saves

**Validation requirements**

- `npm run lint`
- Manual migration review in Supabase SQL editor before execution
- Manual create/update flow for onboarding + profile settings
- Manual read/write verification of dual-source preference logic

**Acceptance / exit criteria**

- Additive migrations are written and reviewed
- Existing app still works when new rows are absent
- Profile/onboarding can read and write new defaults without breaking legacy fields
- Generation save path can create or defer `program_generation_context` intentionally, not accidentally

**Risk notes**

- Highest risk is schema drift between docs and production; resolve with a schema audit before applying migration 007

## Phase 3 - Readiness and recovery engine v2

**Objective**

Replace single-score readiness handling with a conservative, multi-signal, trend-aware interpretation engine.

**Why now / dependency rationale**

- The approved plan prioritizes readiness in the first wave.
- Phase 2 provides the persistence needed to stop overloading `readiness_logs`.

**Inspect before implementation**

- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `hooks/useCurrentProgram.ts`
- `utils/progressionEngine.ts`
- `types/progression.ts`
- `app/(tabs)/profile/index.tsx`

**Create**

- `utils/readinessEngine.ts`

**Modify**

- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `hooks/useCurrentProgram.ts`
- `utils/progressionEngine.ts`
- `types/progression.ts`
- `app/(tabs)/profile/index.tsx`

**Schema impact**

- Read/write `readiness_checkins`
- Dual-write `readiness_logs` during compatibility window
- Emit `adaptation_events` for applied or declined recommendations

**Feature flags**

- `readiness_v2`
- `readiness_deep_checkin`
- `today_adjustment_summary`

**UI surfaces affected**

- Home readiness card/modal
- Next workout adjustment summary
- Profile readiness settings

**Engine/data implications**

- Separate acute "today overlay" logic from longitudinal progression logic
- Use volume-first reduction as default response to poor readiness
- High readiness should suggest an optional push, not automatically force harder training
- Allow user override with no penalty and record that override as an event

**Validation requirements**

- `npm run lint`
- Manual regression slices:
  - one-tap low readiness
  - one-tap high readiness
  - deep check-in with pain/illness/workload
  - user ignores recommendation
  - future progression still reflects performance, not just today overlay

**Acceptance / exit criteria**

- Home can capture one-tap and deeper readiness flows
- Next workout shows what changed today and why
- Future-week progression is no longer implicitly the same thing as day-of readiness
- Moderate authority is the default behavior

**Risk notes**

- Overly aggressive load changes would contradict approved product direction; bias to conservative volume reduction first

## Phase 4 - Menstrual-cycle and symptom personalization

**Objective**

Keep cycle-aware support optional and privacy-forward while shifting the logic from calendar-first to symptom-priority.

**Why now / dependency rationale**

- Cycle support depends on Phase 2 storage and should layer cleanly on top of readiness-v2.
- This is a visible trust-sensitive feature, so it should land after core adaptation plumbing exists.

**Inspect before implementation**

- `utils/cyclePhase.ts`
- `app/(tabs)/profile/index.tsx`
- `app/(qsetup)/quick-setup.tsx`
- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `app/faq.tsx`

**Create**

- `utils/cycleAdaptation.ts`

**Modify**

- `utils/cyclePhase.ts`
- `app/(tabs)/profile/index.tsx`
- `app/(qsetup)/quick-setup.tsx`
- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `app/faq.tsx`

**Schema impact**

- Read/write `cycle_symptom_logs`
- Read `user_adaptation_preferences.cycle_support_enabled`
- Continue using `user_profile.last_period_start_date` and `avg_cycle_length_days` as fallback context

**Feature flags**

- `cycle_support_v2`
- `cycle_symptom_prompts`
- `cycle_day_of_adjustments`

**UI surfaces affected**

- Quick setup (depth-aware optional introduction only)
- Profile cycle settings
- Home readiness flow
- Next workout summaries
- FAQ privacy/education copy

**Engine/data implications**

- Symptoms override simple calendar assumptions when present
- If dates are irregular or missing, use symptom-first handling and light calendar context only
- No cycle surface should appear unless the user opts in

**Validation requirements**

- `npm run lint`
- Manual regression slices:
  - cycle support disabled: no UI leaks
  - cycle support enabled with symptoms: recommendations change conservatively
  - irregular or missing dates: no crash, symptom-only fallback
  - privacy copy visible where settings are enabled

**Acceptance / exit criteria**

- Cycle support is truly optional and hidden by default
- Symptom-aware adjustments take precedence over blanket phase rules
- No deterministic or moralizing copy remains in cycle-related surfaces

**Risk notes**

- This phase has the highest trust/privacy sensitivity; copy review is part of completion, not a follow-up

## Phase 5 - Program generation v2

**Objective**

Turn the generator into a transparent planning engine that recommends splits, volume, session structure, and stable exercise windows while preserving override control.

**Why now / dependency rationale**

- Phase 1 defines the policy layer and Phase 2 provides context storage.
- Generation is one of the three first-wave pillars and must become visibly better early.

**Inspect before implementation**

- `utils/programGenerator.ts`
- `lib/exerciseDatabase.ts`
- `components/GenerateProgramModal.tsx`
- `types/program.ts`
- `utils/saveProgramToDb.ts`
- `app/(tabs)/plan.tsx`
- `app/program-overview.tsx`

**Create**

- `utils/splitRecommendation.ts`

**Modify**

- `utils/programGenerator.ts`
- `components/GenerateProgramModal.tsx`
- `types/program.ts`
- `utils/saveProgramToDb.ts`
- `app/(tabs)/plan.tsx`
- `app/program-overview.tsx`

**Schema impact**

- `program_generation_context` becomes required for new generator-v2 saves
- `adaptation_events` should record generation overrides and split recommendations

**Feature flags**

- `generator_v2`
- `weekly_set_targets`
- `warmup_prescriptions`
- `evidence_why_generation`

**UI surfaces affected**

- Generate Program modal
- Plan tab
- Program overview
- Future evidence screen entry points

**Engine/data implications**

- Recommend split family rather than only mapping from `daysPerWeek`
- Show weekly set targets by muscle group
- Respect session length as a soft target with override
- Preserve automatic deload policy visibility without scheduling deloads up front
- Keep primary lifts stable longer and rotate accessories more freely

**Validation requirements**

- `npm run lint`
- Manual generation matrix:
  - beginner / essential / general fitness / 3 days
  - intermediate / guided / hypertrophy / 4 days
  - advanced / advanced / strength / 5 days
  - cycle support on vs off
  - session length 30 vs 90+

**Acceptance / exit criteria**

- Generator produces recommendations plus rationale
- Users can override split choice
- Weekly set targets and warm-up structure are visible
- Saved programs carry a generation-context snapshot

**Risk notes**

- Generator-v2 should preserve current output shape compatibility for `saveProgramToDb` and active-program loading before adding richer metadata

## Phase 6 - Workout execution, progression, deload, and analytics

**Objective**

Align workout execution and long-term adaptation logic with the evidence-backed hierarchy: performance first, recovery-aware, and conservative by default.

**Why now / dependency rationale**

- Depends on generator-v2 and readiness-v2 so progression and deload logic can use better context.
- This phase closes the loop between planning, execution, and interpretation.

**Inspect before implementation**

- `utils/progressionEngine.ts`
- `hooks/useCurrentProgram.ts`
- `app/next-workout.tsx`
- `app/(tabs)/history.tsx`
- `app/workout-history.tsx`
- `utils/notifications.ts`

**Create**

- `utils/deloadEngine.ts`
- `REQUIRES INSPECTION: analytics helper module path under utils/`

**Modify**

- `utils/progressionEngine.ts`
- `hooks/useCurrentProgram.ts`
- `app/next-workout.tsx`
- `app/(tabs)/history.tsx`
- `app/workout-history.tsx`
- `utils/notifications.ts`

**Schema impact**

- Write `deload_recommendations`
- Write `adaptation_events`
- Read `readiness_checkins`, `cycle_symptom_logs`, and `program_generation_context`

**Feature flags**

- `reactive_deloads`
- `adaptation_analytics`
- `progression_v2`

**UI surfaces affected**

- Next workout
- History tab
- Workout history detail
- Notifications

**Engine/data implications**

- Keep double progression as the default base model
- Add plateau interpretation from missed top range, repeated high RPE, stagnant strength signals, and explicit frustration input when available
- Suggest reactive deloads with explanation and allow rejection
- Track why recommendations changed over time

**Validation requirements**

- `npm run lint`
- Manual regression slices:
  - complete workout -> session save -> next-week progression
  - mixed performance sets -> per-set hold/decrease behavior
  - low-readiness trend -> deload recommendation
  - user dismisses deload -> recommendation state tracked correctly
  - history/analytics surfaces still load when new event tables are empty

**Acceptance / exit criteria**

- Progression no longer relies on simplified one-shot readiness heuristics
- Deloads are tracked and explainable
- History surfaces can show why changes occurred, not just what was logged

**Risk notes**

- Regression risk is highest here because `hooks/useCurrentProgram.ts` is the central orchestration layer

## Phase 7 - Education, transparency, and trust surfaces

**Objective**

Expose evidence-backed reasoning gently and consistently across live coaching, FAQ, and recovery content.

**Why now / dependency rationale**

- Trust surfaces need actual evidence keys and engine outputs from earlier phases.
- This is one of the three equal first-wave pillars and must not be deferred to "later docs work."

**Inspect before implementation**

- `app/faq.tsx`
- `app/recovery-library.tsx`
- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `app/program-overview.tsx`
- `components/NextWorkoutCard.tsx`

**Create**

- `components/EvidenceWhySheet.tsx`
- `components/TodayAdjustmentSummary.tsx`
- `constants/recoveryProtocols.ts`
- `app/evidence.tsx` or `app/evidence/[key].tsx`

**Modify**

- `app/faq.tsx`
- `app/recovery-library.tsx`
- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `app/program-overview.tsx`
- `components/NextWorkoutCard.tsx`

**Schema impact**

- Read/write `evidence_display_preferences`
- Read `adaptation_events` and evidence keys from previous phases

**Feature flags**

- `evidence_why_sheet`
- `evidence_screen`
- `recovery_protocols_v2`

**UI surfaces affected**

- Home
- Next workout
- Program overview
- FAQ
- Recovery Library
- Dedicated evidence route

**Engine/data implications**

- Every surfaced recommendation should carry `reason`, `evidenceLevel`, and source keys
- Live surfaces stay concise; deep details route into the dedicated evidence screen
- Recovery content should distinguish strong, mixed, and optional practices

**Validation requirements**

- `npm run lint`
- Manual regression slices:
  - `Learn why` entry from Home
  - `Learn why` entry from Next Workout
  - evidence screen deep link routing
  - FAQ and Recovery Library evidence rendering
  - verbosity changes by depth mode

**Acceptance / exit criteria**

- At least one live action surface, one planning surface, and one education surface all reuse the same evidence registry
- Source-link visibility stays subtle
- Evidence deep dives open through the dedicated evidence screen, not generic external links first

**Risk notes**

- Overexposure of evidence details would conflict with the calm UX; keep default surfaces compact

## Phase 8 - Integrations, rollout, and quality gates

**Objective**

Roll out the new physiology system safely, keep Android parity in core workflows, and treat integrations as optional enrichments.

**Why now / dependency rationale**

- Flags and rollout control are only meaningful once the behaviors exist.
- HealthKit should not drive first-wave architecture decisions.

**Inspect before implementation**

- `app.json`
- `app/_layout.tsx`
- `app/(qsetup)/quick-setup.tsx`
- `app/(tabs)/profile/index.tsx`
- `utils/notifications.ts`
- `package.json`

**Create**

- `constants/featureFlags.ts`
- `utils/featureGate.ts`
- `utils/healthKit.ts`

**Modify**

- `app.json`
- `app/_layout.tsx`
- `app/(qsetup)/quick-setup.tsx`
- `app/(tabs)/profile/index.tsx`
- `package.json`

**Schema impact**

- No new required tables beyond Phase 2
- Optional later integration-specific audit table only if product needs permission/event logging [REQUIRES INSPECTION]

**Feature flags**

- `generator_v2`
- `readiness_v2`
- `cycle_support_v2`
- `reactive_deloads`
- `evidence_why_sheet`
- `healthkit_read_enrichment`

**UI surfaces affected**

- Onboarding
- Profile settings
- Evidence/trust messaging during rollout

**Engine/data implications**

- Introduce deterministic flag gating by depth mode and explicit opt-in
- HealthKit remains secondary to self-report and performance
- Android must retain the same core coaching experience through manual input even if iOS gains integration extras later

**Validation requirements**

- `npm run lint`
- Manual release checklist across flag permutations
- iOS-specific entitlement and permission verification only when HealthKit implementation actually lands

**Acceptance / exit criteria**

- New behaviors can be enabled/disabled without schema rollback
- Advanced users can receive deeper behavior first without changing Essential default flows
- HealthKit remains an optional enhancer, not a first-wave blocker

**Risk notes**

- The biggest rollout risk is enabling behavior changes before compatibility paths and trust surfaces are ready

## Milestone and workstream packaging

### Milestone 1 - Visible adaptive foundation

This is the first shippable milestone and must be user-visible.

| Workstream | Deliverables |
|---|---|
| Intelligence | Phase 1 complete, Phase 2 core schema (`user_profile`, `user_adaptation_preferences`, `readiness_checkins`, `program_generation_context`), Phase 3 readiness engine skeleton |
| Experience | Depth mode surfaced in onboarding/profile, one-tap readiness check-in upgraded, visible Today Adjustment Summary shell, Generate Program flow stores context |
| Trust | `Learn why` affordance on Home and/or Next Workout, evidence registry live, dedicated evidence screen skeleton routed |

User-visible ship:

- Better readiness framing than a raw score
- Visible reason for today's adjustment
- Visible evidence entry point

### Milestone 2 - Optional physiology personalization

| Workstream | Deliverables |
|---|---|
| Intelligence | Phase 4 cycle/symptom logic, Phase 5 split recommendation and weekly volume targets |
| Experience | Optional cycle settings, split recommendation + override in generation flow, session-length-aware plan detail |
| Trust | Privacy-forward cycle copy, FAQ updates for cycle/readiness nuance, evidence labels on generated-plan rationale |

User-visible ship:

- Optional, hidden-until-enabled cycle support
- More transparent generation decisions

### Milestone 3 - Adaptive workload and deload intelligence

| Workstream | Deliverables |
|---|---|
| Intelligence | Phase 5 stability windows, Phase 6 progression-v2 and reactive deload engine, adaptation events |
| Experience | Deload recommendations in workflow, history/analytics trend views, next-workout rationale expanded |
| Trust | "Why did my plan change?" trail, evidence-aware recovery library, deload rationale copy |

User-visible ship:

- Better progression behavior
- Explainable deload suggestions
- Adaptation analytics

### Milestone 4 - Rollout hardening and integration enrichment

| Workstream | Deliverables |
|---|---|
| Intelligence | Feature gates, optional HealthKit adapter, compatibility cleanup plan |
| Experience | Controlled rollout by depth mode, iOS integration toggles, Android manual parity preserved |
| Trust | Rollout-safe defaults, final regression checklist, rollback playbook |

User-visible ship:

- Stable rollout, not just more features

## Feature-flag rollout strategy

### Confirmed starting point

[CONFIRMED] No feature-flag system exists today, so the first version should be implemented in-repo.

### Recommended flag surfaces

- `constants/featureFlags.ts` - static defaults by build
- `utils/featureGate.ts` - resolves final behavior from build flags + `user_profile.depth_mode` + `user_adaptation_preferences`

### Required flags

| Flag | Default | Initial audience | Purpose |
|---|---|---|---|
| `generator_v2` | off | internal + Advanced | Split recommendation, weekly targets, explanation metadata |
| `readiness_v2` | off | internal + Advanced | Multi-signal readiness interpretation |
| `cycle_support_v2` | off | opt-in only | Symptom-priority cycle support |
| `reactive_deloads` | off | internal + Advanced | Deload recommendations and tracking |
| `evidence_why_sheet` | off | Guided + Advanced internal | Subtle rationale surfacing |
| `evidence_screen` | off | Guided + Advanced internal | Dedicated evidence route |
| `healthkit_read_enrichment` | off | iOS internal | Later enrichment only |

### Rollout order

1. Internal/dev only with flags off by default
2. Enable registry-backed trust surfaces first (`evidence_why_sheet`, `evidence_screen`)
3. Enable `readiness_v2` for Advanced users only
4. Enable `generator_v2` for Advanced, then Guided
5. Enable `cycle_support_v2` only for users who explicitly opt in
6. Enable `reactive_deloads` after readiness-v2 and generator-v2 stabilize
7. Keep Essential users on the most conservative, lowest-friction path until all major regressions are resolved

## File impact matrix

| Area | Create | Modify | Review-only |
|---|---|---|---|
| Evidence foundation | `constants/evidenceRegistry.ts`, `constants/programDefaults.ts`, `constants/adaptationPolicies.ts`, `types/evidence.ts` | `utils/programGenerator.ts`, `types/program.ts` | `research/deep-research-report.md`, `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` |
| Schema and preferences | `reports/migrations/007-014*.sql` | `types/database.ts`, `lib/adaptivpush_database_schema.md`, `utils/profilePreferences.ts`, `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, `utils/saveProgramToDb.ts` | `reports/migrations/001-006*.sql` |
| Readiness v2 | `utils/readinessEngine.ts` | `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `hooks/useCurrentProgram.ts`, `utils/progressionEngine.ts`, `types/progression.ts` | `components/NextWorkoutCard.tsx` |
| Cycle support | `utils/cycleAdaptation.ts` | `utils/cyclePhase.ts`, `app/(tabs)/profile/index.tsx`, `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `app/faq.tsx` | `research/deep-research-report.md` |
| Generator v2 | `utils/splitRecommendation.ts` | `utils/programGenerator.ts`, `components/GenerateProgramModal.tsx`, `types/program.ts`, `utils/saveProgramToDb.ts`, `app/(tabs)/plan.tsx`, `app/program-overview.tsx` | `lib/exerciseDatabase.ts` |
| Progression/deload/analytics | `utils/deloadEngine.ts` | `utils/progressionEngine.ts`, `hooks/useCurrentProgram.ts`, `app/next-workout.tsx`, `app/(tabs)/history.tsx`, `app/workout-history.tsx`, `utils/notifications.ts` | `app/archived-programs.tsx` |
| Trust surfaces | `components/EvidenceWhySheet.tsx`, `components/TodayAdjustmentSummary.tsx`, `constants/recoveryProtocols.ts`, `app/evidence.tsx` or `app/evidence/[key].tsx` | `app/faq.tsx`, `app/recovery-library.tsx`, `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `app/program-overview.tsx`, `components/NextWorkoutCard.tsx` | `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` |
| Rollout/integrations | `constants/featureFlags.ts`, `utils/featureGate.ts`, `utils/healthKit.ts` | `app.json`, `app/_layout.tsx`, `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, `package.json` | `reports/plans/IMPLEMENTATION-PLAN.md` |

## Verification and regression plan

### Current available local gate

- `npm run lint`

### Required manual regression slices

1. **Onboarding/profile defaults**
   - new user completes quick setup
   - existing user edits profile without new tables populated
   - depth mode changes without losing existing settings
2. **Program generation**
   - generate 3 representative programs across goals and depth modes
   - override split recommendation
   - confirm generation context is stored
3. **Readiness**
   - one-tap low/moderate/high
   - deep check-in with pain or illness
   - user dismisses recommendation
4. **Cycle support**
   - support off: no UI leakage
   - support on with symptoms
   - irregular dates fallback
5. **Workout execution**
   - complete workout
   - save sets
   - compute progression for next week
6. **Deload path**
   - trigger recommendation
   - accept recommendation
   - dismiss recommendation
7. **Trust surfaces**
   - `Learn why` opens
   - evidence screen routes
   - FAQ/recovery surfaces render evidence states
8. **Compatibility**
   - new tables empty but old app data present
   - flags off path still behaves like current app

### Phase-specific minimum local gates

| Phase | Minimum gate |
|---|---|
| 1 | `npm run lint` + program generation smoke check |
| 2 | `npm run lint` + migration review + settings save/read walkthrough |
| 3 | `npm run lint` + readiness modal + next-workout overlay walkthrough |
| 4 | `npm run lint` + cycle opt-in/off manual walk |
| 5 | `npm run lint` + generation matrix walkthrough |
| 6 | `npm run lint` + full workout save/progression/deload walkthrough |
| 7 | `npm run lint` + evidence routing/content walkthrough |
| 8 | `npm run lint` + rollout flag matrix walkthrough |

## Rollback and recovery notes

1. Keep all Phase 2 migrations additive.
2. Do not delete `readiness_logs` during the first rollout window.
3. Use feature flags as the first rollback lever; schema rollback should be the last resort.
4. If `generator_v2` misbehaves, disable the flag and preserve legacy generator output while leaving `program_generation_context` unused for new saves.
5. If `readiness_v2` misbehaves, disable the flag and continue writing legacy `readiness_logs` while leaving `readiness_checkins` inert.
6. If cycle support causes trust issues, disable `cycle_support_v2` without removing stored symptom logs.
7. If evidence routing breaks UX, hide `Learn why` affordances but keep the registry intact.
8. HealthKit should remain physically separable from core coaching logic so its rollback never affects Android/manual flows.

## Risks, dependencies, and open inspection items

### Major risks

| Risk | Impact | Mitigation |
|---|---|---|
| Schema drift between docs and live Supabase | High | Audit production schema before migration 007 |
| Over-aggressive readiness or deload behavior | High | Default to conservative volume-first changes and keep flags off by default |
| Privacy/trust failure around cycle data | High | Hidden-by-default opt-in, dedicated storage, copy review, and visible controls |
| Generator refactor breaks current save/load flow | High | Preserve output compatibility and gate v2 |
| Trust surfaces become verbose/noisy | Medium | Keep default `Learn why` subtle and depth-aware |
| HealthKit scope creep delays first wave | Medium | Keep HealthKit out of Milestones 1-3 critical path |

### Open inspection items

- [REQUIRES INSPECTION] Confirm whether backfill from `auth.user_metadata` should happen in SQL or app code
- [REQUIRES INSPECTION] Confirm real RLS posture for new tables before writing migration SQL
- [REQUIRES INSPECTION] Confirm whether `app/evidence.tsx` or a dynamic segment route is the better fit for the evidence screen
- [REQUIRES INSPECTION] Confirm whether `workout_sessions.checkin_id` should be repurposed to point at `readiness_checkins` or left unused
- [REQUIRES INSPECTION] Confirm whether future archive resume requirements need day/date snapshotting beyond current `last_active_week`

## Historical execution order

1. Land Phase 1 policy/evidence foundation.
2. Land Phase 2 additive schema and compatibility code.
3. Ship Milestone 1 across all three workstreams.
4. Ship Phase 4 + Phase 5 core as Milestone 2.
5. Ship Phase 6 + Phase 7 deepening as Milestone 3.
6. Land Phase 8 rollout controls and optional integrations.

## Next-stage execution owner

Historical recommendation: direct bounded TypeScript/Expo/Supabase implementation slices. Current work must use the stable `F5-S*` identifiers and gates in the execution register.
