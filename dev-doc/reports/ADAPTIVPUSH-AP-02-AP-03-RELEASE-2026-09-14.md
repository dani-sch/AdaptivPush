# AP-02/AP-03 durable-record release packet - 2026-09-14

## iPhone failure remediation - September 14, current addendum

**IMPLEMENTED AND LOCALLY VERIFIED; iOS acceptance and production release remain blocked.**
This addendum supersedes earlier statements that no reachable QA route or flag
variants exist. It does not supersede the signed-native, physical-device,
accessibility, backup/restore, distribution or production gates below.

### Confirmed environment and causes

- Intake source was clean `95c4670` on `codex/ap02-ap03-release`; existing work
  was preserved. Metro PID 4060 ran `expo start --clear` from this checkout on
  port 8081. Its freshly requested iOS bundle targeted production and contained
  no definitions for either public writer flag: both evaluated false. The
  current process/user/machine environment had no writer overrides. This proves
  the inspected bundle configuration, not what the original phone had loaded.
- The user identifies App Store Expo Go SDK 57 on iOS 26.6.1. Installed source
  is Expo 57.0.22 / React Native 0.86.3; Expo Doctor passes 21/21. Exact Expo Go
  patch/build and iPhone model remain unrecorded; no device debugger was connected.
- Fresh credentialed production reads confirm PostgreSQL 17.6, ledger exactly
  `20260910175317`, `20260910190000`, and no revision table, revision identity
  column or atomic install RPC. Both pending migration byte hashes match the
  reviewed table below. No production writers were enabled and no backup,
  application migration, reset or customer-data write was performed.
- Disabled guards were classified as unknown and flattened by save callers.
  Legacy reads could show a workout without durable IDs, while entry rejected
  it as stale. These are confirmed code defects with regression reproductions.
  Production schema plus current bundle configuration explains the inspected
  read/write mismatch; the original runtime flags remain retrospectively uncertain.

### Native startup investigation

