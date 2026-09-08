# AdaptivPush planning decision record

## Purpose and authority

This record captures product and architecture decisions approved after review of:

- `reports/plans/ADAPTIVPUSH-ORIGINAL-REVIEW-REQUEST-2026-09-08.txt`
- `reports/plans/ADAPTIVPUSH-DECISION-PACKET-2026-09-08.md`
- `reports/plans/ADAPTIVPUSH-CONTINUATION-PROMPT.md`

The decision packet remains an unchanged historical source. This record is the
current authority for decisions made during the continuation review. It does not
authorize application changes or database migrations. Canonical-plan replacement,
archival, and implementation remain pending completion and approval of the full
decision sequence.

## Status

| Decision | Status | Outcome |
|---|---|---|
| D-01 Free/premium boundary | Approved | Free remains a complete usable training product; premium sells advanced customization, equipment precision, automation, and convenience. |
| D-02 Schedule semantics | Approved | Dated hybrid model: preserve original placement and program-cycle identity; all moves, skips, carries, and recovery choices are explicit. |
| D-03 Publishing and installed-version updates | Approved | Start with unlisted links/codes, immutable published versions, pinned private installations, and explicit separate installation or replacement of updates. |
| D-04 Consistency model | Approved | Weekly schedule adherence with a subordinate “weeks on plan” streak; planned rest is respected and accepted pauses preserve without incrementing the streak. |
| D-05 Readiness and day-of adaptation | Approved | Contextual, explained proposals require explicit acceptance; rejection persists and high readiness never silently increases difficulty. |
| D-06 Health display and synchronization | Open | Pending review. |
| D-07 Review eligibility | Open | Pending review. |
| D-08 Theme scope and commerce | Open | Pending review. |
| D-09 Public operations and content policy | Open | Will be decomposed into separately reviewable decisions. |
| D-10 Numerical-rule validation | Open | Pending review. |

## D-01 — Free/premium boundary

**Status:** Approved on 2026-09-08.

**Product principle:** AdaptivPush sells precision, automation, and convenience.
It does not paywall accurate workout records, essential training routes, safety
controls, or continued use of a program the user already owns.

### Free product

- Standard program generation using goal, experience, available days, session
  duration, and broad equipment categories.
- One active equipment profile, such as a home gym or primary gym.
- Basic equipment availability covering categories such as barbells, dumbbells,
  cables, machines, bands, and bodyweight.
- Manual exercise substitution and manual entry of the weight actually performed.
- Basic progression using conservative defaults when exact equipment increments
  are unavailable.
- Program creation/use, workout logging, schedules and programmed rest, history,
  manual schedule control, neutral readiness capture, and safety guidance.
- Continued access to saved programs, accepted prescriptions and schedules,
  workout history, and explanations for decisions already applied after downgrade.

### Premium convenience and precision

- Advanced program customization, including split alternatives, focus-muscle
  priorities, volume controls, exercise preferences, progression-style choices,
  and detailed regeneration.
- Multiple named equipment profiles for different training locations.
- Detailed per-location inventories of machines and equipment.
- Per-machine configuration including stack values, exact selectable weights,
  plate or stack increments, available dumbbell pairs, cable configuration,
  assistance levels, and measurement units.
- Equipment-aware generation that selects available exercises and attainable
  prescribed loads.
- Progression recommendations matched to the next weight actually available on
  the applicable equipment.
- Automatic substitution or recalibration when the user changes locations.
- Machine-specific performance history because nominal loads on different machines
  are not assumed to be comparable.
- Automated schedule-recovery proposals and deeper longitudinal coaching.

### Required guardrails

- A free user can always record the actual exercise, load, repetitions, and result.
- Premium status never changes ownership of the user's equipment data or training
  history.
- Losing premium access removes future premium automation, not previously accepted
  training artifacts or explanations.
- The free fallback must disclose when a progression recommendation uses a generic
  increment and allow the user to choose an attainable load manually.
- Equipment profiles and machine configurations are private user data by default.

### Planning consequences

- Separate broad equipment availability from detailed equipment-instance and
  location profiles.
- Represent loading semantics explicitly: per-hand versus combined dumbbell load,
  plate increments, stack selections, assistance, units, and machine identity.
