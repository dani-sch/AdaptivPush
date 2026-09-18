# AdaptivPush architecture summary

## Auth recovery and shared workout input boundary

`contexts/AuthContext.tsx` composes the pure `features/auth/sessionRecovery.ts` controller with Supabase and native AppState. Hydration, ready, recovering and signed-out states distinguish stored owner identity from request authorization; null initial events and transient failures cannot impersonate sign-out. Root routing waits for hydration and retains the route on profile availability errors. Authenticated owner checks remain at server writers. `features/auth/backendConfiguration.ts` rejects native loopback backends; `scripts/startLocalWebQa.mjs` isolates synthetic browser environments.

`useRemovalCapability` retains unsupported versus failed requests and retries under the current owner. `loadPresentation.ts` separates blank entry metadata/labels from actual measurements. `editDraftStore.ts` retains unsubmitted completed edits by owner/session/revision, separately from immutable pending correction requests. Existing active draft/swap/finalization stores and server tombstones/audit remain authoritative. [Verification and limitations](/dev-doc/reports/ADAPTIVPUSH-IPHONE-RECOVERY-2026-09-17.md).

## Shared controls and removal overlay

ExerciseCard owns both active and completed-edit rows, secondary settings and swipe actions; RemovalScopeSheet owns the scope choice. GestureHandlerRootView covers the app. AppDialogHost replaces app-owned native alerts with transparent, blocking modal presentation.

Version-1 occurrence tombstones in frozen snapshots remain separate from immutable prescription evidence. Program revision removal_mask metadata carries original set positions across successor swaps. Private revise_program_removals_v1 is called only by atomic correction/finalization; owned preview/state RPCs expose truthful scope and visible prescriptions. Separate removal capability 1 gates new controls while correction capability 2 remains compatible. performanceEvidence.ts evaluates original per-exercise coverage, including newer omitted occurrences. Hosted migration 20260917180000 is deployed with capability 1; [hosted removal release](/dev-doc/reports/ADAPTIVPUSH-WORKOUT-REMOVAL-RELEASE-2026-09-17.md) owns verification/recovery.

## Current source-observed runtime

| Layer | Existing source | Current limitation / owning future slice |
|---|---|---|
| Expo shell/auth | `app/_layout.tsx`, `app/(auth)/login.tsx`, `join.tsx`, `forgot-password.tsx` | Reset/deep-link/session production flow incomplete; AP-16 |
| Core screens | `app/(tabs)/home.tsx`, `plan.tsx`, `history.tsx`, `app/next-workout.tsx`, `app/edit-workout.tsx` | Compose workout/program commands and shared occurrence projections; some direct reads and legacy orchestration remain; AP-04–08 |
| Active program | `hooks/useCurrentProgram.ts` | Loads and mutates progression/swaps/date advancement; highest-risk shared seam; AP-03–05 |
| Generator | `utils/programGenerator.ts`, `constants/programDefaults.ts`, `lib/exerciseDatabase.ts` | Local fixed splits/random choices and heuristic loads; AP-06/07 |
| Program persistence | `features/programs/`, `utils/saveProgramToDb.ts`, `app/create-program.tsx` | Generated/manual artifacts use atomic installation, exact-operation recovery and immutable revisions; dated placement remains AP-04 |
| Capture/history | `features/workouts/commands.ts`, `draftStore.ts`, `repository.ts`, `utils/fetchExerciseHistory.ts`, history UI | Owner-scoped frozen drafts and atomic finalization are implemented; legacy/new history union and broader progression authority remain AP-05 |
| Workout occurrence projection, capture and correction | `features/workouts/effectiveOccurrence.ts`, `effectiveCurrentWorkout.ts`, `resolveProgramOccurrences.ts`, `workoutPresentation.ts`, `occurrenceRepository.ts`, draft/correction/swap stores | Durable snapshots and actual rows reconstruct completed workouts using shared exercise cards; stable day/slot projection reconciles Home/Plan. Correction capability is read separately. Both correction/effective-occurrence migrations are hosted; capability 2 and authenticated browser correction/reopen passed. AP-05 progression authority and physical acceptance remain open. |
| Readiness/cycle | Home/Workout, `utils/progressionEngine.ts`, `utils/cyclePhase.ts` | Independent hidden overlay and calendar effects; AP-08/09 |
| Preferences | `utils/profilePreferences.ts`, `types/database.ts` | Table/metadata compatibility, richer event scaffold not a workflow; AP-01/08 |
| Theme/evidence | `contexts/ThemeContext.tsx`, theme/palette constants, `types/evidence.ts`, `constants/evidenceRegistry.ts` | Local themes work; evidence consumer/paid package workflow incomplete; AP-05/13 |
| Backend/platform | `utils/supabase.ts`, `utils/notifications.ts`, schema/migrations | Supabase Auth/Postgres/Storage, local reminders; no health/purchase/privacy processor proven; AP-01/12/16 |

The [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md) owns exact paths/symbols and CODE versus HIST labels.

## Target and boundaries

Preserve Expo and Supabase; incrementally extract a modular monolith under proposed `features/<capsule>/` paths with each vertical consumer. Routes compose feature commands/view models; pure policies depend only on domain contracts and a small identity/date/unit/revision/provenance/error kernel. Repositories/platform adapters implement ports. Coaching returns proposals to core commands; health starts display-only; public projections and cosmetics cannot mutate private training.

Atomic program installation/workout finalization and trusted catalog curation already use narrow backend authority. Owner-scoped local drafts, pending-operation stores, server receipts and immutable accepted snapshots are implemented in `features/workouts/`, `features/programs/` and `features/kernel/`. Hosted correction and swap extensions preserve that boundary; they do not create a general background progression worker. Publication, moderation, purchase verification and privacy fulfillment remain future authority consumers. Check ownership and parent lineage, operation IDs and expected revisions.

Detailed ownership, allowed dependencies and state contracts: [master architecture](/dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md#mp-03-architecture). Physical data/security/compatibility: [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md). AP-01 and the hosted AP-02/AP-03 packet have dated grant/migration/restore evidence; every later rollout verifies its own current state. RLS enablement alone does not close authority.
