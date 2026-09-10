# AdaptivPush requirement and decision traceability

This document owns requirement identities, source dispositions, and the acceptance crosswalk. Product behavior belongs to the [master plan](/dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md); delivery status and gates belong to the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md); verified implementation facts belong to [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md); schema, grants, RLS, and migration design belong to the [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md). The [inventory](/dev-doc/plans/active/ADAPTIVPUSH-DOCUMENT-INVENTORY.md) owns archive destinations. A mapping here is a requirement to verify, never a claim that a feature or test exists.

The approved [decision record](/reports/plans/ADAPTIVPUSH-PLANNING-DECISION-RECORD-2026-09-08.md) supersedes conflicting source proposals. D-09A through D-09E are separate decisions within D-09. The original request and packet remain unchanged provenance. Exact fitness numbers are provisional under D-10; naming a scenario does not approve its numerical policy for broad release.

## Reading the crosswalk in either direction

Each TR row is a stable requirement and has a correspondingly numbered acceptance scenario: TR-001 maps to AC-TR-001. The acceptance column states that scenario's trigger and observable expected result. Its section supplies the owning AP slice; the row supplies the decision, contract, database authority, current code seam, and required evidence. Search an AP ID, D ID, table, source alias, TR ID, or AC ID to traverse the same chain in reverse. Code references identify files to inspect or evolve, including incomplete paths; they do not assert the target contract is implemented.

Disposition vocabulary: **retained** preserves the requirement; **revised** preserves intent with explicitly changed behavior; **replaced** substitutes a different model; **deferred** excludes it from the named release until its listed gate; **rejected** excludes the proposed behavior. Repeated source wording maps to one row rather than creating several authorities. Historical status/checklists are evidence claims, not new requirements or proof of current completion.

Evidence codes expand as follows. Every resulting artifact must carry AP/TR/AC IDs, tested commit, policy/schema version, environment, fixture inputs, observed result, and limitations; attach its path to the execution register and DEV-LOG.

| Code | Expected artifact, not yet produced by this planning task |
|---|---|
| P | Deterministic domain fixture output with boundary and counterexample assertions. |
| I | Persistence/command integration transcript, including retries, failed writes, ownership, and resulting rows. |
| U | Device walkthrough or component evidence showing action, visible state, accessibility, and recovery. |
| S | Effective-grant/RLS/relational security matrix with anon and two owners; separate privileged command tests. |
| O | Operational rehearsal: named owner, queue/audit evidence, failure and recovery, support path. |
| V | Versioned policy calibration record, evidence-strength/caveat review, user outcome review, and qualified review where safety-sensitive. |
| DOC | Inventory/link/diff/provenance verification only; no runtime claim. |

## Source keys and current code keys

The historical filenames below occur only as provenance references. They supply no active execution authority.

| Source key | Exact source and locator convention |
|---|---|
| LM | [Prior master](/dev-doc/plans/legacy/2026-09-08-superseded/reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md): lettered sections A–L; C.1–C.8 features, F.1–F.10 rules, G screen names. |
| LR | [Prior register](/dev-doc/plans/legacy/2026-09-08-superseded/dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md): historical stage IDs and decision-register rows. |
| EE | [Evidence execution source](/dev-doc/plans/legacy/2026-09-08-superseded/reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md): preserved decision register A–N, schema items 1–8, phases 1–8. |
| EI | [Evidence implementation source](/dev-doc/plans/legacy/2026-09-08-superseded/reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md): question-bank/clarification sections A–N and phase tasks. |
| UI | [UI source](/dev-doc/plans/legacy/2026-09-08-superseded/reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md): U1–U6 and UI-M1–UI-M4. |
| PF | [Possible features](/dev-doc/plans/legacy/2026-09-08-superseded/reports/plans/POSSIBLE-FEATURES.md): features 0–11; feature 8 parts A–C. |
| IP | [Original implementation source](/dev-doc/plans/legacy/2026-09-08-superseded/reports/plans/IMPLEMENTATION-PLAN.md): sections 1A–4E and cross-cutting concerns. |
| OR | [Original review request](/reports/plans/ADAPTIVPUSH-ORIGINAL-REVIEW-REQUEST-2026-09-08.txt): named capability, detailed behavior, architecture, database, entitlement, and dependency sections. |
| DP | [Verbatim decision packet](/reports/plans/ADAPTIVPUSH-DECISION-PACKET-2026-09-08.md): bold section lead-in quoted in a source cell or its subject. Proposals are superseded where the D record differs. |
| R | [Research report](/research/deep-research-report.md): sections B–K; retained synthesis, not newly verified literature. |
| CP | [Consolidation prompt](/reports/plans/ADAPTIVPUSH-PLAN-CONSOLIDATION-PROMPT.md): required workflow, verification, and handoff. |

| Code key | Exact current files / surface to inspect |
|---|---|
| AUTH | [root shell](/app/_layout.tsx), [landing](/app/index.tsx), [login](/app/(auth)/login.tsx), [join](/app/(auth)/join.tsx), [forgot password](/app/(auth)/forgot-password.tsx). |
| PROF | [Quick Setup](/app/(qsetup)/quick-setup.tsx), [profile](/app/(tabs)/profile/index.tsx), [preference adapter](/utils/profilePreferences.ts), [database types](/types/database.ts). |
| GEN | [generator modal](/components/GenerateProgramModal.tsx), [generator](/utils/programGenerator.ts), [defaults](/constants/programDefaults.ts), [program types](/types/program.ts). |
| CAT | [catalog](/lib/exerciseDatabase.ts), [swap modal](/components/SwapExerciseModal.tsx), [save coordinator](/utils/saveProgramToDb.ts), [seed script](/scripts/seedExercises.ts). |
| PROG | [current program](/hooks/useCurrentProgram.ts), [save coordinator](/utils/saveProgramToDb.ts), [Plan](/app/(tabs)/plan.tsx), [overview](/app/program-overview.tsx), [manual editor](/app/create-program.tsx), [archive](/app/archived-programs.tsx). |
| WORK | [workout](/app/next-workout.tsx), [current program](/hooks/useCurrentProgram.ts), [progression](/utils/progressionEngine.ts), [progression types](/types/progression.ts). |
| TODAY | [Home](/app/(tabs)/home.tsx), [NextWorkoutCard](/components/NextWorkoutCard.tsx), [workout](/app/next-workout.tsx), [current program](/hooks/useCurrentProgram.ts). |
| READY | TODAY plus [adaptation policies](/constants/adaptationPolicies.ts), [cycle utility](/utils/cyclePhase.ts), PROF. |
| HIST | [History](/app/(tabs)/history.tsx), [history alias](/app/workout-history.tsx), WORK. |
| TRUST | [evidence types](/types/evidence.ts), [registry](/constants/evidenceRegistry.ts), [FAQ](/app/faq.tsx), [Recovery Library](/app/recovery-library.tsx). Dedicated evidence route remains planned. |
| THEME | [ThemeContext](/contexts/ThemeContext.tsx), [themes](/constants/themes.ts), [palettes](/constants/palettes.ts), PROF. Commerce adapters remain planned. |
| OPS | [notifications](/utils/notifications.ts), [notification preferences](/app/(tabs)/profile/notifications.tsx), [privacy](/app/(tabs)/profile/privacy-data.tsx), [support](/app/(tabs)/profile/help-support.tsx), [app config](/app.json). |
| SCHEMA | [schema reference](/lib/adaptivpush_database_schema.md), [database types](/types/database.ts), [migrations](/reports/migrations/), [Supabase client](/utils/supabase.ts). |
| NEW | No corresponding implemented capsule verified; the AP register names planned files. Reuse only the specifically listed existing adapters. |

Database cells use actual existing table names or proposed DB-01…DB-28 / EQ-01…EQ-03 IDs owned by the database plan. “Owner” means authenticated owner operations checked through ownership and parent relations, never client-supplied user IDs as authority. “Command” means narrow backend validation plus transaction/idempotency/revision rules. “Local” is no new server authority. An aggregate/cache never owns source truth.

## AP-01 — Catalog authority, migration provenance, compatibility

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-001 · LM B data; LR historical S1.1; EE schema/migration principles; DP database readiness | revised · D-12 | Verified migration ledger and backup baseline before additive changes; SCHEMA. Historical manual SQL files are evidence, not a proved applied ledger. | AC-TR-001: compare fresh metadata, grants and ledger to migrations; rehearse restore; enumerate every drift and unresolved check. S/O |
| TR-002 · LR S1.2; DP catalog policy finding | revised · D-11/12 | Trusted catalog administration; ordinary reads allowed by reviewed policy; remove client catalog upserts as part of same rollout. exercises; CAT/SCHEMA. | AC-TR-002: ordinary callers cannot insert/update/delete catalog; generation/save still resolves valid canonical IDs; prove effective grants, not only RLS enabled. S/I |
| TR-003 · LM L isolation; LR S1.2; EE schema 1–8 | retained · D-12 | Owner isolation includes children and sensitive rows, FK consistency and storage. Existing private tables; SCHEMA. | AC-TR-003: owner A attempts all verbs with owner B parent IDs; deny cross-owner references and storage writes; privileged tests separate. S |
| TR-004 · LR S1.3; EE compatibility/backfill; DP migration compatibility | retained · D-12 | Missing rows, relation/column compatibility, dual-read precedence, rollback watermarks; PROF/PROG. | AC-TR-004: new profile, metadata-only legacy profile, missing relation and column each retain usable onboarding/save; record fallback without claiming modern capability. I/U |
| TR-005 · LR ambiguous checkin_id decision; LM E workout_sessions | revised · D-12 | Inspect ambiguous checkin_id; add explicit readiness_checkin_id only after decision, never reinterpret legacy FK. SCHEMA/WORK. | AC-TR-005: mixed old/new sessions preserve original links; invalid cross-owner new links rejected; migration reversible by reader fallback. I/S |
| TR-006 · PF 8A/B; IP 1A; LR S4 catalog refresh | revised · D-12 | Catalog IDs, normalization, image/instruction coverage, local snapshot version and trusted reseed provenance; exercises, CAT. Current image_url supersedes gif_url proposal. | AC-TR-006: each intended muscle/category resolves IDs online/offline; stale snapshot or missing image has explicit fallback; no name-based silent duplicate. P/I/U |
| TR-007 · LM E schema sufficiency claim; DP 28-table inventory | replaced · D-12 | Slice-owned migrations with constraints/indexes/backfill/rollback design; no blanket schema approval. SCHEMA and DB inventory below. | AC-TR-007: a proposed slice includes only its needed schema; existing vs proposed vs optional objects clearly distinguished. DOC/S |

