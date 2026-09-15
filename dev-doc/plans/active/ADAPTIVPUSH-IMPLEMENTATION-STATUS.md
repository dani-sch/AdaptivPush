# AdaptivPush code-backed implementation status

## September 15 current hosted state

The hosted AP-02/AP-03 packet is deployed to `thfxcvxcsfvrzdysdnkq`. The normal `.env` enables both writers, and the freshly served iOS bundle verifies the expected hosted backend, public client key and true/true flags with no privileged key. The user authorized this rollout after agent-run recovery and technical checks, replacing earlier pre-migration local/manual/QA-account, signing, standalone-build and distribution requirements. Physical acceptance follows deployment with the existing account through ordinary `npm start` and its Expo Go QR.

All three reviewed migrations committed atomically. Recovery, schema/security, original-data preservation, hosted rolled-back write probes and effective bundle verification passed. The additive correction permits immutable future revisions for migrated schema-1 programs without changing their historical provenance, and protects their persisted prescriptions from direct client mutation. Duplicate save recovery reassurance is removed. Source `7cc4051`, integrator `8917bfd`; [current report](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md) owns exact evidence.

Physical iPhone cold launch, five-action UI/reopen acceptance and accessibility remain unverified. Thirty-two pre-existing non-rest days have no exercises (five in active programs); they were preserved, not populated with invented prescriptions. Complete persisted workouts can use their database identities; empty legacy days remain unstartable. AP-04/AP-05 remain out of scope. Earlier dated paragraphs below retain prior observations and are superseded on hosted status and rollout sequencing by this section.

Snapshot: 2026-09-15 for the bounded AP-02/AP-03 release update; unrelated source observations retain their earlier scope. This document owns implementation facts and unresolved code defects. The [master plan](/dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md) owns target product behavior; the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) owns delivery status and gates; the [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md) owns schema evolution. Approved decisions override historical product proposals, but do not make target behavior implemented.

## Evidence boundaries

September 14 iPhone failure remediation adds current nonvisual evidence: typed
program failures survive caller layers; Home/Plan and entry share strict durable
identity checks; rejected first workout submissions preserve editable drafts,
while prior uncertain submissions remain frozen. Local LAN tests exercise the
shipped command/repository implementations, and a separate AP-01 database proves
real migration identities make legacy plans startable without changing legacy
provenance. Enabled/Disabled iOS exports and live Metro bundles are verified,
including rejection and correction of stale cached flag values. The user
reports SDK 57 App Store Expo Go on iOS 26.6.1. Native crash resolution and
physical UI passes are not yet demonstrated. Production schema/writers remain
gated. Exact source, commands, results and limits are in the current
[release addendum](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md).

This consolidation inspected repository source, schema documentation, migrations 001–017, the retained migration verification script, historical status/register documents, the unchanged September decision packet, and the August audit/development log. It did not run the application, connect to Supabase, run a migration, or perform a device, integration, security, or purchase test. File line numbers below refer to the inspected working tree and may shift during implementation; symbols are the durable navigation aid. The pre-existing `utils/saveProgramToDb.ts` user modification was inspected and left intact.

AP-01.1 subsequently added a current, read-only production metadata observation
on 2026-09-09. It did not mutate the database or run role/write isolation. That
observation found 16 exposed public tables matching the schema reference, RLS
enabled without force on all 16, full `exercises` privileges for `anon` and
`authenticated`, unconditional catalog policies, no application managed-migration
ledger, no Free-plan managed backup, 1,369 exercises, 51 missing external IDs,
and 17 normalized-name collision groups. Exact methods and limitations are in
[the AP-01 evidence artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-09.md).

AP-01.3 completed on 2026-09-10 with Supabase CLI `2.117.0` and PostgreSQL 17.
It captured and hashed the production baseline, reconciled retained migration
provenance, created and decrypted an external AES-256-GCM backup, restored roles,
schema, data, and safe aggregates locally, and added a cross-schema signup-trigger
reconciliation plus catalog-authority migration. The self-contained isolation
suite passed on restored and fresh-reset targets. Production now has aligned
baseline/enforcement ledger versions, SELECT-only ordinary catalog grants, one
read policy, restricted SECURITY DEFINER execution/search path, and preserved
trusted curation. A rolled-back production role probe passed without changing
catalog count. [The dated evidence artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-10.md)
owns exact commands, hashes, caveats, and redacted results.

