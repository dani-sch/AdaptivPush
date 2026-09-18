# AdaptivPush current state

## September 18 workout editing: hosted update deployed

Skipped-row input loss, modal handoff, composed future edits and durable Add exercise/extra-set structure are implemented and integrated through `f3bd828`. The original checkout contains the implementation and preserves the unrelated History edit. Following explicit user authorization, migration `20260918160000_workout_structure.sql` is deployed to `thfxcvxcsfvrzdysdnkq`. Structure capability 1 now enables additions and completed structural edits; removal 1/correction 2 remain available. Fresh encrypted backup, isolated restore, forward rehearsal and hosted security/data-preservation checks passed. The user will test in Expo and has stopped agent visual testing. Native-client identity/startup cause and the exact past-program route remain unconfirmed. [September 18 implementation and packet evidence](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-EDITING-2026-09-18.md) owns causes, regression evidence, recovery and release boundaries.


## iPhone recovery and workout fixes: integrated, hosted removal deployed

The failed phone login is tied by its exact timestamp to the local-test Expo server on 8082, whose iOS bundle embedded phone-localhost Supabase. Hosted Expo remains on 8081; local browser QA is now loopback-only and native clients reject loopback backend configurations. Session hydration now distinguishes outages from sign-out, coordinates foreground refresh and preserves owner-scoped drafts/pending operations. Input focus no longer disables row swiping; removal checks distinguish failed requests from missing server support, and blank applicable loads display LB without inventing measurements.

Feature commits f85d679, 42a9ed9, e04d89a and 2476343 are integrated through 801d7dc. Strict TypeScript, lint (three existing warnings), 119 application tests, iOS export, 12 fresh/restored SQL executions and nine-label concurrency pass. Fresh encrypted restore matches 59 relations; all 23 hosted public relations remain unchanged. [iPhone recovery evidence](/dev-doc/reports/ADAPTIVPUSH-IPHONE-RECOVERY-2026-09-17.md) owns causes, browser outage/reconnect/persistence checks, screenshots and the exact reverified migration packet. The user authorized the exact migration, now deployed with removal capability 1 and correction capability 2; [hosted removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md) owns the fresh recovery, preservation and hosted checks. Physical iPhone acceptance remains open. No scheduling/progression redesign.

## Scoped removals and shared controls: integrated and hosted

Active capture and completed edit now share compact rows with explicit checks, on-demand load/exercise settings, swipe set removal and header exercise removal. Occurrence tombstones preserve original prescriptions; selected future changes commit atomically with Save or Finish. Missing attempts hold the affected progression decision without becoming failures. App-owned dialog backdrops are transparent.

Migration 20260917180000 is deployed to thfxcvxcsfvrzdysdnkq under the user's explicit follow-up authorization. Removal capability is 1 and correction capability remains 2. Fresh encrypted backup/59-relation restore, 12 SQL suite executions, zero schema/security drift and all 58 non-ledger relations preserved are recorded in [hosted removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md). Physical iPhone acceptance remains open. AP-04/AP-05 remain queued.

## Unified workout occurrence boundary

Home, Plan/full-program and workout capture now reconcile stable program/day/slot identities through `effectiveOccurrence.ts`, `effectiveCurrentWorkout.ts` and `resolveProgramOccurrences.ts`. Finalized sessions win over local drafts. Completed view/edit uses the existing `ExerciseCard`; the durable frozen prescription reconstructs all prescribed exercises/sets alongside actual rows, skipped outcomes and extra sets. The completed route reads stable session columns before checking correction capability and remains viewable if correction support is absent.

Sets have explicit `performed`, `skipped` and `not_attempted` outcomes. Finalization stores effective assignments/outcomes in the existing JSON prescription snapshot; only performed sets enter actual-set tables, volume and record calculations. Partial finalization closes the occurrence, remains accessible through Last Workout, and does not become Start Workout. Pending submissions use Retry Sync. History clears nested state and waits for dismissal before one route push (native iOS dismissal callback; unanimated Android/web dismissal followed by the next frame).

The hosted SQL extension anchors repeated future swaps to original stable slot lineage, protects completed historical days, rejects a second finalization operation for the same occurrence, and preserves intermediate performed exercise identities. Corrections retain the session, revision/replay checks and audited before/after state; completion counts covered prescribed slots rather than extras. Missing correction RPC/column support yields an honest view-only state.

Progression is conservative: incomplete/unknown required work holds the existing next load suggestion; it cannot earn an increase merely because every logged set succeeded. Skipped/unattempted work contributes neither volume nor records. No new repeated-partial adaptation algorithm or progression worker is introduced. Corrections recompute completion/volume/records and invalidate the existing progression/analytics receipt effects; subsequent policy evaluation reads corrected evidence. AP-05's broader progression authority remains queued.

