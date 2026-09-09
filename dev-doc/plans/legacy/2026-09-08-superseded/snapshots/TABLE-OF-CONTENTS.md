# Table of Contents

> Project: AdaptivPush
> Last Updated: 2026-04-30

---

## Root

| File                | Purpose                            |
| ------------------- | ---------------------------------- |
| `README.md`         | project overview and usage         |
| `app.json`          | expo app configuration             |
| `CLAUDE.md`         | repository operating instructions  |
| `eslint.config.js`  | eslint configuration               |
| `expo-env.d.ts`     | expo environment type declarations |
| `index.js`          | expo entry point                   |
| `package-lock.json` | locked npm dependency tree         |
| `package.json`      | npm package manifest               |
| `SETUP.md`          | local setup guide                  |
| `tsconfig.json`     | typescript compiler config         |
| `.env`              | environment variable definitions   |
| `.gitignore`        | git ignore rules                   |

---

## .claude/

| File                  | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `README.md`           | project overview and usage                                                |
| `convert-commands.py` | command metadata: description and allowed tools                           |
| `git-config.example`  | git configuration - copy this file to git-config and set your credentials |
| `QUICKSTART.md`       | claude quickstart                                                         |
| `settings.json`       | claude workspace file for settings                                        |
| `VERSION`             | claude workspace file for version                                         |
| `.gitignore`          | git ignore rules                                                          |

---

### .claude/agent-state/

| File                       | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `README.md`                | project overview and usage              |
| `research-agent.output.md` | agent state artifact for research agent |
| `.gitkeep`                 | agent state artifact for                |

---

### .claude/agents/

| File                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `agent-generation-agent.md` | agent definition for agent generation agent |
| `brainstorm-agent.md`       | agent definition for brainstorm agent       |
| `c-agent.md`                | agent definition for c agent                |
| `cloud-agent.md`            | agent definition for cloud agent            |
| `cpp-agent.md`              | agent definition for cpp agent              |
| `csharp-agent.md`           | agent definition for csharp agent           |
| `data-science-agent.md`     | agent definition for data science agent     |
| `database-agent.md`         | agent definition for database agent         |
| `debug-agent.md`            | agent definition for debug agent            |
| `dependency-agent.md`       | agent definition for dependency agent       |
| `design-systems-agent.md`   | agent definition for design systems agent   |
| `devops-agent.md`           | agent definition for devops agent           |
| `docs-agent.md`             | agent definition for docs agent             |
| `git-manager-agent.md`      | agent definition for git manager agent      |
| `go-agent.md`               | agent definition for go agent               |
| `java-agent.md`             | agent definition for java agent             |
| `migration-agent.md`        | agent definition for migration agent        |
| `mobile-agent.md`           | agent definition for mobile agent           |
| `monitoring-agent.md`       | agent definition for monitoring agent       |
| `performance-agent.md`      | agent definition for performance agent      |
| `planning-agent.md`         | agent definition for planning agent         |
| `pm-agent.md`               | agent definition for pm agent               |
| `project-audit.md`          | agent definition for project audit          |
| `python-agent.md`           | agent definition for python agent           |
| `r-agent.md`                | agent definition for r agent                |
| `refactor-agent.md`         | agent definition for refactor agent         |
| `release-agent.md`          | agent definition for release agent          |
| `research-agent.md`         | agent definition for research agent         |
| `review-agent.md`           | agent definition for review agent           |
| `rust-agent.md`             | agent definition for rust agent             |
| `scripts-agent.md`          | agent definition for scripts agent          |
| `security-agent.md`         | agent definition for security agent         |
| `swift-agent.md`            | agent definition for swift agent            |
| `test-agent.md`             | agent definition for test agent             |
| `typescript-agent.md`       | agent definition for typescript agent       |
| `ui-ux-agent.md`            | agent definition for ui ux agent            |

---

### .claude/commands/

| File                | Purpose                          |
| ------------------- | -------------------------------- |
| `COMMAND-README.md` | command guide for command readme |

---

### .claude/commands/context/

| File                | Purpose                          |
| ------------------- | -------------------------------- |
| `CONTEXT-ADD.md`    | command guide for context add    |
| `CONTEXT-SEARCH.md` | command guide for context search |
| `CONTEXT-STATS.md`  | command guide for context stats  |
| `CONTEXT-SYNC.md`   | command guide for context sync   |

---

### .claude/commands/core-workflow/

| File                  | Purpose                            |
| --------------------- | ---------------------------------- |
| `AGENT-GENERATION.md` | command guide for agent generation |
| `AGENT-RESULTS.md`    | command guide for agent results    |
| `AGENT-RUN.md`        | command guide for agent run        |
| `AGENT-STATUS.md`     | command guide for agent status     |
| `ANALYZE.md`          | command guide for analyze          |
| `AUDIT.md`            | command guide for audit            |
| `BRAINSTORM.md`       | command guide for brainstorm       |
| `CHECKPOINT.md`       | command guide for checkpoint       |
| `CI-CD.md`            | command guide for ci cd            |
| `CLEANUP.md`          | command guide for cleanup          |
| `DEPENDENCY-AUDIT.md` | command guide for dependency audit |
| `DEPLOY.md`           | command guide for deploy           |
| `GETTING-STARTED.md`  | command guide for getting started  |
| `GIT-MANAGER.md`      | command guide for git manager      |
| `HELP.md`             | command guide for help             |
| `MONITORING-SETUP.md` | command guide for monitoring setup |
| `ONBOARD.md`          | command guide for onboard          |
| `PLAN.md`             | command guide for plan             |
| `PM.md`               | command guide for pm               |
| `PROFILE.md`          | command guide for profile          |
| `PYDEV-FEATURE.md`    | command guide for pydev feature    |
| `PYDEV-WORKFLOW.md`   | command guide for pydev workflow   |
| `RELEASE.md`          | command guide for release          |
| `RESEARCH.md`         | command guide for research         |
| `REVIEW.md`           | command guide for review           |
| `SECURITY.md`         | command guide for security         |
| `SESSION-HANDOFF.md`  | command guide for session handoff  |
| `SPRINT.md`           | command guide for sprint           |
| `TOKEN-AUDIT.md`      | command guide for token audit      |
| `VERIFY.md`           | command guide for verify           |

