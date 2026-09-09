# FABLE-5 execution register

## Execution contract

This is the ordered work ledger for `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`. It exists to prevent phase-name drift and to make each implementation slice independently verifiable.

Authority order for this product lane:

1. `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md` - complete product and technical contract
2. this register - stable stage IDs, status, prerequisites, file impact, and gates
3. `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md` - code-backed current-state evidence
4. `dev-doc/main/TODO.md` - immediate task board
5. evidence-backed execution/UI/implementation plans - source references only

No source-reference document may restart a completed legacy phase or override this sequence.

## Stable identifiers and legacy mapping

The word `Phase` was reused with different meanings in older plans. All new work must use the `F5-S*` IDs below.

| Stable ID | Canonical stage | Old evidence-plan relationship | Status |
|---|---|---|---|
| `F5-S0` | Evidence/policy foundation already landed | Old Phase 1 | `[COMPLETE]` |
| `F5-S1` | Schema truth, RLS, and compatibility closeout | Old Phase 2 closeout plus master Phase 1 | `[ACTIVE]` |
| `F5-S2` | Feature gates and shared UX/state foundation | Master Phase 2 | `[PENDING]` |
| `F5-S3` | Onboarding, profile, and preference completion | Master Phase 3 | `[PENDING]` |
| `F5-S4` | Generator-v2 and plan transparency | Old Phase 5; master Phase 4 | `[PENDING]` |
| `F5-S5` | Readiness-v2 and day-of coaching | Old Phase 3/4; master Phase 5 | `[PENDING]` |
| `F5-S6` | Workout durability, progression, plateau, and deload | Old Phase 6; master Phase 6 | `[PENDING]` |
| `F5-S7` | History, analytics, evidence, and education | Old Phase 7; master Phase 7 | `[PENDING]` |
| `F5-S8` | Production hardening, privacy, release, and optional integration | Old Phase 8; master Phase 8 | `[PENDING]` |

## Global entry gates

The following must be true before a stage can expose behavior to ordinary users:

- work occurs on a feature branch and uses the repository's actual remote default baseline;
- the documented `integrator` clone/actor is available, or the change records the approved direct-integration fallback; the audited worktree list contains only the current checkout;
- `npm run lint` passes with no new errors;
- required schema and RLS policies are verified in the target Supabase environment;
- flags default off for rollout-sensitive behavior;
- compatibility behavior is exercised with both legacy/missing rows and new rows;
- the owning living documents are updated at slice closeout;
- no UI copy claims an integration, storage property, or request workflow that the code does not provide.

## `F5-S0` - Evidence and policy foundation

Status: `[COMPLETE]`

Delivered:

- `types/evidence.ts`
- `constants/evidenceRegistry.ts`
- `constants/adaptationPolicies.ts`
- `constants/programDefaults.ts`
- generator explanation metadata in `utils/programGenerator.ts`
- recorded lint, deterministic-output comparison, and in-app generation smoke in `dev-doc/reports/DEV-LOG.md`

Residual work belongs to later stages: the registry is not yet consumed by live UI.

## `F5-S1` - Schema truth, RLS, and compatibility closeout

Status: `[ACTIVE]`

Objective: prove that the deployed database safely supports the code already merged and close all planning-governance drift.

Required slices:

### `F5-S1.1` Live schema and migration ledger

- compare migrations 001–014 with live Supabase tables, columns, constraints, indexes, and applied migration history;
- verify `program_generation_context` insert behavior;
- verify whether `workout_sessions.checkin_id` exists and document its current meaning;
- update `lib/adaptivpush_database_schema.md` only from verified database facts.

Gate: signed/manual schema comparison record with differences enumerated.

### `F5-S1.2` Ownership and RLS safety

- inspect live RLS state for every user-owned table;
- add an additive migration enabling RLS and defining select/insert/update/delete ownership policies for Phase 2 tables where absent;
- pay special attention to `cycle_symptom_logs`, `readiness_checkins`, `adaptation_events`, and `program_generation_context`;
- verify anon/authenticated behavior using two distinct test users.

Planned file: `reports/migrations/015_phase2_rls_policies.sql` unless live migration numbering requires a different next number.

Gate: one user cannot read or mutate another user's rows.

