# AP-02/AP-03 remaining manual release verification - 2026-09-14

## Execution boundary and build binding

**iOS-FIRST — native candidate preparation remains open; no manual passes recorded.**
The earlier handoff incorrectly treated available Android tooling as the release
target. The user's focus is iOS. Android artifacts are supplementary evidence;
they do not establish iOS readiness or create an Android testing requirement.
The iOS Metro export passed, but no signed iOS native candidate or physical
iPhone result has been verified for this packet.

| Binding | Required value before execution |
|---|---|
| Reviewed shared source | `42f317d66baa171d5fc5f80d6810ed9c31c46277`; subsequent documentation edits do not create a native artifact |
| Integration evidence | `7cdf598d4fb7a93a882c09448b67807409e669e3`; shared application/SQL and Android build-tooling integration |
| Target | iOS on physical iPhone; record supported OS versions, device model and exact OS build |
| iOS native artifact | Not yet prepared/verified; bind source, build identifier, artifact hash, bundle ID, signing and installation channel before handoff |
| iOS backend route | Not yet verified; the prepared Supabase/proxy services use workstation loopback and are not directly reachable from an iPhone |
| Prepared backend / fixtures | Local PostgreSQL 17.6, fresh four-migration reset, 52 catalog names, synthetic A with three programs and empty B; bind these to a reachable nonproduction iOS test environment |
| Required QA variants | Separate identified iOS bundles with both `EXPO_PUBLIC_AP02_DURABLE_WRITER` and `EXPO_PUBLIC_AP03_ATOMIC_WRITER` enabled, and both disabled; not yet built |
| Evidence directory | `C:\Users\dani2\AppData\Local\AdaptivPush\release-evidence\2026-09-14` |
| Production project / writers | `thfxcvxcsfvrzdysdnkq`; both writers remain disabled; this checklist does not authorize an early migration |

Changing an `EXPO_PUBLIC_` flag requires a rebuilt or freshly generated bundle
with that value. An environment-variable edit does not prove an already running
bundle changed. Results must identify the variant used. Do not run flag-on QA
against production while its durable-record migrations remain unapplied.

## Setup and evidence responsibilities

### Prepare the iOS candidate before user testing

Coordinator-owned preparation is still required:

1. Establish the actual iOS bundle identity, signing and build route using
   Xcode/macOS or a configured authenticated cloud build service. Bind the
   resulting installable development candidate to reviewed source and the
   intended physical iPhone. Do not invent Apple identifiers or signing assets.
2. Verify an iPhone-reachable nonproduction backend and controlled fault route.
   Workstation `127.0.0.1` and the Android USB reverse launcher do not supply
   this route. Preserve synthetic fixtures and keep credentials private.
3. Build and identify enabled/disabled iOS variants. Verify their bundled
   configuration and cold launch without Metro before handing them to the user.
4. Provide the verified iOS installation and connection instructions with the
   candidate. Preserve application storage when switching configurations for
   recovery cases. Then the user can execute the matrix on iPhone.

The existing `scripts/Build-ApManualQa.ps1` and `scripts/Start-ApManualQa.ps1`
are Android helpers and are not iOS setup instructions. No Android device is
required to complete this iOS release packet.

### Fault controls and synthetic fixtures

These controls are prepared locally but are not yet bound to an iPhone-reachable
test route. The proxy binds loopback, forwards only to local Supabase, and logs no headers
or payloads. Set a mode in another PowerShell terminal:

```powershell
Invoke-RestMethod -Method Put -Uri http://127.0.0.1:54329/__qa/mode -ContentType application/json -Body '{"mode":"offline"}'
```

Use `normal` to reconnect; `lose-next-write` immediately before M11's Finish
consumes the next successful RPC response; `legacy-reader` simulates missing
modern reader columns; `missing-schema` simulates PostgREST missing relations.
Restore `normal` after each case. These labeled error simulations do not prove
real old-client compatibility. M21's unavailable legacy build/environment stays
BLOCKED until supplied. Normal forwarding and HTTP 503/400/404 fault modes were
verified nonvisually. Capture loading during a cold load or outage/retry; no
unimplemented delay fixture is assumed. M15 uses a second A session to advance
the active revision; record BLOCKED if that environment is unavailable.

A has `AP QA Loads` (active V2, four weeks/two days, three sets per slot across
external zero/bodyweight/assistance/unknown kinds), `AP QA Exact Archive` (V2
archive with six elapsed days and the original start retained), and
`AP QA Legacy Approximate` (V1 approximate week 2, four trainable reader days).
B has no programs. Generated/manual installation cases create their own
programs and may archive the initial active fixture; restore the named load
fixture for M07. Create actual partial history through M05/M06 before M16.
Safe fixture identities are in `manual-accounts-manifest.json` and
`manual-program-fixtures.json` in the artifact directory. The local fixture
scripts preserve existing fixture programs on repeated runs.

