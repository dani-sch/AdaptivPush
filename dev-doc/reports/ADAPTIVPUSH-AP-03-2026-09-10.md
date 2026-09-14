# AP-03 — Durable program installation, revisions, and checkpoints

Date: 2026-09-10  
Branch/base: `codex/ap02-ap03` from `93e9f7b`  
Status: **INTEGRATION VERIFIED; RELEASE BLOCKED**

## Outcome

AP-03 now validates one complete `ProgramArtifact` and installs its program,
immutable revision, context, days, slots and active selection through one
owner-authorized database command. Generated and free manual authoring share the
same installer. A failed or stale replacement leaves the prior active program
usable. Exact V2 checkpoints and honest legacy restart semantics are separate.

The implementation is integrated and verified locally, but is not released:
the writer flag defaults off, the migration is not in production, and only a
bounded part of the authenticated Expo-device matrix has run.

## Implemented contract

- `features/programs/contracts.ts` defines the complete versioned artifact,
  stable day/slot identities, source and provenance, context, checkpoint and
  validation. A blank optional name becomes `My Training Program`; presentation
  depth does not alter the prescription artifact.
- `features/programs/installStore.ts`, `repository.ts` and `commands.ts` keep an
  owner-scoped pending operation/fingerprint across response loss and invoke
  `install_program_v2` rather than coordinating client writes.
- `utils/saveProgramToDb.ts` rejects disabled installation before catalog,
  profile or database work, preserves the actionable rollout error, then when
  enabled resolves the full catalog before mutation, rejects any incomplete
  mapping, builds complete context and installs atomically.
- `app/create-program.tsx` uses the same contract for the free manual path.
- Quick Setup permits skipping DOB, sex and weight while retaining required
  training experience. It does not invent health consent.
- Current-program, overview and archive surfaces read revision/stable identity,
  show persisted context, label absent legacy rationale as unknown, remove the
  visible development-program path, reject direct mutation of immutable V2
  prescriptions, and distinguish exact resume, restart and legacy approximation.

## Database authority and compatibility

The shared migration and SHA-256 are recorded in the AP-02 artifact. It adds
program schema/current-revision/lifecycle/source/checkpoint/provenance fields,
immutable `program_revisions`, stable day/slot identities, context revision
lineage, installation/lifecycle receipts and a partial unique index enforcing
one active program per owner. Existing rows are snapshotted as current known
state with explicit `migration_snapshot`/unknown provenance; no historical
prescription is invented.

`install_program_v2` validates the full hierarchy and catalog UUIDs before
activation, uses authenticated owner authority, fixed search path, advisory
serialization and base-revision checks, then commits the hierarchy and active
choice atomically. Identical operation replay returns the original receipt;
payload mismatch and stale competing installs fail. V2 hierarchy rows are
command-owned and immutable to ordinary direct writers.

`archive_program_v2` and `restore_program_v2` retain exact revision/checkpoint
and history. Legacy rows expose restart/approximate semantics without backdating
or fabricating a precise checkpoint.

## Executed evidence

| Gate | Result |
|---|---|
| Contract fixtures | `npm run test:programs`: 6 passed: the original four naming/mapping/depth/manual cases plus disabled/enabled rollout-guard behavior. |
| SQL failure/isolation suite | PASS after fresh local reset: hierarchy/context failure preserves prior active, one-active invariant, stale concurrent install conflict, replay/mismatch, immutable V2 denial, exact archive/restart and retained history. |
| Catalog regression | `npm run test:catalog`: 9 passed; AP-01.3 SQL authority/isolation suite also passed. |
| Schema/static/integration | Same fresh-reset, lint, TypeScript, local dry-run and clean integrator results recorded in the AP-02 artifact. |
| Native build | Android 16 API 36 x86_64 emulator; Expo SDK 57 native development build compiled and installed with JDK 17.0.20.1. Expo Go was not used because SDK 57 `expo-notifications` requires a development build. |
| Flag-off generated save | Reproduced the pre-fix generic `Program save failed`. After the fix the UI showed `Atomic program installation is not enabled for this build. Your existing data has not been changed.` A sentinel profile value remained 45 and the authenticated owner retained zero program and generation-context rows. |
| Flag-on generated save | Against local Supabase and a local catalog fixture sourced from the repository snapshot, the same authenticated flow installed one active schema-v2 program with one revision, 24 day rows, 112 prescription slots and one generation context. No production credential or mutation was used. |
| Hardening integration | Integrator merge `91ceb50` is clean: catalog 9/9, workouts 5/5, programs 6/6, strict TypeScript pass, and lint pass with zero errors/three unrelated warnings. No SQL changed, so the previously recorded fresh-reset and SQL integration evidence remains the applicable database gate. |
| Production preflight | Dashboard shows production still at the two AP-01 migrations and no managed backups. No install, archive, schema or ledger mutation occurred. |

## Acceptance disposition

| Acceptance | Result |
|---|---|
| AC-TR-016 | Local/integration pass for immutable current revision and stable completed references; Android generated activation renders, while deliberate replacement preview remains open. |
| AC-TR-017 | Pass for atomic failure, replay, mismatch and stale competing activation. |
| AC-TR-018 | Android 16 Quick Setup reached generation with DOB, sex, gender and weight omitted; interruption proof remains open. AP-06 still owns richer goal/availability constraints. |
| AC-TR-019 | Pass: presentation depth is stripped from the artifact fingerprint/prescription. |
| AC-TR-020 | Existing compatibility precedence retained; broader AP-01 missing-schema device matrix remains open. |
| AC-TR-021 | Pass for V2 exact checkpoint/restart and history retention; legacy is explicitly approximate. Device UI proof remains open. |
| AC-TR-022 | Contract pass for blank default/custom naming and Android generated default-name save. |
| AC-TR-023 | Pass at contract/source level: free manual build uses common installer; authenticated manual-device proof remains open. |
| AC-TR-024 | Implemented persisted context versus legacy unknown rationale and removal of the dev CTA; device presentation proof remains open. |
| AC-TR-025 | Stored artifacts are not entitlement-gated; offline/downgrade device proof remains open. |

