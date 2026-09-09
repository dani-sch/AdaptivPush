# AdaptivPush AP-01 foundation evidence — 2026-09-09

## Packet and evidence boundary

This artifact records AP-01.1, the read-only catalog-authority, migration-provenance,
and restore-readiness inspection. The inspected production project was
`thfxcvxcsfvrzdysdnkq` (`AdaptivPush`, `main`, Free plan). The repository base was
commit `20a95e5537c6cb5820eb006bbcc50287685d6594` on feature branch
`adaptivpush-refactor`; it was clean and exactly matched `origin/main` before this
packet. No database mutation, migration replay, managed-ledger repair, backup,
restore, deployment, credential creation, push, or write-based isolation test was
performed.

Evidence labels in this report are deliberate:

- **Current live observation** — read from the Supabase dashboard, PostgREST
  metadata, or a metadata-only SQL `SELECT` on 2026-09-09.
- **Current code observation** — read from the base commit above.
- **Historical evidence** — a retained earlier report; not reclassified as a
  current result.
- **Proposed transition** — reviewable AP-01.2/AP-01.3 work, not implemented or
  authorized for production by this report.

### AP-01.1 contract stated before editing

| Field | Bounded packet contract |
|---|---|
| Scope | Inventory shared-catalog writers and resolution paths; inspect current schema, grants, RLS, roles, functions/API, ownership lineage, migration state, backups, tooling, isolated targets, and device access; produce the next transition and restore plan. |
| Dependencies | Read-only production access was available. Supported migration tooling, database dump/restore tooling, an isolated verification target, Expo device access, and the configured `integrator` were not available. |
| Product contracts | Free manual and generated training must remain usable; shared catalog curation is privileged; unresolved exercise identity is explicit and never silently discarded or fabricated; accepted outputs/history remain readable. |
| Files owned | This evidence artifact plus the active execution register, implementation status, database plan, traceability, current state, task board, TOC, and development log. No application or SQL file is changed by AP-01.1. |
| Acceptance | Assess AC-TR-001 through AC-TR-007 using current read-only evidence, without claiming write isolation, restore, device, integration, or release verification. |
| Verification | Validate document links and scope, run the current application lint/type baselines, inspect the focused diff, and create a documentation-only local commit. Integration remains separate. |

## Environment and workflow inspection

| Surface | Current observation |
|---|---|
| Git | Feature branch `adaptivpush-refactor`; base `20a95e5`; clean at entry; `origin/main...HEAD` was `0 0`. No force push or direct-main work. |
| Integrator | Only the working checkout and `origin` remote exist. No `integrator` remote, clone, worktree, or Git configuration was found. Integration verification cannot be claimed. |
| Supabase access | The signed-in Chrome dashboard and metadata-only SQL editor were available. Repository environment names include public URL/key and service-key entries, but values were neither printed nor recorded. |
| Database tools | `supabase`, `psql`, `pg_dump`, and `pg_restore` were not installed. Node/npm/npx were available. No package install or credential creation was performed. |
| Device tools | `adb`, `xcrun`, and a global `expo` command were absent. No native app surface, emulator, simulator, or attached device was available. |
| App checks | `npm run lint` exists. There is no application test script. The local TypeScript compiler can be invoked through the installed dependencies. |
| Local backup helper | `scripts/backup_restore.py` archives CHAOS workspace files only. It is not a PostgreSQL/Supabase backup and cannot satisfy the database restore gate. |

## Current live database observation

The metadata query was captured at `2026-09-09T20:26:07.64763+00:00` as role
`postgres` on PostgreSQL `17.6`. It returned metadata and aggregate catalog
counts only. PostgREST OpenAPI was read with the existing project configuration;
no table rows or private payloads were exported.

### Schema and API boundary

- PostgREST exposed 16 `public` tables: `adaptation_events`,
  `cycle_symptom_logs`, `deload_recommendations`,
  `evidence_display_preferences`, `exercises`, `personal_records`,
  `program_day_exercises`, `program_days`, `program_generation_context`,
  `programs`, `readiness_checkins`, `readiness_logs`,
  `user_adaptation_preferences`, `user_profile`, `workout_exercise_sets`, and
  `workout_sessions`.