### AP-01.1 evidence linkage — 2026-09-09

[The current read-only AP-01 evidence artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-09.md)
links AC-TR-001 through AC-TR-007 to the inspected commit, production metadata,
catalog writer/resolver inventory, retained migration hashes, and exact remaining
gates. Commits `e371348` and `cd0908e` add local AP-01.2a evidence: lookup-only
generated/dev saves, source/exact identity resolution, explicit unresolved
candidates, UUID-guarded swaps, and administrator-only seed code. It partially
satisfies AC-TR-001/002/003/006, preserves the legacy check-in interpretation for
AC-TR-005, and satisfies only the documentation distinction in AC-TR-007. It
does not claim restore, live ordinary-role write denial, trusted-curation
execution, two-owner write isolation, missing-schema runtime, Expo device,
integration, deployment, or release evidence.

[The September 10 AP-01.3a artifact](/dev-doc/reports/ADAPTIVPUSH-AP-01-2026-09-10.md)
adds partial AC-TR-001/007 evidence: pinned CLI `2.117.0`, PostgreSQL 17 local
configuration matching production `17.6.1.063`, current project/backup/migration
UI reinspection, and an exact command-effect/baseline/backup/restore checklist.
It adds no database evidence for AC-TR-002–006 and does not claim a project link,
baseline, ledger repair, backup, restore, isolated role test, device test,
integration, deployment, or release.

## AP-02 — Durable workout records

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-008 · LM G Next Workout; LR S6 completion; DP session-before-sets finding | revised · D-11/12 | CompletedWorkout: draft/finalizing/finalized distinction; atomic finalization of accepted prescription, sets and occurrence fulfillment. workout_sessions, workout_exercise_sets; command; WORK. | AC-TR-008: fail after session creation/before sets; no finalized completion or progression appears; retry same operation creates one result. I |
| TR-009 · LM K offline save; OR behavior contract; DP durable drafts | retained · D-01/11 | Owner durable local workout draft/outbox; stable set and operation IDs; WORK. | AC-TR-009: kill app offline after entering actual sets, relaunch and resume exact draft; sync duplicate requests without duplicate sets. I/U |
| TR-010 · DP frozen prescription; D-05 start semantics | revised · D-05/11 | WorkoutPrescription freezes on start; accepted amendment creates revision, never overwrites entered sets. program revision, workout snapshot; WORK/READY. | AC-TR-010: readiness response or cross-device edit arrives mid-workout; entered work and frozen target remain intact until explicit amendment. P/I/U |
| TR-011 · LM K partial workouts; DP progression accounting defect | revised · D-01/02 | Completion class records complete/reduced/partial/abandoned separately from saved records; no inferred full completion from logged-set count. sessions/sets; WORK. | AC-TR-011: one successful set of four persists as partial and cannot fulfill full prescription or trigger success progression. P/I |
| TR-012 · PF 8C; LM G swap; DP substitution bugs | revised · D-01/11 | Temporary replacement has scoped slot identity and actual exercise/load; future replacement is separate revision; command/owner; CAT/WORK/PROG. | AC-TR-012: swap after two sets; preserve their original identity, require new load calibration, do not carry incompatible sets or rewrite completed weeks. P/I/U |
| TR-013 · DP stale workout route; LM D/G navigation | revised · D-02/11 | Requested occurrence/prescription identity is explicit; unavailable target is error state. TODAY/WORK. | AC-TR-013: stale or invalid route never silently opens next workout; show target unavailable and explicit alternate selection. U |
| TR-014 · PF 10; IP 3D; LM G workout timer | retained · D-01/11 | Actual elapsed timer and preference-controlled haptics on saved set/swap/completion; local adapter; WORK/PROF. | AC-TR-014: disable haptics and background/resume workout; timestamps remain consistent and unsupported feedback has no effect on saving. U |
| TR-015 · PF 10 rest timer; IP 3D note | deferred · D-13 | Rest timer and background expiry feedback are later AP-02 enhancement, separate from existing elapsed timer; local. | AC-TR-015: current release never labels elapsed timer as rest timer; future timer must handle background expiry, permission denial, mute, and duplicate alerts. DOC/U |

## AP-03 — Durable programs, identity, and free onboarding

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-016 · LM E program-version model; DP contracts | replaced · D-03/11/12 | Separate ProgramTemplate, UserProgramInstance, immutable revision, prescription slots, occurrence and catalog IDs. programs plus DB-01; PROG/GEN. | AC-TR-016: regeneration creates new revision/private instance as specified; completed references resolve exact original prescription despite new generation. P/I |
| TR-017 · LM B save; LR S1.3; DP dirty save fix | revised · D-11/12 | Atomic create/replace: validate then commit full hierarchy/context/active choice; retain existing compensation until replacement verified. programs/days/exercises/context; command; PROG. | AC-TR-017: failure at every hierarchy/context/activation step leaves prior usable program active; retry/concurrent replace produces one declared winner. I |
| TR-018 · LM C.1; EE/EI C; LR S3 | revised · D-01/11 | ProfileSnapshot and TrainingGoalProfile require goal, availability, experience, broad equipment, time; optional demographic/horizon/focus capture uses disclosure. user_profile; PROF/GEN. | AC-TR-018: new user skips DOB, sex, gender, weight and optional injury questions, still generates trainable free plan; interruption resumes without duplicate active program. U/I |
| TR-019 · LM C.1 depth; EE/EI B; LR S3 | revised · D-01/11 | Essential/Guided/Advanced affect presentation only; flags, entitlement, consent, explanation verbosity and aggressiveness independent. profile/preferences; PROF/TRUST. | AC-TR-019: free Advanced user sees deeper explanations/manual editor; premium Essential remains simple; changing display depth cannot silently alter prescription. P/U |
| TR-020 · LM H profile compatibility; LR auth-metadata decision | retained · D-12 | Explicit profile/preference precedence and schema version; optional per-field controls materially affect supported behavior. user_profile/adaptation/evidence prefs; PROF. | AC-TR-020: legacy metadata conflicts with new rows; documented precedence wins and read failure never overwrites newer data with defaults. I |
| TR-021 · PF 4; IP 1C; LR archive semantics | revised · D-02/11 | Archive checkpoint includes revision/occurrences and completed context; distinguish resume/restart; legacy last_active_week never promises exact day. programs/DB-01/02/03; PROG. | AC-TR-021: archive at start/middle/end and resume later; preserve completed history, preview new placement, no start_date backdating or invented day checkpoint. I/U |
| TR-022 · IP 2D; DP optional naming | retained · D-01 | Optional custom name with generated fallback; programs.name; GEN/PROG. | AC-TR-022: blank name uses default, custom name persists, back from preview preserves inputs without saving. U/I |
| TR-023 · LM G Advanced-only manual editor; LR manual builder decision | revised · D-01 | Free explicit manual authoring path; common validation and save contract; PROG. | AC-TR-023: free user opens build-manually, saves and trains custom program using durable common installer; no subscription or depth-mode lock. U/I |
| TR-024 · LM C.2/G Plan and Overview; UI U3 | retained · D-01/11 | Plan/overview distinguish active/archive, stable version, goals, volume/rest/order/rationale, safe edit scopes; context owner reads; PROG/GEN/TRUST. | AC-TR-024: legacy program without context shows unknown rationale; new plan shows actual persisted preview; no fabricated evidence or dev-only CTA. U/I |
| TR-025 · D-01 downgrade; OR entitlements | retained · D-01 | Saved programs, accepted schedules/prescriptions, explanations, equipment data and history survive downgrade; entitlement controls future automation only. PROG/PROF. | AC-TR-025: revoke premium during program and reopen offline; same accepted workout is trainable and previous explanations viewable. U/I |

## AP-04 — Dated schedules, rest, manual control, and consistency

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-026 · LM F/S6 advancement; OR programmed rest; DP schedules | replaced · D-02 | ProgramSchedule/ScheduledDay have stable occurrence, original/current local date, timezone and cycle identity; DB-02/03, command; TODAY/PROG. | AC-TR-026: moving Cycle 2 Pull A across calendar week changes weekly placement but preserves prescription/cycle/progression identity. P/I |
| TR-027 · OR new capability 6; DP Today defect | retained · D-02 | Explicit RestDay kinds and Today resolver: workout/rest/unresolved/program-complete; rest is no empty workout. DB-03; TODAY. | AC-TR-027: planned rest offers optional recovery/history and never advances to first unfinished workout or creates session row. P/U |
| TR-028 · OR swap state machine on-time/early/late/different-day | retained · D-02 | Record intended vs performed occurrence and deviation; completed/in-progress work fixed; DB-03/04; WORK/TODAY. | AC-TR-028: Push performed on Pull date, or Legs one day early, fulfills chosen occurrence once and presents remaining Pull/rest choices. P/I/U |
| TR-029 · OR one-time swapping; D-02 | retained · D-02 | One-time move versus two-way swap explicit; revision-checked atomic command; DB-02/03/04; PROG. | AC-TR-029: swap two future days; both move or neither moves under conflict; original dates stay visible. I/U |
| TR-030 · OR recurring permanent order; D-02 | retained · D-02 | Recurring edits apply from chosen future boundary; no retrospective rewrite of completed/in-progress occurrences. DB-02/03/04; PROG. | AC-TR-030: change recurring weekday order midweek; preview includes future placement only and cycle identity survives. P/I/U |
| TR-031 · OR missed/skipped/multiple misses; D-02 | replaced · D-02 | Missed is unresolved choice, not debt; move/carry/skip/replace/leave unresolved are distinct recorded resolutions. DB-03/04; TODAY/PROG. | AC-TR-031: two missed workouts create no auto-compression; user skips one and carries another with explicit placement and provenance. P/I/U |
| TR-032 · OR rest↔workout conversions; D-02 | retained · D-02 | Explicit conversion previews recovery/overlap and original rest/work status; no silent volume addition. DB-03/04; PROG. | AC-TR-032: convert rest to workout and workout to rest; show added/removed work and remaining unplaced occurrences before commit. P/U |
| TR-033 · OR travel, reduced availability, deload changes | retained · D-02 | Temporary availability intervals and accepted pauses preserve fixed work and stop punitive backlog. DB-02/03/04; PROG. | AC-TR-033: three-day plan fits only two days; report unplaced work, offer skip/extend/reduce choice; preserve deload/rest constraints. P/U |
| TR-034 · D-02 time fixtures; OR offline/concurrency | retained · D-02/11 | Schedule revision, local date and timezone semantics; operation IDs prevent fulfillment replay. DB-02/03/04; TODAY/WORK. | AC-TR-034: DST transition, travel timezone, midnight sync and two-device edit retain intended local day; conflict requires refreshed preview. P/I |
| TR-035 · OR consistency variants; D-04 | replaced · D-04 | Weekly eligible prescribed-workout fulfillment ratio; rest recognized separately; DB-23 derived from DB-03/04 and finalized sessions; HIST/TODAY. | AC-TR-035: two-workout week plus five rest days displays two eligible sessions, no inflated 7/7 training score; variable frequencies compared transparently. P/U |
| TR-036 · D-04 pause, deload, streak | revised · D-04 | Optional weeks-on-plan; pause preserves without increment; deload/rest week not training-volume achievement. policy/revision/watermark; DB-23 cache optional. | AC-TR-036: accepted illness pause keeps streak unchanged, next eligible successful week increments; rest week clearly labeled. P/U |
| TR-037 · D-04 partial/offline/retrospective/hide | retained · D-04 | Partial classifications explicit; pending offline activity not failure; approved schedule revision visible; hide display free. DB-23; HIST/PROF. | AC-TR-037: offline partial session and retrospective correction update transparent numerator after sync; hidden consistency never blocks training. P/I/U |
| TR-038 · LM G notifications; LR S8; OR rest notifications | revised · D-02/13 | Reminders consume accepted schedule revision, local timezone, rest kind, saved time/quiet hours and OS permission. local adapter; OPS. | AC-TR-038: move workout, cross DST and enter quiet hours; cancel obsolete alert, deliver only eligible reminder, disclose denied/unsupported channel. P/U |

