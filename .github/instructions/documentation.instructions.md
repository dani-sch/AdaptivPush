---
applyTo: "**/*.md,**/*.mdx"
---

# Documentation Review — CHAOS-AI

## Scope

All markdown files in active instruction and documentation surfaces: `README.md`,
`dev-doc/`, `.github/`, `AGENTS.md`, `.codex/`, and `.agents/skills/`.

Inactive markdown surfaces such as `CLAUDE.md`, `.claude/`, and `.cursor/`, when
present, are not active authority.

## Task-scoped documentation lifecycle

Documentation archival is event-driven and task-scoped. At intake, identify only
the canonical documents and temporary supporting material that directly own or
support the task. Update affected canonical living documents in place as facts
change.

When the task supersedes or consumes a temporary plan, execution prompt, handoff,
or status snapshot, archive it during that same task. End of purpose triggers
archival; age alone does not. Preserve exact contents and provenance in the
repository's dated superseded archive convention, record the original path and
canonical successor, and remove the obsolete active copy. Historical evidence,
stable references, templates, and valid decisions retain their locations and
authority regardless of age. Do not replace a consumed prompt with another
persistent execution prompt; route current execution through the task board,
current state, and owning execution register.

Ordinary closeout examines only affected documents and their direct inbound
references. Use targeted `rg --fixed-strings` searches for each moved path;
repair current inbound links to the archive or successor while preserving
historical source bodies and provenance. Update the owning document inventory
only when archival changes occur. Regenerate `dev-doc/main/TOC.md` only when
files are added, moved, or removed.

Do not run repository-wide documentation audits during ordinary work. Full
audits require an explicit request or a documentation-architecture refactor.
`/analyze`, `/cleanup`, and `/sprint-full` remain explicit broad-audit operations,
never prerequisites for normal intake, execution, or closeout.

## Critical Review Checks

### Content Quality
- Documentation must match current code behavior. Flag claims that contradict the codebase.
- All code examples must be syntactically valid and use current API signatures.
- File paths referenced must exist in the repository. Flag dead links to nonexistent files.
- No placeholder text (Lorem ipsum, TODO, TBD) in committed documentation.

### Structure
- Agent files (`.github/agents/*.md`) must have YAML frontmatter with: name, description, model, tools, mcp-servers.
- Skill files (`.github/skills/*/SKILL.md`) should define trigger/usage guidance and workflow steps appropriate to the skill.
- Overlay skill files (`.agents/skills/*/SKILL.md`) should follow the same structure as their canonical or derived counterpart.
- Instruction files (`.github/instructions/*.instructions.md`) must have `applyTo` frontmatter.
- All headings must use ATX style (`#`), not underline style.

### Conventions
- No emojis in documentation files — use ASCII markers ([OK], [FAIL], [NEW], [+], [-]).
- Use backtick fencing for code blocks with language identifiers.
- Tables must be properly aligned.
- Internal links: use relative paths from repository root.

### Living Documents
- `dev-doc/main/TODO.md` — task tracking, must have status markers.
- `dev-doc/main/ARCHITECTURE.md` — must reflect current module structure.
- `dev-doc/main/ROADMAP.md` — current/future sequencing only.
- `dev-doc/main/CURRENT-STATE.md` — current gate and verification posture only.
- `dev-doc/main/` must not contain log, changelog, completed-lane report, or archival narrative files.

## What NOT to Flag
- Line length in markdown (no hard wrap enforced).
- Minor grammar issues that don't affect clarity.
- Formatting in auto-generated files.
