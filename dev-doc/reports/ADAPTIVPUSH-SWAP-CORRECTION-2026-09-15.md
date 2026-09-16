# AdaptivPush scoped swap and completed-workout correction evidence — 2026-09-15

## Result and boundary

Commits `e8163b95b8474d9b2adcd938ffaa7ee488cc7204` and `5e2c078` locally implement the requested AP-02/AP-03 extension. Commit `ec78296` makes Supabase auth storage safe during Expo Router server rendering after the web smoke check exposed that compatibility defect. Application code, unit tests, local PostgreSQL verification and an unauthenticated web-render smoke pass. Authenticated physical iPhone/end-to-end acceptance remains open.

Follow-up commits `8fff2b2`, `ae56b7f` and `eaca4f6` repair the reported current-workout/Home consistency, exercise expansion, swap interaction, user-copy and pending-operation behavior. They change no migration or hosted resource.

Migration `20260915190000_workout_swap_scope_and_completed_corrections.sql` is additive, local-only and **not hosted**. No production backup, restore, dry-run, migration, hosted security probe or writer change was performed for it. The authorization for the earlier AP-02/AP-03 rollout does not authorize this migration; any hosted rollout requires new explicit authorization and a fresh project-identity/recovery/isolated-restore/verification packet.

## Implemented behavior

- Workout and program surfaces share replacement selection, explicit `This workout only`/`Rest of program` scope and one Apply swap action. Selected-only changes one stable scheduled day/slot through an immutable successor; the wider scope covers current remaining work and later uncompleted occurrences.
- Home loads the current owner and matching draft on focus. One pure projection validates owner, program, stable day, lifecycle and draft shape before allowing that draft to override the server summary. Continue Workout serializes the draft's exact program/day/revision identities; mismatched, cross-owner, invalid and finalized drafts cannot change the button.
- Home initially renders three stable-ID exercise rows. Its accessible Show-more control exposes expanded state, preserves source order, renders every remaining row and collapses back to three.
- Logged sets retain their actual exercise and recorded load. Only unlogged sets change; original load is not copied, replacement-compatible history may supply an optional suggestion, and load kind/unit is validated during logging without a separate recalibration step.
- Swap alternatives use `FlatList` virtualization, a memoized row, stable catalog IDs/callbacks, ID-only selection, separate information controls and deferred filtering. History prefetch starts after selection and Apply only reads an already-settled suggestion. A synchronous single-flight gate rejects rapid duplicate Apply taps.
- Wider-scope Apply durably records the exact program request plus the owner/draft pending record and persists the draft before displaying the optimistic result. Program synchronization and refresh then run in the background. No-future-workouts clears pending state as success. Response loss preserves the exact request. Workout-only supersession immediately updates the draft, reconciles the older request and creates a revision-pinned reverse request only when the older request is confirmed. Pending IDs and focus generations prevent stale handlers from clearing or replacing newer state.
- Visible swap copy is limited to `Exercise swapped for this workout.`, `Updating program…`, `Workout swapped, but the program couldn’t be updated.`, `Retry`, `Keep workout only`, and `Exercise swap failed. Try again.` Detailed errors remain in the local pending record and development diagnostics.
- Edit workout is available from finalized workout/history views. Save changes can correct performed exercise, load/unit, reps, RPE and set membership; Cancel/navigation choices leave the stored workout unchanged unless Save is chosen.
- `correct_completed_workout_v1` validates owner, stable workout/set/prescription/exercise identity, expected correction revision and exact-operation replay. It atomically updates the existing finalized session, recomputes completion/volume and correction-aware record effects, and writes one internal before/after audit. It does not unlock finalization, create another session, reactivate a program or replay advancement.

Database additions are `workout_sessions.correction_revision`, `workout_sessions.corrected_at`, `workout_correction_receipts`, `workout_correction_audit`, `revise_program_exercise_occurrence_v1(jsonb)` and `correct_completed_workout_v1(jsonb)`. Ordinary table writes are denied; authenticated execution and owner-scoped receipt reads are explicit.

## Verification evidence

| Gate | Observed result |
|---|---|
| `npx tsc --noEmit` | Passed strict TypeScript. |
| `npm run lint` | Passed with three pre-existing warnings and no new lint error. |
| `npm run test:ap02-ap03` | Passed 60 combined dependency/workout/program tests. |
| Focused repair cases | Passed 10 projection, route, draft isolation, Home expansion/order, history non-blocking, duplicate Apply and recovery-classification cases. |
| `npx supabase db reset --local` | Passed and applied all committed migrations through `20260915190000`. |
| Direct `psql -X -q ... -v ON_ERROR_STOP=1` for `ap_01_3_catalog_authority_isolation.sql`, `ap_02_ap_03_atomicity_and_isolation.sql`, `ap_03_program_revision_swap.sql` and `workout_swap_and_correction.sql` | All four committed SQL suites passed. The AP-03 successor-revision suite also passed its legacy-schema variant. |
| `npx supabase db lint --local --level warning` | Passed with no warnings. |
| Normal Expo startup and web smoke at `http://localhost:8099` | Metro started, exposed its LAN Expo Go QR, bundled 3,450 web modules, and rendered the welcome/sign-in screen with 121 visible text characters, no error overlay and no captured browser console error. Existing development warnings for web notifications and deprecated shadow props remain. |

## Root causes and responsiveness evidence

Home previously summarized only the server prescription and did not read a local draft, so it could neither display a workout-only replacement nor identify an in-progress workout. The `+N more` label was plain text. Swap selection mapped the complete catalog inside a `ScrollView`, held the selected option object in parent state and rebuilt every row. Apply awaited a replacement-history query and then awaited program synchronization. Finally, no-future validation was grouped with uncertain transport failure, so it incorrectly retained a Retry state and exposed internal status text.

The only before value available is the user's observation of at least one second for selection feedback; no pre-change profiler trace was captured. The repair adds development-only `[swap-performance]` marks for selection commit, scope commit and Apply-to-Saving commit. No physical iPhone was connected during this pass, so post-change p95 values and the requested 100/150 ms thresholds are not claimed. Automated evidence proves structural responsiveness properties: the list is virtualized, selection state is scalar, optional history is non-blocking, Apply enters Saving before awaited work, and duplicate taps admit one operation. Physical-device profiling remains required for numeric before/after evidence.

The automated packet covers local contract validation, one-workout isolation, wider-scope behavior, no-later-occurrence messaging, logged-set preservation, load semantics, exact retry/replay, stale correction conflict, cross-owner denial, audit creation and effective corrected session state. It is not physical-device or hosted evidence.

## Open acceptance and preserved flows

Authenticated physical iPhone/end-to-end visual verification remains required for both entry points and scopes; zero/some/all logged sets; final week/no later occurrences; mixed-exercise display; keyboard access; navigation/restart/response-loss/account recovery; accessibility; and completed-workout Save, Cancel and repeated correction. The unauthenticated web welcome screen passed a browser smoke check, but it does not close those acceptance gates.

The user previously confirmed these four flows and they remain regression baselines: restore archived programs, end/archive programs, start workouts and generate new programs. This task preserved their command paths but did not claim a fresh physical-device regression pass.
