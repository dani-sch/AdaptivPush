# September 18 workout editing implementation

## Delivery boundary

Implementation is committed on `codex/workout-editing-sept18`, integrated through the canonical integrator, and copied by fast-forward into the requested `C:/workout-app/AdaptivPush` checkout. PR #58 remains a draft against `main`. The unrelated `components/ExerciseHistoryModal.tsx` modification is preserved outside these commits.

The user stopped agent visual testing and will perform Expo acceptance. No further browser/device acceptance is claimed after that instruction. New hosted migration `20260918160000_workout_structure.sql` is prepared and rehearsed, **not deployed or authorized**. Add exercise and structural completed edits are gated by its integer-1 capability. The already deployed removal migration remains present; removal capability 1 and correction capability 2 were reverified in a read-only hosted transaction.

## Demonstrated defects and implementation

| Report | Evidence and cause | Implementation |
|---|---|---|
| Input immediately clears | Regressions on original and swapped slots fail before the fix: restoring a skipped row then typing `.` returns an empty string. The updater cleared entered text whenever the resulting outcome remained skipped. | Typing transitions skipped to unperformed; only an explicit Skip clears input. Raw text remains separate from parsed values. Checked-row deletion survives restoration and produces a named field error at submission. |
| Competing edits/hydration | Active screen maintained both a draft and a separately updated presentation array. Event handlers could read an older render. | One synchronous draft authority; cards are derived. Hydration only fills an empty matching target. Owner/target changes invalidate older results; persistence remains serialized. |
| Swap does not open | Source closed the native menu and presented the next modal in one callback. This is an identified sequencing risk, not a reproduced physical-device diagnosis. | One queued action after native iOS `onDismiss`; unanimated web/Android handoff on the next frame. Duplicate presses and unmount cancel safely. Transparent backdrops, keyboard dismissal and accessible controls remain. |
| Removal blocks another swap | Active screen explicitly blocked any swap when a future removal was pending. | One draft change set holds future masks, swaps and additions until atomic Finish. Private SQL produces one successor revision; original prescriptions and completed days stay unchanged. Existing uncertain legacy operations remain exact-retry records. |
| Finish needs attention | On the restored pre-patch schema, a valid original prescription plus an unchecked extra fails with sanitized SQLSTATE `P0001`, message `invalid_input: set coverage`. | Original coverage and extra work are validated separately. Extras cannot replace missing original identities/orders. Unchecked work is durable structure, never synthesized performance. |
| Completed structural edits disappear | Save serialized performed rows and original outcomes. A blank extra had no durable row; an assignment existing only in client state could disappear on reconstruction. | Save includes explicit effective slots, distinct from frozen originals and actual results. Reopening restores blank extras and assignments. Receipt and authoritative saved structure/actual values must match before recovery clears or success appears. Completed exercise changes require an explicit recorded-history confirmation. |
| Added set inherits wrong exercise | Completed add-set spread the previous row after assigning the card identity. A previous actual exercise could overwrite the current card assignment. | New sets use the card assignment, a fresh identity, blank entered values and unperformed outcome. |

Add exercise uses catalog selection and exactly `This workout only`, `Whole program — this day`, and Cancel. The scope preview shows the number of eligible later uncompleted occurrences. Each addition has its own stable occurrence identity, even for duplicate catalog exercises. Original frozen slots are never enlarged. Future additions carry shared addition lineage and distinct stable day slots; subsequent swaps/removals preserve that lineage. Added exercises can be removed or promoted to future scope by a later swap. Cancelled previews cannot reopen a stale selection.

The bounded implementation extends existing correction/finalization transactions rather than creating independently committed client queues. It does not redesign scheduling or progression. Blank/skipped/removed/performed remain distinct; optional RPE stays optional. Legacy stored uncertain submissions are not rewritten.

## Route, device and data preservation

ProgramOverview routes completed days to `/edit-workout?sessionId=...`. Archived-program restoration instead uses the existing activation/resume/restart flow. The actual route meant by the user's phrase "editing a past program" remains unconfirmed; no physical-device route or persisted phone session ID was supplied.

Before implementation, the running Expo process was PID 37556 in the original checkout, port 8081, SDK 57. Its actual served iOS bundle contained `thfxcvxcsfvrzdysdnkq.supabase.co`, not the previous localhost backend. Captured bundle SHA-256: `82f749ca5a6025d2f57be26778a462b18d73a459d11a11c05b4aeac861e948fb`. No phone debugger target was attached. The installed phone client/build and first native failure remain unknown.