## 2026-09-11 successor-revision and device addendum

Status of this bounded packet: **INTEGRATION VERIFIED; RELEASE BLOCKED**.

Migration `20260911120000_ap03_revision_safe_exercise_swap.sql` has SHA-256
`3303D5E9737481942EBB74794BD0AAC341119DC1CCCE4F7927E41F9CD6C6A98E`.
Its authenticated `revise_program_exercise_v2` command locks and validates the
owned active program/base revision, catalog replacement and stable day/slot,
then creates one immutable successor. Completed days retain the base
prescription; only future uncompleted matching slots change. Suggested loads
are cleared and recalibration is required for changed future slots.

The operation receipt makes identical replay idempotent, rejects operation-ID
payload reuse, and returns an explicit stale-base conflict without changing the
prior active program. Direct ordinary-client V2 prescription updates remain
denied. The free manual creation path is unchanged and available; no production
rollout flag was enabled.

Android local evidence starts from a frozen current workout, applies a future
swap, and observes exactly two revisions with the active pointer advanced once.
The current week remains on its original prescription, later uncompleted weeks
use the replacement with null load/recalibration required, and the current
draft retains its completed original set identity through rerender, navigation,
reload, offline restart and a later current-only swap. Current-draft and future
program results are displayed separately.

Fresh local reset, database lint, the AP-01/combined AP-02/AP-03/successor SQL
suites, catalog 9/9, dependency 1/1, workouts 13/13, programs 10/10, strict
TypeScript, lint, Expo doctor, Android Metro export and native debug assemble
pass on the feature branch and integrator merge `54e5a39`; the merged native
assembly completes in 5m08s with all 435 tasks executed. Physical-device, old-client, accessibility,
production backup/deploy and flag-enable gates remain open.

## Rollout, recovery, and open gates

`EXPO_PUBLIC_AP03_ATOMIC_WRITER` defaults off and enables only for literal
`true`. Disable the producer on incident while retaining immutable revisions,
receipts, checkpoints, installed artifacts and history. Never reactivate the old
deactivate-then-multiwrite coordinator or delete the prior usable program as a
rollback.

Release hardening commit `dec5170` adds the public entry-point guard before any
server work and retains the repository error text. The Android flag-off probe
proves the bounded no-server-mutation behavior. It does not close manual save,
archive/restore, interruption, two-device, old-client or accessibility coverage.

Release has the same fresh encrypted backup/restore, secure CLI reauthentication,
Expo-device matrix, production dry-run/apply, authenticated old/new-client and
two-owner verification, flag enablement and monitoring gates listed in the AP-02
artifact. No production deployment or release claim was made.

## Commits

AP-03 is delivered by the same six focused implementation commits listed in the
AP-02 artifact plus release-hardening commit `dec5170`. Integration merge
commits before the original evidence closeout are `c6bc219`, `8884d5f` and
`7acc28f`; hardening integration merge `91ceb50` passed the changed-surface
gates recorded above.

The 2026-09-11 packet implementation commits are `cd057ae`, `07e3403`,
`cd6310f`, `318579f`, `39039e3` and `e6754c2`; integration reconciliation is
pending at this addendum stage.


## 2026-09-14 pre-QA release-hardening addendum

The bounded release task on `codex/ap02-ap03-release` adds owner-pinned program
installation, exact durable install and lifecycle retry requests, and lock-before-
receipt replay ordering. Future swaps protect completed slots across ancestor
revisions. Exact archive checkpoints retain elapsed placement and the original
start date; explicit restart/legacy approximation remain separate. Archived
program reads fall back for legacy schema and reject stale previous-owner
responses. These local source corrections do not constitute new user device or
production evidence.

Secure CLI/database authentication for `thfxcvxcsfvrzdysdnkq` is independently
verified through the local DPAPI-protected helper. The reviewed production
packet is exactly `20260910210000_ap02_ap03_durable_workouts_and_program_revisions.sql`
then `20260911120000_ap03_revision_safe_exercise_swap.sql`; both remain unapplied
and were corrected in place locally. Earlier hashes and results in this report
remain historical; use the [September 14 release report](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md)
for final current hashes, commands, commits and integration evidence. This
addendum does not claim completion of ongoing local PostgreSQL 17 or build gates.

The [user QA matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md)
covers the remaining physical-device/accessibility, manual installation,
archive/restore, account switching and old-client evidence on a final bound
build. Required pre-migration passes precede fresh encrypted production backup
and isolated restore, exact dry-run, application and verification. No fresh
backup or production migration was performed during authentication/pre-QA work.
Both production writers remain off pending all gates, real application and
distribution identity, signing/deployment ownership, rollback rehearsal and
payload-free monitoring. AP-04/AP-05 remain outside this task.


### September 14 final pre-QA binding

The complete automated packet passed (59 unit cases and static/build/database
gates). Clean Android source `42f317d66baa171d5fc5f80d6810ed9c31c46277` is
integrated at `7cdf598d4fb7a93a882c09448b67807409e669e3`. Separate embedded
enabled/disabled local APKs are verified. See the [final release report](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md)
and [bound manual matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md).
No manual pass, fresh production backup/restore, migration or writer enablement
is claimed. The original dated results above remain historical.