## AP-05 — Free progression, history, and explanations

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-039 · PF 0; LM F.6; LR S6; DP progression | revised · D-01/10 | Basic double progression default product policy; compare all accepted work sets and comparable exposures, not logged subset; sessions/sets/prescription; WORK. | AC-TR-039: reps within range hold; all required top-range sets permit candidate increase under declared success policy; omitted sets never qualify. P/V |
| TR-040 · PF 0 uniform/per-set -5%; LM F.6 | revised · D-01/10 | Miss/hold/reduce/request-data depends on completion, effort, phase and context; no universal -5% rule or blind per-set penalty. WORK. | AC-TR-040: single miss, repeated miss, incomplete session, technique reset and low adherence each produce explainable distinct result. P/V |
| TR-041 · OR progression exercise classes; LM F.6 | retained · D-01/10 | Primary/secondary compounds/accessories/isolation select conservative rep/load/set/ROM-execution options by role and data; free generic increment disclosed. WORK/GEN. | AC-TR-041: same logged result on primary and accessory uses declared policy; a large increment offers reps/manual attainable load and no invented precision. P/U/V |
| TR-042 · OR bodyweight, assistance, barbells, cables, machines, dumbbells | revised · D-01/10 | LoadQuantity preserves actual unit and per-hand/total/assistance semantics; sparse/uncomparable history requests calibration. sessions/sets; WORK. | AC-TR-042: bodyweight and assisted exercises never treat lower assistance as regression; kg/lb and per-hand logs retain exact actual input. P/I |
| TR-043 · DP future progression overwrites deload; LM F.8 | revised · D-05/10 | Progression reads phase/frozen baseline, applies once through revision-aware command; no read-triggered writes or compounding cycle factor. DB-01; WORK/PROG. | AC-TR-043: replay progression and load same program twice; no second increase; scheduled/accepted deload remains lighter. P/I |
| TR-044 · LM C.7/G History; DP mixed legacy fallback | revised · D-01/12 | Union legacy and new sessions with stable dedup; actual sets remain history truth; HIST. | AC-TR-044: one legacy-only and one new-format session both remain visible with distinct provenance; linked migration duplicate shown once. P/I/U |
| TR-045 · LM C.7 PR/exercise history; DP machine identity | revised · D-01/10 | PRs and estimated strength derive comparable exercise/equipment/execution data, display uncertainty; personal_records/sets; HIST/WORK. | AC-TR-045: different machine or ROM does not claim same-load PR; deleted/corrected source set recomputes derived record with audit. P/I |
| TR-046 · LM C.7/I; EE/EI J; UI U4 | revised · D-01/10 | Free descriptive history/workload/progression and applied decisions; premium interpretation separate. Insight source/policy/window/watermark; HIST/TRUST. | AC-TR-046: sparse/zero-PR/mixed-unit history shows honest unknowns and text summaries, not confident causal fatigue diagnosis. P/U/V |
| TR-047 · LM I fields/reuse; EE phase 1/7; LR evidence route | retained · D-10 | EvidenceRef: key, strength, claim scope, source links, caveats, rule type/version, confidence separate; shared registry. TRUST. | AC-TR-047: same rule in generator, Home, workout, FAQ, recovery and history resolves same explanation; invalid/missing key shows no false badge. P/U/V |
| TR-048 · LM C.6 recovery; EE/EI H/I; UI U5 | revised · D-01/10 | Warm-up/ramp sets/task mobility, optional cooldown/active recovery; comfort distinct from proven recovery; no mandatory stretching/cold immersion. TRUST/GEN. | AC-TR-048: lower/upper/full-body and rest-day views offer relevant modules, caveats and no cure/injury-prevention guarantee; experts review safety wording. U/V |
| TR-049 · LM L education; OR nutrition non-goal; R H/J/K | retained · D-10/13 | Lightweight protein/hydration/recovery education only; nutrition prescriptions and medical rehabilitation are excluded. TRUST. | AC-TR-049: FAQ distinguishes general education from personalized treatment and unverified physiology thresholds; no nutrition-coach gate added. U/V |

## AP-06 — Advanced generation and customization

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-050 · OR fourteen generation stages; DP pipeline; LM C.2 | revised · D-01/11 | Pure staged generation: constraints→frequency→split→volume→days→patterns→catalog selection→prescription→stability→progression/deload→time→rationale→preview→installation; GEN/PROG. | AC-TR-050: deterministic seed/input/policy yields same output and decision trace; preview never persists/activates a program. P/I |
| TR-051 · PF 2; IP 2A; EE phase 1/5 | revised · D-10/11 | Central versioned program defaults preserve rule/source provenance; avoid inline duplicate authority. GEN/TRUST. | AC-TR-051: each output rule resolves one policy version and evidence keys; unrecognized policy fails visibly instead of silent old default. P |
| TR-052 · PF 9; IP 2A/2B; LM C.1/2; OR experience | revised · D-01/10 | Experience changes skill, volume and progression pace conservatively; no universal advanced short-rest/high-volume multiplier. profile/context; PROF/GEN. | AC-TR-052: beginner vs advanced same goal have justified differences; experience change affects future preview, not old accepted program. P/U/V |
| TR-053 · LM split fixed mapping; EE/EI D; R E | revised · D-01/10 | Free standard frequency/split from real availability; premium alternatives/custom splits; feasibility and preference ahead of novelty. GEN. | AC-TR-053: 2–6 days, 30–90+ minutes fixtures compare full-body, upper/lower and hybrid with disclosed tradeoffs; infeasible target requests choice. P/U/V |
| TR-054 · LM C.2 weekly volume/focus; EE/EI D; R F | revised · D-01/10 | Weekly direct/indirect volume attribution, focus emphasis and nonfocus maintenance; advanced controls premium, baseline rationale free. context; GEN/TRUST. | AC-TR-054: glute/upper/lower emphasis visibly redistributes sets and order while preserving other patterns; indirect counting assumption shown. P/U/V |
| TR-055 · PF 1/IP 1B compound equipment shortcut; OR selection | replaced · D-10/11 | ExerciseSelectionContext uses movement, muscles, joint/stability/skill/fatigue, goal/phase, exposure, preferences/time and increments; equipment does not define compound identity. CAT/GEN. | AC-TR-055: machine compound and dumbbell isolation classified correctly; row in third position may remain priority compound; no blind position reduction. P/V |
| TR-056 · LM C.2 primary stability; EE/EI D; PF variation | retained · D-01/10 | Stable primary lifts/patterns; accessory variation cadence bounded; substitutions preserve progression context with explicit recalibration. GEN/CAT. | AC-TR-056: regenerating accessories does not randomly replace main lift; changed equipment/pain constraint explains unavoidable replacement and comparison break. P/U |
| TR-057 · OR exercise prescriptions/session time; LM C.2; EE/EI D | retained · D-01/10 | Order, sets, rep ranges, RPE or simpler reserve cue, rests, warm-up, optional work, time estimate and progression policy in snapshot. GEN/PROG. | AC-TR-057: 30-minute constrained preview shows removed optional work and total time assumptions while preserving appropriate main-lift rest. P/U/V |
| TR-058 · OR goals strength/powerlifting; R D/G | revised · D-10 | Strength specificity, longer rests, conservative load progression; advanced peaking/taper separate explicit option; GEN. | AC-TR-058: strength and powerlifting preview differ from hypertrophy in priority practice/rest/progression, not only label; power work never scheduled fatigued by default. P/V |
| TR-059 · OR goals hypertrophy/recomp; R D/F | revised · D-10 | Hypertrophy volume/effort allocation; recomp preserves strength and trims fatigue, no guaranteed fat-loss or calorie claim; GEN. | AC-TR-059: same user's hypertrophy vs recomp preview has declared recovery/volume tradeoff, no forced failure or deficit inferred without input. P/V |
| TR-060 · OR endurance/general fitness/beginner return; R D | revised · D-10 | Endurance reps/duration/density, general fitness simple balanced patterns, return from inconsistency conservative re-entry; GEN. | AC-TR-060: identical availability produces distinct goal outputs and explanations; density cannot remove necessary recovery or impose advanced complexity on novice. P/V |
| TR-061 · OR athletic goals; R D/E | revised · D-10 | Sport context, competition timing and fresh explosive work only with sufficient capability/context; incomplete specialty goals use conservative fallback. GEN. | AC-TR-061: sport session tomorrow changes fatigue allocation; missing sport constraints request information rather than inventing safe peaking plan. P/V |
| TR-062 · OR generation operations; DP distinguish operations; D-01 | revised · D-01/11 | Generate-new, detailed-regenerate, edit-future, manual swap, archive and install are separate scopes; advanced regeneration premium. DB-01/context; GEN/PROG. | AC-TR-062: premium user downgrades after preview then attempts regeneration; future paid operation gated, existing accepted plan and free manual edits remain usable. I/U |

