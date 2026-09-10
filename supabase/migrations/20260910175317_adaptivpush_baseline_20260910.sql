SET local check_function_bodies = off;

CREATE TABLE "public"."adaptation_events" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                  uuid                     NOT NULL,
  "program_id"               uuid,
  "program_day_id"           uuid,
  "workout_session_id"       uuid,
  "readiness_checkin_id"     uuid,
  "cycle_symptom_log_id"     uuid,
  "deload_recommendation_id" uuid,
  "event_type"               text                     NOT NULL,
  "trigger_source"           text                     NOT NULL,
  "occurred_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "accepted"                 boolean,
  "before_snapshot"          jsonb,
  "after_snapshot"           jsonb,
  "explanation_payload"      jsonb                    NOT NULL,
  "evidence_keys"            jsonb                    NOT NULL,
  CONSTRAINT "adaptation_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."adaptation_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cycle_symptom_logs" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                uuid                     NOT NULL,
  "log_date"               date                     NOT NULL,
  "logged_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "calendar_phase_context" text,
  "cramps_level"           integer,
  "fatigue_level"          integer,
  "sleep_disruption_level" integer,
  "mood_level"             integer,
  "pain_level"             integer,
  "motivation_level"       integer,
  "bloating_level"         integer,
  "period_started"         boolean,
  "notes"                  text,
  "source"                 text                     NOT NULL DEFAULT 'manual'::text,
  CONSTRAINT "cycle_symptom_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cycle_symptom_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."deload_recommendations" (
  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                   uuid                     NOT NULL,
  "program_id"                uuid                     NOT NULL,
  "week_number"               integer,
  "status"                    text                     NOT NULL,
  "trigger_type"              text                     NOT NULL,
  "reason_summary"            text                     NOT NULL,
  "recommended_volume_factor" numeric(4,2)             NOT NULL DEFAULT 0.60,
  "recommended_load_factor"   numeric(4,2)             NOT NULL DEFAULT 0.90,
  "preserve_skill_practice"   boolean                  NOT NULL DEFAULT true,
  "target_days"               jsonb,
  "evidence_keys"             jsonb                    NOT NULL,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at"               timestamp with time zone,
  CONSTRAINT "deload_recommendations_pkey" PRIMARY KEY (id),
  CONSTRAINT "deload_recommendations_status_check" CHECK ((status = ANY (ARRAY['recommended'::text, 'accepted'::text, 'dismissed'::text, 'applied'::text, 'expired'::text])))
);

ALTER TABLE "public"."deload_recommendations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."evidence_display_preferences" (
  "user_id"                uuid                     NOT NULL,
  "verbosity"              text                     NOT NULL DEFAULT 'guided'::text,
  "show_evidence_badges"   boolean                  NOT NULL DEFAULT true,
  "show_source_links"      boolean                  NOT NULL DEFAULT true,
  "show_uncertainty_notes" boolean                  NOT NULL DEFAULT false,
  "auto_open_why_sheet"    boolean                  NOT NULL DEFAULT false,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "evidence_display_preferences_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "evidence_display_preferences_verbosity_check" CHECK ((verbosity = ANY (ARRAY['essential'::text, 'guided'::text, 'advanced'::text])))
);

