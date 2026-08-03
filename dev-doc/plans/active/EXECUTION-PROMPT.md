# FABLE-5 execution prompt

## Directive

Execute the AdaptivPush FABLE-5 plan through small, stage-gated, evidence-backed slices. Start from the current living state rather than assuming this prompt's snapshot is still current. Finish the active `F5-S*` stage before activating its successor, preserve compatibility and user trust, and never report external or device behavior as verified without recorded evidence. Treat the FABLE-5 master plan as the product contract, the execution register as the ordered ledger, the code-status document as observed implementation truth, and the living TODO as the immediate queue.

## Findings

### Confirmed facts

- `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md` is the canonical product and technical contract.
- `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md` owns stable stage IDs, dependencies, slices, gates, and stage status.
- `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md` records code-backed implementation state and does not define a competing roadmap.
- `dev-doc/main/TODO.md` owns immediate actionable work; as of 2026-08-03, `F5-S1` is active and `F5-S2` is next.
- Live Phase 2 schema, migration 015, ownership policies, and two-user RLS isolation were recorded as verified on 2026-08-03.
- The remaining `F5-S1` gate is the manual application compatibility matrix: new-user onboarding writes, legacy/missing-row reads, profile dual-write behavior, and generated-program context/cleanup behavior.
- The repository is an Expo 54, Expo Router 6, React Native 0.81, React 19, TypeScript 5.9, and Supabase application.
- `npm run lint` is the available static app gate. `package.json` currently has no automated test script.
- The remote default baseline is `origin/main`. Work must remain on a feature branch; direct pushes to `main` and force-pushes are prohibited.
- The audited worktree list contains only the current checkout. The documented `integrator` clone or actor is not available and cannot be assumed.
- `.chaos/`, `dev-doc/plans/active/chaos-refactor/execution-index.md`, and `dev-doc/plans/active/qa-audit/circular-workflow-baseline.md` are absent in the current checkout. Validated `.github/*` instructions and `dev-doc/main/*` are the active readable fallback.

### Reasonable inferences

- The safest next execution packet is completion of `F5-S1.3`, followed by synchronized closeout documentation; this follows the active TODO and the execution register's immediate packet.
- If device access, test accounts, Supabase credentials, or an approved integration route are unavailable, the executor can still inspect code, prepare a precise test matrix, run local static checks, and document the exact blocked evidence, but cannot close `F5-S1`.
- Once every `F5-S1` gate has evidence, the next bounded implementation slice should establish deterministic feature flags and a minimal pure TypeScript test runner before rollout-sensitive UI or behavior.

### Open questions

- `REQUIRES INSPECTION`: whether the execution environment has authenticated Supabase access, two suitable test users, and an Expo-capable simulator or physical device.
- `REQUIRES INSPECTION`: whether an approved direct-integration fallback exists while the `integrator` actor is absent.
- `REQUIRES INSPECTION`: whether upstream changes have advanced the active stage since this prompt was written.

## Impact

The unresolved compatibility matrix is the final guard between verified database safety and new behavioral work. Skipping it risks breaking existing users, misreporting successful writes, or leaving partial generated-program state. Advancing in stage order also ensures feature gates and tests exist before readiness, cycle, deload, analytics, or evidence behavior becomes user-visible.

## Next actions

1. **Action:** Rehydrate current authority and repository state.
   **Purpose:** Prevent execution from following stale stage labels or overwriting unrelated work.
   **Required context/input:** `AGENTS.md`, `dev-doc/main/OVERVIEW.md`, `dev-doc/main/CURRENT-STATE.md`, `dev-doc/main/TODO.md`, `dev-doc/plans/active/PLAN-INDEX.md`, the FABLE-5 master plan, execution register, code-status snapshot, `git status`, `git diff`, and `git log`.
   **Expected result:** One selected active stage and one bounded slice with explicit acceptance criteria.
   **Risk/dependency:** Active docs may have changed; current code and recorded evidence take precedence over this dated snapshot where the authority chain permits.

