---
title: "AdaptivPush evidence-backed UI redesign plan"
created: "2026-06-29"
status: draft
workflow: direct
source_of_truth: "reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md"
estimated_effort: XL
---

# AdaptivPush evidence-backed UI redesign plan

## Scope statement

This document defines an execution-ready UI redesign workstream for AdaptivPush that stays aligned with `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` instead of competing with it. The redesign is a major structural and component-level overhaul inspired by the provided visual references, while preserving brand colors, one-handed use, and full dark/light/system appearance switching.

## Planning contract

- Canonical feature and milestone sequencing: `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md`
- Current app architecture reference: `reports/ARCHITECTURE.md`
- Current repository inventory reference: `TABLE-OF-CONTENTS.md`
- Current task tracker substitute: `reports/TODO.md`

This plan is a companion execution layer for UI work. It does not replace the approved feature plan.

## Selected direction

- implementation strategy: hybrid UI workstream mapped back to the existing milestone structure
- route: direct
- rationale: the feature plan already defines the product, schema, and trust sequencing; the UI plan should reorganize screens and shared components around those milestones rather than create a separate product roadmap

## In scope

- establish a reusable mobile design system for card-based, one-handed layouts
- redesign Home, Next Workout, Plan, Program Overview, Quick Setup, Profile, History, and trust surfaces
- preserve theme switching while making dark and light themes feel intentionally designed rather than inverted
- map UI work to Milestones 1-4 in the evidence-backed execution plan
- define screen-by-screen implementation order, dependencies, and verification

## Out of scope

- changing product strategy already decided in the evidence-backed plan
- removing theme switching or collapsing to a single theme
- HealthKit implementation beyond UI placeholders already sequenced for later phases
- backend or schema decisions outside the UI implications already captured by the evidence-backed plan

## Assumptions

- the provided references indicate a preferred direction of premium mobile fitness UI, large hero cards, rounded surfaces, dense-but-readable metrics, and stronger visual hierarchy
- exact final art direction can be hybrid: high-contrast workout surfaces plus lighter educational/settings surfaces, as long as both support dark/light/system modes
- navigation model can be improved structurally inside the current Expo Router shell before any deeper information-architecture rewrite is considered

## Success criteria

- Milestone 1 ships visibly better Home, Next Workout, onboarding/profile preference entry, and a subtle trust entry point
- generator, readiness, trust, and history changes remain visually coherent across dark and light modes
- the redesign improves one-handed use through reachable primary actions, reduced modal friction, and clearer progressive disclosure
- new trust and evidence surfaces feel calm and compact by default, with deeper detail routed to dedicated screens or sheets

## Key findings

1. The repository does not contain the expected `dev-doc/main/*` planning surfaces; the evidence-backed execution plan explicitly says this effort should use `reports/*` plus source inspection as planning authority.
2. The current architecture is an Expo Router mobile app with most orchestration on the client, so the redesign should target screen and component structure rather than assume a server-rendered design system.
3. The evidence-backed plan already identifies the key UI surfaces and their milestone sequencing, especially Home, Next Workout, Quick Setup, Profile, Plan, Program Overview, History, FAQ, Recovery Library, and the future evidence route.
4. Theme support already exists in `contexts/ThemeContext.tsx` and `constants/themes.ts`, which makes a two-theme redesign feasible without inventing a new theming mechanism.

## Recommended approach

Create a UI workstream that overlays the existing execution plan with four UI milestones:

1. **Foundation + Milestone 1 surfaces**: shared mobile design tokens, upgraded Home, Next Workout shell, Quick Setup/Profile preference flows, and trust entry points.
2. **Planning transparency surfaces**: Generate Program modal, Plan tab, and Program Overview redesigned around recommendations, overrides, and explanation affordances.
3. **Adaptive history + rationale surfaces**: History and workout detail redesigned to explain change over time, not just logs.
4. **Rollout hardening + parity pass**: theme parity, feature-flag-aware states, empty/loading/error states, and polish across all touched screens.

