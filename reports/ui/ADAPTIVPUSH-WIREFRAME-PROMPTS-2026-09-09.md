# AdaptivPush image-generation prompt pack

Prepared 2026-09-09. Design preparation only; no images or application changes generated. Use with the [requirements and component brief](ADAPTIVPUSH-WIREFRAME-REQUIREMENTS-2026-09-09.md), which supplies source traceability, behavior, states, and proposed S01–S66 surface IDs. This pack converts that brief into image-generation instructions without authorizing implementation.

## How to use

Generate one board at a time: paste the master prompt, then the chosen board brief. Attach the relevant supplied style PNGs and, after the first approved board, the approved component/anchor board for consistency. Local paths in a prompt are not image attachments; the generation tool must actually receive those images. Use the reference mapping below to select attachments. For an image-only generator, include the master and complete board text rather than relying on it to read linked Markdown.

Each board lists exactly four frames unless stated otherwise. Render a clean 2 × 2 contact sheet for review; then generate individual full-resolution frames from approved layouts. If four frames make text illegible, generate each listed frame separately with the same master prompt. Do not cram all surfaces into one giant image. A long page can use top/bottom continuation frames rather than shrinking all text into one viewport. State captions outside frames are part of the design handoff, not app UI.

Start with B01–B02 for visual direction. Then core B03–B13 and B18–B21; precision B17/B22; coaching B14–B16; unlisted B23–B25; optional B26–B28; gated B29–B33. Internal operations B34 can be designed alongside the relevant core services. B35–B36 verify critical recovery and responsive cases. This is a design-review order, not a replacement for AP implementation dependencies. Neutral check-in and safety/manual choices remain free even though their richer proposals belong to later coaching.

## Reference attachment key

All source images live under `C:/workout-app/AdaptivPush/ui samples/`.

| Key | File | Use |
|---|---|---|
| A | `Screenshot 2026-09-09 125839.png` | Calendar capsules, plum hierarchy; occasional atmospheric header |
| B | `Screenshot 2026-09-09 132117.png` | Airy light composition, purple accents, soft supporting colors |
| C | `Screenshot 2026-09-09 132228.png` | Dark analytics, chart/legend hierarchy |
| D | `Screenshot 2026-09-09 132338.png` | Clean calendar and structured exercise rows |
| E | `Screenshot 2026-09-09 133439.png` | Dark focused workout logger and purple actions |
| F | `Screenshot 2026-09-09 133859.png` | Form illustration/instruction detail hierarchy |
| G | `Screenshot 2026-09-09 135035.png` | Restrained gradient education/phase explanation |

## Master prompt — paste before each board

