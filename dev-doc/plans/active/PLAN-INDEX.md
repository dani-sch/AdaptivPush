# Active Plan Index

## Current active plans

| Plan | Path | Status | Scope | Next owner |
|---|---|---|---|---|
| FABLE-5 master implementation execution plan | `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md` | active canonical driver | consolidated product definition, current-state audit, IA, data model, rules, build order, QA | direct implementation from the master plan, starting with schema-truth and compatibility validation |
| Evidence-backed execution plan | `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | source reference | prior feature sequencing, schema strategy, rollout, trust-surface planning | reference only where the master plan points back to it |
| Evidence-backed UI redesign plan | `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md` | source reference | UI structure, component system, theme-aware redesign, plan-to-milestone mapping | reference only where the master plan points back to it |
| Evidence-backed implementation plan | `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` | source reference | approved strategy, resolved clarification answers, milestone/workstream framing inputs | reference only where the master plan points back to it |

## Last 2 days of plan updates

- the evidence-backed execution plan was created in this chat as the main execution-ready implementation driver
- the UI redesign plan was created in this chat as a companion workstream plan rather than folded into the feature execution plan
- the implementation plan was updated from open questions into resolved planning answers
- active plan ownership now expects execution to flow from the execution plan and UI plan, with the implementation plan remaining a strategy and clarification reference
- Phase 1 of the evidence-backed execution plan is complete and the current bounded implementation lane is Phase 2 closeout after the schema and compatibility pass

## Archival rule

When a plan has been executed and is no longer the active driver for implementation, move the plan markdown file into `dev-doc/plans/legacy/` and update this index to reflect the new active source.