`ExpoAsset`/`ExponentConstants` failures precede app registration; `main` and
`stopSurface` failures are downstream startup symptoms. Later program failures
are a separate path. Notifications warnings are not their cause. Expo's
[SDK 57 issue 48950](https://github.com/expo/expo/issues/48950) documents the same
native-module symptom with stale Metro state, but this task has not proved that
trigger on the user's phone. No dependency upgrade was made. The obsolete SDK 54
FormData placeholder was removed: installed SDK 57 explicitly initializes RN
globals before its Winter runtime. Fresh isolated Metro sessions and an opt-in,
payload-free runtime diagnostic now bind source, backend, effective flags,
platform/OS and Expo Go/native version. **Native cold-launch resolution remains
unverified until the iPhone retest; exports do not prove it.**

### Changes and reproducible verification

Code commits `0f498bc` and `d2d4d09` preserve sanitized typed failures across
repository/command/UI boundaries, distinguish disabled/schema/auth/conflict/
validation/service outcomes, retain unsaved inputs and uncertain submissions,
and share one strict workout-entry identity check across Home, Plan preview and
entry. Matching owner-scoped drafts still recover offline. No IDs are invented
and no legacy multiwrite fallback was added. The repository factory allows the
actual command code to be tested against synthetic HTTP and the local backend.

Tooling commit `cbc8325` fixes an observed export-cache defect: the initial
Disabled export reused Enabled transforms. That initial candidate was rejected.
Expo 57 skips reset-cache under CI; the launcher now clears CI, exports with
`--clear`, and rejects bundles whose actual flags/backend do not match.

| Verification | Current result |
|---|---|
| Unit suites | 65 unique passes: dependency 1, workouts 24, programs 19, availability 12, catalog 9 |
| TypeScript / lint | Passed; three existing unrelated unused-variable warnings only |
| Expo Doctor | 21/21 passed; no dependency changes |
| Existing SQL / concurrency | All three isolated SQL suites and six concurrent-session assertions passed |
| `scripts/verifyIosProgramFlows.ts` | Real LAN login and shipped repository/commands: disabled install/archive/restore reject without mutation; enabled manual/generated artifact installs, exact archive/restore, complete identities, one active program, owner isolation; temporary accounts cleaned |
| `scripts/verifyLegacyMigration.ts` | Separate AP-01-only Supabase stack, real pre-migration rows, exact two reviewed migrations; blocked legacy preview becomes a valid startable draft from database identities; V1 migration provenance and approximate archive preserved; archive/restart succeeds in rolled-back transaction |
| Existing manual fixtures | A authenticates through LAN and reads 3 programs; B authenticates and reads 0; preserved |
| Reachability | LAN interface `192.168.2.49:54330` HTTP health and authenticated flows pass from workstation; separate Docker network also reaches health. Physical iPhone network path awaits Safari check |
| Integrator | Application/tests/types/lint reverified in `C:\workout-app\AdaptivPush-integrator`; code/tooling merge `615765d`. Final documentation binding is in external closeout manifest |

These tests do not exercise physical UI interactions or claim a generated-form,
custom-form, native accessibility or signed-build pass. The legacy replay uses
a separate synthetic database, not production; it does not supply an old app binary.

### Ready Expo Go comparison session

`scripts/Start-ApIosQa.ps1 -ExpectedCommit 4f0b394 -LanAddress 192.168.2.49`
uses only local Supabase's public key, overrides inherited backend/flags,
disables dotenv, validates local schema and LAN proxy, and binds the source.
Enabled Metro is `exp://192.168.2.49:8082`; Disabled is port `8083`, both using
`http://192.168.2.49:54330`. Both live iOS bundles were inspected: correct
true/true or false/false values, local backend present, production backend absent.
The original port 8081 production-targeted session was left intact.

Standalone iOS JavaScript exports (no native/signing claim), source `4f0b394`:

| Variant | Actual bundled flags | SHA-256 |
|---|---|---|
| Enabled | true / true | `EAEA59C56E7E917136718462D69E4C441D1C84D70073DAF34CFD41BA06902C32` |
| Disabled | false / false | `45C7D37C532F15AF649A74F8A054EFE57ECF395D11CFC0DE057B36A2D0D843C0` |

Logs, exports and per-variant `qa-binding.json` are under the existing external
evidence directory's `ios-remediation` subdirectory. Fault controls remain
workstation-only; the proxy forwards solely to local Supabase and logs no
headers or bodies. The exact iPhone steps are in the manual matrix's current
addendum. The user has used Expo Go throughout and has not supplied a separate
Apple team/bundle identity. Signed native acceptance therefore remains open;
no invented signing identifiers or build configuration were created.

Next: physical iPhone reachability/cold launch and five-flow retest, then the
remaining applicable matrix/native/accessibility gates. Production still waits
for required user passes, fresh encrypted backup and isolated decrypt/restore,
exact dry-run/identity checks, reviewed migration application and verification.
AP-04/AP-05 were not started.

## Platform correction — September 14, following user review

**iOS-FIRST — native candidate preparation remains open; RELEASE BLOCKED.**
The earlier final pre-QA result below incorrectly promoted available Android
build tooling into the release target. It is superseded wherever it claims
pre-QA completion, a ready user handoff, an Android device requirement, or
conditional iOS scope. The user requires an iOS focus.

Shared-code, SQL and Metro checks remain valid evidence. Android APKs remain
supplementary build evidence. An iOS Metro export is not a signed native build.
No iOS native artifact, signing/install binding, reachable nonproduction backend
route or physical-iPhone acceptance result is established by this packet.
Prepare those dependencies and both flag variants before handing off the
[corrected iOS matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md).
VoiceOver, Dynamic Type, Reduce Motion and iOS recovery/lifecycle checks are
required; no Android test is required to close this iOS release packet.
Production migration and writer enablement remain gated as before.

The original results below are retained as dated evidence, subject to this
correction. The current next action is iOS candidate preparation.

## Final pre-QA result — September 14

**INTEGRATION VERIFIED — RELEASE BLOCKED. Agent-executable pre-QA work is complete.**
The next required input is the user's results in the
[bound 31-case matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md).
No manual, physical-device, visual or accessibility pass was performed or
inferred. AP-04/AP-05 were not started. Fresh production backup/restore and the
two migrations remain deferred until required pre-migration manual passes.

The corrected behaviors are durable identical retries, concurrency-safe receipt
lookup, frozen workout submissions, actual load/unit/exercise attribution,
ancestor-completed revision protection, exact elapsed checkpoint restoration,
legacy provenance, owner isolation and accessible entry controls. A definitive
stale program rejection clears its pending request for a refreshed attempt;
a disabled workout writer restores the editable draft. Uncertain workout
submissions retain their frozen payload until reconciliation.

### Candidate and integration

- Clean source: `42f317d66baa171d5fc5f80d6810ed9c31c46277` on
  `codex/ap02-ap03-release`.
- Code/tooling integrator merge: `7cdf598d4fb7a93a882c09448b67807409e669e3` in
  `C:\workout-app\AdaptivPush-integrator`. Its Git tree equals the candidate
  tree `86e7a9c8d817f87432ba9651a5efc6ae49717521`.
- Current-task merge `302ce6efd78a5ea4576f9fb2525f87699ecaef7d` separately passed
  `npm ci`, all 59 unit cases via catalog/availability/combined commands, strict
  TypeScript and lint. Application/dependency/SQL/test source is identical
  across both integration stages; later changes supply verified build tooling.
  Final documentation merge and clean-state identifiers are in the external
  `closeout-manifest.json` beside the build manifest.
- Inspected Android identity: `com.dani.sch.tempapp`, version `1.0.0`/code `1`,
  standard debug signing; compiled/target API 36, min API 24. This pre-existing
  local ID does not establish production distribution. No Android was attached.
- Enabled artifact `42f317d-enabled.apk`, SHA-256
  `C749F4CBC22EDFC5081A4DF92A09D5F7D9DE3AEBB5327774C26C905D67512FA1`.
- Disabled artifact `42f317d-disabled.apk`, SHA-256
  `F3D0DAB0CF47B5A124A2B2C219ADB76A8FF5E60BBEE1B7B29319CE61E1682226`.
- Both contain `assets/index.android.bundle`. Embedded hashes are enabled
  `f3e71beb43081b466441b2bb2798d187fd58f6adafa60b368f88004957bcc0fc` and disabled
  `46e4d5a9f708280de3c8fce2c44096e6ba257f9c39b02972dd388a26ca8c4b22`.
  They are verified different. Corresponding writer flags are `true/true` and
  `false/false`, targeting only `127.0.0.1:54329` -> local Supabase port 54321.
- Exact native command: `scripts/Build-ApManualQa.ps1`. Enabled/disabled debug
  builds passed in 1m06s/1m08s, each with 436 tasks. The helper forces bundle
  generation/cache reset between variants and rejects identical APK hashes.
  Expo 57 suppresses reset-cache under CI; the local build helper now permits
  reset while retaining noninteractive export/Gradle commands. Earlier rejected
  candidates are quarantined under `rejected-builds`, not handed off for QA.
- The bound launcher checks clean source compatibility, installs the chosen
  APK preserving app storage, sets USB reverse, and starts Metro with matching
  local flags. Each embedded bundle supplies the native fallback path when
  Metro is absent. Physical cold-launch success still requires the user's test.

### Complete automated packet

Environment: Windows PowerShell 7.6.5, Node 24.14.0, npm 11.9.0, Expo 57.0.22,
React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, Supabase CLI 2.117.0,
Microsoft JDK 17.0.20, Android SDK 36, Docker PostgreSQL image 17.6.1.167.
All Expo verification suppresses dotenv loading with `EXPO_NO_DOTENV=1`.

| Gate / command | Final result |
|---|---|
| `npm ci` | Passed in feature checkout and independently in integrator |
| `npm run test:catalog` | 9 passed |
| `npm run test:dependencies` | 1 passed |
| `npm run test:workouts` | 22 passed |
| `npm run test:programs` | 15 passed |
| `npm run test:availability` | 12 passed |
| `npm run test:ap02-ap03` | 38 component cases; 59 unique cases across the full packet |
| `npx tsc --noEmit` | Strict TypeScript passed |
| `npm run lint` | Zero errors; three unchanged unrelated unused-variable warnings (`submitted`, `isDecrease`, `parsePrCount`) |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform android --platform ios --output-dir <external-evidence>/941841e-metro-enabled` | Both passed: Android 3825 / iOS 3493 modules; application source equals final candidate. No iOS native/device claim. |
| `android/gradlew.bat :app:assembleDebug --no-daemon --console=plain` | Standard debug passed (45s, 435 tasks); final embedded variants passed separately above |
| `npx supabase db reset --local` | Fresh PostgreSQL 17 reset applied the four migrations; manual fixtures seeded afterward |
| `npx supabase db lint --local` | No schema errors |
| All three `supabase/tests/*.sql` through `docker exec -i supabase_db_AdaptivPush psql -X -q -U postgres -d postgres -v ON_ERROR_STOP=1` | AP-01 regression, atomicity/isolation and successor-revision suites passed; synthetic transactions rolled back |
| `node scripts/verifyDurableConcurrency.mjs` | Six real concurrent-session assertions passed, including fixture cleanup |
| Local account/proxy probes | A authenticates and sees 3 fixture programs; B authenticates and sees 0. Normal forwarding and HTTP 503/400/404 modes verified nonvisually. |
| PowerShell parser / `node --check` QA scripts | Passed; fixture seeding uses only a fixed local target |
| `git diff --check` | Passed; repeated during final documentation closeout |
| Python lint | Not applicable: no Python source changed |

Logs and artifacts are outside Git at
`C:\Users\dani2\AppData\Local\AdaptivPush\release-evidence\2026-09-14`:
`final-test-*.log`, `final-typescript.log`, `final-lint.log`,
`final-expo-doctor.log`, `final-metro.log`, `final-android-debug.log`,
`final-db-lint.log`, `final-ap_*.log`, `final-concurrency.log`, `integrator-*.log`,
`42f317d-*-build.log`, `42f317d-build-manifest.json`, manual fixture manifests
and `closeout-manifest.json`. Build manifests contain no credentials. The local
account password helper prompts securely outside Git. Proxy simulations do not
replace real legacy-build/environment or physical-device compatibility proof.

### Production and remaining release gates

Independent read-only inspection reconfirmed `thfxcvxcsfvrzdysdnkq`,
`ACTIVE_HEALTHY`, `us-east-1`, PostgreSQL 17.6, 16 public tables, ledger exactly
`20260910175317` and `20260910190000`, and durable schema absent. Direct database
authentication and backup command preparation work with the DPAPI credential.
The management-query path's separate permission 42501 does not block that access.
No production write, fresh backup, restore or migration was performed. Writer
defaults remain off; this task has not enabled a production writer.

The two pending migration hashes remain the exact LF Git-blob/root-checkout
SHA-256 values in the full packet table below. Windows CRLF checkout hashes can
differ; use the reviewed root artifacts and recheck exact bytes before applying.
The fresh AES-256-GCM/DPAPI recovery set, isolated PostgreSQL 17 restore proof,
exact dry-run/application, rolled-back production probes and producer rollback
rehearsal follow the user's manual results. No new backup hashes exist yet.

Remaining blockers: applicable M cases; physical Android and any declared iOS
build/hardware/accessibility evidence; real legacy build/environment; then
recovery and production verification; then W cases, production package/bundle,
EAS/store/signing/distribution/deployment ownership and named payload-free
monitoring. Temporary app identity is not a production destination. Keep AP
status partial and writers off until the matrix's full RELEASED condition is met.

### Documentation closeout and next action

The lifecycle rule is in the four requested canonical files. The consumed
prompt's exact contents and earlier FABLE-5 provenance are preserved at the
destinations/hashes below. Direct link repair, archive inventory update and TOC
regeneration cover changed files; no broad audit or replacement execution prompt
was created. Owning living documents were updated; dated reports and previous
DEV-LOG entries were preserved with addenda.

The smallest next action is to connect a physical Android phone, follow the
bound setup, and return test case results. No Supabase authentication step is
currently required. The preparatory record below remains historical and is
superseded by this final addendum wherever it says final work is pending.

## Preparatory snapshot retained below

## Status and evidence boundary

**INTEGRATION VERIFIED — RELEASE BLOCKED** retains the prior September 11
integration result. **Final September 14 build and integrator binding are
pending.** The completed checks below are intermediate results reported by the
release coordinator; they do not constitute the final clean-dependency packet
after all tooling changes. The coordinator must append exact final commands,
artifact identifiers, hashes and integration results before issuing the manual
handoff. No new manual, visual, physical-device, accessibility or interaction
test has been performed or passed by this task.

Scope is AP-02/AP-03 durable records and their task-scoped documentation
lifecycle. AP-04/AP-05 were not started. Work is on
`codex/ap02-ap03-release`, based on `origin/main` commit
`9d968d56e49483c854219a5d57bee4d375c946bd`. Both production writers remain
disabled. Production migration and a fresh pre-migration backup/restore must
wait for the user's required manual results.

## Implemented changes and corrected defects

| Change | Result / source |
|---|---|
| Concurrent replay receipt race | The database takes the owner advisory transaction lock before checking an existing operation receipt, so a concurrent retry observes the completed operation instead of acting on a stale pre-lock read. Both pending migrations and the real concurrent-connection harness cover this boundary. |
| Mutable finalization retry | The workout draft retains its exact submitted payload and end time; response-loss retry reuses them. Pending/finalized inputs and swaps reject edits; confirmed definitive rejection clears the retry state needed for a corrected attempt. Workout commands, contracts and draft store own this behavior. |
| Installation/lifecycle retry drift | Durable installation and archive/restore stores retain the accepted request across retries; installation stays pinned to the captured owner. A definitive rejection clears stale retry state, while an uncertain result retains it for reconciliation. |
| Completed ancestor revision exposure | Future exercise revisions protect completed sets linked to ancestor revisions while the current workout retains its frozen revision/prescription. |
| Actual load and derived PR semantics | External kilogram load converts to pounds for compatible aggregate volume; assistance/bodyweight do not inflate external-load volume. PR candidates use the actual exercise identity and supported external load units. Zero and unknown remain distinct. See `features/workouts/actualLoads.ts`. |
| Archive placement drift | Exact checkpoint captures elapsed placement and resumes without rewriting the original program start date. Explicit restart and legacy approximation remain distinct; legacy provenance cannot be accepted as an exact checkpoint. See `features/programs/checkpoint.ts` and lifecycle commands. |
| Archive compatibility and account isolation | Archived reads fall back for the supported legacy schema and reject obsolete previous-owner responses after account switches. |
| Accessible input and pending controls | Workout set controls have contextual names, states and read-only behavior; archive and workout controls receive bounded accessible-target corrections. Physical TalkBack/VoiceOver, touch, large-text and appearance evidence remains user-owned. |
| Local testing support | `scripts/Start-ApManualQa.ps1` checks clean source compatibility, obtains only local Supabase configuration, sets flags for the local bundle and supports Android USB reverse mappings. `scripts/seedManualQa.ts` seeds supported local catalog names with no production-target option. `scripts/verifyDurableConcurrency.mjs` exercises separate database connections. |
| Documentation lifecycle | The canonical documentation instructions, document/sprint skills and AGENTS now archive task-consumed temporary material during the same task, preserve provenance, repair direct references and update living owners in place. Full audits remain explicitly invoked operations. |

## Local commits

| Commit | Meaning |
|---|---|
| `ff29ccf49091eec7f3456520a3e68bb0426fc8e9` | Task-scoped documentation lifecycle and exact prompt archival |
| `1f00146` | Client durable retries, load/PR semantics, checkpoint placement, owner and accessibility corrections |
| `94c21a2` | Serialized database replay, revision lineage protection and SQL/concurrency regression coverage |
| `027d348` | Local manual-QA launcher and catalog fixture commands |

This report's preparatory documentation commit will follow those units. The
coordinator must append its final commit and actual integrator merge result;
neither is inferred from the historical `54e5a39` integration record. No direct
push to main or force-push is authorized.

## Intermediate automated and build results

The coordinator reported the following September 14 results before this
preparatory report. These results must be followed by the complete final packet
from the final clean dependency state and a current integrator verification.
Do not use the earlier native build or export as a bound final manual artifact.

| Check / existing command surface | Observed intermediate result |
|---|---|
| Clean dependency installation, `npm ci` | Passed |
| Catalog, `npm run test:catalog` | 9 passed |
| Dependencies, `npm run test:dependencies` | 1 passed |
| Workouts, `npm run test:workouts` | 22 passed |
| Programs, `npm run test:programs` | 15 passed |
| Availability, `npm run test:availability` | 12 passed |
| Combined `npm run test:ap02-ap03` | Its component results are above; final complete-packet transcript still required |
| Strict TypeScript and application lint | Final current-packet results to be appended; not claimed from component tests |
| Expo Doctor | 21/21 passed |
| Metro Android export | Passed; final bundle binding pending |
| Metro iOS export | Passed; this is not an iOS native build or device result |
| Android native debug baseline assembly | `BUILD SUCCESSFUL`; final artifact/source/hash binding pending |
| Fresh local PostgreSQL 17 Supabase reset | Passed with the two AP-01 and two AP-02/AP-03 migrations |
| Local database lint | Passed |
| `supabase/tests/ap_01_3_catalog_authority_isolation.sql` | Passed |
| `supabase/tests/ap_02_ap_03_atomicity_and_isolation.sql` | Passed |
| `supabase/tests/ap_03_program_revision_swap.sql` | Passed |
| `npm run test:database-concurrency` | Six assertions passed using real concurrent database connections |
| Documentation checks | Targeted moved-path/direct-link checks, archive hashes, unchanged historical evidence and scoped whitespace checks passed; final TOC refresh remains pending |

The checks preserve distinctions between deterministic/source proof, isolated
database proof, build preparation and user-visible physical-device evidence.
No manual test is inferred from any row above. Final commands, environment,
elapsed times where recorded, logs, complete-packet counts, remaining failures
and integration outcome belong in the coordinator's final addendum.

## Production authentication and read-only state

The exact production project was independently reconfirmed as
`thfxcvxcsfvrzdysdnkq`, healthy in `us-east-1`, on PostgreSQL `17.6`.
Read-only inspection found 16 public tables and exactly these ledger versions:

1. `20260910175317` - AP-01 baseline.
2. `20260910190000` - AP-01 catalog authority.

The durable AP-02/AP-03 schema is absent. Both reviewed migrations below remain
unapplied. Secure direct database authentication works through the local
DPAPI-protected credential helper outside the repository. The CLI
`db query --linked` management path still returns permission error `42501`;
that separate management path failure is not evidence that direct authenticated
database access failed. No credentials, connection strings, private records or
raw user payloads are recorded here.

This task performed no production writes. Authentication and read-only
inspection do not authorize an unexpected project or remove the requirement to
reconfirm identity, health, PostgreSQL version, link, ledger and drift before
each remote write boundary.

## Reviewed production migration packet and hashes

These are SHA-256 values of the current reviewed local file bytes, computed on
September 14 after SQL correction commit `94c21a2`. Earlier dated AP-02/AP-03
reports retain earlier hashes as historical evidence. Recompute and match the
final reviewed artifacts immediately before any production dry-run/application.

| Order / migration | SHA-256 |
|---|---|
| 1. `20260910210000_ap02_ap03_durable_workouts_and_program_revisions.sql` | `FB50D57063E5AE1B3BAFD863060818C6795E2A7E01026960F1A66558B70BFA64` |
| 2. `20260911120000_ap03_revision_safe_exercise_swap.sql` | `60399252D076A2B72823CF19C3A62308A750C78DDEFAB7AC64F1DDCF6B77D9A0` |

Both files were corrected locally before their first production application.
After manual pre-migration passes and the fresh recovery proof, the production
dry-run must list exactly those files in that order, with nothing else. A ledger,
identity, drift, hash or dry-run discrepancy stops the write path for inspection.
Do not reset production, repair migration history, delete production data, drop
durable records or apply unrelated migrations.

## Backup, restore and rollback boundary

**Fresh AP-02/AP-03 production backup: not yet captured. Restore of that fresh
backup: not yet performed. Production migration: not applied.** These are
deliberately deferred until the required user pre-migration tests pass. The
historical AP-01 recovery set is not a fresh recovery point for this amended
release packet.

After manual passes, capture fresh roles/schema/data dumps using pinned
Supabase CLI `2.117.0` and PostgreSQL 17-compatible tooling. Store them outside
the repository in a new timestamped recovery directory, encrypt immediately
with AES-256-GCM, protect the key with Windows DPAPI CurrentUser, and record
plaintext/encrypted hashes and a redacted custody/retention/exclusion manifest.
Decrypt and destructively restore only into a separate isolated local
PostgreSQL 17 target. Compare safe relation counts and aggregate schema,
constraints, indexes, functions, grants, RLS, policies and ledger; retain managed
role and Storage-body caveats. Remove plaintext and temporary restore material
only after authenticated restore proof. Recheck encrypted/key artifact hashes
immediately before the production migration.

Rollback disables producers and preserves drafts, receipts, revisions,
checkpoints, sets and history. Forward-fix additive records; do not restore
unsafe multiwrites or delete records as recovery. Actual rollback rehearsal and
monitoring ownership remain writer-enable gates.

## Manual build and user handoff

The [manual QA matrix](/dev-doc/reports/ADAPTIVPUSH-AP-02-AP-03-MANUAL-QA-2026-09-14.md)
contains 27 pre-migration cases, three pre-writer cases and one observation case.
It is **unbound and not executable yet**. The coordinator must supply the exact
final commit, build ID/hash/platform, isolated backend, fixture manifest and
launch command before asking the user to run it. Enable both writer flags only
in that local manual-testing configuration; keep production flags default-off.

Android debug tooling exists, but a physical Android pass is still required.
iOS Metro success does not supply iOS hardware, a signed native build or
VoiceOver evidence. Legacy build and special conflict/missing-schema fixture
availability must be explicit. Unavailable required cases stay blocked, not
silently omitted. The tester provides only actual device observations;
coordinator-owned supporting database checks and all already automated proofs
remain agent work.

## Remaining release blockers and next action

- Finish the final clean-dependency test/build/local-database packet and current
  integrator verification; bind the actual manual candidate.
- Obtain user passes for the applicable blocking physical-device, interaction,
  accessibility, recovery, archive and legacy compatibility cases.
- Then create and verify the fresh encrypted production recovery set, perform
  the exact two-migration dry-run/application and rolled-back production probes,
  and prove expected ledger, authority, isolation and compatibility.
- Supply a real application/distribution identity. Repository `temp-app` /
  `tempapp`, missing declared package/bundle IDs and no established `eas.json`
  do not establish a production destination. Signing, deployment ownership and
  supported platform/OS scope must be real, not invented.
- Rehearse rollback and establish named payload-free monitoring of conflicts,
  replay, pending age, failures and outcome coverage before enabling production
  writers. Do not mark `RELEASED` with any gate unresolved.

The next agent action is to finish and record the final packet, integrate and
bind the manual build. The next user action follows only after that binding:
execute the numbered QA cases and return their compact result template. There
is no authentication action currently requested from the user.

## Documentation archival and ownership

The consumed `dev-doc/plans/active/EXECUTION-PROMPT.md` was archived byte-for-byte
as [the September 14 intake snapshot](/dev-doc/plans/legacy/2026-09-14-superseded/dev-doc/plans/active/EXECUTION-PROMPT.md),
SHA-256 `c5d11467f6c388269786e0332488dba7663602a6e2093d52e3165ee8583d5304`.
The earlier FABLE-5 archive remains untouched with SHA-256
`80eaee91a674beaf80470266b61497fe3b6cb8dc15940fe79c847220f9244cac`.
[TODO](/dev-doc/main/TODO.md), [CURRENT-STATE](/dev-doc/main/CURRENT-STATE.md)
and the [execution register](/dev-doc/plans/active/ADAPTIVPUSH-EXECUTION-REGISTER.md)
are its current execution successors. The owning inventory records the distinct
provenance. Dated AP-02/AP-03 reports and prior DEV-LOG entries remain intact;
new observations were appended separately. No current chat prompt was saved.
TOC regeneration is required at final closeout because files moved/were added.
