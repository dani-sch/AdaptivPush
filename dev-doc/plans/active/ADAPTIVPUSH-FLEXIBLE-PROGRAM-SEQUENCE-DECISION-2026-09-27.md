# Flexible program-sequence decision - 2026-09-27

## Authority and scope

This decision supersedes the active AP-04 client requirement for calendar-authoritative workout placement. It refines D-02 only where D-02 requires dated scheduling, accepted schedule revisions, weekly schedule adherence, or schedule-derived notifications. All completed workout timestamps and immutable prescription evidence remain authoritative history.

No migration, schema change, deployed-table deletion, schedule-data cleanup, or hosted deployment is authorized by this decision. The deployed empty AP-04 tables and RPCs remain dormant, reversible compatibility infrastructure; clients must stop creating dated placements and must not treat date-authoritative reads as program authority.

## Approved behavior

- A program is an ordered relative sequence of prescription days and explicit rest content. The suggested next entry is an unresolved program day, but its exact ranking is `REQUIRES INSPECTION`.
- Today and workout entry offer the suggestion plus explicit **Select other workout day** and **Ad-hoc workout** actions. Selecting another program day never silently advances or substitutes the suggested day.
- Ad-hoc workouts are history-only. They do not fulfill, advance, reorder, skip, or otherwise change program work.
- Program work can be explicitly reordered, skipped, replaced with rest, or left unresolved. These states create no catch-up debt. Rest remains program content, never an empty workout or calendar obligation.
- Finishing a workout offers Continue, Adjust upcoming program, and Resolve skipped/unresolved work. No finish path automatically changes the program.
- A program-level pause persists until manually resumed. After at least 14 days since the last finalized program workout, offer Resume unchanged, Review/adjust program, and Start new program. No load or volume reduction is automatic.
- Completion context reports completed, partial, skipped, and unresolved program work. It does not report a weekly schedule score or streak target.
- Disable scheduled-workout, PR, deload, and test notifications. The only permitted local alerts are one five-minute active-workout inactivity nudge and an optional rest-timer completion alert.
- The rest timer starts after a logged set, is user-configured and skippable/extendable, survives restart while its active draft exists, and may send one local completion alert with permission.
- Availability and travel remain optional generation preferences, not authority over an active program. Time zones and DST apply to actual timestamps, history display, and local timer/alert behavior only.
- Publishing contains relative program structure and rest pattern only. Recipients select their own training preferences; publication and installation contain no placement dates.

## Required sequence contract

The stage-3 implementation must establish durable owner-scoped, revision-safe authority for reorder, skip, rest replacement, unresolved state, and pause/resume before replacing client behavior. It must not repurpose `program_schedules`, `scheduled_days`, or `schedule_deviations` as hidden sequence state without a separately reviewed compatibility design.

`REQUIRES INSPECTION`: the exact suggested-next ranking for skipped, unresolved, rest, paused, and manually reordered days; whether existing program revision authority can persist sequence state or an additive durable command/table is necessary; the first-use rest-timer preference shape; and the notification settings, active-draft recovery, and device-permission surfaces to change.

### Contract inspection gate

Source inspection on the `3c560e5` branch found no durable sequence mutation command. Existing immutable `program_revisions` and their revision/operation receipts cover installation and prescription edits, not reorder, skip, rest replacement, unresolved resolution, or pause/resume. `features/programs/revisionStore.ts` is an owner-scoped local pending-operation store, not cross-device authority. Reusing it, program metadata, or the empty dated AP-04 tables would fail the required revision, replay, and owner-isolation contract. **Sequence implementation is blocked** until a separately reviewed additive durable sequence command and owner-scoped state/receipt contract (or an equivalently reviewed immutable revision extension) is authorized. This decision does not authorize a migration, deployment, or schedule-table write.

Proposed selector rule for that review: when paused, suggest no workout; otherwise take the first unresolved workout day in explicitly persisted order, excluding explicit skipped and rest entries and days fulfilled by an actual finalized program session. An alternate selection targets only that selected day and does not change the suggestion or persisted order. Rest remains visible content, not an implicit skip; never fall back to a different workout for a missing/invalid target. `REQUIRES INSPECTION`: whether a finalized partial session resolves its selected day, and how older sessions lacking stable day linkage are reconciled. No selector should ship before these cases and replay/correction behavior are specified.

The current checkout is based on `origin/main` merge `5c7c4fb` (PR #59), which already contains dated client code despite earlier documentation describing that source as unmerged. `app/(tabs)/plan.tsx` still submits schedule creation/revision, Home still reads accepted placements and reconciles dated reminders, and workout entry/Finish/correction still accept optional schedule linkage. Undated Finish/correction remain supported by their existing optional payload branches. Until reviewed replacement and a safe containment path are available, do not distribute this dated client or claim the two-alert policy is implemented.

## Execution and evidence

1. Disable dated client writers and date-authoritative Home, Plan, Finish, and reminder behavior while retaining historical actual timestamps.
2. Implement and test durable sequence resolution, alternate-day selection, history-only ad-hoc capture, explicit state changes, pause/resume, finish follow-up, and the 14-day review prompt.
3. Remove every disallowed notification, then implement owner-scoped inactivity and persisted rest-timer behavior.
4. Rebuild adherence as transparent completion context and obtain user-led device evidence for the two allowed alerts.

The local gate is relevant workout/program/history/notification/timer tests plus `npx tsc --noEmit --strict` and `npm run lint`. Integration additionally requires the full application matrix, focused local notification/restart tests, and user-led device acceptance; no native alert behavior is accepted before that evidence exists.
