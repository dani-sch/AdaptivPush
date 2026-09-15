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

Use bounded Expo/TypeScript/Supabase AP slices from the [register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md). AP-02/AP-03 are deployed and technically verified with both normal Expo writers enabled. The user's authorization replaces earlier pre-migration local/manual/signing gates. Existing-account acceptance now uses `npm start` and its ordinary QR. [Current evidence](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md) owns recovery, migrations and remaining phone/empty-legacy-day limitations. AP-04/AP-05 remain outside this task.