2. **Action:** Complete the remaining `F5-S1` compatibility matrix if it is still active.
   **Purpose:** Prove new-user, legacy-user, profile, and generated-program behavior against the deployed schema.
   **Required context/input:** `app/(qsetup)/quick-setup.tsx`, `app/(tabs)/profile/index.tsx`, `utils/profilePreferences.ts`, `utils/saveProgramToDb.ts`, `types/database.ts`, an authenticated test environment, and the exact `F5-S1.3` gate.
   **Expected result:** Reproducible pass/fail evidence for every matrix row, including row-level or UI evidence and cleanup behavior.
   **Risk/dependency:** Manual device and live-service access may be unavailable. Never substitute code inspection for runtime proof.

3. **Action:** Fix only defects required to close the selected bounded slice.
   **Purpose:** Keep changes reviewable and avoid leaking pending-stage behavior into `F5-S1`.
   **Required context/input:** The failing matrix row, its owning files, existing compatibility patterns, and relevant `.github/instructions/*` guidance.
   **Expected result:** Minimal compatibility-safe changes with explicit error handling and no v2 behavior exposure.
   **Risk/dependency:** Preserve `readiness_logs`, legacy/missing-row fallbacks, theme behavior, and all currently supported profile shapes.

4. **Action:** Run local verification and repeat the affected manual path.
   **Purpose:** Demonstrate both static correctness and behavior-level closure.
   **Required context/input:** `npm run lint`, the smallest affected Expo flow, and any focused checks added by the slice.
   **Expected result:** Command output plus a pass/fail manual record; failures return the slice to execution.
   **Risk/dependency:** Lint is not a substitute for runtime, RLS, persistence, accessibility, or device verification.

5. **Action:** Close the slice in the owning documentation and development log.
   **Purpose:** Keep plan state, code truth, and executed evidence synchronized.
   **Required context/input:** `dev-doc/reports/DEV-LOG.md`, `dev-doc/main/CURRENT-STATE.md`, `dev-doc/main/TODO.md`, `dev-doc/main/ROADMAP.md`, the execution register, and the code-status snapshot.
   **Expected result:** Evidence-linked status updates with no unsupported completion claim; activate `F5-S2` only if every `F5-S1` gate is closed.
   **Risk/dependency:** Do not rewrite historical source-reference plans as execution authorities.

6. **Action:** Integrate through the retained workflow.
   **Purpose:** Preserve a traceable, recoverable change history.
   **Required context/input:** A feature branch, focused diff, successful local gate, and the available integration route.
   **Expected result:** Small logical commit(s), integrator merge attempt when available, integration verification, and concise handoff.
   **Risk/dependency:** If the integrator is still absent and no approved fallback is documented, mark integration `REQUIRES INSPECTION`; never push directly to `main` or force-push.

## Execution readiness

### Relevant files, systems, and commands

- Product contract: `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md`
- Ordered ledger: `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md`
- Implementation truth: `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md`
- Immediate queue: `dev-doc/main/TODO.md`
- Current gate posture: `dev-doc/main/CURRENT-STATE.md`
- Architecture and discovery: `dev-doc/main/ARCHITECTURE.md`, `dev-doc/main/TOC.md`
- Evidence log: `dev-doc/reports/DEV-LOG.md`
- Repository instructions: `AGENTS.md`, `.github/instructions/*`, `.github/skills/*/SKILL.md`
- Git inspection: `git status --short --branch`, `git diff`, `git log --oneline --decorate -n 20`, `git remote show origin`, `git worktree list`
- App static gate: `npm run lint`
- Python-side gate when Python files change: `ruff check scripts/ tests/ src/`
- Broad Python suite when relevant: `pytest tests/ -v`

### Preconditions

- Worktree and existing changes are inspected before editing.
- Work occurs on a feature branch based on the repository's real `origin/main` baseline.
- The executor has selected exactly one bounded slice from the currently active stage.
- External credentials, device access, and destructive-action authority are identified before any dependent action.
- Relevant canonical instruction or skill files are read before using the associated workflow.

### Constraints and assumptions

