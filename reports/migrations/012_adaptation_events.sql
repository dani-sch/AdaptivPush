-- Phase 2 / Migration 012
-- Purpose: add an explainability-safe event trail for future adaptation logic.
-- Rollback note: disable new emitters before ignoring this table.

CREATE TABLE IF NOT EXISTS public.adaptation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NULL REFERENCES public.programs(id) ON DELETE SET NULL,
  program_day_id uuid NULL REFERENCES public.program_days(id) ON DELETE SET NULL,
  workout_session_id uuid NULL REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  readiness_checkin_id uuid NULL REFERENCES public.readiness_checkins(id) ON DELETE SET NULL,
  cycle_symptom_log_id uuid NULL REFERENCES public.cycle_symptom_logs(id) ON DELETE SET NULL,
  deload_recommendation_id uuid NULL,
  event_type text NOT NULL,
  trigger_source text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  accepted boolean NULL,
  before_snapshot jsonb NULL,
  after_snapshot jsonb NULL,
  explanation_payload jsonb NOT NULL,
  evidence_keys jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS adaptation_events_user_occurred_at_idx
  ON public.adaptation_events (user_id, occurred_at DESC);