This keeps the UI work synchronized with the existing Intelligence / Experience / Trust sequencing instead of front-loading visual work that the underlying data model cannot yet support.

## UI milestone mapping

| UI milestone | Evidence-backed alignment | Primary surfaces | Outcome |
|---|---|---|---|
| UI-M1 Visible adaptive foundation | Milestone 1, Phases 2-3 and 7 trust entry | Quick Setup, Profile, Home, Next Workout, `NextWorkoutCard` | Better readiness framing, visible adjustment summary shell, first `Learn why` affordance |
| UI-M2 Transparent planning flow | Milestone 2, Phase 5 generator-v2 | `GenerateProgramModal`, Plan, Program Overview | More explainable generation, session-length-aware planning, stronger recommendation/override UX |
| UI-M3 Adaptive rationale and analytics | Milestone 3, Phase 6 progression/deload/history | History tab, workout history detail, Next Workout rationale states | Explainable plan changes, clearer trend views, adaptation-aware history |
| UI-M4 Rollout-safe parity and trust depth | Milestone 4, Phase 7-8 hardening | FAQ, Recovery Library, evidence route, gated states across the app | Calm trust UX, theme parity, rollout-ready screen states |

## Task decomposition

| ID | Title | Description | Effort | Depends on | Completion criteria |
|---|---|---|---|---|---|
| U1 | Define design-system foundation | Establish token and shared-component plan for card surfaces, spacing, hero sections, metric tiles, section headers, bottom CTAs, and sheet patterns across dark/light themes. | M | - | Shared UI primitives and token strategy are defined with file targets and theme mapping. |
| U2 | Redesign Milestone 1 experience surfaces | Rework Quick Setup, Profile readiness/settings entry, Home, Next Workout, `NextWorkoutCard`, and the initial trust shell to match the new hierarchy and one-handed interaction model. | L | U1 | Milestone 1 screens support readiness-v2 and trust entry points without breaking existing flows. |
| U3 | Redesign Milestone 2 planning surfaces | Rework `GenerateProgramModal`, Plan, and Program Overview around split recommendations, session length, weekly targets, and explanation affordances. | L | U1, U2 | Planning flows surface generator-v2 concepts cleanly and still allow overrides. |
| U4 | Redesign Milestone 3 history and rationale surfaces | Rework History and workout detail around trends, progression rationale, deload context, and "why did this change?" visibility. | M | U1, U2, U3 | History flows can present adaptive rationale and remain useful when new evidence data is sparse. |
| U5 | Complete trust and education surface redesign | Redesign FAQ, Recovery Library, and the dedicated evidence route so default surfaces stay concise and deeper explanation is progressively disclosed. | M | U1, U2 | Trust surfaces reuse the same evidence language and interaction patterns as live coaching surfaces. |
| U6 | Run cross-theme, cross-state hardening | Resolve theme parity, loading/empty/error states, feature-flag-gated visibility, and compact one-handed interactions across all redesigned screens. | M | U2, U3, U4, U5 | Dark, light, and system modes all feel first-class and the rollout states are visually coherent. |

## Critical path

U1 -> U2 -> U3 -> U4/U5 -> U6

## Parallelizable work

- visual inventory and component extraction from current screens can run in parallel with trust-surface content structuring
- Home/Next Workout redesign and Plan/Program Overview redesign can split once the shared primitives are stable
- FAQ/Recovery/evidence route work can progress in parallel with History once the explanation pattern is chosen

## Resource mapping