- Follow authority in this order: user instructions; present `.chaos/manifests/*`; validated `.github/instructions/*`; `.github/agents/*` and `.github/skills/*`; `AGENTS.md`; task-loaded references.
- If `.chaos/` remains absent, use validated `.github/*` plus the living-doc spine; do not fabricate missing manifests.
- Use only stable `F5-S*` identifiers for active work. Older evidence-backed plans are source references only.
- Stay inside the active stage. Do not begin `F5-S2` while any `F5-S1` gate remains open.
- Preserve user changes in a dirty worktree. Do not reset, discard, rewrite, or broadly reformat unrelated work.
- Do not expose rollout-sensitive v2 behavior before deterministic flags exist and default off.
- Do not remove legacy compatibility paths until rollout and migration evidence explicitly allow it.
- Treat readiness, cycle symptoms, injuries, profile information, and workout history as sensitive data.
- Never hardcode or print secrets. Client code may use only public client configuration.
- Do not claim HealthKit, support, export, deletion, email, SMS, backup, notification timing, or local-only storage behavior that is not implemented and verified.
- Prefer additive, reversible schema changes; require explicit approval before destructive data or storage actions.
- When a fact is not confirmed by code, logs, commands, live-service evidence, or user-provided context, label it `REQUIRES INSPECTION`.

### Validation criteria

- The selected slice's execution-register gate is satisfied with reproducible evidence.
- `npm run lint` passes with no new errors for TypeScript/TSX work.
- Any changed pure domain logic has focused automated tests once a runner exists.
- Affected mobile paths are manually checked in the smallest relevant state matrix, including failure and legacy states.
- Supabase claims are supported by live target-environment evidence; code inspection alone is labeled unverified.
- Dark, light, system, and retained palette behavior is checked when UI/theme surfaces change.
- Loading, empty, error, disabled, pressed, offline, permission, and gated states are checked when applicable.
- Living docs and `dev-doc/reports/DEV-LOG.md` agree with the resulting code and verification evidence.
- `git diff --check` passes and the final diff contains no unrelated changes or secrets.
- Stage advancement occurs only after every gate and dependency for the current stage is closed.

### Rollback and recovery notes

- Behavioral rollback should use deterministic feature flags once `F5-S2` lands; schema rollback is not the first rollout lever.
- Preserve legacy columns, readers, writers, and `readiness_logs` throughout the compatibility window.
- For multi-table writes, prefer transaction/RPC, idempotent retry, or explicit cleanup; verify orphan prevention on failure.
- If a manual or live check fails, capture the exact account state, inputs, expected result, actual result, logs, and affected rows before making a focused fix.
- If credentials or device access are missing, finish all safe local inspection and preparation, record the blocker precisely, and stop short of a false pass.
- If integration fails, retain the feature-branch commits, report the conflict or missing integrator route, and do not bypass branch protection implicitly.

## Recommended path

Use one evidence-producing slice at a time. Re-read current state, select the first unmet gate in the active stage, inspect its existing implementation, run or prepare the exact verification, fix only demonstrated defects, and synchronize code truth with the living docs. This keeps the FABLE-5 program moving while protecting compatibility, sensitive data, and rollout safety.

## Paste-ready execution prompt

