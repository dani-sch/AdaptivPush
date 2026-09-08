# adaptivpush architecture

> last updated: 2026-04-30
>
> scope: current Expo mobile client, supporting scripts, and backend integrations inferred from the repository

## overview

AdaptivPush is an Expo Router mobile app for generating, running, and adapting strength-training programs. The client owns most orchestration logic: routing, UI state, program generation, readiness overlays, workout logging, and profile/preferences screens. Supabase provides authentication, relational data storage, user metadata, and storage-backed asset delivery.

Two architectural ideas shape most of the codebase:

1. `hooks/useCurrentProgram.ts` is the main orchestration layer for active-program state.
2. Readiness is a display-time overlay for workouts, while progression uses logged performance as the persistence baseline.

## technology stack

| layer              | implementation                                                             |
| ------------------ | -------------------------------------------------------------------------- |
| client runtime     | Expo 54, React Native 0.81, React 19                                       |
| navigation         | Expo Router 6 with root stack plus tab groups                              |
| language           | TypeScript 5.9                                                             |
| backend services   | Supabase Auth, Postgres, Storage                                           |
| client persistence | AsyncStorage for session and theme settings                                |
| notifications      | Expo Notifications                                                         |
| styling/theming    | custom theme context plus constants palettes/themes                        |
| exercise content   | local catalog in `lib/exerciseDatabase.ts` plus Supabase `exercises` table |
| tooling            | ESLint via `expo lint`, TypeScript, tsx-based seed scripts                 |

## repository shape

```text
AdaptivPush/
|-- app/                 Expo Router screens and layouts
|   |-- (auth)/          login, join, forgot-password
|   |-- (qsetup)/        quick setup onboarding
|   |-- (tabs)/          home, plan, history, profile
|   |-- next-workout.tsx workout execution screen
|   |-- create-program.tsx manual program builder
|   |-- archived-programs.tsx and supporting detail screens
|-- components/          reusable workout, history, modal, and UI components
|-- constants/           themes, palettes, colors
|-- contexts/            ThemeContext provider
|-- hooks/               active-program orchestration
|-- lib/                 local exercise catalog
|-- scripts/             exercise and image seeding utilities
|-- types/               shared TypeScript contracts
|-- utils/               Supabase client and business logic helpers
|-- reports/             project docs, including this file
```

## system context

```mermaid
flowchart TD
    U["user"] --> APP["AdaptivPush mobile app"]

    subgraph client["expo / react native client"]
        ROUTER["expo router\napp/"]
        SCREENS["screen groups\n(auth) (qsetup) (tabs) detail screens"]
        COMPONENTS["components/\nmodals, cards, forms, profile UI"]
        THEME["ThemeContext\nconstants/themes + palettes"]
        PROGRAMHOOK["useCurrentProgram\nactive program state + mutations"]
        GENERATOR["programGenerator\nmulti-week plan generation"]
        PROGRESSION["progressionEngine\nload + RPE suggestions"]
        HISTORY["fetchExerciseHistory\nsession aggregation"]
        PREFS["profilePreferences\nmetadata parsing + merging"]
        NOTIFY["notifications\npermission + scheduling"]
        SUPABASECLIENT["supabase client"]
        LOCALDB["local exercise catalog\nlib/exerciseDatabase.ts"]
    end

    APP --> ROUTER
    ROUTER --> SCREENS
    SCREENS --> COMPONENTS
    SCREENS --> THEME
    SCREENS --> PROGRAMHOOK
    SCREENS --> GENERATOR
    SCREENS --> PROGRESSION
    SCREENS --> HISTORY
    SCREENS --> PREFS
    SCREENS --> NOTIFY
    PROGRAMHOOK --> SUPABASECLIENT
    GENERATOR --> LOCALDB
    GENERATOR --> SUPABASECLIENT
    HISTORY --> SUPABASECLIENT
    PREFS --> SUPABASECLIENT
    NOTIFY --> SUPABASECLIENT

    SUPABASECLIENT --> AUTH["supabase auth"]
    SUPABASECLIENT --> DB["supabase postgres"]
    SUPABASECLIENT --> STORAGE["supabase storage\nexercise images / avatars"]
    NOTIFY --> EXPOPN["expo notifications"]

    SCRIPTS["scripts/seedExercises.ts\nscripts/seedImages.ts"] --> DB
    SCRIPTS --> STORAGE
    SCRIPTS --> RAPID["ExerciseDB / RapidAPI"]
```