ALTER TABLE "public"."evidence_display_preferences"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."exercises" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"              text                     NOT NULL,
  "primary_muscle"    text,
  "equipment"         text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "target_muscle"     text,
  "secondary_muscles" text[],
  "instructions"      text[],
  "image_url"         text,
  "exercisedb_id"     text,
  CONSTRAINT "exercises_name_key" UNIQUE (name),
  CONSTRAINT "exercises_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."exercises"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."personal_records" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        uuid                     NOT NULL,
  "exercise_id"    text                     NOT NULL,
  "weight_lb"      numeric(7,2)             NOT NULL,
  "reps"           integer                  NOT NULL,
  "one_rep_max_lb" numeric(7,2),
  "achieved_at"    date                     NOT NULL DEFAULT CURRENT_DATE,
  "session_id"     uuid,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "personal_records_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."personal_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."program_day_exercises" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "program_day_id"      uuid                     NOT NULL,
  "exercise_id"         uuid                     NOT NULL,
  "position"            integer                  NOT NULL DEFAULT 1,
  "set_count"           integer                  NOT NULL,
  "rep_range_min"       integer                  NOT NULL,
  "rep_range_max"       integer                  NOT NULL,
  "target_rpe"          numeric(3,1),
  "suggested_weight_lb" numeric(7,2),
  "notes"               text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "per_set_weights_lb"  jsonb,
  CONSTRAINT "program_day_exercises_check" CHECK ((rep_range_max >= rep_range_min)),
  CONSTRAINT "program_day_exercises_pkey" PRIMARY KEY (id),
  CONSTRAINT "program_day_exercises_program_day_id_position_key" UNIQUE (program_day_id, "position"),
  CONSTRAINT "program_day_exercises_rep_range_min_check" CHECK ((rep_range_min > 0)),
  CONSTRAINT "program_day_exercises_set_count_check" CHECK ((set_count > 0))
);

ALTER TABLE "public"."program_day_exercises"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."program_days" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "program_id"             uuid                     NOT NULL,
  "week_number"            integer                  NOT NULL,
  "day_index"              integer                  NOT NULL,
  "order_in_week"          integer                  NOT NULL DEFAULT 1,
  "workout_name"           text                     NOT NULL,
  "estimated_duration_min" integer,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "is_rest_day"            boolean                  NOT NULL DEFAULT false,
  "is_deload_week"         boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "program_days_day_index_check" CHECK (((day_index >= 1) AND (day_index <= 7))),
  CONSTRAINT "program_days_pkey" PRIMARY KEY (id),
  CONSTRAINT "program_days_program_id_week_number_day_index_key" UNIQUE (program_id, week_number, day_index),
  CONSTRAINT "program_days_week_number_check" CHECK ((week_number > 0))
);

ALTER TABLE "public"."program_days"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."program_generation_context" (
  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "program_id"                uuid                     NOT NULL,
  "user_id"                   uuid                     NOT NULL,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "policy_version"            text                     NOT NULL,
  "evidence_version"          text                     NOT NULL,
  "depth_mode"                text                     NOT NULL,
  "experience_level"          text                     NOT NULL,
  "goal"                      text                     NOT NULL,
  "days_per_week"             integer                  NOT NULL,
  "duration_weeks"            integer                  NOT NULL,
  "session_length_target_min" integer,
  "focus_muscle_groups"       jsonb                    NOT NULL,
  "split_recommendation"      jsonb                    NOT NULL,
  "volume_targets"            jsonb                    NOT NULL,
  "readiness_strategy"        text                     NOT NULL,
  "cycle_strategy"            text                     NOT NULL,
  "warmup_strategy"           text                     NOT NULL,
  "explanation_density"       text                     NOT NULL,
  "input_snapshot"            jsonb                    NOT NULL,
  "output_summary"            jsonb                    NOT NULL,
  CONSTRAINT "program_generation_context_depth_mode_check" CHECK ((depth_mode = ANY (ARRAY['essential'::text, 'guided'::text, 'advanced'::text]))),
  CONSTRAINT "program_generation_context_explanation_density_check" CHECK ((explanation_density = ANY (ARRAY['essential'::text, 'guided'::text, 'advanced'::text]))),
  CONSTRAINT "program_generation_context_pkey" PRIMARY KEY (id),
  CONSTRAINT "program_generation_context_program_id_key" UNIQUE (program_id)
);