## AP-07 — Equipment location and load precision

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-063 · OR equipment access; D-01 free profile | revised · D-01 | One active broad category profile free; accurate manual exercise/load capture never gated. user_profile; PROF/GEN/WORK. | AC-TR-063: free home-gym user filters broad equipment and records exact performed load absent from generic increments. U/I |
| TR-064 · D-01 new location requirement | retained · D-01/12 | Multiple named private equipment locations and active location selection premium; EQ-01 owner; PROF/GEN planned equipment capsule. | AC-TR-064: home and gym inventories remain distinct; owner B cannot infer location names; downgrade preserves data and one usable free active profile. S/U |
| TR-065 · D-01 per-machine inventory | retained · D-01/12 | EquipmentInstance stable identity plus versioned machine/stack/cable/plate configuration; EQ-02 owner; CAT/WORK plus NEW. | AC-TR-065: change pulley/seat/stack configuration; new configuration version leaves old workout interpretation intact. P/I |
| TR-066 · D-01 loading semantics | retained · D-01/12 | AvailableLoadSet selectable stack values, dumbbell pairs, plate combinations, increments, unit and per-hand/combined/assistance semantics; EQ-03 owner. | AC-TR-066: unattainable 17.5 prescription on 15/20 dumbbells produces rep/manual choice; assisted increment direction and paired plates computed correctly. P/V |
| TR-067 · D-01 exact generation/progression | retained · D-01/10 | Premium planner chooses available exercise/configuration and attainable next load with provenance; EQ-01/02/03 + snapshots; GEN/WORK. | AC-TR-067: exact location inventory used in generation and next progression; invalid/stale inventory prompts recalibration, not a fabricated selectable weight. P/U |
| TR-068 · D-01 cross-location recalibration | retained · D-01/10 | Auto substitution/recalibration is premium proposal; explicit acceptance; machine nominal loads not assumed comparable; EQ-02 + set snapshots. | AC-TR-068: 100 lb on machine A changes to 100 lb on B; no automatic equivalence, PR or success transfer; manual actual record remains free. P/I/U |
| TR-069 · D-01 private data/downgrade | retained · D-01/12 | Equipment ownership independent from automation access; export/delete and historic config interpretation free. EQ-01/02/03; PROF/OPS. | AC-TR-069: subscription expires or instance retired; all old loads/configs readable/exportable and new logging works without paid precision engine. I/U |

## AP-08 — Neutral readiness and explicit day-of proposals

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-070 · LM F.1/C.3; EE/EI E; LR S5 | revised · D-01/05 | ReadinessSnapshot one-tap plus optional sleep quality/hours, stress, soreness, motivation, pain/function, illness, life load and optional symptoms. readiness_checkins owner; READY. | AC-TR-070: free user captures only one-tap state; missing fields stay unknown; deeper fields optional and neutral data persists without premium interpretation. I/U |
| TR-071 · LM F score points/bands; DP 0–100 bands | replaced · D-05/10 | Contextual branch selection, not score-to-load multiplier; preserve legacy original scale/provenance. readiness_logs/checkins; READY. | AC-TR-071: same score with poor sleep vs concerning symptoms yields distinct path; legacy 1–10 value never relabeled new 0–100 policy. P/I/V |
| TR-072 · LM F.10 no check-in/moderate | retained · D-05 | Missing/ordinary readiness retains plan with clear missing state; no compulsory check-in. TODAY/WORK. | AC-TR-072: no check-in and ordinary day start planned prescription unchanged, without payment prompt or invented neutral score. P/U |
| TR-073 · LM F light-trim/simplify; OR low/poor sleep/stress | revised · D-05/10 | Low readiness explained proposal reduces optional volume then complexity then load as context permits; poor sleep alone not severe downgrade. DB-05/adaptation_events; READY. | AC-TR-073: one poor night with normal performance vs repeated poor sleep/high life load gives bounded alternatives, original remains until accept. P/U/V |
| TR-074 · OR soreness alone; R H | retained · D-05/10 | Local soreness/function distinguished from pain; reduce local demands or offer other region where appropriate; no whole-session cancellation from mild DOMS. READY. | AC-TR-074: mild symmetric soreness vs ROM-limiting soreness produces distinct explanation and explicit choices. P/U/V |
| TR-075 · LM F.2 pain safety; OR pain | revised · D-05/10 | Distinct safety pathway for worsening/localized/neurological or concerning function signs; no numeric threshold establishes safety; manual record remains possible without encouragement to push. READY/TRUST. | AC-TR-075: missing symptom detail asks contextual triage; red-flag wording recommends stopping/appropriate evaluation and never offers challenge; qualified wording review. P/U/V |
| TR-076 · LM F illness; OR illness | revised · D-05/10 | Illness/systemic signals use distinct safety path; optional appropriate recovery, no recovery score hides symptom concern. READY/TRUST. | AC-TR-076: fever/chest symptoms vs nonsystemic mild symptoms do not share same recommendation solely because score equal; review safety copy before rollout. P/U/V |
| TR-077 · LM F.5 fixed +2.5%/top-set; OR high readiness | revised · D-05/10 | High readiness leaves plan intact; one bounded opt-in challenge only when comparable success, no safety/deload conflict and attainable increment. READY/WORK. | AC-TR-077: high readiness on deload/pain/no-history suppresses challenge; eligible user declines and exact original sets/reps/load remain. P/U/V |
| TR-078 · DP Home no-op/rejection defect; LR S5 events | replaced · D-05/11 | Recommendation and decision lifecycle: proposed/accepted/modified/rejected/deferred/expired/applied; shared revision-aware ID; DB-05/adaptation_events command. READY. | AC-TR-078: reject on Home, reopen Workout/cross-device; rejected proposal stays rejected and no overlay applies; UI dismissal never treated as acceptance. I/U |
| TR-079 · D-05 fail/stale/late decisions | retained · D-05/11 | Decision acknowledgment only after durable result; expected prescription/input revisions; expiry and failure visibly distinct. DB-05; READY. | AC-TR-079: failed accept, offline queued decision, expired proposal and stale revision preserve plan; late response cannot overwrite live sets. I/U |
| TR-080 · OR conflicts/performance/health; LM F.10 | revised · D-05/06/10 | Subjective current pain/illness authoritative for safety, comparable performance informs progression, health display cannot override; provenance explicit. READY/HIST. | AC-TR-080: favorable watch metrics plus reported pain never increases workout; poor subjective day plus recent success yields contextual proposal without permanent regression. P/U/V |
| TR-081 · PF 3/IP 2C; LM C.5; EE/EI F | replaced · D-05/10 | Optional hidden symptom-first support; calendar only context, no blanket phase multiplier at generation/progression/display. cycle_symptom_logs, profile prefs; READY/GEN/WORK. | AC-TR-081: asymptomatic luteal/follicular/irregular-cycle user gets same baseline; symptomatic input considered once with explicit proposal. P/I/V |
| TR-082 · LM C.5 privacy; EE phase 4 | retained · D-01/05 | Separate opt-in, source attribution, masking and deletion for sensitive symptoms; disabling removes live use immediately, no silent historical deletion claim. owner; PROF/OPS/READY. | AC-TR-082: disable support after logging symptoms; hide controls and stop interpretation while honest retention/deletion workflow remains accessible. S/U |
| TR-083 · EE “moderate authority”/Advanced assertiveness; LM F automatic load reductions | rejected · D-05 | No display depth, aggressiveness setting or severity state silently authorizes changed prescription; READY. | AC-TR-083: Advanced aggressive user records severe low readiness; recommendation may differ, but workload stays frozen until explicit acceptance. P/U |

## AP-09 — Longitudinal coaching and deload

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-084 · LM F.7 exact 3 exposures/80%; OR plateau; DP trigger | revised · D-01/10 | Premium contextual plateau review over comparable normal exposures, completion, phase, effort and deliberate resets; no diagnosis from one miss. Insight/DB-05; HIST/WORK. | AC-TR-084: sparse history, substitution, low adherence, technique week and slow advanced progress do not falsely trigger confirmed plateau; policy boundaries recorded. P/V |
| TR-085 · LM F.8 10–14 days/two signals; EE/EI G | revised · D-05/10 | Reactive deload proposal from converging fatigue/performance/context; all exact windows/factors are provisional versioned policy. deload_recommendations/DB-05; READY/HIST. | AC-TR-085: isolated bad day holds; persistent aligned trends offer explained bounded proposal with confidence/caveats; no automatic cancellation. P/U/V |
| TR-086 · PF/IP automatic fourth-week deload; LM reactive default | replaced · D-05/10 | Remove compulsory cadence; explicit scheduled deload/taper option preserved, manual recovery always free. GEN/WORK/PROG. | AC-TR-086: normal week four never auto-deloads merely by index; user-selected scheduled deload survives high readiness and progression. P/U |
| TR-087 · LR S6 lifecycle; LM G deload sheet | retained · D-05/10 | Proposed→accept/modify/defer/reject→active→complete→reassess; before/after snapshot and why preserved, no indefinite hidden decline. deload_recommendations/adaptation_events; READY/HIST. | AC-TR-087: accept/defer/reject/reopen, then complete deload; history records outcome and reassessment without restoring unsafe old progression automatically. I/P/U |
| TR-088 · EE/EI J analytics; LM C.7 | revised · D-01/10 | Premium readiness/performance/workload/focus trends enrich free source data; uncertainty distinct from evidence strength. Insight/DB-05; HIST/TRUST. | AC-TR-088: revoke premium after applied coaching; prior insight/explanation stays visible, future premium interpretation stops, free history unaffected. I/U |
| TR-089 · LM C.6 recovery alternatives; D-05 hierarchy | retained · D-05/10 | Coaching alternatives address optional volume, complexity, load, reps/RPE/rest/order and regional substitutions explicitly; never additive duplicate reductions. READY/GEN. | AC-TR-089: low-readiness already-reduced deload gets one contextual proposal with baseline/delta, not stacked percentage reductions. P/V |

