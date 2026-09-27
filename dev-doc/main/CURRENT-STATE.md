# AdaptivPush current state

## Source and hosted runtime

`origin/main` contains the complete September 11-18 client release sequence through merge commit `ec848e6`. PRs #54-#58 are merged; PR #58 brought the September 17 scoped-removal/session-recovery work, the September 18 workout-structure release, and the later resume/detailed-Add fixes into the default branch. AP-04/AP-05.1 client source remains on `codex/ap04-ap05-schedule-history`; it is not merged, distributed through Expo, or physically accepted.

The linked project `thfxcvxcsfvrzdysdnkq` is healthy and, as of `2026-09-27T16:52:52.779Z`, has the exact ten-migration ledger through `20260925190000`. Hosted correction/removal/structure/schedule capabilities are `2/1/1/1`; 26/26 public tables have RLS and 67 public policies exist. `program_schedules`, `scheduled_days`, and `schedule_deviations` are present and empty. The AP-04 migration used Supabase CLI 2.118.0 with password-based Session-pooler authentication, avoiding the blocked temporary-role path. No managed-role or migration-ledger repair occurred.

AP-04.1-AP-04.3 and AP-05.1 dated client work remains **unreleased** on `codex/ap04-ap05-schedule-history`. Its initial placement, accepted-date Today/Plan, scheduled start/Finish/correction, adherence, and reminder paths are superseded by the [flexible program-sequence decision](/dev-doc/plans/active/ADAPTIVPUSH-FLEXIBLE-PROGRAM-SEQUENCE-DECISION-2026-09-27.md) and must not be published as active behavior. The local deviation foundation is not approved sequence authority. The fresh September 27 encrypted backup restored with exact equality across 59 live relations; the exact migration/fixture rehearsal preserved all originals and separate-session schedule/revision/Finish/correction replay passed. Production postflight matched the rehearsed non-ledger target with zero differences. The 213-case application suite and strict TypeScript pass; lint has zero errors and two pre-existing warnings. See the [AP-04 production evidence](/dev-doc/reports/ADAPTIVPUSH-SCHEDULE-HISTORY-2026-09-25.md).

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
- AP-04 dated database authority is deployed but dormant. No client writer may create dated placements and no client reader may treat them as program authority. Flexible sequence persistence, suggested-next ranking, alternate-day selection, history-only ad-hoc capture, pause/resume, completion context, and the two permitted notifications remain open.

## Review and continuation

PRs #54-#58 are merged into `main`; [PR #58](https://github.com/dani-sch/AdaptivPush/pull/58) is closed as the consolidated publication boundary for later workout editing, removal, recovery, structure, and detailed-Add work. The [September 25 two-week product status](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md) translates that boundary into user abilities and an ordered next path. Continue only from [TODO](/dev-doc/main/TODO.md); use the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) for slice scope and dated reports for historical evidence.
