# FABLE-5 live Supabase audit — 2026-08-03

## Scope and authority

Target project: `thfxcvxcsfvrzdysdnkq` (`AdaptivPush`, production branch).

This is the signed execution record for `F5-S1.1` and `F5-S1.2`. It records
facts queried from the live database, migrations applied during remediation,
and remaining release-process prerequisites. It contains no credentials or
user data.

## Final live result

| Surface | Result | Evidence |
|---|---|---|
| Phase 2 tables | pass | All seven tables exist with required columns, constraints, and indexes. |
| Phase 2 RLS | pass | RLS enabled; four authenticated ownership policies per table. |
| Cross-user isolation | pass | Owned insert/select succeeded; cross-user select/update/delete/insert and cross-program linkage were denied in a rolled-back two-user test. |
| Core-table RLS | pass | Existing user-owned tables retained scoped ownership policies. |
| Exercise catalog | pass with known coverage gap | 1,369 rows; `exercisedb_id` column/index deployed; 1,318 rows backfilled from image URLs. The remaining 51 rows have no parseable image ID. |
| Avatar storage | pass for current product contract | Public avatar delivery retained intentionally; authenticated writes are restricted to the caller's UID folder, JPEG only, 2 MiB maximum, with select/insert/update/delete owner policies. |
| Workout check-in relationship | pass/legacy | `workout_sessions.checkin_id` references `readiness_logs(id)`; future readiness-v2 linkage must use an additive `readiness_checkin_id`. |
| Phase 2 data | expected empty state | All seven Phase 2 tables returned to zero rows after verification; test data was rolled back. |

## Applied remediation

| Migration/file | Live action |
|---|---|
| `reports/migrations/015_phase2_rls_policies.sql` | Enabled RLS and deployed four ownership policies per Phase 2 table, including linked program/record checks. |
| `reports/migrations/016_avatar_storage_hardening.sql` | Added bucket limits and complete owner lifecycle policies. |
| `reports/migrations/017_exercises_exercisedb_id_repair.sql` | Added/backfilled/indexed `exercises.exercisedb_id`. |
| `utils/uploadAvatar.ts` | Changed future avatar writes from timestamped objects to stable `<uid>/avatar.jpg` upserts. |
| `reports/migrations/verification/015_phase2_rls_isolation_test.sql` | Added a reusable two-identity, transaction-rolled-back isolation proof. |

Live verification after deployment returned:

- policy counts: four for each Phase 2 table;
- avatar bucket: public, 2,097,152-byte limit, `image/jpeg` only;
- avatar owner policies: four;
- avatar objects: 19 total, 3 referenced by profiles, 16 historical unreferenced timestamped objects; future writes now use a stable path, while deletion of the 16 existing objects requires explicit destructive-action confirmation;
- exercise catalog: 1,369 total, 1,318 with `exercisedb_id`;
- post-test Phase 2 row counts: zero for every table.

## Historical migration drift

Migrations 007–014 were applied through Dashboard SQL snippets. The project did
not have `supabase_migrations.schema_migrations`, so the Dashboard correctly
reported no managed migration history.

Additional comparison findings:

- migration 003 is present live as `programs.last_active_week`;
- migration 005 was skipped live and is superseded by remediation migration 017;
- migration 006 is present live;
- migration 001 was not applied and must remain **superseded**, not deployed: it
  references the absent `workout_history` table and duplicates the working
  `workout_exercise_sets` model.

Do not manually create or populate Supabase's internal migration table. The
supported repair path is:

1. install and authenticate the Supabase CLI;
2. run `supabase link` for project `thfxcvxcsfvrzdysdnkq`;
3. run `supabase db pull` to establish a timestamped baseline under
   `supabase/migrations/`;
4. compare the baseline with migrations 001–017;
5. use `supabase migration repair --status applied <timestamp>` only after the
   pulled schema and repository files agree;
6. deploy all future schema changes with `supabase db push`, not Dashboard SQL.

This normalization requires a persistent Supabase access token. Token creation
requires action-time authorization because it creates a reusable project
credential.

## Backup gate

The project is on the Supabase Free plan and the Dashboard reports no managed
backups. This cannot be changed without a billing/capability decision. Before a
production release, choose one of:

- upgrade to a plan with the required managed backup/PITR capability; or
- approve, credential, schedule, encrypt, and restore-test an external
  `pg_dump` backup workflow.

Until then, migrations remain additive and destructive data migrations are a
release blocker.

## Remaining `F5-S1` work

Database structure and ownership isolation are closed. The remaining stage work
is application-level compatibility validation:

- new-user Quick Setup writes all three preference/profile surfaces;
- legacy users without Phase 2 rows remain usable;
- profile dual-read/dual-write behavior works;
- full generated-program save creates its context row and cleanup handles a
  failed context save;
- results are recorded in `dev-doc/reports/DEV-LOG.md`.