Verify the chosen iOS test connection before executing network cases. Do not
assume a shared Wi-Fi network makes workstation loopback reachable. Configure
credentials through the existing secure local mechanism; do not copy secrets,
connection strings, private records, raw request bodies, or authentication
screens into reports. Never use production customer accounts as fixtures.

The tester records visible behavior. The coordinator performs the accompanying
nonvisual checks against the synthetic local fixtures and attaches redacted
counts, receipt/revision relationships, and state comparisons. These supporting
checks are not additional manual SQL work for the user. Existing deterministic
contract, identity, atomicity, concurrency, RLS, grant, direct-write-denial, and
catalog proofs remain in the automated release report and are not repeated here
as manual tasks.

| Required resource | Coverage and availability |
|---|---|
| Physical iPhone and supported iOS version | Primary required platform for this release. Bind the native build, device model and exact OS version; declare and cover supported iOS versions. Native build/device verification remains open. |
| Accounts A and B | Distinct synthetic accounts; A has recognizable test programs and draft, B has different or empty data. Sign in through the actual app. Credentials stay local. |
| Program fixtures | One generated program; one two-day manual program; a partly completed V2 program with an exact checkpoint; one legacy approximate archive; one legacy active program; empty account. All fixture IDs and expected states belong in the coordinator's local manifest. |
| Workout/load fixtures | At least three sets in one slot and a second exercise; explicit external zero, bodyweight, assistance, and unknown-load cases where the current UI supports them. Do not fabricate unsupported controls; have the coordinator supply a valid synthetic fixture for a semantic type that has no selector. |
| Network controls | Airplane mode/Wi-Fi toggling, backend-only interruption while Metro stays reachable, and delayed/lost-response fixture controlled by the coordinator. A development-server disconnect alone does not prove backend offline behavior. |
| Conflict and compatibility environments | Second device/session for A; isolated legacy-schema/missing-schema targets and identified legacy build supplied by coordinator. Never drop production schema to create a fixture. |
| Accessibility | iOS Dynamic Type, supported Display Zoom settings, VoiceOver and Reduce Motion; physical touch and system light/dark controls. |

All device cases below apply to physical iPhone and the bound iOS candidate.
Android coverage is supplementary and does not gate this iOS release.
Every numbered case below requires a result. Record `BLOCKED` when a required
environment is unavailable, with the missing dependency; do not use `PASS` or
silently omit it. Unless a case explicitly says observation-only, failure blocks
its phase. For device cases, pass requires all listed visible and persistence
criteria, no crash, no unexpected account data, and no duplicate or lost record.

## Required before production migration

### M01 - Supported development build and Expo Go comparison

- Preconditions: Bound iOS native development build on physical iPhone; compatible iOS Expo Go available for comparison; reachable nonproduction QA backend and A.
- Actions: Launch the bound development app from cold; sign in; visit Home, Plan, and Profile; open a workout from Home. Separately open the same project's development URL in Expo Go, record its actual SDK/native-module support message, and return to the native app.
- Expected visible behavior: Native app reaches usable training screens without a red error screen. Expo Go limitations are explicit; an unsupported Expo Go runtime is not treated as the release runtime. The native build remains usable after the comparison.
- Persistence/pass: No account or program is changed just by inspecting runtimes. Pass requires successful native launch and an accurately classified Expo Go result; Expo Go need not support unavailable native features.
- Evidence/blocking: App/build information and redacted screen recording of both launches; blocks migration. Missing physical hardware or native build is `BLOCKED`.

### M02 - Generated program installation

- Preconditions: A on flag-on build with local catalog fixtures; record its initial active program or empty state.
- Actions: Plan > Generate Personal Program, or program menu > Generate New Program. Select the available days, duration, goal and equipment; tap Generate My Program. Name it `QA Generated A`, tap Save Program, and attempt a second tap while saving. Reopen Plan and View Full Program.
- Expected visible behavior: Saving state prevents accidental repeated work; one named program appears with all displayed days/exercises and usable workout entry. Existing program replacement is clear; no success message accompanies a partial hierarchy.
- Persistence/pass: Coordinator confirms one active program, one install outcome, complete hierarchy and generation context; the old active program is preserved as appropriate. Pass requires the visible plan to match that hierarchy after reload.
- Evidence/blocking: Before/after Plan and full-program recording plus redacted coordinator result; blocks migration.

### M03 - Manual program installation

