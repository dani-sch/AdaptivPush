# AdaptivPush canonical-plan consolidation prompt

Paste the text below into a new conversation opened in
`C:\workout-app\AdaptivPush`.

---

Consolidate the complete AdaptivPush planning corpus into one neutral, highly
mapped, implementation-ready source of truth and its supporting planning documents.
This is a documentation and planning task only. Do not implement application code,
deploy anything, or run database migrations.

## Authority and first reads

Read `AGENTS.md` completely and follow its routing. Then read these files in order:

1. `dev-doc/main/OVERVIEW.md`
2. `reports/plans/ADAPTIVPUSH-CONTINUATION-PROMPT.md`
3. `reports/plans/ADAPTIVPUSH-ORIGINAL-REVIEW-REQUEST-2026-09-08.txt`
4. `reports/plans/ADAPTIVPUSH-DECISION-PACKET-2026-09-08.md`
5. `reports/plans/ADAPTIVPUSH-PLANNING-DECISION-RECORD-2026-09-08.md`
6. The active living-document spine named by `AGENTS.md`
7. Every active, retained, historical, evidence-backed, research, schema, migration,
   audit, implementation-status, execution-register, UI, and implementation plan
   discovered through `dev-doc/main/TOC.md`, `dev-doc/plans/active/PLAN-INDEX.md`,
   and repository search
8. `research/deep-research-report.md` in full

The approved planning decision record supersedes conflicting proposals in the
historical packet. The original request and decision packet remain provenance
sources and must not be rewritten to disguise their history.

The former named execution framework is retired for new planning authority. Do not
use its branding in new filenames, titles, headings, stable identifiers, execution
stages, or source-of-truth statements. Historical source documents may retain their
original wording unchanged.

## Working-tree safeguards

- Inspect `git status`, the current branch, recent commits, and diffs before editing.
- Preserve all pre-existing user changes. Do not assume the historical handoff's
  commit or dirty-file list is still current.
- Work on the existing feature branch unless current repository instructions require
  another safe feature branch. Never push directly to `main` and never force-push.
- Use small, focused documentation commits after meaningful groups of changes, and
  do not include unrelated user modifications.
- No application code changes, live database writes, migrations, deployments,
  external messages, or destructive history edits are authorized.

## Approved product direction

Treat every decision in
`reports/plans/ADAPTIVPUSH-PLANNING-DECISION-RECORD-2026-09-08.md` as approved.
Important consequences include:

- The free product remains fully usable for planning, scheduling, training, logging,
  history, manual schedule control, neutral capture, safety, and basic progression.
- Premium sells convenience and precision: advanced generation/customization,
  multiple detailed equipment-location profiles, exact machine/stack/dumbbell/load
  increments, equipment-aware progression and recalibration, longitudinal coaching,
  and automated schedule recovery.
- Accurate actual-weight logging and user-owned history are never paywalled.
- Scheduling uses dated occurrences while preserving original placement and
  program-cycle identity; missed work creates explicit choices, never automatic debt.
- Published programs use immutable sanitized versions, unlisted links/codes first,
  and pinned private installations. Updates require preview and explicit separate
  installation or replacement. Selective merging is deferred.
- Consistency uses weekly schedule adherence and an optional “weeks on plan” streak;
  planned rest is respected and accepted pauses preserve without incrementing it.
- Readiness produces explicit contextual proposals only. Rejection persists, and
  high readiness never silently increases difficulty.
- Health data is display-only initially, device-local by default, and synchronized
  only under separate cloud consent.
- Review eligibility initially requires installation, two completed prescribed
  sessions on separate days, and seven elapsed days; this is a versioned heuristic.
- Paid themes are first-party declarative token packages initially. Third-party theme
  creation and creator commerce are deferred.
- Unlisted sharing precedes public discovery/social features. Public surfaces require
  operational moderation, reporting, blocking where applicable, audit, support, and
  appeals before release.
- AdaptivPush claims no ownership over published programs. Functional routines and
  methods are not treated as platform intellectual property; only limited service
  permission necessary to distribute submitted content is contemplated, subject to
  qualified legal review for expressive content and final terms.
- Exact fitness thresholds are policy-versioned provisional heuristics requiring
  fixtures, user testing, outcome review, calibration, and appropriate expert review.
- Architecture remains Expo plus Supabase, incrementally reorganized as a modular
  monolith with a small kernel and narrowly privileged backend commands.
- Database work is additive and slice-driven. The packet's 28 proposed tables are a
  design inventory, not an approved migration batch.
- Release order prioritizes security/migration provenance, durable persistence,
  schedules/free progression, then monetizable advanced generation and equipment
  precision, followed by coaching, unlisted publishing, optional integrations and
  cosmetics, and finally operationally gated public/community features.

## Required workflow

### 1. Inventory and classify before restructuring

Create a complete planning-document inventory. For every document record:

- current path;
- title and purpose;
- current claimed authority;
- whether it contains code-backed fact, live/historical evidence, research,
  unapproved proposal, approved decision, execution status, or duplicated guidance;
- classification: new source of truth, active operational support, research source,
  historical evidence, or stale/superseded;
- destination path if moved;
- replacement document/section and inbound-link repair required;
- conflicts, unique retained value, and provenance notes.

Do not treat old branding or an “active” label as proof that a document remains
authoritative. Compare claims with current code, current git state, the approved
decision record, and the latest evidence.

### 2. Preserve stale documents visibly

- Preserve every stale or superseded document intact. Do not delete it.
- Move stale planning authorities into a clearly named archived/stale location that
  complies with the repository's archival conventions, such as a dated subfolder
  under `dev-doc/plans/legacy/`.