- The exposed column names matched
  [the retained schema reference](/lib/adaptivpush_database_schema.md). In
  particular, `workout_sessions.checkin_id` still references
  `readiness_logs(id)` with `ON DELETE SET NULL`; no
  `readiness_checkin_id` column exists.
- No `/rpc/*` path appeared in the service-role OpenAPI document. The anonymous
  OpenAPI root returned 401 even though an anonymous zero-row `exercises` read
  succeeded; this is an API-metadata visibility limitation, not evidence that
  anonymous table access is absent.
- There are 72 current public constraints, 40 public indexes, and one public
  trigger reported by the catalog. Core child foreign keys and ownership policy
  predicates follow their parent program/session relationships. This structural
  inspection is not a replacement for the negative two-owner tests in
  AC-TR-003.

### RLS, effective grants, roles, and functions

| Surface | Current live observation | Consequence |
|---|---|---|
| Public tables | All 16 are owned by `postgres`, have RLS enabled, and do not force RLS. | Owner/service behavior must be tested separately from ordinary roles. |
| `exercises` policies | Four permissive policies apply `TO public`: SELECT and DELETE use `true`, INSERT checks `true`, and UPDATE uses `true`. | Policy expressions impose no catalog mutation boundary. |
| `exercises` grants | Both `anon` and `authenticated` have SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER. `service_role` has the same table privileges and bypasses RLS. | Ordinary API roles currently possess effective shared-catalog mutation authority. A write probe is unnecessary to establish the grant/policy exposure and was prohibited in AP-01.1. |
| Schema grants | `anon` and `authenticated` have `USAGE`, but not `CREATE`, on `public` and `storage`. | They can reach granted objects but cannot create schema objects. |
| Role inheritance | `authenticator` is a member of `anon`, `authenticated`, and `service_role`; `service_role` has `BYPASSRLS`. | Authenticator role switching exposes the privileges of the selected API role as designed. |
| Default table ACL | New `public` tables created by `postgres` or `supabase_admin` default to broad table privileges for `anon`, `authenticated`, and `service_role`. | Every new sensitive table needs explicit grants and RLS in its slice migration; RLS alone is not the whole contract. |
| `handle_new_user()` | Owned by `postgres`, SECURITY DEFINER, no function-local `search_path`, executable by PUBLIC/anon/authenticated/service_role, and used as a trigger function. | It is not exposed as a PostgREST RPC, but its unpinned search path and broad direct EXECUTE grant require a focused hardening review before being treated as safe authority. |
| `set_updated_at()` | Owned by `postgres`, SECURITY INVOKER, no function-local configuration, and broadly executable. | It is a trigger helper, not a catalog curation boundary. |

Current ownership predicates were also compared to their foreign keys. The
classic `program_days` and `program_day_exercises` policies traverse to the
owner's `programs` row, and `workout_exercise_sets` traverses to the owner's
`workout_sessions` row. Phase-2 tables have four authenticated ownership
policies each; `program_generation_context`, `deload_recommendations`, and
`adaptation_events` include linked-parent checks on insert/update as retained in
migration 015. The current observation supports the structure of the historical
isolation report; it does not rerun its write-based fixture.

### Catalog and storage

| Check | Current live result |
|---|---|
| Exercise rows | 1,369 |
| Missing `exercisedb_id` | 51 |
| Duplicate non-null exact external IDs | 0 |
| Duplicate normalized names (`lower(btrim(name))`) | 17 groups |
| Exact-name constraint | `UNIQUE (name)` |
| External-ID index | Partial, non-unique index where `exercisedb_id IS NOT NULL` |
| `avatars` bucket | Public; 2,097,152-byte limit; JPEG only; four authenticated UID-folder lifecycle policies plus the retained anonymous public-folder policy. |
| `exercise-images` bucket | Public; no bucket file-size or MIME restriction was reported. The seed script writes objects here with a service credential. |

The 17 normalized-name collisions mean case-folded name matching cannot be a
canonical resolver. The 51 missing external IDs mean `exercisedb_id` alone also
cannot yet identify every retained row.

## Shared-catalog writers and identity paths

