# AdaptivPush current state

## Client presentation and history correction (2026-09-28)

The feature branch now contains an unreleased Home/Program/History presentation refactor. Home presents the next or active workout without a sequence explanation card; Program shows week-oriented prescriptions rather than per-day sequence controls; a central Workout action opens a launcher and focused pending-day chooser without adding a fifth tab. The route-local pending-operation component was moved outside Expo Router's tab tree. Program creation and restoration attempt sequence setup automatically and retain an explicit retry state if setup cannot be confirmed. Ad-hoc entry shares the detailed exercise picker and exercise cards, while remaining history-only.

History resolves performed sets by catalog exercise ID and the single joined exercise record, and reports failed or partial reads separately from empty history. The previous "Unknown exercise" fallback is no longer used for valid joined sets. Local automated gates do not prove physical-device layout, native routing, legacy-record identity, or hosted end-to-end acceptance. The branch is not accepted, integrated, or distributable; the earlier backend authority and pending-request invariants remain unchanged.

## Flexible sequence backend gate (2026-09-27)

The additive owner-scoped sequence authority `20260927190000` is deployed and verified: hosted ledger 11 entries, exact migration SHA-256 `c0d1bc62a606c55c49d15363afb7f21584b367200340567270c911685011ed32`, fresh encrypted recovery, isolated restore and exact rehearsal, hosted schema/security and non-ledger data parity, rolled-back authenticated/anonymous/replay/lineage/Finish/correction/ad-hoc checks, and separate-session concurrency. All three AP-04 schedule tables remain empty and untouched. Authenticated access to the two dated schedule-creation/revision RPCs was revoked by explicit user approval, leaving their bodies in place. [Backend authority evidence](/dev-doc/reports/ADAPTIVPUSH-FLEXIBLE-SEQUENCE-AUTHORITY-2026-09-27.md) owns the details.

This clears the **backend** prerequisite, not client acceptance. The merged dated client remains superseded and must not be distributed until its sequence-based replacement and full application gates pass. Native alert and workout acceptance remain user-led. The older ten-migration and not-implemented descriptions below are historical snapshots superseded by this section.

The feature-branch client replacement is **partial and not distributable**. Home and Plan read the owner sequence for suggestions, and Plan exposes explicit pause/resume, skip/rest replacement and reorder commands. The revision-backed `useCurrentProgram` read now loads all immutable program days rather than limiting entry to a calendar week; exact-day route resolution rejects mismatched prescriptions. Legacy revisionless reads retain their week preview. Program Finish requires the selected-day atomic command with an exact owner-scoped pending request. A separate ad-hoc capture flow freezes exact owner-scoped requests and verifies unlinked actual history. Partial-Finish confirmation and post-Finish Continue/Adjust choices exist; the rest timer and five-minute inactivity nudge have owner-draft local state and notification code, but native device timing, permission, restart and draft-removal behavior remain unaccepted. Dated correction writes fail closed while legacy history remains readable. Cross-week entry is covered by code and route tests, not hosted end-to-end/device acceptance. A passing TypeScript or application suite does not close those remaining behavioral gaps.

## Source and hosted runtime

`origin/main` includes PR #59 at merge commit `5c7c4fb`, which brought the dated AP-04/AP-05.1 client source into the default branch. Earlier descriptions of this client as unmerged are stale. Source merge does not establish Expo distribution or physical-device acceptance; the dated client is superseded and must not be distributed as the approved flexible sequence.

The linked project `thfxcvxcsfvrzdysdnkq` is healthy and, as of `2026-09-27T16:52:52.779Z`, has the exact ten-migration ledger through `20260925190000`. Hosted correction/removal/structure/schedule capabilities are `2/1/1/1`; 26/26 public tables have RLS and 67 public policies exist. `program_schedules`, `scheduled_days`, and `schedule_deviations` are present and empty. The AP-04 migration used Supabase CLI 2.118.0 with password-based Session-pooler authentication, avoiding the blocked temporary-role path. No managed-role or migration-ledger repair occurred.

AP-04.1-AP-04.3 and AP-05.1 dated client work is **merged in source but not accepted for distribution**. Its initial placement, accepted-date Today/Plan, scheduled start/Finish/correction, adherence, and reminder paths are superseded by the [flexible program-sequence decision](/dev-doc/plans/active/ADAPTIVPUSH-FLEXIBLE-PROGRAM-SEQUENCE-DECISION-2026-09-27.md). The local deviation foundation is not approved sequence authority. The fresh September 27 encrypted backup restored with exact equality across 59 live relations; the exact migration/fixture rehearsal preserved all originals and separate-session schedule/revision/Finish/correction replay passed. Production postflight matched the rehearsed non-ledger target with zero differences. The 213-case application suite and strict TypeScript pass; lint has zero errors and two pre-existing warnings. See the [AP-04 production evidence](/dev-doc/reports/ADAPTIVPUSH-SCHEDULE-HISTORY-2026-09-25.md).

