-- Phase 2 / Migration 007
-- Purpose: add additive user_profile defaults required by readiness-v2 compatibility.
-- Rollback note: stop reading/writing these fields before considering any manual drop.

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS depth_mode text,
  ADD COLUMN IF NOT EXISTS session_length_preference_min integer,
  ADD COLUMN IF NOT EXISTS primary_goal_horizon text,
  ADD COLUMN IF NOT EXISTS equipment_profile jsonb,
  ADD COLUMN IF NOT EXISTS rpe_familiarity text,
  ADD COLUMN IF NOT EXISTS injury_considerations text;

UPDATE public.user_profile
SET depth_mode = 'guided'
WHERE depth_mode IS NULL;

ALTER TABLE public.user_profile
  ALTER COLUMN depth_mode SET DEFAULT 'guided',
  ALTER COLUMN depth_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profile_depth_mode_check'
  ) THEN
    ALTER TABLE public.user_profile
      ADD CONSTRAINT user_profile_depth_mode_check
      CHECK (depth_mode IN ('essential', 'guided', 'advanced'));
  END IF;
END $$;
