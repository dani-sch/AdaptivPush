# AdaptivPush wireframe requirements and component brief

Prepared 2026-09-09 from checkout `7845a78` on `adaptivpush-ui-wireframe`. Scope: information collection and design preparation only. No application, UI, database, dependency, or runtime configuration changes. Companion: [image-generation prompt pack](ADAPTIVPUSH-WIREFRAME-PROMPTS-2026-09-09.md).

## 1. Authority and evidence

This is a derived design brief, not a replacement implementation plan or approval to implement. Approved behavior comes from [D-01–D-14](../plans/ADAPTIVPUSH-PLANNING-DECISION-RECORD-2026-09-08.md) and the [master plan](../../dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md). [Execution register](../../dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) owns AP delivery gates; [traceability](../../dev-doc/plans/active/ADAPTIVPUSH-TRACEABILITY.md) owns requirement acceptance. [Implementation status](../../dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md) records the September 8 code baseline. The [database plan](../../dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md) and [research translation](../../dev-doc/plans/active/ADAPTIVPUSH-RESEARCH-TRANSLATION.md) constrain truthful data presentation and explanations.

Evidence collected here: route inventory, navigation layouts, frontend JSX/labels/styles, component contracts, theme/palette definitions, selected handlers, active planning contracts, and visual inspection of all seven supplied PNGs. This is a source-based UI audit, not a pixel audit of a running app. No current authenticated device session, runtime screenshots, backend operations, or fresh research verification were performed. Historical device/backend limitations are not newly reproduced findings.

Labels used below:

- **Existing:** visible source structure exists; not necessarily complete or runtime verified.
- **Required:** behavior is derived from approved plans.
- **Proposed:** information architecture, component grouping, visual treatment, and frame organization for wireframe review.
- **Later/gated:** required design coverage for a later approved release, not a core launch dependency.
- **Deferred:** explicitly outside present product scope; do not turn reference imagery into feature approval.

## 2. Current frontend and refactor implications

