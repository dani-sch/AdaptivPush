# AdaptivPush - Final Project Report Outline

**Senior Project II | CSCI-456 | New York Institute of Technology**
**Team Leader:** Daniella Schlichting | **Members:** Nicole McCormack, Miskath Rahman

---

## How to use this outline

This outline is meant to match the project **as it actually exists now**, not just the original proposal.

Use these files as the primary source of truth while writing:

| Source                                    | Use it for                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `reports/ARCHITECTURE.md`                 | system architecture, runtime flow, module boundaries, database/data flow diagrams |
| `TABLE-OF-CONTENTS.md`                    | repository organization, screen/file inventory, appendix references               |
| `reports/WEEKLY-REPORT-*.md`              | sprint-by-sprint delivery history and screenshots if needed                       |
| `git --no-pager log --oneline --decorate` | exact implementation timeline and major milestone merges                          |
| `git --no-pager shortlog -sn --all`       | contributor activity summary                                                      |
| Original proposal PDF                     | proposed idea, specific aims, tools, and 12-week schedule                         |

Project history facts already confirmed from git:

- **129 commits**
- **36 merged pull requests**
- First commit: **2026-01-14**
- Latest merge on main: **2026-04-28**

Write the report in past tense. Be honest about what shipped, what changed, and what was deferred.

---

## Title Page

```text
AdaptivPush
Adaptive Workout Program Logger and Generator

Team Leader: Daniella Schlichting
Members: Nicole McCormack, Miskath Rahman

Student IDs: [fill in]
Professor: [fill in]

Senior Project II
Final Report

[Submission Date]
```

---

## Table of Contents

Generate this last after page numbers are final.

Suggested structure:

```text
Abstract
1. Introduction
  1.1 Original Proposal Summary
  1.2 Delivered Project Summary
  1.3 Technology Stack and Architecture
  1.4 Development Process and Git History
  1.5 Schedule Adherence: Proposed vs Actual
  1.6 App Walkthrough Overview
2. Team Members and Roles
3. Project Objectives and Proposal Alignment
4. Background and Significance
5. Architecture and Repository Organization
  5.1 System Architecture
  5.2 Route and Module Architecture
  5.3 Repository Structure and Table of Contents
6. Database Design and Data Flow
  6.1 Schema Overview
  6.2 Data Flow
  6.3 Entity-Relationship Diagram
7. Functionality and Implementation
  7.1 Authentication and Session Management
  7.2 Onboarding and User Profile Collection
  7.3 Program Generation
  7.4 Active Program Orchestration
  7.5 Workout Execution and Logging
  7.6 Progression Engine
  7.7 Readiness Check-in System
  7.8 Exercise Swapping
  7.9 History, Personal Records, and Archiving
  7.10 Cycle-Aware Adjustments
  7.11 Notifications, Theming, and Profile Personalization
8. Security and Data Privacy
9. Libraries, Tools, and Platform Choices
10. User Interface Design
11. Results, Scope Changes, and Limitations
  11.1 What Matched the Proposal
  11.2 What Changed During Development
  11.3 Limitations
  11.4 Future Work
  11.5 Learning Outcomes
12. Conclusion
13. References
Appendices
```

---

## Abstract

**Target length: 250-350 words**

Summarize the whole project on one page.

Include:

1. **What AdaptivPush is:** an Expo/React Native mobile application that generates and adapts strength-training programs.
2. **The problem:** most workout apps either log workouts or provide static plans, but do not adjust intelligently to user performance and daily readiness.
3. **How the delivered system works:** onboarding -> profile creation -> multi-week program generation -> readiness check-in -> next workout logging -> progression updates -> history and PR tracking.
4. **Why the project matters:** it combines workout logging, adaptive progression, and cycle-aware considerations in one student-built mobile product.
5. **The actual stack:** Expo, React Native, TypeScript, Expo Router, Supabase Auth/Postgres/Storage, AsyncStorage, Expo Notifications.
6. **Final outcome:** describe the shipped MVP and mention the main scope adjustment clearly: manual cycle tracking shipped, but direct HealthKit integration did not.

Good closing idea:

