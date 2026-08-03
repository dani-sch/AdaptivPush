# Active plan index

## Execution authority

| Document | Status | Owns |
|---|---|---|
| `reports/plans/FABLE-5-MASTER-IMPLEMENTATION-EXECUTION-PLAN.md` | active canonical driver | Complete app definition, architecture direction, domain rules, build contract, QA, and completion criteria |
| `dev-doc/plans/active/FABLE-5-EXECUTION-REGISTER.md` | active execution ledger | Stable `F5-S*` IDs, status, dependencies, bounded slices, decisions, and gates |
| `dev-doc/plans/active/FABLE-5-CODE-IMPLEMENTATION-STATUS.md` | active code snapshot | Working/partial/scaffolded/missing status with current and planned file evidence |
| `dev-doc/main/TODO.md` | active task board | Immediate and next actionable work only |

## Source references

| Document | Status | Retained value |
|---|---|---|
| `reports/plans/EVIDENCE-BACKED-EXECUTION-PLAN.md` | source-reference | Detailed historical schema, rule, rollout, and phase rationale |
| `reports/plans/EVIDENCE-BACKED-UI-REDESIGN-PLAN.md` | source-reference | UI intent, candidate primitives, and screen decomposition |
| `reports/plans/EVIDENCE-BACKED-IMPLEMENTATION-PLAN.md` | source-reference | Approved product answers and research-to-feature translation |
| `research/deep-research-report.md` | research source | Evidence framing and research constraints |

Source references may inform a bounded implementation decision, but they cannot change active stage status or sequence. If a source conflicts with current code or the FABLE-5 contract, record the conflict and follow current authority.

## Current lane

- completed: `F5-S0`
- active: `F5-S1`
- next: `F5-S2`
- pending: `F5-S3` through `F5-S8`

## Archival rule

Move an executed plan to `dev-doc/plans/legacy/` only when it no longer provides active execution or source-reference value. Update this index in the same change.
