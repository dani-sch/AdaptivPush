# AdaptivPush — Development Log

> Chronological record of implemented changes, planning changes, and documentation decisions.  
> Most recent entries at the top.

---

### 2026-09-10 AP-01.3b authorization-boundary preflight {#2026-09-10-ap-01-3b-preflight}

**Summary**: Re-entered AP-01.3 at expected HEAD `19e2747`, verified the local
CLI/tool/link state, and stopped at the first remote boundary because the
execution prompt supplied no completed authorization, operator, backup, target,
or credential fields. No remote database action or migration file was created.

**Evidence**:

| Check | Result |
|---|---|
| Git | `adaptivpush-refactor` at `19e2747`; locally known `origin/main` is `20a95e5`, zero behind/eight ahead. One unrelated untracked user file under `tools/` was present at entry and absent by staging; no task command targeted it and it was excluded. |
| Supabase | CLI `2.117.0`; no `supabase/.temp/project-ref`; no link, pull, ledger query/repair, dump, restore, SQL, or write. |
| Credentials | No CLI access-token, database-password, isolated-target, or encryption-key variable name was present. Existing public app/service key names were not read and are not substitutes. |
| PostgreSQL 17 runtime | Docker CLI `29.4.3` exists, but the Linux engine is unavailable; Desktop/CLI startup did not become ready and service start was denied. Standalone PostgreSQL clients remain absent. |
| Authorization | All nine execution-authorization/operator fields remain incomplete placeholders; backup method/owners and isolated target remain unset. |

**Result**: AP-01.3 remains blocked before production link/baseline capture.
Baseline hashing, drift reconciliation, backup/restore, catalog migration
preparation, isolated role tests, and production rollout were not performed or
claimed. Full redacted evidence is appended to
[the AP-01 report](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-10.md).

---

### 2026-09-10 AP-01.3a baseline and restore enablement {#2026-09-10-ap-01-3a-enablement}

**Summary**: Completed the safe local portion of AP-01.3a. Pinned the supported
Supabase CLI, initialized the PostgreSQL 17 local project configuration, rechecked
the production project/backup/migration identity, and prepared the exact
credential, command-effect, baseline, backup, restore, and isolated security
checklists. No remote database or migration-history action occurred.

**Changes**:

| Component | Change |
|---|---|
| tooling | Added exact dev dependency `supabase@2.117.0`; Node 24 satisfies the CLI requirement. |
| local database config | Added generated `supabase/config.toml` and `.gitignore`; local PostgreSQL major 17 matches production `17.6.1.063`. |
| command review | Recorded that passwordless `link` can initialize a temporary remote CLI role; migration-mode `db pull` requires Docker, writes a local timestamped migration, and may update remote history; repair applied/reverted inserts/deletes history rows without applying schema SQL. |
| production reinspection | Confirmed AdaptivPush `thfxcvxcsfvrzdysdnkq`, `main` Production, Free, `us-east-1`, empty managed migration UI, and no scheduled backups. |
| recovery decision | Prepared managed-physical versus encrypted-external logical backup choices and the isolated restore/security matrix. |

**Files Added/Modified**:

| File | Action | Purpose |
|---|---|---|
| `package.json`, `package-lock.json` | modified | Pin the project-local Supabase CLI. |
| `supabase/config.toml`, `supabase/.gitignore` | added | Establish the supported local PostgreSQL 17 Supabase structure without linking. |
| `dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-10.md` | added | Durable AP-01.3a command-effect, authorization, backup, restore, and gate evidence. |
| AP-01 register/status/database/traceability owners | modified | Record partial AP-01.3 progress and exact remaining gates. |
| living docs and TOC | modified | Route the next executable packet as AP-01.3b and refresh inventory. |

**Verification**:

| Check | Result |
|---|---|
| `npm run test:catalog` | 9 passed, 0 failed. |
| `npm run lint` | passed with 0 errors and 17 unchanged pre-existing warnings. |
| `npx tsc --noEmit` | passed. |
| `npx supabase --version` | `2.117.0`. |
| `git diff --check` | passed for the tooling commit; repeated for documentation closeout. |
| database/backup/restore/integration/device | not run and not claimed. |

**Commits**:

