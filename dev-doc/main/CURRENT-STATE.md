# AdaptivPush current state

## Current AP-02/AP-03 boundary

The hosted AP-02/AP-03 packet is deployed to `thfxcvxcsfvrzdysdnkq`. The normal `.env` enables both writers, and the freshly served iOS bundle verifies the expected hosted backend, public client key and true/true flags with no privileged key. The user authorized this rollout after agent-run recovery and technical checks, replacing earlier pre-migration local/manual/QA-account, signing, standalone-build and distribution requirements. Physical acceptance follows deployment with the existing account through ordinary `npm start` and its Expo Go QR.

Hosted ledger now contains AP-01 `20260910175317` / `20260910190000`, AP-02/AP-03 `20260910210000` / `20260911120000`, and additive legacy-revision correction `20260915151000`. The three new migrations and ledger entries committed atomically on September 15. Every original public-table value was preserved. Legacy programs have persisted revisions/day/slot identities; future changes use owner-validated immutable successors while migration-snapshot/approximate provenance stays honest. Direct mutations of revisioned legacy prescriptions are denied.

Fresh encrypted AES-256-GCM/DPAPI recovery passed PostgreSQL 17 isolated restore: all 48 captured relations matched counts and row hashes, and schema/security comparisons passed. Following hosted rolled-back probes, all 47 original non-ledger relations still match. The dedicated recovery container ran without network or published ports and was removed after proof. Storage object bodies, hosted infrastructure settings and database login credentials are outside the logical recovery set. Recovery disables affected writers and preserves newer writes for forward correction; no automatic production reset/restore.

The original Docker startup blocker recovered after delayed supported restart. Current authentication, backup, restore and deployment are complete; no user Docker repair or reconfirmation is needed. The [release report](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-RELEASE-2026-09-14.md) owns hashes, source/integration commits, commands, limitations and recovery custody.

## Verification and acceptance

Focused tests (66 unique cases), strict TypeScript and lint passed; lint retains three unrelated existing warnings. SQL atomicity/isolation, installed and migrated-legacy revision variants, hosted RPC exposure/anonymous denial, original-data fingerprints and six concurrent-session assertions passed. Integrator code merge `8917bfd` independently passed application tests, availability, TypeScript and lint.

Physical iPhone cold launch, five-action UI/reopen acceptance and accessibility remain unverified. Thirty-two pre-existing non-rest days have no exercises (five in active programs); they were preserved, not populated with invented prescriptions. Complete persisted workouts can use their database identities; empty legacy days remain unstartable. AP-04/AP-05 remain out of scope.

## Other product state

AP-01.3 production baseline and lookup-only catalog authority remain released. Shared catalog reads and trusted curation are preserved. Current auth, planning, workout history, archive, notifications and theme paths exist; dated scheduling, mixed-history progression authority and broader adaptation lifecycle remain partial. The [implementation status](/dev-doc/plans/active/ADAPTIVPUSH-IMPLEMENTATION-STATUS.md) owns code detail, and the [register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md) owns later scope. Historical observations remain in the dated reports and [DEV-LOG](/dev-doc/reports/DEV-LOG.md). No unrelated migrations or historical avatar deletions were performed.
