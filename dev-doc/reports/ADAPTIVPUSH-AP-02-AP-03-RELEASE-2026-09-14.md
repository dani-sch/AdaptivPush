# AP-02/AP-03 durable-record release packet - 2026-09-14

## Status and evidence boundary

**INTEGRATION VERIFIED — RELEASE BLOCKED** retains the prior September 11
integration result. **Final September 14 build and integrator binding are
pending.** The completed checks below are intermediate results reported by the
release coordinator; they do not constitute the final clean-dependency packet
after all tooling changes. The coordinator must append exact final commands,
artifact identifiers, hashes and integration results before issuing the manual
handoff. No new manual, visual, physical-device, accessibility or interaction
test has been performed or passed by this task.

Scope is AP-02/AP-03 durable records and their task-scoped documentation
lifecycle. AP-04/AP-05 were not started. Work is on
`codex/ap02-ap03-release`, based on `origin/main` commit
`9d968d56e49483c854219a5d57bee4d375c946bd`. Both production writers remain
disabled. Production migration and a fresh pre-migration backup/restore must
wait for the user's required manual results.

## Implemented changes and corrected defects

| Change | Result / source |
|---|---|
| Concurrent replay receipt race | The database takes the owner advisory transaction lock before checking an existing operation receipt, so a concurrent retry observes the completed operation instead of acting on a stale pre-lock read. Both pending migrations and the real concurrent-connection harness cover this boundary. |
| Mutable finalization retry | The workout draft retains its exact submitted payload and end time; response-loss retry reuses them. Pending/finalized inputs and swaps reject edits; confirmed definitive rejection clears the retry state needed for a corrected attempt. Workout commands, contracts and draft store own this behavior. |
| Installation/lifecycle retry drift | Durable installation and archive/restore stores retain the accepted request across retries; installation stays pinned to the captured owner. A definitive rejection clears stale retry state, while an uncertain result retains it for reconciliation. |
| Completed ancestor revision exposure | Future exercise revisions protect completed sets linked to ancestor revisions while the current workout retains its frozen revision/prescription. |
| Actual load and derived PR semantics | External kilogram load converts to pounds for compatible aggregate volume; assistance/bodyweight do not inflate external-load volume. PR candidates use the actual exercise identity and supported external load units. Zero and unknown remain distinct. See `features/workouts/actualLoads.ts`. |
| Archive placement drift | Exact checkpoint captures elapsed placement and resumes without rewriting the original program start date. Explicit restart and legacy approximation remain distinct; legacy provenance cannot be accepted as an exact checkpoint. See `features/programs/checkpoint.ts` and lifecycle commands. |
| Archive compatibility and account isolation | Archived reads fall back for the supported legacy schema and reject obsolete previous-owner responses after account switches. |
| Accessible input and pending controls | Workout set controls have contextual names, states and read-only behavior; archive and workout controls receive bounded accessible-target corrections. Physical TalkBack/VoiceOver, touch, large-text and appearance evidence remains user-owned. |
| Local testing support | `scripts/Start-ApManualQa.ps1` checks clean source compatibility, obtains only local Supabase configuration, sets flags for the local bundle and supports Android USB reverse mappings. `scripts/seedManualQa.ts` seeds supported local catalog names with no production-target option. `scripts/verifyDurableConcurrency.mjs` exercises separate database connections. |
| Documentation lifecycle | The canonical documentation instructions, document/sprint skills and AGENTS now archive task-consumed temporary material during the same task, preserve provenance, repair direct references and update living owners in place. Full audits remain explicitly invoked operations. |

## Local commits

| Commit | Meaning |
|---|---|
| `ff29ccf49091eec7f3456520a3e68bb0426fc8e9` | Task-scoped documentation lifecycle and exact prompt archival |
| `1f00146` | Client durable retries, load/PR semantics, checkpoint placement, owner and accessibility corrections |
| `94c21a2` | Serialized database replay, revision lineage protection and SQL/concurrency regression coverage |
| `027d348` | Local manual-QA launcher and catalog fixture commands |

This report's preparatory documentation commit will follow those units. The
coordinator must append its final commit and actual integrator merge result;
neither is inferred from the historical `54e5a39` integration record. No direct
push to main or force-push is authorized.