```text
Create precise, coherent mobile product wireframes for AdaptivPush, a strength-training app being refactored. Generate only the board specified below. This is a design artifact, not working software. Follow the supplied screen inventory and exact behavior; do not invent additional features, medical claims, commercial offers or data.

VISUAL PURPOSE
Produce medium-fidelity, implementation-informing wireframes with selective finished styling: clear hierarchy, realistic controls, legible short English labels, accurate state distinctions and reusable components. Use flat front-facing screens, no tilted phones, hands, photorealistic device hardware, browser chrome, watermark or decorative marketing scene. Place each screen on a neutral board with its frame ID, title and state caption OUTSIDE the app canvas. Do not show S/B/C identifiers inside the app. Follow the exact number/order of frames in the board brief.

STYLE
Use the attached references for style only: clean workout rows and weekly calendar from the white workout reference; focused charcoal logger from the dark purple reference; airy off-white spacing and restrained purple emphasis from the light fitness reference; sober chart organization from the dark analytics reference. Use soft plum/lavender gradients only sparingly in overview/education headers. Avoid visual noise behind inputs and charts. Form images are neutral illustrative placeholders, never claimed to be validated technique. Do not copy reference logos, people, names, invented social functions, maps, calorie goals, daily challenges or automatic periodization claims.

Use a consistent mobile 390 × 844 logical-pixel composition, safe-area allowances, approximately 20 px side margins, an 8 px spacing rhythm, rounded 16–24 px cards, approximately 16 px body type, 28–32 px primary headings, generous roughly 48 px interactive areas, tabular workout numerals and familiar line icons. Essential text may wrap. Dark mode uses charcoal surfaces with distinct card boundaries and high-contrast text; light mode uses off-white background and white cards. Purple is a concept accent, not a permanent change to the app's blue default. Preserve the concept of free Blue/Purple/Pink/Green/Red palettes and Light/Dark/System. Use text/icon/shape as well as color for states. Large text must reflow instead of clipping.

NAVIGATION
Core tabs are Today, Plan, History, Profile, with visible labels and consistent icons. Show them on top-level screens. Nested screens use a Back action; focused workout and deep setup may omit tabs. Primary action is reachable above the safe area/keyboard. Keep a clear resume path to an unfinished workout. Do not add a social tab to core boards. Optional services are secondary destinations and do not obstruct training.

PRODUCT RULES
1. Free users can generate a standard plan, author manually, schedule/rest/move workouts, log exact actual weights, inspect history/basic progression and capture neutral readiness. Richer generation, precise multi-location equipment automation and contextual coaching are optional paid conveniences. Do not paywall owned records or accepted plans. Do not invent prices or active subscriptions.
2. Show planned target, accepted prescription and actual logged work as distinct concepts. At workout start the accepted plan freezes. Late proposals and substitutions never erase or relabel previously logged sets.
3. Distinguish Saved on this device, Waiting to sync, Sending, Synchronized, Retry, Sign in to sync and Conflict. Only confirmed server receipt means synchronized. Pending is not failure or full completion. Keep drafts and entered values in every recovery state.
4. Distinguish warm-up, required and optional work. Finish can be full or partial. One completed set of four required is partial. Unknown/blank is not zero. Effort is optional for unfamiliar users. Weight entry states unit and loading basis such as per hand, total external load or assistance.
5. Today's scheduled rest stays rest even when earlier workouts are unfinished. Schedule changes show original and proposed dates, one-time versus recurring scope, fixed completed/in-progress work, unplaced work and concerns. Missed work does not create compulsory backlog. Weekly adherence shows its denominator, full/reduced/partial/pending/unresolved categories and rest separately; pause can preserve a streak without adding a week. Streaks are subordinate and hideable.
6. Readiness capture is optional, low/normal/high with optional context. An adjustment shows original/proposed work, reason, alternatives and explicit Accept, Modify, Keep original and Later actions. Dismissing is never acceptance. High readiness never silently raises work. Pain/illness uses a separate safety surface with wording marked for qualified review in OUTSIDE annotations. Optional cycle support is private, symptom-first and has unknown/irregular states; no automatic phase multiplier.
7. Progression uses comparable finalized work. Show source coverage and uncertainty, attainable or explicitly generic load changes, and hold/manual alternatives. New machines/configurations need calibration and separate history. Do not present exact fitness heuristics as scientific certainty or automatically schedule every-fourth-week deloads.
8. Essential, Guided and Advanced affect disclosure only, never price, consent or safety rights. Explain-why is available; deeper evidence strength and personal-fit uncertainty are separate. No raw policy IDs or backend jargon on primary screens.
9. Unlisted sharing is later: preview sanitized reusable content, exclude personal actual loads/health/symptoms/private notes, disclose access by anyone with the link, and install a private pinned copy. Updates do not silently overwrite private plans/history.
10. Health is later, optional, local by default and display-only: steps, relevant distance and workout summaries with source/freshness. OS permission, in-app display and cloud consent are distinct. Unknown is not zero; imports never invent exercise sets or change coaching.
11. Free appearance remains available. Paid first-party theme preview, verified ownership, download and Apply are distinct. Cosmetic ownership survives coaching downgrade. No third-party marketplace.
12. Reset, export, deletion, support and purchases show truthful pending/receipt/fulfilled/failure states; do not invent delivery, support hours, response guarantees, retention periods or prices. Public discovery/reviews/social are separate later operations-gated boards, with report/block/contact/appeal. Never include them in the core launch UI.

CONSISTENT FICTIONAL DATA
Use fictional Alex, program 'Foundation Strength', training Monday/Wednesday/Friday, 45-minute target, broad gym equipment, kg preference. Wednesday Sep 9, 2026 is a workout date; Thursday Sep 10 is planned rest; Friday Sep 11 is the next session. For an illustrative dumbbell row use target 3 × 8–10, 12 kg per hand, optional effort; actual rows 12 kg × 10 and 12 kg × 9, with third not yet logged. These are fictional UI data, not a recommendation. When a board specifies one-of-four, use a separate four-required-set example and explicitly say 1 of 4. Never call an incomplete example synchronized full completion. Use neutral sample counts with internally consistent denominators and label missing data honestly. Do not reveal private symptoms on share/public frames.

OUTPUT QUALITY
Match components across all frames: headers, cards, set inputs, date cells, buttons, status badges, sheet footers, chart legends. Favor one obvious primary action per state and visible alternatives. Use short readable English. If a frame cannot fit, show a clearly continued scroll surface; do not replace required content with tiny text. Do not invent interactions merely to fill space. Every panel has the specific purpose/actions listed below.
```

