# AdaptivPush current state

## September 15 controlling rollout state

The user explicitly authorized the hosted AP-02/AP-03 migrations and writer
enablement after agent-run backup/restore and technical verification. This
replaces all earlier pre-migration local/manual/QA-account, physical-device,
signing, standalone-build and distribution gates below. Acceptance follows
deployment using the existing account, ordinary `npm start` and Expo Go QR.

Fresh inspection: expected project `thfxcvxcsfvrzdysdnkq`, PostgreSQL 17.6,
only AP-01 ledger entries, missing revision table, normal served iOS bundle
targeting that project with both writers off. Exact two-migration dry-run passes.
**Blocked before fresh backup/restore:** Docker Desktop Linux engine fails at
its `dockerInference` runtime socket. Supported restart did not recover it;
automatic review rejected process/socket cleanup. No production writes,
configuration changes or fresh private dumps occurred. Existing encrypted
AP-01 artifacts hash-match but are stale and exclude Storage bodies.

Resume agent-run recovery and deployment after Docker is operational while
preserving volumes. No new rollout consent or local user QA is needed. Physical
iPhone acceptance and recurring native startup behavior remain unverified.
The [September 15 report section](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md)
supersedes earlier rollout sequencing below; retained earlier measurements do
not establish current production functionality. AP-04/AP-05 remain out of scope.

## Planning and code posture

- September 14 iPhone remediation: typed program failures and shared strict workout-entry availability are implemented and tested; legacy views no longer promise a start without durable identity. A LAN synthetic QA route and verified enabled/disabled iOS Expo Go bundles are prepared. The original/current production-targeted bundle has writers off and production still lacks the durable schema. App Store Expo Go SDK 57 / iOS 26.6.1 is user-reported; physical cold launch and five-flow retest remain unverified. The [release addendum](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md) owns current evidence and the [manual matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md) owns precise retest steps. Signed native/signing identity, accessibility and production backup/migration gates remain open; Expo Go preparation does not close them.

- Neutral [plan index](/dev-doc/plans/active/PLAN-INDEX.md) routes the approved product contract and supporting owners.
- AP-01.1 captured current read-only database/repository evidence. AP-01.2a locally implements lookup-only generated/dev saves, explicit source/exact identity, UUID-guarded swaps, and administrator-only seed code.
- AP-01.3 completed the supported production baseline and aligned ledger, encrypted PostgreSQL 17 backup/decryption, local destructive restore and semantic comparison, cross-schema signup-trigger reconciliation, fresh role/Storage suite, and production catalog enforcement. The shared catalog is SELECT-only for ordinary roles; trusted curation remains available.
- The encrypted recovery set is outside the repository under the named sole-developer custodian, with plaintext removed after restore proof. Production and local role probes rolled back their synthetic rows; catalog count remains 1,369.
- AP-02 and AP-03, including the 2026-09-11 device-hardening packet, are integration-verified locally at integrator merge `54e5a39`. Android 16 evidence covers direct React Navigation resolution, current-only swaps, immutable successor revisions, explicit recalibration, owner-scoped route recovery, cold offline launch, reload, background/foreground, kill/reopen, stale-route handling and an actual account switch against local Supabase.
- AP-02/AP-03 are not released: production remains at the two AP-01 migrations, both writer flags remain default-off, and the two reviewed durable-record migrations remain unapplied. Secure CLI/database authentication was independently verified for `thfxcvxcsfvrzdysdnkq` using the local DPAPI-protected helper on September 14. No fresh production backup or production migration was performed during that authentication step; required user physical-device/accessibility results precede those operations.
- September 14 source corrections cover replay locking, immutable submitted finalization payload/end time, pending-edit denial, exact install/lifecycle retry requests, ancestor-completed revision protection, actual-load units/assistance volume, elapsed archive checkpoints with original start dates retained, owner-pinned installs, archive reader fallback/account isolation, and accessible read-only set controls. The [current release report](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md) owns exact commits, migration hashes, final automated/build/integration results and remaining blockers; the prior September 11 integration record does not verify the new diff.
- Working source paths exist for auth, durable program creation/loading, durable set logging, history/PRs, archive UI, local notifications and theme/palette. Dated schedules, full mixed-history/progression authority, and accepted adaptation lifecycle remain partial or missing.
- Supabase availability hardening is locally implemented on `codex/supabase-resilience`: classified calm errors, per-operation deadlines, read-only bounded retry, shared owner-scoped current-program state, progressive profile sections, and non-retried writes with explicit partial-save outcomes. The iOS failure/recovery matrix and incident-window dashboard correlation remain open evidence.
- Evidence/policy constants and additive preference/context/event schema are existing foundations. AP-02/AP-03 now supply focused application tests, rollout flags and durable pending stores; explicit proposal lifecycle, precise equipment profiles and optional public/health/commerce workflows remain missing.
- Exact facts/defects: [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md).

## Historical evidence retained

