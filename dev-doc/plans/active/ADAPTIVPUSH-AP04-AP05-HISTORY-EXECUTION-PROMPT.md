# AP-04 scheduling and AP-05.1 history execution prompt

Approved scope: 2026-09-25. Status: ready for implementation; production Supabase deployment is authorized and required. No implementation or deployment is established merely by this prompt.

## Mission and authorization

Work in `C:/workout-app/AdaptivPush`. Complete AP-04.1, AP-04.2, AP-04.3, and AP-05.1 as one coordinated implementation session, including every required production migration, client integration, verification, source publication, and documentation closeout.

The user's approval is: "I dont want just local migration. all migrations should be full production migration through the supabase. --with that change, i approve the rest of the scope. turn it into a robust phases by phase prompt, referneceing all necessary docs".

This authorizes the additive migrations and necessary compatible backfills for these approved slices on Supabase project `thfxcvxcsfvrzdysdnkq`, after successful preflight, fresh recovery proof, and rehearsal. Implement, test, deploy, verify, and enable the supported client paths without requesting another routine migration approval. Local-only implementation or an undeployed migration packet does not complete the assignment. Rehearsal is an intermediate verification step.

Authorization is scoped to these slices and the named project. It does not authorize destructive resets, deletion of customer data, fabrication of missing prescriptions/dates, unrelated historical migrations, a different hosted target, or rewriting previously deployed migration files. Resolve ordinary engineering choices autonomously from approved contracts. Stop only the affected action for a concrete technical blocker or a material product decision not settled by the approved documents, while continuing independent work. Describe the exact blocker and evidence; do not use a generic approval checkpoint as a substitute for finishing the authorized work.

## Required context, in order

Read the listed instructions completely and the relevant product-document sections before acting on them. All paths are relative to the repository root unless absolute.

1. [Repository contract](/AGENTS.md), then [Overview](/dev-doc/main/OVERVIEW.md).
2. [Current state](/dev-doc/main/CURRENT-STATE.md), [task board](/dev-doc/main/TODO.md), [architecture](/dev-doc/main/ARCHITECTURE.md), [roadmap](/dev-doc/main/ROADMAP.md), and [file index](/dev-doc/main/TOC.md).
3. [Documentation instructions](/.github/instructions/documentation.instructions.md), [TypeScript/React Native instructions](/.github/instructions/typescript.instructions.md), and [command routing](/dev-doc/main/COMMAND-TOC.md). Use current installed package/lockfile versions when older instruction prose disagrees; do not downgrade Expo to match stale prose.
4. [Approved D-01-D-14 decisions](/reports/plans/ADAPTIVPUSH-PLANNING-DECISION-RECORD-2026-09-08.md), especially D-01, D-02, D-04, D-05, D-10, D-11, D-12, and D-13.
5. [Plan index](/dev-doc/plans/active/PLAN-INDEX.md), [master plan](/dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md), and [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md). Read architecture, workout/history state machines, scheduling/consistency, and universal release gates; AP-04.1-04.3 and AP-05.1 are the delivery boundary.
6. [Implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md), [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md), and [traceability](/dev-doc/plans/active/ADAPTIVPUSH-TRACEABILITY.md). Cover DB-02/03/04, optional derived DB-23, common mutation rules, compatibility/rollback, AC-TR-026 through AC-TR-038 and AC-TR-044, plus the bounded history portions of AC-TR-042/045/046. Keep AP-05.2/05.3 acceptance open.
7. [Research translation](/dev-doc/plans/active/ADAPTIVPUSH-RESEARCH-TRANSLATION.md) for limits on numerical/adherence/recovery policy claims. This session does not invent new physiological rules.
8. [September 25 status](/dev-doc/reports/ADAPTIVPUSH-TWO-WEEK-PRODUCT-STATUS-2026-09-25.md), [durable-record release](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md), [workout lifecycle](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-LIFECYCLE-2026-09-15.md), [completed correction release](/dev-doc/reports/ADAPTIVPUSH-EDIT-PAST-WORKOUT-RELEASE-2026-09-17.md), [session recovery](/dev-doc/reports/ADAPTIVPUSH-IPHONE-RECOVERY-2026-09-17.md), [removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md), and [structure/Add release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-EDITING-2026-09-18.md).
9. Existing `supabase/migrations/`, `supabase/tests/`, feature contracts, and tests relevant to each phase. Historical reports supply evidence and recovery procedures; their expired authorization gates and draft-PR descriptions do not supersede this approval or current Git state.

