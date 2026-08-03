# Active architecture summary

## Runtime shape

AdaptivPush is a client-heavy Expo Router mobile application backed by Supabase. Most routing, orchestration, program generation, adaptation overlays, workout logging, settings, and presentation logic currently run in the React Native client.

| Layer | Current implementation | Direction |
|---|---|---|
| App shell | `app/_layout.tsx`, route groups under `app/(auth)`, `app/(qsetup)`, and `app/(tabs)` | Preserve route shell; add explicit evidence/reset routes as needed. |
| Authentication | Supabase Auth in auth screens and root session gate | Complete password-reset/deep-link flow and production error states. |
| UI | Screen files in `app/`; reusable pieces in `components/` | Extract shared mobile primitives without replacing theme behavior. |
| Theme | `contexts/ThemeContext.tsx`, `constants/themes.ts`, `constants/palettes.ts` | Preserve dark/light/system and user palette selection. |
| Active program | `hooks/useCurrentProgram.ts` | Split data access and domain actions as v2 behavior lands. |
| Generator | `utils/programGenerator.ts`, `constants/programDefaults.ts`, `lib/exerciseDatabase.ts` | Add split/volume recommendation modules and a canonical catalog-sync path. |
| Program persistence | `utils/saveProgramToDb.ts` | Preserve output compatibility; improve transaction/retry behavior. |
| Readiness/progression | Home, Next Workout, `utils/progressionEngine.ts`, `utils/cyclePhase.ts` | Move decisions into tested readiness, cycle, progression, and deload engines. |
| Workout/history | `app/next-workout.tsx`, `app/(tabs)/history.tsx`, workout tables | Add idempotency, adaptation events, and interpreted analytics. |
| Preferences | `utils/profilePreferences.ts`, profile subroutes, auth metadata, Phase 2 tables | Migrate coaching-critical state into owned tables while retaining compatibility. |
| Evidence | `types/evidence.ts`, evidence/policy constants, generator metadata | Add keyed evidence route and shared trust components. |
| Notifications | `utils/notifications.ts`, profile notification screen | Make selected schedule/quiet hours real; do not imply unsupported delivery channels. |
| Backend | Supabase Auth, Postgres, Storage through `utils/supabase.ts` | Verify RLS, isolate user data, and use RPC/transaction patterns where needed. |

## Important current seams

1. `hooks/useCurrentProgram.ts` is the central active-program mutation seam and the highest-risk refactor point.
2. `app/(tabs)/home.tsx`, `app/next-workout.tsx`, and `app/(tabs)/profile/index.tsx` are oversized feature surfaces with embedded data and domain logic.
3. `utils/programGenerator.ts` is pure enough to test but uses randomness and the 55-entry local exercise catalog.
4. Readiness is stored in legacy `readiness_logs`; `readiness_checkins` is scaffolded but unused.
5. Day-of readiness/cycle behavior is a display-only overlay and has no durable recommendation event.
6. Generated-program saves require `program_generation_context`; other Phase 2 event tables are not yet active.
7. Multi-table program and workout writes are client-orchestrated and require stronger recovery/idempotency guarantees.

## Data ownership boundary

User-owned Supabase tables must enforce `auth.uid() = user_id` or an equally strict ownership relationship. Migrations 008-014 in the repository do not include RLS enablement or policies, so live verification and an additive policy migration are part of `F5-S1`.

Sensitive domains include profile data, readiness, cycle symptoms, injury considerations, adaptation events, workouts, and program context. HealthKit remains outside the active architecture until a real, optional, flag-gated adapter is selected.

## Canonical product references

- product/technical contract: `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`
- stable stage ledger: `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md`
- code-backed capability status: `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md`
- detailed database reference: `lib/adaptivpush_database_schema.md`, subject to live verification