| Current surface / source | Existing UI observed | Required wireframe change or addition |
|---|---|---|
| [Root](../../app/index.tsx), [auth](../../app/(auth)/login.tsx), [join](../../app/(auth)/join.tsx), [recovery](../../app/(auth)/forgot-password.tsx) | Welcome, Sign In/Join, email/password, password strength, reset-request form | Complete request/callback/new-password/error journey. A submitted form must not claim delivery or fulfillment without evidence. Preserve email auth; social providers in a sample are not approved requirements. |
| [Quick Setup](../../app/(qsetup)/quick-setup.tsx) | Demographic-first form, optional weight/gender, experience, Apple Health card | Lead with goals, available days, time, experience and broad equipment. Sensitive information optional; health separate and later. Resume interrupted setup. Preview a feasible plan before activation. |
| [Tab layout](../../app/(tabs)/_layout.tsx) | Four icon-only tabs: Home, Plan, History, Profile | Retain four destinations as proposed baseline; add visible labels. Rename Home to Today only as a design proposal. Calendar lives within Today/Plan rather than adding a fifth core tab. |
| [Home](../../app/(tabs)/home.tsx) | Date header, next-workout card, week-complete CTA, readiness/last-workout/week stats, check-in modal, accessory/cycle nudges, recovery shortcut | Dated workout/rest/pause/resume states. Calm rest treatment; no automatic substitution of unfinished work. Replace score/phase nudges with optional capture and explicit decisions. Actual weekly adherence replaces implied completion from session rows. |
| [Plan](../../app/(tabs)/plan.tsx), [overview](../../app/program-overview.tsx), [template modal](../../components/WorkoutTemplateModal.tsx) | Active program header, week progress, workout selection, generate/create/archive/end menu, workout details | Calendar and relative program structure must be distinguishable. Add dated rest, schedule edits, immutable revision context and accepted-plan preview. Remove development creation controls from proposed product frames. |
| [Generator](../../components/GenerateProgramModal.tsx) | Days, length, session time, goal, focus, swap interval; optional naming stage | Standard free setup plus separate advanced controls; show interpreted constraints, alternatives, duration/coverage compromises, starting-load calibration, preview, activation and failure recovery. No automatic exercise churn or guaranteed future loads. |
| [Manual editor](../../app/create-program.tsx) | Program metadata, name training days, exercise search/filter, sets/rep range/RPE/load/notes | Preserve free authoring. Add rest placement, slot order, warm-up/required/optional distinctions, unit/loading basis, unsaved draft, validation and explicit future scope. |
| [Workout](../../app/next-workout.tsx), [ExerciseCard](../../components/ExerciseCard.tsx) | Exercise cards, SET/LBS/REPS/RPE grid, checkmarks, info/history/swap actions, finish confirmation, elapsed timer, PR modal | Preserve fast set logging; show target separately from actual, optional effort, actual unit/loading mode, durable draft/save state, partial finish and conflict recovery. Elapsed timer exists; rest countdown is an optional enhancement. |
| [Swap](../../components/SwapExerciseModal.tsx), [info](../../components/ExerciseInfoPanel.tsx), [exercise history](../../components/ExerciseHistoryModal.tsx) | Search, exercise choices, future-program toggle; media/instructions; exercise history | Explicit session/future/pre-install scope, suitability explanation, equipment calibration. Previously logged sets remain attached to their original exercise. Provide dedicated form detail and honest missing media/history states. |
| [History](../../app/(tabs)/history.tsx), [history route](../../app/workout-history.tsx) | Summary cards, month-grouped sessions, details sheet, PR sheet and exercise history | One coherent history destination with linked session/exercise details. Separate raw trends from premium interpretation, full/partial/pending records, comparable equipment cohorts and missing legacy detail. Query failure must not look like empty history. |
| [Archive](../../app/archived-programs.tsx) | Archived cards with duration/start/ended/week checkpoint and Restore | Exact resume only with a valid checkpoint. Legacy archive explicitly offers restart/reschedule when exact date/day cannot be recovered. Preserve history during replacement. |
| [Profile](../../app/(tabs)/profile/index.tsx) | Avatar/account, progress counts, experience, cycle inputs, readiness settings, appearance/palette/haptics, account/settings links | Group training preferences, depth, optional sensitive context, equipment, appearance, privacy and services. Keep public identity separate. Existing health connection/autofill copy does not establish a real adapter and conflicts with initial display-only scope. |
| [Notifications](../../app/(tabs)/profile/notifications.tsx) | Channel controls, training alerts, quiet hours | Schedule-aware device reminders, actual OS permission and delivery state. Do not portray unsupported email/SMS as delivered. |
| [Personal info](../../app/(tabs)/profile/personal-information.tsx), [privacy](../../app/(tabs)/profile/privacy-data.tsx), [support](../../app/(tabs)/profile/help-support.tsx) | Editable metadata, data-request actions, contact actions and support-hour promises | Real request composer, acknowledgment, tracking, retry, secure export and deletion effects. Do not copy unverified service response promises into wireframes. |
| [FAQ](../../app/faq.tsx), [Recovery Library](../../app/recovery-library.tsx) | Educational screens | Shared explain-why/source hierarchy with coverage and uncertainty; optional education, no invented medical claims. |
| [Themes](../../constants/themes.ts), [palettes](../../constants/palettes.ts) | Dark charcoal/light off-white, rounded cards, blue default, Purple/Pink/Green/Red choices | Preserve accessible free modes and palettes. Consistent spacing/type/actions. Purple-led concepts are proposed visual studies, not a decision to replace the blue default. |

Source-backed defects affecting design, cross-referenced to the implementation-status DEF ledger: ambiguous/partial saves (DEF-02–04); incomplete program activation (DEF-05–06); calendar/archive ambiguity (DEF-07–08); incomplete progression evidence and phase overwrite (DEF-09–10); nonpersistent readiness decisions and resetting fields (DEF-11–13); swap identity leakage (DEF-14); incomplete history reconciliation (DEF-15); fixed escalation/deload/random exercise policy (DEF-16); service stubs and dev controls (DEF-17–18). The new frames must illustrate the target resolution without suggesting those behaviors already work.

## 3. Visual direction from the supplied samples

| Reference | What to carry into the design study | Boundary |
|---|---|---|
| [125839](../../ui%20samples/Screenshot%202026-09-09%20125839.png) | Rounded date capsules, clear selected day, layered plum surfaces, concise daily overview, labeled navigation; separate IA board | Nebula backgrounds/angled device mockups are presentation decoration; avoid behind dense training data. Do not import journaling/tasks. |
| [132117](../../ui%20samples/Screenshot%202026-09-09%20132117.png) | Light airy spacing, purple hero, soft lime/blue secondary cards, friendly typography, large primary action | No automatic daily challenges, calorie prescriptions, maps, social auth or mandatory rings from the reference. |
| [132228](../../ui%20samples/Screenshot%202026-09-09%20132228.png) | Dark analytical dashboard, range selector, legible chart legend, grouped metrics | Avoid six unrelated metrics competing with today's workout. Charts require units, coverage and comparable contexts; no universal heavier-is-better metric. |
| [132338](../../ui%20samples/Screenshot%202026-09-09%20132338.png) | Clean weekly strip, exercise hierarchy, readable set rows, muted metadata, restrained mint accents | Superset organization only when the program explicitly supports it; no inferred feature requirement. Rest data and logging remain clear. |
| [133439](../../ui%20samples/Screenshot%202026-09-09%20133439.png) | Focused black/charcoal logger, purple controls, expandable exercises, aligned inputs, set completion and reachable finish | Avoid tiny set-type abbreviations and dominant timer that crowds inputs. Rest timer remains separately optional. |
| [133859](../../ui%20samples/Screenshot%202026-09-09%20133859.png) | Large form illustration, concise ordered instructions, simple dismiss control | Use placeholder/approved instructional media; an AI-rendered pose is not validated technique instruction. |
| [135035](../../ui%20samples/Screenshot%202026-09-09%20135035.png) | Soft gradient accent, concise explanatory card, phase legend, small purposeful chart and CTA | Do not reproduce automatic repeating build/push/recover cycles as approved policy. Deloads are explicit proposals or user-selected phases. |

