# AdaptivPush architecture summary

## Current source-observed runtime

| Layer | Existing source | Current limitation / owning future slice |
|---|---|---|
| Expo shell/auth | `app/_layout.tsx`, `app/(auth)/login.tsx`, `join.tsx`, `forgot-password.tsx` | Reset/deep-link/session production flow incomplete; AP-16 |
| Core screens | `app/(tabs)/home.tsx`, `plan.tsx`, `history.tsx`, `app/next-workout.tsx` | Direct data and domain orchestration, no capsule/outbox boundary; AP-02–08 |
| Active program | `hooks/useCurrentProgram.ts` | Loads and mutates progression/swaps/date advancement; highest-risk shared seam; AP-03–05 |
| Generator | `utils/programGenerator.ts`, `constants/programDefaults.ts`, `lib/exerciseDatabase.ts` | Local fixed splits/random choices and heuristic loads; AP-06/07 |
| Program persistence | `utils/saveProgramToDb.ts`, `app/create-program.tsx` | Client multiwrites; existing user fix protects context failure only; AP-01/03 |
| Capture/history | `app/next-workout.tsx`, `utils/fetchExerciseHistory.ts`, history UI | Session precedes sets; mixed-history fallback and identity gaps; AP-02/05 |
| Workout occurrence projection, capture and correction | `features/workouts/effectiveOccurrence.ts`, `effectiveCurrentWorkout.ts`, `resolveProgramOccurrences.ts`, `workoutPresentation.ts`, `occurrenceRepository.ts`, draft/correction/swap stores | Durable snapshots and actual rows reconstruct completed workouts using shared exercise cards; stable day/slot projection reconciles Home/Plan. Correction capability is read separately. New SQL remains local-only; AP-05 progression worker/authority and physical acceptance remain open. |
| Readiness/cycle | Home/Workout, `utils/progressionEngine.ts`, `utils/cyclePhase.ts` | Independent hidden overlay and calendar effects; AP-08/09 |
| Preferences | `utils/profilePreferences.ts`, `types/database.ts` | Table/metadata compatibility, richer event scaffold not a workflow; AP-01/08 |
| Theme/evidence | `contexts/ThemeContext.tsx`, theme/palette constants, `types/evidence.ts`, `constants/evidenceRegistry.ts` | Local themes work; evidence consumer/paid package workflow incomplete; AP-05/13 |
| Backend/platform | `utils/supabase.ts`, `utils/notifications.ts`, schema/migrations | Supabase Auth/Postgres/Storage, local reminders; no health/purchase/privacy processor proven; AP-01/12/16 |

The [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md) owns exact paths/symbols and CODE versus HIST labels.

## Target and boundaries

Preserve Expo and Supabase; incrementally extract a modular monolith under proposed `features/<capsule>/` paths with each vertical consumer. Routes compose feature commands/view models; pure policies depend only on domain contracts and a small identity/date/unit/revision/provenance/error kernel. Repositories/platform adapters implement ports. Coaching returns proposals to core commands; health starts display-only; public projections and cosmetics cannot mutate private training.

Atomic program installation/workout finalization, catalog curation, publication, moderation, purchase verification and privacy fulfillment use narrow backend authority. Check ownership and parent lineage, operation IDs and expected revisions. Durable local drafts/outbox and immutable accepted snapshots are target work, not existing infrastructure.

Detailed ownership, allowed dependencies and state contracts: [master architecture](/dev-doc/plans/active/ADAPTIVPUSH-MASTER-PLAN.md#mp-03-architecture). Physical data/security/compatibility: [database plan](/dev-doc/plans/active/ADAPTIVPUSH-DATABASE-PLAN.md). Effective catalog grants and migration/restore posture require inspection; RLS enablement alone does not close authority.