---

### .claude/commands/database/

| File               | Purpose                         |
| ------------------ | ------------------------------- |
| `MIGRATE-CHECK.md` | command guide for migrate check |
| `MIGRATION.md`     | command guide for migration     |
| `SEED.md`          | command guide for seed          |

---

### .claude/commands/debug-analysis/

| File             | Purpose                       |
| ---------------- | ----------------------------- |
| `DEBUG.md`       | command guide for debug       |
| `EXPLAIN.md`     | command guide for explain     |
| `FIND-USAGES.md` | command guide for find usages |
| `TRACE.md`       | command guide for trace       |

---

### .claude/commands/documentation/

| File                   | Purpose                             |
| ---------------------- | ----------------------------------- |
| `API-DOCS.md`          | command guide for api docs          |
| `ARCHITECTURE-SYNC.md` | command guide for architecture sync |
| `DEV-LOG-GENERATE.md`  | command guide for dev log generate  |
| `DOCUMENT.md`          | command guide for document          |
| `TOC-GENERATE.md`      | command guide for toc generate      |

---

### .claude/commands/git-pr/

| File           | Purpose                     |
| -------------- | --------------------------- |
| `CHANGELOG.md` | command guide for changelog |
| `COMMIT.md`    | command guide for commit    |
| `PR-PREP.md`   | command guide for pr prep   |

---

### .claude/commands/quick-fixes/

| File              | Purpose                        |
| ----------------- | ------------------------------ |
| `FIX-IMPORTS.md`  | command guide for fix imports  |
| `FIX-LINT.md`     | command guide for fix lint     |
| `FIX-TYPES-TS.md` | command guide for fix types ts |
| `FIX-TYPES.md`    | command guide for fix types    |
| `LINT-CHECK.md`   | command guide for lint check   |

---

### .claude/commands/refactoring/

| File               | Purpose                         |
| ------------------ | ------------------------------- |
| `EXTRACT.md`       | command guide for extract       |
| `REFACTOR-PLAN.md` | command guide for refactor plan |
| `REFACTOR.md`      | command guide for refactor      |
| `RENAME-SAFE.md`   | command guide for rename safe   |

---

### .claude/commands/scaffolding/

| File                   | Purpose                             |
| ---------------------- | ----------------------------------- |
| `NEW-ADAPTER.md`       | command guide for new adapter       |
| `NEW-COMPONENT.md`     | command guide for new component     |
| `NEW-CONTEXT.md`       | command guide for new context       |
| `NEW-ENDPOINT.md`      | command guide for new endpoint      |
| `NEW-HOOK.md`          | command guide for new hook          |
| `NEW-MODEL.md`         | command guide for new model         |
| `NEW-PAGE.md`          | command guide for new page          |
| `NEW-ROUTE-HANDLER.md` | command guide for new route handler |
| `NEW-SERVICE.md`       | command guide for new service       |

---

### .claude/commands/testing/

| File                  | Purpose                            |
| --------------------- | ---------------------------------- |
| `TEST-EDGE-CASES.md`  | command guide for test edge cases  |
| `TEST-GENERATE-TS.md` | command guide for test generate ts |
| `TEST-GENERATE.md`    | command guide for test generate    |
| `TEST.md`             | command guide for test             |

---

### .claude/hooks/

| File                 | Purpose                         |
| -------------------- | ------------------------------- |
| `audit.log`          | hook script for audit           |
| `block-dangerous.sh` | hook script for block dangerous |
| `block-secrets.sh`   | hook script for block secrets   |
| `format-python.sh`   | hook script for format python   |
| `log-session.sh`     | hook script for log session     |
| `post-edit-lint.sh`  | hook script for post edit lint  |
| `session-setup.sh`   | hook script for session setup   |

---

### .claude/reference/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `INDEX.md` | reference guide for index |

---

### .claude/reference/api/

| File                | Purpose                            |
| ------------------- | ---------------------------------- |
| `MCP-CLIENT-API.md` | reference guide for mcp client api |

---

### .claude/reference/architecture/

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `API-DESIGN.md`       | reference guide for api design       |
| `CQRS-PATTERNS.md`    | reference guide for cqrs patterns    |
| `DESIGN-PATTERNS.md`  | reference guide for design patterns  |
| `SOLID-PRINCIPLES.md` | reference guide for solid principles |

---

### .claude/reference/concurrency/

| File                 | Purpose                             |
| -------------------- | ----------------------------------- |
| `CPP-CONCURRENCY.md` | reference guide for cpp concurrency |

---

### .claude/reference/data/

| File                     | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `DATABASE.md`            | reference guide for database            |
| `ENTITYFRAMEWORK.md`     | reference guide for entityframework     |
| `JPA-HIBERNATE.md`       | reference guide for jpa hibernate       |
| `PYDANTIC.md`            | reference guide for pydantic            |
| `RECORDS-DTOS.md`        | reference guide for records dtos        |
| `SERDE.md`               | reference guide for serde               |
| `STATISTICS-PATTERNS.md` | reference guide for statistics patterns |
| `TIDY-DATA.md`           | reference guide for tidy data           |
| `VALIDATION.md`          | reference guide for validation          |

---

### .claude/reference/embedded/

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `FIRMWARE-PATTERNS.md` | reference guide for firmware patterns |

---

### .claude/reference/frameworks/

| File                    | Purpose                                |
| ----------------------- | -------------------------------------- |
| `ASPNET-PATTERNS.md`    | reference guide for aspnet patterns    |
| `FASTAPI-PATTERNS.md`   | reference guide for fastapi patterns   |
| `FLUTTER-PATTERNS.md`   | reference guide for flutter patterns   |
| `GO-CLI.md`             | reference guide for go cli             |
| `GO-CONCURRENCY.md`     | reference guide for go concurrency     |
| `GO-GRPC.md`            | reference guide for go grpc            |
| `GO-WEB.md`             | reference guide for go web             |
| `NEXTJS-PATTERNS.md`    | reference guide for nextjs patterns    |
| `REACT-PATTERNS.md`     | reference guide for react patterns     |
| `RUST-ASYNC.md`         | reference guide for rust async         |
| `RUST-AXUM.md`          | reference guide for rust axum          |
| `RUST-CLI.md`           | reference guide for rust cli           |
| `SHINY-PATTERNS.md`     | reference guide for shiny patterns     |
| `SPRING-BOOT.md`        | reference guide for spring boot        |
| `SPRING-CLOUD.md`       | reference guide for spring cloud       |
| `SWIFTUI-PATTERNS.md`   | reference guide for swiftui patterns   |
| `TIDYVERSE-PATTERNS.md` | reference guide for tidyverse patterns |

