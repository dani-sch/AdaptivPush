# Unified workout lifecycle verification - 2026-09-15

## Outcome and boundary

Implemented shared effective occurrences, repeatable slot swaps, explicit set outcomes, partial finalization, shared completed exercise cards, lifecycle-aware entry and capability-aware correction viewing. Work remains on `codex/exercise-swap-workout-corrections`; no remote push, hosted migration or hosted data mutation occurred. Initial working tree was clean.

## Confirmed causes

1. The effective-current selector and stable draft alias excluded finalized drafts; the program completion query counted only complete/reduced sessions. A finalized partial occurrence could therefore look unstarted.
2. Full-program preview reconstructed base rows independently and did not reconcile local occurrence replacements or finalized snapshots.
3. Future swaps searched current exercise IDs. Once earlier replacements changed those IDs, a repeated swap missed the original future slots.
4. Actual sets only had a logged boolean; blank and skipped states were indistinguishable.
5. The old completed editor loaded only actual rows and required the undeployed correction column in its initial query. Missing schema and ownership errors collapsed into the same unavailable message.
6. History pushed the edit route while its detail modal was still visible.
7. Progression used successful logged-set coverage, while correction completion used raw actual-row count; neither was sufficient to prove the required prescription was fulfilled.

## Implemented invariants

- Base/frozen prescription remains separate from effective assignment and actual history. Snapshot `effectiveSlots` and correction `setOutcomes` retain explicit nonperformed states without adding nonperformed rows to actual-set tables.
- Stable day and slot identities correlate revisions. Finalized session snapshots win; active workout-only changes remain durable on the current device until finalization. New finalized snapshots reconstruct across devices. Legacy missing prescription context is disclosed rather than synthesized.
- Performed sets retain their actual exercise, load, unit, reps and RPE through later swaps. Original slot lineage targets applicable future uncompleted slots; the selected occurrence changes only its selected slot. Exact operation recovery and duplicate Apply gating are retained.
- Completed view is read-only. Update mode uses the same `ExerciseCard`, supports per-set load/unit/reps/RPE/identity/outcome changes and per-exercise extras, and Cancel restores the original view. Save uses the audited revision-checked correction command, never finalization or program advancement.
- Home offers Start, Continue, Retry Sync and durable completed-session actions. Plan counts full/reduced fulfillment separately from finalized partial work. A completed route cannot initialize a fresh draft. History uses a single-use navigation gate and clears nested modal state before dismissing.
- Capability probing is read-only. Missing RPC/column support retains viewing and disables Update/Save; ownership/not-found remains separate.

## Exact progression treatment

Only actual performed rows contribute volume and PRs. The existing progression helper accepts required-set coverage and completion class. Missing/partial evidence holds the current suggestion even when readiness is high. The legacy hook holds the existing next programmed load when coverage is incomplete, rather than substituting a higher average lifted load. No punitive missed-work debt or repeated-partial adaptation is introduced.

Corrections recompute session volume and prescribed-slot completion, rebuild the existing correction-aware PR effect, and reset the existing progression/analytics receipt effects for re-evaluation. They never invoke advancement. The broader AP-05 progression worker/authority and historical incomparable-record reconciliation remain outside this slice; this task does not claim a new background effect consumer.

## Migrations

- Modified **local-only** `20260915190000_workout_swap_scope_and_completed_corrections.sql`: outcome validation/persistence and required-slot coverage in correction; migrated revision compatibility.
- Added **local-only** `20260915210000_effective_workout_occurrences.sql`: stable-lineage repeat swaps, occurrence finalization uniqueness, intermediate performed-exercise acceptance, effective snapshot preservation, read-only correction capability version 2.
- Already hosted migrations were not changed. Local verification replaced the changed correction and selected-occurrence functions and applied the new migration in the existing named local Docker database. A fresh reset was not performed in this task.

## Verification

