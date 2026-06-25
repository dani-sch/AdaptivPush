-- Migration: Add exercisedb_id to exercises table and backfill from stored image_url
-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercisedb_id TEXT;

-- Backfill from RapidAPI URL format: ...exerciseId=0001&resolution=...
UPDATE exercises
SET exercisedb_id = REGEXP_REPLACE(image_url, '.*exerciseId=([^&]+).*', '\1')
WHERE image_url LIKE '%exerciseId=%'
  AND exercisedb_id IS NULL;

-- Backfill from CDN URL format: .../image/0001
UPDATE exercises
SET exercisedb_id = REGEXP_REPLACE(image_url, '.*/image/([^/?]+).*', '\1')
WHERE image_url LIKE '%/image/%'
  AND image_url NOT LIKE '%exerciseId=%'
  AND exercisedb_id IS NULL;