- Preconditions: A, flag-on build, catalog fixture; two training days and at least one exercise per day.
- Actions: Plan menu > Create Custom Program (or Create Program when empty). Enter `QA Manual A`, goal, two days and duration; Continue. Name both days; Continue. Add Exercises, choose catalog exercise, enter Sets, Rep min/max and optional RPE/load, then Add To Day. Repeat for the second day. Tap Create Program; reopen Plan and both days.
- Expected visible behavior: Required-field errors explain how to correct omissions. Successful save displays both authored days and exact entered prescriptions; optional blank load is not silently converted into claimed actual work.
- Persistence/pass: One complete active installation, prior program retained, no orphan hierarchy or duplicate install. Pass requires authored values and all days to survive reload.
- Evidence/blocking: Form-to-Plan recording and redacted installation comparison; blocks migration.

### M04 - Disabled writers reject before unintended mutation

- Preconditions: Bound flag-off variant, same synthetic backend; A has a known active program and saved draft. Coordinator captures safe before-state.
- Actions: Attempt generated Save Program, manual Create Program, Finish Workout > Finish, End Current Program > End Program, Restore Program, and a swap with Also update future uncompleted workouts enabled. Read each response; reopen the original Plan/draft. Do not mistake a current-only local swap for an accepted future server update.
- Expected visible behavior: Each disabled server writer reports unavailable/not enabled and does not claim server success. Existing work remains available. If a current-only swap was saved, the message distinguishes that local result from the rejected future update.
- Persistence/pass: Coordinator verifies no unintended server mutation, including profile/context writes before rejection, no new install/finalization/lifecycle receipt, and no active-program loss. Local drafts may remain safely stored. Pass requires all attempted writer entry points to reject accurately.
- Evidence/blocking: Responses and safe before/after comparison; blocks migration. Restore the bound flag-on variant afterward.

### M05 - Actual set entry and complete finalization

- Preconditions: A, flag-on build; fresh workout with at least two exercises and multiple sets.
- Actions: Home workout card > open workout; compare title with Plan's same day. Enter distinct LBS, REPS and RPE values per set, tap each set's checkmark, and inspect the locked entered values. Tap Finish Workout > Keep Going once; then Finish Workout > Finish. Reopen Plan and History.
- Expected visible behavior: Displayed prescriptions are not presented as logged actuals before confirmation. Keep Going preserves the draft. Saving is clear and repeated confirmation is prevented. Successful completion returns to usable navigation and appears once with actual entries.
- Persistence/pass: Exactly one finalization/receipt and the entered actual sets; expected completion classification; no doubled history after reopening. Coordinator ties the visible workout to its frozen identity.
- Evidence/blocking: Entry, cancellation, finalization and History recording; blocks migration.

### M06 - Partial and empty workouts

- Preconditions: Fresh multi-set workout with unlogged prescriptions.
- Actions: Try finishing before logging any valid set; record the available guard. Enter/log only one set, leaving the rest untouched; Finish Workout > Finish; reopen Plan/History.
- Expected visible behavior: Empty work does not become a completed workout. The one-set workout is visibly partial wherever its outcome is shown and is never described as full prescription fulfillment. Unlogged sets remain unperformed.
- Persistence/pass: Coordinator confirms partial classification and only the actually logged set; no invented actual values or full-completion claim. Pass requires visible and stored classification to agree.
- Evidence/blocking: Empty-state guard and partial outcome recording plus coordinator result; blocks migration.

### M07 - Zero, bodyweight, assistance, and unknown load display

- Preconditions: Coordinator supplies the listed semantic fixtures; actual visible controls and supported input units are recorded.
- Actions: In an external-load slot enter `0` with valid reps and log it. In the bodyweight fixture log valid reps using its supported entry path. Inspect assistance and unknown fixtures, edit only through available controls, reload, then finalize valid entries. For a slot requiring load, leave it blank and attempt confirmation; enter a valid value after the guard.
- Expected visible behavior: Explicit zero survives; bodyweight does not require inventing external weight; unknown is distinguishable from zero; assistance is not silently reclassified as external load. Missing required load produces a corrective message rather than fabricated work.
- Persistence/pass: Coordinator matches each logged semantic kind/value after reload and finalization. Unsupported UI representations must be reported as an exact blocker or bounded limitation, not recorded as tested.
- Evidence/blocking: Before/reload/after inputs and redacted semantic comparison; blocks migration for any supported load path that loses meaning.

### M08 - Reload and background/foreground draft recovery

- Preconditions: Unsubmitted draft containing one logged set and one distinct unlogged edit.
- Actions: Record the values. Use Expo development Reload, reopen the same workout; then send the app to background for at least one minute and foreground it. Navigate back to Plan and reopen the same day.
- Expected visible behavior: Correct workout, logged status, exact edits and original prescriptions reappear. No substitute workout, reset, false completion, or unexplained duplicate is shown.
- Persistence/pass: Coordinator confirms the same draft/set identities and values. Pass requires recovery at each transition, not merely the final one.
- Evidence/blocking: Continuous recording with pre-transition values; blocks migration. iOS background/foreground lifecycle evidence is required.

### M09 - Kill/reopen and cold launch