> AdaptivPush demonstrated that a client-heavy mobile application can deliver personalized training logic, persistent workout history, and adaptive recommendations using a modern BaaS architecture without requiring a separately hosted custom API server.

---

## 1. Introduction

### 1.1 Original Proposal Summary

**Target length: 0.75-1 page**

Open by summarizing what the proposal promised:

- a mobile strength-training assistant for lifters
- personalized workout generation
- progressive overload based on user feedback
- readiness-aware adjustments
- menstrual-cycle-aware training logic
- React Native + TypeScript + Expo + Supabase + PostgreSQL

Then explain the high-level outcome:

- the final product **met the core proposal idea**
- most major training features were implemented
- the largest planned item that did not fully ship was **direct Apple Health / HealthKit integration**
- the final system evolved into a broader adaptive workout platform rather than only a simple logger

### 1.2 Delivered Project Summary

**Target length: 0.75-1 page**

Describe what the team actually built by the end of development:

- authentication and user routing
- onboarding / quick setup
- persistent user profile
- multi-week program generation
- plan overview and active program management
- next-workout execution flow
- workout logging and session persistence
- progression engine
- readiness check-in flow
- exercise swapping
- workout history and personal records
- manual cycle tracking and cycle-aware adjustments
- notifications
- profile photo upload
- light/dark mode, palette themes, haptics, and profile settings
- archiving completed programs

This section should read as the "executive summary" of the shipped MVP.

### 1.3 Technology Stack and Architecture

**Target length: 0.75-1 page**

Base this section on `reports/ARCHITECTURE.md`.

Key points to include:

- **Client:** Expo 54, React Native 0.81, React 19, TypeScript
- **Navigation:** Expo Router with `(auth)`, `(qsetup)`, `(tabs)`, and detail screens
- **Backend:** Supabase Auth, Postgres, Storage
- **Local persistence:** AsyncStorage for session/theme preferences
- **Architecture style:** client-heavy mobile app with Supabase as backend service
- **Core orchestrator:** `hooks/useCurrentProgram.ts`
- **Important architectural nuance:** readiness is applied as a **display-time workout overlay**, while long-term progression is driven by logged workout performance

Also mention that the team created a dedicated architecture document and repository TOC late in the project to support final documentation and maintenance.

### 1.4 Development Process and Git History

**Target length: 0.5-0.75 page**

Use real git history here instead of estimates.

Include:

- Agile / sprint-style development across the semester
- feature-branch workflow with pull requests into `main`
- **129 commits** and **36 merged pull requests**
- work occurred from **January 14, 2026 through April 28, 2026**
- GitHub served as the team's shared planning/review/integration system

Good framing:

> The repository history showed iterative feature delivery rather than a single large implementation phase. Major features landed in focused pull requests, including readiness, program archiving, notifications, generation improvements, theme personalization, and profile media upload.

### 1.5 Schedule Adherence: Proposed vs Actual

**Target length: 1 page with table**

This should directly compare the proposal schedule against what happened.

Recommended table:

| Proposal milestone                         | Planned timing                  | Actual outcome                                                                                            | Status   |
| ------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| Planning, research, proposal               | Fall semester                   | Completed as proposed                                                                                     | Met      |
| Auth and onboarding foundation             | Early spring                    | Completed early in implementation                                                                         | Met      |
| Program generation and plan flow           | Mid spring                      | Completed, with continued refinement in later sprints                                                     | Met      |
| Workout logging and progression            | Mid spring                      | Completed and expanded with PR/history logic                                                              | Met      |
| Readiness survey                           | Stretch / later feature         | Shipped and became part of the core workout flow                                                          | Exceeded |
| Cycle-aware adjustments                    | Planned with health integration | Manual cycle tracking shipped; automatic HealthKit sync deferred                                          | Partial  |
| Analytics and advanced health integrations | Late stretch goals              | Not fully completed                                                                                       | Deferred |
| Final polish                               | End of semester                 | Completed with themes, haptics, profile photo upload, notifications, FAQ, recovery library, and archiving | Met      |

Use this section to show that the project broadly followed the proposed roadmap, but some integrations shifted in implementation detail.

### 1.6 App Walkthrough Overview