- Treat exact equipment-aware generation and progression as a premium capability,
  while accurate capture and conservative manual progression remain free.
- Add proposed equipment-location, equipment-instance, and available-increment
  contracts to the schema review; exact tables remain subject to the later database
  design decision and are not approved for migration by this record.

## D-02 — Schedule semantics

**Status:** Approved on 2026-09-08. Selected option: dated hybrid model.

### Approved behavior

- Model workout and rest occurrences on explicit local calendar dates in the user's
  schedule timezone.
- Preserve each occurrence's original date and its program-cycle identity. Moving
  “Cycle 2, Pull A” to another date does not change which prescription or progression
  history it represents.
- Store current placement and resolution separately from the original schedule so
  schedule changes remain explainable and auditable.
- Treat programmed rest as a real schedule occurrence, not an empty workout or an
  invitation to advance automatically to the next session.
- A missed workout creates an unresolved choice, not automatic catch-up debt. The
  user can move, carry, skip, replace, or leave the occurrence unresolved.
- Manual one-time moves, two-way swaps, recurring schedule changes, and temporary
  availability changes remain free capabilities.
- Automated recovery may recommend a bounded rearrangement as a premium convenience,
  but it cannot silently move work, compress missed volume, remove rest, or schedule
  outside declared availability.
- Completed and in-progress work is fixed. Future schedule changes use explicit
  revisions and prevent the same occurrence from being fulfilled twice.
- Calendar-week reporting may change when a workout moves across a week boundary;
  the workout's program-cycle identity and associated progression context do not.
- Accepted illness, recovery, travel, pause, or deload changes do not create a
  punitive backlog.

### Required user experience

- Today resolves the dated occurrence first and clearly distinguishes workout,
  programmed rest, unresolved missed work, and program completion.
- When work is missed or performed out of order, show what remains fixed, what may
  move, recovery or overlap concerns, and any work that would remain unplaced.
- The user must explicitly accept, modify, or reject a recovery proposal.
- An infeasible schedule produces an explanation and alternatives instead of a
  falsely “safe” arrangement.

### Planning consequences

- Introduce stable occurrence identities, local-date and timezone semantics,
  schedule revisions, explicit rest kinds, fulfillment links, and deviation records.
- Treat `programs.start_date` as historical context rather than an advancement
  control.
- Include timezone changes, daylight-saving transitions, cross-device revision
  conflicts, partial workouts, and replayed completion requests in implementation
  fixtures.

## D-03 — Publishing and installed-version updates

**Status:** Approved on 2026-09-08. Selected option: versioned and pinned.

### Approved behavior

- Initial publishing uses unlisted HTTPS links and opaque lookup codes. Public
  discovery is a separate later capability and rollout decision.
- Each published version is an immutable, sanitized program artifact with a stable
  version identity and content hash.
- Publishing exposes only the reusable program: exercises, relative prescriptions,
  workout/rest structure, progression policy, rationale, instructions, attribution,
  and compatibility metadata.
- Publishing never includes the author's personal loads, workout history, readiness,
  health data, symptoms, private notes, or private generation snapshot.
- Installing creates a private program instance pinned to the exact published
  version. The recipient selects schedule placement and calibrates starting loads.
- Author changes create a new published version and never mutate an installed copy.
- When a newer version exists, the user can preview its differences and then install
  it separately or explicitly replace future planning with it.
- Existing history and completed prescriptions remain attached to the version and
  private instance under which they occurred.
- Selective merging is deferred until stable slot identities, user-customization
  ownership, and conflict semantics have been implemented and validated.
- Unpublishing stops new resolution and installation while existing private copies
  remain trainable. Safety, legal, or infringement takedowns may separately
  quarantine distribution under the later public-operations policy.
- Previously installed programs remain available offline; resolving links,
  publishing, and installing new versions require connectivity.

### Required user experience

- The publication preview must show exactly which content will become shareable.
- The recipient preview identifies the author, exact version, goals, equipment,
  expected schedule/time, programmed rest, progression model, and compatibility.
- Update notices must never imply that the installed program changed automatically.
- Replacing future planning requires an explicit preview and confirmation, with the
  prior program and history preserved.

### Planning consequences

