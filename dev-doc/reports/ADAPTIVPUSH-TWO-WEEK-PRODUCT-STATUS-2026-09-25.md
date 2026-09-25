# AdaptivPush two-week product status - 2026-09-25

## Reporting boundary

This report reconciles `origin/main`, the active AdaptivPush plans, and the dated release reports for September 11 through September 25, 2026. The last product commit in the period landed September 18 in merge commit `ec848e6` (PR #58); there were no later source commits through this refresh. The period contains 143 commits, including 99 non-merge commits, across 193 changed files. Counts describe repository activity, not 143 independent user features.

Current source verification was rerun September 25: 157/157 application cases pass (106 workout, 20 program, 20 availability, 9 catalog, 2 dependency), strict TypeScript passes, and lint has zero errors with three known unused-variable warnings. Hosted database facts are retained from the authorized September 15-18 release evidence; this documentation refresh did not query or mutate the hosted project.

## Bottom line

The last two weeks moved AdaptivPush from a locally hardened workout/program foundation to a hosted durable training workflow. A user can create or install a program, start or resume the correct workout, record explicit set outcomes, change workout structure, finish atomically, and correct the same completed workout later. Workout-only and future-program changes preserve completed history and retry exact requests after uncertain responses.

This does not mean the whole product is complete. The released technical boundary is automated and hosted, and completed-workout editing also passed authenticated browser acceptance. Physical iPhone/Expo presentation, interruption, accessibility, and native restart acceptance remain open. Dated scheduling (AP-04) and authoritative mixed-history progression (AP-05) have not been implemented.

## What changed during the period

| Date | Delivered result | User effect |
|---|---|---|
| September 11 | Stable workout route identity, owner-scoped draft recovery, and revision-safe future exercise replacement | Home, Plan, and workout entry resolve the same workout; an active draft survives revision changes without silently opening another workout. |
| September 14 | Bounded Supabase failure handling and release tooling | Connection outages no longer automatically look like sign-out; profile/program operations settle with honest unavailable, retry, or partial-success states. |
| September 15-16 | Hosted AP-02/AP-03 durable writers and immutable program lifecycle | Generated and manual programs install atomically; workout finalization is replay-safe; archive/restore uses explicit checkpoints; the previous usable program survives a failed replacement. |
| September 15-17 | Scoped exercise replacement and same-session completed-workout correction | A user can apply an exercise swap to this workout or eligible future occurrences and can edit a finalized workout without duplicating or reopening the session. |
| September 17 | Shared workout controls, scoped removals, iPhone session recovery fixes, and hosted removal capability | Active and completed workout cards share set/exercise controls; removals persist; native backend misconfiguration is rejected; transient connectivity preserves the current owner session. |
| September 18 | Durable added sets/exercises, composed future changes, detailed Add picker, and resume fixes | A user can add duplicate exercises or sets with distinct identities, combine add/swap/remove intent into one Save/Finish, reopen preserved structure, and resume unfinished measurements without losing the editor. |
| September 18 | PR #58 merged to `main` | All September workout editing, recovery, removal, structure, and Add work is in the default branch rather than a draft review branch. |
| September 19-25 | No product source changes | The release boundary stayed stable; this refresh corrects documentation and restates the next path. |

## What completely works within the released technical boundary

"Complete" in this section means the current source path exists, required backend capability is deployed, and the bounded behavior has automated, SQL, release, or browser evidence. It does not waive the physical-device acceptance listed below.

| User ability | Actions that work | Preserved guarantees |
|---|---|---|
| Install a generated program | Generate, preview, save, and activate a complete program | Catalog identities are validated; installation is one atomic, replay-safe command; a failed replacement leaves the prior program usable. |
| Create a manual program | Build and save a manual program through the same durable installer | Manual training remains free and uses the same validation, catalog, revision, and recovery contract as generated programs. |
| Archive and restore a program | End/archive, resume an exact V2 checkpoint, or explicitly restart an older approximate program | Completed history is not replayed or backdated; immutable program revisions preserve prior prescriptions. |
| Start or continue the correct workout | Open from Home, Plan, or program overview; resume an owner-scoped draft | Program/day/slot identity is serialized across routes; stale or malformed routes do not substitute another workout; finalized occurrences redirect to their completed session. |
| Record a workout | Enter load, units, reps, and optional RPE; mark sets performed, skipped, or not attempted; remove or add sets and exercises | Raw input is separate from outcome; zero, bodyweight, assistance, and unknown loading remain distinct; drafts and exact pending operations survive refresh/retry. |
| Replace an exercise | Choose from the detailed catalog and apply to this workout or eligible future occurrences | Logged sets keep their performed exercise/load identity; future changes create immutable successor revisions; no-future-workout is an honest successful no-change result. |
| Add or remove workout structure | Add duplicate exercises or extra sets, remove sets or exercises, choose workout-only or future-program scope | Every addition has a distinct stable identity; removals preserve frozen original prescription evidence; add/swap/remove future intent composes into one atomic revision. |
| Finish a workout | Validate fields, then Finish once; retry after an uncertain response | Finalization is atomic and idempotent; incomplete or unknown required work cannot be counted as complete; authoritative receipts prevent false success. |
| Correct a completed workout | Open Edit Workout from completion/history, change performed exercise/load/unit/reps/RPE/set membership, Save, cancel, and reopen | The same finalized session is revised; no duplicate session or progression replay is created; volume, completion, and correction-aware records are recomputed. |

## What works but is not complete

| Capability | What works now | Why it is still partial |
|---|---|---|
| Account/session handling | Sign-up, sign-in, route gating, persisted owner recovery, and transient-outage handling exist | Password reset delivery/callback is missing; native expired-session, restart, and account-isolation acceptance is incomplete. |
| History and personal records | History screens, completed-workout detail/edit entry, and correction-aware durable records work | Legacy and current sources are not unioned and deduplicated; query failures can still resemble empty history; machine/configuration cohorts are absent. |
| Basic progression | Increase/hold/decrease logic exists; incomplete or unknown required work now holds rather than earning an increase | Multiple progression paths remain; there is no revision watermark, stable equipment cohort, sparse-data confidence, or authoritative idempotent evaluator. |
| Readiness and cycle input | Home can store readiness inputs and Profile exposes cycle settings | The current lifecycle is split across legacy/scaffolded models; one persistent proposal/decision record and symptom-first policy are missing. |
| Notifications | Local permission and workout/PR/deload notification helpers exist | Selected time, quiet hours, dated schedule changes, and email/SMS delivery are not implemented end-to-end. |
| Themes and shared UI | System/light/dark appearance and persisted accent palettes work | Device accessibility, dynamic type, VoiceOver, and full shared-component acceptance are not complete; commerce is absent. |
| Support, privacy, and recovery screens | UI and metadata actions exist for several account requests | Password reset, export, deletion, and support-ticket delivery do not have complete server workflows and must not be presented as fulfilled operations. |

## What does not yet work as an approved end-to-end feature

- Dated workout/rest scheduling, timezone-aware placement, moves, carries, skips, pauses, and weekly adherence (AP-04).
- One authoritative mixed legacy/current history and progression pipeline with comparable cohorts and idempotent decisions (AP-05).
- Approved advanced goal/customization and multiple-location equipment precision (AP-06/AP-07).
- One persistent readiness proposal lifecycle, longitudinal coaching, deload interpretation, and schedule recovery (AP-08/AP-10).
- Health-platform integration, paid theme purchases, unlisted program sharing, public discovery/reviews, and social features (AP-11-AP-15).
- Complete password recovery, data export/deletion fulfillment, support operations, and distribution/accessibility signoff (remaining AP-16 obligations).

## Remaining acceptance before calling the current release fully product-complete

- On the existing physical iPhone and ordinary hosted Expo session, verify cold launch/login, Continue Workout, unfinished-field restoration, validation, Add/Swap/Remove scopes, completed Save/Cancel/reopen, background/foreground, temporary disconnect/reconnect, and native restart/interruption.
- Verify keyboard layout, card presentation, modal dismissal/animation, swipe/scroll coexistence, VoiceOver, dynamic type, and focus order.
- Capture the installed phone client/build and the exact route/session for any remaining startup or past-program editing failure before diagnosis.
- Preserve device storage, credentials, user workouts, and pending requests during acceptance; do not reinstall/reset or invent user data merely to test.
- Preserve the 32 known empty legacy non-rest days, including five in active programs, unless an explicit user-authorized repair policy is designed. Their missing prescriptions cannot be reconstructed honestly.

## Upcoming plan path

1. Close current-release device acceptance. This is validation of the September release, not a new feature slice. Record exact device/runtime evidence and fix only reproduced defects.
2. AP-04.1 - dated Today and programmed rest. Add stable local dates, timezone, original placement, schedule revision, workout/rest kind, and an honest import preview for legacy programs.
3. AP-04.2 - manual control and fulfillment. Add one-time/recurring moves, carries, swaps, skips, pauses, selected-occurrence fulfillment, offline revision conflicts, and reminder rescheduling.
4. AP-04.3 - free weekly adherence. Derive transparent adherence from dated fulfilled occurrences without creating workout debt or penalizing respected rest/pauses.
5. AP-05.1 - authoritative history. Union and deduplicate supported legacy/current records, preserve source identity, and distinguish unavailable from genuinely empty history.
6. AP-05.2 - one progression policy. Replace competing mutation paths with a no-write-on-read evaluator and revision-aware, idempotent apply using complete comparable work, phase protection, and conservative holds.
7. AP-05.3 - explanations and education. Show the evidence, coverage, policy version, and reason for apply/hold/decrease while retaining safe fallbacks for unknown evidence keys.
8. Continue to AP-06/AP-07 only after the free schedule/history/progression loop is trustworthy. Later readiness, coaching, sharing, health, commerce, and public/community slices keep their existing dependencies and operational gates.

## Evidence map

- [AP-02/AP-03 hosted durable-record release](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md)
- [Unified workout lifecycle](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-LIFECYCLE-2026-09-15.md)
- [Completed-workout correction release](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md)
- [iPhone/session recovery](/dev-doc/reports/ADAPTIVPUSH-IPHONE-RECOVERY-2026-09-17.md)
- [Scoped removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md)
- [Workout structure and detailed Add](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-EDITING-2026-09-18.md)
- [Current implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md)
- [Execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md)

No migration, hosted write, user-data mutation, or application-source change was performed for this status refresh.
