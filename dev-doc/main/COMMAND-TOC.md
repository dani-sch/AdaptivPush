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

Use bounded Expo/TypeScript/Supabase AP slices from the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md). AP-01.3 released the baseline and catalog authority. The user's September 15 instruction authorizes hosted AP-02/AP-03 deployment after agent-run recovery/technical verification, replacing former pre-migration local/manual/signing/distribution gates. Fresh authentication and exact two-file dry-run pass; Docker startup blocks fresh backup/isolated restore, so production and writer flags remain unchanged. Resume the authorized sequence after Docker recovery. Existing-account acceptance follows deployment through ordinary `npm start` and Expo Go. The [current packet](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md) owns exact evidence. AP-04/AP-05 remain outside the current task.