Use the repository `plan`, `document`, verification, and Git/integration routes as applicable. Inspect their actual instructions and available tooling; do not assume automation or integrator synchronization has occurred.

## Outcomes and preserved contracts

- Today resolves the selected schedule's local date into workout, programmed rest, unresolved missed work, pause, or program completion. A pending or active workout remains explicitly recoverable.
- Users can confirm initial schedule placement, move/carry/swap/skip/replace work, edit future recurrence, convert workout/rest placement explicitly, and change temporary availability or pause. All manual controls remain free.
- Original placement, cycle identity, prescription lineage, accepted changes, and performed results remain distinct. Completed and in-progress work cannot be moved by future scheduling commands.
- Finishing links exactly one session to its intended occurrence. Partial finalization closes that workout without fabricating full or accepted-reduced credit. Corrections revise effective fulfillment without reopening or duplicating the occurrence.
- Weekly adherence reports eligible workouts, full/accepted-reduced fulfillment, partial/pending/unresolved work, respected rest, and accepted pauses transparently. Optional weeks-on-plan is hideable; pauses preserve without incrementing it.
- Reminders honor accepted dates, schedule timezone, selected reminder time, quiet hours, and permission; superseded alerts are cancelled.
- All supported historical sources remain visible together, with deterministic deduplication, correction-aware values, and explicit coverage/error states.
- Preserve existing generated/manual installation, archive/restore, owner-scoped drafts, raw unfinished inputs, exact pending operations, Add/Swap/Remove scopes, frozen prescriptions, stable IDs, atomic future revisions, and completed Save/Cancel/reopen.

Keep AP-05.2 progression evaluation/application, AP-05.3 shared evidence/education UI, AP-06/07 generation/equipment redesign, AP-08/09/10 coaching, public/sharing/health/commerce, and broad UI redesign outside scope. Existing progression must not become a new read-triggered side effect of scheduling/history. Any necessary compatibility guard must be narrowly tested and reported; it does not close AP-05.2.

## Phase 0 - Inspect and lock the integration contracts

1. Inspect Git status, remote state, worktrees, instruction routing, dependencies, and available Supabase tooling. Preserve existing changes and local credentials. Work on a `codex/` feature branch from the verified baseline, incorporating this approved prompt and the status refresh if they are not yet in `origin/main`.
2. Inspect the canonical `integrator` checkout before modifying it. Plan small commits and explicit integration checks; no direct push to `main`, force-push, or automatic destructive cleanup.
3. Reverify hosted project identity, migration ledger, capabilities, and current schema read-only using authenticated tooling. The last recorded baseline is nine migrations through `20260918160000`, with correction 2/removal 1/structure 1; treat these as expectations to check, not current proof.
4. Trace all occurrence routing, finalization/correction, archive/restore, future Add/Swap/Remove targeting, history readers, notification scheduling, and `start_date` advancement. Trace active calls rather than trusting stale symbol/line references in reports. Specifically recheck old readiness-overlay claims before repeating them as current defects.
5. Specify scheduled-occurrence identity separately from relative program-day/slot lineage. Map revisions without manufacturing duplicate occurrences or losing existing finalization uniqueness. Specify schedule-revision versus prescription-revision checks and their atomic interaction.
6. Define the policy for fixed in-progress work, including an offline draft created before a conflicting server schedule edit and a second device that cannot see local draft state. Surface reconcilable conflicts; never silently discard the draft or claim the server knows an offline start it has not seen.
7. Define existing-program import, new-program placement, archive/resume/restart, timezone changes, reporting-week boundaries, reminder behavior, and adherence calculation version. Surface configurable user choices in the app; use approved defaults where specified and document ordinary engineering choices. Ask only if an unresolved product choice materially changes the approved behavior.
8. Establish a requirement-to-test matrix and baseline regression results. The prior 157 cases are a regression baseline, not a target test count or full acceptance proof.

