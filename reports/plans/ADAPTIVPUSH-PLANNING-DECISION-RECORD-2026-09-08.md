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
| D-02 Schedule semantics | Open | Pending review. |
| D-03 Publishing and installed-version updates | Open | Pending review. |
| D-04 Consistency model | Open | Pending review. |
| D-05 Readiness and day-of adaptation | Open | Pending review. |
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