| Path | Current code observation | AP-01 consequence |
|---|---|---|
| `utils/saveProgramToDb.ts` | Generated slots carry `localExerciseId`, but the save path discards it, upserts `{name}` into `exercises` through the ordinary signed-in client, reselects missing exact names, and silently omits prescriptions whose name did not resolve. | This is the production ordinary-client catalog writer and a data-loss path. It must be replaced before catalog writes are revoked. |
| `hooks/useCurrentProgram.ts` `createDevTestProgram` | A developer helper upserts six shared exercise names through the ordinary client, then maps names to UUIDs. | Convert to lookup against known fixtures or move fixture curation behind a trusted development-only administrator boundary. |
| `scripts/seedExercises.ts` | Uses the public/anonymous client for catalog upserts by exact name and a service key only for `exercise-images` object upload; later updates image URLs by name. | Make the entire curation command explicitly trusted and non-mobile, validate source IDs, and never embed or log the service credential. |
| `app/create-program.tsx` | Reads `exercises`, retains the selected database UUID, and inserts that UUID into `program_day_exercises`. | This is the safe manual identity shape and must remain free and usable. |
| `components/SwapExerciseModal.tsx` | Reads database UUID alternatives, but on query failure/empty results falls back to local slug IDs and passes the selected value to the database swap path. | A local slug can be mistaken for a database UUID. Offline fallback must remain a local draft and cannot call the remote mutation until resolved. |
| `utils/programGenerator.ts` and `lib/exerciseDatabase.ts` | Generation selects a local slug identity and emits both slug and display name. The local snapshot has no canonical database UUID/source-version/alias map. | Add an explicit snapshot version and resolver mapping; do not equate display name with identity. |
| `hooks/useCurrentProgram.ts` loader and swap writer | Loads catalog UUIDs through joins; swaps write `replacement.id` to the prescription FK. | Preserve UUID identity and reject a replacement that is not a resolved catalog record. |
| History/workout readers | History joins on database UUID. Workout finishing skips all sets and PR work when `exerciseId` is missing. | Unknown identity must block/fail visibly before finishing rather than produce an apparently complete partial record. AP-02 owns the durable finalization fix. |

No other current shared `exercises` table writer was found under `app/`,
`components/`, `hooks/`, `lib/`, `scripts/`, `types/`, or `utils/`.

## Migration provenance reconciliation

The production dashboard currently says “Run your first migration.” No
`supabase_migrations` namespace or application migration relation exists.
`auth.schema_migrations`, `realtime.schema_migrations`, and
`storage.migrations` are service-internal histories and are not an AdaptivPush
managed ledger. Dashboard SQL snippets and visible schema effects therefore
remain provenance evidence, not supported migration entries.

| SQL evidence | SHA-256 | Current reconciliation |
|---|---|---|
| 001 | `89D7389B7AB8E138B17A1EBD33E7F0DEEE3BA09BC99ABFBE94CA6F7913D05F56` | Not present; references absent `workout_history`; superseded and must not be deployed. |
| 002 | `C1B36C5D78C55343E5B4C92B383EE8E4903D72869C5628D575CDD07628CAC215` | Historical precursor; `gif_url` is absent and `image_url` is current. |
| 003 | `8AC96B9623CE8C73939B76C738A895E6E903D133905C8CB84062405BE4420BAF` | `programs.last_active_week` is present. |
| 004 | `11823CBC46D3CBFC25DE784450B0283CCCF29FA0C246558C5A942B3A028A60AE` | End state `exercises.image_url` is present. |
| 005 | `6B00A95E2329F298378284B85A83FD26FEE5C26B2C768772C3816A855C82C145` | Historical audit says skipped; current external-ID end state is attributed to 017, not counted twice. |
| 006 | `E8313D38828992E24F0EE2BCA8385B7A7C2DE80BFC3B32AE2D0559D367E7055D` | Cycle columns are present. |
| 007 | `41DFF91CCE1F2E243C24BE15B343ED9E8744E35635B6663BCFF89A8345A0CC11` | Profile compatibility columns/default/check are present. |
| 008 | `C9F5E763441D963A17A906A1A878EC1A1499206CC75D2E56D2C740E37E8232CD` | Table and constraints are present. |
| 009 | `48D361DA38D4C2207AE458FB6642C017787305BA4B0981E152ADEE2C50DFB769` | Table, constraints, and unique daily index are present. |
| 010 | `4038A7E2FD36E8FA4C44324C0D6E8EA47371B7CA74B2345C3BB566D20766DE93` | Table, constraints, and unique daily index are present. |
| 011 | `16D230CC1C2316676347B7E9915DB18048C13B3DFA5E6DFE440121B9DE7917EC` | Table, program uniqueness, owner index, and FKs are present. |
| 012 | `E928FCEB3AE3363E1982638D01490AFC5B2483E0B045510AC89A04C4B891586C` | Table, event index, and nullable relationship FKs are present. |
| 013 | `82C35C9972085E4C19C66980D872FB4F9B0CB580440E136F92F34D9BA009B812` | Table and the event-to-deload FK are present. |
| 014 | `92F1B8B7F10348AFF84F960C48F31B91C19D0834276FDF30458388B90D35975A` | Table and constraints are present. |
| 015 | `0586085AE7026C9F10E7379F8F56CD3368C6D8489CEE69795011AF38E62A1CA8` | Seven Phase-2 tables each have four authenticated policies with the retained linked-owner checks. |
| 016 | `82D0FD9FC0D1535038D8B5CF02CFA19AE8EEDE9E60D9E1BBD4762B3E3312D612` | Avatar bucket limit/MIME state and owner lifecycle policies are present. |
| 017 | `BC3FC948D35E1617D09B777D5124F3BAD680DF6D08D7ED9635BFFC843E56835B` | Column and partial index are present; 1,318 of 1,369 rows currently have the external ID. |