## AP-10 — Automated schedule recovery

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-090 · OR capability 7 / recovery examples; DP bounded search | retained · D-01/02/10 | ScheduleRecoveryProposal premium bounded search over fixed work, original identity, overlap, primary movements, workload, availability, rest, priorities and readiness. DB-05/06; PROG/TODAY plus NEW. | AC-TR-090: two misses and three-day plan compressed into two days returns explainable feasible options or explicit unplaced work; no debt compression. P/U/V |
| TR-091 · OR readiness invalidates catch-up; D-02 | retained · D-02/05 | Explicit accept/modify/reject; proposal binds schedule/input revision and expires when constraints change. DB-02/03/04/05/06 command. | AC-TR-091: readiness/pause or another-device edit changes after proposal; reject stale accept and regenerate preview, preserve fixed work. P/I |
| TR-092 · OR recovery spacing; D-10 | revised · D-02/10 | Spacing/conflict flags are provisional context-sensitive heuristics, not a universal safety timer or guaranteed safe schedule. NEW/PROG. | AC-TR-092: local muscle overlap, heavy hinge proximity, deload and travel constraints produce reasoned conflict flags with alternatives and limits. P/V |
| TR-093 · D-01 downgrade/offline | retained · D-01/02 | Accepted automated schedule becomes user-owned ordinary schedule; failure/offline/free fallback manual control. DB-02/03/04; PROG. | AC-TR-093: cancel subscription after accept, disconnect service; schedule remains editable/trainable offline and original proposal explanation retained. I/U |

## AP-11 — Unlisted publishing and pinned private installation

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-094 · OR capability 1; DP publish lifecycle | revised · D-03/09A | Private draft→validated preview→immutable sanitized unlisted version; template identity/hash/version/compatibility; DB-07/08/10 command; PROG/GEN + NEW. | AC-TR-094: publish replay yields one immutable version; mutate author draft afterwards and recipient version/hash stays unchanged. I/S |
| TR-095 · OR private/public separation; D-03 allow-list | retained · D-03/09 | Serializer includes reusable exercise/relative prescription/rest/policy/rationale/instructions/attribution; excludes loads/history/readiness/health/symptoms/private notes/context. DB-08 command. | AC-TR-095: adversarial nested private values in context/notes are absent from payload, logs, preview, link metadata and cache. S/I |
| TR-096 · OR link/code/web preview; D-03 | retained · D-03/09A | HTTPS deep/app links and opaque codes; disclosed unlisted link access; version/author/goals/equipment/time/rest/compatibility preview; DB-10 resolver. AUTH/NEW. | AC-TR-096: installed app and no-app browser show same exact version; invalid/expired/revoked/unpublished/quarantined/incompatible/missing versions have distinct safe errors. U/S |
| TR-097 · OR clone/install; D-03 | revised · D-03/11 | Private pinned installation selects dates and calibrates own starting loads; atomic installer; DB-09 + programs/DB-01/02/03. PROG/NEW. | AC-TR-097: two recipients install same version with private schedules/loads; failed/replayed installation creates no partial or duplicate program. I/S |
| TR-098 · OR update alternatives; DP separate-only install | revised · D-03 | Preview newer-version diff then separate installation OR explicit replacement of future planning; completed/history remain bound to old instance. DB-01/08/09 command. | AC-TR-098: replacement preview accepted after prior sessions; old history unchanged and no automatic installed update occurs when author republishes. I/U |
| TR-099 · OR selective version merging | deferred · D-03 | Selective merge excluded until stable slot identity, customization ownership and conflict semantics validated; no initial merge endpoint. DB-01/08/09. | AC-TR-099: first release offers only separate install/explicit future replacement; merge control absent and stored custom edits never silently overwritten. U |
| TR-100 · D-03 unpublish/offline/takedown; OR deletion | retained · D-03/09C | Unpublish stops new resolution/install; cached private installation trainable where lawful/safe; quarantine distribution separately. DB-08/09/10 command. | AC-TR-100: unpublish/delete author stops new installs, existing copy works offline without exposing deleted identity; quarantine notice preserves private workout history. I/S/U |
| TR-101 · DP unresolved rights; D-09B | replaced · D-09B | No platform ownership claim over programs/functional methods; limited service permission; expressive rights and final terms require legal review. publish preview/NEW. | AC-TR-101: publication and withdrawal copy matches limited permission and personal-data exclusions; qualified reviewer approves final terms before release. O/U |
| TR-102 · D-09A abusive unlisted content | retained · D-09A/09C | Unlisted distribution still needs abuse contact/quarantine response and audit; broad public queues separately gated. DB-19/20 as needed; NEW. | AC-TR-102: leaked code and harmful shared artifact can be reported/quarantined with logged reason and support path without disabling private core. S/O |

## AP-12 — Optional health display

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-103 · PF 5/IP 4A–4C; OR capability 4 | replaced · D-06 | Real platform adapter displays attributed steps/distance/workout summaries only; OS permission, display consent and flag separate; local storage first. PROF/OPS + NEW. | AC-TR-103: iOS permission/device absence/partial grant and Android manual path all work; unsupported toggle never claims sync. U/O |
| TR-104 · DP local/cloud unresolved; D-06 | replaced · D-06 | Separate explicit cloud storage consent types/purpose/account/devices/retention/deletion; DB-21/22 unused without it. NEW. | AC-TR-104: enabling OS read/display emits no cloud health writes; cloud opt-in starts only disclosed sync, revocation stops future writes. S/I/U |
| TR-105 · OR stale/dedup/conflicting data; D-06 | retained · D-06 | HealthActivitySnapshot source/window/unit/freshness/external IDs; overlapping phone/watch dedup, ambiguous match asks user; no inferred strength sets. local/optional DB-22. | AC-TR-105: phone/watch duplicate and imported in-app workout are not counted twice; stale/revoked/missing is labeled unknown, not zero or progression success. P/I/U |
| TR-106 · PF 5/IP 4D HealthKit workout write | deferred · D-06/13 | Write-back/export to platform health is outside initial display-only release; later separately scoped consent and dedup review. NEW. | AC-TR-106: first release performs no automatic health workout writes after completion; later adapter requires loop-prevention and revoked-permission tests. S/U |
| TR-107 · PF 5/IP 4E bodyweight/RHR seeding; EE/EI K wearables | deferred · D-06/10 | Bodyweight-based load seeding, HRV/readiness interpretation, menstrual import and adaptive health inference need separate policy/consent approval. NEW. | AC-TR-107: imported metrics never change current generation/readiness/progression/schedule; user symptoms retain authority. P/S |
| TR-108 · D-06 disconnect/delete/manual parity | retained · D-01/06 | Disconnect stops reads and any interpretation, clear deletion of cached/synced summaries within platform limits; manual training independent. local/DB-21/22; OPS. | AC-TR-108: disconnect offline and delete cloud data later; show pending/failed deletion truthfully while normal logging remains usable. I/U/O |

## AP-13 — Themes and trusted commerce

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-109 · PF 6/7; IP 3A/3B; LM C.8; UI U1/U6 | retained · D-08 | Free accessible light/dark/system and retained local palettes; local preference; THEME. | AC-TR-109: theme/palette survives restart, respects system/override, readable error/disabled/success states and dynamic text. U |
| TR-110 · OR marketplace; D-08 | revised · D-08 | First-party declarative tokens/approved assets only, validated version/hash/compatibility; DB-24/25 trusted publisher; THEME + NEW. | AC-TR-110: executable, incomplete, incompatible, corrupt or contrast-failing package rejected before Apply; accessible default remains. P/S/U |
| TR-111 · D-08 preview/purchase/apply | retained · D-08 | Preview≠ownership≠download≠validated≠applied; explicit Apply and interrupted workout continuity. DB-24/25/27; THEME/NEW. | AC-TR-111: cancel preview leaves saved theme; failed download/apply preserves old compatible theme and ongoing workout draft. I/U |
| TR-112 · D-09E purchase authority; OR restoration | retained · D-08/09E | Trusted provider events, unique idempotency and backend grants; entitlements distinct from flags/depth/consent. DB-26/27 command. NEW. | AC-TR-112: forged metadata and replayed provider event cannot grant access; renewal/refund/revocation reconcile once with audit. S/I |
| TR-113 · D-08 offline/downgrade; D-09E support | retained · D-08/09E | Coaching downgrade preserves purchased cosmetics; cached compatible owned theme offline; restore/cross-device/support queue. DB-26/27; THEME/OPS. | AC-TR-113: restore same account across devices, refund offline then reconcile, or failed update yields calm default and support trace without touching training data. I/U/O |
| TR-114 · OR third-party marketplace | deferred · D-08 | Third-party authoring/submissions/moderation/payouts and creator commerce require separate approved marketplace plan; no current seller schema. NEW. | AC-TR-114: initial catalog exposes first-party verified packages only; no third-party upload/code execution/payout route. S/U |
| TR-115 · D-08 native billing assumption; OR store risks | retained · D-08/09E | Storefront/regional policy review and native billing/platform builds before sale; no final policy claim from historical plan. NEW/OPS. | AC-TR-115: release checklist records reviewed rules, purchase/restore/refund sandbox evidence and named exception owner. O |

