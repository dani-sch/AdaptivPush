-- Phase 2 / Migration 009
-- Purpose: introduce the additive readiness-v2 canonical check-in table.
-- Rollback note: keep readiness_logs as the active reader if this table is not adopted.

CREATE TABLE IF NOT EXISTS public.readiness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  checkin_at timestamptz NOT NULL DEFAULT now(),
  checkin_mode text NOT NULL
    CHECK (checkin_mode IN ('one_tap', 'guided', 'deep', 'apple_health')),
  one_tap_state text NULL
    CHECK (one_tap_state IN ('low', 'moderate', 'high')),
  sleep_hours numeric(4,1) NULL,
  sleep_quality integer NULL,
  stress_level integer NULL,
  soreness_level integer NULL,
  motivation_level integer NULL,
  pain_level integer NULL,
  illness_flag boolean NULL,
  life_load_level integer NULL,
  derived_readiness_score numeric(4,1) NULL,
  recommended_action text NULL,
  source text NOT NULL DEFAULT 'manual',
  raw_payload jsonb NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS readiness_checkins_user_date_idx
  ON public.readiness_checkins (user_id, checkin_date);