- Preconditions: Same kind of saved draft as M08; development bundle available for the intended cold-start configuration.
- Actions: Kill the app through the OS app switcher; reopen from its launcher icon; inspect the same workout. Repeat after stopping the process completely using the OS's supported controls, then cold-launch. Do not clear app data or reinstall.
- Expected visible behavior: Owner's draft and edits recover on both paths with usable navigation; no indefinite loader or unrequested new workout.
- Persistence/pass: Same draft and set identities survive; no server completion merely due to launch. Pass requires actual process restart, not only backgrounding.
- Evidence/blocking: OS kill/launch and recovered values recording; blocks migration. Physical iPhone kill/relaunch evidence is required.

### M10 - Offline entry and reconnection

- Preconditions: Open cached workout while signed in; coordinator confirms backend interruption can be separated from Metro availability.
- Actions: Disable backend connectivity; edit and log a valid set. Navigate away/back and kill/reopen while offline with an available bundle. Try Finish Workout > Finish offline; read the pending message. Reconnect, press Retry Sync > Finish, and reopen History.
- Expected visible behavior: Exact draft remains available offline. Pending/unavailable status does not claim completion. After reconnection the submission reaches one truthful success or a clear recoverable conflict; no lost values or endless silent spinner.
- Persistence/pass: No remote completion during confirmed offline period; one finalization after successful reconciliation. A coordinator-supported same-operation retry must retain original submitted content.
- Evidence/blocking: Network state, pending message, recovered values and final History plus coordinator receipt comparison; blocks migration.

### M11 - Lost response and pending submission recovery

- Preconditions: Coordinator arms the synthetic lost-response fixture for a finalization; original server success may precede client acknowledgment.
- Actions: Enter/log a valid set; Finish Workout > Finish; wait for the withheld-response outcome. Kill/reopen, inspect pending state, then press Retry Sync > Finish. Attempt to edit the submitted set while pending.
- Expected visible behavior: App distinguishes pending acknowledgment from confirmed completion. Submitted content is protected until resolved. Retry ends with the original success and one visible workout, not an endless conflict or a second workout.
- Persistence/pass: Coordinator verifies the same operation payload/identity and single receipt; no duplicate set, finalization, or altered submitted value. No manual database manipulation by the tester is required.
- Evidence/blocking: Pending-to-recovered recording and redacted coordinator identity result; blocks migration.

### M12 - Current-only swap before any logged sets

- Preconditions: Unsubmitted workout; record original exercise and future plan prescriptions.
- Actions: Exercise card > Swap; select a valid alternative; leave Also update future uncompleted workouts off; tap Swap Exercise. Inspect replacement load guidance, return to Plan, and reopen the same workout.
- Expected visible behavior: Current replacement and recalibration guidance survive reopening. Future plan remains unchanged; no whole-program change is implied.
- Persistence/pass: Same current draft/slot lineage with a local amendment; no successor program revision. Pass requires future unchanged and current replacement preserved.
- Evidence/blocking: Toggle state, before/after current and future views; blocks migration.

### M13 - Partial swap, completed-set attribution, and recalibration

- Preconditions: One logged original set; at least two unlogged sets in the same slot.
- Actions: Swap to another exercise with future switch off. Cancel Recalibrate replacement? once, confirm original remains; repeat and choose Swap and recalibrate. Inspect completed-original explanation. Enter distinct replacement loads or use the displayed Use ... lb action; explicitly confirm recalibration. Log remaining sets; inspect History after finalization.
- Expected visible behavior: Completed original sets keep original attribution/values; unlogged replacement loads are cleared until explicit confirmation. Cancel does nothing. The confirmation states its current-workout scope and clears the required-action state only after valid input.
- Persistence/pass: Coordinator confirms original logged exercise identity and replacement identity for later sets; frozen prescription provenance remains intact. No automatic load inheritance without the displayed explicit action.
- Evidence/blocking: Cancel/confirm, attribution text, entered loads, and history recording; blocks migration.

### M14 - Future immutable swap and current-workout protection

- Preconditions: Current draft has a logged set; future uncompleted instance of the slot exists; record current and future values.
- Actions: Swap a remaining current exercise, enable Also update future uncompleted workouts, and confirm. Inspect current draft, Plan > View Full Program and future instance; reload and reopen current draft.
- Expected visible behavior: Message distinguishes saved current amendment from successor update. Current logged sets and frozen prescriptions retain their original facts; future instance shows replacement and applicable recalibration need. Completed historical work is unchanged.
- Persistence/pass: One immutable successor revision; earlier revision retained; current draft remains bound to its original revision. Coordinator confirms future scope excludes completed work.
- Evidence/blocking: Toggle, success message, current/future views and redacted revision relationship; blocks migration.

### M15 - Future conflict and partial-success communication