### `F5-S1.3` Compatibility smoke matrix

- new user: Quick Setup writes `user_profile`, `user_adaptation_preferences`, and `evidence_display_preferences`;
- legacy user: missing Phase 2 relation/column fallbacks remain usable;
- profile: readiness and cycle settings dual-read and dual-write as intended;
- program generation: context row is created and failed context creation does not leave an active orphan program;
- flags do not exist yet, so no v2 behavior may be exposed during this stage.

Gate: results recorded in `dev-doc/reports/DEV-LOG.md`.

Current evidence, 2026-08-03: authenticated live tests passed for the three Quick Setup persistence surfaces, missing-row preference resolution, readiness/cycle dual-writes, actual generator context creation, and injected context-write failure cleanup. The failure test found and verified a fix that restores the previously active program. The gate remains open for the actual mobile UI paths and a runtime missing-relation/column fallback scenario; no Expo-capable simulator or physical device was available, and the Expo web fallback failed during AsyncStorage server rendering.

### `F5-S1.4` Repository authority repair

- mark evidence-backed execution and UI plans as source references;
- remove their false statements that `dev-doc/main/*` is absent;
- use the stable F5 IDs in all active planning surfaces;
- reconcile `AGENTS.md` baseline language with the actual remote default branch;
- correct `.github/instructions/typescript.instructions.md` so it describes Expo/React Native rather than an unrelated Next.js stack;
- record that `.chaos/` and two referenced active workflow documents are currently absent rather than pretending they were read.

Gate: repository search finds no active document that treats the old plans as execution authority.

## `F5-S2` - Feature gates and shared UX/state foundation

Status: `[PENDING]`

Dependencies: `F5-S1`

Primary files to create:

- `constants/featureFlags.ts`
- `utils/featureGate.ts`
- `constants/uiTokens.ts`
- `components/ui/AppScreen.tsx`
- `components/ui/SurfaceCard.tsx`
- `components/ui/SectionHeader.tsx`
- `components/ui/MetricTile.tsx`
- `components/ui/BottomActionBar.tsx`

Required flag keys:

- `depth_mode_ui`
- `generator_v2`
- `readiness_v2`
- `cycle_support_v2`
- `reactive_deloads`
- `adaptation_analytics`
- `evidence_why_sheet`
- `evidence_screen`
- `healthkit_read_enrichment`

Rules:

- defaults are off except non-behavioral shared UI infrastructure;
- cycle support requires explicit opt-in in addition to a build flag;
- Essential mode is the lowest-friction, most conservative fallback;
- feature resolution is deterministic and unit tested;
- schema rollback is never the first behavioral rollback lever.

Gates:

- flag resolution tests;
- Home, Plan, and Profile render correctly with flags off;
- dark/light/system plus all retained palettes remain functional;
- shared components cover loading, empty, error, disabled, and pressed states.

## `F5-S3` - Onboarding, profile, and preference completion

Status: `[PENDING]`

Dependencies: `F5-S2`

Primary files to modify:

- `app/(qsetup)/quick-setup.tsx`
- `components/GenerateProgramModal.tsx`
- `app/(tabs)/profile/index.tsx`
- `app/(tabs)/profile/personal-information.tsx`
- `utils/profilePreferences.ts`
- `types/database.ts`

Target capture:

- primary goal and goal horizon;
- days per week and session time budget;
- equipment availability/profile;
- focus muscles;
- training experience and RPE familiarity;
- injury considerations with non-medical safety framing;
- depth mode;
- readiness authority and adaptation aggressiveness;
- explanation/evidence verbosity;
- optional cycle support, hidden until enabled;
- wearable preference shown only when a real adapter or clearly disabled preview exists.

Gates:

- Essential, Guided, and Advanced produce materially different disclosure depth;
- sensitive fields are optional unless legally/product-essential;
- old profiles load without failure;
- copy accurately describes backend storage;
- onboarding can resume after interruption without duplicate active programs.

## `F5-S4` - Generator-v2 and plan transparency

Status: `[PENDING]`

Dependencies: `F5-S2`, `F5-S3`

Primary files to create:

- `utils/splitRecommendation.ts`
- `utils/volumeTargets.ts`
- optional deterministic exercise-catalog generation script