```text
You are the implementation executor for the AdaptivPush FABLE-5 lane.

Objective:
Advance the repository by completing exactly one bounded, highest-priority slice from the currently active F5-S* stage. Produce code, verification evidence, and synchronized living documentation. Do not advance a stage until all of its dependencies and gates are demonstrably closed.

Working directory:
C:\workout-app\AdaptivPush

Authority and required first reads, in order:
1. AGENTS.md
2. dev-doc/main/OVERVIEW.md
3. dev-doc/main/CURRENT-STATE.md
4. dev-doc/main/TODO.md
5. dev-doc/plans/active/PLAN-INDEX.md
6. reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md
7. dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md
8. dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md
9. dev-doc/main/ARCHITECTURE.md and dev-doc/main/TOC.md as needed for discovery
10. relevant validated .github/instructions/* and .github/skills/*/SKILL.md files for the selected work

Authority model:
- The master plan defines the complete product and technical contract.
- The execution register defines stable F5-S* ordering, dependencies, slices, and gates.
- The code-status snapshot reports implementation truth; it is not a competing roadmap.
- The living TODO owns immediate work.
- Older evidence-backed execution, implementation, and UI plans are reference material only.
- If documents conflict, follow the authority order, verify current code and logs, and record the conflict instead of guessing.

Current snapshot to verify before acting:
- F5-S1 is active; F5-S2 is next.
- Phase 2 live schema, migration 015, and two-user RLS isolation were recorded verified on 2026-08-03.
- The remaining F5-S1 gate is the application compatibility matrix: new-user onboarding writes, legacy/missing-row reads, profile dual-read/dual-write behavior, and generated-program context plus failure cleanup.
- Feature flags and an automated application test runner are not yet present.
- npm run lint is the current static app gate.
- The integrator actor and .chaos/ surfaces were absent when this prompt was written.
Treat every snapshot item as stale-capable: confirm it from current files and commands.

Operating procedure:
1. Inspect git status, current branch, diff, recent log, origin default branch, and worktrees. Preserve all unrelated user changes. Never work directly on main, push to main, force-push, reset, or discard user work.
2. Reconcile CURRENT-STATE, TODO, the execution register, code status, development log, and current code. Identify the active stage and the first unmet gate.
3. Select one bounded slice only. State its F5-S* ID, objective, in-scope files/systems, explicit non-goals, dependencies, risks, acceptance criteria, and smallest useful verification before editing.
4. Inspect the actual implementation and history for the selected slice. Separate confirmed facts, reasonable inferences, and REQUIRES INSPECTION items. Do not invent runtime, schema, device, or credential evidence.
5. Execute the slice end to end. Make minimal, cohesive changes. Preserve Expo/React Native conventions, strict TypeScript, Supabase compatibility, theme/palette behavior, accessibility, and explicit error handling.
6. For F5-S1, expose no v2 behavior. Preserve readiness_logs and legacy/missing-row fallbacks. If the compatibility matrix remains open, run every available row and capture exact pass/fail evidence. Code inspection is not a runtime pass.
7. For later stages, obey dependencies and flags. All rollout-sensitive flags must resolve deterministically and default off; cycle support also requires explicit opt-in. Keep pure training decisions in testable utilities and attach reason, confidence/fallback posture, evidence keys where applicable, and user-override semantics.
8. Run the smallest relevant verification. At minimum run npm run lint for TypeScript/TSX changes. Run targeted tests once configured, the affected Expo flow, relevant legacy/failure states, and git diff --check. Use ruff check scripts/ tests/ src/ before staging Python changes.
9. Do not claim success for Supabase, RLS, device, notification, HealthKit, support, export, deletion, email, SMS, backup, or integration behavior without direct recorded evidence. If access is missing, complete safe local work and record the exact blocker as REQUIRES INSPECTION.
10. Update dev-doc/reports/DEV-LOG.md with commands, environment, inputs, results, failures, and external evidence. Synchronize only the owning living documents and active plan ledgers. Activate the next F5-S* stage only when all current-stage gates are closed.
11. Review the final diff for scope, secrets, unsupported claims, compatibility regressions, and unrelated edits. Keep commits small and logical. Use the integrator route if available; otherwise use only an explicitly approved fallback and mark the missing integration route if unresolved.

Non-negotiable constraints:
- Never fabricate missing .chaos/ manifests or absent workflow documents.
- Never treat source-reference plans as active execution authorities.
- Never skip the active-stage gate to start more attractive later-stage work.
- Never expose unsupported integrations or operational workflows as real.
- Never make destructive database, storage, branch, or filesystem changes without explicit authority and exact target verification.
- Never silently remove existing compatibility behavior.
- Never ask for clarification until safe repository inspection and all non-blocked work for the slice are exhausted.

Required output during execution:
- Selected slice: F5-S* ID, objective, scope, non-goals, acceptance criteria.
- Evidence: confirmed facts, inferences, and REQUIRES INSPECTION items.
- Progress: concise updates after inspection, implementation, verification, and documentation closeout.
- Blockers: exact missing input/access, work completed despite it, and the next action required.

Final output format:
1. Outcome: what changed or why the slice could not be closed.
2. Files changed: each path with its purpose.
3. Verification: exact commands/manual checks and pass/fail results.
4. Evidence and decisions: material implementation choices and recorded external proof.
5. Remaining risks or REQUIRES INSPECTION items.
6. Stage status: whether the active stage remains active or may advance, with gate-by-gate justification.
7. Next bounded slice: one recommended F5-S* action only.

Begin now by reading the required authority files and inspecting repository state. Do not merely propose a plan: continue through safe implementation, verification, and documentation for the selected bounded slice.
```