ALTER TABLE "public"."program_generation_context"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."programs" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             uuid                     NOT NULL,
  "name"                text                     NOT NULL,
  "goal"                text,
  "duration_weeks"      integer                  NOT NULL,
  "start_date"          date,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "days_per_week"       integer,
  "swap_interval_weeks" integer                  DEFAULT 4,
  "last_active_week"    integer,
  CONSTRAINT "programs_days_per_week_check" CHECK (((days_per_week >= 1) AND (days_per_week <= 7))),
  CONSTRAINT "programs_duration_weeks_check" CHECK ((duration_weeks > 0)),
  CONSTRAINT "programs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."programs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."readiness_checkins" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                 uuid                     NOT NULL,
  "checkin_date"            date                     NOT NULL,
  "checkin_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "checkin_mode"            text                     NOT NULL,
  "one_tap_state"           text,
  "sleep_hours"             numeric(4,1),
  "sleep_quality"           integer,
  "stress_level"            integer,
  "soreness_level"          integer,
  "motivation_level"        integer,
  "pain_level"              integer,
  "illness_flag"            boolean,
  "life_load_level"         integer,
  "derived_readiness_score" numeric(4,1),
  "recommended_action"      text,
  "source"                  text                     NOT NULL DEFAULT 'manual'::text,
  "raw_payload"             jsonb,
  CONSTRAINT "readiness_checkins_checkin_mode_check" CHECK ((checkin_mode = ANY (ARRAY['one_tap'::text, 'guided'::text, 'deep'::text, 'apple_health'::text]))),
  CONSTRAINT "readiness_checkins_one_tap_state_check" CHECK ((one_tap_state = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text]))),
  CONSTRAINT "readiness_checkins_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."readiness_checkins"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."readiness_logs" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         uuid                     NOT NULL,
  "log_date"        date                     NOT NULL,
  "sleep_score"     integer,
  "soreness"        integer,
  "stress"          integer,
  "motivation"      integer,
  "readiness_score" numeric(3,1)             NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "cycle_phase"     text,
  "sleep_hours"     numeric(4,1),
  CONSTRAINT "readiness_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "readiness_logs_readiness_score_check" CHECK (((readiness_score >= (0)::numeric) AND (readiness_score <= (10)::numeric))),
  CONSTRAINT "readiness_logs_user_date_unique" UNIQUE (user_id, log_date),
  CONSTRAINT "readiness_logs_user_id_log_date_key" UNIQUE (user_id, log_date)
);

ALTER TABLE "public"."readiness_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_adaptation_preferences" (
  "user_id"                   uuid                     NOT NULL,
  "readiness_enabled"         boolean                  NOT NULL DEFAULT true,
  "readiness_checkin_mode"    text                     NOT NULL DEFAULT 'one_tap'::text,
  "readiness_authority"       text                     NOT NULL DEFAULT 'moderate'::text,
  "adaptation_aggressiveness" text                     NOT NULL DEFAULT 'moderate'::text,
  "cycle_support_enabled"     boolean                  NOT NULL DEFAULT false,
  "symptom_tracking_enabled"  boolean                  NOT NULL DEFAULT false,
  "wearables_enabled"         boolean                  NOT NULL DEFAULT false,
  "wearables_priority"        text                     NOT NULL DEFAULT 'secondary'::text,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_adaptation_preferences_adaptation_aggressiveness_check"
    CHECK ((adaptation_aggressiveness = ANY (ARRAY['conservative'::text, 'moderate'::text, 'assertive'::text]))),
  CONSTRAINT "user_adaptation_preferences_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "user_adaptation_preferences_readiness_authority_check" CHECK ((readiness_authority = ANY (ARRAY['low'::text, 'moderate'::text, 'strong'::text]))),
  CONSTRAINT "user_adaptation_preferences_readiness_checkin_mode_check" CHECK ((readiness_checkin_mode = ANY (ARRAY['off'::text, 'one_tap'::text, 'guided'::text, 'deep'::text]))),
  CONSTRAINT "user_adaptation_preferences_wearables_priority_check" CHECK ((wearables_priority = ANY (ARRAY['secondary'::text, 'ignored'::text])))
);

