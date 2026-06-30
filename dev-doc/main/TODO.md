# Active TODO

## [ACTIVE]

- [ACTIVE] Close Phase 2 of `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` with manual validation and signoff for onboarding, profile, and program-save compatibility flows.
- [ACTIVE] Review the applied Phase 2 schema in Supabase against `lib/adaptivpush_database_schema.md` before marking the phase complete.
- [ACTIVE] Prepare Milestone 1 UI implementation slices from `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md`.
- [ACTIVE] Use `dev-doc/reports/DEV-LOG.md` for ongoing execution logging.
- [ACTIVE] Convert the clarified product answers in `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` into bounded implementation slices under the active execution plan.

## [NEXT]

- [NEXT] Manually verify onboarding writes the new Phase 2 defaults without breaking legacy-compatible reads.
- [NEXT] Manually verify profile readiness and cycle settings dual-read and dual-write correctly with migrated rows present.
- [NEXT] Manually verify program save intentionally creates `program_generation_context` and still preserves the existing generation flow.
- [NEXT] Define the first shared UI primitives and token layer for the redesign workstream.
- [NEXT] Add deterministic in-repo feature flags before rollout-sensitive behavior is exposed broadly.
- [NEXT] Confirm whether the dedicated evidence route should use `app/evidence.tsx` or `app/evidence/[key].tsx`.
- [NEXT] Decide the first execution slice order across Milestone 1 Experience, Trust, and Intelligence work.

## [PARKED]

- [PARKED] HealthKit enrichment remains outside the critical path for Milestones 1-3.
- [PARKED] Deep automation beyond `npm run lint` is useful later, but not a blocker for current planning execution.