---

### .claude/reference/practices/

| File                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `AGENT-ORCHESTRATION.md`  | reference guide for agent orchestration  |
| `AGENT-PATTERNS.md`       | reference guide for agent patterns       |
| `ARTIFACT-PROTOCOL.md`    | reference guide for artifact protocol    |
| `CLEAN-CODE.md`           | reference guide for clean code           |
| `CODE-REVIEW.md`          | reference guide for code review          |
| `CONTEXT-BUS.md`          | reference guide for context bus          |
| `GIT-WORKFLOW.md`         | reference guide for git workflow         |
| `MEMORY-SAFETY.md`        | reference guide for memory safety        |
| `PORTABILITY.md`          | reference guide for portability          |
| `PROJECT-ORGANIZATION.md` | reference guide for project organization |
| `R-PACKAGES.md`           | reference guide for r packages           |
| `RAII-PATTERNS.md`        | reference guide for raii patterns        |
| `REFACTORING.md`          | reference guide for refactoring          |

---

### .claude/reference/processes/

| File      | Purpose                  |
| --------- | ------------------------ |
| `CICD.md` | reference guide for cicd |

---

### .claude/reference/security/

| File                 | Purpose                             |
| -------------------- | ----------------------------------- |
| `SECURITY.md`        | reference guide for security        |
| `WEB-UI-SECURITY.md` | reference guide for web ui security |

---

### .claude/reference/stl/

| File                 | Purpose                             |
| -------------------- | ----------------------------------- |
| `RANGES-PATTERNS.md` | reference guide for ranges patterns |

---

### .claude/reference/styles/

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `C-STYLE.md`           | reference guide for c style           |
| `CPP-STYLE.md`         | reference guide for cpp style         |
| `CSHARP-STYLE.md`      | reference guide for csharp style      |
| `GO-STYLE.md`          | reference guide for go style          |
| `JAVA-STYLE.md`        | reference guide for java style        |
| `PYTHON-STYLE.md`      | reference guide for python style      |
| `R-STYLE.md`           | reference guide for r style           |
| `RUST-STYLE.md`        | reference guide for rust style        |
| `SQL-STYLE.md`         | reference guide for sql style         |
| `SWIFT-STYLE.md`       | reference guide for swift style       |
| `TAILWIND-PATTERNS.md` | reference guide for tailwind patterns |
| `TYPESCRIPT-STYLE.md`  | reference guide for typescript style  |

---

### .claude/reference/systems/

| File                | Purpose                            |
| ------------------- | ---------------------------------- |
| `POSIX-PATTERNS.md` | reference guide for posix patterns |

---

### .claude/reference/technical/

| File            | Purpose                        |
| --------------- | ------------------------------ |
| `ALGORITHMS.md` | reference guide for algorithms |

---

### .claude/reference/templates/

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `CONCEPTS-PATTERNS.md` | reference guide for concepts patterns |

---

### .claude/reference/testing/

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `C-TESTING.md`         | reference guide for c testing         |
| `GO-TESTING.md`        | reference guide for go testing        |
| `GTEST-PATTERNS.md`    | reference guide for gtest patterns    |
| `JUNIT-TESTING.md`     | reference guide for junit testing     |
| `PYTEST-PATTERNS.md`   | reference guide for pytest patterns   |
| `RUST-TESTING.md`      | reference guide for rust testing      |
| `TESTING.md`           | reference guide for testing           |
| `TESTTHAT-PATTERNS.md` | reference guide for testthat patterns |
| `VITEST-PATTERNS.md`   | reference guide for vitest patterns   |
| `XUNIT-PATTERNS.md`    | reference guide for xunit patterns    |

---

### .claude/reference/ui/

| File                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `SHADCN-UI-COMPONENTS.md` | reference guide for shadcn ui components |

---

### .claude/reference/visualization/

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `GGPLOT2-PATTERNS.md` | reference guide for ggplot2 patterns |

---

### .claude/scripts/

| File            | Purpose                          |
| --------------- | -------------------------------- |
| `registry.json` | claude script asset for registry |

---

### .claude/skills/agent-generation/

| File       | Purpose                             |
| ---------- | ----------------------------------- |
| `SKILL.md` | skill workflow for agent generation |

---

### .claude/skills/agent-run/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill workflow for agent run |

---

### .claude/skills/agent-status/

| File       | Purpose                         |
| ---------- | ------------------------------- |
| `SKILL.md` | skill workflow for agent status |

---

### .claude/skills/analyze/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for analyze |

---

### .claude/skills/architecture-sync/

| File       | Purpose                              |
| ---------- | ------------------------------------ |
| `SKILL.md` | skill workflow for architecture sync |

---

### .claude/skills/audit/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill workflow for audit |

---

### .claude/skills/brainstorm/

| File       | Purpose                       |
| ---------- | ----------------------------- |
| `SKILL.md` | skill workflow for brainstorm |

---

### .claude/skills/c-agent/

| File           | Purpose                     |
| -------------- | --------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for c agent |
| `SKILL.md`     | skill workflow for c agent  |

---

### .claude/skills/changelog/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill workflow for changelog |

---

### .claude/skills/checkpoint/

| File       | Purpose                       |
| ---------- | ----------------------------- |
| `SKILL.md` | skill workflow for checkpoint |

---

### .claude/skills/ci-cd/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill workflow for ci cd |

---

### .claude/skills/cleanup/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for cleanup |

---

### .claude/skills/cloud-agent/

| File           | Purpose                         |
| -------------- | ------------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for cloud agent |
| `SKILL.md`     | skill workflow for cloud agent  |

---

### .claude/skills/commit/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill workflow for commit |

---

### .claude/skills/context-add/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for context add |

---

### .claude/skills/context-search/

| File       | Purpose                           |
| ---------- | --------------------------------- |
| `SKILL.md` | skill workflow for context search |

