# Current state

## Active execution state

- canonical driver: `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`
- stable execution stage: `F5-S1` - schema truth, RLS, compatibility, and authority closeout
- `F5-S0` evidence/policy foundation: complete
- Phase 2 schema/type/compatibility code: merged
- Phase 2 live schema and two-user RLS isolation: verified 2026-08-03
- Phase 2 authenticated live compatibility contract: verified 2026-08-03
- Phase 2 complete manual app compatibility matrix: not closed
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
- live schema, constraints, indexes, storage policy, exercise metadata, and two-user RLS isolation were verified on 2026-08-03
- an authenticated synthetic-user integration run verified the Quick Setup three-surface write contract, missing-row preference fallback, profile readiness/cycle dual-writes, generated-program context creation, and injected context-failure cleanup against the live project on 2026-08-03
- the context-failure run exposed and then verified a fix for restoring the previously active program after the failed replacement row is deleted
- Phase 2 manual application validation still requires an Expo-capable simulator or physical device for the actual Quick Setup, Profile, and Generate Program UI paths plus a runtime missing-relation/column fallback scenario
- the attempted Expo web fallback is not usable as device evidence because server rendering exits when AsyncStorage accesses `window`; no browser authentication occurred
- remote schema changes before migration 015 were made through the Dashboard; Supabase CLI baseline/pull and migration-history normalization remain a release-process prerequisite
- no claim about live Supabase or device behavior is complete until recorded in `dev-doc/reports/DEV-LOG.md`
- the documented `integrator` clone/actor was not present in the audited Git worktree list and must be configured or explicitly bypassed by the approved workflow before integration automation is assumed

## Immediate constraints

- keep rollout-sensitive behavior off until deterministic feature gates exist;
- preserve legacy `readiness_logs` during the compatibility window;
- preserve dark/light/system and palette behavior;
- keep cycle/symptom support opt-in and hidden by default;
- do not expose HealthKit, support, export, deletion, email, or SMS as operational unless a real backend/device path exists;
- do not advance to `F5-S2` until the remaining device/UI and missing-schema compatibility smoke rows are recorded.