Primary files to modify:

- `utils/programGenerator.ts`
- `constants/programDefaults.ts`
- `types/program.ts`
- `components/GenerateProgramModal.tsx`
- `utils/saveProgramToDb.ts`
- `app/(tabs)/plan.tsx`
- `app/program-overview.tsx`
- `lib/exerciseDatabase.ts`

Required behavior:

- recommend a split family from schedule, goal, experience, time, recovery, and equipment context;
- allow a clear override without punitive language;
- compute visible weekly muscle-group set targets;
- preserve primary movement stability while allowing accessory rotation;
- use session length as a soft constraint and show what was trimmed;
- remove baked-in every-fourth-week deload from the default path;
- persist versioned input, decision, and output context;
- define one canonical method to regenerate the local catalog from the seeded exercise source.

Gates:

- pure generation tests with seeded randomness;
- compatibility with `saveProgramToDb` and current loading shape;
- generation matrix across experience, depth, goal, 2–6 days, 30–90+ minutes, equipment, and focus selections;
- flags-off output remains compatible.

## `F5-S5` - Readiness-v2 and day-of adaptive coaching

Status: `[PENDING]`

Dependencies: `F5-S2`, `F5-S3`, `F5-S4`

Primary files to create:

- `utils/readinessEngine.ts`
- `utils/adaptationEventService.ts`
- `components/TodayAdjustmentSummary.tsx`
- `components/EvidenceWhySheet.tsx`
- optional dedicated check-in components

Primary files to modify:

- `app/(tabs)/home.tsx`
- `app/next-workout.tsx`
- `hooks/useCurrentProgram.ts`
- `utils/progressionEngine.ts`
- `types/progression.ts`

Required behavior:

- one-tap low/moderate/high path plus optional guided/deep inputs;
- pain and illness safety overrides;
- life load and optional symptom burden;
- missing/conflicting data fallbacks;
- conservative hierarchy: reduce volume, then complexity, then load;
- high readiness offers optional choices and never silently escalates;
- explicit recommendation, rationale, confidence, applied state, and override;
- dual-write/read compatibility during rollout;
- durable `adaptation_events` for offered, accepted, deferred, dismissed, and applied decisions.

Gates:

- pure state-machine tests and boundary tests;
- no-check-in, low, moderate, high, pain, illness, sparse, and conflicting scenarios;
- flag-off legacy behavior remains available;
- Home and Next Workout agree on the same recommendation payload.

## `F5-S6` - Workout durability, progression, plateau, and deload

Status: `[PENDING]`

Dependencies: `F5-S4`, `F5-S5`

Primary files to create:

- `utils/deloadEngine.ts`
- optional `utils/progressionService.ts`

Primary files to modify:

- `app/next-workout.tsx`
- `hooks/useCurrentProgram.ts`
- `utils/progressionEngine.ts`
- `utils/notifications.ts`
- `app/archived-programs.tsx`

Required behavior:

- idempotent/recoverable workout completion writes;
- tested double progression with equipment-aware minimum jumps;
- plateau detection from repeated misses/high RPE/stagnation, not one event;
- reactive deload recommendations with accept/postpone/dismiss/apply states;
- explicit plan-version or advancement semantics instead of back-dating `start_date` as the long-term model;
- archive restore preserves a documented program checkpoint.

Data decision:

- do not repurpose an ambiguous legacy `workout_sessions.checkin_id` in place;
- prefer an additive `readiness_checkin_id` foreign key after live schema inspection;
- keep legacy columns until rollout and data migration are proven.

Gates:

- multi-week progression tests;
- duplicate finish/retry test;
- deload lifecycle tests;
- archive/restore tests at weeks 1, middle, and final;
- legacy-row regression.

## `F5-S7` - History, analytics, evidence, and education

Status: `[PENDING]`

Dependencies: `F5-S4`, `F5-S5`, `F5-S6`

Primary files to create:

- `app/evidence/[key].tsx`
- `utils/analyticsSelectors.ts`
- `constants/recoveryProtocols.ts`
- reusable trend/insight components as justified by implementation

Primary files to modify:

