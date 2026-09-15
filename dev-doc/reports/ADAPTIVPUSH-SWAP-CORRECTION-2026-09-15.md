# AdaptivPush scoped swap and completed-workout correction evidence — 2026-09-15

## Result and boundary

Commits `e8163b95b8474d9b2adcd938ffaa7ee488cc7204` and `5e2c078` locally implement the requested AP-02/AP-03 extension. Commit `ec78296` makes Supabase auth storage safe during Expo Router server rendering after the web smoke check exposed that compatibility defect. Application code, unit tests, local PostgreSQL verification and an unauthenticated web-render smoke pass. Authenticated physical iPhone/end-to-end acceptance remains open.

Migration `20260915190000_workout_swap_scope_and_completed_corrections.sql` is additive, local-only and **not hosted**. No production backup, restore, dry-run, migration, hosted security probe or writer change was performed for it. The authorization for the earlier AP-02/AP-03 rollout does not authorize this migration; any hosted rollout requires new explicit authorization and a fresh project-identity/recovery/isolated-restore/verification packet.

## Implemented behavior

- Workout and program surfaces share replacement selection, explicit `This workout only`/`Rest of program` scope and one Apply swap action. Selected-only changes one stable scheduled day/slot through an immutable successor; the wider scope covers current remaining work and later uncompleted occurrences.
- Logged sets retain their actual exercise and recorded load. Only unlogged sets change; original load is not copied, replacement-compatible history may supply an optional suggestion, and load kind/unit is validated during logging without a separate recalibration step.
- A partial or uncertain wider update persists by owner/draft/operation and reports saved-on-device, confirmed-remote or pending/failed state. Retry and Keep this workout only reconcile without claiming the whole scope succeeded.
- Edit workout is available from finalized workout/history views. Save changes can correct performed exercise, load/unit, reps, RPE and set membership; Cancel/navigation choices leave the stored workout unchanged unless Save is chosen.
- `correct_completed_workout_v1` validates owner, stable workout/set/prescription/exercise identity, expected correction revision and exact-operation replay. It atomically updates the existing finalized session, recomputes completion/volume and correction-aware record effects, and writes one internal before/after audit. It does not unlock finalization, create another session, reactivate a program or replay advancement.

Database additions are `workout_sessions.correction_revision`, `workout_sessions.corrected_at`, `workout_correction_receipts`, `workout_correction_audit`, `revise_program_exercise_occurrence_v1(jsonb)` and `correct_completed_workout_v1(jsonb)`. Ordinary table writes are denied; authenticated execution and owner-scoped receipt reads are explicit.

## Verification evidence

| Gate | Observed result |
|---|---|
| `npx tsc --noEmit` | Passed strict TypeScript. |
| `npm run lint` | Passed with three pre-existing warnings and no new lint error. |
| `npm run test:ap02-ap03` | Passed 50 combined dependency/workout/program unit tests. |
| `npx supabase db reset --local` | Passed and applied all committed migrations through `20260915190000`. |
| Direct `psql -X -q ... -v ON_ERROR_STOP=1` for `ap_01_3_catalog_authority_isolation.sql`, `ap_02_ap_03_atomicity_and_isolation.sql`, `ap_03_program_revision_swap.sql` and `workout_swap_and_correction.sql` | All four committed SQL suites passed. The AP-03 successor-revision suite also passed its legacy-schema variant. |
| `npx supabase db lint --local --level warning` | Passed with no warnings. |
| Expo web smoke at `http://localhost:8099` | Rendered the welcome/sign-in screen with non-empty content, no error overlay and no browser console errors after the SSR-safe auth-storage fix. |

The automated packet covers local contract validation, one-workout isolation, wider-scope behavior, no-later-occurrence messaging, logged-set preservation, load semantics, exact retry/replay, stale correction conflict, cross-owner denial, audit creation and effective corrected session state. It is not physical-device or hosted evidence.

## Open acceptance and preserved flows

Authenticated physical iPhone/end-to-end visual verification remains required for both entry points and scopes; zero/some/all logged sets; final week/no later occurrences; mixed-exercise display; keyboard access; navigation/restart/response-loss/account recovery; accessibility; and completed-workout Save, Cancel and repeated correction. The unauthenticated web welcome screen passed a browser smoke check, but it does not close those acceptance gates.

The user previously confirmed these four flows and they remain regression baselines: restore archived programs, end/archive programs, start workouts and generate new programs. This task preserved their command paths but did not claim a fresh physical-device regression pass.