- `96ba874` `chore(database): pin supabase baseline tooling`
- `e426766` `docs(adaptivpush): prepare AP-01.3 baseline gates`

**Remaining gates**: Name the credential operator; provide an existing access
token/database password securely; run or provision PostgreSQL 17 tooling; choose
the backup mechanism and owners; name a distinct isolated target; and authorize
the no-history-update baseline pull. Integrator and Expo device remain later
AP-01.3 gates. Ledger repair, catalog enforcement, production deployment, and
release require separate authorization.

**Next**: AP-01.3b authorized baseline capture plus backup/isolated-target
decision.

---

### 2026-09-09 AP-01.2a lookup-only catalog client {#2026-09-09-ap-01-2a-catalog-client}

**Summary**: Implemented and locally verified the compatible client-first
catalog boundary. Generated saves and developer fixtures resolve existing rows
before program mutation; swaps cannot write local slugs to UUID foreign keys;
shared seeding uses only the administrator client. No database write, seed run,
policy/grant change, migration, deployment, integration, or release occurred.

**Changes**:

| Component | Change |
|---|---|
| catalog contract | Added snapshot/source/exact-name identity, validated catalog UUID, structured unresolved reasons, and actionable resolution errors. |
| generated save | Resolve all slots before reading/deactivating programs; removed shared-catalog upsert and silent unresolved-prescription filtering. |
| local catalog | Added four explicit ExerciseDB mappings; excluded `barbell-clean` and `dumbbell-thruster` from persisted candidate pools because no unambiguous live row exists. |
| developer fixture | Replaced six catalog upserts with pre-mutation lookup. |
| swap | Local fallback remains previewable but apply is disabled without a resolved UUID; the hook independently rejects non-UUID replacements. |
| trusted import | Seed DB and Storage operations now share the service-role administrator client; command not executed. |
| test harness | Added `npm run test:catalog` and nine deterministic cases. |

**Verification**:

| Check | Result |
|---|---|
| `npm run test:catalog` | 9 passed, 0 failed. |
| `npx tsc --noEmit` | passed. |
| `npm run lint` | passed with 0 errors and 17 unchanged pre-existing warnings. |
| current public catalog read | 52 persistable local entries resolved; two explicit unresolved entries excluded; 0 missing among the persistable set. |
| current developer-fixture read | 6 requested names resolved; 0 missing. |
| writer scan | Remaining `exercises` upserts occur only in `scripts/seedExercises.ts` through `supabaseAdmin`. |
| `git diff --check` | passed. |
| Ruff | not applicable; no Python file changed. |
| authenticated/device/integration/restore/write-isolation | not run and not claimed. |

**Commits**:

- `e371348` `feat(catalog): resolve program exercises without client writes`
- `cd0908e` `fix(catalog): guard swaps and require trusted seeding`

**Remaining gates**: Live grants and unconditional policies are unchanged.
AP-01.3a requires a credential/tool owner, supported baseline, chosen backup
mechanism, isolated restore/role-test target, configured integration workflow,
and later Expo device evidence. Policy/ledger/deployment actions remain gated.

**Next**: AP-01.3a supported baseline/backup/isolated-target enablement.

---

### 2026-09-09 AP-01.1 catalog authority and restore-readiness inspection {#2026-09-09-ap-01-1-foundation-inspection}

**Summary**: Completed the bounded AP-01.1 read-only inspection against the
production AdaptivPush Supabase project and repository base `20a95e5`. No
database mutation, migration replay/repair, backup, restore, deployment,
credential creation, write-based isolation test, or push occurred. The exact
environment, SQL-file hashes, writer/resolver inventory, live metadata, evidence
limits, and AP-01.2/AP-01.3 transition are recorded in
[the AP-01 evidence artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-09.md).

**Current live observation**:

