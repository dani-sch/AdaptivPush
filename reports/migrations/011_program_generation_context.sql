-- Phase 2 / Migration 011
-- Purpose: snapshot the generator decision context alongside each saved program.
-- Rollback note: treat this as additive history; disable snapshot writes before cleanup.

CREATE TABLE IF NOT EXISTS public.program_generation_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL UNIQUE REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  policy_version text NOT NULL,
  evidence_version text NOT NULL,
  depth_mode text NOT NULL
    CHECK (depth_mode IN ('essential', 'guided', 'advanced')),
  experience_level text NOT NULL,
  goal text NOT NULL,
  days_per_week integer NOT NULL,
  duration_weeks integer NOT NULL,
  session_length_target_min integer NULL,
  focus_muscle_groups jsonb NOT NULL,
  split_recommendation jsonb NOT NULL,
  volume_targets jsonb NOT NULL,
  readiness_strategy text NOT NULL,
  cycle_strategy text NOT NULL,
  warmup_strategy text NOT NULL,
  explanation_density text NOT NULL
    CHECK (explanation_density IN ('essential', 'guided', 'advanced')),
  input_snapshot jsonb NOT NULL,
  output_summary jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS program_generation_context_user_id_idx
  ON public.program_generation_context (user_id);