Exit: contracts, compatibility behavior, exact migration scope, file ownership, and acceptance coverage are concrete enough to implement without inventing user history.

## Phase 1 - Pure scheduling and recovery primitives

Implement focused modules under proposed `features/scheduling/`, `features/kernel/localDate.ts`, and a schedule operation store. Use pure selectors/policies behind repositories and commands; screens compose their results.

Cover local dates and IANA timezones, original/current placement, cycle identity, effective recurrence intervals, workout/rest types, accepted pause intervals, fulfillment states, expected revisions, stable operation IDs, and versioned payload validation. Persist owner-scoped offline operations with exact retries. Distinguish pending local intent from accepted server placement and provide conflict refresh/rebase without silently rewriting uncertain submitted requests.

Test DST, travel timezone, midnight sync, cross-week moves, consecutive misses, fixed work, empty programs, late responses/account switches, and unavailable server capability. Missed work remains an explicit choice; date passage never creates catch-up debt.

Exit: deterministic domain behavior and recovery tests pass independently of UI and hosted writes.

## Phase 2 - Additive schema and authoritative commands

Implement the approved `program_schedules`, `scheduled_days`, and `schedule_deviations` responsibilities with the smallest sufficient physical schema. Derive consistency locally first; add a rebuildable cache only with demonstrated need. Use one or more logically grouped new timestamped migrations rather than forcing an oversized single migration.

Add owner reads, RLS and effective grants, same-owner/parent lineage enforcement, expected-revision checks, payload validation, idempotent operation receipts, capability discovery, and appropriate indexes/constraints. Multi-occurrence swaps commit both sides or neither. Preserve approved schedule revisions and original-placement provenance.

Integrate fulfillment with existing finalization/correction authority. Validate old and new entrypoints against the same single-fulfillment invariant; avoid independent client writes that could save a session without its schedule link. Plan locks and lock order for schedule, program revision, and workout commands. Schedule and prescription edits must not race into inconsistent lineage.

Legacy fields and readers remain supported through an explicit compatibility window. Backfill only facts supported by stored evidence. Unknown original dates stay unknown until prospective placement is accepted. Empty non-rest days remain unresolved/unstartable with useful copy; never infer rest from absent exercises. Do not replay `reports/migrations/001_workout_session_exercises.sql` or create an imagined legacy source to satisfy tests.

Create SQL tests for ownership, anonymous/private-helper denial, atomic swap, fulfillment replay, stale revisions, changed replay payloads, concurrent schedule/finalize/program-revision operations, correction effects, fixed-work protection, legacy compatibility, and preservation of existing release behavior. Reset only a verified isolated test database.

Exit: new migrations apply on a fresh local schema and an isolated restored hosted baseline, with security, data-preservation, rollback/failure, and concurrency assertions passing.

## Phase 3 - Dated Today, Plan, and program lifecycle (AP-04.1)

Extract scheduling responsibility from `hooks/useCurrentProgram.ts` into focused modules such as `hooks/useProgramSchedule.ts`. Update Home, Plan, NextWorkoutCard, Program Overview, workout route resolution, and capture/correction integration.

