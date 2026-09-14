---
name: sprint
description: sync only the living docs needed for a verified circular-workflow closeout
---

# Sprint

Sync only the living docs affected by meaningful, verified progress.

## When to use

- after stage 7 passes and stage 8 needs owning-doc updates
- after workflow behavior changes in retained agents or skills
- after file additions, moves, or removals affect discoverability
- after closeout needs a concise living-doc refresh instead of a full doc audit

## Active living docs

- `README.md`
- `dev-doc/main/TOC.md`
- `dev-doc/main/COMMAND-TOC.md`
- `dev-doc/main/ONBOARDING.md`
- `dev-doc/main/ARCHITECTURE.md`
- `dev-doc/main/CURRENT-STATE.md`
- `dev-doc/main/ROADMAP.md`

Update `dev-doc/main/TODO.md` only when the work belongs to the active lane.

## Workflow

1. Gather recent context from the diff, the verify artifacts, and the integration result. Limit intake to documents directly owning or supporting this task; follow `.github/instructions/documentation.instructions.md` for lifecycle decisions.
2. Update the canonical agent and skill surfaces first when workflow behavior changed.
3. Update `dev-doc/plans/active/qa-audit/circular-workflow-baseline.md` if present and the retained loop contract changed; otherwise use the validated `.github/instructions/` fallback.
4. Update only the canonical living docs that own changed facts, in place.
5. Archive temporary plans, execution prompts, handoffs, or status snapshots whose purpose this task consumed or superseded. Preserve exact contents and provenance in the dated superseded archive, remove the obsolete active copy, and record the original path and canonical successor during this task.
6. Examine only affected documents and direct inbound references at ordinary closeout. Use targeted `rg --fixed-strings` searches for moved paths, repair current links, and retain historical source bodies. Route current execution through `TODO.md`, `CURRENT-STATE.md`, and the owning execution register without creating another persistent execution prompt.
7. Update the owning document inventory only when archival changes occur. Regenerate `dev-doc/main/TOC.md` only when files are added, moved, or removed.
8. Respect `.github/hooks/hooks.json` as the canonical policy reference and `.codex/hooks.json` as runtime registration context only.
9. Preserve `REQUIRES INSPECTION` items for unresolved runtime, test, daemon, or merge-cleanup follow-up.

## Guardrails

- do not sync docs for work that failed stage 7 unless the doc itself records the failure state
- do not bulk-update unrelated docs just because the command was invoked
- do not restore inactive authority surfaces as active guidance
- archive on lifecycle completion, not age; preserve historical evidence, stable references, templates, and valid decisions
- do not conduct repository-wide documentation audits during ordinary work; full audits require an explicit request or a documentation-architecture refactor
- `/analyze`, `/cleanup`, and `/sprint-full` remain explicit broad-audit operations, not prerequisites for ordinary work

## Output format

Sprint summary: docs updated, archives and successors with preservation checks,
direct references repaired, workflow facts synchronized, remaining follow-up.