- `app/(tabs)/history.tsx`
- `app/workout-history.tsx`
- `app/program-overview.tsx`
- `app/faq.tsx`
- `app/recovery-library.tsx`
- Home and Next Workout trust entry points

Route decision:

- use `/evidence/[key]` as the canonical deep-link route because evidence entries already have stable keys;
- provide an invalid-key fallback;
- add an `/evidence` index only if user navigation requires browsing all topics.

Required behavior:

- readiness, workload, consistency, progression, plateau, adaptation, and deload trends;
- plain-language interpretation with sparse-data confidence;
- the same evidence registry powers live actions, planning rationale, FAQ, and Recovery Library;
- live surfaces remain concise and depth-aware;
- charts and badges do not rely on color alone.

Gates:

- sparse/legacy/full-data fixtures;
- evidence-key coverage tests;
- route tests for valid and invalid keys;
- accessibility and wording review.

## `F5-S8` - Production hardening, privacy, release, and optional integration

Status: `[PENDING]`

Dependencies: all prior stages for final release; independent defects may be fixed earlier behind flags.

Required work:

- implement Supabase password reset and callback handling;
- replace metadata-only support/export/deletion actions with real workflows or remove their completion claims;
- make notification time and quiet hours functional; clearly label unsupported email/SMS channels;
- remove local-storage claims that contradict Supabase persistence;
- finalize `app.json` name, slug, scheme, iOS bundle identifier, Android package, permissions, icons, and build configuration;
- remove development helpers and console logging from production paths;
- complete empty/loading/error/offline states;
- execute VoiceOver/TalkBack, dynamic type, contrast, and one-handed-use checks;
- document data retention, deletion, symptom-data privacy, and incident rollback;
- optionally implement HealthKit only behind `healthkit_read_enrichment` after core manual parity is complete.

HealthKit planned file: `utils/healthKit.ts` or a platform-specific service chosen after an Expo 54 compatibility spike.

Gates:

- production identity and signed build smoke;
- privacy request end-to-end proof;
- password reset end-to-end proof;
- release flag matrix;
- iOS and Android device matrix;
- final checklist in the master plan is fully checked with evidence links in the development log.

## Decision register

| Decision | Resolution | Reason |
|---|---|---|
| Evidence route | `/evidence/[key]` primary; optional index later | Existing registry keys support direct, stable explanation links. |
| Manual program builder | Retain as Advanced-only path | Real useful implementation exists; it should not compete with recommended generation. |
| Legacy check-in foreign key | Do not repurpose without inspection; add a named v2 FK if needed | Additive changes are safer and clearer during compatibility rollout. |
| Auth metadata backfill | App compatibility migration first; audited server-side backfill only if scale requires it | Avoid broad direct reads of auth metadata in ad hoc client SQL and keep rollback observable. |
| Archive semantics | Preserve current week for compatibility; add explicit checkpoint/version state before promising exact resume | Current `last_active_week` does not capture day/date/prescription mutation state. |
| Feature flags | Land in `F5-S2`, before new behavior | Earlier rollback and safer staged rollout. |
| HealthKit | Optional, post-core, flag-gated | The app must provide equivalent manual coaching on Android and iOS. |
| Deload default | Reactive recommendation; scheduled option only when explicitly chosen | Matches the approved conservative/user-controlled product direction. |
| Source plans | Reference-only | Prevent duplicate authority and repeated completed work. |

## Test and verification growth plan

1. In `F5-S2`, add a pure TypeScript test runner compatible with the Expo repository and Windows policy.
2. Test flag resolution, generator policies, readiness state, progression, deload, evidence mapping, and analytics selectors as pure modules.
3. Add focused component tests only where they provide stable value for preference and explanation flows.
4. Keep a manual device matrix for authentication, onboarding, generation, workout execution, history, settings, theme, offline/error handling, and permissions.
5. Treat `npm run lint` as a required static gate, not a substitute for behavior tests.

## Immediate next execution packet

The next bounded implementation packet is `F5-S1` only:

1. validate live schema and migration state;
2. prove or add Phase 2 RLS policies;
3. run the new/legacy compatibility smoke matrix;
4. close repository authority drift;
5. record evidence in `dev-doc/reports/DEV-LOG.md`;
6. only then move `F5-S2` to active.