Provide an initial schedule-placement preview with timezone and workout/rest dates. Existing-account placement is accepted by the user through the product; schema-deployment approval does not let the agent choose calendar dates on the user's behalf. Existing programs and active drafts remain usable while placement is pending. New generated/manual installs must expose placement through a coherent failure/retry flow without leaving a broken active program.

Retire `start_date` backdating as scheduling authority. Preserve that field as historical context. Resolve Today from dated placement; do not substitute the first unfinished workout on a rest day. Keep an explicitly selected workout and an active draft recoverable across route, owner, prescription, and schedule changes. Archive/restore must preserve checkpoints and request prospective placement when required, without filling missed dates automatically.

Exit: AP-04.1 works end to end on the integration target, with honest legacy/unplaced/offline/conflict states and preserved old training routes.

## Phase 4 - Manual schedule changes (AP-04.2)

Implement preview/confirm/cancel flows for one-time moves, carry, atomic two-way swaps, skip/replace/leave-unresolved decisions, future recurrence edits, temporary availability, pause/resume, and explicit workout/rest conversions. Cover all AC-TR-026 through AC-TR-034 scenarios; do not silently reduce AP-04.2 to a simple date picker.

Show what stays fixed, what moves, what becomes unplaced, and the resulting rest/work pattern. Recurrence edits start at an explicit future boundary. Workout/rest conversions must select an actual prescription and explain displaced work; a conversion cannot create an empty synthetic workout. Infeasible placement remains an explained choice rather than an automatic compressed schedule.

Preserve the released future-program Add/Swap/Remove contract under dated moves. Make scope wording distinguish the relative program-day pattern from the calendar date. Revalidate eligible counts and expected revisions at commit; completed/active work remains protected. Ordinary calendar movement cannot silently change exercise identity, loads, or progression context.

Exit: manual controls, offline queues, stale-preview recovery, and concurrent device cases pass through actual commands and integrated UI.

## Phase 5 - Consistency and reminders (AP-04.3)

Implement `features/consistency/selectors.ts` with an explicit calculation policy, schedule revision, and source watermark including correction revisions. Calculate eligible-workout adherence separately from respected rest, pending activity, partial fulfillment, unresolved work, and pauses. Accepted-reduced credit requires evidence of an accepted reduction; removing required sets alone cannot manufacture that credit. Show retrospective recalculation provenance.

Implement the optional hideable weeks-on-plan display. Accepted pauses preserve without increment; rest/deload weeks are described accurately. Add fixtures for a two-workout/five-rest-day week, variable frequencies, correction after sync, cross-week movement, hidden consistency, and partially unavailable source data.

Update `utils/notifications.ts` and notification settings to use accepted schedule placement, timezone, selected time, quiet hours, and OS permission. Reconcile existing reminder identifiers, cancel superseded alerts, prevent duplicate schedules, and handle restart/timezone/permission changes. Unsupported email/SMS controls must not promise delivery. Prove scheduling calls with adapter tests and report actual native delivery separately.

Exit: AC-TR-035 through AC-TR-038 have evidence, with native-only checks explicitly identified for user acceptance.

## Phase 6 - Unified effective history (AP-05.1)

Implement focused contracts, repository, and selectors under `features/history/`. Inspect which legacy sources actually exist before choosing adapters. A missing unsupported legacy relation is different from an auth/permission/network failure while reading a supported source.

Union supported legacy and durable records. Deduplicate only on stable identities or explicit migration linkage, never coincidental exercise/date/load matches. Preserve separate legitimate workouts. Handle complete pagination and stable ordering; a failed later page cannot become a silently complete history result.

Read the latest effective corrected session and retain source identity, provenance, prescription/cycle context, actual exercise identity, load kind/unit/side, and known coverage. Do not expose internal correction audit payloads or infer missing equipment configurations. Preserve unlinked legacy personal records; general PR/cohort recomputation and progression remain deferred.

