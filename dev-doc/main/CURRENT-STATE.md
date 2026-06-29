# Current State

## Product and code posture

- Client: Expo 54, React Native 0.81, React 19, TypeScript 5.9
- Backend: Supabase Auth, Postgres, Storage
- Theme system: present and user-switchable through `ThemeContext`
- Health integration: UI placeholder only; no implemented HealthKit adapter yet
- Feature flags: not implemented yet; planned in-repo first

## Confirmed working assumptions for current planning

- active plans still live under `reports/plans/` and are indexed from `dev-doc/plans/active/PLAN-INDEX.md`
- `reports/ARCHITECTURE.md` is the best current detailed architecture source
- `reports/TODO.md` remains useful historical context, but `dev-doc/main/TODO.md` is now the active board
- `dev-doc/` has been bootstrapped to satisfy the repo's intended documentation layout

## Verification posture

- smallest available local gate: `npm run lint`
- no broad automated test suite is currently documented as the default gate
- major implementation phases still require manual regression slices across onboarding, readiness, program generation, workout execution, trust surfaces, and compatibility paths

## Current active plans

- `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md`
- `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md`

## Last 2 days of active changes

- no commits were recorded in the last-two-day window; the changes are currently represented as working-tree planning and documentation updates
- `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` was created in this chat as the execution-ready feature plan
- `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md` was created in this chat as the companion UI workstream plan aligned to the execution plan
- `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` now includes resolved clarification answers for product promise, depth modes, onboarding scope, readiness authority, cycle support, transparency, analytics, integrations, and rollout structure
- `dev-doc/` was created and indexed so the repo now has the intended living-doc structure referenced by the active instructions
- the archival rule for executed plans is now explicit through `dev-doc/plans/legacy/README.md` and `dev-doc/plans/active/PLAN-INDEX.md`

## Immediate constraints

- preserve brand colors and theme switching
- preserve one-handed usability in the mobile UI
- keep trust surfaces calm and compact by default
- keep rollout-sensitive features behind explicit flags once the flag layer exists
