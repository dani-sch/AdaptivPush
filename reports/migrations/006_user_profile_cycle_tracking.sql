-- Migration: Add cycle tracking columns to user_profile
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Store period start date and cycle length for cycle-phase-aware
--          program generation and weekly progression adjustments.
--          cycle_enabled already exists; only the two date/length columns are new.

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS last_period_start_date date,
  ADD COLUMN IF NOT EXISTS avg_cycle_length_days  integer DEFAULT 28;