## Intermediate automated and build results

The coordinator reported the following September 14 results before this
preparatory report. These results must be followed by the complete final packet
from the final clean dependency state and a current integrator verification.
Do not use the earlier native build or export as a bound final manual artifact.

| Check / existing command surface | Observed intermediate result |
|---|---|
| Clean dependency installation, `npm ci` | Passed |
| Catalog, `npm run test:catalog` | 9 passed |
| Dependencies, `npm run test:dependencies` | 1 passed |
| Workouts, `npm run test:workouts` | 22 passed |
| Programs, `npm run test:programs` | 15 passed |
| Availability, `npm run test:availability` | 12 passed |
| Combined `npm run test:ap02-ap03` | Its component results are above; final complete-packet transcript still required |
| Strict TypeScript and application lint | Final current-packet results to be appended; not claimed from component tests |
| Expo Doctor | 21/21 passed |
| Metro Android export | Passed; final bundle binding pending |
| Metro iOS export | Passed; this is not an iOS native build or device result |
| Android native debug baseline assembly | `BUILD SUCCESSFUL`; final artifact/source/hash binding pending |
| Fresh local PostgreSQL 17 Supabase reset | Passed with the two AP-01 and two AP-02/AP-03 migrations |
| Local database lint | Passed |
| `supabase/tests/ap_01_3_catalog_authority_isolation.sql` | Passed |
| `supabase/tests/ap_02_ap_03_atomicity_and_isolation.sql` | Passed |
| `supabase/tests/ap_03_program_revision_swap.sql` | Passed |
| `npm run test:database-concurrency` | Six assertions passed using real concurrent database connections |
| Documentation checks | Targeted moved-path/direct-link checks, archive hashes, unchanged historical evidence and scoped whitespace checks passed; final TOC refresh remains pending |

The checks preserve distinctions between deterministic/source proof, isolated
database proof, build preparation and user-visible physical-device evidence.
No manual test is inferred from any row above. Final commands, environment,
elapsed times where recorded, logs, complete-packet counts, remaining failures
and integration outcome belong in the coordinator's final addendum.

## Production authentication and read-only state

The exact production project was independently reconfirmed as
`thfxcvxcsfvrzdysdnkq`, healthy in `us-east-1`, on PostgreSQL `17.6`.
Read-only inspection found 16 public tables and exactly these ledger versions:

1. `20260910175317` - AP-01 baseline.
2. `20260910190000` - AP-01 catalog authority.

The durable AP-02/AP-03 schema is absent. Both reviewed migrations below remain
unapplied. Secure direct database authentication works through the local
DPAPI-protected credential helper outside the repository. The CLI
`db query --linked` management path still returns permission error `42501`;
that separate management path failure is not evidence that direct authenticated
database access failed. No credentials, connection strings, private records or
raw user payloads are recorded here.

This task performed no production writes. Authentication and read-only
inspection do not authorize an unexpected project or remove the requirement to
reconfirm identity, health, PostgreSQL version, link, ledger and drift before
each remote write boundary.

## Reviewed production migration packet and hashes

These are SHA-256 values of the current reviewed local file bytes, computed on
September 14 after SQL correction commit `94c21a2`. Earlier dated AP-02/AP-03
reports retain earlier hashes as historical evidence. Recompute and match the
final reviewed artifacts immediately before any production dry-run/application.

| Order / migration | SHA-256 |
|---|---|
| 1. `20260910210000_ap02_ap03_durable_workouts_and_program_revisions.sql` | `FB50D57063E5AE1B3BAFD863060818C6795E2A7E01026960F1A66558B70BFA64` |
| 2. `20260911120000_ap03_revision_safe_exercise_swap.sql` | `60399252D076A2B72823CF19C3A62308A750C78DDEFAB7AC64F1DDCF6B77D9A0` |

Both files were corrected locally before their first production application.
After manual pre-migration passes and the fresh recovery proof, the production
dry-run must list exactly those files in that order, with nothing else. A ledger,
identity, drift, hash or dry-run discrepancy stops the write path for inspection.
Do not reset production, repair migration history, delete production data, drop
durable records or apply unrelated migrations.