- Preconditions: Coordinator opens a second A session and advances the program after the first session loaded its revision, or arms the supported future-update failure fixture.
- Actions: On the first device request current-plus-future swap; read the result; reopen current workout and future plan. Retry only through the offered action after refreshing current state.
- Expected visible behavior: Conflict/failure is explicit; locally saved current swap is distinguished from failed future update. The user can continue current work or refresh safely. No claim that all future workouts changed when they did not.
- Persistence/pass: Current draft remains safe; no overwritten newer revision or duplicate successor; coordinator verifies actual partial outcome. Pass requires a clear visible path out of the conflict.
- Evidence/blocking: Both sessions' sequence and failure/retry messaging; blocks migration. Missing conflict fixture is `BLOCKED`.

### M16 - Archive and exact checkpoint restore

- Preconditions: Partly progressed V2 program with an exact revision/checkpoint; coordinator records active week, dates and completion facts.
- Actions: Plan menu > End Current Program > Cancel once; confirm no change. Repeat > End Program. Open Archived Programs > Restore Program > Resume exact checkpoint. Inspect Plan, View Full Program and completed/remaining workouts; reload.
- Expected visible behavior: Archive removes it from active view while preserving an archived entry. Exact restore is offered for exact provenance and resumes the recorded point, not Week 1 or an estimated date. Cancel does not archive.
- Persistence/pass: Same intended program/revision/checkpoint, dates and completion lineage; one active program; historical sessions remain. Coordinator compares checkpoint fields exactly.
- Evidence/blocking: Pre-archive, cancel, archive list, restore choice and restored plan; blocks migration.

### M17 - Restore replacement, restart, and legacy approximation

- Preconditions: Active program B plus archived exact program A and legacy approximate fixture.
- Actions: Restore A using Resume exact checkpoint while B is active; inspect Archived Programs for B. Archive A and restore using Restart from Week 1. Inspect legacy archive's Restore Program choices; choose Resume near week ... if offered.
- Expected visible behavior: Active replacement is explained; B is preserved. Restart starts at Week 1 with history retained. Legacy approximation is explicitly described and never called an exact checkpoint or invented historical date.
- Persistence/pass: Exactly one active program after each action; exact/restart/legacy modes match chosen semantics and preserve history. Coordinator records expected date differences for restart.
- Evidence/blocking: All three choice dialogs and resulting plans; blocks migration. Legacy fixture unavailable means its subcase is `BLOCKED`.

### M18 - Archive/restore interruption and retry

- Preconditions: Coordinator arms a lost-response or transient-failure fixture for archive, then separately restore.
- Actions: End Program during the fixture; kill/reopen; inspect active/archive lists; retry if offered. Repeat for Resume exact checkpoint and reopen again.
- Expected visible behavior: Calm pending/error state or reconciled success matches the actual outcome; no permanent disappearance, contradictory active/archive display, or repeated restart. User sees how to refresh or retry.
- Persistence/pass: Same lifecycle operation resolves once with exact checkpoint preserved; only one active program. Coordinator supplies receipt comparison.
- Evidence/blocking: Both interrupted lifecycle recordings and coordinator result; blocks migration.

### M19 - Stale and malformed routes

- Preconditions: Coordinator supplies a valid local workout link, a stale revision/day link, a malformed-ID link, and an A-owned link for M20. Link values contain synthetic identifiers only.
- Actions: Open valid link and compare its title with Plan. Open stale and malformed links separately; tap Retry, then Return to Plan, then select a valid workout.
- Expected visible behavior: Invalid targets show Workout unavailable with a useful explanation. They do not silently open a different current workout. Retry and Return to Plan remain reachable and recover navigation.
- Persistence/pass: Opening an invalid route does not create/finalize another workout or modify a draft. Pass requires each invalid category to fail closed visibly.
- Evidence/blocking: Synthetic link type and unavailable/recovery recording; blocks migration.

### M20 - Actual account switch and isolation

- Preconditions: A has a distinctive draft, pending operation and archive; B has different data. Offline sign-out behavior is recorded separately from online session switching.
- Actions: Record A's values; Profile > Log Out; sign in as B through the login screen. Open Home, Plan, History and Archived Programs; attempt A's supplied link. Kill/reopen as B. Log out and sign back into A; inspect its draft and reconcile pending work.
- Expected visible behavior: B never sees A's values, route contents, banners or queued writes. A's data returns only after A signs in. Session transition shows usable loading/empty states rather than stale owner content.
- Persistence/pass: No operation changes owner; B does not replay A's pending work. A's exact draft survives unless explicitly finalized. Coordinator checks synthetic owner isolation without exposing records.
- Evidence/blocking: Redacted actual sign-out/sign-in and screen sequence, excluding credentials; blocks migration.

### M21 - Legacy reader and schema compatibility

