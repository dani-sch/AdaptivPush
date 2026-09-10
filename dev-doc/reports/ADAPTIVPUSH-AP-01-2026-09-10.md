# AdaptivPush AP-01.3 database-foundation evidence — 2026-09-10

## Packet and evidence boundary

This opening section records the bounded AP-01.3a local enablement packet at repository
base `b04f366` on feature branch `adaptivpush-refactor`. It establishes the
supported local Supabase project structure, pins the CLI, rechecks the hosted
project identity/capability state, documents exact command effects, and prepares
the authorization, backup, restore, and isolated-test checklists.

During that initial packet, no Supabase login, token creation, database-password reset, project link, schema
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

## AP-01.3b preflight attempt — 2026-09-10

At `2026-09-10T16:51:33Z`, execution resumed on feature branch
`adaptivpush-refactor` at expected HEAD `19e2747`. The locally known comparison
is `origin/main` at `20a95e5`, with the feature branch eight commits ahead and
zero behind. The checkout contained one unrelated untracked user file at entry,
`tools/build_adaptivpush_business_plan.py`. No task command targeted, staged,
edited, or deleted it; the file was absent when the packet was staged and is not
included in this packet.

The project-local CLI still reports `2.117.0`, Node reports `24.14.0`, npm
reports `11.9.0`, and the Docker CLI reports `29.4.3` with context
`desktop-linux`. No `psql`, `pg_dump`, or `pg_restore` executable is available.
The Docker Linux engine was not running. Both a hidden Docker Desktop launch and
`docker desktop start` failed to produce a ready engine, and direct start of the
stopped `com.docker.service` was denied by the local service manager. No image,
container, database, or network target was reached.

The checkout is not linked: `supabase/.temp/project-ref` is absent. Environment
and ignored `.env` key-name inspection found only the existing public app URL/key
and service-key names. It found no Supabase CLI access token, production database
password, isolated-target credential, or backup encryption key. Values were not
read or printed, and the service-role key was not treated as a substitute for a
CLI token or database password.

### Authorization and ownership gate

The execution prompt left every authorization/operator field as bracketed
placeholder text. Per its own rule, none of those fields grants authority. The
following remain unsatisfied:

| Required field | 2026-09-10 evidence state |
|---|---|
| Production link and read-only baseline capture | Not supplied; no link or remote read performed. |
| Backup method | Not selected. |
| Backup storage and retention owner | Not named; no location supplied. |
| Isolated non-production Supabase target | Not named; no project ref supplied. |
| Destructive isolated restore/setup | Not authorized. |
| Synthetic multi-user isolated writes | Not authorized. |
| Migration-ledger repair | Not authorized. |
| Production catalog-enforcement migration | Not authorized. |
| Production rollback/forward-fix operator | Not named. |
| Credential operator and required credentials | Not supplied through a secure channel. |

Because source/target identity and authorization cannot be reverified from the
supplied fields, the run stopped before `supabase link`, `db pull`, migration
history access, backup, restore, synthetic writes, migration preparation, or
production enforcement. The timestamped baseline name and catalog-authority
migration filename cannot be selected safely before the supported baseline and
ledger are captured and reconciled. AP-01.3 and AP-01 remain open; AP-02 and
AP-03 are still database-gated.

## AP-01.3b authorized execution — baseline through isolated enforcement

The sole developer subsequently authorized production baseline access, encrypted
external backup, local isolated destructive restore/setup, synthetic role tests,
ledger repair if proven necessary, production catalog enforcement, and
forward-fix operation. The authenticated Supabase account and all custody roles
are `dani-sch`. Credentials were created/reset in the authenticated dashboard,
loaded only into an ephemeral operator shell, removed from the clipboard, and
never written to the repository or this report.

### Reconfirmed identities and runtime

| Surface | Executed evidence |
|---|---|
| Production source | `AdaptivPush`, ref `thfxcvxcsfvrzdysdnkq`, `main` / `PRODUCTION`, `us-east-1`, Free plan. |
| Isolated target | Local Docker Supabase project `AdaptivPush`, loopback PostgreSQL endpoint, PostgreSQL `17.6`; no hosted ref and no route to production. Destructive work and synthetic writes were explicitly authorized. |
| CLI/runtime | Supabase CLI `2.117.0`; Docker Desktop server `29.4.3`; local Supabase PostgreSQL image `17.6.1.167`. Core database/Auth/REST/Storage containers were healthy. The optional Vector log collector remained unhealthy because its Docker log endpoint was unavailable; database validation did not depend on it. |
| Credential path | A 30-day account token named `AdaptivPush AP-01.3` was created with expiry 2026-10-10. The production database password was reset by the user and the CLI linked through the existing-password path. Values were not recorded. |

### Supported baseline and managed-ledger effect

`npx supabase db pull adaptivpush_baseline_20260910` produced
`supabase/migrations/20260910175317_adaptivpush_baseline_20260910.sql`.
Its SHA-256 is
`A871A75DA4DC062F79F591FB493BC8EC6E3271B02795E6C87C372EBFB56016A7`.