Wire History, Workout History, ExerciseHistoryModal, and existing history helpers to the shared model. Represent loading, ready, empty, unavailable, cached/stale, and partial source coverage explicitly. Owners cannot see another account's cached history. Corrections invalidate relevant history/adherence caches; opening history never writes progression or schedules.

Test legacy-only/current-only/mixed/absent-source cases, migration duplicates, distinct same-day sessions, later-page failure, account changes, corrections, partial workouts, mixed units/assistance, cancelled reads, and out-of-order responses. Identify the bounded history coverage of AC-TR-042/045/046 without closing the wider progression/equipment requirements.

Exit: every supported history consumer shows consistent effective results and honest coverage/error states.

## Phase 7 - Integration verification and production recovery proof

Integrate focused commits through the canonical integrator and verify the resulting source, resolving overlaps carefully. Run the existing dependency/catalog/workout/program/availability suites plus new scheduling/consistency/history suites, strict TypeScript, lint, and relevant SQL/concurrency suites. If Python changes are necessary, run the mandated Ruff gate and report any preexisting gate failure precisely. Do not repeat expensive checks without a changed artifact or unresolved concern.

Cover end-to-end flows: install/import -> dated Today/rest -> move/swap/pause -> start/resume -> composed Add/Swap/Remove -> Finish -> History -> completed correction -> revised adherence/reminder state. Exercise disabled/missing capability, auth expiry, offline response loss/replay, account switch, archive/restore, and old-client compatibility.

Preserve the user's control of physical Expo/iPhone acceptance and existing device data. Do not reset storage, reinstall, reset credentials, or mutate user workouts for testing. Honor prior limits on agent-driven visual testing. Record any permitted nonvisual/browser evidence with its exact environment; do not equate an export or browser pass with native keyboard/gesture/VoiceOver/restart proof. Outstanding user-led physical acceptance is reported separately and does not reintroduce a routine deployment-approval gate.

Prepare fresh encrypted production recovery material using inspected supported tooling and the established custody approach. Reuse verified helpers only after inspection; protect keys and plaintext data, keep private artifacts outside Git, and record hashes, capture time, scope/exclusions, and restore instructions. Restore into an isolated compatible PostgreSQL target; compare schema/security, counts, and row fingerprints. Rehearse the exact new migration bytes and backfills on the restored copy. Record every intentional transformation and verify preserved records rather than requiring changed columns to have identical hashes.

Exit: exact source/migration hashes, restored-data rehearsal, role/concurrency tests, compatibility matrix, and bounded production deployment procedure are ready. A stale historical backup is insufficient proof for this release.

## Phase 8 - Deploy and enable on production Supabase

This phase is already authorized. Carry it out after technical checks pass; do not hand off an undeployed SQL packet as completion.

1. Immediately before deployment, verify authenticated target `thfxcvxcsfvrzdysdnkq`, migration ledger, live drift, recovery artifact integrity/freshness, and exact pending migration list. Resolve unexpected unrelated migrations without deploying them. Halt only the affected deployment if the target cannot be proven or drift invalidates the rehearsal.
2. Use the supported Supabase migration tooling available to the session, preferably the verified linked CLI migration workflow. If that path cannot express necessary transactional assertions, use a verified authenticated migration runner following the existing release procedure, keeping applied SQL and the supported Supabase ledger consistent. Never mark unapplied migrations as applied or manually repair history to bypass drift.
3. Deploy only the reviewed new migrations/backfills, in dependency order, with bounded lock/statement timeouts and transactional integrity appropriate to each artifact. Recheck concurrent production writes; distinguish real user activity from migration effects. Apply the rehearsed preservation assertions and request PostgREST schema reload as needed.
4. Verify committed ledger versions, schema, constraints, policies/grants, RPC/capability availability, owned reads, cross-owner rejection, anonymous/private-helper denial, and preserved existing records. A deployment command exit code or anonymous 401 alone does not establish authenticated functionality.
5. Use read-only hosted checks and, where necessary, isolated synthetic SQL role probes that roll back and have no external side effects. No synthetic committed workouts or schedule choices in the user's account. Keep user data out of logs.
6. Enable the supported scheduling/history client path in the ordinary hosted Expo configuration after backend readiness. Confirm the actual served client targets the production project and sees the intended capabilities/flags. Privileged keys never enter the client bundle. Schema deployment and client enablement are both required for this release.
7. If a required fix produces another in-scope additive migration, rehearse and deploy it with the same checks under this authorization. Previously applied migration bytes stay immutable.
8. If post-deployment checks fail, contain the affected new writer, preserve accepted records, pending operations, receipts, and compatible reads, then diagnose and rehearse an additive forward correction. Never blindly restore an older dump over newer production writes or drop newly accepted data.

