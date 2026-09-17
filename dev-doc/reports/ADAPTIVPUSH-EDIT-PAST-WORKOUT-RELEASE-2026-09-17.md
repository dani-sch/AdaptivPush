# Edit Past Workout release — 2026-09-17

## Release result and root cause

Past-workout editing is released to the verified AdaptivPush hosted backend and passed authenticated browser edit, cancel, save and reopen acceptance. The original session remains finalized and retains its ID. Home Last Workout, History, Plan preview and the full-program completed-day action all reach the editor. Physical iPhone acceptance is unperformed; this is not a claim of native-device or app-store distribution acceptance.

The original blanket unavailable state was caused by an actual backend contract gap: the hosted ledger contained five migrations, neither correction extension was installed, and the capability/correction functions were absent. Eligible editing requires capability integer `2`, a correction revision and finalized lifecycle. Both authorized migrations are now deployed. The client also needed navigation, recovery, validation, load semantics and account-change fixes; deployment alone did not close acceptance.

## Application changes

- Retain the existing completed-workout route and shared exercise cards. Show accurate eligibility, capability transport, authorization and pending-storage failure messages while retaining readable history where safe.
- Support performed exercise, pounds/kilograms, explicit bodyweight/assistance, repetitions, RPE, skipped/not-attempted prescription outcomes, and extra-set addition/removal. Bodyweight has no editable external-load value. Clearing a prescribed result retains its prescription identity.
- Validate UUIDs, safe revisions, set/order identities, load semantics, outcomes and outcome/actual consistency. Clone submitted outcomes so uncertain retries keep the exact original operation. Definitive validation rejection releases that pending operation for correction.
- Guard duplicate saves and ignore asynchronous results belonging to a previous owner. Clear sensitive editor state on sign-out/account change. Retain pending commands across uncertain responses and recover before accepting a changed request.
- Use supported Expo Router navigation context, guard unsaved navigation, and use an accessible discard confirmation modal. Dismiss Plan/History overlays before navigation; add full-program completed-session routing and tab/action accessibility labels. Preserve keyboard avoidance, wrapping names, minimum touch targets and status announcements; physical behavior remains unverified.
- Load the complete catalog with ordered pagination, including options beyond the first 1,000 rows. Recover frozen prescription identities from older actual-row shapes and preserve explicit missing legacy context.

Principal files: `app/edit-workout.tsx`, `app/(tabs)/plan.tsx`, `app/(tabs)/_layout.tsx`, `app/program-overview.tsx`, `components/ExerciseCard.tsx`, `components/WorkoutTemplateModal.tsx`, `features/workouts/correctionEditor.ts`, `correctionContracts.ts`, `correctionCommands.ts`, `occurrenceRepository.ts`, `effectiveOccurrence.ts`, focused tests and the concurrency verifier. Existing History and Home entry points were verified rather than rebuilt.

## Verified deployment identity and exact packet

| Property | Verified value |
|---|---|
| Project | AdaptivPush — `thfxcvxcsfvrzdysdnkq` |
| API URL | `https://thfxcvxcsfvrzdysdnkq.supabase.co` |
| Region / health | `us-east-1` / `ACTIVE_HEALTHY` |
| Independent identity | Authenticated CLI project listing; linked reference; app URL; project-specific pooler username |
| Database identity | TLS certificate verified; current/session role `postgres`; PostgreSQL 17.6 |
| Supported tooling | Supabase CLI `2.117.0`, `db push --linked --dry-run`, then `db push --linked --yes` |
| Deployment recorded | `2026-09-17T18:52:34.545Z` |
| Lock / statement bound | `5s` / `90s` via session options |

Only these two pending migrations were applied, in order. SHA-256 values describe the exact deployed file bytes; line-ending conversion in another checkout can change byte hashes.

| Version / filename | SHA-256 |
|---|---|
| `20260915190000_workout_swap_scope_and_completed_corrections.sql` | `ababd2c33f0bd037ac9951ff0e11378dd4722a56dd7177eaae0d961dd3179056` |
| `20260915210000_effective_workout_occurrences.sql` | `e156c88bb8f1badf0cd3fdb74a8bd295029aa60c14f8b7427eb82d17385032c1` |

The final authoritative ledger has seven entries: `20260910175317`, `20260910190000`, `20260910210000`, `20260911120000`, `20260915151000`, `20260915190000`, `20260915210000`. Each new migration used the supported tooling's transactional migration/ledger handling; no claim is made that the two-file packet was a single transaction. API schema reload notification followed deployment. No partial SQL fragments or manual ledger repairs were used in production.