---

### .claude/skills/context-stats/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill workflow for context stats |

---

### .claude/skills/context-sync/

| File       | Purpose                         |
| ---------- | ------------------------------- |
| `SKILL.md` | skill workflow for context sync |

---

### .claude/skills/cpp-agent/

| File           | Purpose                       |
| -------------- | ----------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for cpp agent |
| `SKILL.md`     | skill workflow for cpp agent  |

---

### .claude/skills/csharp-agent/

| File           | Purpose                          |
| -------------- | -------------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for csharp agent |
| `SKILL.md`     | skill workflow for csharp agent  |

---

### .claude/skills/data-science-agent/

| File           | Purpose                                |
| -------------- | -------------------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for data science agent |
| `SKILL.md`     | skill workflow for data science agent  |

---

### .claude/skills/debug/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill workflow for debug |

---

### .claude/skills/dependency-audit/

| File       | Purpose                             |
| ---------- | ----------------------------------- |
| `SKILL.md` | skill workflow for dependency audit |

---

### .claude/skills/deploy/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill workflow for deploy |

---

### .claude/skills/dev-log-generate/

| File       | Purpose                             |
| ---------- | ----------------------------------- |
| `SKILL.md` | skill workflow for dev log generate |

---

### .claude/skills/document/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for document |

---

### .claude/skills/explain/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for explain |

---

### .claude/skills/extract/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for extract |

---

### .claude/skills/find-usages/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for find usages |

---

### .claude/skills/fix-lint/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for fix lint |

---

### .claude/skills/fix-types/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill workflow for fix types |

---

### .claude/skills/getting-started/

| File       | Purpose                            |
| ---------- | ---------------------------------- |
| `SKILL.md` | skill workflow for getting started |

---

### .claude/skills/git-manager/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for git manager |

---

### .claude/skills/go-agent/

| File           | Purpose                      |
| -------------- | ---------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for go agent |
| `SKILL.md`     | skill workflow for go agent  |

---

### .claude/skills/help/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill workflow for help |

---

### .claude/skills/integrator-loop/

| File             | Purpose                             |
| ---------------- | ----------------------------------- |
| `LOOP-PROMPT.md` | prompt template for integrator loop |
| `SKILL.md`       | skill workflow for integrator loop  |

---

### .claude/skills/java-agent/

| File           | Purpose                        |
| -------------- | ------------------------------ |
| `ECOSYSTEM.md` | ecosystem notes for java agent |
| `SKILL.md`     | skill workflow for java agent  |

---

### .claude/skills/migration/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill workflow for migration |

---

### .claude/skills/mobile-agent/

| File           | Purpose                          |
| -------------- | -------------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for mobile agent |
| `SKILL.md`     | skill workflow for mobile agent  |

---

### .claude/skills/monitoring-setup/

| File       | Purpose                             |
| ---------- | ----------------------------------- |
| `SKILL.md` | skill workflow for monitoring setup |

---

### .claude/skills/new-adapter/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for new adapter |

---

### .claude/skills/new-component/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill workflow for new component |

---

### .claude/skills/new-context/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for new context |

---

### .claude/skills/new-endpoint/

| File       | Purpose                         |
| ---------- | ------------------------------- |
| `SKILL.md` | skill workflow for new endpoint |

---

### .claude/skills/new-hook/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for new hook |

---

### .claude/skills/new-model/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill workflow for new model |

---

### .claude/skills/new-page/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for new page |

---

### .claude/skills/new-route-handler/

| File       | Purpose                              |
| ---------- | ------------------------------------ |
| `SKILL.md` | skill workflow for new route handler |

---

### .claude/skills/new-service/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for new service |

---

### .claude/skills/onboard/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for onboard |

---

### .claude/skills/plan/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill workflow for plan |

---

### .claude/skills/pm/

| File       | Purpose               |
| ---------- | --------------------- |
| `SKILL.md` | skill workflow for pm |

---

### .claude/skills/pr-prep/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for pr prep |

---

### .claude/skills/profile/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for profile |

---

### .claude/skills/project-qa/

| File       | Purpose                       |
| ---------- | ----------------------------- |
| `SKILL.md` | skill workflow for project qa |

---

### .claude/skills/pydev-feature/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill workflow for pydev feature |

---

### .claude/skills/pydev-workflow/

| File       | Purpose                           |
| ---------- | --------------------------------- |
| `SKILL.md` | skill workflow for pydev workflow |

---

### .claude/skills/python-agent/

| File           | Purpose                          |
| -------------- | -------------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for python agent |
| `SKILL.md`     | skill workflow for python agent  |

---

### .claude/skills/r-agent/

| File           | Purpose                     |
| -------------- | --------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for r agent |
| `SKILL.md`     | skill workflow for r agent  |

---

### .claude/skills/refactor/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for refactor |

---

### .claude/skills/release/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill workflow for release |

---

### .claude/skills/rename-safe/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for rename safe |

---

### .claude/skills/research/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for research |

---

### .claude/skills/review/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill workflow for review |

---

### .claude/skills/rust-agent/

| File           | Purpose                        |
| -------------- | ------------------------------ |
| `ECOSYSTEM.md` | ecosystem notes for rust agent |
| `SKILL.md`     | skill workflow for rust agent  |

---

### .claude/skills/scripts-agent/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill workflow for scripts agent |

---

### .claude/skills/security/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill workflow for security |

---

### .claude/skills/seed/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill workflow for seed |

---

### .claude/skills/session-handoff/

| File       | Purpose                            |
| ---------- | ---------------------------------- |
| `SKILL.md` | skill workflow for session handoff |

---

### .claude/skills/sprint-full/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for sprint full |

---

### .claude/skills/sprint/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill workflow for sprint |

---

### .claude/skills/swift-agent/

| File           | Purpose                         |
| -------------- | ------------------------------- |
| `ECOSYSTEM.md` | ecosystem notes for swift agent |
| `SKILL.md`     | skill workflow for swift agent  |

---

### .claude/skills/sync/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill workflow for sync |

---

### .claude/skills/test-edge-cases/

| File       | Purpose                            |
| ---------- | ---------------------------------- |
| `SKILL.md` | skill workflow for test edge cases |

