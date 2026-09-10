# Command TOC

## High-value workflow commands

| Command | Purpose |
|---|---|
| `/plan` | create or refresh an execution-ready plan |
| `/dev-log-generate` | add a structured development-log entry under `dev-doc/reports/` |
| `/verify` | run the smallest local verification gate that matches the work |
| `/document` | update the owning documentation surface for the change |
| `/session-handoff` | prepare a concise restart packet for the next session |
| `/commit` | create a conventional commit after a bounded slice is complete |

## Useful supporting commands

| Command | Purpose |
|---|---|
| `/test` | run a targeted test or validation slice |
| `/review` | run a focused review on bounded changes |
| `/security` | run a focused security review |
| `/sprint` | sync living docs needed for workflow closeout |
| `/action` | create a concise execution handoff prompt |

## Current execution lane

Use bounded Expo/TypeScript/Supabase AP slices from the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md). AP-01.1/AP-01.2a are locally verified and AP-01.3 released the baseline/ledger, encrypted restore, isolated role suite and production catalog authority. AP-02/AP-03 are integration-verified behind default-off flags; their release still requires a fresh encrypted production backup/restore, secure CLI authentication, Expo-device evidence and production rollout verification. Planning documents alone do not authorize remote mutations; every slice retains its source/status, recovery, security, integration and compatibility gates.