ALTER TABLE "public"."user_adaptation_preferences"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_profile" (
  "user_id"                       uuid                     NOT NULL,
  "full_name"                     text,
  "date_of_birth"                 date,
  "weight_lb"                     numeric(6,2),
  "weight_kg"                     numeric(6,2),
  "days_per_week"                 integer,
  "training_goal"                 text,
  "cycle_enabled"                 boolean                  NOT NULL DEFAULT false,
  "healthkit_enabled"             boolean                  NOT NULL DEFAULT false,
  "onboarded"                     boolean                  NOT NULL DEFAULT false,
  "created_at"                    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                    timestamp with time zone NOT NULL DEFAULT now(),
  "last_period_start_date"        date,
  "avg_cycle_length_days"         integer                  DEFAULT 28,
  "avatar_url"                    text,
  "depth_mode"                    text                     NOT NULL DEFAULT 'guided'::text,
  "session_length_preference_min" integer,
  "primary_goal_horizon"          text,
  "equipment_profile"             jsonb,
  "rpe_familiarity"               text,
  "injury_considerations"         text,
  CONSTRAINT "user_profile_days_per_week_check" CHECK (((days_per_week >= 1) AND (days_per_week <= 7))),
  CONSTRAINT "user_profile_depth_mode_check" CHECK ((depth_mode = ANY (ARRAY['essential'::text, 'guided'::text, 'advanced'::text]))),
  CONSTRAINT "user_profile_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."user_profile"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workout_exercise_sets" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id"  uuid                     NOT NULL,
  "exercise_id" uuid                     NOT NULL,
  "set_number"  integer                  NOT NULL,
  "reps"        integer                  NOT NULL,
  "weight_lb"   numeric(7,2)             NOT NULL DEFAULT 0,
  "rpe"         numeric(3,1),
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "workout_exercise_sets_pkey" PRIMARY KEY (id),
  CONSTRAINT "workout_exercise_sets_reps_check" CHECK ((reps >= 0)),
  CONSTRAINT "workout_exercise_sets_session_id_exercise_id_set_number_key" UNIQUE (session_id, exercise_id, set_number),
  CONSTRAINT "workout_exercise_sets_set_number_check" CHECK ((set_number > 0))
);

ALTER TABLE "public"."workout_exercise_sets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."workout_sessions" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "program_day_id"    uuid,
  "workout_name"      text                     NOT NULL,
  "started_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "ended_at"          timestamp with time zone,
  "duration_min"      integer,
  "total_volume_lb"   numeric(12,2)            NOT NULL DEFAULT 0,
  "pr_count"          integer                  NOT NULL DEFAULT 0,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "checkin_id"        uuid,
  "light_day_applied" boolean                  NOT NULL DEFAULT false,
  "notes"             text,
  CONSTRAINT "workout_sessions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."workout_sessions"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."gender_identity" AS ENUM (
  'man',
  'woman',
  'non_binary',
  'prefer_not_to_say',
  'prefer_to_self_describe'
);

ALTER TABLE "public"."user_profile"
  ADD COLUMN "gender_identity" public.gender_identity;

CREATE TYPE "public"."sex_assigned" AS ENUM (
  'female',
  'male',
  'intersex',
  'prefer_not_to_say'
);

ALTER TABLE "public"."user_profile"
  ADD COLUMN "sex_assigned_at_birth" public.sex_assigned;

CREATE TYPE "public"."training_experience" AS ENUM (
  'beginner',
  'intermediate',
  'advanced'
);

ALTER TABLE "public"."user_profile"
  ADD COLUMN "experience_level" public.training_experience;

CREATE TYPE "public"."weight_unit" AS ENUM (
  'lb',
  'kg'
);

ALTER TABLE "public"."user_profile"
  ADD COLUMN "weight_unit_preference" public.weight_unit NOT NULL DEFAULT 'lb'::public.weight_unit;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  INSERT INTO PUBLIC.USER_PROFILE (USER_ID, FULL_NAME)
  VALUES (NEW.ID, COALESCE(NEW.RAW_USER_META_DATA->>'full_name', ''));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.UPDATED_AT = NOW();
  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_cycle_symptom_log_id_fkey" FOREIGN KEY (cycle_symptom_log_id) REFERENCES public.cycle_symptom_logs(id) ON DELETE SET NULL;

ALTER TABLE "public"."cycle_symptom_logs"
  ADD CONSTRAINT "cycle_symptom_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_deload_recommendation_id_fkey" FOREIGN KEY (deload_recommendation_id) REFERENCES public.deload_recommendations(id) ON DELETE SET NULL;