AP-02/AP-03 were subsequently implemented on `codex/ap02-ap03` and verified in
the configured `integrator` worktree. Focused contract tests, fresh local
PostgreSQL 17 reset, AP-01 regression SQL, AP-02/AP-03 fault/replay/RLS SQL,
database lint, strict TypeScript and application lint pass. The combined
migration is local only; both writer flags default off. Production backup,
deployment and device evidence are explicitly not inferred. See the dated
[AP-02](/dev-doc/reports/ADAPTIVPUSH-AP-02-2026-09-10.md) and
[AP-03](/dev-doc/reports/ADAPTIVPUSH-AP-03-2026-09-10.md) evidence.

AP-03 release hardening on `codex/ap03-flag-off-save-recovery` subsequently
reproduced a generic flag-off generated-save failure in an Android 16 emulator.
The save entry point now fails before catalog/profile/database work and surfaces
the rollout recovery text. With the flag off, a database sentinel and zero
program/context rows were unchanged; with both durable writer flags on, the same
authenticated generated flow installed one active schema-v2 program, one
revision, 24 days, 112 slots and one context row in local Supabase. This is
partial device evidence, not the full AP-02/AP-03 device or production gate.

The 2026-09-11 `codex/ap02-ap03-swap-recalibration` packet is integration-
verified at local integrator merge `54e5a39` against local Supabase in the
supported Android 16 native development build. It
declares the Expo-compatible React Navigation runtime, adds an authenticated
immutable successor-revision swap command, separates current-draft and future
program outcomes, preserves logged-set exercise identity, requires explicit
replacement-load confirmation, and resolves routes from complete immutable
identity plus an owner-scoped stable active-draft alias. Home, Plan, reload,
background/foreground, kill/reopen, gateway-off cold launch, stale routes and an
actual account switch pass on the emulator. The merged tree also passes focused
and static gates, a fresh four-migration reset and all three SQL suites, Expo
Doctor 21/21, a 3,819-module Metro export and a 435-task native debug assembly.
Expo Go was observed separately and retains the SDK/native-module remote-notification limitation; physical-device,
accessibility, old-client and production rollout evidence remains open.

The September 14 release task on `codex/ap02-ap03-release` adds bounded
corrections to the two still-unapplied AP-02/AP-03 migrations and their client
commands. Secure CLI/database authentication is independently verified for
`thfxcvxcsfvrzdysdnkq` through the local DPAPI-protected helper; credentials stay
outside the repository. No new production backup or production migration is
claimed. The [current release report](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md)
owns final command results, commits, hashes and integration evidence; historical
passes above do not verify this new diff. User physical-device/accessibility
results remain necessary, followed by fresh encrypted backup/restore, the exact
two-migration production packet, distribution identity and monitored rollout.

| September 14 corrected behavior | Owning source / verification boundary |
|---|---|
| Same-operation concurrent RPC replay checks after obtaining the owner lock, preventing stale pre-lock receipt observations. | Both pending migrations; atomicity/isolation and successor SQL suites. |
| Finalization freezes its submitted payload/end time; retries reuse it and pending/finalized set controls reject edits. Definitive rejection clears stale retry state so corrected work can be submitted. | Workout contracts, commands, draft store, Next Workout and ExerciseCard; finalization fixtures. |
| Install and archive/restore retries retain exact durable requests; installation stays pinned to its captured authenticated owner. | Program commands, repository, install/lifecycle stores and manual authoring; installation fixtures. |
| Future revision swaps protect completed-set lineage from ancestor revisions. | Successor-revision migration and SQL suite; current workout remains frozen. |
| Actual load kind/unit survives capture; kilogram external volume is converted and assistance/bodyweight are not counted as external-load volume. PR candidates use actual exercise identity and supported external units. | Workout contracts, actual-load helper and durable finalize migration; contract/SQL fixtures. |
| Exact archive retains elapsed checkpoint placement and the original start date while explicit restart/legacy approximation remain distinct. Legacy provenance cannot be treated as an exact checkpoint. | Program checkpoint helper, hook, lifecycle commands and migration; checkpoint fixtures. |
| Archived-program reads fall back for legacy schema and discard previous-owner results during account changes. | Archived Programs owner-scoped reader and compatibility path; runtime/device evidence remains required. |
| Set entry has contextual accessible names/states; submitted controls are read-only with usable targets. | ExerciseCard, Next Workout and archive controls; actual TalkBack/VoiceOver/touch evidence remains user-owned. |

