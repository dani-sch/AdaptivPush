# AdaptivPush current state

## Planning and code posture

- Neutral [plan index](/dev-doc/plans/active/PLAN-INDEX.md) routes the approved product contract and supporting owners.
- AP-01.1 captured current read-only database/repository evidence. AP-01.2a locally implements lookup-only generated/dev saves, explicit source/exact identity, UUID-guarded swaps, and administrator-only seed code.
- AP-01.3a local enablement pins Supabase CLI `2.117.0` and initializes `supabase/config.toml` for PostgreSQL 17. No CLI link, baseline, ledger action, dump, restore, database mutation, deployment, integration, or release occurred.
- AP-01.3b preflight resumed at expected HEAD `19e2747` and stopped before remote action: the intake left all authorization/operator fields incomplete, required credentials/backup ownership/isolated target are absent, and Docker's Linux engine could not be started from this session. The unrelated untracked `tools/build_adaptivpush_business_plan.py` file was present at entry and absent by staging; no task command targeted it.
- Exact next packet: AP-01.3b authorized baseline capture plus the backup and isolated-target decision. It requires the recorded access/capability decisions before server policy work.
- Working source paths exist for auth, program creation/loading, set logging/history/PRs, archive UI, local notifications and theme/palette. End-to-end durability, dated schedules, progression authority and adaptation remain partial or missing.
- Evidence/policy constants and additive preference/context/event schema are existing foundations. Feature flags, application test script, durable outbox, explicit proposal lifecycle, precise equipment profiles and optional public/health/commerce workflows are missing.
- Exact facts/defects: [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md).

## Historical evidence retained

August 3 records describe schema/constraints/indexes/storage/external exercise-ID remediation and two-user isolation for the additive preference/event tables. A later authenticated synthetic-user run on that date records Quick Setup three-surface writes, missing-row preference resolution, readiness/cycle dual-writes, actual generated-context creation, injected context-failure cleanup and restoration of the prior active program. Those user-added results are retained in the development log and archive snapshots. They are not new measurements or proof of the full save transaction.

The September 9 AP-01.1 read-only packet confirms RLS enabled without force on all 16 public tables. Both `anon` and `authenticated` have all table privileges on `exercises`, and its four `TO public` policies are unconditional. No write probe was performed or relabeled as read-only. Current catalog counts are 1,369 rows, 51 missing external IDs, zero duplicate non-null exact external IDs, and 17 normalized-name collision groups. [The AP-01 artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-09.md) owns the full current observation.

## Open gates

Actual Quick Setup/Profile/Generate Program UI on an Expo-capable simulator/device and runtime missing-relation/column fallback remain open. The attempted historical web fallback failed on AsyncStorage `window` access before browser authentication and is not device evidence. Core parent constraints/policy lineage were inspected read-only, but fresh two-owner writes remain open. The application managed ledger is absent; retained SQL 001–017 is reconciled to current end state but not normalized into supported history. The Free production project has no scheduled backup, PITR, or restore-to-new-project capability, and no successful isolated restore exists.

`git worktree list` still shows this checkout only; the documented `integrator` actor is not configured here. Integration needs configuration or an explicitly approved alternative. The project-local Supabase CLI is now pinned and initialized. Docker Desktop is installed but its Linux engine is not running; standalone `psql`, `pg_dump`, and `pg_restore` remain absent. No credential owner, backup decision, isolated project, or Expo device is available. Historical unreferenced avatar objects remain outside scope and were not deleted.

Current read-only compatibility checks resolved 52 of 52 persistable local
catalog entries and all six developer-fixture names. `barbell-clean` and
`dumbbell-thruster` have no unambiguous current catalog identity and are excluded
from persisted generator/swap candidates rather than guessed or client-created.
Live catalog grants/policies remain permissive until the compatible client and
AP-01.3 gates are independently verified.

## Verification limits and controls

Available app static gate is `npm run lint`; broader application tests remain absent. AP-01.2a adds `npm run test:catalog` with nine passing deterministic cases; strict types and lint also pass. AP-01.3a additionally verifies the pinned CLI and local config only. No baseline/restore/write-isolation/device/integration/release/fitness/legal/purchase/moderation gate closes from local verification. Keep new behavior off until its deterministic flags and compatibility gates exist. Rollback must not restore known unsafe catalog writes, hidden high-readiness escalation or false completion. Preserve legacy records, accepted artifacts, free manual parity, dark/light/system/palettes and opt-in symptom privacy.

[DEV-LOG](/dev-doc/reports/DEV-LOG.md) records executed evidence; [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md) and [register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) own future gates.
