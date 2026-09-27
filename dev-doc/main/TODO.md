# AdaptivPush active task board

## [USER ACCEPTANCE] Current Expo/iPhone release

- [AUTOMATED VERIFIED] The September 27 AP-04/AP-05.1 feature branch passes 213 application cases, strict TypeScript, and lint with zero errors and two known warnings. The published `origin/main` client remains at its earlier boundary.
- [HOSTED VERIFIED] Supported ledger has ten entries through `20260925190000`; capabilities are correction 2, removal 1, structure 1, and schedule 1. The three schedule tables are empty, RLS-protected, owner-readable, and anonymous-denied. Latest recovery, schema/security, and data-preservation evidence is in the [AP-04 report](/dev-doc/reports/ADAPTIVPUSH-SCHEDULE-HISTORY-2026-09-25.md).
- [USER ACCEPTANCE] With the ordinary hosted Expo server and existing account, verify cold launch/login, Continue Workout, unfinished-field restoration, Check/Finish validation, Add/Swap/Remove scopes, completed edit Save/Cancel/reopen, keyboard behavior, background/foreground, temporary disconnect/reconnect, and draft restoration.
- [USER ACCEPTANCE] Check VoiceOver, dynamic type, modal dismissal/animation, swipe/scroll coexistence, and native restart/interruption.
- [CONSTRAINT] Preserve device storage, credentials, user workouts, and exact pending requests. Do not reinstall/reset, create synthetic user data in the user's account, or redeploy migrations for acceptance.
- [OPEN] Identify the installed phone client/build and capture the exact route/session for any remaining native startup or past-program editing failure before diagnosing it.

## [NEXT] Flexible AP-04 program sequence and active-workout timer

- [HOSTED DORMANT 2026-09-27] The exact AP-04 schedule migration remains deployed, empty, RLS-protected, owner-readable, and reversible. Do not modify, redeploy, delete, or repurpose its tables/RPCs as hidden sequence state. Disable dated client writers and date-authoritative reads. The [flexible program-sequence decision](/dev-doc/plans/active/ADAPTIVPUSH-FLEXIBLE-PROGRAM-SEQUENCE-DECISION-2026-09-27.md) is the active behavior authority.
- [IN PROGRESS] Establish durable owner-scoped, revision-safe sequence state; replace dated Home/Plan/Finish behavior with suggested next, explicit alternate-day selection, history-only ad-hoc capture, explicit reorder/skip/rest/unresolved handling, and pause/resume. Suggested-next ranking and the persistence shape remain `REQUIRES INSPECTION`.
- [OPEN] Add Finish follow-up actions and the 14-day long-pause review without any automatic load or volume adjustment. Rebuild adherence as completed/partial/skipped/unresolved context, not a schedule score or streak.
- [OPEN] Remove all scheduled-workout, PR, deload, and test notifications. Implement only the owner-scoped five-minute active-draft inactivity nudge and persisted, user-configured rest timer with one optional completion alert. Device acceptance remains user-led.
- [OPEN] Publish the reviewed client branch through the normal source/integration lane, then obtain physical-device and accessibility evidence without creating synthetic data in the user's account.

## [WITH AP-04] AP-05.1 history; [AFTER] AP-05.2/05.3 progression and explanations

- [OPEN] Union and deduplicate supported legacy/new history with explicit unavailable versus empty states.
- [OPEN] Make progression revision-aware and idempotent with comparable exercise/equipment cohorts, missing-data confidence, deload protection, and transparent applied-decision evidence.
- [OPEN] Keep incomplete/unknown required work on hold; do not infer progress from one successful subset or from added/removed structure.

## [REQUIRES INSPECTION]

- [OPEN] Native device availability, health adapter compatibility, store/provider integration, source bibliography verification, and release/distribution configuration.
- [OPEN] Fitness-policy calibration and qualified safety review; legal terms/retention; named moderation/support owners before any public capability.
- [OUT OF SCOPE] Historical unreferenced avatar cleanup remains unauthorised; no deletion is implied by this task board.

## [COMPLETED RELEASE BOUNDARY]

- [COMPLETE] AP-01 trusted catalog and recovery baseline.
- [COMPLETE] Hosted AP-02/AP-03 durable workout/program writers and immutable program revisions.
- [COMPLETE] Completed-workout correction and stable effective occurrences (`20260915190000`, `20260915210000`).
- [COMPLETE] Scoped workout removals and shared controls (`20260917180000`).
- [COMPLETE] Durable workout structure, composed future changes, detailed Add, and resilient resume/recovery (`20260918160000` plus client follow-ups).
- [COMPLETE] AP-04 schedule database authority (`20260925190000`): capability 1, owner reads, anonymous denial, exact recovery/rehearsal, and preserved existing data. Client publication remains open above.
- [COMPLETE] PRs #54-#58 merged to `main`; PR #58 is the consolidated source publication boundary for the September workout releases.

The [September 25 two-week product status](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md) gives the user-action summary and ordered AP-04/AP-05 path. Historical evidence remains in [DEV-LOG](/dev-doc/reports/DEV-LOG.md) and the dated release reports. Completed work is not an instruction to repeat hosted writes or synthetic-account operations.