## route architecture

```mermaid
flowchart TD
    ROOT["app/_layout.tsx\nroot stack + session redirect + Theme provider"] --> LANDING["app/index.tsx\nwelcome / dev shortcuts"]
    ROOT --> AUTH["app/(auth)\nauth stack"]
    ROOT --> QSETUP["app/(qsetup)\nquick setup stack"]
    ROOT --> TABS["app/(tabs)\nmain app tabs"]
    ROOT --> DETAIL["detail screens"]

    AUTH --> LOGIN["login.tsx"]
    AUTH --> JOIN["join.tsx"]
    AUTH --> FORGOT["forgot-password.tsx"]

    QSETUP --> QUICK["quick-setup.tsx"]

    TABS --> HOME["home.tsx"]
    TABS --> PLAN["plan.tsx"]
    TABS --> HISTORY["history.tsx"]
    TABS --> PROFILE["profile/"]

    PROFILE --> PROFILEINDEX["profile/index.tsx"]
    PROFILE --> PROFILEPERSONAL["personal-information.tsx"]
    PROFILE --> PROFILENOTIFY["notifications.tsx"]
    PROFILE --> PROFILEPRIVACY["privacy-data.tsx"]
    PROFILE --> PROFILEHELP["help-support.tsx"]

    DETAIL --> NEXT["next-workout.tsx"]
    DETAIL --> CREATE["create-program.tsx"]
    DETAIL --> OVERVIEW["program-overview.tsx"]
    DETAIL --> ARCHIVED["archived-programs.tsx"]
    DETAIL --> FAQ["faq.tsx"]
    DETAIL --> RECOVERY["recovery-library.tsx"]
    DETAIL --> HISTORYDETAIL["workout-history.tsx"]
```

## runtime module architecture

```mermaid
flowchart LR
    subgraph ui["ui layer"]
        HOME["home"]
        PLAN["plan"]
        NEXT["next-workout"]
        PROFILE["profile screens"]
        MODALS["GenerateProgramModal\nSwapExerciseModal\nExerciseHistoryModal\nWorkoutTemplateModal"]
    end

    subgraph state["state and orchestration"]
        THEME["ThemeContext"]
        CURRENT["useCurrentProgram"]
    end

    subgraph domain["domain helpers"]
        GEN["programGenerator"]
        SAVE["saveProgramToDb"]
        PROG["progressionEngine"]
        CYCLE["cyclePhase"]
        PREF["profilePreferences"]
        HIST["fetchExerciseHistory"]
        NOTIF["notifications"]
        CONV["conversions / haptic / uploadAvatar"]
    end

    subgraph data["data and assets"]
        SB["utils/supabase"]
        LOCAL["exerciseDatabase"]
        PG["supabase postgres"]
        ST["supabase storage"]
        AUTH["supabase auth"]
    end

    HOME --> CURRENT
    HOME --> PROG
    HOME --> SB

    PLAN --> CURRENT
    PLAN --> MODALS
    MODALS --> GEN
    MODALS --> SAVE
    GEN --> LOCAL
    SAVE --> SB

    NEXT --> CURRENT
    NEXT --> PROG
    NEXT --> CYCLE
    NEXT --> HIST
    NEXT --> NOTIF
    NEXT --> SB

    PROFILE --> THEME
    PROFILE --> PREF
    PROFILE --> NOTIF
    PROFILE --> CONV
    PROFILE --> SB

    CURRENT --> PROG
    CURRENT --> CYCLE
    CURRENT --> NOTIF
    CURRENT --> SB

    SB --> AUTH
    SB --> PG
    SB --> ST
```

