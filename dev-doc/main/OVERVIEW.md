# AdaptivPush overview

AdaptivPush is an Expo Router strength-training planner and workout logger backed by Supabase. Its product direction combines useful planning, accurate workout records, and explained adaptive proposals while preserving user agency. Free training remains complete; premium is reserved for advanced customization, equipment precision, and automation.

## Current release boundary

The trusted catalog, durable workout/program foundations, and AP-04 dated-schedule database authority are deployed to the verified hosted project `thfxcvxcsfvrzdysdnkq`. Completed-workout correction, scoped set/exercise removal, durable exercise/set additions, and composed future program edits remain deployed.

| Boundary | Current fact |
|---|---|
| Hosted capabilities | correction 2, removal 1, structure 1, schedule 1 |
| Hosted ledger | Twelve supported migrations through `20260929180000_ad_hoc_progression_effects.sql`; standalone ad-hoc partial finalization is deployed |
| Source publication | PRs #54-#58 merged; AP-04/AP-05.1 client source remains on `codex/ap04-ap05-schedule-history` and is not released |
| Published client behavior | Resilient auth/session hydration; owner-scoped draft and pending-operation recovery; stable occurrence routing; detailed Add/Swap picker; atomic Finish/Save with receipt verification |
| Superseded feature-branch behavior | Dated Today/Plan, schedule commands, scheduled Finish/correction, adherence/reminders, and history coverage; not approved for publication |
| Current automated evidence | September 27 branch rerun: 213 application cases, strict TypeScript, and lint with zero errors and two known warnings |
| Current acceptance limit | Physical iPhone/Expo presentation, native restart/interruption, keyboard/accessibility, and the user's exact past-program route remain user-led and unverified |
| Next product slices | Flexible AP-04 sequence/timer implementation and the two-alert device acceptance, then AP-05 authoritative progression/explanations |

Implementation and tested behavior take precedence over older planning language. The September 17 and 18 reports retain the exact release, recovery, migration, and regression evidence; plans now describe the remaining work rather than treating deployed behavior as proposed.

## What the latest work changed

Workout capture and completed editing now preserve raw input, explicit performed/skipped/not-attempted outcomes, stable original prescription evidence, and durable added structure. Removal, swaps, and additions can be composed into one future-program revision while completed ancestors remain unchanged. Recovery waits for exact pending operations and authoritative saved values before reporting success.

The Add flow reuses the detailed exercise picker, loads the complete catalog, keeps duplicate additions distinct, and requires an explicit scope confirmation. Restoration accepts unfinished measurements without hiding the editor; validation remains at Check/Finish. Auth hydration distinguishes transient connectivity failures from sign-out, and native clients reject loopback backend configuration.

The published client does not expose dated scheduling. The hosted schedule schema is deployed but dormant, and the feature-branch dated client is superseded by the [flexible program-sequence decision](/dev-doc/plans/active/ADAPTIVPUSH-FLEXIBLE-PROGRAM-SEQUENCE-DECISION-2026-09-27.md). Neither provides a new progression worker, public/community features, health integration, purchases, or broader AP-05 policy.

The AP-04 database migration is deployed and verified, but its dated client release is **superseded**, not pending publication. The next client path is durable flexible sequence control, history-only ad-hoc capture, explicit completion context/pause behavior, and only the permitted active-draft/rest-timer alerts. It is not merged or distributed, and physical-device acceptance remains open. See [current state](/dev-doc/main/CURRENT-STATE.md), the [flexible program-sequence decision](/dev-doc/plans/active/ADAPTIVPUSH-FLEXIBLE-PROGRAM-SEQUENCE-DECISION-2026-09-27.md), and the historical [production evidence and requirement-to-test matrix](/dev-doc/reports/ADAPTIVPUSH-SCHEDULE-HISTORY-2026-09-25.md).

## Read next

- [Current state](/dev-doc/main/CURRENT-STATE.md): exact hosted/source posture and remaining limits.
- [Active task board](/dev-doc/main/TODO.md): the only immediate execution queue.
- [Plan index](/dev-doc/plans/active/PLAN-INDEX.md): canonical ownership and provenance.
- [Master plan](/dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md): approved behavior and boundaries.
- [Execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md): stable AP slices and release gates.
- [Implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md): code-backed working, partial, and missing facts.
- [Architecture](/dev-doc/main/ARCHITECTURE.md), [roadmap](/dev-doc/main/ROADMAP.md), [file index](/dev-doc/main/TOC.md), and [command routing](/dev-doc/main/COMMAND-TOC.md).

## Evidence

- [September 27 AP-04 production migration](/dev-doc/reports/ADAPTIVPUSH-SCHEDULE-HISTORY-2026-09-25.md)
- [September 18 workout editing and detailed Add](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-EDITING-2026-09-18.md)
- [September 25 two-week product status and next path](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md)
- [September 17 iPhone/session recovery](/dev-doc/reports/ADAPTIVPUSH-IPHONE-RECOVERY-2026-09-17.md)
- [September 17 scoped-removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md)
- [September 17 completed-workout correction release](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md)
- [September 14 AP-02/AP-03 release](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md)
