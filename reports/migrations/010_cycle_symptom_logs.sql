-- Phase 2 / Migration 010
-- Purpose: add an optional privacy-forward cycle symptom log surface.
-- Rollback note: disable cycle-symptom writers before ignoring this table.

CREATE TABLE IF NOT EXISTS public.cycle_symptom_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  calendar_phase_context text NULL,
  cramps_level integer NULL,
  fatigue_level integer NULL,
  sleep_disruption_level integer NULL,
  mood_level integer NULL,
  pain_level integer NULL,
  motivation_level integer NULL,
  bloating_level integer NULL,
  period_started boolean NULL,
  notes text NULL,
  source text NOT NULL DEFAULT 'manual'
);

CREATE UNIQUE INDEX IF NOT EXISTS cycle_symptom_logs_user_date_idx
  ON public.cycle_symptom_logs (user_id, log_date);