## AP-14 — Public discovery and eligible reviews

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-116 · LM out-of-scope community; OR discovery | deferred · D-09A/13 | Public listing/discovery distinct from unlisted artifact; ops gate plus safe public serializer; DB-07/08/11/14. NEW. | AC-TR-116: unlisted release contains no public search listing; later discovery outage/kill switch leaves private installs trainable. S/U/O |
| TR-117 · OR ratings eligibility alternatives; DP heuristic; D-07 | revised · D-07/10 | Install + two completed prescribed sessions on separate calendar days + seven elapsed days; policy-versioned private evidence. DB-09/15; trusted command. | AC-TR-117: test day 6 vs day 7, same-day sessions, partials, duplicate completion, deleted/edited evidence and author exclusion; no eligibility from installs alone. P/I/S |
| TR-118 · OR one review/edit/delete/version; D-07 | retained · D-07 | One active review per user/program identity; exact reviewed version, edit/delete; no mandatory rating to install/train. DB-15 command. | AC-TR-118: concurrent duplicate requests yield one review; review version retained after update; deletion allowed; offline edits stay drafts until validated. I/U |
| TR-119 · D-07 aggregates and verified-use meaning | retained · D-07/09 | Review content/moderation/eligibility separated; server aggregates visible eligible reviews with counts/distribution; DB-15/16 server-derived. | AC-TR-119: moderated/deleted review recomputes aggregate once; label says eligibility met, not expertise/results/endorsement. I/S/U |
| TR-120 · OR manipulation/moderation; D-09D | retained · D-07/09D | Abuse/replay checks, reports, queue, severity, quarantine, audit, appeals and accountable owner before release; DB-19/20 command. | AC-TR-120: duplicate-account/replayed request and abusive review enter appropriate controls; urgent removal and appeal rehearsal completed. S/O |
| TR-121 · D-09D capacity gate | retained · D-09A/09D | Feature stays disabled until actual staffed operations and response targets exist; capacity exhaustion disables affected public capability. NEW/OPS. | AC-TR-121: simulate queue overload and owner absence; rollout blocked/feature disabled while core remains available. O |

## AP-15 — Separate social capabilities

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-122 · OR public profiles/follows | deferred · D-09A/13 | Opt-in public profile distinct from private profile; follow/block relationship with privacy audience; DB-11/12 owner + policy commands. NEW/PROF. | AC-TR-122: default profile private; blocked user cannot use follow/feed traversal to see protected activity; core login/profile unaffected. S/U |
| TR-123 · OR completed activity/milestone/PR/streak sharing | deferred · D-09A/04 | Separate sanitized activity publication with granular audience/preview; no automatic workout-health-symptom export; DB-13. NEW/HIST. | AC-TR-123: share PR preview includes only allowed fields; private source corrections/deletion revoke projected activity without altering original training. S/I/U |
| TR-124 · OR saves/reactions/comments | deferred · D-09A/13 | Saves private by default; reactions/comments independently flag-gated with owner edit/delete, target validation, rate limits and reports; DB-14/17/18/19. NEW. | AC-TR-124: hidden/deleted/blocked target rejects new interactions; repeated taps deduplicate; comments never required for install/train. S/I |
| TR-125 · D-09A/D social operations; OR feed | deferred · D-09A/09D | Feeds, follows, comments, reactions have separate operational capacity checks; private source never directly queried for public feed. DB-12/13/17/18/20. NEW. | AC-TR-125: disable all social or moderation service; free workouts, history and pinned installs continue; staff can audit/quarantine and process appeal. S/O |
| TR-126 · OR consistency alternatives; D-04 | rejected · D-04 | Daily-workout/check-in streaks as primary consistency, medical-exemption rewards, shame copy and rest leaderboards excluded. HIST/NEW. | AC-TR-126: public/social release never exposes medical pause reasons or rewards training through rest; user may hide consistency. S/U |

## AP-16 — Account, privacy, support, shared UX, and release

This slice owns operational completion; its requirements are also entry/exit gates of every affected earlier slice. Security, accessibility and offline behavior do not wait until AP-16.

| Requirement / legacy locator | Disposition and decision | Behavior / contract; database authority; code | Acceptance scenario and expected evidence |
|---|---|---|---|
| TR-127 · LM G Landing/Auth; DP baseline | retained · D-01/11 | Sign-in/join/sign-out/session expiry and interrupted onboarding; auth-owned session boundaries; AUTH/PROF. | AC-TR-127: expired session, offline cached account and interrupted signup recover without another user's data or lost local draft. I/U/S |
| TR-128 · LM B/G forgot password; LR S8 | retained · D-11/13 | Real reset request, secure callback/deep link, expiry/replay and honest errors; auth service; AUTH. | AC-TR-128: request→email callback→new password works, invalid/expired/reused token fails safely, no false success from form-only stub. I/U |
| TR-129 · LM G privacy/export; LR S8; DP metadata-only requests | replaced · D-01/09C/11 | AccountRequest queued/in-progress/fulfilled/failed; backend actual export/delete, authenticated owner status; DB-28 command; OPS. | AC-TR-129: request receipt never claims fulfilled; exported private data/equipment/history complete, failure retry traceable, deletion revokes account and caches under policy. I/S/O |
| TR-130 · D-09C minimum provenance | retained · D-09C | Delete public/private identifiers, stop new distribution; minimal anonymized lawful installation/integrity/abuse provenance and reviewed retention; DB-07…20/28. NEW/OPS. | AC-TR-130: deleted author cannot be reidentified through installed metadata, URLs/avatars or audit exposure; privacy-safe integrity maintained, exceptions logged/reviewed. S/O |
| TR-131 · LM G support; D-09D/E | replaced · D-09D/09E/11 | Contact/bug/feature requests routed to actual internal queue and named owner; purchase/public/privacy exception workflows linked. DB-28 command; OPS. | AC-TR-131: support request reaches staffed queue with visible status/retry; no timestamp-only action claims contact completed. I/U/O |
| TR-132 · PF 11/IP 3C; DP avatar finding | revised · D-09/12 | Avatar upload/resize/permission/cancel/fallback; owner storage writes and explicit public-delivery disclosure; user_profile/storage; PROF. | AC-TR-132: permission denial preserves avatar; B cannot overwrite A object; removing account/photo handles stale public URL/cache under reviewed policy. S/U |
| TR-133 · LM C.8/H; UI U1 | retained · D-11/13 | Shared card/spacing/type/action/settings/trust primitives extracted with vertical use, preserved brand and one-hand reach; THEME/TODAY/PROG. | AC-TR-133: touched screen uses shared semantic tokens and reachable CTA, meaningful empty/loading/error/disabled/pressed states; no architecture-only release dependency. U |
| TR-134 · UI U2/U3/U4/U5/U6; LM K accessibility | retained · D-13 | VoiceOver/TalkBack labels, focus, dynamic text, contrast, non-color charts, reduced motion/feedback and all themes across affected flows. local UI. | AC-TR-134: device walkthrough each released flow including failure states succeeds using assistive technology and large text. U |
| TR-135 · LR S2 flags/keys; EE phase 8 | revised · D-01/06/08/11 | Deterministic feature flags separate entitlement/consent/depth; capability-safe fallback, independent optional kill switches. NEW shared gate; PROF/THEME. | AC-TR-135: flags off/entitlement unknown/consent off combination never exposes gated operation or hides owned records; resolver has pure tests. P/I/U |
| TR-136 · LM H services/kernel; DP capsule boundaries | revised · D-11 | Small kernel IDs/date/unit/revision/operation/provenance/error; domain owns contracts; pure engines exclude React/Supabase/billing/global RNG; compatibility facade over current hook. PROG/GEN/WORK. | AC-TR-136: import/dependency audit proves optional capsules enrich exported snapshots, never own core route/data representation or perform writes on reads. P/DOC |
| TR-137 · LM K tests; LR growth plan; DP no tests | retained · D-10/11/13 | Add smallest meaningful deterministic/command tests with implementation; static lint separate from behavior/integration/device. package/tooling. | AC-TR-137: each closed slice has relevant fixture/command/device evidence and declared untested environments; no “lint passes” substituted for persistence proof. DOC/P/I |
| TR-138 · LM L production identity; LR S8 | retained · D-13 | Production Expo/iOS/Android identifiers, link association, permission purpose strings, signed build/release flags and supported device matrix. OPS/AUTH. | AC-TR-138: signed builds open auth/publish links correctly, no temp identity/dev helpers, permission denial and upgrade/downgrade paths verified. U/O |
| TR-139 · EE rollback/monitoring; OR risk matrix; D-13 | retained · D-11/12/13 | Redacted operation traces, failure/retry metrics, source watermark, staged flags and non-destructive compatibility rollback; sensitive fields excluded from telemetry. SCHEMA/OPS. | AC-TR-139: injected sync/command failure is observable with operation ID but no private health/notes; disable behavior without dropping schema/history. I/S/O |
| TR-140 · LM out-of-scope ML/marketplace/nutrition | deferred · D-10/11/13 | Black-box ML, coach marketplace, personalized nutrition and Android health parity are separate future approval scope; Expo/Supabase rewrite rejected. NEW. | AC-TR-140: no current AP release depends on these features, opaque diagnosis, mandatory wearable or new backend platform. DOC |
| TR-141 · CP all workflow; D-14; LR historical authority repair | replaced · D-14 | Neutral canonical set/archive/inventory/link repair; preserve evidence/source bytes and unrelated work; no app/schema implementation here. | AC-TR-141: archive mapping accounts for moved authorities, active links resolve, original request/packet unchanged and diff contains only authorized documentation. DOC |
| TR-142 · LM J sequential dependency chain; EE milestones; UI critical path | replaced · D-11/13 | Slice dependencies are actual contracts, not old stage sequence; durability/schedules/free progression before optional engines; UI/trust delivered with behavior. register. | AC-TR-142: register distinguishes prerequisites, sequence preference and optional inputs; free training demonstrably operates with coaching/social/health/commerce disabled. DOC/P/U |

## Database design inventory reverse crosswalk

The database plan owns the exact schema proposal and constraints. The following maps each of the packet's 28 proposed tables individually. “Retained” preserves the requirement in the indicated slice, not approval to migrate a physical table. Consolidation candidates must be resolved before a slice's schema is approved.