- Add an archive README that explicitly says the contents are historical,
  superseded, and non-authoritative; list each file's replacement and retained value.
- Add a short supersession banner to a stale document only if doing so will not alter
  a verbatim evidence packet. Never edit the original request or verified verbatim
  decision packet.
- Historical research, audits, development logs, and provenance sources should remain
  discoverable and should not be mislabeled as stale implementation authority.

### 3. Create the neutral canonical planning set

Create or replace the following source-of-truth responsibilities using clear
AdaptivPush/descriptive names. Choose exact paths consistent with repository
conventions and document them in `dev-doc/plans/active/PLAN-INDEX.md`:

1. **Canonical master implementation plan** — complete product, architecture,
   domain behavior, delivery contract, and definition of done.
2. **Modular execution register** — stable neutral slice/task identifiers, status,
   owners/routes, dependencies, entry/exit gates, evidence, rollback, and next action.
3. **Code-backed implementation status** — verified working/partial/scaffolded/missing
   status with exact file evidence and no aspirational claims presented as fact.
4. **Database and migration plan** — current verified schema/security posture,
   compatibility strategy, slice-owned changes, RLS/authority, indexes, constraints,
   backfills, rollback/fallback, and verification.
5. **Requirement and decision traceability map** — every legacy and new requirement
   mapped to its disposition, approved decision, module, slice, data contract, code
   surface, acceptance criteria, and verification.
6. **Planning-document inventory/archive map** — classification and old-to-new path
   mapping.

Supporting material may be split into additional documents only where that makes the
canonical set easier to navigate. Avoid duplicate authority: each rule must have one
owner, with other documents linking to it.

### 4. Make the master plan implementation-ready

The master plan must be detailed enough that a future implementation agent can take
one bounded slice without rediscovering product decisions. Include:

- product north star, scope, non-goals, and evidence-labeling rules;
- complete free, premium, cosmetic, integration, public/community, and deferred
  capability boundaries, including downgrade behavior;
- end-to-end user journeys and failure/recovery paths;
- current-state and target architecture maps;
- feature-capsule ownership and allowed dependency directions;
- stable domain contracts and invariants;
- program-generation pipeline and goal-specific planning behavior;
- detailed equipment-location, equipment-instance, available-load/increment, unit,
  configuration, and cross-machine comparability model;
- progression, readiness, deload, schedule, rest, deviation, consistency, publishing,
  review, health, theme, entitlement, moderation, and privacy state machines;
- persistence, idempotency, revision, offline/outbox, concurrency, timezone, and
  deletion/retention rules;
- security and RLS authority boundaries;
- research-to-product traceability with evidence strength, caveats, and heuristic
  labels;
- observability, rollout flags, compatibility, migration, rollback, accessibility,
  privacy, support, and operational readiness requirements;
- explicit risks and `REQUIRES INSPECTION` items rather than invented facts.

### 5. Build a highly mapped execution register

Use stable neutral AdaptivPush slice IDs. For every slice specify:

- user-visible outcome;
- in-scope and out-of-scope behavior;
- owning module/capsule;
- exact current files to inspect or modify and planned new files where justified;
- contracts and tables/columns/policies involved;
- true prerequisites versus sequencing preferences and optional enrichment;
- compatibility and data-migration behavior;
- entitlement, downgrade, offline, privacy, security, accessibility, and error states;
- acceptance scenarios and edge-case fixtures;
- smallest local verification gate and expected integration/release gate;
- rollout/flag strategy, observability, rollback/fallback, evidence artifact, and
  completion criteria;
- current status and next executable action.

Keep slices vertical and independently reviewable. Do not create a long
architecture-only phase. The critical path must be explicit, and safe parallel lanes
must be identified.

### 6. Provide end-to-end traceability

Create bidirectional mappings that allow a reader to move between:

`legacy requirement → approved decision → product behavior → module/contract →
database authority → code surfaces → execution slice → acceptance test → evidence`

Record every prior requirement as retained, revised, replaced, deferred, or rejected.
Preserve conflicts and rationale. Ensure all 28 proposed tables are individually
mapped to an approved slice, deferred capability, consolidation candidate, or
rejection; do not silently carry them all forward.

### 7. Update the living-document spine

Update at least:

- `dev-doc/plans/active/PLAN-INDEX.md`
- `dev-doc/main/OVERVIEW.md`
- `dev-doc/main/ARCHITECTURE.md`
- `dev-doc/main/CURRENT-STATE.md`
- `dev-doc/main/ROADMAP.md`
- `dev-doc/main/TODO.md`
- `dev-doc/main/TOC.md`
- `dev-doc/reports/DEV-LOG.md`

Replace stale authority statements and repair links. Keep living documents concise:
they summarize and route to the owning canonical documents rather than duplicating
the master plan.

## Verification

- Verify every moved path and inbound Markdown link.
- Search active, non-archived documents for stale source-of-truth claims and retired
  branding. Historical/provenance references are allowed only when clearly labeled.
- Regenerate `dev-doc/main/TOC.md` with the repository-supported command if its scope
  matches the new document structure.
- Run the smallest repository documentation/link/format checks available.
- Review the final diff for accidental application-code, migration, or unrelated
  user-file changes.
- Do not claim runtime, device, integration, database, or security verification from
  documentation-only work.

## Final handoff

Return:

- the new canonical documents and their authority;
- the archive location and inventory mapping;
- the approved release sequence and immediate first executable slice;
- verification performed and limitations;
- remaining `REQUIRES INSPECTION` items;
- confirmation that no application code or database mutation occurred;
- clickable links to the master plan, execution register, implementation status,
  database plan, traceability map, archive README, and updated plan index.

Do not begin implementation. Stop after presenting the consolidated planning corpus
for final user review.