- Preconditions: Identified old-client build, legacy rows in isolated migrated target, and separate legacy/missing-schema local target; coordinator supplies safe build/backend switching instructions.
- Actions: In the new bound build read the legacy active/archive/history fixtures. In the legacy build read migrated-backend training/history as supported without enabling unsafe writers. In the new flag-off variant connect only to the isolated missing-schema fixture, open Home/Plan/History, and attempt an unavailable durable action.
- Expected visible behavior: Legacy data remains readable or accurately labeled approximate; the old client retains its supported reading paths without crashes. Missing schema shows a controlled unavailable/compatibility state, not blank success, false empty data, or an endless loader.
- Persistence/pass: No destructive rewrite or fallback unsafe multiwrite; coordinator verifies no unintended mutations. Pass is limited to the explicitly identified client/backend combinations.
- Evidence/blocking: Both build IDs and safe backend aliases with recordings; blocks migration. Missing old build or isolated target is explicitly `BLOCKED`.

### M22 - Loading, empty, unavailable, retry, and error states

- Preconditions: Empty B; populated A; local proxy normal/offline controls and a cold-load recording.
- Actions: Visit Plan and Archived Programs as empty B. As A, record a cold load, then repeat with the proxy offline; restore normal mode and press Try Again/Retry/Refresh as displayed; search for a nonexistent exercise in Add Exercise, then clear the search. Review pending/partial/conflict/success evidence from M06/M10/M15/M05.
- Expected visible behavior: Loading resolves; empty has an actionable explanation; outage is not mislabeled empty; retry can recover; no-result search clears correctly. Each pending, conflict, partial and success state has truthful text and usable controls.
- Persistence/pass: Reads/retries do not lose or duplicate work. Pass requires evidence for every named state; cross-reference the existing case recording instead of repeating it.
- Evidence/blocking: State-to-case evidence index and any missing state recording; blocks migration.

### M23 - Large text and Dynamic Type

- Preconditions: Physical iPhone at supported accessibility Dynamic Type sizes and Display Zoom settings.
- Actions: Open Plan menu, generated/manual forms, workout set fields, swap/recalibration, Finish modal, archive/restore dialog and Profile. Complete one set and cancel a restore. Show the keyboard and scroll to every required control.
- Expected visible behavior: Essential exercise identity, values, warnings, buttons and modal choices remain readable and reachable without clipping/overlap or hidden confirmation. Long names have an accessible way to read their full identity.
- Persistence/pass: Text-size changes do not change stored values or trigger unintended actions. Pass requires completing the flow without reverting text size.
- Evidence/blocking: OS scaling settings plus each affected screen; blocks migration for training/recovery accessibility defects. Unavailable iOS Dynamic Type evidence remains `BLOCKED`.

### M24 - VoiceOver, labels, and focus order

- Preconditions: Physical iPhone with VoiceOver enabled on the bound iOS build.
- Actions: Navigate by screen-reader gestures from Plan into a workout. Identify each exercise, set number, LBS/REPS/RPE input, log-state control, History, Swap, future switch, recalibration button, Finish controls, archive Back/Refresh and Restore choices. Enter/log one set, open/close a modal, and trigger one pending/error state.
- Expected visible behavior: Spoken names identify purpose and context; role and checked/disabled state are correct; focus order follows the task; modal focus stays usable and returns sensibly. Status changes are perceivable. No critical control is an unlabeled icon or unreachable.
- Persistence/pass: The intended set alone changes; screen-reader activation does not double-submit. Pass requires completing capture/recovery without sighted assistance.
- Evidence/blocking: Recording with spoken announcements and device accessibility settings; blocks migration. Physical iPhone VoiceOver evidence is required.

### M25 - Physical touch and non-color status

- Preconditions: Physical device at default and enlarged display sizes; logged/unlogged, pending, conflict, disabled and success fixtures available.
- Actions: Tap each dense set input/checkmark and neighboring History/Swap controls deliberately; operate menu close/back and archive controls. Inspect the same status screens in grayscale or system color-correction mode, including selected appearance and future-update switch.
- Expected visible behavior: Intended targets can be selected reliably without adjacent actions; critical targets meet the declared platform touch-area policy. Logged/pending/error/success/selected states remain distinguishable by text, icon, shape or announcement, not color alone.
- Persistence/pass: Only intended fields/actions change. Pass requires no accidental adjacent operation and comprehensible status with color removed; record exact problem controls if failing.
- Evidence/blocking: Touch demonstration and non-color screenshots; blocks migration. Coordinator supplies any nonvisual target measurements, rather than asking the user to inspect source.

### M26 - Haptics disabled and reduced motion

- Preconditions: Physical device; Profile > Appearance > Haptic Feedback off; iOS Reduce Motion setting on.
- Actions: Change tabs, log a set, open/close swap and finish modals, trigger success, and cold-reopen. Repeat a keyboard/form transition with reduced motion enabled.
- Expected visible behavior: No app haptic feedback occurs when disabled; confirmations remain clear through text/visual/speech. Essential navigation and status work with reduced motion, without required motion cues or disruptive animation.
- Persistence/pass: Settings survive supported reopen behavior and do not alter workout data. Pass requires hardware observation; emulator lack of vibration is insufficient.
- Evidence/blocking: Settings screenshots plus observed haptic/motion behavior; blocks migration for supported accessibility preferences.