**Target length: 0.5 page plus screenshots**

Short narrative:

1. user creates an account or logs in
2. user completes quick setup
3. user creates or resumes a training program
4. home screen prompts readiness check-in
5. next-workout screen displays adjusted targets
6. user logs sets and finishes workout
7. session updates history, PR tracking, and future progression

Use screenshots from the final build.

---

## 2. Team Members and Roles

**Target length: 0.75-1 page**

Describe each member's role using both the proposal and the actual delivered features.

### Daniella Schlichting - Team Leader

Emphasize:

- overall system architecture
- Supabase schema and backend integration
- program generation and progression logic
- readiness system
- next-workout flow
- personal records, recovery library, FAQ, cycle-aware logic
- theming, profile personalization, and final polish
- repo management, PR review, and documentation leadership

### Nicole McCormack

Emphasize:

- Expo app setup and setup documentation
- authentication screens and flows
- navigation/back-button and shared UI improvements
- plan screen work
- create-program flow contributions
- weekly completion / archiving work
- bug fixing and interface polish

### Miskath Rahman

Emphasize:

- profile and workout-history areas
- login backend/profile integration contributions
- readiness settings in profile
- profile subpages and live Supabase wiring
- improvements to persistent profile/account experience

Do not over-claim exact percentages unless you have written evidence to support them. Keep this section aligned with actual merged work.

---

## 3. Project Objectives and Proposal Alignment

**Target length: 1-1.5 pages**

This section should explicitly answer: **Did the final project achieve the proposal's idea?**

Recommended structure: a proposal-to-delivery table.

| Proposal objective               | Delivered outcome                                                       |
| -------------------------------- | ----------------------------------------------------------------------- |
| Secure account system            | Delivered through Supabase Auth and protected user-specific data access |
| Personalized onboarding          | Delivered through quick setup and persistent `user_profile` data        |
| Generated multi-week programs    | Delivered through generator logic and saved program structures          |
| Workout logging                  | Delivered through Next Workout and session/set logging tables           |
| Adaptive progression             | Delivered through progression updates based on logged performance       |
| Exercise swapping                | Delivered in the workout experience                                     |
| Readiness-aware training         | Delivered and integrated into the workout flow                          |
| Cycle-aware training             | Delivered in manual/profile-driven form                                 |
| Analytics / advanced health sync | Only partially delivered or deferred                                    |

End this section with a direct statement such as:

> The final project fulfilled the core promise of the proposal by delivering an adaptive workout app that generated, logged, and adjusted training plans over time. The main deviation was that health-platform integration was reduced from a planned automated pathway to a manual cycle-tracking workflow.

---

## 4. Background and Significance

**Target length: 2-3 pages**

Reuse the proposal's research background, but rewrite it so it supports the completed implementation.

Suggested subsections:

### 4.1 Limits of Static Workout Plans

- why fixed plans fail over time
- why progressive overload matters
- why generic logging apps do not solve adaptive programming

### 4.2 Auto-Regulation and RPE

- explain RPE/RIR concepts
- explain why logging actual effort is necessary for adaptive load changes
- connect this directly to the progression engine

### 4.3 Recovery, Readiness, and Daily Performance

- summarize why sleep, soreness, stress, and motivation matter
- connect this to the readiness check-in flow
- explain that AdaptivPush used a simplified, practical model suitable for a student MVP

### 4.4 Female Training Considerations and Cycle Awareness

- explain the rationale from the proposal
- state clearly that the app shipped **manual cycle tracking and phase-aware logic**
- explain that direct HealthKit automation remained future work

### 4.5 Why Mobile Was the Right Platform

- workouts happen in real time in the gym
- logging needs to be immediate
- notifications and profile preferences fit naturally in a mobile app

---

## 5. Architecture and Repository Organization

**Target length: 2-3 pages plus Mermaid diagrams**

This section should now rely heavily on `reports/ARCHITECTURE.md`.

### 5.1 System Architecture

Include or adapt the Mermaid system-context diagram.

Explain:

- user -> mobile app -> Supabase services
- no separate custom backend server
- client owns routing, program generation, progression logic, and workout-state orchestration
- Supabase owns authentication, relational persistence, and storage assets