| Surface | Result |
|---|---|
| Schema/API | 16 exposed public tables matched the retained schema-reference columns; no PostgREST RPC path was present. |
| RLS/ownership | All 16 public tables have RLS enabled without force; core child policies and FKs traverse the expected program/session ownership lineage. This was metadata inspection, not a two-owner write test. |
| Catalog authority | `anon` and `authenticated` each have all table privileges on `exercises`; its SELECT/INSERT/UPDATE/DELETE policies are unconditional `TO public`. |
| Catalog integrity | 1,369 rows; 51 missing external IDs; zero duplicate non-null exact external IDs; 17 normalized-name collision groups. |
| Functions | `handle_new_user()` is a broadly executable SECURITY DEFINER trigger function without function-local `search_path`; it was not exposed as RPC. |
| Migration history | Dashboard reports “Run your first migration”; no `supabase_migrations` namespace exists. Internal auth/realtime/storage histories are not the application ledger. |
| Backup/restore | Free plan has no scheduled backups; PITR and restore-to-new-project are unavailable. No successful isolated restore exists. |
| Storage | `avatars` retains the public JPEG/2 MiB contract; `exercise-images` is public without bucket MIME/size limits. No objects were changed or deleted. |

**Repository findings**:

| Component | Current result |
|---|---|
| generated save | Ordinary client upserts catalog names, ignores generated local IDs, and silently omits unresolved prescriptions. |
| developer fixture | `createDevTestProgram` also performs ordinary-client shared-catalog upserts. |
| seed command | Catalog rows are written with the anonymous client while a service credential is used only for image objects. |
| manual authoring | Retains selected database UUIDs and is the compatible read-only catalog model. |
| swap fallback | Local slug IDs can flow toward a UUID FK update after catalog read failure/empty state. |
| migration provenance | Retained SQL 001–017 was hashed and reconciled to current end state; 001 remains superseded and 005 remains skipped/superseded by 017. No historical file was replayed or registered. |
| workflow/tooling | Feature branch was clean and equal to `origin/main` at entry. No configured `integrator`, Supabase CLI, `psql`, `pg_dump`, `pg_restore`, isolated project, emulator, simulator, or attached device was available. |

**Files added/modified**:

| File | Purpose |
|---|---|
| `dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-09.md` | Durable AP-01.1 evidence, AC-TR-001–007 disposition, catalog transition, and baseline/restore plan. |
| `dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md` | Advance AP-01 to in progress and route AP-01.2a next. |
| `dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md` | Record current live boundary and exact catalog/save/swap defects. |
| `dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md` | Replace inspected unknowns with current grants/ledger/backup facts and remaining gates. |
| `dev-doc/plans/active/ADAPTIVPUSH-TRACEABILITY.md` | Link the evidence limits to AC-TR-001–007. |
| `dev-doc/main/CURRENT-STATE.md`, `dev-doc/main/TODO.md`, `dev-doc/main/TOC.md` | Update living execution posture, next work, and generated date. |

**Verification**:

| Gate | Exact command/result |
|---|---|
| Application lint baseline | `npm run lint` — pass, 0 errors and 17 pre-existing warnings. |
| Contract/type baseline | `npx tsc --noEmit` — pass. |
| Documentation inventory | `python scripts/tools/generators/toc_generate.py --output dev-doc/main/TOC.md` — pass; generated date updated. |
| Documentation paths | Balanced Markdown-link target check across the eight evidence/status files — pass, all targets exist. |
| Acceptance linkage | AC-TR-001 through AC-TR-007 present in the AP-01 artifact — pass. |
| Diff hygiene | `git diff --check` — pass. Credential-value pattern scan — no value found. |
| Python gate | Not applicable; no Python file changed. |
| Integration/device/restore/security writes | Not run and not claimed; prerequisites are absent. |

**Commit**:

- `614a8ea` `docs(adaptivpush): record AP-01.1 foundation inspection`

**Remaining gates**:

- configure the documented `integrator` or obtain an explicitly approved
  alternative before integration verification;
- provision supported baseline/dump tooling, credential ownership, a backup
  mechanism, and an isolated target, then complete a successful restore drill;
- implement and locally verify lookup-only catalog identity before reviewing or
  applying catalog grant/policy restriction;
- run isolated ordinary-role denial, trusted-curation, two-owner/storage,
  old/new/missing-schema, and actual Expo device matrices.

**Next**: AP-01.2a — lookup-only catalog contracts/resolver and the smallest
deterministic TypeScript harness. Production policy changes remain gated behind
the compatible client and AP-01.3 evidence.

---

### 2026-09-08 AdaptivPush planning consolidation