## Backup, restore and rollback boundary

**Fresh AP-02/AP-03 production backup: not yet captured. Restore of that fresh
backup: not yet performed. Production migration: not applied.** These are
deliberately deferred until the required user pre-migration tests pass. The
historical AP-01 recovery set is not a fresh recovery point for this amended
release packet.

After manual passes, capture fresh roles/schema/data dumps using pinned
Supabase CLI `2.117.0` and PostgreSQL 17-compatible tooling. Store them outside
the repository in a new timestamped recovery directory, encrypt immediately
with AES-256-GCM, protect the key with Windows DPAPI CurrentUser, and record
plaintext/encrypted hashes and a redacted custody/retention/exclusion manifest.
Decrypt and destructively restore only into a separate isolated local
PostgreSQL 17 target. Compare safe relation counts and aggregate schema,
constraints, indexes, functions, grants, RLS, policies and ledger; retain managed
role and Storage-body caveats. Remove plaintext and temporary restore material
only after authenticated restore proof. Recheck encrypted/key artifact hashes
immediately before the production migration.

Rollback disables producers and preserves drafts, receipts, revisions,
checkpoints, sets and history. Forward-fix additive records; do not restore
unsafe multiwrites or delete records as recovery. Actual rollback rehearsal and
monitoring ownership remain writer-enable gates.

## Manual build and user handoff

The [manual QA matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md)
contains 27 pre-migration cases, three pre-writer cases and one observation case.
It is **unbound and not executable yet**. The coordinator must supply the exact
final commit, build ID/hash/platform, isolated backend, fixture manifest and
launch command before asking the user to run it. Enable both writer flags only
in that local manual-testing configuration; keep production flags default-off.

Android debug tooling exists, but a physical Android pass is still required.
iOS Metro success does not supply iOS hardware, a signed native build or
VoiceOver evidence. Legacy build and special conflict/missing-schema fixture
availability must be explicit. Unavailable required cases stay blocked, not
silently omitted. The tester provides only actual device observations;
coordinator-owned supporting database checks and all already automated proofs
remain agent work.

## Remaining release blockers and next action

- Finish the final clean-dependency test/build/local-database packet and current
  integrator verification; bind the actual manual candidate.
- Obtain user passes for the applicable blocking physical-device, interaction,
  accessibility, recovery, archive and legacy compatibility cases.
- Then create and verify the fresh encrypted production recovery set, perform
  the exact two-migration dry-run/application and rolled-back production probes,
  and prove expected ledger, authority, isolation and compatibility.
- Supply a real application/distribution identity. Repository `temp-app` /
  `tempapp`, missing declared package/bundle IDs and no established `eas.json`
  do not establish a production destination. Signing, deployment ownership and
  supported platform/OS scope must be real, not invented.
- Rehearse rollback and establish named payload-free monitoring of conflicts,
  replay, pending age, failures and outcome coverage before enabling production
  writers. Do not mark `RELEASED` with any gate unresolved.

The next agent action is to finish and record the final packet, integrate and
bind the manual build. The next user action follows only after that binding:
execute the numbered QA cases and return their compact result template. There
is no authentication action currently requested from the user.

## Documentation archival and ownership

The consumed `dev-doc/plans/active/EXECUTION-PROMPT.md` was archived byte-for-byte
as [the September 14 intake snapshot](/dev-doc/plans/legacy/2026-09-14-superseded/dev-doc/plans/active/EXECUTION-PROMPT.md),
SHA-256 `c5d11467f6c388269786e0332488dba7663602a6e2093d52e3165ee8583d5304`.
The earlier FABLE-5 archive remains untouched with SHA-256
`80eaee91a674beaf80470266b61497fe3b6cb8dc15940fe79c847220f9244cac`.
[TODO](/dev-doc/main/TODO.md), [CURRENT-STATE](/dev-doc/main/CURRENT-STATE.md)
and the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md)
are its current execution successors. The owning inventory records the distinct
provenance. Dated AP-02/AP-03 reports and prior DEV-LOG entries remain intact;
new observations were appended separately. No current chat prompt was saved.
TOC regeneration is required at final closeout because files moved/were added.