## Board briefs — append one to the master

### B01 — Component and visual-language anchor

References B, D, E. Four design-system panels rather than complete app screens:

1. **C01–C04, light:** labeled four-tab navigation, back header, type scale, primary/secondary/destructive buttons and one card. Include disabled, pressed and pending variants.
2. **C05–C08, dark:** status badges reading Saved on this device / Waiting to sync / Synchronized / Needs attention; selected date plus Rest/Partial/Pending markers; before/after schedule row.
3. **C09–C12, dark:** one exercise card, target hint above actual set inputs, per-hand kg label, optional effort, warm-up versus required row, logged/editable states.
4. **C13–C19, light:** metric with denominator and coverage, three-action-plus-Later proposal footer, separate permission/consent control, theme preview versus Apply. Keep every sample readable.

### B02 — Core navigation anchors

References B, C, D, E. Four mobile frames, consistent purple concept accent:

1. **S07 Today, light:** Wed Sep 9 week strip, Foundation Strength session and 45-minute target, Start workout, optional Check in, small weekly-adherence summary. No paid distraction.
2. **S10 Plan, light:** active program/cycle week, Schedule / Program structure switch, explicitly dated workouts and rest, edit/create/archive overflow.
3. **S25 History, dark:** range selector, compact actual-record metrics, date-grouped session cards with full/partial/pending labels. Include a modest chart only if it has labeled units/coverage.
4. **S42 Profile, dark:** avatar/private account, grouped Training, Equipment, Display, Notifications, Appearance, Privacy & Data, Help & Support. Four consistent labeled tabs.

### B03 — Account entry

Reference B. Four light frames:

1. **S01 Welcome:** restrained brand area, practical strength-training value, Sign In and Create Account, Privacy/Terms.
2. **S02 Sign In:** email/password with visibility, Forgot password, submit; concise inline incorrect-credentials state, retained email.
3. **S02 Create Account:** name/email/password, short password guidance, Create Account, existing-account link.
4. **S02 Verification pending:** clear pending account step if email verification is required; return/resend affordance with honest state. Annotate outside that exact auth-provider behavior requires implementation verification. No Google/Apple sign-in buttons.

### B04 — Real password recovery

Reference B. Four light frames:

1. **S03 Request:** email field, Send reset link, Back to Sign In.
2. **S03 Submitted:** privacy-preserving acknowledgment, next step and resend affordance; no claim that email has arrived.
3. **S03 Set new password:** new/confirm password, visibility/help, Save new password.
4. **S03 Invalid/expired/used link:** actionable explanation, Request new link; no success checkmark.

### B05 — Practical free setup

References B, D. Four light frames:

1. **S04 Goal:** primary goal and experience choices, effort familiarity optional, progress stepper, Continue.
2. **S05 Availability:** Mon/Wed/Fri selected, 45-minute session target, editable days/time, Back/Continue.
3. **S05 Equipment and units:** broad gym/home/basic equipment choices, kg/lb preference, optional considerations, free standard/manual paths. No mandatory health or sensitive demographics.
4. **S05 Constraint conflict:** clearly show an illustrative time/coverage mismatch, what cannot fit, editable constraints and a feasible alternative. Do not silently reduce essential rest to make the plan fit.

