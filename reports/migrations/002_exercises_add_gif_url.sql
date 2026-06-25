-- Migration: Add gif_url column to exercises table
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Store exercise animation GIF URLs from ExerciseDB so the swap
--          modal can display them alongside exercise descriptions.
--
-- NOTE: After running this migration, re-run the seed script to backfill
--       gif_url on existing rows and fix the primary_muscle casing (was
--       stored as lowercase ExerciseDB bodyPart values; now mapped to the
--       app's Title Case MuscleGroup names).

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
