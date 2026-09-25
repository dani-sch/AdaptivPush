# AdaptivPush active task board

## [USER ACCEPTANCE] Current Expo/iPhone release

- [AUTOMATED VERIFIED] The September 25 rerun on current `main` passes 157 application cases, strict TypeScript, and lint with zero errors and three known warnings.
- [HOSTED VERIFIED] Supported ledger has nine entries through `20260918160000`; capabilities are correction 2, removal 1, and structure 1. Latest recovery, schema/security, and data-preservation evidence is in the [September 18 report](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-EDITING-2026-09-18.md).
- [USER ACCEPTANCE] With the ordinary hosted Expo server and existing account, verify cold launch/login, Continue Workout, unfinished-field restoration, Check/Finish validation, Add/Swap/Remove scopes, completed edit Save/Cancel/reopen, keyboard behavior, background/foreground, temporary disconnect/reconnect, and draft restoration.
- [USER ACCEPTANCE] Check VoiceOver, dynamic type, modal dismissal/animation, swipe/scroll coexistence, and native restart/interruption.
- [CONSTRAINT] Preserve device storage, credentials, user workouts, and exact pending requests. Do not reinstall/reset, create synthetic user data in the user's account, or redeploy migrations for acceptance.
- [OPEN] Identify the installed phone client/build and capture the exact route/session for any remaining native startup or past-program editing failure before diagnosing it.

## [NEXT] AP-04 dated scheduling and manual control

- [OPEN] Define stable dated workout/rest placement with timezone, original placement, schedule revisions, move/carry/skip/pause semantics, and notification rescheduling.
- [OPEN] Preserve durable AP-02/AP-03 occurrence identity and all released correction/removal/structure behavior.
- [OPEN] Add focused policy, repository, migration, recovery, compatibility, and device evidence before any rollout.

## [AFTER AP-04] AP-05 authoritative history and progression

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
- [COMPLETE] PRs #54-#58 merged to `main`; PR #58 is the consolidated source publication boundary for the September workout releases.

The [September 25 two-week product status](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md) gives the user-action summary and ordered AP-04/AP-05 path. Historical evidence remains in [DEV-LOG](/dev-doc/reports/DEV-LOG.md) and the dated release reports. Completed work is not an instruction to repeat hosted writes or synthetic-account operations.