**Scope:** Documentation and planning only. Replaced current product-planning authority with neutral master/register/status/database/traceability/inventory documents and a research translation; approved decisions remain authoritative. Preserved 12 stale authorities and 12 operational snapshots with an explicit 61-source map. Mapped 142 requirements, all 28 packet tables plus equipment candidates, and 16 bounded AP slices.

**Verification:** Source hashes, application-file equality, canonical links/anchors/tables, authority search, supported TOC regeneration and focused diffs passed within the limits recorded in [the verification report](/dev-doc/reports/ADAPTIVPUSH-PLAN-CONSOLIDATION-VERIFICATION-2026-09-08.md). Repository freshness is 2/3: the version check cannot run because `version.txt` is absent. Historical archive formatting and embedded obsolete locators remain unchanged for provenance.

**Preservation:** Pre-existing save-code/audit/log edits remain at their original paths. Old register/status and three living-document edits remain unstaged at archived source/snapshot paths. No unrelated user modifications were included in documentation commits. No application code, SQL, database, deployment, external message or push action occurred; no runtime/device/security/integration verification claimed.

**Next:** Final review of [the consolidated plan index](/dev-doc/plans/active/PLAN-INDEX.md); subsequent authorized execution starts with AP-01.1 catalog/grant/migration/restore inspection. Do not begin implementation from this log entry.

---

### 2026-08-03 F5-S1.3 authenticated compatibility matrix and recovery fix {#2026-08-03-f5-s1-3-authenticated-compatibility-matrix}

**Summary**: Exercised the Phase 2 compatibility contract against the live Supabase project with one explicitly authorized synthetic user. Verified the profile/preference and generated-context paths, reproduced a failed-replacement recovery defect, fixed it narrowly, reran the failure path successfully, and removed the synthetic identity plus all cascaded rows.

**Changes**:

| Component | Change |
|---|---|
| program save recovery | Capture prior active program IDs, check deactivation errors, delete the failed replacement when required context preparation or insertion fails, restore only the prior active IDs, and surface cleanup/restoration failures |
| compatibility evidence | Recorded authenticated live results for Quick Setup persistence, legacy missing-row resolution, readiness/cycle dual-writes, generated context creation, and injected context-write failure |
| execution ledgers | Kept `F5-S1` active because actual mobile UI and runtime missing-schema fallback evidence remain unavailable |

**Authenticated live matrix**:

| Row | Result | Evidence |
|---|---|---|
| Quick Setup three-surface write contract | pass | Authenticated anon client wrote and read `user_profile`, `user_adaptation_preferences`, and `evidence_display_preferences` using the application payload builders |
| legacy user with missing Phase 2 preference row | pass | Deleted only the synthetic user's adaptation row, resolved legacy auth metadata, then recreated the Phase 2 row through the dual-write contract |
| readiness dual-write | pass | Phase 2 adaptation row and legacy auth metadata agreed after save |
| cycle dual-write | pass | Legacy `user_profile` cycle columns and Phase 2 adaptation settings agreed after save |
| generated context creation | pass | Actual `generateProgram` plus `saveProgramToDb` created the owned program and context row |
| injected context-write failure before fix | partial failure | Failed replacement row was deleted, but the prior program remained inactive |
| injected context-write failure after fix | pass | Failure propagated, no failed row remained, one context row remained, and exactly the prior program was active |
| injected context-profile failure after fix | pass | Local coordinator mock propagated the profile lookup failure, deleted the replacement, and restored the prior program |
| synthetic cleanup | pass | Deleted the exact tagged auth user; profile, adaptation, evidence, context, program, 8 day rows, and 32 prescription rows all returned to zero |

**Verification**:

| Check | Result |
|---|---|
| focused pure compatibility probes | 8 assertions passed |
| authenticated live profile/preference matrix | 4 of 4 rows passed |
| actual generated-program context creation | passed |
| injected context-failure regression after fix | passed |
| injected context-profile preparation regression after fix | passed with the actual coordinator and a local Supabase mock |
| `npm run lint` | passed with 0 errors and 17 pre-existing warnings |
| `npx tsc --noEmit` | passed |
| `git diff --check` | passed |
| `npx expo-doctor` | 16 of 18 checks passed; pre-existing Expo package-version and duplicate `expo-constants` findings remain out of scope |
| Expo web UI fallback | failed before authentication because AsyncStorage accesses `window` during server rendering; no browser credentials were transmitted |
| simulator/physical-device UI | `REQUIRES INSPECTION`; Android tooling and a connected device were unavailable |

