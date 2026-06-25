-- Migration: Rename gif_url → image_url on exercises table
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: The column was misnamed — we store a general image URL, not
--          specifically a GIF. This also handles the case where migration 002
--          (which added gif_url) has or has not been applied yet.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'gif_url'
  ) THEN
    ALTER TABLE exercises RENAME COLUMN gif_url TO image_url;
  ELSE
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
  END IF;
END $$;