Proposed composition: the structural clarity of 132338, logger density of 133439, restrained purple/soft color treatment of 132117, and analytical hierarchy of 132228. Use 125839/135035 for occasional headers and explanations, not every background. Use 133859 for exercise detail.

Proposed working dimensions: 390 × 844 logical-pixel mobile frames; 20 px page inset, 8 px spacing rhythm, 16–24 px card radii, approximately 16 px body text, 28–32 px main headings, tabular workout numerals. Use comfortably sized roughly 48 px interactive areas, expanding input layouts at large text. These are wireframe targets, not measured platform compliance. Verify contrast, font scaling, focus, screen-reader labeling, reduced motion and non-color status later on actual devices. Show a 320 px narrow-layout variant and enlarged-text logger. No fixed text truncation for essential exercise names or actions.

## 4. Proposed information architecture

| Destination | Primary responsibility | Secondary surfaces |
|---|---|---|
| Today (current Home) | What is scheduled today; start/resume, rest, optional check-in | Week strip/calendar, decision review, save recovery, adherence detail, recovery education |
| Plan | Current prescription and dated schedule; create/edit/replace | Program overview, calendar, manual changes, generation, equipment shortcut, archive; later unlisted share/import |
| History | Trustworthy actual records and descriptive progress | Session detail/correction, exercise cohorts, PRs, weekly adherence; later contextual insights |
| Profile | Personal preferences and account control | Equipment, readiness/cycle settings, display depth, notifications, appearance, privacy/data, support; optional health/access/commerce |

Nested pages use a clear Back action. Sheets are for bounded decisions or short edits; full pages for long setup, workout capture, calendars and comparison tasks. A persistent resume affordance returns to an unfinished workout. A new top-level social destination is not part of core navigation. Later discovery/community entry placement is a design question for that release.

Primary journeys: sign in → practical setup → free plan preview → activate → Today; Today → optional check-in → keep/accept plan → log → full/partial finish → synchronized receipt/history; Plan → choose occurrence → choose scope → preview → apply; History → comparable exercise → explanation → optional future target; Profile → actual service request → receipt → tracked completion.

## 5. Non-negotiable requirements for every applicable frame