| Task | Files to Create | Files to Modify | Files to Review | Notes / Commands |
|---|---|---|---|---|
| U1 | `constants/uiTokens.ts`, `components/ui/AppScreen.tsx`, `components/ui/SectionHeader.tsx`, `components/ui/SurfaceCard.tsx`, `components/ui/MetricTile.tsx`, `components/ui/BottomActionBar.tsx` | `constants/themes.ts`, `contexts/ThemeContext.tsx` | `reports/ARCHITECTURE.md`, `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | Keep theme switching intact; avoid duplicating token logic. |
| U2 | `components/TodayAdjustmentSummary.tsx`, `components/EvidenceWhySheet.tsx` | `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, `app/(tabs)/home.tsx`, `app/next-workout.tsx`, `components/NextWorkoutCard.tsx` | `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md`, `constants/themes.ts` | Align to Milestone 1 Experience and Trust deliverables. |
| U3 | shared UI helpers only if needed | `components/GenerateProgramModal.tsx`, `app/(tabs)/plan.tsx`, `app/program-overview.tsx` | `utils/programGenerator.ts`, `types/program.ts`, `utils/saveProgramToDb.ts` | UI must reflect generator-v2 concepts without inventing unsupported behavior. |
| U4 | none required unless a new history summary component emerges | `app/(tabs)/history.tsx`, `app/workout-history.tsx`, `app/next-workout.tsx` | `hooks/useCurrentProgram.ts`, `utils/progressionEngine.ts` | Keep sparse-data states graceful during compatibility windows. |
| U5 | `app/evidence.tsx` or `app/evidence/[key].tsx` | `app/faq.tsx`, `app/recovery-library.tsx`, `app/program-overview.tsx`, `app/(tabs)/home.tsx`, `app/next-workout.tsx` | `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | Exact evidence route form remains REQUIRES INSPECTION. |
| U6 | none by default | all touched screens and components | `app/_layout.tsx`, `constants/featureFlags.ts`, `utils/featureGate.ts` when added | Verify gated states, theme parity, and thumb-reach actions. |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| UI redesign gets ahead of data-model readiness | medium | high | Tie each redesign slice to the existing milestone map and avoid exposing unsupported logic early. |
| Dark/light parity becomes an afterthought | medium | high | Build tokens and shared primitives before large screen rewrites; treat both themes as primary deliverables. |
| Trust surfaces become noisy or over-explanatory | medium | medium | Keep live surfaces compact; route detail to sheet and screen patterns as the evidence-backed plan requires. |
| Major redesign increases regression risk on central flows | high | high | Reuse the current navigation shell, apply screen rewrites in bounded slices, and use milestone regression checklists. |
| One-handed use is weakened by dense premium layouts | medium | medium | Put primary CTAs, check-ins, and workout actions in lower-reach zones and avoid top-heavy interaction patterns. |

## REQUIRES INSPECTION

- confirm whether the evidence route should be `app/evidence.tsx` or `app/evidence/[key].tsx`
- confirm whether existing palette customization in `constants/palettes.ts` should stay user-configurable or be reduced to a smaller curated system
- inspect current History, Profile, and Help screens more deeply before locking component extraction order
- confirm whether the redesign should preserve the current tab destinations exactly or allow label and order refinements inside the existing tab shell

## Verification approach

- automated local gate: `npm run lint`
- manual regression slices, aligned to the evidence-backed plan:
  - Quick Setup -> Profile save/read flows
  - Home readiness check-in -> Next Workout adjustment visibility
  - `Learn why` entry from Home and Next Workout
  - Generate Program flow across representative goals and depth modes
  - History and workout detail loading with sparse or legacy data
  - dark mode, light mode, and system mode parity

## Recommended execution order

1. Establish tokens, layout primitives, and shared bottom-sheet/card patterns.
2. Ship Milestone 1 UI surfaces: Quick Setup, Profile settings entry, Home, Next Workout, `NextWorkoutCard`, and the first trust affordance.
3. Redesign planning surfaces: Generate Program modal, Plan, and Program Overview.
4. Redesign rationale/history surfaces: History, workout detail, and expanded Next Workout rationale states.
5. Finish trust and education surfaces: FAQ, Recovery Library, and evidence route.
6. Run rollout and theme-parity hardening across all touched surfaces.

## Notes

- Use `reports/ARCHITECTURE.md`, `TABLE-OF-CONTENTS.md`, `reports/TODO.md`, and `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` as the active planning authority for this repo state.
- The visual target is a major structural redesign inspired by the provided references, not a shallow color refresh.
- Preserve brand colors, one-handed use, current themes, and dark/light/system appearance switching as non-negotiable constraints.
