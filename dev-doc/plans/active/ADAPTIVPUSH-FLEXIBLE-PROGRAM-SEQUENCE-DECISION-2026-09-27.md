# Flexible program-sequence decision - 2026-09-27

## Implementation checkpoint

The approved additive backend migration `20260927190000` has since been deployed and verified against its isolated rehearsal, including owner/anonymous, exact retry, concurrency, and unchanged empty AP-04 schedule tables. By separate explicit user approval, authenticated calls to the legacy AP-04 create/revise RPCs are grant-disabled; their function bodies and tables remain intact. [Exact authority evidence](/dev-doc/reports/ADAPTIVPUSH-FLEXIBLE-SEQUENCE-AUTHORITY-2026-09-27.md) supersedes the pre-implementation wording below. The client and device acceptance remain separate, open gates.

## Authority and scope

This decision supersedes the active AP-04 client requirement for calendar-authoritative workout placement. It refines D-02 only where D-02 requires dated scheduling, accepted schedule revisions, weekly schedule adherence, or schedule-derived notifications. All completed workout timestamps and immutable prescription evidence remain authoritative history.

The original decision authorized no migration or hosted deployment. The subsequent user approval recorded below authorizes a separate additive sequence-authority migration and its deployment after the exact packet passes the existing recovery and verification gates. It does not authorize modifying, deleting, redeploying, cleaning up, or repurposing the deployed empty AP-04 tables/RPCs. Clients must stop creating dated placements and must not treat date-authoritative reads as program authority.

## Approved behavior

- A program is an ordered relative sequence of prescription days and explicit rest content. When not paused, the suggested next workout is the first pending workout day in the explicitly persisted order; explicit skipped/rest days and days with a finalized linked program workout are excluded. A paused program has no workout suggestion. Rest remains visible content.
- Today and workout entry offer the suggestion plus explicit **Select other workout day** and **Ad-hoc workout** actions. Selecting another program day never silently advances or substitutes the suggested day.
- Ad-hoc workouts are history-only. They do not fulfill, advance, reorder, skip, or otherwise change program work.
- Program work can be explicitly reordered, skipped, replaced with rest, or left unresolved. These states create no catch-up debt. Rest remains program content, never an empty workout or calendar obligation.
- Finishing an incomplete workout asks "Submit workout even if incomplete?" Yes submits a finalized partial session and resolves only its selected program day; No returns to editing. A submitted partial requires no follow-up resolution. Only logged exercises can progress under existing program rules; unlogged exercises and weights do not progress. Finishing offers Continue and Adjust upcoming program; pending unstarted days remain available for optional explicit program-day control. No finish path automatically reorders, skips, replaces, pauses, or adjusts the program.
- A program-level pause persists until manually resumed. After at least 14 days since the last finalized program workout, offer Resume unchanged, Review/adjust program, and Start new program. No load or volume reduction is automatic.
- Completion context reports completed, partial, skipped, and unresolved program work. It does not report a weekly schedule score or streak target.
- Disable scheduled-workout, PR, deload, and test notifications. The only permitted local alerts are one five-minute active-workout inactivity nudge and an optional rest-timer completion alert.
- The rest timer starts after a logged set, is user-configured and skippable/extendable, survives restart while its active draft exists, and may send one local completion alert with permission.
- Availability and travel remain optional generation preferences, not authority over an active program. Time zones and DST apply to actual timestamps, history display, and local timer/alert behavior only.
- Publishing contains relative program structure and rest pattern only. Recipients select their own training preferences; publication and installation contain no placement dates.

## Required sequence contract

The stage-3 implementation must establish durable owner-scoped, revision-safe authority for reorder, skip, rest replacement, unresolved state, and pause/resume before replacing client behavior. It must not repurpose `program_schedules`, `scheduled_days`, or `schedule_deviations` as hidden sequence state without a separately reviewed compatibility design.

`REQUIRES INSPECTION`: the exact first-use rest-timer preference shape; the notification settings, active-draft recovery, and device-permission surfaces to change; and the backend atomicity/lineage details of linking actual finalized program work to sequence resolution.

### Contract inspection gate

Source inspection on the `3c560e5` branch found no durable sequence mutation command. Existing immutable `program_revisions` and their revision/operation receipts cover installation and prescription edits, not reorder, skip, rest replacement, pending work, or pause/resume. `features/programs/revisionStore.ts` is an owner-scoped local pending-operation store, not cross-device authority. Reusing it, program metadata, or the empty dated AP-04 tables would fail the required revision, replay, and owner-isolation contract.

**User approval, 2026-09-27:** additive sequence authority, including migration deployment, is approved. The migration executor owns an exact reviewed packet and fresh recovery/isolated rehearsal/role checks before applying it; this is not approval for unrelated schema changes or for touching AP-04 schedule objects. The user will run the migration prompt; no migration has been created or applied by this documentation update. The client implementation starts only after the new migration and its authority checks are complete.

Selector rule: when paused, suggest no workout; otherwise take the first pending workout day in persisted order, excluding explicit skipped/rest entries and a selected day with an actual finalized linked program session, whether complete or partial. An alternate selection targets only that day and does not change the suggestion or persisted order. Unstarted days stay pending until trained, explicitly skipped, or replaced; no auto-dismissal, catch-up debt, or mandatory "resolve" step. A partial submitted session resolves only its selected day; unlogged exercises remain unchanged for future work. Legacy sessions without reliable day linkage remain actual history but do not infer fulfillment by date or name. Never fall back to another workout for a missing/invalid target. Corrections recompute completion context without applying a second sequence transition; exact server-side linkage and retry behavior must be verified in the migration packet.

The current checkout is based on `origin/main` merge `5c7c4fb` (PR #59), which already contains dated client code despite earlier documentation describing that source as unmerged. `app/(tabs)/plan.tsx` still submits schedule creation/revision, Home still reads accepted placements and reconciles dated reminders, and workout entry/Finish/correction still accept optional schedule linkage. Undated Finish/correction remain supported by their existing optional payload branches. Until reviewed replacement and a safe containment path are available, do not distribute this dated client or claim the two-alert policy is implemented.

## Execution and evidence

1. Disable dated client writers and date-authoritative Home, Plan, Finish, and reminder behavior while retaining historical actual timestamps.
2. Implement and test durable sequence resolution, alternate-day selection, history-only ad-hoc capture, explicit state changes, pause/resume, finish follow-up, and the 14-day review prompt.
3. Remove every disallowed notification, then implement owner-scoped inactivity and persisted rest-timer behavior.
4. Rebuild adherence as transparent completion context and obtain user-led device evidence for the two allowed alerts.

The local gate is relevant workout/program/history/notification/timer tests plus `npx tsc --noEmit --strict` and `npm run lint`. Integration additionally requires the full application matrix, focused local notification/restart tests, and user-led device acceptance; no native alert behavior is accepted before that evidence exists.