August 3 records describe schema/constraints/indexes/storage/external exercise-ID remediation and two-user isolation for the additive preference/event tables. A later authenticated synthetic-user run on that date records Quick Setup three-surface writes, missing-row preference resolution, readiness/cycle dual-writes, actual generated-context creation, injected context-failure cleanup and restoration of the prior active program. Those user-added results are retained in the development log and archive snapshots. They are not new measurements or proof of the full save transaction.

The September 9 AP-01.1 read-only packet confirms RLS enabled without force on all 16 public tables. Both `anon` and `authenticated` have all table privileges on `exercises`, and its four `TO public` policies are unconditional. No write probe was performed or relabeled as read-only. Current catalog counts are 1,369 rows, 51 missing external IDs, zero duplicate non-null exact external IDs, and 17 normalized-name collision groups. [The AP-01 artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-09.md) owns the full current observation.

## Open gates

Quick Setup with optional demographics and generated program installation run in a local Android 16 development build against local Supabase. The 2026-09-11 workout matrix additionally covers Home and Plan entry, current-only and future swaps, completed-set attribution, explicit recalibration, Expo reload, background/foreground, kill/reopen, gateway-off cold launch, stale/malformed routes and a second-account isolation probe. Expo Go was observed separately and reports the expected SDK/native-module limitation for remote notifications; the route defect was reproduced and verified in the supported native development build. Physical hardware, Profile/missing-schema, manual-program, archive/restore, old-client, iOS Dynamic Type, VoiceOver and theme checks remain open. The production ledger contains only the verified AP-01 baseline and catalog enforcement migrations. The Free project still has no scheduled backup/PITR; the prior AP-01 recovery set is not a fresh pre-AP-02/AP-03 recovery point, so a new encrypted logical backup and restore comparison is mandatory before production migration.

The approved `integrator` worktree exists at `C:\workout-app\AdaptivPush-integrator`; prior clean-install, static, focused and fresh-reset SQL verification passed there. The September 14 packet passed clean integrator verification at `302ce6e`; final build tooling is integrated at `7cdf598` with source-tree equality. Supabase CLI remains pinned at `2.117.0` and Docker supplies PostgreSQL 17 locally. A user-local Android SDK, JDK 17 and Android 16 tooling support noninteractive native development-build checks. CLI/database authentication is verified; credentials remain in the local secure mechanism outside the repository. Historical unreferenced avatar objects remain outside scope and were not deleted.

Current read-only compatibility checks resolved 52 of 52 persistable local
catalog entries and all six developer-fixture names. `barbell-clean` and
`dumbbell-thruster` have no unambiguous current catalog identity and are excluded
from persisted generator/swap candidates rather than guessed or client-created.
Production catalog grants/policies are now enforced as lookup-only for ordinary
clients after compatible-client, restore, and isolated-role verification.

## Verification limits and controls

Historical focused results include `test:catalog` (9), dependency resolution (1), `test:workouts` (19), `test:programs` (10), and `test:availability` (12). On the resilience feature branch, the availability/program/workout suites, strict types, and lint with zero errors/three unrelated warnings pass. Earlier feature and integrator evidence also covers Expo doctor 21/21, a 3,819-module Android Metro export, native debug assemble, fresh four-migration reset, database lint, AP-01 regression SQL, AP-02/AP-03 transaction/isolation SQL and successor-revision SQL. The integrator native assembly completed in 5m08s with all 435 tasks executed. Production backup/restore, deployment, iOS failure injection, physical-device/accessibility/old-client coverage and later fitness/legal/purchase/moderation gates remain open. Keep both production writer flags off until release gates pass; only the bound isolated manual-test configuration may enable them before then. Rollback disables producers and preserves drafts, receipts, revisions, checkpoints, accepted artifacts and history; it never restores unsafe catalog writes, non-atomic multiwrites, hidden readiness escalation or false completion.

[DEV-LOG](/dev-doc/reports/DEV-LOG.md) records executed evidence; [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md) and [register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) own future gates.

The [manual QA handoff](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md)
targets iOS on physical iPhone. Shared-source automated checks passed at
`42f317d`, but the earlier Android-based readiness claim was incorrect. iOS
native build/signing, identified flag variants, installation and a reachable
nonproduction backend remain unverified; prepare and bind them before user QA.
Android artifacts are supplementary evidence and Android testing is not a gate
for this iOS release. Only the user supplies new physical-iPhone, interaction and
accessibility passes. After required pre-migration passes, the operator must
capture a fresh encrypted backup, prove isolated PostgreSQL 17 restore, and apply
only `20260910210000` then `20260911120000` after exact dry-run and identity checks.
No production writer enablement occurs without all remaining gates, real
distribution/package/signing/deployment identity, rollback rehearsal, and named
payload-free monitoring. Current `temp-app`/`tempapp` identity and absent EAS
configuration do not establish a production distribution target. AP-04/AP-05
remain outside the current packet.
