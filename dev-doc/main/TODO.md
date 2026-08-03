# Active TODO

## [ACTIVE] `F5-S1`

- [COMPLETE] Compare live Supabase tables, columns, constraints, and indexes with migrations 001-014 and `lib/adaptivpush_database_schema.md`; drift is recorded in the 2026-08-03 live audit.
- [COMPLETE] Add and deploy migration 015 and prove two-user RLS ownership isolation for every Phase 2 table with a rolled-back verification script.
- [COMPLETE] Harden the avatar bucket contract and repair the deployed `exercises.exercisedb_id` column/index.
- [ACTIVE] Run new-user onboarding writes for `user_profile`, `user_adaptation_preferences`, and `evidence_display_preferences`.
- [ACTIVE] Run legacy/missing-row profile read and dual-write compatibility checks.
- [ACTIVE] Verify generated-program save creates `program_generation_context` and failure cleanup behaves as documented.
- [ACTIVE] Keep the FABLE-5 master, execution register, code status snapshot, and living docs synchronized.

## [NEXT] `F5-S2`

- [NEXT] Add deterministic in-repo feature flags with all behavioral v2 flags off by default.
- [NEXT] Add a minimal pure TypeScript test runner and initial feature-gate tests.
- [NEXT] Implement shared screen, surface, section, metric, bottom-action, loading, empty, and error primitives.
- [NEXT] Verify Home, Plan, and Profile with flags off across dark/light/system modes.

## [QUEUED]

- [QUEUED] Execute `F5-S3` onboarding/profile completion.
- [QUEUED] Execute `F5-S4` generator-v2 and plan transparency.
- [QUEUED] Execute `F5-S5` readiness-v2 and explicit day-of coaching.
- [QUEUED] Execute `F5-S6` workout durability, progression, plateau, and deload.
- [QUEUED] Execute `F5-S7` analytics, evidence, FAQ, and Recovery Library integration.
- [QUEUED] Execute `F5-S8` password reset, real privacy/support operations, production identity, accessibility, release, and optional HealthKit.

## [BLOCKED]

- [BLOCKED] Supabase CLI history normalization requires a project access token and a deliberate `db pull`/`migration repair` baseline; do not fabricate the internal migration ledger from Dashboard SQL.
- [BLOCKED] Automated Supabase backups are unavailable on the current Free plan; production release requires a paid backup capability or an approved external backup job.
- [BLOCKED] Deleting 16 historical unreferenced avatar objects requires explicit destructive-action confirmation; stable-path uploads prevent new accumulation.
- [BLOCKED] HealthKit library selection requires a focused Expo 54 native compatibility spike and is intentionally deferred.