Past-workout editing is released to `thfxcvxcsfvrzdysdnkq`. Authorized migrations `20260915190000` and `20260915210000` are deployed; authenticated capability is integer `2`. The existing editor supports explicit outcomes and loading semantics, same-session corrections, exact retry and stale-revision recovery. Authenticated hosted browser edit/cancel/save/reopen and all completed-workout entry points passed. Fresh encrypted backup and isolated restore matched all 57 captured relations; original data was preserved. [September 17 release evidence](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md) owns hashes, security, 96 passing application cases, eight concurrency checks, SQL verification and limits. Physical iPhone acceptance remains open. AP-04/AP-05 remain queued.

## Hosted runtime and recovery boundary

The hosted AP-02/AP-03 packet is deployed to `thfxcvxcsfvrzdysdnkq`. The normal `.env` enables both writers, and the freshly served iOS bundle verifies the expected hosted backend, public client key and true/true flags with no privileged key. The user authorized this rollout after agent-run recovery and technical checks, replacing earlier pre-migration local/manual/QA-account, signing, standalone-build and distribution requirements. Physical acceptance follows deployment with the existing account through ordinary `npm start` and its Expo Go QR.

The authoritative hosted ledger contains eight entries: `20260910175317`, `20260910190000`, `20260910210000`, `20260911120000`, `20260915151000`, `20260915190000`, `20260915210000` and `20260917180000`. Legacy programs retain immutable revisions and stable day/slot identities; provenance remains honest and direct prescription mutation is denied.

The September 17 encrypted AES-256-GCM/DPAPI backup passed isolated PostgreSQL 17 restore: all 57 captured relation counts and row hashes plus seven schema/security inventory sections matched. All 56 original non-ledger relations matched immediately after deployment; all 21 original public relations matched after synthetic acceptance cleanup. Storage object bodies, platform settings, infrastructure and login credentials are outside logical recovery. Recovery preserves newer writes and uses a rehearsed forward fix, never an automatic production reset.

The latest iPhone investigation and recovery limitations are recorded above; physical authentication acceptance remains open. [September 17 release evidence](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md) owns backup custody, exact migration hashes, verification and recovery procedure.

## Hosted packet verification and acceptance

The current source and integrator passed 96 focused application cases, strict TypeScript and lint (three existing warnings). Eight concurrency assertions, five SQL variants on each fresh/restored/hosted target, database lint and final 35-route web export passed. The mandated Ruff command reports one missing-path error for absent `src/`; the applicable paths exit 0 with no Python files discovered. No Python application changes require pytest.

Physical iPhone cold launch, five-action UI/reopen acceptance and accessibility remain unverified. Thirty-two pre-existing non-rest days have no exercises (five in active programs); they were preserved, not populated with invented prescriptions. Complete persisted workouts can use their database identities; empty legacy days remain unstartable. AP-04/AP-05 remain out of scope.

## Other product state

AP-01.3 production baseline and lookup-only catalog authority remain released. Shared catalog reads and trusted curation are preserved. Current auth, planning, workout history, archive, notifications and theme paths exist; dated scheduling, mixed-history progression authority and broader adaptation lifecycle remain partial. The [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md) owns code detail, and the [register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) owns later scope. Historical observations remain in the dated reports and [DEV-LOG](/dev-doc/reports/DEV-LOG.md). No unrelated migrations or historical avatar deletions were performed.

## Current review and continuation

The iPhone recovery follow-up is published in [draft PR #58](https://github.com/dani-sch/AdaptivPush/pull/58), titled "Fix iPhone session recovery and durable workout controls". Source verification is integrated through 801d7dc; initial evidence commit 7dd345b is integrated at ec9c717. Both feature branches are published; the PR is OPEN/draft and has not merged into main. Hosted removal is deployed under the user's follow-up authorization; [hosted removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md) owns the final checks. The ExerciseHistoryModal import cleanup remains the user's sole unstaged change.

Scoped removal and shared controls are published in [draft PR #58](https://github.com/dani-sch/AdaptivPush/pull/58), integrated at ebfa63e after implementation verification at 8ab5d6c. The exact hosted packet is deployed; physical-device acceptance remains open.

PR #56 is merged. The completed editing release is published in [PR #57](https://github.com/dani-sch/AdaptivPush/pull/57) from `codex/edit-past-workout-release`; implementation commits `d0962fa`, `38848f6` and `812498d` are integrated through `974007a` and independently verified. [September 17 release evidence](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md) and Git review history own publication evidence. Resume from TODO; physical device acceptance is the remaining correction-specific acceptance limitation.