# AdaptivPush AP-01.3a enablement evidence — 2026-09-10

## Packet and evidence boundary

This artifact records the bounded AP-01.3a local enablement packet at repository
base `b04f366` on feature branch `adaptivpush-refactor`. It establishes the
supported local Supabase project structure, pins the CLI, rechecks the hosted
project identity/capability state, documents exact command effects, and prepares
the authorization, backup, restore, and isolated-test checklists.

No Supabase login, token creation, database-password reset, project link, schema
pull, migration-list query, migration repair, dump, backup, restore, SQL query,
seed, policy/grant change, isolated write test, production write, deployment,
plan upgrade, or integration action was performed. AP-01.3a remains in progress;
this packet removes local CLI ambiguity but does not claim a baseline or restore.

Owner routes remain the AP-01 routes: security-agent for database authority,
review-agent for the combined baseline/restore boundary, and an explicitly named
human operator for credentials, backup custody, and recovery approval.

## Entry-state reinspection

| Check | Current observation |
|---|---|
| Branch / HEAD | Clean `adaptivpush-refactor` at `b04f366`; five commits ahead of `origin/main` before this packet. |
| Worktrees / remotes | One worktree; only `origin` is configured. No `integrator` remote, clone, or worktree exists. |
| Existing database tools | `supabase`, `psql`, `pg_dump`, and `pg_restore` were absent from `PATH`. Node `24.14.0`, npm `11.9.0`, Docker CLI `29.4.3`, Ruff, and pytest were present. |
| Docker | Docker Desktop is installed, but the Linux engine was not running; no container or image was started. |
| Environment key names | Process environment had no Supabase/PostgreSQL credential variables. Ignored `.env` contains `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `RAPIDAPI_KEY`, and `SUPABASE_SERVICE_KEY`; values were not printed. It does not contain a CLI access token or database password. |
| Production identity | Dashboard: `AdaptivPush`, project ref `thfxcvxcsfvrzdysdnkq`, branch `main`, environment `PRODUCTION`, plan `FREE`, region `us-east-1`. |
| Database version | Dashboard service version: PostgreSQL `17.6.1.063`; `17.6.1.166` was offered as an upgrade. No upgrade was started. |
| Managed migration state | The dashboard still shows “Run your first migration” and the link command for this project. |
| Managed backup state | Free Plan still reports that project backups are not included; Pro is advertised with up to seven days of scheduled backups. |

The dashboard rendered the database-password reset control disabled. The current
browser session therefore proves project visibility, not credential ownership or
authority to reset the database password.

## Supported local tooling result

| Tool / surface | Pinned result | Rationale and limit |
|---|---|---|
| Supabase CLI | Exact dev dependency `supabase@2.117.0`; `npx supabase --version` returned `2.117.0`. | Supabase recommends a project-local pinned dependency and requires Node 20 or later. No global CLI install is required. |
| Supabase project | `npx supabase init` created `supabase/config.toml` and `supabase/.gitignore`. | This is local configuration only. The project is not linked. |
| PostgreSQL major | `supabase/config.toml` sets `db.major_version = 17`, matching production PostgreSQL 17. | `pg_dump` cannot dump a server newer than its own major, so any external `pg_dump`, `pg_restore`, or `psql` path must use PostgreSQL 17. |
| PostgreSQL client pin | Required client line: PostgreSQL `17.6` tools, or the exact `postgres:17.6-bookworm` client container after image review. | Client binaries are not installed and Docker is not running, so this is a selected compatible version, not provisioned executable proof. |

Primary references:

- [Supabase CLI installation](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase CLI command reference](https://supabase.com/docs/reference/cli/supabase-db)
- [Supabase local workflow and command effects](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase CLI password-based authentication fallback](https://supabase.com/docs/guides/troubleshooting/supabase-cli-failed-sasl-auth-or-invalid-scram-server-final-message)
- [Supabase CLI backup/restore workflow](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [PostgreSQL 17 `pg_dump` compatibility](https://www.postgresql.org/docs/17/app-pgdump.html)

Tooling commit: `96ba874` (`chore(database): pin supabase baseline tooling`).
Evidence/status commit: `e426766` (`docs(adaptivpush): prepare AP-01.3 baseline gates`).

## Command-effect review

| Command | Local effect | Remote effect / safety classification | Decision for this packet |
|---|---|---|---|
| `npx supabase link --project-ref thfxcvxcsfvrzdysdnkq` | Associates the repository with the selected hosted project, fetches and validates project configuration, and may store the database password in native credential storage when supplied. | In the passwordless access-token flow the CLI can initialize/rotate the temporary `cli_login_postgres` role through the Management API. Supplying an existing database password uses the password-based path, but link is still treated as a potentially remote role/credential action. | Not run; credential owner, existing database password, and explicit link authorization are missing. |
| `npx supabase db pull <name>` | Requires Docker for migration mode, starts a local PostgreSQL shadow/diff container, and writes a timestamped file under `supabase/migrations/`. | Reads the selected database and may insert the generated version into `supabase_migrations.schema_migrations`. With no current application ledger, accepting the prompt may establish that ledger. | Not run. Run interactively only after authorization; answer `n` to the remote-history prompt during baseline review. Never use `--yes`. |
| `npx supabase db pull --declarative` | Replaces the local declarative schema tree and does not create a migration. | Documentation says it does not update migration history. | Not selected because D-12 and the AP-01 plan require a timestamped baseline migration. |
| `npx supabase migration repair <version> --status applied` | No application schema SQL is executed. | Inserts a version record in the selected database migration-history table. | Remote mutation; prohibited until semantic equivalence and exact version mapping are reviewed and separately authorized. |
| `npx supabase migration repair <version> --status reverted` | No application schema SQL is reverted. | Deletes the selected version record from the migration-history table. | Remote mutation; prohibited without the same review and authorization. |
| `npx supabase db dump` | Runs Supabase-filtered `pg_dump` through Docker and writes requested role/schema/data files. | Reads the selected database; it does not establish restore readiness until the encrypted artifacts are restored and compared in isolation. | Not run; Docker engine, credential owner, backup choice, custody details, and isolated target are missing. |
| `npx supabase db reset --linked` | Replays local migration state against the linked target. | Destructively drops and rebuilds user-created remote entities. | Prohibited for production and not part of AP-01.3a. |

## Baseline runbook after credential authorization

Preconditions, all required:

1. Name the human credential operator and reviewer.
2. Supply an existing Supabase personal access token and database password through
   an approved secret channel. Do not use the service-role key as either value.
   Set `SUPABASE_DB_PASSWORD` in the operator session so link uses the existing
   password-based path instead of requesting a passwordless temporary login role.
3. Start the reviewed Docker engine and verify the pinned CLI still reports
   `2.117.0`.
4. Reconfirm the source as `thfxcvxcsfvrzdysdnkq` / Production and confirm that
   the migration page still has no managed application history.
5. Authorize the link operation, including its project association, credential
   storage, platform reads, and any observed temporary-role effect. Explicitly
   withhold migration-history changes until equivalence review.

Reviewable command sequence:

```powershell
npm ci
npx supabase --version
npx supabase link --project-ref thfxcvxcsfvrzdysdnkq
npx supabase db pull adaptivpush_baseline_YYYYMMDD
```

At the `db pull` prompt, answer `n` to “Update remote migration history table?”
Capture stdout/stderr with credentials redacted. Then record the generated path
and SHA-256:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'supabase\migrations\<generated-baseline>.sql'
```