**Remaining gate**:

- run Quick Setup, Profile readiness/cycle settings, and Generate Program on an Expo-capable simulator or physical device;
- exercise application behavior when Phase 2 relations or columns return legacy missing-schema errors;
- do not activate `F5-S2` until those rows are recorded.

---

### 2026-08-03 FABLE-5 execution-authority and code-status audit {#2026-08-03-fable-5-execution-authority-code-status-audit}

**Summary**: Rebuilt the active planning lane around one FABLE-5 product contract, stable `F5-S*` execution identifiers, and a code-backed capability inventory. Marked older evidence-backed plans as source references and documented production gaps found directly in the repository.

**Changes**:

| Component | Change |
|---|---|
| canonical plan | Added execution authority, stable stage status, RLS qualification, resolved decisions, and production completion requirements to FABLE-5 |
| execution register | Added `F5-S0` through `F5-S8` with dependencies, file targets, behavioral requirements, gates, and decision resolutions |
| code status | Added route, domain, data, security, release, and planned-file status based on the audited `74f9e8a` code baseline |
| source plans | Changed evidence-backed execution, implementation, and UI plans to source-reference status |
| living docs | Aligned architecture, current state, roadmap, TODO, plan index, command reference, overview, and generated TOC |
| governance | Corrected the documented Git baseline and Expo/React Native TypeScript review guidance in local instruction surfaces |

**Important code-backed findings**:

- core auth, generation, workout logging, PR, history, archive, local notification, and theme paths exist;
- readiness, progression, cycle, deload, analytics, evidence, notification, privacy, and support behavior remain partial or scaffolded;
- password reset, feature flags, automated tests, real HealthKit, production app identity, and real support/export/deletion processing are missing;
- migrations 008-014 do not contain RLS enablement or ownership policies, making live RLS proof and an additive policy migration the first `F5-S1` gate.

**Validation**:

| Check | Result |
|---|---|
| code inventory and targeted source inspection | completed |
| `python scripts/tools/generators/toc_generate.py --output dev-doc/main/TOC.md` | passed |
| `git diff --check` | passed |
| live Supabase and device checks | not performed; explicitly retained as `F5-S1` work |

---

### 2026-06-30 Phase 2 schema-and-compatibility pass {#2026-06-30-phase-2-schema-and-compatibility-pass}

**Summary**: Landed the Phase 2 additive schema and compatibility slice in code: added migrations 007-014, expanded the in-repo schema reference and TS data model, wired onboarding/profile compatibility reads and writes, and made program saves intentionally create `program_generation_context`. Phase 2 is not fully closed yet because manual validation remains.

**Changes**:
| Component | Change |
|---|---|
| database migrations | Added additive Phase 2 migration files 007 through 014 for profile defaults, adaptation preferences, readiness check-ins, cycle symptoms, generation context, adaptation events, deload recommendations, and evidence display preferences |
| schema reference | Replaced the schema reference with the current post-migration Phase 2 schema supplied from Supabase |
| TypeScript data model | Expanded `types/database.ts` and profile preference helpers to model the new Phase 2 tables and preserve legacy metadata compatibility |
| onboarding/profile flows | Wired quick setup and profile readiness/cycle settings to dual-write the new Phase 2 tables while preserving legacy metadata writes |
| generation save flow | Updated program save to persist `session_length_preference_min` and intentionally create `program_generation_context` |
| repo hygiene | Unignored `reports/migrations/*.sql` so the Phase 2 migration files can be committed |