| ID | Visible design requirement | Authority |
|---|---|---|
| R01 | Free path includes standard generation, manual authoring, scheduling, actual logging/history, conservative progression, neutral check-in and safety choices. Paid convenience must have an accessible free alternative. | D-01; master §2 |
| R02 | Planned, accepted and actual are distinct. Preview before activation, preserve old history, freeze accepted workout at start; later amendment never resets entered sets. | D-05/11; §4–6/9–10 |
| R03 | Local saved, waiting to sync, sending, synchronized, retry, sign-in required and conflict are explicit. Only server receipt means synchronized. Preserve work after interruption. | §5/9; AP-02/16 |
| R04 | Finish shows full versus partial with actual required-work counts; abandon is separate. Warm-ups and optional work are distinct. Unknown, blank and valid zero are distinguishable. | §9; AP-02/05 |
| R05 | Rest is explicitly scheduled. Moves retain original/current date and scope; completed/in-progress work stays fixed; missed sessions create choices, not training debt. | D-02; §12 |
| R06 | Check-in is optional and neutral. Explain changed exercises/sets/load; Accept, Modify, Keep original/Reject and Later are explicit; dismissal never accepts. High readiness alone does not escalate work. | D-05; §10 |
| R07 | Pain/illness follows a separate reviewed safety path. Cycle support is opt-in, private, symptom-first, with unknown/irregular states. No phase-only prescription multiplier. | D-05/10; §10 |
| R08 | Exact actual loads are free. Display unit, per-hand/total/assistance/bodyweight/band meaning. A changed machine/configuration needs distinct calibration and history. | D-01; §8 |
| R09 | Progression explains comparable finalized evidence, required work, uncertainty and attainable/generic load. Sparse/partial evidence supports hold or request-data; no fabricated success. | D-10; §9 |
| R10 | Weekly adherence shows workout target/full/accepted-reduced/partial/pending/unresolved, and respected rest separately. Pause preserves streak without adding a week; hideable, non-shaming. | D-04; §12 |
| R11 | Essential/Guided/Advanced changes disclosure only, independently of subscription/consent. Material risks and actions stay available in every mode. | D-01; §2 |
| R12 | Health is optional display-only, local by default. OS permission, display consent and cloud consent differ. Unknown/stale differs from zero; imports do not create exercise sets. | D-06; §15 |
| R13 | Unlisted publication previews only reusable sanitized content, discloses link access, and installs a pinned private copy. Updates never silently overwrite personal planning/history. | D-03/09; §13 |
| R14 | Theme preview differs from Apply; cosmetic ownership is separate from coaching. Pending/restore/revoked/incompatible states retain a safe appearance. | D-08/09E; §16 |
| R15 | Export, deletion, reset and support show actual submission and fulfillment states. Do not promise an unverified turnaround, price, retention duration or delivered message. | §17; AP-16 |
| R16 | Public discovery/reviews/social are later operations-gated modules with report/block/contact/appeal and internal moderation support. Private training continues during outage. | D-07/09A–D; §14 |

## 6. Complete surface catalogue

Each row is a surface family. Semicolon-separated variants are separately reviewable frames in the prompt pack; a sheet is shown in its parent context. Scope labels: **Core** = trustworthy free foundation plus its account obligations; **Precision** = early advanced-generation/equipment release; **Coaching** = later contextual release; **Unlisted** = first distribution release; **Optional** = independent health/themes; **Gated** = later public operations. Layouts and surface IDs are proposals, not new AP slice IDs.

