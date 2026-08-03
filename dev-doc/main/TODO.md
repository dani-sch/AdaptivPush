# Active TODO

## [ACTIVE] `F5-S1`

- [ACTIVE] Compare live Supabase tables, columns, constraints, indexes, and migration history with migrations 001-014 and `lib/adaptivpush_database_schema.md`.
- [ACTIVE] Prove RLS and user ownership isolation for every Phase 2 table; prepare an additive policy migration where coverage is missing.
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

- [BLOCKED] Live schema/RLS conclusions require access to the target Supabase project and two test identities.
- [BLOCKED] HealthKit library selection requires a focused Expo 54 native compatibility spike and is intentionally deferred.