## active program lifecycle

`useCurrentProgram` is the central coordinator for loading and mutating active program state. It loads the latest active program, computes the current week from `start_date`, fetches that week’s `program_days` and `program_day_exercises`, joins exercise metadata, and exposes mutation helpers such as swap, program ending, blank-program creation, dev-program creation, progression application, and week advancement.

```mermaid
sequenceDiagram
    participant Screen as home / plan / next-workout
    participant Hook as useCurrentProgram
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres

    Screen->>Hook: refresh()
    Hook->>Auth: getUser()
    Auth-->>Hook: user
    Hook->>DB: select active program from programs
    DB-->>Hook: active program row
    Hook->>Hook: compute current week from start_date
    Hook->>DB: select current-week program_days with nested program_day_exercises and exercises
    DB-->>Hook: week structure
    Hook->>DB: select workout_sessions for returned day ids
    DB-->>Hook: completed day ids
    Hook->>Hook: map DB rows to CurrentProgram
    Hook-->>Screen: program + loading + actions
```

## onboarding and authentication flow

Authentication is handled by Supabase Auth. Signup writes auth identity first, then quick setup updates `user_profile`, then the user typically creates or generates a program. The root layout checks for an existing session and redirects authenticated users straight into the tab app.

```mermaid
sequenceDiagram
    participant User
    participant Landing as index.tsx
    participant AuthScreens as join/login
    participant SBA as Supabase Auth
    participant Quick as quick-setup.tsx
    participant DB as Supabase Postgres
    participant Tabs as main tabs

    User->>Landing: open app
    Landing->>SBA: getSession() via root layout
    alt session exists
        SBA-->>Landing: active session
        Landing->>Tabs: redirect to /(tabs)/home
    else no session
        SBA-->>Landing: no session
        User->>AuthScreens: sign up or sign in
        AuthScreens->>SBA: signUp() / signInWithPassword()
        SBA-->>AuthScreens: authenticated user
        alt new account
            AuthScreens->>Quick: push /quick-setup
            Quick->>DB: update user_profile
            Quick->>Tabs: show program generation path
        else returning user
            AuthScreens->>Tabs: replace /(tabs)/home
        end
    end
```

## program generation flow

The generated-program path uses local domain logic rather than a remote planner. Inputs come from UI plus profile-derived weight and experience, with optional menstrual-cycle phase adjustments.

## high-level data flow diagram

This diagram presents the app in a more traditional data-flow style: external entities sit at the edges, numbered processes occupy the middle, and persistent data stores sit below. It is intended to make the movement of profile data, readiness data, workout logs, and progression updates easier to read than the sequence diagrams alone.

```mermaid
flowchart LR
    USER[User]
    AUTH[Supabase Auth]
    NOTIFY[Notifications]

    P1(["1. authenticate and manage profile"])
    P2(["2. generate and save program"])
    P3(["3. load active program"])
    P4(["4. log readiness and run workout"])
    P5(["5. compute progression and update next week"])

    D1[(user_profile)]
    D2[(programs)]
    D3[(program_days / program_day_exercises)]
    D4[(exercises)]
    D5[(readiness_logs)]
    D6[(workout_sessions / workout_exercise_sets)]
    D7[(personal_records)]

    USER -->|"sign up / sign in / edit profile"| P1
    P1 -->|"auth request"| AUTH
    AUTH -->|"session / user id"| P1
    P1 -->|"profile details / cycle settings"| D1

    USER -->|"program inputs: goal, days, focus, duration"| P2
    D1 -->|"weight, experience, cycle data"| P2
    D4 -->|"exercise catalog"| P2
    P2 -->|"active program row"| D2
    P2 -->|"scheduled days and prescriptions"| D3

    USER -->|"open home / plan / next workout"| P3
    AUTH -->|"current user"| P3
    D2 -->|"active program"| P3
    D3 -->|"current-week workouts"| P3
    D6 -->|"completed day ids / recent performance"| P3
    P3 -->|"current program view"| USER

    USER -->|"readiness check-in + logged sets"| P4
    D5 -->|"today's readiness"| P4
    D1 -->|"cycle fields"| P4
    D3 -->|"planned workout"| P4
    P4 -->|"readiness log"| D5
    P4 -->|"completed workout + set logs"| D6
    P4 -->|"new PR snapshots"| D7
    P4 -->|"PR / deload reminders"| NOTIFY

    D6 -->|"latest logged sets"| P5
    D1 -->|"experience + cycle context"| P5
    D3 -->|"next-week prescriptions"| P5
    P5 -->|"updated weight / RPE targets"| D3
    P5 -->|"refreshed next workout targets"| USER
```

