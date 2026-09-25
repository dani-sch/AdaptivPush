# AdaptivPush current state

## Source and hosted runtime

`origin/main` contains the complete September 11-18 release sequence through merge commit `ec848e6`. PRs #54-#58 are merged; PR #58 brought the September 17 scoped-removal/session-recovery work, the September 18 workout-structure release, and the later resume/detailed-Add fixes into the default branch. Its remote feature branch has been deleted. There were no later product commits through the September 25 refresh, and there is no active release PR for this boundary.

The verified hosted project is `thfxcvxcsfvrzdysdnkq`. Its supported ledger has nine entries: `20260910175317`, `20260910190000`, `20260910210000`, `20260911120000`, `20260915151000`, `20260915190000`, `20260915210000`, `20260917180000`, and `20260918160000`. Authenticated capabilities are correction 2, removal 1, and structure 1. The normal local environment enables both durable writers; credentials remain untracked.

The latest deployment preserved all 58 preexisting non-ledger relations and all 23 public relations, passed schema/security comparison, and followed a fresh encrypted backup plus isolated PostgreSQL 17 restore matching 59/59 relations. Exact hashes, custody, SQL coverage, and recovery limits are recorded in the [September 18 report](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-EDITING-2026-09-18.md).

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

The September 25 rerun on current `main` passes 157 application cases: 106 workout, 20 program, 20 availability, 9 catalog, and 2 dependency. `npx tsc --noEmit --strict` passes. `npm run lint` has zero errors and three preexisting unused-variable warnings. The mandated `ruff check scripts/ tests/ src/` remains inapplicable to this documentation-only refresh: there are no Python files under the applicable `scripts/` or `tests/` paths and the repository has no `src/` directory.

The latest dated database evidence includes 14 structural SQL suite executions across fresh/restored targets plus concurrency, role, replay, stale-revision, schema, and preservation checks. Those checks were not repeated by documentation cleanup and remain owned by the release report.

## Open acceptance and unknowns

- The user owns Expo/physical iPhone acceptance. Do not clear device storage, reset credentials, reinstall the app, mutate user workouts for testing, or redeploy migrations merely to test the client.
- Keyboard layout, card presentation, native modal timing, VoiceOver, dynamic type, background/foreground, disconnect/reconnect, and native restart/interruption remain unverified on the physical device.
- The installed phone client/build, the cause of the first native missing-module failure, and the exact route meant by editing a past program remain unconfirmed.
- Thirty-two preexisting non-rest days have no exercises, including five in active programs. They were preserved; complete persisted workouts can use durable identities, while empty legacy days remain unstartable.
- AP-04 dated scheduling/manual deviations and AP-05 authoritative mixed-history progression remain queued. No current change claims those slices.

## Review and continuation

PRs #54-#58 are merged into `main`; [PR #58](https://github.com/dani-sch/AdaptivPush/pull/58) is closed as the consolidated publication boundary for later workout editing, removal, recovery, structure, and detailed-Add work. The [September 25 two-week product status](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md) translates that boundary into user abilities and an ordered next path. Continue only from [TODO](/dev-doc/main/TODO.md); use the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) for slice scope and dated reports for historical evidence.