### M27 - Light, dark, and system appearance

- Preconditions: Physical device with supported OS appearance switching.
- Actions: Profile > Appearance > Light; inspect Plan, workout inputs, swap/recalibration, archive/restore and error/pending banners. Repeat Dark. Select System, switch OS appearance with the app foreground and background, then reopen.
- Expected visible behavior: Text, keyboard context, inputs, disabled buttons, borders and warnings remain legible; active selection is clear; system choice follows OS changes without losing work. No essential state depends solely on a theme color.
- Persistence/pass: Appearance choice persists as designed; draft values remain exact. Pass requires all three modes and both status/normal screens.
- Evidence/blocking: Mode/settings and representative screen/state evidence; blocks migration.

## Required before enabling production writers

All blocking M cases must already pass for the exact final revision and supported
platform scope. Fresh encrypted backup, authenticated isolated restore, exact
two-migration dry-run/application, production verification and integration remain
coordinator-owned nonvisual gates. They are not satisfied by this checklist.

### W01 - Real distribution candidate and environment identity

- Preconditions: Release owner supplies actual application IDs, EAS/deployment configuration if used, signing, artifact identity, production target and disabled-writer release candidate. No temporary guessed identity is accepted.
- Actions: Install through the intended distribution channel on physical iPhone across the supported iOS versions. Cold-launch, sign in with the approved release test account, inspect identity/environment evidence, open Plan/History, and verify the disabled action message before enablement.
- Expected visible behavior: Correct app and backend; supported login/navigation; existing records readable; no local-only configuration shipped accidentally.
- Persistence/pass: No server writes from disabled actions. Coordinator corroborates exact target and deployed flag configuration. Pass requires the actual distributed candidate, not an unrelated local development artifact.
- Evidence/blocking: Distribution/build/commit identifiers and redacted launch/read/disabled action evidence; blocks writer enablement.

### W02 - Rollback rehearsal and safe recovery

- Preconditions: Same release candidate rehearsed in isolated staging/local environment; coordinator controls rollout flags and monitors safe synthetic operations. Production writers remain off during rehearsal.
- Actions: With test writers enabled, create a draft and pending operation. Follow coordinator's disablement/rebundle instructions; reopen, attempt submit, read the rejection, and inspect existing history. Re-enable only in the isolated rehearsal environment; recover the pending draft through the supported path.
- Expected visible behavior: Disabled producers reject clearly while drafts/history remain accessible. Recovery preserves exact pending contents; there is no destructive reset or false completion.
- Persistence/pass: Coordinator verifies preserved revisions, receipts, checkpoints and history and one eventual outcome; no replay storm. Pass requires both disabled-readability and resumed recovery.
- Evidence/blocking: Bound configurations and observed recovery recording with coordinator monitoring comparison; blocks writer enablement.

### W03 - Final platform and accessibility signoff

- Preconditions: Actual distributed release candidate matches verified behavior; all M cases linked to applicable platform/build and any changed areas retested.
- Actions: On physical iPhone across the supported iOS versions repeat launch, one set/finish, draft kill/reopen, archive access, and screen-reader navigation in the distribution candidate. Confirm earlier case evidence still applies; report any new packaging/runtime difference.
- Expected visible behavior: Critical flows and accessibility match the approved development behavior; no signing/distribution-specific failure or forgotten production flag state.
- Persistence/pass: Coordinator checks test-account outcome and cleanup under the authorized release procedure. Pass requires named user signoff for all blocking cases; unavailable platform cannot be assumed passed.
- Evidence/blocking: Signed result summary by platform/build and essential regression recordings; blocks writer enablement.

## Recommended post-release observation

### O01 - First real sessions and pending-age observation

- Preconditions: Release and writer enablement are separately authorized and recorded; named monitor owner and payload-free telemetry exist.
- Actions: During ordinary supported use, report unexpected pending duration, repeat-history entries, conflicts without recovery, missing history, or account-transition anomalies. Provide case/build/time and redacted screen evidence; do not send raw user records.
- Expected behavior/pass: Clear outcomes, bounded pending recovery and no duplication/data loss; coordinator correlates conflict, replay, pending age, failure and outcome-coverage telemetry. This is recommended observation, not a substitute for pre-release tests.
- Evidence/blocking: Incident-style report and safe aggregate monitoring reference. A discovered data-loss/security defect blocks continued rollout and triggers producer disablement/forward-fix; absence of reports is not proof of coverage.

## Exact release condition and remaining nonvisual blockers