Before deployment, schema/function/grant/policy/index/constraint/RLS inventories were compared with the expected baseline and isolated restore. Neither extension was manually present under another version. Fresh platform bootstrap differences (column order, normalized function text and managed service-role default grants) were reconciled in isolation; no unexplained production drift remained. Post-deployment inventory matched the rehearsed target. All 56 original non-ledger relations retained their counts and original-column row hashes immediately after rollout.

The first migration was strengthened before its first hosted application: reject missing arrays, invalid/non-finite load semantics, cross-day prescription lineage, duplicate/contradictory outcomes and mismatched actual results; preserve explicit cleared outcomes; produce an empty audit set array rather than a null placeholder. The second migration retains effective snapshots, stable swap lineage and occurrence uniqueness, and advertises capability `2`. Existing rows and immutable prescription provenance were preserved. The known 32 empty legacy non-rest days were not populated with invented exercises.

## Backup and isolated restore

A fresh consistent logical snapshot was captured at `2026-09-17T18:37:30.587Z`, using a shared exported PostgreSQL snapshot for dump and source fingerprints. Encrypted backup custody is outside the repository:

`C:\Users\dani2\AdaptivPush-secure-backups\Edit-Past-Workout\20260917T183719Z`

The APBACKUPv2 envelope uses AES-256-GCM and a random key protected by Windows DPAPI CurrentUser. Directory access is restricted to the current Windows user. Custodian: `dani-sch`; retention: 30 days after verified rollout. No plaintext dump/key files were written.

| Artifact | Evidence |
|---|---|
| `database.dump.apbak` | 1,355,520 bytes; encrypted SHA-256 `5950a6a97f0629bc8aa7dc26fedb8592ec71482d7ffd0b92bcbb6145366c3a98` |
| Decrypted database stream | SHA-256 `b7277be846d0836a90f0c3bfb8dd19f7a0eccaec681c65c25fe146bd77278eed` |
| `roles.sql.apbak` | SHA-256 `f3caaed91d451328fc458773cf35267d474e64fe706feba8df73a86c8581566d` |
| `role-catalog.json.apbak` | SHA-256 `7f3c1d404c373f97239c8284b9f6c03604913fa67865538e41d4af2f0343d08c`; 13 roles and 19 memberships |
| `backup.key.dpapi` | SHA-256 `a87b36d5b51addd6ebcd94296dab2efc086f7e109e3e81b6a39f948d4a098fad` |

Restore completed at `2026-09-17T18:41:13.994Z` into a dedicated PostgreSQL 17 container with network disabled and no published ports. All 57 captured relation counts and full-row fingerprints matched the source, including the ledger. Seven public schema/security inventory sections matched. The logical restore uses no-owner handling for hosted managed-role ownership; this is not physical infrastructure recovery. Auth/storage metadata is included, but Storage object bodies, platform settings/secrets, login password hashes and infrastructure/PITR are excluded.

The exact final migration files also passed a fresh empty-database application with schema-only Supabase platform bootstrap and a complete rehearsal from an untouched restored hosted baseline. The user's ordinary local Supabase database was not reset.

Forward recovery: disable the affected producer while preserving readable history and exact pending requests; retain new revisions, receipts, audit and accepted writes. Verify encrypted hashes and DPAPI custody, restore only into isolation, reconcile accepted operations, rehearse and deploy an explicitly reviewed forward fix. Never reset production or overwrite newer writes with the pre-release backup as routine rollback.

## Verification results

| Gate | Result / scope |
|---|---|
| Dependency/navigation tests | 2 passed, 0 failed |
| Workout tests | 61 passed, 0 failed; validation, finalize, outcomes, legacy projection, recovery, replay and stale conflicts |
| Program tests | 20 passed, 0 failed |
| Availability/resilience tests | 13 passed, 0 failed |
| Unique focused application cases | 96 passed, 0 failed; independently repeated in integrator |
| Strict TypeScript | Passed |
| Application lint | 0 errors; 3 existing unrelated warnings (forgot-password, Home, Profile) |
| Concurrent database assertions | 8 passed, 0 failed, including same-operation correction replay and competing revision conflict |
| SQL suites | Four suites plus migrated-legacy variant passed on fresh database, restored rehearsal and hosted rolled-back probes: 15 suite executions, 0 failures |
| Database lint | Local and hosted warning-level checks passed without reported schema warnings |
| Final web export | Passed, 35 routes |
| Final authenticated browser console | No reported errors on the final acceptance tab |
| Required `ruff check scripts/ tests/ src/` | Failed with one E902 because this checkout has no `src/` directory |
| Applicable Ruff paths | `ruff check scripts/ tests/` exits 0 with no Python files found under configured discovery; no tracked Python changes, so broad pytest not applicable |