| DB ID / proposed table | Disposition / decision | Slice; requirement and acceptance scenarios | Authority and design resolution |
|---|---|---|---|
| DB-01 program_revisions | retained · D-03/11/12 | AP-03; TR-016/017/021/043/062/098 | Private owner reads; atomic revision commands; verify compatibility with existing programs root. |
| DB-02 program_schedules | retained · D-02/12 | AP-04; TR-026/029/030/033/034 | Owner reads, revision-checked scheduling commands. |
| DB-03 scheduled_days | retained · D-02/12 | AP-04; TR-026…038 | Original/current placement, rest kinds and unique fulfillment under command authority. |
| DB-04 schedule_deviations | retained · D-02/12 | AP-04; TR-028…034/037 | Append change provenance linked to owner occurrence and revision. |
| DB-05 recommendations | revised · D-05/11/12 | AP-08/09; TR-078/079/084/085/087 | Consolidate lifecycle with existing adaptation_events/deload_recommendations; no duplicate decision authorities. |
| DB-06 schedule_recovery_proposals | revised · D-02/12 | AP-10; TR-090…093 | Recommendation subtype/detail snapshot consolidation candidate; atomic schedule apply. |
| DB-07 program_templates | retained · D-03/12 | AP-11; TR-094/095/101 | Reusable identity separate from private instance; publication command. |
| DB-08 published_program_versions | retained · D-03/12 | AP-11; TR-094…101 | Immutable sanitized allow-list artifact; trusted validation/hash/visibility. |
| DB-09 program_installations | retained · D-03/12 | AP-11; TR-097/098/100/117 | Private owner install provenance and pinned exact version; atomic installer. |
| DB-10 program_share_links | retained · D-03/09A | AP-11; TR-096/100/102 | Opaque resolver, expiry/revocation, rate limits and no raw private reads. |
| DB-11 public_profiles | deferred · D-09A/13 | AP-14/15; TR-116/122/130 | Separate opt-in public projection; no automatic publication of user_profile. |
| DB-12 social_relationships | deferred · D-09A/13 | AP-15; TR-122/125 | Follows/blocks under relational visibility constraints and public-ops gate. |
| DB-13 activity_items | deferred · D-09A/13 | AP-15; TR-123/125/130 | Explicit sanitized activity publication with audience; source history remains private. |
| DB-14 program_saves | deferred · D-09A/13 | AP-14/15; TR-116/124 | Owner-private saved discovery references, not installed program authority. |
| DB-15 program_reviews | deferred · D-07/09A | AP-14; TR-117…120 | Verified eligibility, one active review, reviewed-version context and moderation. |
| DB-16 program_rating_aggregates | revised · D-07/12 | AP-14 after ops gate; TR-119 | Server-derived cache/view candidate; visible eligible reviews own source truth. |
| DB-17 activity_reactions | deferred · D-09A/13 | AP-15; TR-124/125 | Unique/replay-safe owner reaction, target visibility and moderation gates. |
| DB-18 content_comments | deferred · D-09A/13 | AP-15; TR-124/125 | Moderated owner content, edit/delete and valid permitted target. |
| DB-19 content_reports | retained with phased scope · D-09A/D | AP-11 limited abuse; AP-14/15 full; TR-102/120/124 | Private reporter access; staff queues; do not publicly expose reports or reporter identity. |
| DB-20 moderation_actions | retained with phased scope · D-09C/D | AP-11/14/15; TR-102/120/121/125/130 | Staff-only audited privileged commands; limited early quarantine and later full operations. |
| DB-21 health_consents | revised · D-06/12 | AP-12; TR-103/104/108 | Local consent first; server record only needed for optional independently consented cloud processing. |
| DB-22 health_activity_snapshots | revised · D-06/12 | AP-12; TR-104/105/108 | Device-local default; optional sensitive owner cloud summaries; no coaching authority. |
| DB-23 consistency_periods | revised · D-04/12 | AP-04; TR-035…037 | Derive locally from schedule/fulfillment/policy/watermark; optional rebuildable cache. |
| DB-24 theme_catalog | retained · D-08/12 | AP-13; TR-110/111/114 | Trusted first-party catalog; no creator submission authority. |
| DB-25 theme_versions | retained · D-08/12 | AP-13; TR-110/111/113 | Immutable validated semantic token/asset package, compatibility/hash. |
| DB-26 purchase_events | retained · D-09E/12 | AP-06/07 paid access, AP-13 commerce; TR-062/112/113/115 | Backend-verified unique provider events; client never grants entitlement. |
| DB-27 entitlements | retained · D-01/08/09E | AP-06/07/13; TR-025/062/069/112/113/135 | Trusted grants per capability/ownership, independent subscription/cosmetic scope. |
| DB-28 account_requests | retained · D-09C/D/E/11 | AP-16 plus earlier privacy/support gates; TR-129/130/131 | Owner request/status, privileged fulfillment and auditable retention. |
| EQ-01 equipment locations | retained new design · D-01/12 | AP-07; TR-063/064/069 | Private broad/free vs detailed/multiple paid automation contract; exact table design owned by DB plan. |
| EQ-02 equipment instances/config versions | retained new design · D-01/12 | AP-07; TR-065/068/069 | Owner configuration identity; completed-set snapshot retains comparison context. |
| EQ-03 selectable load sets/increments | retained new design · D-01/12 | AP-07; TR-066/067/069 | Versioned exact attainable values/units/loading semantics; no universal machine equivalence. |

## Legacy source and delivery identifiers reverse index

These identifiers are quoted historical locators only. No old phase name is a current task identifier. Every acceptance scenario is found using the corresponding AC-TR number above.

| Historical source locator | Explicit disposition and new requirement destinations |
|---|---|
| PF 0; IP progression baseline | revised → TR-039…043. Preserves top-rep intent; replaces incomplete-set and blanket percentage rules. |
| PF 1; IP 1B | replaced → TR-055. Barbell/dumbbell is not sufficient compound classification. |
| PF 2; IP 2A | revised → TR-051/052. Central policy remains, exact experience multipliers not scientific constants. |
| PF 3; IP 2C | replaced → TR-081/082/107. Symptom-first opt-in replaces phase multipliers; health menstrual import deferred. |
| PF 4; IP 1C | revised → TR-021/026. Week-only compatibility kept; exact resume requires revision/occurrences. |
| PF 5; IP 4A/4B/4C | replaced → TR-103/104/105/108. Real display-only adapter and separate consent. |
| IP 4D | deferred → TR-106. Automatic health write-back outside initial display release. |
| IP 4E | deferred → TR-107. Health bodyweight-driven load seeding not initial scope. |
| PF 6/7; IP 3A/3B | retained → TR-109; new paid precision → TR-110…115. Existing free appearance not converted to subscription. |
| PF 8A/B; IP 1A | revised → TR-002/006. Stable normalized full catalog and image coverage; no unreviewed client reseed/write authority. |
| PF 8C | revised → TR-012/055/056. Descriptions/images useful; load/slot scope must survive substitution. |
| PF 9; IP 2B | revised → TR-018/052. Editable experience, conservative response; advanced does not universally mean short rests. |
| PF 10; IP 3D | retained/deferred split → TR-014/015. Current haptics vs not-yet-existing rest timer explicit. |
| PF 11; IP 3C | revised → TR-132. Preserve photo functionality; public delivery/privacy verified instead of assumed private. |
| IP 2D | retained → TR-022. Optional naming/back behavior preserved. |
| IP Git & PR Workflow / branches / migrations checklist | replaced → TR-001/007/141/142 and current AGENTS/approved prompt. Old per-phase branches and approval-message workflow do not override current authorized documentation commits. |
| LM A principles/boundaries | revised → TR-019/025/047/081/116/122/140. Free core expands, optional public work later; retain agency/transparency. |
| LM B current-state audit and L completion labels | replaced as authority → implementation status; defect requirements TR-002/008/012/013/017/027/039/043/044/078/081/128/129/131/138. Historical evidence not erased. |
| LM C.1; EE/EI B/C | revised → TR-018/019/020/025/052/063/082. Essential onboarding and presentation independent of payment. |
| LM C.2; EE/EI D and phase 5 | revised → TR-006/022/024/050…062/066/067. Free standard generation; paid deeper customization and precision. |
| LM C.3/F.1…5/F.9…10; EE/EI E phase 3 | revised/replaced → TR-070…080/083/089. Proposed severity tables cannot bypass acceptance. |
| LM C.4/F.6…8; EE/EI G phase 6 | revised → TR-039…043/084…087. Full-prescription accounting, phase guards and provisional thresholds. |
| LM C.5; EE/EI F phase 4 | replaced → TR-081/082. Symptom-first, not inferred calendar reductions. |
| LM C.6; EE/EI H | revised → TR-047…049. Warm-up/recovery education with caveats, optional cooldown and no rehab claims. |
| LM C.7; EE/EI J | revised → TR-035…037/044…047/084/088. Free raw/descriptive vs premium interpretation, no fake precision. |
| LM C.8/D/G/H; EE/EI L; UI screen scope | retained/revised → TR-013/018/019/023/024/038/046…048/078/109/127…138. Route-specific outcomes preserved under vertical capsules. |
| LM E; EE schema 1–8 | revised → TR-003…007/016/017/020/043/070/078/081/085; DB plan. Existing tables remain baseline; new version/schedule authority explicit. |
| LM I; EE/EI I phase 1/7 | retained → TR-047/048/051/137. Stable evidence keys/rule metadata and shared consumers; initial foundation evidence stays historical delivered work. |
| LM J / LR historical S0 | retained foundation evidence → TR-047/051, implementation status and DEV-LOG. No unnecessary recreation. |
| LR historical S1.1 | revised → TR-001/005/007; AP-01. |
| LR historical S1.2 | revised → TR-002/003; AP-01. Existing enabled RLS does not prove effective grant safety. |
| LR historical S1.3 | retained → TR-004/017/020; AP-01/03. Historical authenticated tests do not close missing mobile/missing-schema scenarios. |
| LR historical S1.4 | replaced → TR-141; D-14. Neutral authority and source preservation replace old naming rule. |
| LR historical S2 | revised → TR-019/109/133…137; distributed AP gates. Nine historical flags become capsule gates, not a monolithic prerequisite stage. |
| LR historical S3 | revised → TR-018…020/052/063/070/082; AP-03/06/07/08. |
| LR historical S4 | revised → TR-006/024/050…062/067; AP-01/03/06/07. |
| LR historical S5 | revised → TR-070…083/089; AP-08. |
| LR historical S6 | revised → TR-008…017/021/026…034/039…045/084…087; AP-02/03/04/05/09. Durable work no longer waits for coaching. |
| LR historical S7 | revised → TR-035…037/044…049/084/088; AP-04/05/09. |
| LR historical S8 | revised → TR-038/103…115/127…140; continuous gates and optional AP-12/13. |
| LR decision register | retained/revised → TR-005/019/020/021/023/047/086/103/135/141. Evidence route keyed, free manual path, additive FK and honest archive semantics. |
| EE/EI phases 1/2/3/4/5/6/7/8; milestones 1–4; task graph | replaced sequence → TR-142; semantics preserved by corresponding rows above. No dependency from core training to optional coaching/health. |
| EE/EI K integrations | revised/deferred → TR-103…108. Display/local consent now explicit; wearable coaching enrichment deferred. |
| EE/EI M/N risk and rollout | revised → TR-075/076/082/121/129…142. Early per-slice gates replace last-stage hardening. |
| UI U1 | retained → TR-109/133/134. Shared semantic mobile design system with vertical use. |
| UI U2 / UI-M1 | revised → TR-018/019/027/070/078/133/134. Better Today/readiness; no first release dependency on full coaching. |
| UI U3 / UI-M2 | retained → TR-024/050/053/054/057/062/134. Preview-driven planner. |
| UI U4 / UI-M3 | retained → TR-044…047/084/088/134. Sparse/legacy history remains useful. |
| UI U5 | retained → TR-047…049/134. Keyed evidence route; exact implementation file remains planned. |
| UI U6 / UI-M4 | revised → TR-109/133…139. Theme/accessibility/error/offline checks in each slice rather than final polish only. |
| OR capabilities 1–8 | retained/revised/deferred individually → TR-094…126 plus TR-026…038/090…093/103…115. |
| OR generation/readiness/selection/progression/schedule/goal behavior | retained/revised individually → TR-008…013/026…093. Source concerns map to concrete counterexample scenarios, not blanket coverage. |
| OR contracts/dependencies/risks/database/entitlements/research | retained → contract/table crosswalk; TR-001…007/016/019/025/047/069/104/112/129/135…140; master architecture and research matrices. |
| OR nine journeys | retained → new user TR-018/017; free TR-025/027/039; premium TR-062/067/078/088; author TR-094/095; recipient TR-096…100; schedule change TR-029/030; missed recovery TR-031/090; health TR-103…108; downgrade TR-025/069/088/093/113. |
| CP required workflow and final handoff | retained → TR-141/142; inventory/master/register/status/database plan own their respective outputs. Documentation verification does not claim application completion. |