The AP-04 deployment preserved all 58 preexisting non-ledger relation fingerprints and the existing 23 public-table data, then added three empty RLS-protected schedule tables. Exact hashes, custody, restore/rehearsal coverage, password-based deployment path, and recovery limits are recorded in the [September 27 AP-04 evidence](/dev-doc/reports/ADAPTIVPUSH-SCHEDULE-HISTORY-2026-09-25.md).

## Implemented behavior

- Auth hydration distinguishes transient connection failures from sign-out, coordinates foreground refresh, and preserves owner-scoped drafts and pending operations. Native loopback backend configuration is rejected; browser-only local QA is isolated.
- Home, Plan, active capture, History, and completed editing share stable program/day/slot occurrence identity. Finalized sessions win over drafts; invalid routes never substitute another workout.
- Workout capture keeps raw entry separate from performed/skipped/not-attempted outcomes. Restoration tolerates unfinished measurements; Check/Finish provides field validation.
- Active and completed editors share compact cards, load/exercise settings, swipe set removal, exercise removal, and durable extra-set/exercise structure.
- Add and Swap share the detailed picker. Add loads every catalog page without Swap exclusions, supports duplicate choices with distinct identities, and explicitly confirms workout-only or future-program scope.
- Selected removals, swaps, and additions compose into one atomic future revision at Finish/Save. Frozen original prescriptions and completed ancestors remain unchanged.
- Pending finalization/correction/program-revision requests remain exact-retry records. Recovery clears only after the authoritative stored receipt, structure, and values match.
- Missing required work holds progression; only performed results contribute volume and records. This is containment, not the broader AP-05 progression redesign.

## Verification posture

The September 27 feature-branch rerun passes 213 application cases: 110 workout, 20 program, 21 availability, 9 catalog, 2 dependency, and 51 scheduling/consistency/history cases. `npx tsc --noEmit --strict` passes. `npm run lint` has zero errors and two preexisting unused-variable warnings. The last published `origin/main` client retains its earlier 157-case evidence; branch verification is not client publication.

The latest dated database evidence includes 14 structural SQL suite executions across fresh/restored targets plus concurrency, role, replay, stale-revision, schema, and preservation checks. Those checks were not repeated by documentation cleanup and remain owned by the release report.

## Open acceptance and unknowns

- The user owns Expo/physical iPhone acceptance. Do not clear device storage, reset credentials, reinstall the app, mutate user workouts for testing, or redeploy migrations merely to test the client.
- Keyboard layout, card presentation, native modal timing, VoiceOver, dynamic type, background/foreground, disconnect/reconnect, and native restart/interruption remain unverified on the physical device.
- The installed phone client/build, the cause of the first native missing-module failure, and the exact route meant by editing a past program remain unconfirmed.
- Thirty-two preexisting non-rest days have no exercises, including five in active programs. They were preserved; complete persisted workouts can use durable identities, while empty legacy days remain unstartable.
- AP-04 dated database objects are deployed and reported empty, but merged client code still contains schedule creation/revision, dated Home/Plan/reminder reads, and optional scheduled Finish/correction. Do not distribute this client as the approved replacement. Existing immutable program revisions and local pending-operation stores do not provide durable sequence-state mutation/receipts. The separately approved additive sequence authority has not been implemented; flexible sequence, completion context, and the two permitted notifications remain open.
- The user subsequently approved a separate additive owner-scoped sequence command/state/receipt migration, including deployment after exact-packet review and recovery/role/replay gates. The migration has not been created or applied by this documentation update; the ten-migration hosted ledger above remains the last verified state. A confirmed finalized partial workout should resolve only its selected program day, permit existing logged-exercise progression, leave unlogged exercises/weights unchanged, and require no resolution step. Unstarted days remain pending. See the [sequence decision](/dev-doc/plans/active/ADAPTIVPUSH-FLEXIBLE-PROGRAM-SEQUENCE-DECISION-2026-09-27.md).

## Review and continuation

PRs #54-#58 are merged into `main`; [PR #58](https://github.com/dani-sch/AdaptivPush/pull/58) is closed as the consolidated publication boundary for later workout editing, removal, recovery, structure, and detailed-Add work. The [September 25 two-week product status](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md) translates that boundary into user abilities and an ordered next path. Continue only from [TODO](/dev-doc/main/TODO.md); use the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) for slice scope and dated reports for historical evidence.