---

### .claude/skills/test-generate/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill workflow for test generate |

---

### .claude/skills/test/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill workflow for test |

---

### .claude/skills/toc-generate/

| File       | Purpose                         |
| ---------- | ------------------------------- |
| `SKILL.md` | skill workflow for toc generate |

---

### .claude/skills/token-audit/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for token audit |

---

### .claude/skills/trace/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill workflow for trace |

---

### .claude/skills/typescript-agent/

| File           | Purpose                              |
| -------------- | ------------------------------------ |
| `ECOSYSTEM.md` | ecosystem notes for typescript agent |
| `SKILL.md`     | skill workflow for typescript agent  |

---

### .claude/skills/ui-ux-agent/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill workflow for ui ux agent |

---

### .claude/skills/verify/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill workflow for verify |

---

### .claude/templates/

| File                  | Purpose                       |
| --------------------- | ----------------------------- |
| `CLAUDE-TEMPLATE.MD`  | template for claude template  |
| `DEV-LOG-TEMPLATE.MD` | template for dev log template |
| `TOC-PROMPT.md`       | template for toc prompt       |
| `TODO-TEMPLATE.MD`    | template for todo template    |

---

### .claude/workflows/pydev/

| File                        | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `01-PROJECT-INIT.MD`        | pydev-workflow: step 01 — project initialization     |
| `02-SYSTEM-ARCHITECTURE.MD` | pydev-workflow: step 02 — system architecture        |
| `03-DATA-MODELS.MD`         | pydev-workflow: step 03 — data models                |
| `04-CORE-LOGIC.MD`          | pydev-workflow: step 04 — core logic design          |
| `05-INTERFACES.MD`          | pydev-workflow: step 05 — interface design           |
| `06-IMPL-PLAN.MD`           | pydev-workflow: step 06 — implementation plan        |
| `07-IMPLEMENTATION.MD`      | pydev-workflow: step 07 — implementation             |
| `08-TEST-STRATEGY.MD`       | pydev-workflow: step 08 — test strategy              |
| `09-TEST-IMPL.MD`           | pydev-workflow: step 09 — test implementation        |
| `10-INTEGRATION.MD`         | pydev-workflow: step 10 — integration and refinement |
| `11-DOCUMENTATION.MD`       | pydev-workflow: step 11 — documentation              |
| `12-DEPLOYMENT.MD`          | pydev-workflow: step 12 — deployment preparation     |
| `PYDEV-FEATURE.MD`          | pydev-feature: feature implementation workflow       |
| `PYDEV-WORKFLOW-INDEX.MD`   | pydev-workflow: master index                         |

---

## .github/

| File                      | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `copilot-instructions.md` | chaos-ai (cw) — repository instructions |

---

### .github/agents/

| File                        | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `agent-generation-agent.md` | agent-generation-agent: custom agent factory                  |
| `brainstorm-agent.md`       | brainstorm-agent: autonomous idea generation agent            |
| `c-agent.md`                | c-agent: autonomous c development agent                       |
| `cloud-agent.md`            | cloud-agent: autonomous cloud infrastructure agent            |
| `cpp-agent.md`              | cpp-agent: autonomous c++ development agent                   |
| `csharp-agent.md`           | csharp-agent: autonomous c development agent                  |
| `data-science-agent.md`     | data-science-agent: autonomous data science agent             |
| `database-agent.md`         | database-agent: autonomous database development agent         |
| `debug-agent.md`            | debug-agent: autonomous debugging agent                       |
| `dependency-agent.md`       | dependency-agent: autonomous dependency audit agent           |
| `design-systems-agent.md`   | design-systems-agent: autonomous design systems agent         |
| `devops-agent.md`           | devops-agent: autonomous devops & ci/cd agent                 |
| `docs-agent.md`             | docs-agent: autonomous documentation agent                    |
| `git-manager-agent.md`      | git-manager-agent: autonomous git operations agent            |
| `go-agent.md`               | go-agent: autonomous go development agent                     |
| `java-agent.md`             | java-agent: autonomous java development agent                 |
| `migration-agent.md`        | migration-agent: autonomous database migration agent          |
| `mobile-agent.md`           | mobile-agent: autonomous mobile development agent             |
| `monitoring-agent.md`       | monitoring-agent: autonomous observability agent              |
| `performance-agent.md`      | performance-agent: autonomous performance profiling agent     |
| `planning-agent.md`         | planning-agent: autonomous planning agent                     |
| `pm-agent.md`               | pm-agent: project manager — central command                   |
| `project-audit.md`          | project-audit: comprehensive project review                   |
| `python-agent.md`           | python-agent: autonomous python development agent             |
| `r-agent.md`                | r-agent: autonomous r development agent                       |
| `refactor-agent.md`         | refactor-agent: autonomous refactoring agent                  |
| `release-agent.md`          | release-agent: autonomous release orchestration agent         |
| `research-agent.md`         | research-agent: autonomous research agent                     |
| `review-agent.md`           | review-agent: autonomous code review agent                    |
| `rust-agent.md`             | rust-agent: autonomous rust development agent                 |
| `scripts-agent.md`          | scripts-agent: cross-platform script generation & maintenance |
| `security-agent.md`         | security-agent: autonomous security audit agent               |
| `swift-agent.md`            | swift-agent: autonomous swift/swiftui development agent       |
| `test-agent.md`             | test-agent: autonomous test generation agent                  |
| `typescript-agent.md`       | typescript-agent: autonomous typescript/react/next.js agent   |
| `ui-ux-agent.md`            | ui-ux-agent: autonomous ui/ux development agent               |

---

### .github/extensions/claude-commands/

| File            | Purpose                            |
| --------------- | ---------------------------------- |
| `extension.mjs` | github configuration for extension |

---

### .github/hooks/

| File         | Purpose                        |
| ------------ | ------------------------------ |
| `hooks.json` | github configuration for hooks |

---

### .github/instructions/

| File                            | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `agents.instructions.md`        | repository instruction file for agents        |
| `commands.instructions.md`      | repository instruction file for commands      |
| `documentation.instructions.md` | repository instruction file for documentation |
| `python.instructions.md`        | repository instruction file for python        |
| `scripts.instructions.md`       | repository instruction file for scripts       |
| `security.instructions.md`      | repository instruction file for security      |
| `testing.instructions.md`       | repository instruction file for testing       |
| `typescript.instructions.md`    | repository instruction file for typescript    |

