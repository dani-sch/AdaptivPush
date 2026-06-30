-- Phase 2 / Migration 013
-- Purpose: persist reactive and scheduled deload recommendations as first-class objects.
-- Rollback note: turn off deload recommendation writers before cleanup.

CREATE TABLE IF NOT EXISTS public.deload_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number integer NULL,
  status text NOT NULL
    CHECK (status IN ('recommended', 'accepted', 'dismissed', 'applied', 'expired')),
  trigger_type text NOT NULL,
  reason_summary text NOT NULL,
  recommended_volume_factor numeric(4,2) NOT NULL DEFAULT 0.60,
  recommended_load_factor numeric(4,2) NOT NULL DEFAULT 0.90,
  preserve_skill_practice boolean NOT NULL DEFAULT true,
  target_days jsonb NULL,
  evidence_keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'adaptation_events'
      AND column_name = 'deload_recommendation_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'adaptation_events_deload_recommendation_id_fkey'
  ) THEN
    ALTER TABLE public.adaptation_events
      ADD CONSTRAINT adaptation_events_deload_recommendation_id_fkey
      FOREIGN KEY (deload_recommendation_id)
      REFERENCES public.deload_recommendations(id)
      ON DELETE SET NULL;
  END IF;
END $$;