### 5.2 Route and Module Architecture

Use the route/module diagrams from `reports/ARCHITECTURE.md`.

Key points:

- `app/(auth)` for auth flows
- `app/(qsetup)` for onboarding
- `app/(tabs)` for main app navigation
- detail screens such as `next-workout.tsx`, `create-program.tsx`, `program-overview.tsx`, `archived-programs.tsx`, `faq.tsx`, and `recovery-library.tsx`
- `hooks/useCurrentProgram.ts` as the main runtime coordinator

### 5.3 Repository Structure and Table of Contents

Use `TABLE-OF-CONTENTS.md` to describe the repo in a controlled way.

Mention:

- `app/` for screens
- `components/` for reusable UI and modals
- `contexts/` for theming
- `hooks/` for orchestration
- `lib/` for local exercise catalog
- `utils/` for Supabase and business helpers
- `scripts/` for seeding exercises/images
- `reports/` for project documentation

This is also where you mention that the project now includes:

- a full architecture document
- a repository table of contents
- weekly reports that can support appendix material

---

## 6. Database Design and Data Flow

**Target length: 2-3 pages plus schema/ERD**

Use the updated architecture document and the actual schema screenshot as the source of truth.

### 6.1 Schema Overview

Use a table like this, but update column names to the current schema when drafting the final report:

| Table                   | Purpose                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `user_profile`          | extended user demographics, preferences, goals, cycle settings, avatar URL, and profile metadata |
| `programs`              | active or archived training blocks for a user                                                    |
| `program_days`          | per-week, per-day schedule definitions including rest and deload flags                           |
| `program_day_exercises` | planned exercises, prescriptions, and per-set target data for a day                              |
| `exercises`             | master exercise catalog used by generation and swapping                                          |
| `workout_sessions`      | completed workout summary rows                                                                   |
| `workout_exercise_sets` | detailed logged sets for each session                                                            |
| `readiness_logs`        | daily readiness inputs and derived score context                                                 |
| `personal_records`      | highest achieved lifts by exercise                                                               |

Important accuracy notes to preserve:

- `program_day_exercises.per_set_weights_lb` is stored as **jsonb**
- `personal_records` is a real table in the current design
- readiness stores multiple contributing inputs, not only one score
- cycle data exists in `user_profile` and readiness/profile-related flows

### 6.2 Data Flow

Use the report to explain these flows:

1. sign-up and onboarding -> `user_profile`
2. program generation -> `programs`, `program_days`, `program_day_exercises`
3. readiness check-in -> `readiness_logs`
4. workout execution -> `workout_sessions`, `workout_exercise_sets`
5. PR detection -> `personal_records`
6. future workout adaptation -> progression logic updates stored program targets

Be precise here:

- readiness changes what the user sees on the workout screen
- progression uses **logged performance** as the basis for persistent changes

### 6.3 Entity-Relationship Diagram

Reuse or adapt the Mermaid ERD from `reports/ARCHITECTURE.md`.

---

## 7. Functionality and Implementation

**Target length: 4-6 pages**

This is the technical core of the report.

### 7.1 Authentication and Session Management

Cover:

- Supabase email/password auth
- user redirects between auth and app stacks
- forgot-password flow
- persistent logged-in session handling

### 7.2 Onboarding and User Profile Collection

Cover:

- quick setup flow
- goal, experience, days/week, equipment, weight, and related inputs
- how user preferences support later program generation

### 7.3 Program Generation

Explain:

- multi-week block creation
- training split selection based on days per week
- exercise selection from the available catalog
- initial prescription rules based on goal and experience
- deload structure and week/day generation

Avoid unsupported exact counts unless verified in code or seeded data.

### 7.4 Active Program Orchestration

This should be based on `hooks/useCurrentProgram.ts`.

Explain:

- how the active program is loaded
- how current week/day state is derived
- how screens refresh and mutate program data
- why this hook is the center of runtime coordination

### 7.5 Workout Execution and Logging

Cover the `next-workout.tsx` flow:

- target display
- set entry
- finishing a workout
- saving sessions and sets
- auto-advancing the next workout