## Decision reverse index and unresolved verification

| Approved decision | Requirement destinations |
|---|---|
| D-01 free/premium | TR-008…025, 039…049, 050…069, 070, 088, 093, 112, 135 |
| D-02 dated hybrid schedule | TR-010/011/013/021/026…038/090…093 |
| D-03 immutable sharing/install/update | TR-016/094…102 |
| D-04 consistency | TR-035…037/126 |
| D-05 explicit readiness | TR-010/043/070…089/091 |
| D-06 health local/display/consent | TR-080/103…108 |
| D-07 review eligibility | TR-117…120 |
| D-08 themes | TR-109…115 |
| D-09A public rollout | TR-096/100/102/116/120…126 |
| D-09B ownership/permission | TR-101 |
| D-09C deletion/provenance | TR-100/102/129/130 |
| D-09D operations | TR-102/120/121/125/131 |
| D-09E restoration | TR-112/113/115/131 |
| D-10 provisional numerical policy | TR-039…043/045…049/051…061/066…068/071…077/080/081/084…092/107/117 |
| D-11 modular architecture | TR-008…025/078/079/094/097/127…139/142 |
| D-12 additive database | TR-001…007/016/017/020/044/063…069 and all DB inventory rows |
| D-13 release order | TR-015/038/103…126/133…140/142 |
| D-14 neutral consolidation | TR-141/142 |

**REQUIRES INSPECTION** remains a release gate, not missing product approval: effective SQL grants/catalog mutation exposure; reconciled migration ledger and backup/restore rehearsal; actual mobile and missing-schema compatibility; foreign-key/slot identity and precise offline conflict handling; equipment configuration/load model fixtures; policy thresholds and safety wording review; verified primary research links behind imported citation tokens; HealthKit/Expo native compatibility and permission scope; native billing/storefront rules; named moderation/support capacity; legal retention/takedown/terms; export/deletion processors; signed build/device accessibility.

The historical research report contains unresolved citation tokens and population/generalization limits. The [research translation](/dev-doc/plans/active/ADAPTIVPUSH-RESEARCH-TRANSLATION.md) owns research-to-product interpretation and evidence caveats; the master owns implementation behavior. AC-TR-047/048/049/052…061/071…077/081/084…092 require source and policy review; this traceability map does not turn the report's exact ranges, older packet thresholds, or competitor claims into newly verified facts.

All AC scenarios here are **required future evidence**, except AC-TR-141/142's documentation-only portions which this consolidation can check. There are no new runtime, live database, device, purchase, health, safety, or moderation test results in this document.


## Additional historical report and task-board crosswalk

These duplicate historical feature requirements are explicitly connected to the same TR identities; report-writing instructions and team/sprint narratives remain historical evidence, not product implementation requirements. Source bodies remain unchanged. The [inventory](/dev-doc/plans/active/ADAPTIVPUSH-DOCUMENT-INVENTORY.md) identifies exact preserved destinations and hashes.

| Historical source and precise section | Disposition and existing requirement / slice destinations |
|---|---|
| [Early feature implementation](/dev-doc/plans/legacy/2026-09-08-superseded/reports/IMPLEMENTATION_PLAN.md), schema reconciliation and phase 0 tasks 0.1–0.3 | Revised: obsolete workout_session_exercises table is not replayed; canonical IDs/types and real schema inspection map TR-001–007 / AP-01–03. Local fallback is a catalog cache, not independent ID authority. |
| Same source, tasks 1.1–1.5 generation/saving/modal/onboarding/Plan | Revised: TR-017–025/050–069 / AP-03/06/07. Fixed split/sex/bodyweight loads, random churn and premature deactivation replaced by goal/constraint preview, calibration and atomic install. Optional program naming retained. |
| Same source, tasks 2.1–2.3 workout save/progression/apply | Replaced implementation: TR-008–017/039–045 / AP-02/05. Atomic finalized outcome, prescription-count comparison and one authorized progression application supersede multiwrite/score-multiplier behavior. |
| Same source, tasks 3.1–3.2 swaps and 4.1–4.3 history | Revised: TR-022–024/044–046/064–069 / AP-02/03/05/07. Preserve scope/history, exact actual loads and comparison cohorts; prior completed checkboxes are historical claims. |
| Same source, UI standards and phase 5 readiness popup / known no-op | Revised: TR-070–083/133–139 / AP-08/16. Current semantic theme and accessible states retained; old five-band automatic weight/RPE changes replaced by explicit shared decision. |
| Same source, cleanup candidates and keep list | Deferred unless current dead-code inspection supports bounded removal; TR-139/140 / AP-16. No deletion authorized by historical candidate list; present code/status controls. |
| [Historical task board](/dev-doc/plans/legacy/2026-09-08-superseded/reports/TODO.md), repeated phases 0–4 and Completed | Replaced queue, retained dated evidence: same early feature rows above and TR-141/142. Duplicate blocks do not create duplicate work or current completion. |
| [Historical architecture](/dev-doc/plans/legacy/2026-09-08-superseded/reports/ARCHITECTURE.md), route/runtime/auth/profile/generation/persistence/workout lifecycle | Retained architecture evidence, revised target: TR-001–025/039–069/127–140 / AP-01–07/16. Current modular monolith and command ownership replace screen/hook authority. |
| Same architecture, readiness/cycle and notifications/assets/constraints | Revised: TR-070–089/103–115/127–139 / AP-08/09/12/13/16. Calendar-only multipliers and unsupported platform/privacy promises are not current rules. |
| [Final report](/reports/AdaptivPush_Full_Final_Report.md) and [outline](/reports/FINAL-REPORT-OUTLINE.md), sections 1–6, 8–10, appendices A–D/F | Retained historical proposal/delivery/security/UI evidence; TR-001–025/127–142. Team names, academic schedule adherence, writing guidance and screenshots are reporting provenance, not user-training requirements. |
| Same reports, 7.1–7.4 auth/onboarding/generation/active program | Revised behavior: TR-017–025/050–069/127–132 / AP-03/06/07/16. Current code determines implemented status; source report delivery statements are not new verification. |
| Same reports, 7.5–7.10 logging/progression/readiness/swap/history/cycle; final report appendix E excerpts | Revised/replaced: TR-008–016/026–049/064–089 / AP-02–05/07–09. Excerpts remain historical code, not templates to copy over current fixes. |
| Same reports, 7.11 notifications/themes/profile; 11.1–11.5 future work/limitations | Retained/revised: TR-018–020/103–115/127–140 / AP-06/08/12/13/16. Preserve free appearance, actual settings and platform parity; placeholder health/support remains missing. |
| [March weekly report](/reports/WEEKLY-REPORT.md), sections 1–4 and next steps | Historical bugs/status retained; revised TR-008–025/070–083/127–132. Dummy workouts/failed FK and profile wiring are dated facts, not current blanket failure; Home Apply remains subject to current source finding. |
| [April 16 report](/reports/WEEKLY-REPORT-2026-04-16.md) and [class update](/reports/CLASS-UPDATE-2026-04-16.md), sections 1–5 / next week | Revised TR-008–017/026–034/039–046/050–062/070–089: filtering invalid sets cannot establish full completion; backdating and forced fourth-week deload are replaced; continuity/history intent retained. |
| [April 19 report](/reports/WEEKLY-REPORT-2026-04-19.md) and [simplified report](/reports/WEEKLY-REPORT-2026-04-19-SIMPLIFIED.md), sections 1–8 | Revised TR-039–049/050–062/070–089/127–140. Per-set reductions/readiness weights/RPE ramps are H history; PR/FAQ/recovery/swaps/password feedback retained with proper identity/accessibility/release checks. |
| [Earlier DEV-LOG](/reports/DEV-LOG.md), dated entries Jan–Apr | Historical implementation/PR/cleanup evidence retained; same corresponding feature TR rows above. Old catalog counts and file paths are not current facts or permission to replay historical git/deletion actions. |
| [Current DEV-LOG](/dev-doc/reports/DEV-LOG.md), dated evidence and August audit linked by DB plan | Historical verification retained; TR-001–007/016/141. Service-level compatibility does not close actual device or current catalog-grant/whole-transaction gates. |

No source requirement in these additional historical surfaces creates another source of truth. Their duplicate behavior maps above to the same AC-TR acceptance scenario and expected evidence as the detailed row, with the stated revised/replaced/deferred disposition.