### B06 — Preview and activation

References B, D, G. Four light frames:

1. **S06 Feasible preview:** optional program name, goal/availability summary, explicit workout/rest pattern, estimated duration, first exercises, Why this fits, Edit and Activate.
2. **S06 Starting-load calibration:** unknown starting weights, manual calibration inputs with units/basis and plain effort guidance, no inferred 1RM.
3. **S06 Activation failed:** retained preview, error and Retry; explicit prior active plan remains available.
4. **S07 No program:** calm first-use Today with equally clear Generate standard plan and Build manually; no workout metrics fabricated from no data.

### B07 — Today alternatives and draft recovery

References A, B, D. Four mobile frames:

1. **S08 Planned rest, light:** Thu Sep 10 selected, Rest day, next workout Fri Sep 11, optional recovery reading, no Start missed workout as default.
2. **S08 Paused, light:** pause interval and return-planning action, neutral copy, no debt or lost-streak threat.
3. **S09 Resume, dark:** workout name/start and entered-set count, Saved on this device, prominent Resume workout.
4. **S09 Sign in to sync, dark:** retained logged rows/draft summary, Waiting to sync, Sign in to sync and return-to-local-work affordance; never cross-account exposure.

### B08 — Program structure and archive

References D, G. Four light frames:

1. **S11 Overview:** program goal, cycle week selector, workout/rest pattern, optional explicitly configured phase, Why; no guaranteed ascending loads.
2. **S11 Day detail:** warm-up separated from required/optional exercises; sets/rep range/effort/rest and estimated time, Edit future plan action.
3. **S15 Archive/library:** saved/archived items, approximate legacy checkpoint visibly qualified, view/resume/restart options.
4. **S15 Restore preview:** compare exact-checkpoint resume with legacy restart/reschedule alternative; show replacement impact and retained history; explicit confirmation. Use a legacy item for the primary example.

### B09 — Free manual authoring

References B, D. Four light frames:

1. **S12 Metadata/pattern:** optional name, goal, editable workout/rest days, duration/length where relevant.
2. **S12 Day builder:** named day, ordered slots, add/reorder/remove controls, required/optional/warm-up labels, draft status.
3. **S12 Prescription editor:** selected exercise, set count, rep range, optional effort/load, unit/basis, rest and notes; Save slot.
4. **S12 Preview/validation:** missing required field linked to offending slot; retained draft, fix and preview actions. Include a small unsaved-exit sheet with Keep editing / Save draft / Discard rather than accidental loss.

### B10 — Catalogue and exercise detail

References D, F. Four frames:

1. **S13 Search, light:** search field, equipment/pattern/muscle filters, legible result cards with equipment and selection action.
2. **S13 Empty/unavailable, light:** two clearly separated state examples within one annotated frame: no matches offers filter changes; catalogue unavailable offers retry and preserved draft. No fake result list.
3. **S14 Form detail, dark:** large neutral instructional-media placeholder, full exercise name/equipment, ordered cues, close/back, history link.
4. **S14 Missing media, dark:** readable instructions and explicit unavailable media placeholder; Add/Swap action based on calling context. No generated anatomical authority claim.

### B11 — Calendar and manual schedule control

References A, D. Four light frames:

1. **S16 Calendar:** week/month navigation and agenda, local timezone, selected date, workout/rest/partial/pending legend.
2. **S17 Occurrence detail:** original/current date and program-day identity, Move, Swap, Skip, Replace, Leave unresolved actions.
3. **S17 Scope sheet:** one occurrence versus future recurrence with effective date; move/carry example, fixed completed work identified.
4. **S18 Change preview:** original/proposed dates, planned rest preserved, fixed and unplaced work, specific concerns; Apply changes, Edit, Cancel. No unexplained compressed backlog.

### B12 — Travel, pause and honest adherence

References A, C, D. Four frames:

1. **S19 Availability, light:** temporary date interval and days available, return plan, Preview changes.
2. **S19 Timezone, light:** keep local dates versus re-place future workouts, preview showing completed/in-progress dates fixed.
3. **S20 Week report, dark:** 3 scheduled workouts: 1 full, 1 partial, 1 pending; rest listed separately, no 100% or complete-week badge. View details and hide consistency.
4. **S20 Pause report, dark:** streak preserved, no week added; explain approved schedule changes with original placement available. Calm and noncompetitive.