```mermaid
sequenceDiagram
    participant User
    participant Plan as plan.tsx
    participant Modal as GenerateProgramModal
    participant DB as Supabase Postgres
    participant Gen as programGenerator
    participant Local as exerciseDatabase
    participant Save as saveProgramToDb

    User->>Plan: open generate program
    Plan->>Modal: render modal
    User->>Modal: choose days, duration, goal, focus, session length
    Modal->>DB: read user_profile
    DB-->>Modal: weight, experience, cycle data
    Modal->>Gen: generateProgram(params, weight, experience, cyclePhase)
    Gen->>Local: select exercises by split and muscle group
    Local-->>Gen: candidate exercise pool
    Gen-->>Modal: GeneratedProgram
    User->>Modal: confirm custom name
    Modal->>Save: saveProgramToDb(userId, params, generated)
    Save->>DB: deactivate prior active programs
    Save->>DB: insert program
    Save->>DB: upsert / fetch exercises
    Save->>DB: insert program_days
    Save->>DB: insert program_day_exercises
    Save-->>Modal: program id
    Modal-->>Plan: onProgramCreated()
```

## workout execution and progression flow

The workout screen builds an execution view from the current program, overlays readiness and cycle modifiers for display, records completed sets to the workout tables, and triggers PR celebrations plus weekly progression updates when appropriate.

```mermaid
sequenceDiagram
    participant User
    participant Workout as next-workout.tsx
    participant Hook as useCurrentProgram
    participant Prog as progressionEngine
    participant DB as Supabase Postgres
    participant Notify as notifications

    User->>Workout: start workout
    Workout->>Hook: read current program workout
    Workout->>DB: read today's readiness_logs
    DB-->>Workout: readiness score + cycle phase
    Workout->>Workout: build exercise cards with UI-only overlay
    User->>Workout: log sets and finish
    Workout->>DB: insert workout_sessions
    Workout->>DB: insert workout_exercise_sets
    Workout->>Notify: notifyPRCelebration() when PRs found
    Workout->>Hook: applyProgressionToNextWeek()
    Hook->>DB: fetch profile + next-week rows + last logged sets
    Hook->>Prog: computeProgression(context)
    Prog-->>Hook: next-week load + RPE suggestion
    Hook->>DB: update next-week program_day_exercises
```

## readiness and cycle adjustment model

The current code treats readiness differently in two places:

1. `home.tsx` saves daily readiness check-ins to `readiness_logs`.
2. `next-workout.tsx` applies readiness and cycle modifiers when rendering workout sets.

`useCurrentProgram.applyReadinessAdjustmentOnly()` is intentionally a no-op kept for API compatibility. The active program rows are not mutated for readiness alone.

```mermaid
flowchart TD
    CHECKIN["home.tsx readiness check-in"] --> LOGS["readiness_logs table"]
    LOGS --> WORKOUT["next-workout.tsx"]
    PROFILE["user_profile cycle fields"] --> CYCLE["computeCyclePhase / getCycleModifier"]
    CYCLE --> WORKOUT
    WORKOUT --> OVERLAY["display-time weight and RPE overlay"]
    OVERLAY --> CARDS["ExerciseCard sets shown to user"]

    PERF["workout_exercise_sets"] --> PROGRESSION["progressionEngine"]
    PROGRESSION --> NEXTWEEK["update next week's program_day_exercises"]

    LOGS -. not persisted into baseline weights .-> NEXTWEEK
```

