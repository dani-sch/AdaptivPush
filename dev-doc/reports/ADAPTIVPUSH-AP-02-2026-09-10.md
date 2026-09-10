# AP-02 — Durable workout capture and finalization

Date: 2026-09-10  
Branch/base: `codex/ap02-ap03` from `93e9f7b`  
Status: **INTEGRATION VERIFIED; RELEASE BLOCKED**

## Outcome

AP-02 now has an owner-scoped durable draft, frozen prescription, stable
operation/slot/set identities, explicit actual-load semantics, and one atomic
database finalization command. A pending or partial record is never inferred to
be a completed workout. The implementation is integrated and verified locally,
but it is not released: the writer flag defaults off, the production migration
was not applied, and a real Expo device reconnect/accessibility matrix remains
required.

## Implemented contract

- `features/workouts/contracts.ts` defines versioned frozen prescriptions,
  stable identities, planned-versus-actual values, load kind/unit/side,
  lifecycle and complete/reduced/partial/abandoned outcomes.
- `features/workouts/draftStore.ts` persists owner-scoped edits and the
  finalization operation before network work. Response loss reuses the same
  operation; only a durable receipt clears it.
- `features/workouts/repository.ts` and `commands.ts` call
  `finalize_workout_v2`; app code no longer coordinates session and set inserts.
- `app/next-workout.tsx` requires the requested target, freezes once, restores
  the exact draft, uses timestamps across backgrounding, preserves numeric zero,
  and distinguishes pending, conflict, partial, reduced, and complete states.
- Swapping preserves already logged actual work on the original identity;
  unlogged replacement work is reset and requires explicit recalibration.
- Local haptics are best-effort and cannot make a successful save fail.

## Database authority and compatibility

Migration
`20260910210000_ap02_ap03_durable_workouts_and_program_revisions.sql` has
SHA-256
`B0CD723D7D00F31B604168F7FC842CB1DB4117ACD9AE2407E1549029534877F2`.
It adds operation, draft, schema, lifecycle, outcome, revision, snapshot,
timezone, receipt and actual-set fields; categorizes unprovable old rows as
`legacy_unknown`; preserves legacy columns and exact zero; drops the legacy set
uniqueness assumption; and adds parent/owner indexes.

`finalize_workout_v2` is an authenticated, owner-checked,
`SECURITY DEFINER` command with a fixed search path. It validates complete
lineage and payloads, serializes by owner/operation, writes the session and all
sets in one transaction, and returns the original receipt for an identical
replay while rejecting operation-ID reuse with a different payload. V2 records
are command-owned and immutable to ordinary direct writers.

`workout_receipt_effects` is a durable idempotent queue for PR, progression and
analytics consumers so those derived effects cannot invalidate captured work.
AP-05 still owns full comparable-history reconciliation and effect processing.

## Executed evidence

| Gate | Result |
|---|---|
| Contract fixtures | `npm run test:workouts`: 5 passed, covering zero, one-of-four partial, swap/recalibration, frozen prescription, invalid identity and response-loss retry. |
| SQL fault/isolation suite | `supabase/tests/ap_02_ap_03_atomicity_and_isolation.sql`: PASS after a fresh local reset. It proves rollback after session insertion, replay/mismatch behavior, zero, partial classification, cross-owner denial, immutable V2 writes and one receipt effect. |
| Regression | AP-01.3 catalog-authority/isolation SQL suite: PASS on the same fresh integrated database. |
| Schema | `npx supabase db reset --local`: all three migrations applied; `db lint --local --level warning`: no schema errors; local push dry-run: up to date. |
| Static | `npx tsc --noEmit`: pass. `npm run lint`: 0 errors and 9 warnings in three files unchanged from base `93e9f7b`. |
| Integration | Clean `npm ci` and all focused/static/SQL checks passed in `C:\workout-app\AdaptivPush-integrator`; integration HEAD before evidence closeout `7acc28f`. |
| Production preflight | Authenticated dashboard shows project `thfxcvxcsfvrzdysdnkq` healthy, production ledger only `20260910175317` and `20260910190000`, and Free plan with no managed backups. No production mutation occurred. |

## Acceptance disposition

| Acceptance | Result |
|---|---|
| AC-TR-008 | Local/integration pass: injected failure produces no session/sets; identical replay produces one receipt. |
| AC-TR-009 | Deterministic store/retry semantics pass; physical kill/offline/reconnect remains a device gate. |
| AC-TR-010 | Pass in contract/UI fixture: late source changes do not rebuild the frozen draft. |
| AC-TR-011 | Pass: one of four is partial and not completion/progression eligibility. |
| AC-TR-012 | Pass: logged original work is retained and replacement work requires recalibration. |
| AC-TR-013 | Implemented: invalid target is an explicit unavailable state; device navigation proof remains open. |
| AC-TR-014 | Timestamp and best-effort haptic behavior implemented; background/device proof remains open. |
| AC-TR-015 | Preserved as deferred; elapsed time is not relabeled as a rest timer. |

## Rollout, recovery, and open gates

`EXPO_PUBLIC_AP02_DURABLE_WRITER` is enabled only by the literal value `true`
and otherwise defaults off. Disable the writer first on incident; retain drafts,
receipts, immutable sessions, sets and history; retry by operation ID. Do not
drop additive columns or restore the old non-atomic writer as rollback.

Release remains blocked on all of the following:

1. A fresh encrypted production logical backup plus PostgreSQL 17 decrypt/restore
   and semantic comparison immediately before the production schema change.
2. Secure Supabase CLI reauthentication for the named production target; the
   current CLI session has no platform token.
3. An Expo-capable physical device or emulator for kill/offline/reconnect,
   background timer, route, pending/conflict, haptics-off, dynamic type,
   screen-reader, touch-target, light/dark/system and legacy/new-history checks.
4. After those pass: production dry-run/apply, ledger and RLS/RPC verification,
   old-client compatibility, two-owner authenticated smoke, flag enablement and
   monitoring. None was performed or claimed here.

## Commits

- `932f983` `feat: define AP-02 AP-03 domain contracts`
- `d21bf62` `feat: add atomic workout and program database commands`
- `3a71ff7` `feat: integrate durable workout and program flows`
- `f5e6775` `test: harden durable command isolation and recovery`
- `9b5bf78` `build: declare Node typings for test harness`
- `8e93352` `build: load Node types in strict TypeScript gate`

