# FABLE-5 code implementation status

## Purpose and authority

This document is the code-backed implementation snapshot for the complete AdaptivPush app. It answers four questions:

1. What exists in the repository?
2. What appears operational from code inspection and recorded verification?
3. What is only scaffolded or partially connected?
4. What must still be implemented or verified before the product is complete?

The product and implementation contract remains `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`. The ordered execution ledger is `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md`. This status document reports reality; it does not create a competing roadmap.

Snapshot baseline:

- repository commit: `74f9e8a`
- branch observed during audit: `implementation-plan-finalization`
- runtime: Expo 54, React Native 0.81, React 19, TypeScript 5.9
- backend: Supabase Auth, Postgres, Storage
- automated app gate present: `npm run lint`
- automated tests present: none
- live Supabase state: not directly verified during this code audit

## Status vocabulary

| Status | Meaning |
|---|---|
| `[WORKING-CODE]` | A real implementation path exists and prior repository logs record a successful relevant smoke or lint check. It still requires release regression testing. |
| `[IMPLEMENTED-UNVERIFIED]` | Code exists, but the live service, device behavior, or complete user path has not been verified from this audit. |
| `[PARTIAL]` | A usable path exists, but important product behavior, safety, persistence, or UX remains incomplete. |
| `[SCAFFOLDED]` | Types, tables, constants, or UI affordances exist without the intended end-to-end behavior. |
| `[MISSING]` | The planned capability or required production surface does not exist. |
| `[BLOCKED-BY-VALIDATION]` | Code may exist, but the plan must not advance until an external or manual verification gate is closed. |

## Product-level summary