## persistence architecture

Supabase Postgres stores the training domain, while Supabase Auth metadata stores preference-like settings that do not need their own tables in this client. The schema below is aligned to the database diagram supplied for this repository and reflects the current relational model more accurately than the earlier draft.

| table                   | role                                                                 | notable columns in current schema                                                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user_profile`          | user demographics, planning defaults, cycle data, avatar state       | `full_name`, `date_of_birth`, `sex_assigned_at_birth`, `gender_identity`, `weight_lb`, `weight_kg`, `weight_unit_preference`, `experience_level`, `days_per_week`, `training_goal`, `cycle_enabled`, `healthkit_enabled`, `onboarded`, `last_period_start_date`, `avg_cycle_length_days`, `avatar_url` |
| `programs`              | top-level program records                                            | `name`, `goal`, `duration_weeks`, `start_date`, `is_active`, `days_per_week`, `swap_interval_weeks`, `last_active_week`                                                                                                                                                                                |
| `program_days`          | scheduled days inside a program week                                 | `week_number`, `day_index`, `order_in_week`, `workout_name`, `estimated_duration_min`, `is_rest_day`, `is_deload_week`                                                                                                                                                                                 |
| `program_day_exercises` | exercise prescriptions for each scheduled day                        | `position`, `set_count`, `rep_range_min`, `rep_range_max`, `target_rpe`, `suggested_weight_lb`, `per_set_weights_lb`, `notes`                                                                                                                                                                          |
| `exercises`             | canonical exercise catalog used at runtime                           | `name`, `primary_muscle`, `equipment`, `target_muscle`, `secondary_muscles`, `instructions`, `image_url`                                                                                                                                                                                               |
| `readiness_logs`        | daily check-in data and derived readiness score                      | `log_date`, `sleep_score`, `sleep_hours`, `soreness`, `stress`, `motivation`, `readiness_score`, `cycle_phase`                                                                                                                                                                                         |
| `workout_sessions`      | completed workout summaries                                          | `program_day_id`, `workout_name`, `started_at`, `ended_at`, `duration_min`, `total_volume_lb`, `pr_count`, `checkin_id`, `light_day_applied`, `notes`                                                                                                                                                  |
| `workout_exercise_sets` | set-by-set logging for a workout session                             | `session_id`, `exercise_id`, `set_number`, `reps`, `weight_lb`, `rpe`                                                                                                                                                                                                                                  |
| `personal_records`      | persisted PR snapshots used by workout history and profile summaries | `user_id`, `exercise_id`, `weight_lb`, `reps`, `one_rep_max_lb`, `achieved_at`, `session_id`                                                                                                                                                                                                           |

Notable implementation details from the schema: `workout_sessions.checkin_id` links a session back to a readiness log, `program_day_exercises.per_set_weights_lb` is stored as `jsonb`, and `personal_records.exercise_id` is currently typed as `text` rather than `uuid`.

```mermaid
erDiagram
    AUTH_USERS ||--o| USER_PROFILE : "has profile"
    AUTH_USERS ||--o{ READINESS_LOGS : "submits"
    AUTH_USERS ||--o{ PROGRAMS : "owns"
    AUTH_USERS ||--o{ WORKOUT_SESSIONS : "logs"
    AUTH_USERS ||--o{ PERSONAL_RECORDS : "owns"
    PROGRAMS ||--o{ PROGRAM_DAYS : "contains"
    PROGRAM_DAYS ||--o{ PROGRAM_DAY_EXERCISES : "contains"
    PROGRAM_DAYS ||--o{ WORKOUT_SESSIONS : "completed as"
    EXERCISES ||--o{ PROGRAM_DAY_EXERCISES : "references"
    WORKOUT_SESSIONS ||--o{ WORKOUT_EXERCISE_SETS : "contains"
    EXERCISES ||--o{ WORKOUT_EXERCISE_SETS : "tracks"
    READINESS_LOGS ||--o{ WORKOUT_SESSIONS : "linked by checkin_id"
    WORKOUT_SESSIONS ||--o{ PERSONAL_RECORDS : "captures"

    AUTH_USERS {
        uuid id
        jsonb user_metadata
    }

    USER_PROFILE {
        uuid user_id
        text full_name
        date date_of_birth
        sex_assigned sex_assigned_at_birth
        gender_identity gender_identity
        numeric weight_lb
        numeric weight_kg
        weight_unit weight_unit_preference
        training_experience experience_level
        int4 days_per_week
        text training_goal
        bool cycle_enabled
        boolean healthkit_enabled
        boolean onboarded
        timestamptz created_at
        timestamptz updated_at
        date last_period_start_date
        int avg_cycle_length_days
        text avatar_url
    }

    PROGRAMS {
        uuid id
        uuid user_id
        text name
        text goal
        int duration_weeks
        int days_per_week
        date start_date
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        int swap_interval_weeks
        int4 last_active_week
    }

    PROGRAM_DAYS {
        uuid id
        uuid program_id
        int week_number
        int day_index
        int order_in_week
        text workout_name
        int estimated_duration_min
        timestamptz created_at
        timestamptz updated_at
        bool is_rest_day
        bool is_deload_week
    }

    PROGRAM_DAY_EXERCISES {
        uuid id
        uuid program_day_id
        uuid exercise_id
        int position
        int set_count
        int rep_range_min
        int rep_range_max
        numeric target_rpe
        numeric suggested_weight_lb
        text notes
        timestamptz created_at
        timestamptz updated_at
        jsonb per_set_weights_lb
    }

    EXERCISES {
        uuid id
        text name
        text primary_muscle
        text equipment
        timestamptz created_at
        text target_muscle
        text_array secondary_muscles
        text_array instructions
        text image_url
    }

    WORKOUT_SESSIONS {
        uuid id
        uuid user_id
        uuid program_day_id
        text workout_name
        timestamptz started_at
        timestamptz ended_at
        int4 duration_min
        numeric total_volume_lb
        int4 pr_count
        timestamptz created_at
        uuid checkin_id
        bool light_day_applied
        text notes
    }

    WORKOUT_EXERCISE_SETS {
        uuid id
        uuid session_id
        uuid exercise_id
        int set_number
        numeric weight_lb
        int reps
        numeric rpe
        timestamptz created_at
    }

    READINESS_LOGS {
        uuid id
        uuid user_id
        date log_date
        int4 sleep_score
        int4 soreness
        int4 stress
        int4 motivation
        numeric readiness_score
        timestamptz created_at
        text cycle_phase
        numeric sleep_hours
    }

    PERSONAL_RECORDS {
        uuid id
        uuid user_id
        text exercise_id
        numeric weight_lb
        int4 reps
        numeric one_rep_max_lb
        date achieved_at
        uuid session_id
        timestamptz created_at
    }
```

## preferences and profile architecture

Profile state is split deliberately:

| storage location           | examples                                                                                                  | used by                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `user_profile` table       | full name, body metrics, experience level, days/week, training goal, cycle fields, onboarding, avatar URL | quick setup, generation, progression, profile forms, avatar UI |
| `auth.users.user_metadata` | notification preferences, privacy preferences, support request timestamps, names/phone                    | profile screens, notifications, privacy/help flows             |
| AsyncStorage               | theme appearance, color palette, Supabase auth persistence                                                | theme provider, Supabase client auth                           |

```mermaid
flowchart LR
    PROFILE["profile screens"] --> META["auth user_metadata"]
    PROFILE --> TABLE["user_profile"]
    PROFILE --> LOCAL["AsyncStorage"]

    PREFUTIL["profilePreferences"] --> META
    THEME["ThemeContext"] --> LOCAL
    AUTH["supabase auth client"] --> LOCAL
    NOTIF["notifications.ts"] --> META
    SUPPORT["help-support.tsx"] --> META
    PERSONAL["personal-information.tsx"] --> META
    PERSONAL --> TABLE
```

## notifications and asset delivery

Notifications are scheduled client-side through Expo Notifications and gated by metadata preferences and platform permission status. Assets come from Supabase Storage, populated by seed scripts and avatar upload utilities.

```mermaid
flowchart TD
    PREFS["notification preferences in user_metadata"] --> NOTIF["utils/notifications.ts"]
    PERMS["device permission status"] --> NOTIF
    NOTIF --> DAILY["daily workout reminder"]
    NOTIF --> PR["PR celebration notification"]
    NOTIF --> DELOAD["deload-week notification"]
    NOTIF --> EXPO["Expo Notifications"]

    SEED["seedExercises.ts / seedImages.ts"] --> RAPID["ExerciseDB / RapidAPI"]
    RAPID --> STORAGE["Supabase Storage\nexercise-images bucket"]
    STORAGE --> EXERCISES["exercises.image_url"]
    EXERCISES --> UI["exercise panels, swap modal, workout cards"]

    AVATAR["uploadAvatar.ts"] --> STORAGE
    STORAGE --> PROFILEUI["profile avatar UI"]
```

## key source files

| file                            | responsibility                                                          |
| ------------------------------- | ----------------------------------------------------------------------- |
| `app/_layout.tsx`               | root provider composition, notification handler, session-based redirect |
| `app/(tabs)/home.tsx`           | home dashboard, readiness input, next workout summary                   |
| `app/(tabs)/plan.tsx`           | active plan view, generation entry point, archive access                |
| `app/next-workout.tsx`          | workout execution, logging, swap/history access, PR notifications       |
| `app/create-program.tsx`        | manual week-1 program builder                                           |
| `hooks/useCurrentProgram.ts`    | active program loading, swaps, week advancement, dev helpers            |
| `utils/programGenerator.ts`     | split selection and generated plan construction                         |
| `utils/saveProgramToDb.ts`      | generated-program persistence workflow                                  |
| `utils/progressionEngine.ts`    | performance plus readiness-based progression calculations               |
| `utils/notifications.ts`        | permission checks and local notification scheduling                     |
| `utils/profilePreferences.ts`   | metadata parsing and merging                                            |
| `utils/fetchExerciseHistory.ts` | exercise history aggregation from set rows                              |
| `lib/exerciseDatabase.ts`       | local exercise definitions used during generation                       |
| `scripts/seedExercises.ts`      | exercise catalog + image seeding bootstrap                              |
| `scripts/seedImages.ts`         | storage/image backfill for existing exercise rows                       |

## current architectural decisions

1. The app is client-heavy: generation, progression orchestration, and preference handling live in the mobile app rather than server functions.
2. Active program state is rebuilt from Supabase on refresh instead of being managed in a dedicated client store.
3. Readiness affects workout display and progression context differently: display overlays are immediate, while persisted baselines come from logged performance and scheduled progression updates.
4. User preference data is intentionally split between relational profile rows and auth metadata objects.
5. The exercise catalog exists in both a local static source for generation and a Supabase table for runtime joins, history, and media-backed display.

## known constraints and follow-up areas

1. Some profile and support flows store requests in auth metadata rather than dedicated relational tables, which simplifies the client but limits queryability.
2. The app contains dev-only shortcuts and helper paths (`Dev Skip`, `createDevTestProgram`) that are useful during development but are not a production navigation model.
3. Workout-history code supports multiple possible table shapes (`workout_sessions` or `workout_history`), which suggests schema drift tolerance in the client.
4. Health integration is still placeholder-driven from the app side; quick setup only toggles local/profile fields today.
