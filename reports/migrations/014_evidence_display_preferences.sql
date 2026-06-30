-- Phase 2 / Migration 014
-- Purpose: store explanation visibility controls outside auth metadata.
-- Rollback note: readers can fall back to user_profile.depth_mode defaults if this table is unused.

CREATE TABLE IF NOT EXISTS public.evidence_display_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verbosity text NOT NULL DEFAULT 'guided'
    CHECK (verbosity IN ('essential', 'guided', 'advanced')),
  show_evidence_badges boolean NOT NULL DEFAULT true,
  show_source_links boolean NOT NULL DEFAULT true,
  show_uncertainty_notes boolean NOT NULL DEFAULT false,
  auto_open_why_sheet boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