**Files Added/Modified**:
| File | Action | Purpose |
|---|---|---|
| `.gitignore` | modified | allow Phase 2 SQL migration files under `reports/migrations/` to be committed |
| `reports/migrations/007_user_profile_adaptive_defaults.sql` | added | add stable user-profile defaults for Phase 2 |
| `reports/migrations/008_user_adaptation_preferences.sql` | added | add durable adaptation-preferences storage |
| `reports/migrations/009_readiness_checkins.sql` | added | add the readiness-v2 check-in table |
| `reports/migrations/010_cycle_symptom_logs.sql` | added | add optional cycle symptom logging |
| `reports/migrations/011_program_generation_context.sql` | added | add program generation-context snapshot storage |
| `reports/migrations/012_adaptation_events.sql` | added | add adaptation event audit storage |
| `reports/migrations/013_deload_recommendations.sql` | added | add deload recommendation storage |
| `reports/migrations/014_evidence_display_preferences.sql` | added | add evidence display preference storage |
| `lib/adaptivpush_database_schema.md` | added | record the current post-migration schema reference |
| `types/database.ts` | modified | model the new Phase 2 schema and compatibility shapes |
| `utils/profilePreferences.ts` | modified | add dual-read and dual-write compatibility helpers for readiness preferences |
| `utils/saveProgramToDb.ts` | modified | persist session-length defaults and generation-context snapshots intentionally |
| `app/(qsetup)/quick-setup.tsx` | modified | seed Phase 2 defaults during onboarding without breaking legacy-compatible behavior |
| `app/(tabs)/profile/index.tsx` | modified | dual-read and dual-write readiness/cycle settings using Phase 2 tables and legacy metadata |
| `components/GenerateProgramModal.tsx` | modified | save generated programs with explicit generation-context behavior |

**Validation**:
| Check | Result |
|---|---|
| `npm run lint` | passed with 0 errors and only pre-existing warnings outside the Phase 2 slice |
| schema reference refresh | completed against the current Phase 2 schema provided from Supabase |

**Remaining tasks/tests before Phase 2 is complete**:
- review the applied Phase 2 schema in Supabase against `lib/adaptivpush_database_schema.md`
- manually verify onboarding writes the new defaults without breaking legacy-compatible reads
- manually verify profile readiness and cycle settings dual-read and dual-write correctly
- manually verify program save intentionally creates `program_generation_context` and does not regress the existing generation flow

---

### 2026-06-30 Phase 1 complete and Phase 2 queued {#2026-06-30-phase-1-complete-and-phase-2-queued}

**Summary**: Closed Phase 1 of the evidence-backed execution plan after the manual in-app `GenerateProgramModal` smoke succeeded, then moved the active documentation lane to Phase 2 schema and compatibility work.

**Changes**:
| Component | Change |
|---|---|
| Phase 1 validation | Confirmed the in-app Generate Program flow now succeeds, clearing the last documented blocker |
| living docs | Updated TODO, current-state, roadmap, and plan-index surfaces to reflect that Phase 1 is complete and Phase 2 is the active next slice |
| execution handoff | Prepared a Phase 2 execution packet rooted in the current completed Phase 1 state |

**Files Added/Modified**:
| File | Action | Purpose |
|---|---|---|
| `dev-doc/main/TODO.md` | modified | move the active implementation lane from the Phase 1 smoke blocker to Phase 2 schema work |
| `dev-doc/main/CURRENT-STATE.md` | modified | record that Phase 1 is complete and Phase 2 is now the immediate execution lane |
| `dev-doc/main/ROADMAP.md` | modified | mark roadmap step 1 done and step 2 active |
| `dev-doc/plans/active/PLAN-INDEX.md` | modified | reflect that the evidence-backed execution plan has finished Phase 1 and now points at Phase 2 |
| `dev-doc/reports/DEV-LOG.md` | modified | add the Phase 1 completion and Phase 2 transition entry |

**Validation**:
| Check | Result |
|---|---|
| in-app `GenerateProgramModal` smoke | passed |
| Phase 1 closeout gate set | now includes lint, seeded generator regression, and the successful in-app generation flow |

**Next execution lane**:
- start Phase 2 with the schema audit and additive migration slice defined in `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md`

---

### 2026-06-30 Phase 1 evidence-foundation closure pass {#2026-06-30-phase-1-evidence-foundation-closure-pass}

**Summary**: Finalized the Phase 1 evidence-foundation alignment by normalizing the canonical evidence-strength vocabulary to the execution-plan wording, correcting the remaining plan/file-path drift, and validating that the generator still matches `HEAD` when explanation metadata is stripped. This entry's remaining manual-smoke blocker was cleared later the same day.