### 7.6 Progression Engine

Describe:

- performance-based adjustments
- how reps and RPE influence next targets
- experience-based progression differences
- why this supports progressive overload in a controlled way

### 7.7 Readiness Check-in System

Make this section accurate to the current architecture.

State that:

- readiness is logged and scored
- the workout screen applies readiness as a **display-time adjustment**
- the system does **not** rewrite the planned program baseline purely because the user felt tired on one day
- this preserves the distinction between short-term readiness and long-term progression

### 7.8 Exercise Swapping

Cover:

- muscle-group/equipment-aware alternatives
- swap flow from the workout or plan experience
- how swaps preserve continuity while improving flexibility

### 7.9 History, Personal Records, and Archiving

Combine these related features:

- workout history list
- session detail view
- exercise-specific history access
- PR detection and storage
- archiving and restoring/resuming programs

### 7.10 Cycle-Aware Adjustments

Be clear and honest:

- the app shipped profile-driven cycle tracking
- cycle phase is derived from user-entered dates/settings
- cycle phase influences generation and workout recommendations
- the final build did **not** complete automatic Apple Health / HealthKit sync

### 7.11 Notifications, Theming, and Profile Personalization

Use this section for end-of-project polish features that are still meaningful deliverables:

- quiet-hours notification settings
- daily workout reminders / PR celebration / deload week alerts
- light/dark mode
- palette themes
- haptic feedback toggle
- profile photo upload with Supabase Storage

This helps show that the product moved beyond a bare prototype.

---

## 8. Security and Data Privacy

**Target length: 0.5-1 page**

Focus on what is actually true in the shipped system:

- Supabase Auth manages credentials and sessions
- user data is isolated through user-scoped access patterns and RLS-backed database design
- only the public anon key is used client-side
- secrets are kept in environment variables and excluded from source control
- all requests to Supabase use HTTPS
- client-side input validation is applied to workout-entry fields and profile forms

If you mention RLS, make sure the final wording matches the actual database/security setup used in Supabase.

---

## 9. Libraries, Tools, and Platform Choices

**Target length: 0.5-1 page**

Use a table driven by `package.json`.

Core tools to include:

| Tool                            | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| Expo                            | app runtime, dev tooling, native module integration |
| React Native                    | mobile UI framework                                 |
| Expo Router                     | file-based app navigation                           |
| TypeScript                      | type safety                                         |
| `@supabase/supabase-js`         | auth/database/storage client                        |
| AsyncStorage                    | local persistence for app settings/session helpers  |
| Expo Notifications              | local notification scheduling                       |
| Expo Haptics                    | feedback during key interactions                    |
| Expo Image Picker / Manipulator | profile image selection and upload prep             |
| React Native Reanimated         | animation support                                   |
| GitHub                          | version control and pull request workflow           |
| Supabase Studio                 | schema/data administration                          |
| VS Code                         | primary development environment                     |

Note one proposal-vs-final difference here if useful:

- the final UI system centered on a custom theme/token setup rather than a heavier component-library-first approach

---

## 10. User Interface Design

**Target length: 2-3 pages plus screenshots**

This section should be screenshot-heavy.

Recommended subsections:

### 10.1 Authentication Screens

- login
- join/sign-up
- forgot password

### 10.2 Quick Setup

- onboarding steps
- program setup modal / create-program flow

### 10.3 Home Screen

- greeting/current-program summary
- readiness prompt
- shortcut flows into workout and plan views

### 10.4 Next Workout Screen

- exercise cards
- logged sets
- target weight/reps/RPE
- finish-workout flow

### 10.5 Program and Plan Views

- plan tab
- program overview
- archived programs

### 10.6 History and Personal Records

- workout history list
- detail modal/page
- PR-related feedback if available in UI

### 10.7 Profile and Settings

- profile summary
- readiness/cycle/preferences settings
- theme, palette, haptic, and notification controls
- profile photo upload

For each screenshot, explain:

1. what the user is seeing
2. what the screen contributes to the workflow
3. any important design decision behind it

---

## 11. Results, Scope Changes, and Limitations

### 11.1 What Matched the Proposal