### B13 — Workout start, logging and finish

References D, E. Four dark frames:

1. **S21 Pre-workout:** exact dated session, accepted prescription, loading basis and warm-up, optional Check in, Start workout.
2. **S22 Active:** compact elapsed timer and Saved on this device, clear target vs actual; 12 kg per hand actual rows 10 and 9 reps, third unlogged; optional effort; Info/History/Swap; reachable Finish.
3. **S24 Partial finish:** separate illustrative exercise with 1 of 4 required sets logged; Keep training and Finish partial, explicit actual summary. Abandon is a separate less-prominent destructive choice.
4. **S24 Confirmed receipt:** synchronized partial workout, actual counts, View history; no full-workout achievement or guaranteed PR. Rest countdown, if shown, is annotated outside as optional and distinct from elapsed time.

### B14 — Neutral check-in and protected decisions

References B, G. Four light frames:

1. **S29 Neutral capture:** low/normal/high, optional deeper context, Save check-in/Skip; no readiness percentage required.
2. **S30 Pain/illness:** distinct private safety branch with Stop session / Consider rest / Adjust manually / Get help pathways. Use restrained placeholder explanatory copy and outside annotation 'Safety wording requires qualified review'; do not invent triage thresholds.
3. **S31 Proposal:** original vs proposed optional exercise volume, reason/coverage, Accept/Modify/Keep original/Later. Do not change primary load silently.
4. **S31 Rejected:** visible Keep original decision preserved, original plan still shown, start/return action. No new 'applied' badge after dismissal.

### B15 — Sensitive preferences and disclosure depth

References B, G. Four frames:

1. **S32 Preferences, light:** prompt/question settings, optional cycle support disabled by default, privacy/deletion access.
2. **S32 Cycle enabled, light:** symptom-first optional capture, irregular/unknown dates, disable future interpretation; no calendar-driven load recommendation.
3. **S36 Guided Why, light:** plain rationale, used/missing inputs, alternatives, uncertainty, expandable evidence distinct from fit confidence.
4. **S44 Depth comparison:** three compact labeled sections or screen excerpts for Essential/Guided/Advanced showing the same decision and available safety/actions. Depth is free disclosure, not a pricing tier.

### B16 — Longitudinal coaching and recovery

References C, G. Four frames, label the board outside 'Later contextual coaching':

1. **S33 Insight, dark:** comparable trend window/coverage, several possible explanations, raw-history access, insufficient-evidence caution without diagnosis.
2. **S34 Deload proposal, light:** affected dates and required/optional work diff; Accept/Modify/Postpone/Reject. No compulsory fourth-week schedule.
3. **S34 Active/reassessment, light:** accepted phase shown, progress guarded, review after completion; no automatic jump back to higher loads.
4. **S35 Recovery solver, light:** missed work and new availability, fixed work, proposed moves/rest, unplaced list, infeasible alternative, Accept/Edit/Reject plus free manual scheduling.

### B17 — Advanced generation and equipment precision

References B, D. Four light frames:

1. **S38 Advanced options:** split alternatives, ordered focus, volume/time tradeoffs and progression preferences; compare/revalidate, standard free option available.
2. **S39 Locations:** one active broad profile, detailed gym/travel profiles with premium convenience indicated, owned-data access intact.
3. **S40 Equipment configuration:** particular dumbbell collection, per-hand kg basis, discrete values 10/12/14 kg, unknown fields explicit; Save configuration.
4. **S41 Change location:** old/new machine context, affected future slots, new calibration or manual hold; history remains on original equipment, no copied nominal machine load.

### B18 — History and corrections

References C, D. Four dark frames:

1. **S25 Populated history:** filters/date groups, truthful metrics, full/partial/pending badges and session drilldown.
2. **S25 Unavailable:** last cached timestamp if available, error/retry; never 'No workouts yet' for query failure.
3. **S26 Session detail:** accepted vs actual per-set rows, partial classification, unit/loading basis, Correct record.
4. **S26 Correction preview:** editable actual value, reason, before/after, Save correction; past meaning/audit preserved and derived PR status may be recalculating.