**Changes**:
| Component | Change |
|---|---|
| evidence vocabulary | Normalized `types/evidence.ts` and `constants/evidenceRegistry.ts` to use the canonical `strong`, `moderate`, `mixed`, `emerging`, and `expert heuristic` vocabulary |
| planning docs | Corrected the Phase 1 implementation-plan file reference from `constants/programPolicies.ts` to `constants/adaptationPolicies.ts` |
| living status docs | Narrowed the active TODO from broad Phase 1 architecture work to the precise remaining blocker: the in-app modal smoke check |

**Files Added/Modified**:
| File | Action | Purpose |
|---|---|---|
| `types/evidence.ts` | modified | align evidence-strength identifiers with the approved Phase 1 vocabulary |
| `constants/evidenceRegistry.ts` | modified | map existing evidence entries onto the canonical strength labels |
| `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` | modified | remove the stale `programPolicies` filename from the Phase 1 task list |
| `dev-doc/main/TODO.md` | modified | replace the broad Phase 1 active item with the precise remaining blocker |
| `dev-doc/reports/DEV-LOG.md` | modified | record this closure pass and its current blocker |

**Validation**:
| Check | Result |
|---|---|
| `npm run lint` | passed with 0 errors and only pre-existing warnings outside the Phase 1 slice |
| direct `generateProgram(...)` smoke | passed across multiple scenarios, with explanation metadata present at program, day, and exercise levels |
| seeded comparison against `HEAD` with explanations stripped | matched across all sampled scenarios |

**Residual blocker at time of entry**:
- complete the manual in-app `GenerateProgramModal` smoke check before marking Phase 1 fully done

---

### 2026-06-29 Last-two-days planning sync for dev-doc {#2026-06-29-last-two-days-planning-sync-for-dev-doc}

**Summary**: Updated the new `dev-doc` spine to reflect the active planning work from the last two days, including creation of the evidence-backed execution plan and companion UI redesign plan in this chat, the resolved implementation-plan answers, and the shift to `dev-doc/` as the canonical living-doc workspace.

**Changes**:
| Component | Change |
|---|---|
| `dev-doc/main/` | Refreshed overview, current-state, roadmap, and TODO surfaces with the last-two-days planning context |
| active plans | Corrected the plan index and narrative docs to reflect that this chat created both the execution plan and the UI redesign plan |
| planning logs | Recorded that recent activity is currently working-tree planning/doc work rather than committed code history |