---

### .github/skills/agent-results/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for agent results |

---

### .github/skills/agent-run/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill file for agent run |

---

### .github/skills/agent-status/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill file for agent status |

---

### .github/skills/analyze/

| File       | Purpose                |
| ---------- | ---------------------- |
| `SKILL.md` | skill file for analyze |

---

### .github/skills/api-docs/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for api docs |

---

### .github/skills/architecture-sync/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill file for architecture sync |

---

### .github/skills/audit/

| File       | Purpose              |
| ---------- | -------------------- |
| `SKILL.md` | skill file for audit |

---

### .github/skills/brainstorm/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill file for brainstorm |

---

### .github/skills/changelog/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill file for changelog |

---

### .github/skills/checkpoint/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill file for checkpoint |

---

### .github/skills/cleanup/

| File       | Purpose                |
| ---------- | ---------------------- |
| `SKILL.md` | skill file for cleanup |

---

### .github/skills/commit/

| File       | Purpose               |
| ---------- | --------------------- |
| `SKILL.md` | skill file for commit |

---

### .github/skills/context-add/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for context add |

---

### .github/skills/context-search/

| File       | Purpose                       |
| ---------- | ----------------------------- |
| `SKILL.md` | skill file for context search |

---

### .github/skills/context-stats/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for context stats |

---

### .github/skills/context-sync/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill file for context sync |

---

### .github/skills/debug/

| File       | Purpose              |
| ---------- | -------------------- |
| `SKILL.md` | skill file for debug |

---

### .github/skills/dev-log-generate/

| File       | Purpose                         |
| ---------- | ------------------------------- |
| `SKILL.md` | skill file for dev log generate |

---

### .github/skills/document/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for document |

---

### .github/skills/explain/

| File       | Purpose                |
| ---------- | ---------------------- |
| `SKILL.md` | skill file for explain |

---

### .github/skills/extract/

| File       | Purpose                |
| ---------- | ---------------------- |
| `SKILL.md` | skill file for extract |

---

### .github/skills/find-usages/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for find usages |

---

### .github/skills/fix-imports/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for fix imports |

---

### .github/skills/fix-lint/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for fix lint |

---

### .github/skills/fix-types-ts/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill file for fix types ts |

---

### .github/skills/fix-types/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill file for fix types |

---

### .github/skills/getting-started/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill file for getting started |

---

### .github/skills/help/

| File       | Purpose             |
| ---------- | ------------------- |
| `SKILL.md` | skill file for help |

---

### .github/skills/lint-check/

| File       | Purpose                   |
| ---------- | ------------------------- |
| `SKILL.md` | skill file for lint check |

---

### .github/skills/migrate-check/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for migrate check |

---

### .github/skills/migration/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill file for migration |

---

### .github/skills/new-adapter/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for new adapter |

---

### .github/skills/new-component/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for new component |

---

### .github/skills/new-context/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for new context |

---

### .github/skills/new-endpoint/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill file for new endpoint |

---

### .github/skills/new-hook/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for new hook |

---

### .github/skills/new-model/

| File       | Purpose                  |
| ---------- | ------------------------ |
| `SKILL.md` | skill file for new model |

---

### .github/skills/new-page/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for new page |

---

### .github/skills/new-route-handler/

| File       | Purpose                          |
| ---------- | -------------------------------- |
| `SKILL.md` | skill file for new route handler |

---

### .github/skills/new-service/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for new service |

---

### .github/skills/plan/

| File       | Purpose             |
| ---------- | ------------------- |
| `SKILL.md` | skill file for plan |

---

### .github/skills/pm/

| File       | Purpose           |
| ---------- | ----------------- |
| `SKILL.md` | skill file for pm |

---

### .github/skills/pr-prep/

| File       | Purpose                |
| ---------- | ---------------------- |
| `SKILL.md` | skill file for pr prep |

---

### .github/skills/pydev-feature/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for pydev feature |

---

### .github/skills/pydev-workflow/

| File       | Purpose                       |
| ---------- | ----------------------------- |
| `SKILL.md` | skill file for pydev workflow |

---

### .github/skills/refactor-plan/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for refactor plan |

---

### .github/skills/refactor/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for refactor |

---

### .github/skills/rename-safe/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for rename safe |

---

### .github/skills/review/

| File       | Purpose               |
| ---------- | --------------------- |
| `SKILL.md` | skill file for review |

---

### .github/skills/security/

| File       | Purpose                 |
| ---------- | ----------------------- |
| `SKILL.md` | skill file for security |

---

### .github/skills/seed/

| File       | Purpose             |
| ---------- | ------------------- |
| `SKILL.md` | skill file for seed |

---

### .github/skills/session-handoff/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill file for session handoff |

---

### .github/skills/sprint-full/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for sprint full |

---

### .github/skills/sprint/

| File       | Purpose               |
| ---------- | --------------------- |
| `SKILL.md` | skill file for sprint |

---

### .github/skills/test-edge-cases/

| File       | Purpose                        |
| ---------- | ------------------------------ |
| `SKILL.md` | skill file for test edge cases |

---

### .github/skills/test-generate-ts/

| File       | Purpose                         |
| ---------- | ------------------------------- |
| `SKILL.md` | skill file for test generate ts |

---

### .github/skills/test-generate/

| File       | Purpose                      |
| ---------- | ---------------------------- |
| `SKILL.md` | skill file for test generate |

---

### .github/skills/test/

| File       | Purpose             |
| ---------- | ------------------- |
| `SKILL.md` | skill file for test |

---

### .github/skills/toc-generate/

| File       | Purpose                     |
| ---------- | --------------------------- |
| `SKILL.md` | skill file for toc generate |

---

### .github/skills/token-audit/

| File       | Purpose                    |
| ---------- | -------------------------- |
| `SKILL.md` | skill file for token audit |

---

### .github/skills/trace/

| File       | Purpose              |
| ---------- | -------------------- |
| `SKILL.md` | skill file for trace |

---

### .github/skills/verify/

