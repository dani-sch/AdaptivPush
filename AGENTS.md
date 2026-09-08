# AGENTS.md

> Cross-tool operating contract for agents working in this repository.
> Read this file first, then follow its routing as needed. `.chaos/` is the
> target semantic workflow authority; `.github/` is the current readable
> generated/validated instruction and workflow layer during migration.

## CHAOS = Context Hydrated Agentic Orchestration System

CHAOS is multi-agent development infrastructure with shared memory,
coordination, automation, audit trails, and local-first persistence. If the LLM
is the brain, CHAOS is the nervous system and operating layer around it:
context hydration, tools, permissions, task flow, event streams, git automation,
provider adapters, and accountability for the model or client you choose. Its
target shape is provider-agnostic and MCP-facing, with one external gateway,
private internal runtime services, deterministic PM-orchestrated execution, and
an auditable retrieval, prompt, and provider chain. The active refactor is
converging the repository toward that architecture: one clearer runtime
boundary, one durable documentation spine, one compact local operator surface,
and repo-local workflow supplements that stay aligned with the engine instead
of being mistaken for it.

Current checkout note: `.chaos/`,
`dev-doc/plans/active/chaos-refactor/execution-index.md`, and
`dev-doc/plans/active/qa-audit/circular-workflow-baseline.md` are not present.
Until those target surfaces land, use the validated `.github/instructions/*`
files and the `dev-doc/main/*` living-document spine as the readable fallback.

## Hard rules

| Topic | Rule |
|---|---|
| Instruction priority | user instructions -> `.chaos/manifests/*` and validated `.github/instructions/*` -> `.github/agents/*` and `.github/skills/*` -> `AGENTS.md` -> task-loaded references |
| Canonical surfaces | `.chaos/*` is the target semantic authority for agents, skills, commands, hooks, clients, and adapters. `.github/*` remains the active readable GitHub/Copilot view during migration. `.codex/*` is runtime/client state plus validated Codex view. `.agents/skills/*` is generated or allowlisted overlay. |
| First-read summary | Start with `dev-doc/main/OVERVIEW.md` before broader repo exploration. |
| Active context only | Prefer living docs under `dev-doc/main/`. Do not treat `archive/`, `CLAUDE.md`, `.claude/`, or `.cursor/` as active authority except for migration or provenance tasks. |
| Git baseline | Remote default baseline is `origin/main`. Never push directly to `main`. Never force-push. Do active work on a feature branch, not `main`. |
| Work containment | Stage local commits after every meaningful change within a feature branch. Sync skill will automatically send local commits to the local `integrator` clone for merge or integration validation. Commits should be small, focused, and logically grouped. |
| Repo truths | `integrator` is the canonical integration clone or actor. `web-ui/` is historical and currently absent. |
| Refactor direction | Prefer changes that reduce duplicate authority, tighten runtime seams, keep repo-local workflow supplements aligned, and move behavior toward the current living-doc architecture. |
| Workflow shape | Follow the retained loop: intake -> scoped plan -> bounded execution -> local verify -> stage many meaningful local commits -> integrator merge attempt -> integration verify or conflict lane -> publish, cleanup, handoff. |
| Verification | Run the smallest existing verification step that covers the behavior you changed. Run `ruff check scripts/ tests/ src/` before staging or committing Python-side changes. |

## Where to look first

| If you need... | Read this first |
|---|---|
| General project shape and refactor direction | `dev-doc/main/OVERVIEW.md` |
| File and surface discovery | `dev-doc/main/TOC.md` |
| Durable architecture, ownership, and implementation truth | `dev-doc/main/ARCHITECTURE.md` |
| Current gates, caveats, and what is partial right now | `dev-doc/main/CURRENT-STATE.md` |
| Active execution lane and immediate work | `dev-doc/main/TODO.md` |
| Planned sequencing and milestone intent | `dev-doc/main/ROADMAP.md` |
| Command, skill, agent, and routing lookup | `dev-doc/main/COMMAND-TOC.md` |
| Semantic workflow manifests and client adapters | `.chaos/README.md` and `.chaos/manifests/*` when present; otherwise validated `.github/*` surfaces |
| Canonical command behavior | `.github/skills/<command>/SKILL.md` |
| Hook and workflow-policy behavior | `.github/hooks/hooks.json` and `.github/hooks/*` |
| Active AdaptivPush execution map | `dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md` |
| Code-backed product status | `dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md` |

## High-value commands

| Task | Command |
|---|---|
| Refresh the active file index | `python scripts/tools/generators/toc_generate.py --output dev-doc/main/TOC.md` |
| Run the Python lint gate | `ruff check scripts/ tests/ src/` |
| Run the broad Python test suite | `pytest tests/ -v` |

`AGENTS.md` should stay concise, elegant, and high-signal. If a detail needs a
long explanation, it belongs in the owning living doc or canonical `.github`
surface rather than here.
