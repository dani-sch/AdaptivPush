# Active roadmap

## Stable execution sequence

| Stage | State | Primary outcome |
|---|---|---|
| `F5-S0` Evidence/policy foundation | complete | Shared evidence and explanation metadata foundation |
| `F5-S1` Schema truth, RLS, compatibility, authority | active | Verified safe data foundation and one execution authority |
| `F5-S2` Feature gates and shared UX/state | pending | Safe rollout controls and reusable mobile UI primitives |
| `F5-S3` Onboarding/profile/preferences | pending | Meaningful personalization and honest optional settings |
| `F5-S4` Generator-v2 and plan transparency | pending | Explainable split/volume recommendations and overrides |
| `F5-S5` Readiness-v2 and day-of coaching | pending | Conservative explicit recommendations with user control |
| `F5-S6` Progression, plateau, deload, workout durability | pending | Explainable long-term adaptation and safer persistence |
| `F5-S7` History, analytics, evidence, education | pending | Interpreted trends and shared trust surfaces |
| `F5-S8` Production hardening, privacy, release, integration | pending | Production-real support paths, identity, accessibility, and rollout |

## Milestone packaging

| Milestone | Included stages | User-visible outcome |
|---|---|---|
| Foundation closeout | `F5-S1` | Safe compatibility baseline; no new behavior exposure |
| Visible adaptive foundation | `F5-S2`, `F5-S3`, first `F5-S5` trust/readiness slice | Better check-in framing, visible adjustment reason, first evidence entry |
| Transparent planning | `F5-S4` and relevant `F5-S7` trust slice | Explainable generation, set targets, plan rationale, safe override |
| Adaptive workload intelligence | remainder of `F5-S5`, `F5-S6`, analytics slice of `F5-S7` | Durable adaptation, plateau/deload guidance, interpreted history |
| Production completion | `F5-S8` | Honest operational support paths, release identity, accessibility, privacy, and controlled rollout |

HealthKit is an optional enrichment after core manual parity; it is not on the critical path to the first four product milestones.

`F5-S1` remains active. The authenticated live compatibility contract passed on 2026-08-03, including generated-context failure recovery, but the actual mobile UI paths and a runtime missing-schema fallback scenario still require an Expo-capable test target before the stage can advance.