ALTER TABLE "public"."deload_recommendations"
  ADD CONSTRAINT "deload_recommendations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."evidence_display_preferences"
  ADD CONSTRAINT "evidence_display_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."personal_records"
  ADD CONSTRAINT "personal_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."program_day_exercises"
  ADD CONSTRAINT "program_day_exercises_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_program_day_id_fkey" FOREIGN KEY (program_day_id) REFERENCES public.program_days(id) ON DELETE SET NULL;

ALTER TABLE "public"."program_day_exercises"
  ADD CONSTRAINT "program_day_exercises_program_day_id_fkey" FOREIGN KEY (program_day_id) REFERENCES public.program_days(id) ON DELETE CASCADE;

ALTER TABLE "public"."program_generation_context"
  ADD CONSTRAINT "program_generation_context_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_program_id_fkey" FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE "public"."deload_recommendations"
  ADD CONSTRAINT "deload_recommendations_program_id_fkey" FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;

ALTER TABLE "public"."program_days"
  ADD CONSTRAINT "program_days_program_id_fkey" FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;

ALTER TABLE "public"."program_generation_context"
  ADD CONSTRAINT "program_generation_context_program_id_fkey" FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;

ALTER TABLE "public"."programs"
  ADD CONSTRAINT "programs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_readiness_checkin_id_fkey" FOREIGN KEY (readiness_checkin_id) REFERENCES public.readiness_checkins(id) ON DELETE SET NULL;

ALTER TABLE "public"."readiness_checkins"
  ADD CONSTRAINT "readiness_checkins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."readiness_logs"
  ADD CONSTRAINT "readiness_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_adaptation_preferences"
  ADD CONSTRAINT "user_adaptation_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_profile"
  ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."workout_exercise_sets"
  ADD CONSTRAINT "workout_exercise_sets_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT;

ALTER TABLE "public"."workout_sessions"
  ADD CONSTRAINT "workout_sessions_checkin_id_fkey" FOREIGN KEY (checkin_id) REFERENCES public.readiness_logs(id) ON DELETE SET NULL;

ALTER TABLE "public"."adaptation_events"
  ADD CONSTRAINT "adaptation_events_workout_session_id_fkey" FOREIGN KEY (workout_session_id) REFERENCES public.workout_sessions(id) ON DELETE SET NULL;

ALTER TABLE "public"."workout_exercise_sets"
  ADD CONSTRAINT "workout_exercise_sets_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE CASCADE;

ALTER TABLE "public"."workout_sessions"
  ADD CONSTRAINT "workout_sessions_program_day_id_fkey" FOREIGN KEY (program_day_id) REFERENCES public.program_days(id) ON DELETE SET NULL;

ALTER TABLE "public"."workout_sessions"
  ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX adaptation_events_user_occurred_at_idx ON public.adaptation_events USING btree (user_id, occurred_at DESC);

CREATE UNIQUE INDEX cycle_symptom_logs_user_date_idx ON public.cycle_symptom_logs USING btree (user_id, log_date);

CREATE INDEX exercises_exercisedb_id_idx ON public.exercises USING btree (exercisedb_id)
  WHERE (exercisedb_id IS NOT NULL);

CREATE INDEX idx_user_profile_user_id ON public.user_profile USING btree (user_id);

CREATE INDEX personal_records_user_exercise ON public.personal_records USING btree (user_id, exercise_id);

CREATE INDEX program_day_exercises_day_idx ON public.program_day_exercises USING btree (program_day_id);

CREATE INDEX program_day_exercises_exercise_idx ON public.program_day_exercises USING btree (exercise_id);

CREATE INDEX program_days_program_id_idx ON public.program_days USING btree (program_id);

CREATE INDEX program_generation_context_user_id_idx ON public.program_generation_context USING btree (user_id);

CREATE INDEX programs_active_idx ON public.programs USING btree (user_id, is_active);

CREATE INDEX programs_user_id_idx ON public.programs USING btree (user_id);

CREATE UNIQUE INDEX readiness_checkins_user_date_idx ON public.readiness_checkins USING btree (user_id, checkin_date);

CREATE INDEX readiness_logs_user_date_idx ON public.readiness_logs USING btree (user_id, log_date DESC);