### B19 — Comparable trends and basic progression

Reference C. Four dark frames:

1. **S27 Exercise trend:** date range, exercise and specific equipment cohort, unit-labeled chart, values/legend, source coverage and session links.
2. **S27 New machine/sparse history:** separate cohort with calibration needed; no cross-machine PR or invented trend.
3. **S28 Next target:** explained hold or rep/load alternative based on comparable full evidence; generic increment clearly labeled when precision unavailable, manual choice free.
4. **S28 Incomplete evidence:** 1 of 4 required sets logged, 'More comparable work needed' and hold/manual action; never classify success from only the logged set.

### B20 — Personal preferences, notifications and education

References B, F, G. Four light frames:

1. **S43 Personal/training:** avatar/name, goals/experience, units/timezone, optional considerations, save and future-impact preview.
2. **S45 Notifications:** actual OS permission, supported workout alerts, reminder time/quiet hours/timezone; permission denied action, no email/SMS delivery promise.
3. **S37 Library/FAQ:** clear recovery/technique topics, optional search, concise cards, reading never required for workout completion.
4. **S37 Article:** readable hierarchy, optional guidance, media fallback and source caveats; no guaranteed recovery/diagnosis.

### B21 — Privacy, exports and deletion

Reference B. Four light frames:

1. **S46 Privacy & Data:** stored-data categories, specific optional consents, export, delete imported/symptom data and account deletion entry.
2. **S47 Export processing:** server request receipt, timestamps and queued/processing states; no Download button until fulfilled.
3. **S47 Export ready/expired:** secure Download in ready state and an explicit expired-link variant annotation with Request access again; no public file URL.
4. **S48 Delete account:** data/distribution consequences, lawful safe installed-copy distinction, confirm/authentication; pending/failed status visible, no invented retention term.

### B22 — Support and verified access

Reference B. Four light frames:

1. **S49 Support composer:** issue type, description, optional safe diagnostics, Submit; no invented staffed hours or SLA.
2. **S49 Request tracking:** receipt, status timeline, retry/follow-up, real completion distinction.
3. **S50 Capability comparison:** standard/manual free features and advanced convenience clearly separated, price placeholder 'Price from store', owned outputs preserved; Continue free remains clear.
4. **S50 Downgrade/restore:** verification pending/expired state, Restore purchases and support, saved records/accepted plans/owned cosmetics retained; no assumed purchase success.

### B23 — Unlisted author workflow

References B, D. Four light frames, outside caption 'Later unlisted publishing':

1. **S51 Sanitized preview:** reusable exercises/relative targets/rest/rationale included; actual personal loads, symptoms and private notes excluded, visually explicit checklist.
2. **S51 Publish confirmation:** anyone with link/code may access; limited operational service permission, no ownership transfer; Publish and Cancel. Legal copy placeholder annotation outside.
3. **S52 Version management:** immutable version/date, distribution status, Copy link/Share/Code actions, new version path.
4. **S52 Unpublish:** new distribution stops, existing private installed routines remain where lawful/safe; confirmation and truthful pending result.

### B24 — Recipient preview and private installation

References B, D. Four frames:

1. **S53 Enter code/app preview, light:** program/author/version, equipment/time/rest/progression summary, compatibility and Install.
2. **S53 Responsive web handoff, light:** same sanitized preview in a wider 768 px frame, Open app / Get app; no private source rows. Label frame dimension outside.
3. **S54 Personal setup, light:** recipient dates/equipment and unknown starting-load calibration; explicitly private copy.
4. **S54 Activation preview, light:** new copy vs replace future active planning, preserve completed/in-progress work/history, Install and failure/retry affordance.

### B25 — Link failures and version updates

Reference D. Four light frames:

1. **S53 Invalid/revoked link:** unavailable reason, code correction/back/support as applicable, no Install success.
2. **S53 Incompatible/offline:** compatibility reason or online validation needed; existing private training still reachable.
3. **S55 Update diff:** pinned current version versus new version, changed future slots, local context retained; Keep current / Install separately / Replace future plan.
4. **S55 Distribution notice:** unpublished or quarantined source status with appropriate contact path, lawful safe private-copy continuity explained; never silently rewrite history. No selective merge control.