The lockfile had Expo patch-version recommendations; dependency alignment moved diagnostics from 20/21 to 21/21. This fixes demonstrated dependency drift, **not a demonstrated cause** of missing `ExponentConstants`/`ExpoAsset`. Entry registration exists. Missing-module startup errors can precede the secondary unregistered-main error. Profile causality and notification-warning causality are unproven. Official references: [Expo native version mismatch](https://docs.expo.dev/troubleshooting/react-native-version-mismatch/), [Expo SDK upgrades](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Expo startup/build troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/). A successful reload/export does not verify the native client.

No phone storage was cleared, credentials reset, app reinstalled or user workout edited. The phone draft could not be extracted: it was unavailable to the agent. The new owner-scoped recovery checkpoint copies exact local draft/swap/correction/edit/program-revision strings once before screen hydration, excludes other owners and authentication, and never uploads them. Existing stores remain intact. Thus preservation of existing phone data is by non-interference plus the implementation checkpoint, not a claim that its actual contents were inspected.

## Verification completed before visual testing was stopped

| Matrix | Observed result |
|---|---|
| Original and swapped; first checked row plus later skipped/restored row | Before-fix tests fail; after-fix raw decimal, deletion, reps/RPE survive without checking the row. |
| Prescribed and extra; checked and unchecked; program removal then second swap | Combined browser sequence succeeds, retaining first actual identity and later raw input. |
| Both Add exercise scopes, duplicate catalog identity, Cancel | Cancel adds nothing; two additions have distinct slots; reload restores both. |
| Active reload then Finish | Partial success with one actual result, two original slots and four effective slots. Only two eligible future days receive the chosen addition/swap/removal, in one revision. Other day patterns and completed fixture remain unchanged. |
| Completed edit values/add blank set/swap, Save/reload | Load 42.5, new assignment, unchecked raw `3.`/9/7.5 and blank fifth set survive. One actual result remains; session identity unchanged. |
| Disconnect during Save, reload, reconnect | Exact pending operation retained; Retry Sync commits once, authoritative verification clears the pending request. Second audit revision reflects this second edit, not duplicate replay. |
| Empty visible workout and edits to added exercises | Domain regression covers removing last original card, adding again, promoting an addition to program scope and cancelling its pending future addition on removal. |
| Units, invalid entries, accounts, expiration | Existing load/availability suites cover mixed lb/kg/bodyweight/assistance, account isolation, expired credentials, stale hydration; new tests cover exact field validation and false-success rejection. These are automated evidence, not new physical acceptance. |

128 application cases passed (2 dependency, 86 workout, 20 program, 20 availability). Strict TypeScript passed. Lint has zero errors and the same three existing warnings. iOS export succeeded with 3,870 modules. The final small cancellation guard, authoritative-value comparison and preservation of explicit assignment were implementation follow-ups; no later visual pass was run.

Six SQL suites plus the legacy swap variant passed on both a fresh schema and an isolated verified production restore: 14 executions. Existing concurrency coverage passed; added simultaneous combined Finish checks prove one occurrence and one future-change revision. Competing structural corrections admit one winner, reject the stale operation and replay one audit. Different-owner requests, anonymous grants, private helper execution, replay payload changes and stale program rollback are covered. Synthetic UI/SQL fixtures used local Supabase only.

## Exact hosted packet and recovery

- Project: `thfxcvxcsfvrzdysdnkq`; PostgreSQL 17.6; eight preexisting migration ledger entries.
- Packet: `supabase/migrations/20260918160000_workout_structure.sql`.
- SHA-256: `3180df8274dc35edbcce6da8e71bf5b9fa8d190763b283f26e5ea94b8caa7d99`; fixed LF via `.gitattributes`.
- Fresh encrypted backup captured 2026-09-18 15:31:40 UTC; private directory `C:/Users/dani2/AdaptivPush-secure-backups/Scoped-Workout-Removals/20260918T153127Z`.
- AES-256-GCM with DPAPI CurrentUser key custody. Plain database SHA-256 `d21ebd67f104ff4036c8c32797e8abdaafbc5cc21a08dc99f6ea6ce6c528141e`; encrypted SHA-256 `6a539e04ffb5e0a1e2ee15fc8eccaefcdc76f1fdd0658f53d5f2065e1c4bc9e4`.
- Two isolated restores matched 59/59 original relation fingerprints; the final rehearsal also preserved all 59 original relation fingerprints after forward application. Seven schema/security inventories matched the hosted baseline before application. Recovery container has no network and no published ports.
- Backup excludes Storage bodies, external provider/platform configuration and PITR. It must not overwrite later production writes. Recovery is a reviewed forward correction or restore into new isolation followed by reconciled recovery; never blind production restore.
- Private manifests, logs, SQL evidence, synthetic screenshots and exact request evidence remain under `C:/Users/dani2/AppData/Local/AdaptivPush/release-evidence/2026-09-18-workout-editing`, outside Git. No credentials are committed.

The packet is not idempotent DDL and must be applied once through its migration ledger. Before a later authorized deployment, recheck hash, project, ledger and drift; refresh encrypted recovery if hosted state has changed. Prior removal approval does not authorize this packet. Physical Expo/iPhone acceptance, native startup diagnosis and the user's exact past-program route remain open.