Before any repair, compare the file with current server metadata,
`lib/adaptivpush_database_schema.md`, and retained SQL 001–017. The comparison
must preserve these rules:

- migration 001 remains superseded and is never represented as applied;
- migration 005 remains historically skipped and is not double-counted with 017;
- dashboard SQL remains provenance, not fabricated managed history;
- every column/default/nullability, constraint and FK action, index, function and
  search path, RLS/force state, policy role/expression, table/schema/sequence/routine
  grant, storage policy/configuration, and catalog count difference is enumerated;
- generated diff noise is reviewed rather than assumed correct; and
- a proposed repair maps only the approved baseline timestamp and records the
  reviewer, exact command, before/after history, and authorization.

## Backup choice requiring a named decision

| Field | Managed physical backup option | Encrypted external logical option |
|---|---|---|
| Platform action | Upgrade to at least Pro; decide whether seven-day daily physical backups are sufficient or approve the PITR add-on and retention. | Keep the current plan; run the pinned Supabase CLI logical export through a reviewed Docker engine. |
| Required owner | Billing/organization owner plus recovery owner. | Credential operator, encryption-key owner, artifact access owner, retention/deletion owner, and recovery owner. |
| Artifact | Supabase-managed physical recovery point. | Separate `roles.sql`, `schema.sql`, and `data.sql` (`--use-copy --data-only`) files, encrypted immediately as one archive. Storage vector tables use the documented exclusions when present. |
| Checksum | Record platform recovery point identity and exported evidence checksum where available. | Record SHA-256 of each plaintext file before encryption and the encrypted archive; do not retain plaintext after the approved secure packaging procedure. |
| Restore proof | Restore to a new, separate project; never restore over production. | Restore with PostgreSQL 17 `psql --single-transaction --variable ON_ERROR_STOP=1` into a separate project; never production. |
| Current blocker | No plan/billing authorization, retention/RPO/RTO choice, or isolated target. | Docker engine unavailable; no credential/custody/encryption/retention owners or isolated target. |

If the external option is selected, use the official three-part dump shape:

```powershell
npx supabase db dump --project-ref thfxcvxcsfvrzdysdnkq -f '<secure-temp>\roles.sql' --role-only
npx supabase db dump --project-ref thfxcvxcsfvrzdysdnkq -f '<secure-temp>\schema.sql'
npx supabase db dump --project-ref thfxcvxcsfvrzdysdnkq -f '<secure-temp>\data.sql' --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes'
```