| Command/check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass; same three pre-existing unused-variable warnings in forgot-password, Home and Profile |
| `npm run test:ap02-ap03` | Pass: 1 dependency + 54 workout + 20 program tests = 75 |
| `npm run test:availability` | Pass: 13 tests |
| `docker exec -i supabase_db_AdaptivPush psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -o /dev/null` with each committed SQL suite | Pass: catalog authority/isolation, AP-02/AP-03 atomicity/isolation, AP-03 revision swaps, workout swap/correction |
| AP-03 suite with `SET adaptivpush.test_legacy_revision = 'on'` | Pass |
| `npm run test:database-concurrency` | Pass: six reported concurrent/replay/isolation/cleanup checks, including repeated future replacement with completed ancestor protection |
| `npx supabase db lint --local --level warning` | Pass, no schema warnings |
| `npx expo export --platform web --output-dir C:/Users/dani2/AppData/Local/Temp/adaptivpush-occurrence-web` | Pass; 35 routes exported |
| Browser smoke at existing `http://localhost:8081` | Welcome screen renders, no error overlay and no captured console errors. Browser-control fallback used because agent-browser CLI was unavailable. |
| `git diff --check` | Pass |

No Python source changed, so the conditional Ruff gate does not apply. Running the existing TOC generator is documentation maintenance, not a Python implementation change.

## Manual and release acceptance remaining

The authenticated 18-step workout acceptance scenario was not executed. No physical iPhone or hosted backend verification is claimed. Pending device checks cover current/future swap scope and repeat swaps, one performed plus one skipped set, partial finalization/Home reopen, five-exercise full view, edit/cancel/save and totals, missing capability, History dismissal/back/rapid taps, offline recovery, keyboard, VoiceOver and dynamic text. The existing four confirmed baseline flows still require a fresh device regression pass.

Hosted deployment remains pending explicit authorization. After authorization, verify the project and current ledger, capture and restore-test recovery, review exact ordered migration hashes, deploy the two local-only migrations, refresh the API schema cache, verify capability 2 and owner/revision/replay behavior, then run authenticated/device acceptance. Prior AP-02/AP-03 deployment authorization does not authorize these migrations.

## Changed files

- `app/(tabs)/history.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/plan.tsx`
- `app/edit-workout.tsx`
- `app/next-workout.tsx`
- `app/program-overview.tsx`
- `components/ExerciseCard.tsx`
- `components/NextWorkoutCard.tsx`
- `components/WorkoutTemplateModal.tsx`
- `dev-doc/main/ARCHITECTURE.md`
- `dev-doc/main/CURRENT-STATE.md`
- `dev-doc/main/TOC.md`
- `dev-doc/main/TODO.md`
- `dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md`
- `dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md`
- `dev-doc/reports/ADAPTIVPUSH-WORKOUT-LIFECYCLE-2026-09-15.md`
- `features/programs/contracts.ts`
- `features/workouts/contracts.ts`
- `features/workouts/correctionCommands.ts`
- `features/workouts/correctionContracts.ts`
- `features/workouts/draftStore.ts`
- `features/workouts/effectiveCurrentWorkout.ts`
- `features/workouts/effectiveOccurrence.ts`
- `features/workouts/occurrenceRepository.ts`
- `features/workouts/repository.ts`
- `features/workouts/resolveProgramOccurrences.ts`
- `features/workouts/swapRecovery.ts`
- `features/workouts/workoutPresentation.ts`
- `hooks/useCurrentProgram.ts`
- `scripts/verifyDurableConcurrency.mjs`
- `supabase/migrations/20260915190000_workout_swap_scope_and_completed_corrections.sql`
- `supabase/migrations/20260915210000_effective_workout_occurrences.sql`
- `supabase/tests/ap_02_ap_03_atomicity_and_isolation.sql`
- `supabase/tests/workout_swap_and_correction.sql`
- `tests/workouts/effectiveCurrentWorkout.test.ts`
- `tests/workouts/occurrence.test.ts`
- `tests/workouts/swapRecovery.test.ts`
- `types/program.ts`
- `types/progression.ts`
- `utils/progressionEngine.ts`

## Commits

- `01874c1` - shared occurrence/outcome foundation.
- `1d77dcc` - durable reconciliation, stable-lineage swaps, SQL and regression coverage.
- `f8c2cd8` - shared completed cards and lifecycle navigation.

- `8e927d5` - capability-aware Home actions and conservative incomplete coverage.
- `74f21a2` - owner/occurrence-scoped Home state and exact future swap reach.
- `c19576c` - separate finalized occurrence state from full/reduced fulfillment.

The documentation closeout commit is listed in the final task response.