### B26 — Optional health permission and consent

Reference B. Four light frames, outside caption 'Optional display-only health':

1. **S56 Connection intro:** supported data types steps/distance/workout summaries, device-local default, manual training parity, Connect/Not now.
2. **S56 Permission summary:** in-app display consent separate from illustrative OS permission handoff; partial/denied authorization visible, no claimed access to unseen types.
3. **S56 Separate cloud choice:** purpose/data/deletion disclosures as reviewed-text placeholders, independent opt-in, Keep on this device default.
4. **S56 Unsupported/declined:** useful manual path, no subscription/device requirement and no zeroed fake health dashboard.

### B27 — Health display and deletion

References B, C. Four light frames:

1. **S57 Summaries:** attributed steps/relevant distance/imported workouts, last update and display-only label.
2. **S57 Stale/partial:** clear missing/stale data, unknown value rather than zero, source-level permission details.
3. **S57 Ambiguous duplicate:** two attributed summaries compared, resolve/keep separate; no invented exercise-level sets.
4. **S57 Disconnect/delete:** stop future reads/uploads, separate cached/cloud deletion choices and request status; no implied coaching influence.

### B28 — Free appearance and optional cosmetics

References B, E, G. Four frames:

1. **S58 Free appearance:** Light/Dark/System, Blue/Purple/Pink/Green/Red swatches, current selection, accessible controls; all free.
2. **S58 First-party preview:** same Today card under candidate theme, current vs preview, Cancel and Apply or purchase path; preview has not changed saved theme.
3. **S59 Purchase/restore:** price-from-store placeholder, pending verification, verified ownership then download/validation; Restore purchases, no assumed success.
4. **S59 Safe fallback:** incompatible/download-failed/refunded state clearly identified, preserved prior safe appearance; compatible owned theme remains independent of coaching subscription.

### B29 — Later public discovery

References B, C. Four light frames, outside caption 'Deferred until public operations gate':

1. **S60 Discovery:** search/filter, sanitized program cards and saved-items entry; later secondary entry, not added core tab.
2. **S60 Public program detail:** author/version, schedule/equipment, rating counts/distribution, Install/Save/Report.
3. **S60 Saved items:** private saves, unavailable source state and installed-copy access distinguished.
4. **S60 Public service unavailable:** calm fallback to private plans/training; no core outage.

### B30 — Review eligibility and lifecycle

Reference B. Four light frames, outside caption 'Later gated reviews':

1. **S61 Ineligible:** checklist: installed; two completed prescribed sessions on separate calendar days; seven elapsed days since installation. Show unmet items honestly; training never requires review.
2. **S61 Eligible editor:** exact program version, rating and text, Submit, eligibility means usage rule met only; no verified-results endorsement.
3. **S61 Pending/offline draft:** saved draft or pending moderation labeled distinctly; do not show publicly visible before validation.
4. **S61 Own review:** edit/delete, version retained and moderation state; one active review per program, no self-review by author.

### B31 — Optional public identity and activity

Reference B. Four light frames, outside caption 'Later gated social':

1. **S62 Opt-in public profile:** explicit public fields, audience preview, separate private account identity/preferences.
2. **S62 Other profile:** published programs, Follow/Block/Report; blocked/unavailable state annotation.
3. **S63 Activity share preview:** selectable allowed workout fields and audience, private health/symptoms/location excluded, Publish/Cancel.
4. **S63 Feed:** sanitized posts, restrained reactions/comments/report, no unsafe leaderboard; service-off fallback to training.

### B32 — Interactions and user safety controls

Reference B. Four light frames, outside caption 'Later gated public operations':

1. **S63 Post/comments:** parent visibility and edit/delete own content, no private workout detail exposed.
2. **S64 Report:** target preview, reason/optional detail, Submit; truthful acknowledgment after receipt.
3. **S64 Block:** practical visibility/contact consequence, confirm/cancel, no automatic deletion of private history.
4. **S64 Moderation notice/appeal:** status and reason scope, contact/appeal route and tracked submission; no other users' private evidence.