The repository contains local workflow tooling excluded from tracked application Python surfaces; the missing `src/` was not fabricated to turn the mandated command green. Initial implementation/rehearsal issues were fixed and the final relevant checks rerun. Hosted lint initially attempted an unavailable temporary CLI login-role path; using the existing securely held database credential completed the supported lint check. No production workaround schema changes were made.

## Authenticated hosted acceptance

Two temporary synthetic owners and one installed/finalized test workout were used. The browser used ordinary sign-in and the public client connection to the actual hosted project. Privileged setup/verification remained outside the application bundle.

| Check | Result |
|---|---|
| History open / Update Workout | Passed; capability integer `2`, eligible finalized row, no blanket unavailable message |
| Cancel | Passed; edited reps discarded; original result and audit base remained unchanged |
| Edit/save | Passed: performed exercise swap, kg/lb, bodyweight, assistance, reps, RPE, skip, clear/not-attempted, extra add/remove |
| Same session / no duplicate | Passed: `f0ebb549-048a-41fb-8a18-7c406e0816e8`, one session, revision 1 after browser save |
| Derived result | Four actual sets; explicit prescribed outcomes; partial completion; 761.39 lb volume; two session-owned record effects |
| Close/reopen | Passed: closed browser tab, reopened app with retained authentication, and read corrected durable values |
| Other completed entry points | Passed: Home Last Workout, Plan preview and full-program completed-day action |
| Reload/discard and full catalog | Passed: keep/discard confirmation and catalog options beyond first 1,000 rows |
| Lost-response exact retry | Passed using the real correction command against hosted RPC: discard accepted response, serialize pending operation, recover in a separate process; exact replay returns revision 2 without revision 3 or a second application |
| Stale conflict | Passed in hosted command and browser; competing revision rejected, current durable result reloaded with accurate notice |
| Second owner | Cannot read session/sets/receipts or correct the workout |
| Anonymous client | Capability and correction execution denied |
| Internal audit | Ordinary authenticated table SELECT denied; two accepted corrections produce two audit rows; cancel/replay add none |
| Missing capability compatibility | Actual hosted history reads with a capability-only missing-RPC adapter remained readable and non-editable; production capability was not revoked |
| Account change while editor open | Signing out through another app tab cleared the open editor and returned both tabs to welcome |

The response-loss test uses a serialized file-backed command store across separate processes. It proves the command/outbox contract, not native AsyncStorage process-kill behavior or a browser network fault injected into Save. Browser tab reopen is not an iOS process restart. No physical iPhone was available: keyboard, VoiceOver, large dynamic text, native dismissal/back, native kill/reopen and the wider archive/start/generation device regressions remain unperformed.

Both temporary owners and the single fixture session were removed using exact synthetic identities. Every one of the 21 original public relations matched its pre-release original-column row hashes/counts after cleanup. Auth audit traces generated by legitimate test sign-ins are outside that post-cleanup equality claim. Shared catalog and existing user workouts/programs were untouched. Temporary recovery infrastructure is removed after verification; encrypted recovery artifacts and restricted evidence remain retained.

## Source, integration and evidence

Feature branch: `codex/edit-past-workout-release`, based on `b48a984` (merged PR #56). Focused implementation commits:

- `d0962fa` — completed-workout editor, recovery and compatibility hardening.
- `38848f6` — SQL correction semantics, lineage, outcomes and concurrent correction tests.
- `812498d` — navigation, catalog and authenticated acceptance fixes.

The canonical `integrator` worktree merged the first two at `6c6c94b`, then the final application commit at `974007a`. The final integrated application independently passed all 96 focused cases, TypeScript and lint. Release documentation commit `c65aef6` was integrated at `9463862` with an identical tree. Publication uses [PR #57](https://github.com/dani-sch/AdaptivPush/pull/57); subsequent documentation reconciliation and the final merge are recorded in that review and Git history. No force push or direct main push is part of this release.

Restricted raw evidence and reproducible verification helpers are outside Git at `C:\Users\dani2\AppData\Local\AdaptivPush\release-evidence\2026-09-17-edit-workout`: project/schema inventories, reviewed hashes, backup/restore comparison, dry-run, deployment, security, original-data preservation, authenticated acceptance, pending recovery, cleanup, and source/integrator test logs. Sensitive backup contents and credentials are not published with this report. September 14/15 reports retain their original historical scope.

AP-04 scheduling and AP-05 broader progression/history authority remain queued. This release completes the authorized same-session past-workout correction feature and its hosted/browser verification; it does not claim those later slices or unperformed native acceptance.
