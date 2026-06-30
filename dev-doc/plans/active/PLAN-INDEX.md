# Active Plan Index

## Current active plans

| Plan | Path | Status | Scope | Next owner |
|---|---|---|---|---|
| Evidence-backed execution plan | `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | active - Phase 1 complete, Phase 2 implemented in code, manual validation pending | feature sequencing, schema strategy, rollout, trust surfaces | close Phase 2 with manual schema review and onboarding/profile/program-save validation |
| Evidence-backed UI redesign plan | `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md` | active | UI structure, component system, theme-aware redesign, plan-to-milestone mapping | direct implementation or bounded `typescript-agent` UI slices |
| Evidence-backed implementation plan | `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` | active reference | approved strategy, resolved clarification answers, milestone/workstream framing inputs | direct planning reference feeding the execution plan |

## Last 2 days of plan updates

- the evidence-backed execution plan was created in this chat as the main execution-ready implementation driver
- the UI redesign plan was created in this chat as a companion workstream plan rather than folded into the feature execution plan
- the implementation plan was updated from open questions into resolved planning answers
- active plan ownership now expects execution to flow from the execution plan and UI plan, with the implementation plan remaining a strategy and clarification reference
- Phase 1 of the evidence-backed execution plan is complete and the current bounded implementation lane is Phase 2 closeout after the schema and compatibility pass

## Archival rule

When a plan has been executed and is no longer the active driver for implementation, move the plan markdown file into `dev-doc/plans/legacy/` and update this index to reflect the new active source.