This establishes end-state equivalence where noted, not execution order or a
managed history. The retained numbered SQL must not be replayed or manually
inserted into an internal ledger.

## Backup and restore readiness

Current dashboard evidence is explicit:

- the Free plan has no scheduled project backups;
- point-in-time recovery is a Pro-plan add-on;
- restore-to-new-project requires Pro and physical backups;
- no successful AdaptivPush database restore artifact exists;
- no isolated Supabase target is configured or available in this checkout; and
- local `pg_dump`/`pg_restore` and Supabase CLI tooling are absent.

AP-01.1 therefore closes the inspection, not the restore gate. Before any
production migration, AP-01.3 must choose and evidence one of these mechanisms:

1. Upgrade to managed physical backups with the required retention/PITR, then
   restore a selected recovery point into an isolated project; or
2. Provision a pinned PostgreSQL client, authorize a scoped database connection,
   create an encrypted checksummed custom-format `pg_dump`, store it under a
   named retention/access owner, and restore it with `pg_restore` into an
   isolated project.

For either mechanism, record source project, capture time, tool/server versions,
encrypted artifact checksum, retention/access owner, isolated target, restore
duration, schema/constraint/index/policy/grant comparison, catalog counts, and
application smoke result. Never restore over production for the drill.

## Reviewable AP-01.2 client/catalog-policy transition

This is the next bounded local implementation packet. The production policy
change remains gated.

1. **Introduce explicit client identities first.** Add focused catalog contracts
   and a repository that distinguish database UUID, ExerciseDB source ID, local
   snapshot slug/version, display name, resolved identity, and unresolved draft.
   A normalized name may assist discovery but cannot select among the 17 current
   collision groups.
2. **Remove ordinary-client curation.** Change generated save and the developer
   fixture to lookup only. Preserve generated slots until every identity is
   resolved; return an actionable unresolved list and leave the previous active
   program usable. Do not silently drop prescriptions.
3. **Make swap fallback honest.** Cached/local alternatives may be previewed
   offline, but a slug cannot be written to a UUID FK. Queue as an unresolved
   local draft or require reconnect-and-resolve before applying.
4. **Move seeding behind one trusted boundary.** Use a non-mobile administrator
   command for catalog and image curation, validate source IDs/aliases, record a
   catalog version/import receipt, and keep service credentials out of clients,
   output, and source control.
5. **Verify the new client before server restriction.** Add deterministic resolver
   fixtures for UUID, external ID, unique exact alias, collision, missing ID,
   stale snapshot, offline cache, and remote failure. Run lint/type checks and an
   authenticated normal-save fixture in an authorized isolated target.
6. **Then review a slice-owned migration.** Keep SELECT for intended readers;
   revoke INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER from `anon` and
   `authenticated`; remove unconditional write policies; retain a separately
   authenticated trusted curation path. Review the SECURITY DEFINER function
   search path and direct routine grants as a separate, explicit hardening item.