| ID / scope / owner | Surface, contents in display order | Actions and required variants |
|---|---|---|
| S01 Core AP-16 | Welcome: concise training value, Sign In, Create Account, policy links | Welcome; no forced subscription/health/public identity |
| S02 Core AP-16 | Sign in / create account: labeled inputs, visibility control, inline errors, recovery | Sign in; signup; verification pending where auth requires it; expired-session return preserving draft |
| S03 Core AP-16 | Password recovery: request, status, callback/new password | Request; submitted; new password; expired/invalid/used link with request-again path |
| S04 Core AP-03/06 | Setup goals/experience: primary goal, experience, effort familiarity | Continue/back/resume; optional secondary goal/preferences disclosed; no demographic-derived starting load |
| S05 Core AP-03/04/06 | Setup availability: days, session duration, broad equipment, units; constraint summary | Edit constraints; free standard generation or manual creation; infeasible combination explanation |
| S06 Core AP-03/06 | Program preview: name optional, fit summary, workout/rest pattern, duration, key exercises, starting-load calibration, Why | Edit; activate; saving/failed activation retaining previous plan; no arbitrary future load forecasts |
| S07 Core AP-02/04 | Today workout: date/week strip, planned session/time/location, start, optional check-in, modest adherence | Scheduled workout; no program with generate/manual options; completed day; stale/missing selected occurrence |
| S08 Core AP-04 | Today rest/pause: explicit status, next dated session, optional education | Rest day; paused interval with resume planning; never redirect to oldest unfinished workout |
| S09 Core AP-02 | Resume/recovery: workout name/start, logged sets, local/sync state | Resume draft; waiting to sync; retry; sign-in required; conflicting drafts comparison; do not discard automatically |
| S10 Core AP-03/04 | Plan hub: active program, cycle week, schedule/structure switch, next occurrences, menu | View day; edit; create; archive; no active plan; no dev buttons |
| S11 Core AP-03/06 | Program overview: goal, cycle/phase, week selector, workout/rest structure, required/optional exercises, rationale | Day detail; Why; future prescription uncertainty; scheduled deload only if explicitly configured |
| S12 Core AP-03 | Manual builder: metadata, named workout/rest pattern, day list, ordered exercise slots and set editor | Add/reorder/remove; save draft; preview; validation; changed scope and unsaved-exit dialog |
| S13 Core AP-01/03/07 | Exercise catalogue/picker: search, equipment/pattern/muscle filters, result metadata and suitability | Add/select; empty results; unavailable catalogue; missing canonical mapping retains draft |
| S14 Core AP-02/03 | Exercise detail/form: media placeholder, name/equipment, instructions, cues, preparation, history shortcut | Back/close; add/swap from calling context; missing-media fallback; no generated claim of validated form |
| S15 Core AP-03/04 | Archive/library: private saved and archived items with history/checkpoint | View; exact resume when known; legacy restart/reschedule; activation replacement confirmation |
| S16 Core AP-04 | Calendar: month/week, selected local date, timezone, workout/rest/partial/pending markers and legend | Select occurrence; go to today; navigate dates; large-text agenda alternative |
| S17 Core AP-04 | Occurrence detail/manual edit: original/current placement, resolution, program day, scope | Move/carry/skip/replace/leave unresolved; swap two days; one occurrence versus future recurrence |
| S18 Core AP-04 | Schedule preview: before/after date rows, fixed work, proposed rest/moves, concerns/unplaced list | Apply/edit/cancel; recurrence effective date; stale revision/conflict; infeasible alternative |
| S19 Core AP-04 | Availability/pause/timezone: date interval, available days, return plan, timezone interpretation | Pause/resume; temporary availability; keep dates versus re-place future work preview; no completed-date rewrite |
| S20 Core AP-04/05 | Weekly adherence: target, full/reduced, partial/pending/unresolved, rest and accepted changes | Week details; original/current schedule explanation; hide streak; pause preserved versus week added |
| S21 Core AP-02 | Pre-workout: dated occurrence, accepted exercise prescription, equipment/loading basis, optional warm-up/Why | Start; adjust manually; check in; verify stale target; accepted prescription freezes on start |
| S22 Core AP-02 | Active logger: compact session header, elapsed time, save badge, required-set progress, expandable exercise and target/actual rows, finish | Log/edit/add actual set; info/history/swap; zero/unknown and unit states; keyboard/large-text variant |
| S23 Core AP-02/07 | Swap/calibrate: original slot, reason, candidate, session/future scope, loading basis and calibration | Confirm; preserve original logged rows; new unlogged replacement; no cross-machine copied load |
| S24 Core AP-02 | Finish/review: required and optional set counts, actual summary, full/partial classification | Keep training; finish partial/full; abandon/discard distinct; saving/pending/retry and synchronized receipt |
| S25 Core AP-05 | History overview: range, modest metrics, date-grouped sessions, full/partial/pending badges | Session/PR/exercise drilldown; empty; unavailable; legacy detail missing; raw records free |
| S26 Core AP-02/05 | Session detail/correction: date/time/duration, accepted versus actual, set list, fulfillment, source | Correct with reason and before/after; preserve audit; PR projection pending distinct from workout save |
| S27 Core AP-05/07 | Exercise history/trends: exercise/equipment cohort, unit, date window, chart plus values, coverage, PRs | Choose cohort; view session; missing/incomparable/sparse; no fabricated kg for bands |
| S28 Core AP-05 | Next-target explanation: increase/hold/reduce/request data, affected future slot, comparable evidence, generic/attainable change | Accept or manual target; hold; Why; explicit policy authorization if offered; recovery-phase guard |
| S29 Core/Coaching AP-08 | Neutral check-in: low/normal/high, optional deeper sleep/stress/soreness/motivation/life load, timestamp | Save/skip/edit; no data; conflicting signals; free capture does not require accepting adjustment |
| S30 Core/Coaching AP-08 | Pain/illness/symptom path: separate signal, minimal optional context, private disclosure | Stop/rest/manual modification/help options; exact safety wording marked for qualified review; never aggregate away pain |
| S31 Coaching AP-08 | Adjustment proposal: original/proposed side-by-side rows, why/context, alternatives, scope and freshness | Accept/modify/keep original/later; pending; rejected; applied; stale/expired; late amendment protects logged rows |
| S32 Core/Coaching AP-08 | Readiness/cycle preferences: optional prompts/questions, cycle opt-in, symptom capture, unknown/irregular dates, privacy | Save; disable future interpretation; delete private data; no automatic phase multiplier |
| S33 Coaching AP-09 | Insight detail: comparable trend/window, coverage, possible explanations, suggested review | Explore raw records free; contextual alternative; insufficient evidence; confidence separate from evidence strength |
| S34 Coaching AP-09 | Deload lifecycle: proposed demand change, affected dates/exercises, rationale and options | Accept/modify/postpone/reject; scheduled; active; completed/reassess; no mandatory every-fourth-week pattern |
| S35 Coaching AP-10 | Automatic schedule recovery: missed/unavailable days, fixed work, proposed moves/rest and unplaced work | Accept/edit/reject; infeasible; free manual schedule link remains equally reachable |
| S36 Core AP-06/08/09 | Why/evidence sheet: plain-language rationale, inputs used/missing, alternatives, uncertainty, deeper source/policy | Essential/Guided/Advanced variants; unavailable source fallback; no clinical validation of exact thresholds |
| S37 Core AP-09/16 | Education: Recovery Library / FAQ / article | Search or topic selection proposed; optional warm-up/mobility; concise article and source caveats; no compulsory recovery task |
| S38 Precision AP-06 | Advanced generation: split alternatives, ordered focus/volume/preferences/progression, time/coverage tradeoffs | Revalidate preview; compare options; unavailable capability/free standard path; preserve accepted output on downgrade |
| S39 Core/Precision AP-07 | Equipment profiles: active broad profile, detailed location list and inventory summary | Free broad edit; premium add/switch precise location; downgraded owned records view/export and broad fallback |
| S40 Precision AP-07 | Equipment detail/configuration: location/instance, load mode, discrete values, unit, configuration fields | Edit/save new config; bar/plates, dumbbell per-hand, stack/ratio, assistance, bodyweight, band variants; unknown is valid |
| S41 Precision AP-07 | Location change/calibration preview: old/new equipment, affected slots, compatible exercise choices and new targets | Calibrate/manual hold; accept future change; unavailable precision; preserve historical configurations |
| S42 Core AP-16 | Profile/settings hub: avatar, private account, training, equipment, depth, notifications, appearance, data/support | Edit profile; grouped destinations; optional services only when enabled; sign-out with unsynced-work choice |
| S43 Core AP-16 | Personal/training preferences: name/avatar, goals/experience, units/timezone, optional considerations | Save; photo permission/cancel/error; future-effects preview; no mandatory sensitive fields |
| S44 Core AP-16 | Display/accessibility: Essential/Guided/Advanced explanation, text preference if supported, motion/haptics, hide consistency | Show one decision at three depths; accessible controls stay free; depth never grants paid capability |
| S45 Core AP-04/16 | Notifications: OS permission state, supported training categories, selected time/quiet hours/timezone | Request permission/open settings; save; denied; scheduled rest-aware preview; unsupported channel hidden |
| S46 Core AP-16 | Privacy/data control: what is stored/shared, separate optional consents, export/delete entry | Data request; symptom/import deletion; public-avatar disclosure; policy link; no blanket local-only promise |
| S47 Core AP-16 | Request tracking/export: request type/time, acknowledged/queued/processing/completed/failure | Retry; securely download export; expired download; request receipt is not completed export |
| S48 Core AP-16 | Account deletion: concrete data/distribution consequences and applicable retained-installation explanation | Confirm through appropriate authentication; pending/failed/completed; preserve accurate status; no invented retention term |
| S49 Core AP-16 | Help/support: issue type, description, optional safe diagnostics, contact route, request history | Submit; server receipt; tracking/retry; purchase/privacy/public exception links; no invented SLA |
| S50 Precision/Optional AP-16 | Capability/access: free versus paid convenience, owned outputs, verified access state, restoration | Upgrade; pending verification; restore; expired/downgraded; support; no invented price or forced paywall |
| S51 Unlisted AP-11 | Publish preparation: reusable program summary and included/excluded data preview | Confirm publish; unlisted access disclosure, limited service permission; validating/error; no personal actual loads/symptoms |
| S52 Unlisted AP-11 | Published versions/share management: immutable version, distribution status, link/code, update history | Copy/share through native handoff; new version; unpublish; distribution notice; do not alter installed copies |
| S53 Unlisted AP-11 | Recipient link/code preview: author/version, goal/time/equipment, exercises/rest/progression and compatibility | Open app/web handoff; enter code; install; invalid/revoked/quarantined/incompatible/offline states |
| S54 Unlisted AP-03/04/11 | Private install setup: dates, broad equipment, load calibration, active-plan replacement preview | Install; retry/synchronized receipt; deliberate new copy; preserve active/in-progress work |
| S55 Unlisted AP-11 | Installed version/update: pinned source, local changes, version diff and distribution notice | Separate install or future replacement; keep copy; no selective merge or forced update |
| S56 Optional AP-12 | Health setup/consent: supported platform, data types/purpose, OS permission, local display, separate cloud option | Connect/deny; partial permission; optional cloud disclosure; unsupported-device manual path |
| S57 Optional AP-12 | Health display/data management: steps/distance/workout summaries, source/freshness, duplicates | Resolve ambiguous match; stale/unknown; disconnect; delete cached/cloud import; no invented sets or coaching impact |
| S58 Core/Optional AP-13 | Appearance/themes: free system/light/dark/palettes; later first-party theme catalogue and live preview | Cancel/Apply; owned versus preview; no third-party submission/creator market |
| S59 Optional AP-13/16 | Cosmetic purchase/restore: selected asset, verified ownership/download/apply states | Pending purchase; restore; download/validation failure; incompatible/refunded/revoked fallback; coaching downgrade retains ownership |
| S60 Gated AP-14 | Discovery/program public detail: search/filter, published version cards, saves, rating distribution | View/install/save/report; service unavailable; only after moderation operations gate |
| S61 Gated AP-14 | Reviews: eligibility checklist, exact version, rating/text, public aggregate | Eligible editor; ineligible; pending moderation; edit/delete; install + 2 prescribed sessions on separate days + 7 elapsed days; author excluded |
| S62 Gated AP-15 | Public profile/follows: opt-in public fields, published programs, follow/block/report | Edit audience; follow; blocked/unavailable; private profile remains separate |
| S63 Gated AP-15 | Activity sharing/feed: explicit audience and sanitized fields, preview, published post/comments | Share/unshare; react/comment/edit/delete/report; offline draft; no automatic symptom/health/location exposure |
| S64 Gated AP-14/15/16 | Report/block/appeal/contact: target, reason, optional detail, result receipt | Submit; blocked parent; moderation notice; appeal/contact status; no exposure of other users' private evidence |
| S65 Core/optional operations AP-16 | Internal request console: access-controlled support/privacy/purchase queue, case detail/status/audit | Assign/process/retry/fulfill with real evidence; proposed desktop surface, not consumer app navigation |
| S66 Gated operations AP-14/15/16 | Internal moderation: severity queue, content/version, distribution state, audit, appeal and capacity | Quarantine/remove/review/restore as authorized operations; capacity gate; no invented staffing targets |