- Separate reusable templates, immutable published versions, share-link resolution,
  private installations, and private program instances in contracts and storage.
- Define a strict allow-list serializer and adversarial privacy-boundary tests.
- Include invalid, expired, revoked, unpublished, quarantined, incompatible, and
  missing-version link states in implementation fixtures.
- Keep selective version merging out of the initial implementation plan except as a
  deferred capability with explicit prerequisites.

## D-04 — Consistency model

**Status:** Approved on 2026-09-08. Selected option: weekly adherence plus
“weeks on plan.”

### Approved behavior

- The primary consistency display is a weekly schedule-adherence card rather than a
  consecutive workout-day streak.
- Report eligible scheduled workouts completed or explicitly fulfilled by an
  accepted reduced variant against eligible planned workout occurrences.
- Recognize programmed rest separately as successful schedule adherence. Do not add
  rest days to the workout numerator or use them to inflate a low-frequency plan.
- Show an optional, subordinate “weeks on plan” streak when a week satisfies the
  declared adherence policy.
- Accepted illness, recovery, travel, and other explicit pauses preserve an existing
  streak without incrementing it.
- Accepted schedule moves and swaps are evaluated against the resulting approved
  schedule while retaining the original schedule and change provenance.
- A rest or deload week may be classified as successful adherence without being
  presented as a new training-volume achievement.
- Partial workouts remain visible and use an explicit fulfillment classification;
  they are not silently counted as complete or discarded.
- Offline or otherwise unconfirmed activity remains pending rather than being marked
  as failure.
- Users may hide consistency and streak displays.
- Consistency calculations remain free, local-capable, and independent of premium
  coaching or health integrations.
- Do not attach public leaderboards, shame-oriented messaging, or rewards to medical
  exemptions, rest, or pause classifications.

### Required user experience

- Explain the weekly target, completed planned sessions, respected rest, accepted
  changes, partial work, and unresolved occurrences without collapsing them into an
  opaque score.
- Clearly distinguish “streak preserved” from “week added to streak.”
- When the schedule changes retrospectively, display that the result was calculated
  against an approved revision and retain the original placement for audit.

### Planning consequences

- Consistency depends on the approved dated occurrence and fulfillment model in
  D-02, not merely on counts of workout-session rows.
- Store or derive calculation policy version, schedule revision, source watermark,
  and explicit pause/fulfillment classifications.
- Include programmed rest, variable weekly frequency, deload weeks, pauses, partial
  sessions, retrospective corrections, offline activity, and timezone boundaries in
  implementation fixtures.

## D-05 — Readiness and day-of adaptation

**Status:** Approved on 2026-09-08. Selected option: explicit contextual proposals.

### Approved behavior

- Preserve the planned prescription until the user explicitly accepts or modifies
  an explained proposal.
- Use current readiness, symptoms, recent comparable performance, schedule phase,
  and declared context rather than a score-to-load multiplier.
- Persist acceptance, modification, rejection, deferral, expiry, and application so
  Home and Workout share one decision state. Dismissing UI is not acceptance.
- High readiness never silently increases load, sets, repetitions, or effort. Any
  eligible challenge is a bounded opt-in choice.
- Pain, illness, and concerning function or systemic symptoms use a distinct safety
  pathway rather than being hidden inside a readiness score.
- Starting a workout freezes the accepted prescription. Later input may create an
  explicit amendment but cannot overwrite entered sets.
- Prefer reducing optional volume, then complexity, then load, except when safety or
  actual performance requires another order.
- Neutral capture, manual adjustment, and safety guidance remain free. Richer
  longitudinal interpretation and automated proposal generation may be premium;
  accepted outputs and their explanations survive downgrade.
- Missing or conflicting signals remain visible with provenance. Imported health
  data cannot override reported pain, illness, or the user's current assessment.

### Planning consequences

- Replace independent screen overlays with one revision-aware recommendation and
  decision lifecycle.
- Preserve legacy readiness scores with their original scale and provenance; do not
  silently reinterpret them as the new policy.
- Test rejection across screens, late responses during logging, deload/high-readiness
  conflicts, missing symptom details, failed persistence, stale proposals, and
  conflicting subjective/performance/health signals.