| Label | Meaning |
|---|---|
| Working code | An implemented source path performs the stated bounded behavior. This is not a claim of release or fresh runtime verification. |
| Partial | Some useful behavior is implemented, but the approved end-to-end contract fails or is incomplete. |
| Scaffolded | Types, storage, preferences, tokens, or UI exist without the promised workflow. |
| Missing | No implementing application path was found in the inspected route/module/dependency inventory. |
| Historical evidence | A dated prior execution report, not a measurement from this consolidation. |
| Requires inspection | A fact cannot be settled by current static source or historical evidence. |

## Current architecture and capability matrix

The application is Expo Router/React Native with screen-level Supabase access, shared utilities, a large current-program hook, local exercise data, and AsyncStorage theme/auth support. AP-02/AP-03 now add versioned feature-capsule contracts, repositories/commands, owner-scoped durable pending stores and database receipts. This is not proof of physical-device offline behavior or unrelated optional-module isolation.

| Capability / owning slice | Status and actual behavior | Exact current evidence | Gap to approved behavior |
|---|---|---|---|
| Sign-up, sign-in, route gating / AP-16 | Working code: Supabase auth/profile routing plus local persisted-session owner recovery for an in-progress workout. | [join `signUp`](/app/(auth)/join.tsx#L84), [login `signInWithPassword`](/app/(auth)/login.tsx#L71), [root guard](/app/_layout.tsx), [persisted session parser](/features/auth/persistedSession.ts). | Workout offline startup and account isolation pass on Android 16; expired-session and reset/callback coverage remain open. |
| Password recovery / AP-16 | Scaffolded form; reset delivery is missing. | [Forgot Password `handleSubmit`](/app/(auth)/forgot-password.tsx#L37) only sets `submitted` after a TODO. | Implement reset request and callback; show delivery truth and retry safely. |
| Onboarding / AP-03, AP-06 | Working AP-03 compatibility: DOB, sex and weight are optional; experience remains required; profile/default writes and generation launch remain. | [Quick Setup](/app/(qsetup)/quick-setup.tsx), [program contract](/features/programs/contracts.ts). | Authenticated interruption/device proof remains open. AP-06 still owns richer goal, schedule, time, equipment and practical constraints. |
| Preference compatibility / AP-01, AP-08 | Working code helpers with partial UI adoption. Missing relation/column fallback and precedence are explicit. | [preference resolution](/utils/profilePreferences.ts#L247), [missing-schema classifier](/utils/profilePreferences.ts#L341), [Profile readiness/cycle writes](/app/(tabs)/profile/index.tsx#L550). | Actual Expo UI and missing-schema runtime matrix remain open despite historical service-level checks. |
| Shared catalog authority / AP-01 | Working and production-enforced: generated save and developer fixtures resolve read-only catalog identities before program mutation; swaps require a catalog UUID; seed uses the administrator client; ordinary roles are SELECT-only and trusted curation remains available. | [catalog contracts](/features/catalog/contracts.ts), [resolver](/features/catalog/resolveCatalogExercises.ts), [repository](/features/catalog/repository.ts), [catalog harness](/tests/catalog/resolveCatalogExercises.test.ts), [authority migration](/supabase/migrations/20260910190000_reconcile_auth_trigger_and_enforce_catalog_authority.sql), [isolation suite](/supabase/tests/ap_01_3_catalog_authority_isolation.sql). | Database authority/restore gates are closed. Offline cache, actual Expo-device UI, runtime missing-schema, and integrator evidence remain application gates. |
| Standard generation / AP-06 | Working code generates a multiweek artifact, goal/experience/time/focus inputs and explanation metadata. | [`generateProgram`](/utils/programGenerator.ts#L385), [`selectExercises`](/utils/programGenerator.ts#L116), [`buildSlot`](/utils/programGenerator.ts#L222), [defaults](/constants/programDefaults.ts), [local catalog](/lib/exerciseDatabase.ts). | Fixed split mapping, random selection, inferred compound identity, demographic load estimates, baked future load rises and scheduled deloads do not implement the approved goal/constraints/precision policy. |
| Generated-program persistence / AP-01, AP-03 | Working behind default-off flag: the entry point fails closed before server work when disabled; when enabled it resolves the complete catalog, validates one artifact and calls the atomic replay-safe installer. | [`saveProgramToDb`](/utils/saveProgramToDb.ts), [program commands](/features/programs/commands.ts), [installer repository](/features/programs/repository.ts), [rollout tests](/tests/programs/rollout.test.ts). | Local/integration failure and concurrency gates pass; Android 16 generated flag-off/on smoke passes locally. Production migration/flag, old-client, manual-device, interruption and broader device matrix remain open. |
| Manual authoring / AP-03 | Working behind the same flag: free manual creation builds the common validated artifact and uses the atomic installer. | [Create Program](/app/create-program.tsx), [program contract](/features/programs/contracts.ts). | Authenticated device, offline interruption and production rollout proof remain open; AP-06 enrichment is separate. |
| Active program / AP-03, AP-04 | AP-03 working: revision-scoped reads, immutable V2 prescriptions and authenticated successor-revision exercise swaps with replay/stale conflict semantics. Calendar placement remains AP-04 partial. | [`useCurrentProgram`](/hooks/useCurrentProgram.ts), [successor migration](/supabase/migrations/20260911120000_ap03_revision_safe_exercise_swap.sql), [SQL suite](/supabase/tests/ap_03_program_revision_swap.sql). | Android local successor flow passes; dated occurrences, production rollout, physical-device and old-client verification remain open. |
| Archive/restore / AP-03, AP-04 | AP-03 working behind flag: command-owned exact V2 checkpoint/archive/restore and explicit legacy approximation/restart without backdating. | [`archived-programs`](/app/archived-programs.tsx), [program commands](/features/programs/commands.ts). | AP-04 later enriches dated occurrence placement; production and device UI proof remain open. |
| Workout execution / AP-02 | Working behind default-off flag: owner-scoped frozen drafts, stable set/operation IDs, zero/load semantics, atomic receipt finalization and route recovery from immutable identity or the matching active stable draft. | [Next Workout](/app/next-workout.tsx), [draft store](/features/workouts/draftStore.ts), [route resolution](/features/workouts/routeResolution.ts), [SQL suite](/supabase/tests/ap_02_ap_03_atomicity_and_isolation.sql). | Android Home/Plan/reload/background/kill/offline/stale/account-switch matrix passes; physical-device, accessibility, old-client and production rollout remain open. AP-05 owns complete derived history/progression processing. |
| Manual swap / AP-01, AP-02, AP-03, AP-07 | Working locally: catalog UUID guard retained; current-only swap saves first; logged sets keep original identity; only unlogged sets move; load copy requires explicit confirmation; future update returns a separate successor-revision result. | [Next Workout](/app/next-workout.tsx), [ExerciseCard](/components/ExerciseCard.tsx), [workout tests](/tests/workouts/finalization.test.ts), [program swap tests](/tests/programs/revision.test.ts). | Android local interaction passes. Physical-device/accessibility and AP-07 equipment/configuration comparability remain open. |
| History and PRs / AP-05 | Working screens and queries; mixed-history and failure interpretation are partial. | [History `fetchWorkoutHistory`](/app/(tabs)/history.tsx#L408), [detail query](/app/(tabs)/history.tsx#L231), [`fetchExerciseHistory`](/utils/fetchExerciseHistory.ts#L4), [PR insert](/app/next-workout.tsx#L465). | Legacy fallback chooses a source rather than union/deduplication; errors may look like no history; PR writes are separate and do not populate session linkage/count here. No machine-specific comparison cohorts. |
| Basic progression / AP-05 | Partial: increase/hold/decrease and per-set next-week mutations exist. | [`computeProgression`](/utils/progressionEngine.ts#L55), [hook `applyProgressionToNextWeek`](/hooks/useCurrentProgram.ts#L251), set-accounting :369, write :425. | Required prescription completion, stable role/load identity, recovery phase precedence, repeated misses, idempotent application and sparse-data confidence require implementation. |
| Readiness capture / AP-08 | Partial: Home stores weighted sleep/stress/soreness/motivation and cycle context in legacy logs. | [Home readiness upsert](/app/(tabs)/home.tsx#L364), [legacy read](/app/(tabs)/home.tsx#L613), [v2 types](/types/database.ts#L99), [migration 009](/reports/migrations/009_readiness_checkins.sql). | V2 storage is unused by the current capture route; pain/illness/symptom pathway and explicit scale/revision provenance are missing. |
| Day-of adaptation / AP-08 | Partial and contrary to D-05: independent display overlay and a Home confirmation that calls a no-op. | [Next Workout `buildExercises`](/app/next-workout.tsx#L33), [late rebuild effect](/app/next-workout.tsx#L250), [Home Apply](/app/(tabs)/home.tsx#L700), [compatibility no-op](/hooks/useCurrentProgram.ts#L778). | One persistent proposal/decision state, rejection persistence, acceptance freeze and logged-set protection are missing. |
| Cycle support / AP-08 | Partial: opt-in settings and calendar phase modifiers; richer symptom rows scaffolded. | [`getCycleModifier`](/utils/cyclePhase.ts#L9), [`computeCyclePhase`](/utils/cyclePhase.ts#L21), [Profile `saveCycleSettings`](/app/(tabs)/profile/index.tsx#L638), [migration 010](/reports/migrations/010_cycle_symptom_logs.sql). | Symptom-first interpretation, irregular-cycle uncertainty and consent-aware capture are not implemented; phase alone currently affects prescriptions. |
| Deload and longitudinal coaching / AP-09 | Partial scheduled behavior; reactive lifecycle scaffolded in SQL/types. | [generator fourth-week branch](/utils/programGenerator.ts#L440), [hook notification](/hooks/useCurrentProgram.ts#L823), [migration 013](/reports/migrations/013_deload_recommendations.sql), [status type](/types/database.ts#L19). | No coherent propose/accept/modify/defer/reject/active/complete/reassess engine, phase protection, fatigue/plateau evidence or durable explanation consumer. |
| Dated scheduling, manual deviations, weekly adherence / AP-04 | Missing approved model; Home calendar is a placeholder. | [calendar action](/app/(tabs)/home.tsx#L66), [week/date behavior](/hooks/useCurrentProgram.ts#L53), [current schema](/lib/adaptivpush_database_schema.md). | Explicit local dates/timezone, original placement, occurrence identity, rest, revisions, swaps/carries/skips, pauses and policy-versioned adherence are planned. |
| Advanced generation and equipment precision / AP-06, AP-07 | Missing approved premium workflow; broad parameters/local equipment labels exist. | [GenerateProgramModal](/components/GenerateProgramModal.tsx), [profile equipment JSON](/types/database.ts#L49), [`selectExercises`](/utils/programGenerator.ts#L116). | Multiple locations, inventory instances, attainable load values, machine configuration versions, unit/side/assistance semantics and entitlement-enforced recommendations are not implemented. |
| Automated schedule recovery / AP-10 | Missing. | No recommendation/schedule-recovery module in inspected `app/`, `utils/`, `hooks/`, or current schema. | Premium bounded proposals, explicit acceptance and infeasible alternatives require AP-04 and AP-08 contracts. |
| Evidence and educational content / AP-06, AP-08, AP-09 | Explanation data scaffolded; FAQ/Recovery are static useful routes. | [evidence types](/types/evidence.ts), [registry](/constants/evidenceRegistry.ts), [policy registry](/constants/adaptationPolicies.ts), [generator `buildExplanation`](/utils/programGenerator.ts#L78), [FAQ](/app/faq.tsx), [Recovery Library](/app/recovery-library.tsx). | No live shared Why sheet, evidence deep-link route or unified policy-key consumer. Existing payloads must not imply clinical validation of exact thresholds. |
| Local notifications / AP-04, AP-16 | Partial: permission and reminders/PR/deload alerts; metadata preferences. | [`scheduleWorkoutReminder`](/utils/notifications.ts#L47), fixed `hour: 8` :59, [`applyNotificationPreferences`](/utils/notifications.ts#L72), [notifications settings](/app/(tabs)/profile/notifications.tsx). | Selected time/quiet hours/schedule occurrence changes are not honored end-to-end. Email/SMS controls have no delivery backend. |
| Health integration / AP-12 | Missing adapter; UI and preference fields are placeholders. | [Quick Setup `handleHealthConnect`](/app/(qsetup)/quick-setup.tsx#L219), [Profile](/app/(tabs)/profile/index.tsx), [dependencies](/package.json), [native config](/app.json). | No native reader, platform permission flow, source deduplication, consent ledger or separately consented cloud path. Existing profile/readiness writes are Supabase writes; local-health wording is not an accurate description of all stored data. |
| Unlisted publication/install and public/community / AP-11, AP-14, AP-15 | Missing. | Inspected route inventory and [16-table schema](/lib/adaptivpush_database_schema.md). | No sanitized immutable publication, link resolver, pinned install/update preview, moderation, reviews or social workflow. No public release readiness is implied. |
| Theme/palette / AP-13 | Working code: system/light/dark with persisted accent selection. Commerce is missing. | [`AppThemeProvider`](/contexts/ThemeContext.tsx#L36), [theme tokens](/constants/themes.ts), [palettes](/constants/palettes.ts). | No validated paid token packages, verified purchases, restoration, refunds or entitlement cache. Existing free accessible themes remain. |
| Shared UI and accessibility / all slices | Scaffolded: shared colors/tokens and a small generic UI set; bespoke screen styles dominate. | [UI directory](/components/ui/), [theme context](/contexts/ThemeContext.tsx). | No measured device accessibility, dynamic-type/contrast/screen-reader pass or complete shared component system was established here. |
| Privacy/export/deletion / AP-16 | Scaffolded metadata request UI. | [`handleDataRequest`](/app/(tabs)/profile/privacy-data.tsx#L223), metadata request timestamp :249. | No secure request processor, downloadable export, deletion saga, status/audit or retention fulfillment. A metadata update is not an export or deletion. |
| Support / AP-16 | Scaffolded metadata request action and unsupported delivery promises. | [Help & Support](/app/(tabs)/profile/help-support.tsx), `handleSupportAction`. | No issue body delivery/ticket lifecycle or proven response SLA. Requests need server acknowledgment and named operational ownership. |
| Flags, tests and release / AP-01, AP-16 and each slice | Partial gate infrastructure: AP-01 production coverage plus AP-02/AP-03 default-off flags, focused tests, durable pending stores and integrated SQL fault/isolation coverage. The generated-save producer now proves no server mutation while disabled. | [package scripts](/package.json#L5), [rollout](/features/kernel/rollout.ts), [workout tests](/tests/workouts/finalization.test.ts), [program tests](/tests/programs/installation.test.ts), [rollout tests](/tests/programs/rollout.test.ts), [SQL suite](/supabase/tests/ap_02_ap_03_atomicity_and_isolation.sql). | Production AP-02/AP-03 backup/deploy/flag and the remaining device matrix remain open; production bundle/package identity and complete release configuration remain missing. |

## Unresolved defect ledger

These items are actionable source findings, not a claim that a new runtime failure was reproduced. Acceptance fixtures are routed to the owning register slice.

| ID | Defect / impact | Evidence and minimum correction gate |
|---|---|---|
| DEF-01 / AP-01 | **Resolved 2026-09-10:** production catalog authority is SELECT-only for `anon`/`authenticated`; mutation policies are removed; trusted curation remains. | Baseline/enforcement migrations, encrypted restore proof, fresh two-owner/storage suite, dry-run, production deployment, and rolled-back production role probe in the September 10 evidence. Device/missing-schema/integrator work remains separate. |
| DEF-02 / AP-02 | **Resolved locally/integration-verified:** finalization is one replay-safe transaction; injected post-session failure rolls back and the durable operation retries once. | `finalize_workout_v2`, workout draft store and AP-02/AP-03 SQL suite. Production/device release gates remain open. |
| DEF-03 / AP-02 | **Resolved locally/integration-verified:** complete identity validation precedes completion; stable set IDs/order and explicit load semantics preserve zero/bodyweight/unknown/assistance. | Workout contracts, finalization tests and SQL zero/partial fixtures. Production/device release gates remain open. |
| DEF-04 / AP-02, AP-04 | **AP-02 resolved locally:** only finalized complete/reduced outcomes count as completion; partial/pending do not. | `useCurrentProgram` outcome projection and one-of-four fixture. AP-04 dated fulfillment remains separate. |
| DEF-05 / AP-03 | **Resolved locally/integration-verified:** the full validated hierarchy/context/activation commits through one serialized installer; injected failure preserves the prior active program and stale contenders conflict. | `install_program_v2` and AP-03 SQL matrix. Production/device release gates remain open. |
| DEF-06 / AP-03 | **Resolved locally/integration-verified:** missing mappings reject the artifact; generated and manual paths share validation and the atomic installer/revision contract. | Program contracts/tests, `saveProgramToDb`, Create Program and installer SQL suite. Production/device release gates remain open. |
| DEF-07 / AP-04 | Date-derived progression and backdating replace schedule semantics; rest/deload flags present in schema are omitted by primary save/load paths. | `computeWeekNumber` :53; `advanceToNextWeek` :784; `dayInserts` :365; `refresh` :128. Fixtures must preserve original placement/cycle identity, rest and DST boundaries. |
| DEF-08 / AP-03, AP-04 | **AP-03 resolved locally for V2:** exact checkpoint/archive/restore commands surface errors and preserve history; legacy rows are honestly approximate/restart and are never backdated. | Program commands, Archived Programs and SQL lifecycle fixtures. AP-04 dated placement and production/device release gates remain open. |
| DEF-09 / AP-05 | Hook all-hit logic compares successful sets with logged sets, not prescribed count; one logged successful set can count as all successful. Query is by exercise/latest session without stable slot/equipment role. | `applyProgressionToNextWeek` :305/:369. Require complete comparable work, explicit partial outcome and stable comparison cohort. |
| DEF-10 / AP-05, AP-09 | Next-week queries omit deload state and writes can overwrite reduced prescriptions; repeated progression calls have no source watermark/revision guard. | Hook :273–290/:425. Phase-protected proposals and idempotent apply; replay does not compound change. |
| DEF-11 / AP-08 | Dismissing Home proposal does not govern Next Workout overlay; Home Apply calls a no-op. High readiness independently raises load/RPE. | Home :700, hook :778, `getReadinessModifier` :11, `buildExercises` :33. Rejection must persist across routes; no increase without explicit acceptance. |
| DEF-12 / AP-02, AP-08 | **AP-02 containment resolved locally:** Next Workout freezes once and late readiness/cycle changes cannot rebuild entered sets. | Frozen-prescription contract/test and Next Workout draft flow. AP-08 accepted amendment lifecycle remains future work. |
| DEF-13 / AP-08 | Calendar phase reductions exist in generator, progression RPE and day-of overlay; multiple phases can compound without symptom evidence or one applied-decision record. | `resolveSlotParams` :171, hook :413, `getCycleModifier` :9. Asymptomatic phase changes must not change prescription; avoid duplicate adjustment. |
| DEF-14 / AP-02, AP-07 | **AP-02 containment resolved locally:** completed actual sets retain original identity; unlogged replacement sets reset and require explicit recalibration. | Next Workout, ExerciseCard and swap fixture. AP-07 machine/configuration cohorts remain future work. |
| DEF-15 / AP-05 | History fallback does not reconcile both formats; history utility returns empty for auth/query failures. | History :439; `fetchExerciseHistory` :32/:80. Union/deduplicate supported legacy records and expose unavailable versus empty states. |
| DEF-16 / AP-06, AP-09 | Generator embeds weekly escalation, fourth-week deload and random catalog selection. Explanations do not make these validated fitness rules. | Generator :93/:246/:440. Seeded constraint fixtures, provisional future loads and policy-versioned review replace automatic certainty. |
| DEF-17 / AP-12, AP-16 | Health connection, password reset, export/deletion and support promises lack implementing workflows. | Capability matrix above. Hide/relabel until real behavior exists; local capture and manual training continue. |
| DEF-18 / AP-16 | Reminder controls exceed delivered behavior and the temporary app identity remains; AP-03 removed the visible development-program path. | Notifications :59 and `app.json` :3 remain open. Production config/build/device gate must prove unsupported controls unavailable; AP-03 source/device inspection confirms the old development-program action is absent. |
| DEF-19 / AP-03 | **Resolved locally 2026-09-10:** disabled generated save previously performed profile/catalog work before the repository guard and collapsed the useful rollout error into `Program save failed`. | `saveProgramToDb` now guards first and preserves repository messages; two rollout fixtures, Android 16 flag-off/no-mutation evidence and flag-on atomic generated installation pass. Remaining device/production gates are unchanged. |
| DEF-20 / AP-02, AP-03 | **Resolved locally 2026-09-11:** Home/Plan route identity and program hydration could render a valid workout together with a false unavailable message or lose a frozen draft after an active revision advanced. | Full route serialization, owner/revision/stable-day/day-row matching, active stable-draft alias, persisted-session owner hydration and 13 workout fixtures; Android reload, background, kill, offline, stale-route and account-switch probes pass. Physical-device/accessibility/old-client gates remain. |
| DEF-21 / AP-03 | **Resolved locally 2026-09-11:** “apply going forward” attempted forbidden direct V2 mutation and could collapse future failure into a current-swap failure alert. | `revise_program_exercise_v2`, separate result contract, 10 program fixtures, fresh successor SQL suite and Android successor flow. Production migration/flag/old-client gates remain open. |

The progression helper still supports readiness increases, but the current hook passes `readinessScore: null` at `hooks/useCurrentProgram.ts:349`; the confirmed active increase path is the day-of overlay. Keep this distinction when fixing or testing the defect.

## Database-use status

The [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md#current-schema-and-security-posture) gives authoritative per-table status, policy caveats and migration mapping. Active runtime data is `programs`, `program_days`, `program_day_exercises`, `exercises`, `workout_sessions`, `workout_exercise_sets`, `personal_records`, `readiness_logs` and `user_profile`. Preference compatibility uses `user_adaptation_preferences`; onboarding seeds `evidence_display_preferences`; generated saves write `program_generation_context`. Richer readiness/symptom/adaptation/deload tables exist in the schema/migrations but their approved runtime lifecycle is not implemented. Proposed schedule/public/commerce/health/equipment tables are not existing infrastructure. The committed `supabase/config.toml` is local tooling configuration, not a pulled baseline or deployed schema fact.

## Historical verification and remaining inspection

The [August live audit](/dev-doc/reports/FABLE-5-LIVE-SUPABASE-AUDIT-2026-08-03.md) records seven-table ownership isolation, avatar policy repair and exercise external-ID remediation. The [development log](/dev-doc/reports/DEV-LOG.md) records authenticated synthetic-user profile/default/context checks, injected context failure cleanup, lint/type checks and cleanup of the synthetic identity. Those results retain their original dates and scope. AP-01.3 and the AP-02/AP-03 local integration evidence supersede their covered database/command gaps, but neither proves mobile accessibility or physical-device offline behavior.

Before AP-01 exit, complete Profile and missing-schema behavior on an Expo device; Quick Setup optional inputs and Generate Program have historical bounded Android 16 evidence, and AP-01's database/restore/security gates are complete. For AP-02/AP-03, complete current automated/build/integration evidence, bind the manual build and obtain the user's required passes, then create and restore a fresh encrypted production backup and dry-run/apply/verify exactly the two reviewed migrations. CLI/database authentication is already verified. Production writer enablement additionally requires real distribution identity, signing/deployment ownership, rollback rehearsal and payload-free monitoring. Later slices retain their own deterministic, integration, device and production gates; AP-04/AP-05 are outside this release task.

The original consolidation performed no application/database mutation. Later dated sections above distinguish implemented local code/migrations, released AP-01 production work, and the still-unreleased AP-02/AP-03 production boundary.