| Product area | Status | Current truth | Primary evidence | Completion requirement |
|---|---|---|---|---|
| Authentication and route gating | `[WORKING-CODE]` | Sign-up, sign-in, sign-out, session routing, and onboarding gating are implemented. | `app/_layout.tsx`, `app/(auth)/join.tsx`, `app/(auth)/login.tsx` | Regression-test expired sessions, offline startup, and redirects. |
| Password recovery | `[MISSING]` | The screen validates an email but never calls Supabase password recovery. | `app/(auth)/forgot-password.tsx` | Call `supabase.auth.resetPasswordForEmail`, add callback/deep-link handling, and verify reset completion. |
| First-run onboarding | `[PARTIAL]` | Demographics, weight, experience, a placeholder HealthKit choice, Phase 2 defaults, and first program generation exist. Approved goal, schedule, equipment, time, depth, and explanation controls are not first-class onboarding inputs. | `app/(qsetup)/quick-setup.tsx`, `components/GenerateProgramModal.tsx` | Replace demographic-first flow with staged personalization while preserving compatibility writes. |
| Program generation | `[WORKING-CODE]` | Generates multi-week programs from goal, days, duration, focus muscles, session target, experience, cycle phase, and a 55-exercise local catalog. Emits explanation metadata. | `utils/programGenerator.ts`, `constants/programDefaults.ts`, `lib/exerciseDatabase.ts` | Add split recommendation/override, weekly set targets, equipment-aware selection, deterministic test seams, stability windows, and reactive rather than baked-in deload policy. |
| Program persistence | `[WORKING-CODE]` | Saves programs, days, exercises, and a required generation-context snapshot; rolls back the program row if context insertion fails. | `utils/saveProgramToDb.ts` | Verify live schema/RLS and make the multi-table save atomic or recoverable beyond the first row. |
| Manual program editor | `[WORKING-CODE]` | A full manual program creation flow persists custom programs and exercise prescriptions. | `app/create-program.tsx` | Retain as an Advanced path, add feature gating, context/version semantics, and validation tests. |
| Active program orchestration | `[PARTIAL]` | Loads active week, sorts completed workouts, swaps exercises, archives programs, applies progression, and advances weeks. It is a large client-side orchestration seam with date manipulation and development helpers. | `hooks/useCurrentProgram.ts` | Split data access/domain orchestration, replace the start-date advancement hack, remove dev-only paths, and add tests. |
| Workout execution | `[WORKING-CODE]` | Displays prescribed sets, accepts set logging, writes sessions and sets, detects PRs, and triggers progression refresh. | `app/next-workout.tsx`, `components/ExerciseCard.tsx` | Add offline/retry safety, transactional persistence, adaptation-event linkage, accessibility regression, and explicit adjustment controls. |
| Readiness capture | `[PARTIAL]` | Home records sleep, stress, soreness, motivation, a weighted score, and optional cycle phase in legacy `readiness_logs`. | `app/(tabs)/home.tsx` | Implement `readiness_checkins`, one-tap/deep modes, pain/illness/life-load safety overrides, preference-aware questions, and tests. |
| Day-of adaptation | `[PARTIAL]` | Next Workout applies readiness and calendar-cycle load/RPE changes as a display-only overlay. The Home confirmation action calls a compatibility no-op. | `app/next-workout.tsx`, `hooks/useCurrentProgram.ts`, `utils/progressionEngine.ts`, `utils/cyclePhase.ts` | Create `utils/readinessEngine.ts`, explicit recommendations, user override state, durable adaptation events, and conservative volume-first behavior. |
| Progression | `[PARTIAL]` | A performance-driven increase/hold/decrease helper exists and is applied to future prescriptions. High readiness can increase load and RPE. | `utils/progressionEngine.ts`, `hooks/useCurrentProgram.ts` | Implement tested double progression, equipment-aware increments, plateau state, confidence, safety gating, and remove one-shot high-readiness load escalation. |
| Deloads | `[PARTIAL]` | Generator schedules every fourth week and notifications announce deload weeks. A richer recommendation table exists but has no engine or UI lifecycle. | `utils/programGenerator.ts`, `utils/notifications.ts`, `reports/migrations/013_deload_recommendations.sql` | Add `utils/deloadEngine.ts`, reactive triggers, accept/defer/dismiss/apply lifecycle, event history, and flags. |
| Cycle and symptom support | `[PARTIAL]` | Calendar phase calculation and blanket menstrual/luteal reductions exist; profile opt-in fields exist. Symptom table is unused. | `utils/cyclePhase.ts`, `app/(tabs)/profile/index.tsx`, `reports/migrations/010_cycle_symptom_logs.sql` | Make support hidden until opt-in, symptom-first, irregular-cycle tolerant, privacy-reviewed, and non-authoritative by default. |
| History and analytics | `[PARTIAL]` | Workout history, session detail, aggregate totals, and PR views exist with legacy table fallback. | `app/(tabs)/history.tsx`, `app/workout-history.tsx`, `utils/fetchExerciseHistory.ts` | Add readiness/workload trends, adaptation/deload history, plateau interpretation, sparse-data confidence, and chart accessibility. |
| Evidence and explanations | `[SCAFFOLDED]` | Registry, policy metadata, evidence types, and generator explanation payloads exist. No live screen consumes them. | `types/evidence.ts`, `constants/evidenceRegistry.ts`, `constants/adaptationPolicies.ts`, `utils/programGenerator.ts` | Add `EvidenceWhySheet`, `TodayAdjustmentSummary`, and keyed evidence routes; connect the same keys across live, planning, and education surfaces. |
| FAQ and Recovery Library | `[PARTIAL]` | Both routes render useful but static in-file content. | `app/faq.tsx`, `app/recovery-library.tsx` | Move content to shared evidence-backed modules and align claims with actual behavior. |
| Notifications | `[PARTIAL]` | Local permission, daily reminder, PR, deload, and test notifications exist. Preferences are stored in auth metadata. Reminder time is hardcoded to 08:00 despite time controls. Email/SMS settings have no delivery backend. | `utils/notifications.ts`, `app/(tabs)/profile/notifications.tsx` | Honor selected time/quiet hours, distinguish local push from unsupported channels, and add server delivery only if required. |
| Profile and settings | `[PARTIAL]` | Profile, personal information, readiness, cycle, theme/palette, notifications, privacy, and support surfaces exist. Several controls describe behavior that is not implemented. | `app/(tabs)/profile/*`, `contexts/ThemeContext.tsx` | Align copy with storage/integration reality, expose depth/evidence controls, and remove unsupported claims. |
| Privacy requests | `[SCAFFOLDED]` | UI writes export/deletion timestamps into auth metadata; no processor performs export or deletion. | `app/(tabs)/profile/privacy-data.tsx` | Add a real secure request workflow, audit log, status, and fulfillment path; do not claim completion on metadata write. |
| Support requests | `[SCAFFOLDED]` | UI writes request timestamps into auth metadata without issue content or a support processor. | `app/(tabs)/profile/help-support.tsx` | Implement a real support channel or relabel as unavailable; collect content and track delivery. |
| HealthKit | `[MISSING]` | Toggles and copy exist, but there is no package, entitlement, adapter, permission flow, or data reader. | `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, `app.json`, `package.json` | Hide behind a disabled flag until a real optional iOS adapter exists. Preserve Android/manual parity. |
| Feature flags | `[MISSING]` | No `constants/featureFlags.ts` or `utils/featureGate.ts` exists. | repository inventory | Implement before exposing readiness-v2, generator-v2, cycle-v2, evidence, deload, or integration behavior. |
| Theme and palette | `[WORKING-CODE]` | Dark/light/system preference and five persisted accent palettes are implemented through AsyncStorage. | `contexts/ThemeContext.tsx`, `constants/themes.ts`, `constants/palettes.ts` | Build shared UI primitives, audit contrast/dynamic type, and preserve user choice. |
| Shared design system | `[SCAFFOLDED]` | Theme tokens exist, but `components/ui/` contains only a small set of generic/template components. Most screens have large bespoke style blocks. | `components/ui/*`, screen files | Add the planned reusable screen, surface, metric, section, sheet, and bottom-action primitives. |
| Application identity and release config | `[MISSING]` | `app.json` still uses `temp-app` and `tempapp`; no production iOS bundle identifier or Android package is declared. | `app.json` | Set production identity, schemes, icons, entitlements, build profiles, privacy metadata, and release ownership. |
| Automated tests | `[MISSING]` | There is no test script and no application test files. | `package.json`, repository inventory | Add a pure TypeScript unit test layer first, then integration/component coverage and a documented manual device matrix. |

## Route-by-route status

| Route | Current role | Status | Important gap |
|---|---|---|---|
| `/` | Marketing/sign-in entry | `[WORKING-CODE]` | Production legal/trust links and final branding. |
| `/(auth)/join` | Supabase sign-up | `[WORKING-CODE]` | Email verification and error-state regression. |
| `/(auth)/login` | Supabase sign-in and onboarding redirect | `[WORKING-CODE]` | Reset-password completion path. |
| `/(auth)/forgot-password` | Email form only | `[MISSING]` | No reset call or callback. |
| `/(qsetup)/quick-setup` | Profile seed and first generator launch | `[PARTIAL]` | Wrong product emphasis; HealthKit is a placeholder. |
| `/(tabs)/home` | Today dashboard, readiness, next action | `[PARTIAL]` | Readiness-v2, real applied decision, evidence summary, calendar placeholder. |
| `/next-workout` | Session execution | `[WORKING-CODE]` | Overlay transparency, durable adaptation events, offline safety. |
| `/(tabs)/plan` | Active plan hub | `[WORKING-CODE]` | Rationale, editing model, generator-v2 explanation. |
| `/program-overview` | Full week/day prescription | `[WORKING-CODE]` | Volume targets, rationale, evidence entry, plan-version context. |
| `/create-program` | Manual editor | `[WORKING-CODE]` | Advanced-only positioning and context snapshot. |
| `/archived-programs` | Restore inactive programs | `[PARTIAL]` | Only `last_active_week` is snapshotted; no day/date/version state. |
| `/(tabs)/history` | Sessions and PRs | `[WORKING-CODE]` | Interpreted adaptive analytics. |
| `/workout-history` | Alias to History | `[WORKING-CODE]` | Decide whether alias remains necessary. |
| `/(tabs)/profile` | Account/settings hub | `[PARTIAL]` | Unsupported HealthKit/local-storage claims and missing depth/evidence controls. |
| `/(tabs)/profile/personal-information` | Profile data editing | `[IMPLEMENTED-UNVERIFIED]` | Full validation and privacy regression. |
| `/(tabs)/profile/notifications` | Local notification preferences | `[PARTIAL]` | Selected reminder time/quiet hours/email/SMS not honored end-to-end. |
| `/(tabs)/profile/privacy-data` | Preference and request metadata | `[SCAFFOLDED]` | No actual export/deletion processor. |
| `/(tabs)/profile/help-support` | FAQ and request metadata | `[SCAFFOLDED]` | No actual ticket/contact processor. |
| `/faq` | Static education | `[PARTIAL]` | Not registry-backed; some claims describe incomplete behavior. |
| `/recovery-library` | Static recovery modules | `[PARTIAL]` | Not registry-backed or personalized. |
| `/evidence/[key]` | Planned evidence deep link | `[MISSING]` | Create route and invalid-key fallback. |

## Data and security status

| Data surface | Repository state | Runtime use | Security/verification state |
|---|---|---|---|
| `user_profile` | Existing schema plus migration 007 additions | Broadly used | Live columns and policies must be verified. |
| `user_adaptation_preferences` | Migration, TypeScript types, and deployed ownership policies exist | Onboarding/profile read/write compatibility | Four authenticated ownership policies verified live; application smoke remains. |
| `evidence_display_preferences` | Migration, TypeScript types, and deployed ownership policies exist | Onboarding seeds defaults only | Four authenticated ownership policies verified live; no consumer UI yet. |
| `readiness_logs` | Legacy table in schema reference | Active Home and Next Workout source | Must remain during compatibility window. |
| `readiness_checkins` | Migration, types, and deployed ownership policies exist | Unused | Four authenticated ownership policies and cross-user denial verified live. |
| `cycle_symptom_logs` | Migration, types, and deployed ownership policies exist | Unused | Sensitive rows are isolated by four authenticated ownership policies verified live. |
| `program_generation_context` | Migration, types, required save writer, and deployed linked-ownership policies exist | Active for generated programs | Valid owned insert and cross-user program denial verified in a rolled-back live test; full app smoke remains. |
| `adaptation_events` | Migration, types, and deployed linked-ownership policies exist | Unused | Four policies plus linked-record ownership checks verified live. |
| `deload_recommendations` | Migration, types, and deployed linked-ownership policies exist | Unused | Four policies plus program ownership checks verified live. |
| `programs`, `program_days`, `program_day_exercises` | Existing schema and active code | Core program flow | Multi-table operations are client-orchestrated and not fully transactional. |
| `workout_sessions`, `workout_exercise_sets`, `personal_records` | Existing schema and active code | Core workout/history flow | Finish flow uses multiple client writes; retry/idempotency needs hardening. |
| `avatars` storage | Active upload/public URL flow with stable owner path | Profile avatar | Intentionally public JPEG bucket; 2 MiB limit and complete owner policies deployed. |

## Confirmed code defects or misleading behavior

These are implementation facts, not optional redesign ideas:

1. `app/(auth)/forgot-password.tsx` shows a submit path without sending a reset email.
2. `app/(qsetup)/quick-setup.tsx` marks HealthKit connected without requesting permission or reading data.
3. `app/(tabs)/profile/index.tsx` exposes Apple Health auto-fill language although no integration exists.
4. `app/(tabs)/profile/index.tsx` says health data is stored locally even though readiness/profile data is written to Supabase.
5. `hooks/useCurrentProgram.ts` keeps `applyReadinessAdjustmentOnly` as a no-op while Home says the adjustment will be applied.
6. `app/next-workout.tsx` changes displayed load/RPE without persisting an explicit recommendation or user decision.
7. `utils/programGenerator.ts` schedules every fourth week as a deload, conflicting with the target reactive-default policy.
8. `utils/progressionEngine.ts` permits high-readiness load increases and PR framing without the planned safety/state model.
9. Notification scheduling uses a fixed 08:00 reminder; selected time and quiet-hour preferences are not applied.
10. Privacy and support actions only update auth metadata; no export, deletion, or support delivery process exists.
11. `app.json` still contains temporary application identity.
12. Resolved 2026-08-03: migration 015 adds and live verification proves Phase 2 RLS ownership policies.

## Planned file map

The following paths are the currently approved additions. Exact implementation may consolidate files when a clearer existing owner is found.

| Capability | Planned files | Existing files to modify |
|---|---|---|
| Feature gating | `constants/featureFlags.ts`, `utils/featureGate.ts` | `app/_layout.tsx`, affected screens and services |
| Shared UI | `constants/uiTokens.ts`, `components/ui/AppScreen.tsx`, `components/ui/SurfaceCard.tsx`, `components/ui/SectionHeader.tsx`, `components/ui/MetricTile.tsx`, `components/ui/BottomActionBar.tsx` | `constants/themes.ts`, primary screens |
| Trust UI | `components/EvidenceWhySheet.tsx`, `components/TodayAdjustmentSummary.tsx`, `app/evidence/[key].tsx` | Home, Next Workout, Program Overview, FAQ, Recovery Library |
| Readiness v2 | `utils/readinessEngine.ts`, `utils/adaptationEventService.ts` | Home, Next Workout, `hooks/useCurrentProgram.ts`, `types/database.ts` |
| Cycle support v2 | `utils/cycleAdaptation.ts`, optional cycle check-in component | Profile, Home, Next Workout, FAQ |
| Generator v2 | `utils/splitRecommendation.ts`, `utils/volumeTargets.ts`, optional catalog generator script | `utils/programGenerator.ts`, Generate Program, Plan, Program Overview, save flow |
| Progression/deload | `utils/deloadEngine.ts`, optional `utils/progressionService.ts` | progression engine, current-program hook, Next Workout, History, notifications |
| Analytics | `utils/analyticsSelectors.ts`, reusable trend components | History and workout detail |
| Recovery content | `constants/recoveryProtocols.ts` | FAQ, Recovery Library |
| Auth completion | optional reset callback route | Forgot Password, root link configuration |
| Data services | optional `services/` modules or focused `utils/*Service.ts` files | large screen-level Supabase callers |
| Database safety | new additive RLS/policy migration and optional RPC migrations | migrations 008–014 documentation, schema reference |
| Tests | test configuration plus `__tests__/*.test.ts` | `package.json` |
| Release | `eas.json` if EAS is selected | `app.json`, README/setup documentation |

## Definition of complete

AdaptivPush is not complete merely because every route renders. Completion requires:

- every primary promise to be backed by real logic or explicitly labeled as unavailable;
- all sensitive tables to have verified ownership policies;
- all adaptive decisions to be explainable, conservative, and user-controlled;
- program generation, workout completion, progression, archive/restore, and compatibility paths to survive regression tests;
- Essential, Guided, and Advanced modes to materially change complexity and explanation depth;
- dark, light, and system themes to pass accessibility and state checks;
- support, privacy, password recovery, notifications, and app identity to be production-real;
- feature flags and rollback paths to exist before behavioral rollout;
- pure domain engines to have automated tests and critical mobile flows to have a documented device regression record.
