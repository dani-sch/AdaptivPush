# Current state

## Active execution state

- canonical driver: `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`
- stable execution stage: `F5-S1` - schema truth, RLS, compatibility, and authority closeout
- `F5-S0` evidence/policy foundation: complete
- Phase 2 schema/type/compatibility code: merged
- Phase 2 live schema, RLS, and complete manual compatibility matrix: not closed
- feature flags: missing
- readiness-v2 engine: missing
- automated application tests: missing

## Code-backed product posture

Working core paths include authentication, onboarding/profile seeding, generated and manual programs, active-plan loading, exercise swaps, workout logging, personal records, raw history, local notifications, archive/restore, and theme/palette switching.

Partial or scaffolded paths include readiness, day-of adaptation, progression, scheduled deloads, cycle support, analytics, evidence UI, notifications, privacy requests, and support requests.

Missing production paths include real password reset, feature gates, reactive deload lifecycle, keyed evidence route, real HealthKit, real support/export/deletion processing, automated tests, and production application identity.

The detailed status and file evidence live in `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md`.

## Verification posture

- available static app gate: `npm run lint`
- tests configured: none
- last recorded generator closeout: lint, seeded output comparison, and in-app Generate Program smoke passed
- Phase 2 manual validation still required: new-user writes, legacy fallback reads, profile dual-write, generation-context save, live table constraints, and two-user RLS isolation
- no claim about live Supabase or device behavior is complete until recorded in `dev-doc/reports/DEV-LOG.md`
- the documented `integrator` clone/actor was not present in the audited Git worktree list and must be configured or explicitly bypassed by the approved workflow before integration automation is assumed

## Immediate constraints

- keep rollout-sensitive behavior off until deterministic feature gates exist;
- preserve legacy `readiness_logs` during the compatibility window;
- preserve dark/light/system and palette behavior;
- keep cycle/symptom support opt-in and hidden by default;
- do not expose HealthKit, support, export, deletion, email, or SMS as operational unless a real backend/device path exists;
- do not advance to `F5-S2` until Phase 2 ownership isolation is proven.