Exit: all migrations necessary for the implemented approved scope are committed and verified in production, and the ordinary client is configured to use them. Report an exact technical blocker if this cannot be achieved; do not call a local result a full release.

## Phase 9 - Documentation, publication, and handoff

Update owning living docs and the execution register, implementation status, database plan, and traceability in place. Mark AP-04 and AP-05.1 by actual evidence; leave AP-05.2/05.3 and unperformed physical acceptance open. Write one dated release report with source/integrator commits, actual migrations/hashes, recovery proof, hosted checks, test results, compatibility decisions, and remaining acceptance.

Keep focused commits, complete canonical integrator validation, and publish a feature branch/review through the repository workflow without direct main or force pushes. Reuse a matching open PR if one exists; otherwise create a review for this release and attach it in the app when supported. Do not assume PR #58 is still open. Do not automatically merge or delete unrelated branches/worktrees.

This prompt is a task-specific intake. When execution consumes it, archive its exact contents under the repository's dated superseded convention, record the original path and canonical successors, repair direct active references, and regenerate the TOC when inventory changes. Keep current execution in the task board and owning register.

The final handoff must state:

- User actions now available, including existing-program schedule placement and new history behavior.
- Completed scope versus explicitly deferred AP-05.2/05.3 work and native acceptance.
- Production project, deployed migration versions, capability/enablement results, and deployment timestamp.
- Source/SQL/concurrency verification results and a private recovery-artifact reference with exclusions.
- Git branch/commits, integrator result, and review URL if published.
- A concise existing-account Expo acceptance checklist, including cold launch, rest Today, move/swap, pause/resume, draft recovery, Add/Swap/Remove, Finish, mixed history, correction, adherence, and reminders.

## Expected implementation surfaces

Proposed new paths: `features/kernel/localDate.ts`, `features/scheduling/*`, `features/consistency/*`, `features/history/*`, `hooks/useProgramSchedule.ts`, related shared schedule controls, `tests/scheduling/*`, `tests/consistency/*`, `tests/history/*`, and slice-owned `supabase/migrations/` and `supabase/tests/` artifacts.

Expected modifications: `app/(tabs)/home.tsx`, `app/(tabs)/plan.tsx`, `app/(tabs)/history.tsx`, `app/program-overview.tsx`, `app/archived-programs.tsx`, `app/create-program.tsx`, `app/next-workout.tsx`, `app/edit-workout.tsx`, `app/workout-history.tsx`, `app/(tabs)/profile/notifications.tsx`, `components/NextWorkoutCard.tsx`, `components/ExerciseHistoryModal.tsx`, relevant program-generation/install UI, `features/workouts/*`, `features/programs/*`, `hooks/useCurrentProgram.ts`, `utils/notifications.ts`, `utils/fetchExerciseHistory.ts`, `types/program.ts`, `types/database.ts`, and `package.json` test scripts. Treat these as a discovery map, not a demand to change every file.

Keep shared screen/hook integration sequential where necessary. Pure scheduling/history modules and fixtures can be developed independently after the contracts agree; this prompt does not require parallel agents.