S65–S66 are proposed operator-interface coverage inferred from explicit queue/audit/fulfillment obligations. The contract does not require building a custom admin app; these frames may become requirements for an existing support/moderation tool instead.

## 7. Shared component inventory

Component names describe design responsibilities; they are not an instruction to create code files.

| ID | Component family and required anatomy/variants | Consumers / current reuse candidate |
|---|---|---|
| C01 | App shell: safe area, labeled four-tab bar, page/back header, contextual overflow, resume strip | Core routes; tab/root layouts |
| C02 | Action system: primary/secondary/quiet/destructive, pending/disabled/pressed; separate cancel/dismiss | All; BackButton and existing bespoke buttons |
| C03 | Form controls: label/help/error, optional/unknown choice, segmented/chip/multiselect, searchable picker, date/time/unit controls | Setup, editor, settings; do not encode unknown as zero |
| C04 | Cards and rows: title/meta/body/action, selectable/expandable states; banners distinct from permanent content | NextWorkoutCard, ExerciseCard, current metric/settings cards |
| C05 | Status/receipt: local saved, queued, sending, synchronized, retry/auth/conflict, timestamp and details | Workout/program/request/purchase; same visual grammar, accurate domain-specific copy |
| C06 | Empty/loading/error panel: real empty versus unavailable, retry/contextual create action, cached-data timestamp | Every data consumer |
| C07 | Calendar/occurrence: date pill, agenda row, workout/rest/pause/full/partial/pending markers with legend | Today/Plan/adherence; selected date separate from state |
| C08 | Change preview: original/proposed/current rows, scope selector, fixed/unplaced list, conflict comparison, explicit decision footer | Schedules, program activation, swap, adaptation, correction, updates |
| C09 | Program/slot prescription: ordered role, exercise, warm-up/required/optional, sets/reps/effort/rest, phase and rationale | Overview/generation/builder/pre-workout |
| C10 | Set logger: stable set label/type, target hint, actual load/reps/optional effort, unit/basis, log/edit state, keyboard navigation | ExerciseCard evolution; compact and expanded layouts |
| C11 | Exercise media/detail/search result: name, equipment/muscle/purpose, image fallback, cues, history and suitability | ExerciseInfoPanel, SwapExerciseModal, picker |
| C12 | Equipment/load input: mode, unit, per-hand/total/assistance, enumerated options, configuration/unknown, calibration | Logging/equipment/generator/manual editor |
| C13 | Metric/chart: value/unit/time range, meaningful denominator, comparable cohort, labeled legend and value/table alternative | History/PR/adherence; avoid color-only meanings |
| C14 | Check-in/symptom control: neutral low/normal/high, optional deeper inputs, private context, separate pain/illness path | Today/pre-workout/Profile |
| C15 | Proposal/Why: affected work, rationale, alternatives, coverage/freshness, lifecycle, depth disclosure | Coaching and free progression; shared state across routes |
| C16 | Consent/access: purpose-specific switch/disclosure, actual authorization state, free fallback, owned status | Health/privacy/themes/paid capability; no all-in-one consent |
| C17 | Request/case timeline: submitted receipt, queued/processing, fulfilled/failed/retry and artifact link | Export/delete/support/restoration/operator console |
| C18 | Publication/version/audience: included fields, immutable source, compatibility, distribution badge and update diff | Unlisted and later public sharing; never reuse private object view wholesale |
| C19 | Theme preview/swatches: current/preview/owned, mode comparison, Apply/cancel, compatible/fallback | Free appearance and optional commerce |
| C20 | Education/article: media fallback, ordered instructions, source caveat, optional completion-free reading | Exercise detail, FAQ, Recovery Library, Why |
| C21 | Timer: elapsed session time; optional rest countdown separately labeled with pause/skip/adjust | Workout; timer failure must not obscure logging |
| C22 | Public interaction/operations: eligible-use label, review distribution, report/block, moderation state and audit | Gated public/operational surfaces only |