CREATE INDEX workout_sessions_started_at_idx ON public.workout_sessions USING btree (user_id, started_at DESC);

CREATE INDEX workout_sessions_user_id_idx ON public.workout_sessions USING btree (user_id);

CREATE INDEX workout_sets_exercise_idx ON public.workout_exercise_sets USING btree (exercise_id);

CREATE INDEX workout_sets_session_idx ON public.workout_exercise_sets USING btree (session_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users can delete own adaptation_events" ON "public"."adaptation_events"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own adaptation_events" ON "public"."adaptation_events"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND ((program_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = adaptation_events.program_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))) AND ((program_day_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (public.program_days pd
     JOIN public.programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = adaptation_events.program_day_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))) AND ((workout_session_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.workout_sessions ws
  WHERE ((ws.id = adaptation_events.workout_session_id) AND (ws.user_id = ( SELECT auth.uid() AS uid)))))) AND ((readiness_checkin_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.readiness_checkins rc
  WHERE ((rc.id = adaptation_events.readiness_checkin_id) AND (rc.user_id = ( SELECT auth.uid() AS uid)))))) AND ((cycle_symptom_log_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.cycle_symptom_logs csl
  WHERE ((csl.id = adaptation_events.cycle_symptom_log_id) AND (csl.user_id = ( SELECT auth.uid() AS uid)))))) AND ((deload_recommendation_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.deload_recommendations dr
  WHERE ((dr.id = adaptation_events.deload_recommendation_id) AND (dr.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Users can select own adaptation_events" ON "public"."adaptation_events"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own adaptation_events" ON "public"."adaptation_events"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND ((program_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = adaptation_events.program_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))) AND ((program_day_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (public.program_days pd
     JOIN public.programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = adaptation_events.program_day_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))) AND ((workout_session_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.workout_sessions ws
  WHERE ((ws.id = adaptation_events.workout_session_id) AND (ws.user_id = ( SELECT auth.uid() AS uid)))))) AND ((readiness_checkin_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.readiness_checkins rc
  WHERE ((rc.id = adaptation_events.readiness_checkin_id) AND (rc.user_id = ( SELECT auth.uid() AS uid)))))) AND ((cycle_symptom_log_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.cycle_symptom_logs csl
  WHERE ((csl.id = adaptation_events.cycle_symptom_log_id) AND (csl.user_id = ( SELECT auth.uid() AS uid)))))) AND ((deload_recommendation_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.deload_recommendations dr
  WHERE ((dr.id = adaptation_events.deload_recommendation_id) AND (dr.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Users can delete own cycle_symptom_logs" ON "public"."cycle_symptom_logs"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own cycle_symptom_logs" ON "public"."cycle_symptom_logs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can select own cycle_symptom_logs" ON "public"."cycle_symptom_logs"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own cycle_symptom_logs" ON "public"."cycle_symptom_logs"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can delete own deload_recommendations" ON "public"."deload_recommendations"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own deload_recommendations" ON "public"."deload_recommendations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = deload_recommendations.program_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Users can select own deload_recommendations" ON "public"."deload_recommendations"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own deload_recommendations" ON "public"."deload_recommendations"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = deload_recommendations.program_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Users can delete own evidence_display_preferences" ON "public"."evidence_display_preferences"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own evidence_display_preferences" ON "public"."evidence_display_preferences"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can select own evidence_display_preferences" ON "public"."evidence_display_preferences"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own evidence_display_preferences" ON "public"."evidence_display_preferences"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "exercises_delete" ON "public"."exercises"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "exercises_insert" ON "public"."exercises"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "exercises_select" ON "public"."exercises"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "exercises_update" ON "public"."exercises"
  FOR UPDATE
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can insert own personal records" ON "public"."personal_records"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can read own personal records" ON "public"."personal_records"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "program_day_exercises_delete" ON "public"."program_day_exercises"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM (public.program_days pd
     JOIN public.programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = program_day_exercises.program_day_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_day_exercises_insert" ON "public"."program_day_exercises"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.program_days pd
     JOIN public.programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = program_day_exercises.program_day_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_day_exercises_select" ON "public"."program_day_exercises"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM (public.program_days pd
     JOIN public.programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = program_day_exercises.program_day_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_day_exercises_update" ON "public"."program_day_exercises"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM (public.program_days pd
     JOIN public.programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = program_day_exercises.program_day_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_days_delete" ON "public"."program_days"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = program_days.program_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_days_insert" ON "public"."program_days"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = program_days.program_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_days_select" ON "public"."program_days"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = program_days.program_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "program_days_update" ON "public"."program_days"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = program_days.program_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "Users can delete own program_generation_context" ON "public"."program_generation_context"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own program_generation_context" ON "public"."program_generation_context"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = program_generation_context.program_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Users can select own program_generation_context" ON "public"."program_generation_context"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own program_generation_context" ON "public"."program_generation_context"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.programs p
  WHERE ((p.id = program_generation_context.program_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "programs_delete" ON "public"."programs"
  FOR DELETE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "programs_insert" ON "public"."programs"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "programs_select" ON "public"."programs"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "programs_update" ON "public"."programs"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can delete own readiness_checkins" ON "public"."readiness_checkins"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own readiness_checkins" ON "public"."readiness_checkins"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can select own readiness_checkins" ON "public"."readiness_checkins"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own readiness_checkins" ON "public"."readiness_checkins"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "readiness_delete" ON "public"."readiness_logs"
  FOR DELETE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "readiness_insert" ON "public"."readiness_logs"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "readiness_select" ON "public"."readiness_logs"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "readiness_update" ON "public"."readiness_logs"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can delete own user_adaptation_preferences" ON "public"."user_adaptation_preferences"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can insert own user_adaptation_preferences" ON "public"."user_adaptation_preferences"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can select own user_adaptation_preferences" ON "public"."user_adaptation_preferences"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can update own user_adaptation_preferences" ON "public"."user_adaptation_preferences"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "user_profile_insert_own" ON "public"."user_profile"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "user_profile_select_own" ON "public"."user_profile"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "user_profile_update_own" ON "public"."user_profile"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "workout_sets_delete" ON "public"."workout_exercise_sets"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.workout_sessions s
  WHERE ((s.id = workout_exercise_sets.session_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "workout_sets_insert" ON "public"."workout_exercise_sets"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workout_sessions s
  WHERE ((s.id = workout_exercise_sets.session_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "workout_sets_select" ON "public"."workout_exercise_sets"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.workout_sessions s
  WHERE ((s.id = workout_exercise_sets.session_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "workout_sets_update" ON "public"."workout_exercise_sets"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.workout_sessions s
  WHERE ((s.id = workout_exercise_sets.session_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "workout_sessions_delete" ON "public"."workout_sessions"
  FOR DELETE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "workout_sessions_insert" ON "public"."workout_sessions"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "workout_sessions_select" ON "public"."workout_sessions"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "workout_sessions_update" ON "public"."workout_sessions"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "Avatar owners can delete own objects" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Avatar owners can insert own objects" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (storage.extension(name) = 'jpg'::text)));

CREATE POLICY "Avatar owners can select own objects" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Avatar owners can update own objects" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)))
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (storage.extension(name) = 'jpg'::text)));

CREATE POLICY "Give anon users access to JPG images in folder 1oj01fe_0" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING (((bucket_id = 'avatars'::text) AND (storage.extension(name) = 'jpg'::text) AND (lower((storage.foldername(name))[1]) = 'public'::text) AND (auth.role() = 'anon'::text)));

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."adaptation_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cycle_symptom_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."deload_recommendations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."evidence_display_preferences"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."exercises" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."personal_records" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."program_day_exercises" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."program_days" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."program_generation_context" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."programs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."readiness_checkins" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."readiness_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_adaptation_preferences" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_profile" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workout_exercise_sets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workout_sessions" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."gender_identity" TO "postgres";

GRANT USAGE ON TYPE "public"."sex_assigned" TO "postgres";

GRANT USAGE ON TYPE "public"."training_experience" TO "postgres";

GRANT USAGE ON TYPE "public"."weight_unit" TO "postgres";