AP-02/AP-03 may change from `INTEGRATION VERIFIED - RELEASE BLOCKED` to `RELEASED`
only when all blocking M and W cases pass for the declared supported iOS versions
and final bound candidate, the user explicitly confirms those results, every
automated/local database/integration/compatibility gate passes, and the final
fresh production backup decrypt/restore comparison succeeds. Production dry-run
must list exactly `20260910210000_ap02_ap03_durable_workouts_and_program_revisions.sql`
then `20260911120000_ap03_revision_safe_exercise_swap.sql`, application and
production authority/isolation/replay checks must pass, rollback must be
rehearsed, real distribution must exist, and payload-free monitoring with a named
owner must cover conflicts, replay, pending age, failures and outcome coverage.
Only then may the authorized production writer rollout occur and release be
recorded. Passing manual QA alone does not satisfy the remaining production work.

iOS native candidate preparation remains open: establish signing/build identity,
a verified install route, reachable nonproduction backend, and both flag variants
before requesting user acceptance. Physical iPhone results, an identified legacy
build with its compatibility environment, and declared iOS version support also
remain open. Local backend/accounts/fault controls are prepared; they do not by
themselves make an iOS handoff ready.
Repository `app.json` still declares `temp-app`/`tempapp` without production
package/bundle or EAS project identity; `eas.json` is absent. The generated local
Android package does not supply store identity, release signing, deployment
ownership or a distribution channel. Named persisted payload-free monitoring
and alerts for conflicts, replay, pending age, failures and outcome coverage,
and the actual rollout/rollback mechanism remain unestablished. These gates
cannot be invented by the tester.

No fresh pre-migration production recovery point or production migration is
claimed by this document. Those operations follow the user's pre-migration
manual passes. If any required resource, test result or release gate is missing,
keep both production writers off and preserve the partial status.

## Result-reporting template

```text
Test case ID / subcase:
PASS / FAIL / BLOCKED:
Device model and exact OS:
Build identifier / artifact hash / source commit:
Backend alias and flag variant (no credentials):
Observed behavior:
Expected behavior:
Reproduction steps:
Screenshot or recording reference (redacted):
Coordinator persistence-evidence reference, if required:
Missing dependency, if BLOCKED:
```

Return results with every required case ID, including blocked platform variants.
The coordinator will diagnose failures, fix in-scope defects, add deterministic
regression coverage where practical, rerun affected and complete automated gates,
rebuild and rebind the candidate, then provide the reduced affected-case and
essential-regression checklist. Until those results arrive, no manual case is
marked passed and no production migration proceeds.

## Supplementary Android build evidence

The following build evidence is retained for provenance. It does not satisfy
iOS native, device, accessibility or distribution gates. The earlier Android
launch instructions were superseded by the iOS preparation requirements above.

| Binding | Required value before execution |
|---|---|
| Source commit | `42f317d66baa171d5fc5f80d6810ed9c31c46277` |
| Integration commit / result | `7cdf598d4fb7a93a882c09448b67807409e669e3`; verified application/SQL and build-tooling integration, matching source tree |
| Android enabled APK | `42f317d-enabled.apk`, SHA-256 `C749F4CBC22EDFC5081A4DF92A09D5F7D9DE3AEBB5327774C26C905D67512FA1` |
| Android disabled APK | `42f317d-disabled.apk`, SHA-256 `F3D0DAB0CF47B5A124A2B2C219ADB76A8FF5E60BBEE1B7B29319CE61E1682226` |
| Artifact directory | `C:\Users\dani2\AppData\Local\AdaptivPush\release-evidence\2026-09-14` |
| Android application ID / version / build type | Inspected `com.dani.sch.tempapp`, version `1.0.0`/code `1`, debug signing, compiled/target API 36, minimum API 24. Existing local identity, not production identity. |
| Embedded bundles | Enabled SHA-256 `f3e71beb43081b466441b2bb2798d187fd58f6adafa60b368f88004957bcc0fc`; disabled `46e4d5a9f708280de3c8fce2c44096e6ba257f9c39b02972dd388a26ca8c4b22`; both present and verified distinct |
| Backend | Local fault proxy `http://127.0.0.1:54329` -> local Supabase `http://127.0.0.1:54321`; `supabase_db_AdaptivPush`, PostgreSQL 17.6 |
| Backend schema / fixtures | Fresh four-migration local reset; both reviewed durable migrations; 52 catalog names; synthetic A has three programs, B is empty |
| Main local QA flags | `EXPO_PUBLIC_AP02_DURABLE_WRITER=true`, `EXPO_PUBLIC_AP03_ATOMIC_WRITER=true` |
| Disabled-writer QA variant | Same revision/backend; both flags `false`; separate identified bundle configuration |
| Production project / writers | `thfxcvxcsfvrzdysdnkq`; both writers remain disabled; this checklist does not authorize an early migration |
