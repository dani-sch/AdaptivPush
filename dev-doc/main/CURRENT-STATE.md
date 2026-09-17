# AdaptivPush current state

## Scoped removals and shared controls: integrated, hosted approval pending

Active capture and completed edit now share compact rows with explicit checks, on-demand load/exercise settings, swipe set removal and header exercise removal. Occurrence tombstones preserve original prescriptions; selected future changes commit atomically with Save or Finish. Missing attempts hold the affected progression decision without becoming failures. App-owned dialog backdrops are transparent.

The new additive migration 20260917180000 and separate removal capability 1 are locally/integration verified, **not deployed**. Earlier hosted correction capability 2 remains unchanged. The exact packet, encrypted backup/59-relation restore proof, 106 passing tests, SQL/concurrency checks, screenshots, forward recovery and physical-iPhone limitations are recorded in [September 17 removal evidence](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVALS-2026-09-17.md). Obtain the user's explicit section-11 authorization before a new hosted write. AP-04/AP-05 remain queued.

## Unified workout occurrence boundary

Home, Plan/full-program and workout capture now reconcile stable program/day/slot identities through `effectiveOccurrence.ts`, `effectiveCurrentWorkout.ts` and `resolveProgramOccurrences.ts`. Finalized sessions win over local drafts. Completed view/edit uses the existing `ExerciseCard`; the durable frozen prescription reconstructs all prescribed exercises/sets alongside actual rows, skipped outcomes and extra sets. The completed route reads stable session columns before checking correction capability and remains viewable if correction support is absent.

Sets have explicit `performed`, `skipped` and `not_attempted` outcomes. Finalization stores effective assignments/outcomes in the existing JSON prescription snapshot; only performed sets enter actual-set tables, volume and record calculations. Partial finalization closes the occurrence, remains accessible through Last Workout, and does not become Start Workout. Pending submissions use Retry Sync. History clears nested state and waits for dismissal before one route push (native iOS dismissal callback; unanimated Android/web dismissal followed by the next frame).

The hosted SQL extension anchors repeated future swaps to original stable slot lineage, protects completed historical days, rejects a second finalization operation for the same occurrence, and preserves intermediate performed exercise identities. Corrections retain the session, revision/replay checks and audited before/after state; completion counts covered prescribed slots rather than extras. Missing correction RPC/column support yields an honest view-only state.

Progression is conservative: incomplete/unknown required work holds the existing next load suggestion; it cannot earn an increase merely because every logged set succeeded. Skipped/unattempted work contributes neither volume nor records. No new repeated-partial adaptation algorithm or progression worker is introduced. Corrections recompute completion/volume/records and invalidate the existing progression/analytics receipt effects; subsequent policy evaluation reads corrected evidence. AP-05's broader progression authority remains queued.

Past-workout editing is released to `thfxcvxcsfvrzdysdnkq`. Authorized migrations `20260915190000` and `20260915210000` are deployed; authenticated capability is integer `2`. The existing editor supports explicit outcomes and loading semantics, same-session corrections, exact retry and stale-revision recovery. Authenticated hosted browser edit/cancel/save/reopen and all completed-workout entry points passed. Fresh encrypted backup and isolated restore matched all 57 captured relations; original data was preserved. [September 17 release evidence](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md) owns hashes, security, 96 passing application cases, eight concurrency checks, SQL verification and limits. Physical iPhone acceptance remains open. AP-04/AP-05 remain queued.

## Hosted runtime and recovery boundary

The hosted AP-02/AP-03 packet is deployed to `thfxcvxcsfvrzdysdnkq`. The normal `.env` enables both writers, and the freshly served iOS bundle verifies the expected hosted backend, public client key and true/true flags with no privileged key. The user authorized this rollout after agent-run recovery and technical checks, replacing earlier pre-migration local/manual/QA-account, signing, standalone-build and distribution requirements. Physical acceptance follows deployment with the existing account through ordinary `npm start` and its Expo Go QR.

The authoritative hosted ledger contains seven entries: `20260910175317`, `20260910190000`, `20260910210000`, `20260911120000`, `20260915151000`, `20260915190000` and `20260915210000`. Legacy programs retain immutable revisions and stable day/slot identities; provenance remains honest and direct prescription mutation is denied.

The September 17 encrypted AES-256-GCM/DPAPI backup passed isolated PostgreSQL 17 restore: all 57 captured relation counts and row hashes plus seven schema/security inventory sections matched. All 56 original non-ledger relations matched immediately after deployment; all 21 original public relations matched after synthetic acceptance cleanup. Storage object bodies, platform settings, infrastructure and login credentials are outside logical recovery. Recovery preserves newer writes and uses a rehearsed forward fix, never an automatic production reset.

Current authentication, recovery and supported deployment are complete. [September 17 release evidence](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md) owns backup custody, exact migration hashes, verification and recovery procedure.

## Hosted packet verification and acceptance

The current source and integrator passed 96 focused application cases, strict TypeScript and lint (three existing warnings). Eight concurrency assertions, five SQL variants on each fresh/restored/hosted target, database lint and final 35-route web export passed. The mandated Ruff command reports one missing-path error for absent `src/`; the applicable paths exit 0 with no Python files discovered. No Python application changes require pytest.

Physical iPhone cold launch, five-action UI/reopen acceptance and accessibility remain unverified. Thirty-two pre-existing non-rest days have no exercises (five in active programs); they were preserved, not populated with invented prescriptions. Complete persisted workouts can use their database identities; empty legacy days remain unstartable. AP-04/AP-05 remain out of scope.

## Other product state

AP-01.3 production baseline and lookup-only catalog authority remain released. Shared catalog reads and trusted curation are preserved. Current auth, planning, workout history, archive, notifications and theme paths exist; dated scheduling, mixed-history progression authority and broader adaptation lifecycle remain partial. The [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md) owns code detail, and the [register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) owns later scope. Historical observations remain in the dated reports and [DEV-LOG](/dev-doc/reports/DEV-LOG.md). No unrelated migrations or historical avatar deletions were performed.

## Current review and continuation

PR #56 is merged. The completed editing release is published in [PR #57](https://github.com/dani-sch/AdaptivPush/pull/57) from `codex/edit-past-workout-release`; implementation commits `d0962fa`, `38848f6` and `812498d` are integrated through `974007a` and independently verified. [September 17 release evidence](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md) and Git review history own publication evidence. Resume from TODO; physical device acceptance is the remaining correction-specific acceptance limitation.