**Files Added/Modified**:
| File | Action | Purpose |
|---|---|---|
| `dev-doc/main/OVERVIEW.md` | modified | capture the recent planning split and doc-lane shift |
| `dev-doc/main/CURRENT-STATE.md` | modified | record the active last-two-days planning and repo-state changes |
| `dev-doc/main/ROADMAP.md` | modified | align roadmap notes with the new plan structure |
| `dev-doc/main/TODO.md` | modified | reflect the next actionable planning-to-execution tasks |
| `dev-doc/plans/active/PLAN-INDEX.md` | modified | add the implementation plan as an active reference and summarize recent plan updates |
| `dev-doc/reports/DEV-LOG.md` | modified | add this sync entry |
| `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | created in chat | execution-ready feature plan referenced by the living docs |
| `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md` | created in chat | companion UI workstream plan referenced by the living docs |

**Decisions Made**:
| Decision | Rationale |
|---|---|
| Treat the last-two-days update as a working-tree planning sync | `git log` showed no commits in the requested window, but the repo contains active planning/doc changes that still need canonical documentation |
| Keep the execution plan and UI plan as the active implementation drivers | They are the most execution-ready surfaces, while the implementation plan remains the upstream strategy and clarification source |
| Reflect the implementation plan in the active plan index instead of copying it into `dev-doc/` | Preserves a single source for the clarified strategy while still making it visible in the living-doc lane |
| Explicitly note plan creation when it happened in chat rather than in commit history | The dev docs should describe actual planning work, not just what appears in `git log` |

**Commits**:
- none in the last-two-days window; documentation reflects current working-tree planning state

**Next Steps**:
- choose the first bounded Milestone 1 implementation slice
- convert the clarified implementation answers into concrete Phase 1 and Phase 2 execution tickets
- keep `dev-doc/main/` synchronized as working-tree planning becomes executed implementation

---

### 2026-06-29 Dev-doc bootstrap and planning workspace {#2026-06-29-dev-doc-bootstrap-and-planning-workspace}

**Summary**: Bootstrapped the canonical `dev-doc/` workspace, established active and legacy planning lanes, and recorded the evidence-backed execution and UI planning work in the repo's new documentation spine.

**Changes**:
| Component | Change |
|---|---|
| `dev-doc/main/` | Created the living-doc spine expected by repo instructions |
| `dev-doc/reports/` | Created the new canonical dev-log location for future entries |
| `dev-doc/plans/active/` | Added an active plan index pointing at the evidence-backed execution plans |
| `dev-doc/plans/legacy/` | Added the archive folder for executed plans |
| planning docs | Added the evidence-backed UI redesign companion plan and linked it into the current planning flow |

**Files Added/Modified**:
| File | Action | Purpose |
|---|---|---|
| `dev-doc/README.md` | added | define the active documentation structure |
| `dev-doc/main/OVERVIEW.md` | added | first-read summary for current execution work |
| `dev-doc/main/TOC.md` | added | active documentation index |
| `dev-doc/main/ARCHITECTURE.md` | added | durable architecture summary for active work |
| `dev-doc/main/CURRENT-STATE.md` | added | operational snapshot and verification posture |
| `dev-doc/main/ROADMAP.md` | added | milestone sequencing and UI overlay view |
| `dev-doc/main/TODO.md` | added | active task board with status markers |
| `dev-doc/main/COMMAND-TOC.md` | added | high-value command reference |
| `dev-doc/plans/active/PLAN-INDEX.md` | added | index of active plans and owners |
| `dev-doc/plans/legacy/README.md` | added | archive rule for executed plan files |
| `dev-doc/reports/DEV-LOG.md` | added | new canonical development log |
| `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | added | execution-ready feature plan for the current implementation lane |
| `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md` | added | UI redesign plan aligned to the feature execution plan |
| `TABLE-OF-CONTENTS.md` | modified | indexed the UI redesign plan under `reports/plans/` |

**Decisions Made**:
| Decision | Rationale |
|---|---|
| Use `reports/DEV-LOG.md` as the effective source template | No standalone dev-log template file exists in the repo today |
| Keep active plans indexed from `dev-doc/plans/active/PLAN-INDEX.md` | The canonical plan files already exist under `reports/plans/` and should not be duplicated casually |
| Archive executed plans under `dev-doc/plans/legacy/` | Preserves implementation history while keeping the active plan lane clean |
| Keep dev logs outside `dev-doc/main/` | Matches repo documentation rules and skill guidance |

**Commits**:
- working tree only; no commit created yet for this bootstrap slice

**Next Steps**:
- begin execution from `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md`
- break Milestone 1 into bounded implementation slices
- move completed plan files into `dev-doc/plans/legacy/` after execution, not before

---

Historical entries before the `dev-doc/` bootstrap remain in `reports/DEV-LOG.md`.
# 2026-08-03 FABLE-5 live Supabase remediation

**Summary**: Audited and repaired the live AdaptivPush Supabase foundation for
`F5-S1`. Deployed Phase 2 ownership policies, proved two-user isolation with a
rolled-back test, hardened avatar storage, and repaired ExerciseDB identifiers.

**Live results**:

| Check | Result |
|---|---|
| Phase 2 policy coverage | 4 authenticated ownership policies on each of 7 tables |
| two-user isolation | passed owned access and denied cross-user access/linkage; test rows rolled back |
| exercise catalog | 1,369 rows; 1,318 IDs backfilled; indexed identifier column present |
| avatar bucket | public delivery retained; JPEG-only, 2 MiB, 4 owner policies |
| historical avatar objects | 19 total; 3 referenced and 16 unreferenced; future accumulation fixed, deletion awaits explicit confirmation |
| post-test Phase 2 rows | zero on all 7 tables |
| `npm run lint` | 0 errors; 17 pre-existing warnings |

**Authority record**: See
`dev-doc/reports/FABLE-5-LIVE-SUPABASE-AUDIT-2026-08-03.md` for migration drift,
the Supabase CLI normalization prerequisite, and the Free-plan backup gate.

---