The operator must supply credentials without placing secrets in the command,
repository, transcript, or artifact names. The encryption format, recipient/key,
storage destination, access list, retention period, and plaintext cleanup method
must be approved before the first dump. A compressed or custom dump is not
encryption by itself.

## Isolated target and restore checklist

Source identity is fixed as AdaptivPush Production
`thfxcvxcsfvrzdysdnkq`. Target identity remains unset. The target must have a
different project reference/database endpoint and must be approved for destructive
restore/setup and synthetic multi-user tests.

Record before execution:

- target name, project ref, region, plan, PostgreSQL/server version, owner, and
  deletion/retention disposition;
- explicit confirmation that the target is not production and contains no data
  that must be preserved;
- source and target credential owners, without credential values;
- backup artifact checksums, encryption/access/retention owners, capture time,
  restore start/end/duration, errors, retries, and exact commands; and
- approved RPO/RTO and reviewer.

After restore, compare:

- schemas/tables/columns/defaults/nullability and row counts;
- constraints, FK actions, indexes, extensions, functions, trigger definitions,
  function owners/security/search paths, and exposed routines;
- RLS enabled/forced state, policy commands/roles/qualifiers/check expressions,
  role membership, and schema/table/sequence/routine grants;
- Storage buckets, policies, MIME/size/public settings, and the fact that database
  backup does not include Storage object bodies;
- catalog totals, external-ID coverage/duplicates, normalized-name collisions,
  and local resolver coverage; and
- application smoke behavior with the restored target.

## Isolated compatibility and security matrix

Only run these after the isolated target is named and restore/setup writes are
authorized. Label the evidence “isolated integration tests,” never read-only.

1. Deny `anon` and ordinary authenticated INSERT/UPDATE/DELETE/TRUNCATE/
   REFERENCES/TRIGGER catalog capabilities after the reviewed enforcement
   migration; preserve intended SELECT.
2. Prove trusted catalog curation through the separately authenticated admin path.
3. Save one valid generated program with the lookup-only client.
4. Prove unresolved catalog identity fails before any program mutation.
5. Run two-owner parent/child and cross-program FK/policy denial fixtures.
6. Deny cross-owner Storage writes and verify intended owner lifecycle behavior.
7. Record old-client behavior after catalog restriction and actionable recovery.
8. Exercise new, legacy, missing-relation, and missing-column compatibility.
9. Compare restore integrity and rerun the nine deterministic catalog cases.
10. Complete actual Expo Quick Setup/Profile/Generate Program UI evidence on a
    supported device or simulator.

## AC-TR and universal-gate disposition

| Row / gate | 2026-09-10 result |
|---|---|
| AC-TR-001 | Partial: CLI/version/config and exact baseline command effects are established; baseline pull, semantic comparison, backup, and isolated restore remain open. |
| AC-TR-002 | No change: lookup-only client is locally verified; live denial and trusted curation remain isolated/production-gated. |
| AC-TR-003 | Open for fresh isolated two-owner and Storage writes. |
| AC-TR-004 | Open for device and missing-schema runtime evidence. |
| AC-TR-005 | Preserved; no legacy FK reinterpretation or schema action occurred. |
| AC-TR-006 | No catalog data changed; current resolver evidence remains the 2026-09-09 result. |
| AC-TR-007 | Satisfied for the local tooling distinction: generated config is existing local infrastructure; no application schema was proposed or applied. |
| G-01 | Entry branch/HEAD/worktree/remotes/tools and owned files were reinspected. |
| G-02–G-06 | No training persistence, entitlement/privacy, offline, or UI behavior changed. Their AP-01.3 evidence remains open. |
| G-07 | `npm run test:catalog`: 9 passed; `npm run lint`: 0 errors/17 pre-existing warnings; `npx tsc --noEmit`: passed; `npx supabase --version`: `2.117.0`; `git diff --check`: passed. |
| G-08 | Integration remains unavailable; no integrator, isolated target, restore proof, or Expo device. |
| G-09 | No rollout. Baseline repair, catalog enforcement, and production deployment remain gated. Unsafe permissive catalog writes are not a rollback. |
| G-10 | This artifact records current commands, environment, result limits, tooling commit, and exact next gates. |

`npm install` reported 44 dependency-audit findings (2 low, 21 moderate, 19
high, 2 critical). No audit fix was run because dependency remediation is outside
this bounded database-tooling packet and forced fixes could change application
behavior.

## Exact next executable packet

**AP-01.3b — authorized baseline capture and backup/target decision** becomes
executable when all of the following are supplied:

1. the named Supabase credential operator plus existing access token and database
   password through a non-repository secret channel;
2. authorization to link with the existing database-password path and run
   `db pull` while answering `n` to remote history update;
3. a managed-backup decision or approval of the encrypted external workflow with
   named encryption/access/retention/recovery owners; and
4. a distinct isolated target identity and authorization for restore/setup writes.

Integrator configuration and an Expo-capable device remain later AP-01.3
integration/compatibility gates. Migration repair, catalog enforcement, production
deployment, and release still require separate concrete authorization after the
baseline and restore evidence pass.