CLI `2.117.0` did not present the documented migration-history confirmation. It
automatically registered version `20260910175317` as applied and reported
`Repaired migration history: [20260910175317] => applied`. Read-only evidence
immediately before the pull showed an empty application ledger; afterward,
`npx supabase migration list` showed the same single version locally and
remotely. This unprompted write was disclosed immediately and was not hidden or
blindly reversed. Semantic validation below demonstrates that the registered
baseline represents production, so no additional manual repair was necessary.

The retained SQL hashes for 001–017 still match the 2026-09-09 provenance
report. Migration 001 remains superseded, 005 remains skipped/superseded, and no
historical SQL file was replayed or falsely registered.

### Semantic drift result

The baseline represents the 16 public tables, 215 columns, 72 constraints, 2
public functions, 16 RLS-enabled tables, 66 public/Storage policies, and 448
public table-grant rows observed in production. A fresh baseline replay produced
39 rather than 40 public indexes because PostgreSQL collapsed one of two
identical unique constraints on `readiness_logs(user_id, log_date)`. The logical
schema dump/restore retained both names and all 40 indexes. The duplicate adds
no distinct invariant; uniqueness remains enforced.

One material cross-schema omission was identified. The public-schema baseline
contains `public.handle_new_user()` but cannot contain the production trigger
`auth.users.on_auth_user_created`, because the trigger belongs to Supabase's
managed `auth` schema. Migration
`20260910190000_reconcile_auth_trigger_and_enforce_catalog_authority.sql`
therefore recreates that trigger explicitly, fixes the SECURITY DEFINER
function-local search path to `''`, removes ordinary EXECUTE authority, and
retains the trusted trigger/service path.

### Encrypted backup and restore proof

The PostgreSQL 17 logical backup captured roles, schema, and data with the
reviewed vector-table exclusions. It was compressed only as an intermediate,
then encrypted using AES-256-GCM. The random encryption key is protected with
Windows DPAPI `CurrentUser`; plaintext dumps, the intermediate archive, and the
restore work directory were deleted after authenticated decryption and restore
verification.

| Field | Recorded value |
|---|---|
| Secure location | `C:\Users\dani2\AdaptivPush-secure-backups\AP-01.3\20260910T181500Z` (outside the repository) |
| Encrypted artifact | `adaptivpush-production-backup.apbak`, 382,577 bytes, SHA-256 `C78618BD07FEB5BCAADB3E69997CE7C9C6C3AB47BC0252B9F89170CFDE387AFC` |
| Protected key artifact | `adaptivpush-production-backup.key.dpapi`, 262 bytes, SHA-256 `B13A2C12D807BB00949E41EDC4DB1EED9581315DB056195BE96B68FFCEB9B174` |
| Owners | credential, access, key custody, retention/deletion, recovery, and forward-fix: `dani-sch` |
| Retention | 30 days after verified production rollout |
| RPO | logical snapshot at 2026-09-10T18:15:00Z |
| Restore exercise | authenticated decrypt/extract plus schema/data restore and aggregate comparison completed locally within five minutes; not a hosted RTO guarantee |

`manifest.json` beside the encrypted artifacts records the plaintext hashes,
format, custody, restore result, and recovery caveats. Database backup includes
Storage metadata, not Storage object bodies. The local platform rejected only
the dump's attempt to alter reserved role `supabase_admin`; the ordinary role
settings, schema, and data restored. Hosted recovery must use the target
platform's managed-role procedure.

All 20 compared Auth/public/Storage row counts matched production exactly. The
restored aggregate inventory also matched exactly: 16 tables, 215 columns, 72
constraints, 40 indexes, 2 public functions, 16 RLS-enabled tables, 66
public/Storage policies, and 448 public table-grant rows. No private row payload
was printed or recorded.

### Catalog authority migration and isolated role proof

Migration `20260910190000_reconcile_auth_trigger_and_enforce_catalog_authority`
removes `exercises_insert`, `exercises_update`, and `exercises_delete`; revokes
`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `TRIGGER`, `REFERENCES`, and `MAINTAIN`
from `anon` and `authenticated`; and preserves `SELECT`. Existing
`postgres`/`service_role` curation authority remains, and `service_role` retains
`BYPASSRLS`.

The transaction-scoped
`supabase/tests/ap_01_3_catalog_authority_isolation.sql` suite passed twice on
the restored local target, including after direct re-execution of the exact
migration. It proved signup-trigger profile creation, anonymous and
authenticated catalog reads, ordinary catalog mutation denial, trusted
insert/update/delete curation, a catalog-UUID-backed program/day/prescription
save, two-owner program/child isolation, avatar-folder read/update/insert
isolation, duplicate-name rejection, rollback of all synthetic rows, and safe
repeat execution. The first test run exposed the platform's deliberate
statement-level ban on direct SQL deletion from Storage tables; the final test
uses cross-owner update denial and leaves deletion to the supported Storage API.

The nine deterministic catalog resolver tests remain the evidence that an
unresolved or ambiguous catalog request fails before the first program mutation;
the generated-save coordinator performs resolution before its first program
read/deactivation/write. The previously completed compatibility evidence remains
valid; no regression was observed in the static gates. Production rollout and
its post-apply checks are recorded in the next section when executed. Expo-device
and integrator evidence remain separate non-database gates.
