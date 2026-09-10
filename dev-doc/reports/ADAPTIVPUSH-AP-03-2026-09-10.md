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