## 8. Minimum state and scenario coverage

For each applicable surface, review loading, first-use empty, populated, partial, unavailable, cached/offline, saving/pending, success, retry, auth expiry, revision conflict, capability unavailable, consent declined and large text. Do not mechanically add irrelevant states (a static article does not need a purchase state). Distinct service states can share layout, but must have different text and actions.

| Scenario | Frames that must tell a coherent story |
|---|---|
| New free user without wearable | S01–06 → S07 → S21–24 → S25; no upgrade needed |
| One of four required sets logged | S22 → S24 explicitly partial → S26 → S28 hold/insufficient evidence |
| Finish offline, restart, expired login | S24 local pending → S09 resume/sync recovery → S02 sign in → synchronized S26, no duplicates |
| Late check-in after logging | S22 retains actual sets → S29 → S31 amendment → S22 original entered rows unchanged |
| Rest day with missed workout | S08 stays rest → S17 explicit missed-work choice → S18 preview; no forced backlog |
| Travel/new machine | S19 availability + S39–41 → S23 calibration → S27 separate comparison cohort |
| Rejected proposal across navigation | S31 rejection → S07 original plan → S21 same accepted prescription |
| Programme replacement fails | S06/S54 error → S10 old active plan retained → retry with same intent |
| Legacy archive/history | S15 uncertain checkpoint → restart/reschedule; S26 missing historic detail stays unknown |
| Pause and weekly report | S19 pause → S20 streak preserved, no week increment; rest outside workout numerator |
| Paid access expires | S50 downgrade → S39 broad fallback/S28 manual target; saved plans, records and S58 owned theme remain |
| Share/install/update | S51 excludes private data → S53 preview → S54 calibrated private install → S55 optional version change |
| Health denial or revocation | S56 decline → manual training; S57 disconnect/delete; stale data never becomes zero |
| Service requests | S46/S49 compose → S47 receipt/processing → fulfilled artifact or actionable failure |
| Later public release | S61 transparent eligibility → S64 report/appeal → S66 audit; outage leaves S07/S22 usable |