| File       | Purpose               |
| ---------- | --------------------- |
| `SKILL.md` | skill file for verify |

---

### .github/workflows/

| File     | Purpose                     |
| -------- | --------------------------- |
| `ci.yml` | github configuration for ci |

---

## .idea/

| File              | Purpose                            |
| ----------------- | ---------------------------------- |
| `AdaptivPush.iml` | idea project file for adaptiv push |
| `misc.xml`        | idea project file for misc         |
| `modules.xml`     | idea project file for modules      |
| `vcs.xml`         | idea project file for vcs          |
| `.gitignore`      | git ignore rules                   |

---

### .idea/dictionaries/

| File          | Purpose                       |
| ------------- | ----------------------------- |
| `project.xml` | idea project file for project |

---

## .vscode/

| File              | Purpose                                 |
| ----------------- | --------------------------------------- |
| `extensions.json` | vscode workspace setting for extensions |
| `settings.json`   | vscode workspace setting for settings   |

---

## app/

| File                    | Purpose                      |
| ----------------------- | ---------------------------- |
| `_layout.tsx`           | expo router layout for root  |
| `archived-programs.tsx` | screen for archived programs |
| `create-program.tsx`    | screen for create program    |
| `faq.tsx`               | screen for faq               |
| `index.tsx`             | screen for index             |
| `next-workout.tsx`      | screen for next workout      |
| `program-overview.tsx`  | screen for program overview  |
| `recovery-library.tsx`  | screen for recovery library  |
| `workout-history.tsx`   | screen for workout history   |

---

### app/(auth)/

| File                  | Purpose                     |
| --------------------- | --------------------------- |
| `_layout.tsx`         | expo router layout for auth |
| `forgot-password.tsx` | screen for forgot password  |
| `join.tsx`            | screen for join             |
| `login.tsx`           | screen for login            |

---

### app/(qsetup)/

| File              | Purpose                       |
| ----------------- | ----------------------------- |
| `_layout.tsx`     | expo router layout for qsetup |
| `quick-setup.tsx` | screen for quick setup        |

---

### app/(tabs)/

| File          | Purpose                     |
| ------------- | --------------------------- |
| `_layout.tsx` | expo router layout for tabs |
| `history.tsx` | screen for history          |
| `home.tsx`    | screen for home             |
| `plan.tsx`    | screen for plan             |

---

### app/(tabs)/profile/

| File                       | Purpose                         |
| -------------------------- | ------------------------------- |
| `_layout.tsx`              | expo router layout for profile  |
| `help-support.tsx`         | screen for help support         |
| `index.tsx`                | screen for index                |
| `notifications.tsx`        | screen for notifications        |
| `personal-information.tsx` | screen for personal information |
| `privacy-data.tsx`         | screen for privacy data         |

---

### assets/images/

| File                          | Purpose                           |
| ----------------------------- | --------------------------------- |
| `android-icon-background.png` | asset for android icon background |
| `android-icon-foreground.png` | asset for android icon foreground |
| `android-icon-monochrome.png` | asset for android icon monochrome |
| `favicon.png`                 | asset for favicon                 |
| `icon.png`                    | asset for icon                    |
| `partial-react-logo.png`      | asset for partial react logo      |
| `react-logo.png`              | asset for react logo              |
| `react-logo@2x.png`           | asset for react logo@2x           |
| `react-logo@3x.png`           | asset for react logo@3x           |
| `splash-icon.png`             | asset for splash icon             |

---

## components/

| File                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `ExerciseCard.tsx`         | ui component for exercise card        |
| `ExerciseHistoryModal.tsx` | modal for exercise history            |
| `ExerciseInfoPanel.tsx`    | ui component for exercise info panel  |
| `external-link.tsx`        | ui component for external link        |
| `GenerateProgramModal.tsx` | modal for generate program            |
| `GVArea.tsx`               | ui component for gvarea               |
| `haptic-tab.tsx`           | ui component for haptic tab           |
| `hello-wave.tsx`           | ui component for hello wave           |
| `NextWorkoutCard.tsx`      | ui component for next workout card    |
| `parallax-scroll-view.tsx` | ui component for parallax scroll view |
| `SwapExerciseModal.tsx`    | modal for swap exercise               |
| `themed-text.tsx`          | ui component for themed text          |
| `themed-view.tsx`          | ui component for themed view          |
| `WorkoutTemplateModal.tsx` | modal for workout template            |

---

### components/ui/

| File                  | Purpose                      |
| --------------------- | ---------------------------- |
| `BackButton.tsx`      | ui component for back button |
| `collapsible.tsx`     | ui component for collapsible |
| `icon-symbol.ios.tsx` | ui component for icon symbol |
| `icon-symbol.tsx`     | ui component for icon symbol |

---

## constants/

| File          | Purpose            |
| ------------- | ------------------ |
| `colors.ts`   | colors constants   |
| `palettes.ts` | palettes constants |
| `theme.ts`    | theme constants    |
| `themes.ts`   | themes constants   |

---

## contexts/

| File               | Purpose                    |
| ------------------ | -------------------------- |
| `ThemeContext.tsx` | context provider for theme |

---

## hooks/

| File                      | Purpose                  |
| ------------------------- | ------------------------ |
| `use-color-scheme.ts`     | hook for color scheme    |
| `use-color-scheme.web.ts` | hook for color scheme    |
| `use-theme-color.ts`      | hook for theme color     |
| `useCurrentProgram.ts`    | hook for current program |

---

## ios/

| File                      | Purpose                      |
| ------------------------- | ---------------------------- |
| `Podfile`                 | ios dependency configuration |
| `Podfile.properties.json` | ios file for podfile         |
| `.gitignore`              | git ignore rules             |
| `.xcode.env`              | ios file for                 |

---

### ios/tempapp.xcodeproj/

| File              | Purpose                     |
| ----------------- | --------------------------- |
| `project.pbxproj` | xcode project configuration |

---

### ios/tempapp.xcodeproj/project.xcworkspace/

| File                       | Purpose               |
| -------------------------- | --------------------- |
| `contents.xcworkspacedata` | ios file for contents |

---

### ios/tempapp.xcodeproj/project.xcworkspace/xcshareddata/

| File                       | Purpose                           |
| -------------------------- | --------------------------------- |
| `IDEWorkspaceChecks.plist` | ios plist for ideworkspace checks |