7. **Compatibility sequence.** Release lookup-only client behavior first, observe
   unresolved identities, then enforce catalog write denial. Older clients whose
   save path always attempts an upsert must receive an actionable upgrade/retry
   result; policy rollback must never restore unconditional writes. Safe fallback
   is read-only cached/manual selection with an unsaved draft.

## Reviewable AP-01.3 migration-baseline and restore plan

1. Select the supported Supabase CLI version and credential owner; install and
   authenticate it without recording tokens. Link only after confirming project
   identity and command effects.
2. Pull a timestamped current baseline under `supabase/migrations/` through the
   supported CLI workflow. Record the generated filename/hash, CLI/server
   versions, source project, and exact command. Treat any remote ledger effect of
   the chosen CLI command as a mutation requiring its own authorization.
3. Compare the pulled baseline against the schema reference, current metadata,
   and retained SQL 001–017. Keep 001 superseded, preserve dashboard-SQL
   provenance, and list every semantic drift. Do not manually populate the
   managed ledger.
4. Review any supported `migration repair` operation only after equivalence is
   approved. Record the exact version/status mapping; never represent 001 or
   skipped 005 as applied.
5. Complete one of the backup mechanisms above and restore into a separate
   target. Run schema/grant/RLS/ownership/catalog integrity comparisons there.
6. Run isolated ordinary-role denial, trusted-curation success, two-owner
   lineage, legacy/new client, missing-schema, and actual Expo device checks.
   Write-based tests belong here, not in the AP-01.1 read-only evidence.
7. Only after local, integration, restore, and device evidence pass may a reviewed
   catalog migration be considered for production. Deployment and release remain
   separately authorized gates.

## Acceptance and universal-gate disposition

| Row/gate | AP-01.1 result and remaining evidence |
|---|---|
| AC-TR-001 | **Partial.** Fresh metadata, grants, current ledger absence, retained SQL hashes, and drift are recorded. Backup creation and isolated restore rehearsal remain open. |
| AC-TR-002 | **Open with exposure proved.** Effective ordinary-role catalog mutation authority is established from grants plus unconditional policies. No write probe was run. Lookup-only save, denied mutation, and trusted curation must be implemented/tested in AP-01.2/01.3. |
| AC-TR-003 | **Partial structural evidence.** Current FKs and policy parent lineage were read. The August rolled-back test remains historical; fresh isolated two-owner/storage negative tests remain open. |
| AC-TR-004 | **Open.** Compatibility helpers and historical service checks exist; actual new/legacy/missing-relation/missing-column Expo paths lack device evidence. |
| AC-TR-005 | **Inspection complete, implementation open.** The legacy FK still points to `readiness_logs`; no reinterpretation occurred. Any additive v2 link belongs to its consuming slice. |
| AC-TR-006 | **Open with quantified blockers.** The local snapshot lacks canonical mapping/version, 51 rows lack external IDs, 17 normalized-name groups collide, and swap/save fallbacks can misuse or drop identity. |
| AC-TR-007 | **Satisfied for this documentation-only packet.** Existing, retained historical, proposed, and optional objects are distinguished; no schema was added. Each future consumer still owes its slice-specific proof. |
| G-01–G-06 | Scope/ownership/contracts and product/privacy/offline/UI implications are recorded; runtime behavior was not changed or claimed. |
| G-07 | Documentation/path checks plus current lint/type baselines are recorded in the development log after execution. No application test script exists. |
| G-08 | **Blocked for integration, not local inspection:** configured `integrator`, isolated target, restore proof, two-user tests, and Expo device are unavailable. No release claim. |
| G-09 | No rollout occurred. Safe sequence and non-permissive rollback are specified. |
| G-10 | This artifact and linked register/status/database/traceability/log updates provide the AP-01.1 evidence record. Final commit is added to the development log after commit. |

## Exact next executable packet

**AP-01.2a — lookup-only catalog contract and resolver** is locally executable
without a database mutation. Its owned initial surface is
`features/catalog/contracts.ts`, `features/catalog/repository.ts`, focused
resolver fixtures/harness, and the generated-save/swap call sites required to
prevent catalog writes and slug-as-UUID writes. The server catalog-policy
migration, managed-ledger repair, authenticated integration fixtures, restore
drill, and production deployment remain gated behind AP-01.3 evidence and
specific authorization.