## 9. Wireframe acceptance and unresolved choices

Ready for detailed wireframing when every S01–S66 family has an assigned board or explicit later-release label; every primary CTA has a destination and outcome; all R01–R16 rules and relevant scenario rows are represented; variants use the same components, language, dates and data meanings; and dark/light/narrow/large-text examples remain legible. Images illustrate structure and state; exact copy and interactions remain governed by this brief.

Proposed defaults for review: four labeled tabs with Today replacing Home; mobile-first 390 × 844 frames; light/dark concepts with purple emphasis while retaining current palettes; sheets for short contextual decisions; full pages for complex setup/comparison. None of these visual choices is an approved replacement for existing navigation or brand tokens yet.

Still open for later design validation: actual device layout and keyboard behavior; final brand/accent and font; whether optional rest timer/superset authoring merits scope; supported native platforms/health adapter; final product prices and purchase wording; verified education assets/source links; qualified symptom/return-to-training wording; reviewed public/legal/privacy text; staffed support/moderation processes and whether their UI is custom or external. Wireframes should use clear placeholders for unresolved prices, policy text, media and service promises rather than inventing them. No web research was needed to extract these supplied requirements; no current medical/legal/storefront claims have been added.

Explicit exclusions: third-party theme marketplace/payouts, coach marketplace, opaque ML prescriptions, nutrition/clinical rehab product, health-driven prescription changes, selective installed-program merging, forced daily training streaks, exercise rotation merely because a timer elapsed, automatic cycle-phase load changes and unsupplied platform-health parity.