---

### ios/tempapp.xcodeproj/xcshareddata/xcschemes/

| File               | Purpose              |
| ------------------ | -------------------- |
| `tempapp.xcscheme` | ios file for tempapp |

---

### ios/tempapp/

| File                        | Purpose                              |
| --------------------------- | ------------------------------------ |
| `AppDelegate.swift`         | ios swift source for app delegate    |
| `Info.plist`                | ios plist for info                   |
| `SplashScreen.storyboard`   | storyboard for splash screen         |
| `tempapp-Bridging-Header.h` | ios file for tempapp bridging header |
| `tempapp.entitlements`      | ios file for tempapp                 |

---

### ios/tempapp/Images.xcassets/

| File            | Purpose               |
| --------------- | --------------------- |
| `Contents.json` | ios file for contents |

---

### ios/tempapp/Images.xcassets/AppIcon.appiconset/

| File                        | Purpose                            |
| --------------------------- | ---------------------------------- |
| `App-Icon-1024x1024@1x.png` | ios file for app icon 1024x1024@1x |
| `Contents.json`             | ios file for contents              |

---

### ios/tempapp/Images.xcassets/SplashScreenBackground.colorset/

| File            | Purpose               |
| --------------- | --------------------- |
| `Contents.json` | ios file for contents |

---

### ios/tempapp/Images.xcassets/SplashScreenLogo.imageset/

| File            | Purpose               |
| --------------- | --------------------- |
| `Contents.json` | ios file for contents |
| `image.png`     | ios file for image    |
| `image@2x.png`  | ios file for image@2x |
| `image@3x.png`  | ios file for image@3x |

---

### ios/tempapp/Supporting/

| File         | Purpose            |
| ------------ | ------------------ |
| `Expo.plist` | ios plist for expo |

---

## lib/

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `exerciseDatabase.ts` | library module for exercise database |

---

## dev-doc/

| File       | Purpose                             |
| ---------- | ----------------------------------- |
| `README.md` | active development documentation guide |

---

### dev-doc/main/

| File             | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `ARCHITECTURE.md` | active architecture summary              |
| `COMMAND-TOC.md` | high-value command and routing reference |
| `CURRENT-STATE.md` | operational snapshot and verification posture |
| `OVERVIEW.md`    | first-read project summary               |
| `ROADMAP.md`     | active milestone and sequencing view     |
| `TODO.md`        | active task board with status markers    |
| `TOC.md`         | active documentation index               |

---

### dev-doc/plans/active/

| File            | Purpose                     |
| --------------- | --------------------------- |
| `PLAN-INDEX.md` | index of active plan files  |

---

### dev-doc/plans/legacy/

| File        | Purpose                        |
| ----------- | ------------------------------ |
| `README.md` | archive rules for executed plans |

---

### dev-doc/reports/

| File         | Purpose                        |
| ------------ | ------------------------------ |
| `DEV-LOG.md` | active development log report  |

---

## reports/

| File                                     | Purpose                                 |
| ---------------------------------------- | --------------------------------------- |
| `ARCHITECTURE.md`                        | architecture report                     |
| `AdaptivPush_Full_Final_Report.md`       | markdown final report with diagrams     |
| `CLASS-UPDATE-2026-04-16.md`             | class update for 2026 04 16             |
| `DEV-LOG.md`                             | development log                         |
| `FINAL-REPORT-OUTLINE.md`                | report outline for final report outline |
| `IMPLEMENTATION_PLAN.md`                 | implementation planning document        |
| `TODO.md`                                | report for todo                         |
| `WEEKLY-REPORT-2026-04-16.md`            | weekly report for 16                    |
| `WEEKLY-REPORT-2026-04-19-SIMPLIFIED.md` | weekly report for 19 simplified         |
| `WEEKLY-REPORT-2026-04-19.md`            | weekly report for 19                    |
| `WEEKLY-REPORT.md`                       | weekly report for                       |

---

### reports/migrations/

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `001_workout_session_exercises.sql`     | report for 001 workout session exercises     |
| `002_exercises_add_gif_url.sql`         | report for 002 exercises add gif url         |
| `003_programs_archive_state.sql`        | report for 003 programs archive state        |
| `004_exercises_rename_gif_to_image.sql` | report for 004 exercises rename gif to image |
| `005_exercises_add_exercisedb_id.sql`   | report for 005 exercises add exercisedb id   |
| `006_user_profile_cycle_tracking.sql`   | report for 006 user profile cycle tracking   |

---

### reports/plans/

| File                                   | Purpose                                          |
| -------------------------------------- | ------------------------------------------------ |
| `EVIDENCE-BACKED-EXECUTION-PLAN.md`    | evidence-backed execution planning document      |
| `EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` | evidence-backed implementation planning document |
| `EVIDENCE-BACKED-UI-REDESIGN-PLAN.md`  | evidence-backed UI redesign planning document    |
| `IMPLEMENTATION-PLAN.md`               | implementation planning document                 |
| `POSSIBLE-FEATURES.md`                 | report for possible features                     |

---

## scripts/

| File               | Purpose                    |
| ------------------ | -------------------------- |
| `seedExercises.ts` | seed script for exercises  |
| `seedImages.ts`    | seed script for images     |
| `tsconfig.json`    | typescript compiler config |

---

## types/

| File             | Purpose               |
| ---------------- | --------------------- |
| `database.ts`    | types for database    |
| `program.ts`     | types for program     |
| `progression.ts` | types for progression |

---

## utils/

| File                      | Purpose                            |
| ------------------------- | ---------------------------------- |
| `conversions.ts`          | utility for conversions            |
| `cyclePhase.ts`           | utility for cycle phase            |
| `fetchExerciseHistory.ts` | utility for fetch exercise history |
| `haptic.ts`               | utility for haptic                 |
| `notifications.ts`        | utility for notifications          |
| `profilePreferences.ts`   | utility for profile preferences    |
| `programGenerator.ts`     | utility for program generator      |
| `progressionEngine.ts`    | utility for progression engine     |
| `saveProgramToDb.ts`      | utility for save program to db     |
| `supabase.ts`             | utility for supabase               |
| `uploadAvatar.ts`         | utility for upload avatar          |
