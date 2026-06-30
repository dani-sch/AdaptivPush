-- Phase 2 / Migration 008
-- Purpose: move coaching-critical adaptation preferences out of auth metadata.
-- Rollback note: revert readers to legacy auth metadata before retiring this table.

CREATE TABLE IF NOT EXISTS public.user_adaptation_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  readiness_enabled boolean NOT NULL DEFAULT true,
  readiness_checkin_mode text NOT NULL DEFAULT 'one_tap'
    CHECK (readiness_checkin_mode IN ('off', 'one_tap', 'guided', 'deep')),
  readiness_authority text NOT NULL DEFAULT 'moderate'
    CHECK (readiness_authority IN ('low', 'moderate', 'strong')),
  adaptation_aggressiveness text NOT NULL DEFAULT 'moderate'
    CHECK (adaptation_aggressiveness IN ('conservative', 'moderate', 'assertive')),
  cycle_support_enabled boolean NOT NULL DEFAULT false,
  symptom_tracking_enabled boolean NOT NULL DEFAULT false,
  wearables_enabled boolean NOT NULL DEFAULT false,
  wearables_priority text NOT NULL DEFAULT 'secondary'
    CHECK (wearables_priority IN ('secondary', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
