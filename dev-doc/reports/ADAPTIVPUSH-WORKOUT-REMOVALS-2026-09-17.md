# Shared workout controls and durable scoped removals — September 17, 2026

## Delivery boundary

Implementation is integrated and locally verified. Hosted scoped removal is **not released**. Project `thfxcvxcsfvrzdysdnkq` still has its seven existing ledger entries and correction capability 2. The new removal controls are unavailable unless the separate authenticated `workout_removal_capability_v1()` returns integer 1. The two deployed correction migrations were not edited or replayed. User request section 11 requires explicit authorization for this new packet before any hosted write.

Base: `origin/main 4c3c447`. Feature: `codex/workout-removal-and-shared-controls`. Implementation commits: `71bac25` (domain), `e40eea8` (atomic database contract), `5881ad2` (original evidence/extras), `cddf305` (compatibility/security/concurrency), `d6c164f` (shared controls/dialogs). Canonical integrator merged without conflicts at `8ab5d6c` and independently passed strict TypeScript, 106 application tests, lint and the nine-label removal concurrency suite. No direct main or force push occurred. The pre-existing ExerciseHistoryModal import changes remain unstaged; its existing transparent backdrop is included without overwriting that work.

Publication: [draft PR #58](https://github.com/dani-sch/AdaptivPush/pull/58). Feature documentation commit c032a98 is integrated at ebfa63e with a matching tree. The PR remains draft while new hosted authorization and physical-device acceptance are open.

## User interaction

Active logging and completed editing share ExerciseCard and its set rows: number, load, reps, RPE and explicit check. Typing never logs an unperformed set. Logged rows remain logged while editing, with validation before Save/Finish. Load type and lb/kg live in set options, reached through the set number or LOAD header. Units remain visible beside load values; assistance is marked with a minus and bodyweight needs no external value. Mixed performed exercises retain individual identities and a concise name cue. Header overflow offers History and Swap; the separate compact trash removes the exercise. Add set and extra-set correction/removal remain available.

A left swipe reveals one trailing trash action without deleting; opening another closes the previous row. Tapping trash or the keyboard/mouse set-options action opens the same removal sheet. VoiceOver custom removal actions are wired but not physically verified. Focused text fields suspend horizontal swipe; a left-edge exclusion and horizontal threshold limit navigation/scroll conflicts. Save, finalization, local removal persistence and unresolved submission states block conflicting edits. A finalized session remains finalized; completed editing neither restarts its timer nor replays advancement.

- **This workout only:** persist a version-1 occurrence tombstone keyed by original stable slot/set identity. Original prescribed counts/loads/order remain frozen; removed recorded results are excluded from current actual rows, volume and attributable records.
- **Whole program:** includes this occurrence plus eligible strictly later prescriptions in the same program instance. Matching uses earliest immutable exercise/slot position and recurring day pattern, not a current swapped occupant or display name. Corresponding sets use original order; shorter prescriptions are excluded. Completed days, other programs and catalog rows are protected.
- **Active:** save tombstone and pinned broader intent locally first; apply session finalization and future revision atomically at explicit Finish. Response loss retains the exact operation/payload.
- **Completed edit:** all removals and broader intent remain pending until Save. Cancel discards both. One server transaction checks session/program revisions, updates the same finalized session, recomputes owned records/volume, writes before/after audit and creates at most one successor program revision.
- **No matches, missing legacy lineage, extras or ended programs:** offer a truthful workout-only choice. Extra sets have no future prescription. A program ending/changing after preview causes a safe conflict rather than reactivation or a scope downgrade. Last-set/exercise removal yields an explicit empty view; it never turns a day into rest or automatically completes/advances it.

Skipped legacy outcomes remain readable and are not rewritten. Removed and unattempted work contribute no synthetic results, failure signals or progression credit. Original prescribed coverage determines completion and the affected exercise's progression hold; extras cannot replace missing original evidence. Another exercise's omission does not turn fully recorded work into failure. The latest occurrence query includes snapshots with no surviving actual rows so older successes cannot silently override a newer omission. Existing per-set load suggestions are retained during a hold. AP-04 scheduling and the AP-05 engine redesign remain out of scope.

## Presentation and screenshots

App-owned modal interaction layers are transparent; content backgrounds, borders and shadows remain. Native Alert/action-sheet calls route through AppDialogHost with the existing callbacks/cancel behavior, and queued dialogs clear on account change. Existing screen modals, history, swap, template, readiness, program generation, profile/notification surfaces and dropdown defaults were inspected. The nested template no longer fades its parent. Navigation has no separate dimming modal presentation. OS permission/photo-picker UI is platform-owned and not replaced.

Comparison screenshots use the same local authenticated fixture, 390 × 844 viewport and remote-baseline code at 4c3c447 for the before images. All screenshots contain synthetic local data.

| Surface | Before | After |
|---|---|---|
| Active logging | [Before](assets/workout-removals-2026-09-17/active-before.png) | [After](assets/workout-removals-2026-09-17/active-after.png) |
| Completed edit | [Before](assets/workout-removals-2026-09-17/edit-before.png) | [After](assets/workout-removals-2026-09-17/edit-after.png) |

Additional evidence: [single swipe action](assets/workout-removals-2026-09-17/swipe-reveal.png), [removal dark](assets/workout-removals-2026-09-17/removal-sheet-dark.png), [removal light](assets/workout-removals-2026-09-17/removal-sheet-light.png), [history dark](assets/workout-removals-2026-09-17/history-dark.png), [readiness light](assets/workout-removals-2026-09-17/readiness-light.png), [profile dialog light](assets/workout-removals-2026-09-17/profile-dialog-light.png), [profile dialog dark](assets/workout-removals-2026-09-17/profile-dialog-dark.png), [saved removal reopened](assets/workout-removals-2026-09-17/removed-reopened.png).

Authenticated browser checks exercised typing/checking, scope Cancel, workout-only removal and restart, program-scope completed Cancel, program-scope Save/reopen, active program-scope Finish and a server reload. A direct authenticated read confirmed the finished session remained partial with two durable tombstones, no correction revision from Cancel, and exactly the expected program revision. Browser swipes opened one action at a time with no checkbox click-through. Keyboard Tab entered the removal sheet; its interaction layer intercepted the underlying row. Computed dialog backgrounds were rgba(0,0,0,0). Light/dark captures show normal underlying colors. Existing animation paths were inspected; native presentation/animation acceptance is not inferred from browser evidence.

## Verification

| Gate | Result |
|---|---|
| Strict TypeScript | `npx tsc --noEmit --strict` passes in feature and integrator |
| Application suites | 106/106 workout/program/availability/dependency tests pass, including ten removal cases |
| Lint | Zero errors; three existing unused-variable warnings: forgot-password submitted, Home isDecrease, Profile parsePrCount |
| Web export | Integrator production web export passes (35 routes); expected Expo web push-token warning |
| Database lint | `npx supabase db lint --local` reports no schema errors |
| Fresh and restored SQL | Five suites plus the legacy-swap variant on each baseline: 12 successful suite executions |
| Existing concurrency | Eight PASS labels from `npm run test:database-concurrency` |
| Removal concurrency | Nine PASS labels from `node scripts/verifyRemovalConcurrency.mjs`, including concurrent exact replay and competing session/program removal requests; repeated in integrator |
| Browser | Authenticated local acceptance and comparable screenshots above |
| Python | No Python-side changes; repository Python application src/ path is absent; no Python test claim |

The SQL removal suite covers stable lineage after repeated swaps; shorter-set and ended-program preview; original-row immutability; exact payload replay/mismatch; stale program rejection rolling back the session; repeated no-match removals; final exercise staying non-rest/uncompleted; removal inheritance through a subsequent swap; anonymous entrypoint denial, authenticated owner checks, private-helper denial and protected audit access. Existing suites retain owner isolation, legacy schema/slot cases, catalog protection and finalized-occurrence uniqueness. Actual load tests cover kg, bodyweight and assistance. Existing recovery tests cover lost responses and exact stored correction/finalization retries.

No physical iPhone was available. Swipe-versus-scroll, screen-edge navigation, keyboard behavior, VoiceOver action/focus, dynamic text, native nested-modal animations/dismissal and native cold restart remain open. Browser accessibility attributes and focus checks are not a physical accessibility certification.

## Concrete hosted packet and recovery

Only proposed hosted migration:

- File: `supabase/migrations/20260917180000_scoped_workout_removals.sql`
- SHA-256: `0efd0b1a7a9da0197255b9334cc9c82e43b2145093d554a2d3d8bd0028133341`
- The exact file is pinned to LF via .gitattributes and hashes identically in the integrator.
- Adds immutable-revision removal_mask metadata, inheritance trigger, owned preview/state readers, private revision/validation helpers and separate removal-capable finalize/correct entrypoints. The additive migration replaces existing function definitions in place to enforce monotonic tombstones for older clients. It does not change either historical migration file, rewrite catalog rows or bulk-rewrite old skipped data.
- Existing correction capability stays 2; the separate removal capability is 1. Missing new RPCs fail explicitly. UI removal is gated rather than temporarily hiding unsupported data.

Read-only hosted identity verification found project thfxcvxcsfvrzdysdnkq, PostgreSQL 17.6 and the expected seven-entry ledger. The restored baseline matches seven schema/security inventory sections (columns, constraints, indexes, function definitions, policies, grants and RLS); zero drift after consistent search_path normalization. Public entrypoints deny anonymous execution; internal mutators/validators deny authenticated execution; public operations authenticate and check ownership. No hosted schema, migration-ledger or workout writes were performed for this task.

Fresh encrypted backup capture: 2026-09-17 21:40:32 UTC, private custody at `C:/Users/dani2/AdaptivPush-secure-backups/Scoped-Workout-Removals/20260917T214021Z`. AES-256-GCM artifacts use a DPAPI CurrentUser-protected key; roles and role catalog are encrypted too. No plaintext dump/key files were created or committed.

- Database plaintext fingerprint: `5a0c4afd5de55c0c0c03723a9c5a9152647da2f8fdc186d3a44433757588d553`.
- Encrypted database artifact fingerprint: `b6ea571a9c255ae50d9faa8fcb6a88b0f98d774f14d1782a1d938aacc8efff87`.
- Restore target: PostgreSQL 17.6.1.063 container `ap-removal-recovery-20260917`, network none, zero published ports, database `ap_restore_final`. Final restore proof: 22:04:55 UTC, all 59 relation counts/row fingerprints match.
- The exact migration passed both `ap_fresh_final` and the restored baseline; all 59 original-column relation fingerprints remained unchanged afterward. SQL probes roll back and concurrency fixtures clean up their own synthetic rows.
- Logical recovery excludes Storage object bodies, platform settings/secrets and PITR. pg_restore --no-owner changes platform ownership mapping; ACL statements were restored. Reserved pg_ roles remain managed by PostgreSQL. Backup/key custody stays with the developer's Windows account; preserve both together under the existing private retention policy.

Forward-recovery procedure for the reviewer-approved release:

1. Recheck project identity, exact hash, ledger and schema drift immediately before deployment; refresh encrypted backup/restore proof if the production baseline changed or approval is delayed.
2. Apply only this exact migration and its one ledger entry in a transaction with bounded lock/statement timeouts. Never replay the earlier correction migrations. If any statement fails, roll back the whole transaction and leave hosted capability unavailable.
3. Verify capability/grants, existing owner/anonymous boundaries, original data fingerprints and same-session/program atomicity with rollback-only probes. Run ordinary authenticated save/reopen acceptance before claiming release.
4. If a post-commit defect appears, preserve all receipts, tombstones, successor revisions and correction audit. Stop new removal actions in the client while keeping metadata readers and exact pending-operation reconciliation available. Do not return capability 0 while readers depend on it, drop removal columns, resurrect hidden results or restore the old dump over newer writes.
5. Prepare a small additive forward fix against a fresh isolated copy, verify it with the same relevant tests, obtain authorization for any additional hosted schema packet, and apply transactionally. Use the encrypted restore only for isolated investigation or an explicitly approved disaster-recovery procedure that accounts for subsequent writes.

Private detailed evidence and local acceptance credentials live outside Git at `C:/Users/dani2/AppData/Local/AdaptivPush/release-evidence/2026-09-17-removals`. Only synthetic screenshots and this redacted report are published. No temporary repo plan was consumed; prior dated release reports remain unchanged.