### B33 — Internal moderation surfaces

Use neutral operational styling consistent with app tokens. Four desktop frames at approximately 1440 × 1000, outside caption 'Proposed internal tooling; may map to existing service':

1. **S66 Queue:** severity/status filters, cases, age, ownership/capacity indicators; no invented service targets.
2. **S66 Case:** reported public artifact/version, permitted context, distribution state, audit and allowed quarantine/review actions.
3. **S66 Action confirmation:** scope/consequence/reason, authorization boundary, audit receipt; no private training rewrite.
4. **S66 Appeal/capacity:** appeal detail/history and capacity gate to delay/disable affected public feature; core training remains independent.

### B34 — Internal support and fulfillment

Neutral operational styling. Four desktop frames at approximately 1440 × 1000, outside caption 'Proposed internal tooling; may map to existing service':

1. **S65 Request queue:** support/export/delete/purchase exceptions, state, timestamps, assigned owner and filters.
2. **S65 Case detail:** authorized minimum account/request context, user issue, actions and audit; no raw sensitive payload in general queue.
3. **S65 Fulfillment:** receipt → processing → verified completion or retryable failure, export artifact access restricted, no timestamp-only success.
4. **S65 Purchase reconciliation:** provider verification status, restore/refund exception and support resolution; redact receipt secrets, no editable field that grants entitlement arbitrarily.

### B35 — Critical state stress test

References D, E. Four dark frames:

1. **S22/S31 Late amendment:** logged actual rows preserved; pending amendment affects only unlogged/future work, explicit Accept/Keep original.
2. **S23 Swap after logging:** original exercise with its logged rows remains; replacement is a separate unlogged slot with new calibration and session/future scope.
3. **S18 Revision conflict:** two date-change candidates, original fixed work, compare and re-preview; no silent last-write-wins.
4. **S09/S24 Offline finish:** saved-on-device partial summary, waiting-to-sync/retry state, no duplicate session or full-complete badge.

### B36 — Accessibility and cross-mode review

References D, E. Four variants of the same S22 workout, identical example data:

1. **390 px light:** target/actual rows, readable full exercise name, labeled controls, per-hand kg.
2. **390 px dark:** equivalent contrast and hierarchy, non-color logged state.
3. **320 px narrow, enlarged text:** reflowed rows and action group, no horizontal clipping or hidden unit/effort labels.
4. **Keyboard open:** active numeric field visible, reachable next/log action and finish safely separated, timer never covering inputs. Annotate screen-reader focus order outside, do not simulate verification.

## Coverage map and completion check

| Surface families | Boards |
|---|---|
| S01–S03 | B03–B04, B07 |
| S04–S06 | B05–B06 |
| S07–S10 | B02, B06–B07, B35 |
| S11–S15 | B08–B10 |
| S16–S20 | B11–B12, B35 |
| S21–S24 | B13, B35–B36 |
| S25–S28 | B02, B18–B19 |
| S29–S32 | B14–B15, B35 |
| S33–S36 | B15–B16 |
| S37–S41 | B17, B20 |
| S42–S45 | B02, B15, B20 |
| S46–S50 | B21–B22 |
| S51–S55 | B23–B25 |
| S56–S59 | B26–B28 |
| S60–S64 | B29–B32 |
| S65–S66 | B33–B34 |

The pack specifies 36 boards × 4 panels = 144 panels, including component studies, alternate states, operator concepts and accessibility variants; it does not imply 144 unique app routes. Later/gated boards are separately labeled, not core-launch requirements. Repeated surfaces deliberately test distinct states. For additional variants listed in the requirements catalogue, reuse the relevant board's layout and generate only the changed state.

Before accepting a board, check every listed frame/action exists, exact labels and fictional dates/counts agree, targets and actuals are separate, state badges are truthful, free/manual alternatives remain, no private data leaks into publication, and no unsupported feature entered from a style reference. Generated images often distort text and counts: correct them against the written brief before treating the wireframes as accurate. Image output alone cannot verify interactions, accessibility, backend guarantees or instructional-media correctness.
