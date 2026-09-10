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

Use bounded Expo/TypeScript/Supabase AP slices from the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md). AP-01.1/AP-01.2a are locally verified and AP-01.3a local tooling preparation is complete. Exact next packet is AP-01.3b authorized baseline capture plus backup/isolated-target decision. Planning documents and local configuration do not authorize remote database mutations. Source/status, restore, security, integration, and compatibility gates precede new exposed behavior.