**Target length: 0.5-0.75 page**

Highlight the strongest proposal matches:

- adaptive workout concept delivered
- personalized onboarding delivered
- generated multi-week programming delivered
- workout logging delivered
- progression delivered
- readiness delivered
- cycle-aware logic delivered in manual form

### 11.2 What Changed During Development

**Target length: 0.75-1 page**

This is the most important honesty section in the report.

Recommended points:

- **HealthKit changed from planned integration to deferred enhancement.** The team investigated the native pathway, but the final build used manual cycle tracking instead.
- **Readiness became more central than originally planned.** What began as a later feature matured into a core part of the workout experience.
- **The project added polish/features beyond the core proposal.** Examples: profile photo upload, haptics, theme palettes, notifications, FAQ, recovery library, archiving, PR tracking.
- **Documentation maturity improved late in the project.** The team added a formal architecture document and repository table of contents to support final reporting and maintainability.

### 11.3 Limitations

**Target length: 0.75-1 page**

Use real limitations, not stale bugs that no longer describe the current code.

Good candidates:

- no direct HealthKit automation in the final build
- limited automated testing compared with the amount of business logic in generation/progression
- iOS-first assumptions and limited broad-device validation
- client-heavy architecture means complex logic lives in the app and requires careful state handling
- advanced analytics and data visualization remain limited

### 11.4 Future Work

**Target length: 0.5 page**

Possible future work:

- full HealthKit / Apple Health integration
- richer analytics dashboards and progress graphs
- Apple Watch or wearable support
- coach/trainer portal
- social features
- stronger automated testing for generator/progression logic
- Android hardening and broader deployment validation

### 11.5 Learning Outcomes

**Target length: 0.75 page**

Discuss:

- building a production-style mobile app with real persistence and auth
- translating research ideas into practical UX
- using GitHub PR workflow as a team
- balancing ambition with semester constraints
- learning when to reduce scope without losing the core value of the project

---

## 12. Conclusion

**Target length: 0.5-0.75 page**

End with a direct answer to the senior-project question:

- what the team set out to build
- what was successfully delivered
- what the project proved technically and academically
- how the final app reflects the proposal's main idea even with a few scope changes

Strong final angle:

> AdaptivPush fulfilled the central idea proposed at the start of the project: a mobile system that does more than store workout data by actively shaping future training around the user's profile, performance, and day-to-day condition.

---

## 13. References

**Use the same citation style as the proposal**

Include:

- all academic sources from the proposal background
- documentation sources for Supabase, Expo, React Native, and other major technologies if cited in the text
- any new sources used to justify cycle-aware training, RPE, readiness, or mobile-health design decisions

Make sure every claim in Sections 4 and 11 that depends on outside evidence is cited.

---

## Appendices

Recommended appendix options:

- **Appendix A:** full schema export or schema screenshots
- **Appendix B:** Mermaid architecture diagrams from `reports/ARCHITECTURE.md`
- **Appendix C:** repository structure snapshot from `TABLE-OF-CONTENTS.md`
- **Appendix D:** selected weekly sprint reports
- **Appendix E:** code excerpts for generator/progression logic
- **Appendix F:** extra UI screenshots

---

## Writing guidance for the team

1. **Write from evidence.** If a claim appears in the report, it should be traceable to code, git history, the architecture doc, the TOC, weekly reports, or the proposal.
2. **Do not overstate unfinished integrations.** Say "manual cycle tracking shipped" and "HealthKit was deferred" if that is what happened.
3. **Use the architecture doc directly.** Do not redraw the system from memory.
4. **Use the TOC to keep file references accurate.** This avoids stale screen or folder names.
5. **Prefer proposal-vs-actual comparisons.** The final report will be stronger if it explains evolution, not just features.
6. **Use screenshots generously.** This project has a strong UI component, and visual evidence will help.
7. **Use real git numbers.** The repo currently supports 129 commits and 36 merged pull requests as the documented development history.
8. **Keep the tone professional and reflective.** This is both a technical report and a record of how the project changed over time.

---

_Updated: 2026-04-30 | Aligned to current architecture doc, root TOC, repository history, and original proposal scope_
