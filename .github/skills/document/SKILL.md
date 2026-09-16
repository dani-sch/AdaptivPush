---
name: document
description: update the owning canonical documentation surface with docs-agent alignment and stage-8 closeout discipline
---

# Document

Update the owning canonical documentation surface for the requested code,
workflow, API, or architecture change.

## Arguments

- `$TARGET` — file, directory, surface, or topic to document

## Workflow

1. At intake, identify only documents directly owning or supporting the task.
   Follow `.github/instructions/documentation.instructions.md` for lifecycle
   decisions. Identify the owning canonical surface before editing:
   - workflow skills or agents: `.github/skills/` or `.github/agents/`
   - workflow baseline: `dev-doc/plans/active/qa-audit/circular-workflow-baseline.md`
     when present; otherwise the validated `.github/instructions/` fallback
   - living docs: `dev-doc/main/ARCHITECTURE.md`, `CURRENT-STATE.md`,
     `ROADMAP.md`, `COMMAND-TOC.md`, `ONBOARDING.md`, `README.md`
2. Use `docs-agent` when the work spans multiple documentation surfaces or needs
   stage-8 closeout coordination.
3. Update affected canonical living documents in place. Update canonical
   `.github` or `dev-doc/main/` surfaces first; treat
   `.codex/` and `.agents/skills/` as follow-up overlays only.
4. If workflow behavior changed, keep the retained circular loop, retained agent
   ownership, and canonical hook model aligned.
5. Archive temporary plans, execution prompts, handoffs, or status snapshots
   consumed or superseded by this task during the same task. Preserve exact
   contents and provenance under the dated superseded archive convention, remove
   the obsolete active copy, and record its original path and canonical successor.
   Archive when purpose ends, never merely because a file is old. Keep historical
   evidence, stable references, templates, and valid decisions in place.
6. At ordinary closeout, inspect only affected documents and direct inbound
   references. Use targeted `rg --fixed-strings` searches for moved paths and
   repair current links to the successor or archive; retain historical source
   locators as provenance. Route execution through `TODO.md`, `CURRENT-STATE.md`,
   and the owning register without creating another persistent execution prompt.
7. Update the owning document inventory only when archival changes occur.
   Regenerate `dev-doc/main/TOC.md` only when files are added, moved, or removed.
8. Do not run a repository-wide semantic audit for normal documentation work.
   Full audits require an explicit request or a documentation-architecture
   refactor; `/analyze`, `/cleanup`, and `/sprint-full` are explicit broad-audit
   operations, not prerequisites for this workflow.
9. Mark unresolved runtime, ownership, or release-approval gaps as
   `REQUIRES INSPECTION`.

## Output

```text
[DOCUMENT]
target: {target}
owner: {docs-agent | direct doc update}

updated:
- {path} — {why it changed}

archived:
- {original path -> archive path; successor; preservation check | none}

closeout:
- stage: {current stage}
- additional sync: {none | sprint | toc-generate | explicitly requested broad audit}

requires inspection:
- {item or none}
```
