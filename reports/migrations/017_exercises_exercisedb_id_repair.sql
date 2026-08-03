-- FABLE-5 / Migration 017
-- Purpose: reconcile the deployed exercise catalog with the repository's
-- ExerciseDB identifier contract after migration 005 was skipped live.

BEGIN;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS exercisedb_id text;

UPDATE public.exercises
SET exercisedb_id = substring(image_url FROM 'exerciseId=([^&]+)')
WHERE exercisedb_id IS NULL
  AND image_url LIKE '%exerciseId=%';

UPDATE public.exercises
SET exercisedb_id = substring(image_url FROM '/image/([^/?]+)')
WHERE exercisedb_id IS NULL
  AND image_url LIKE '%/image/%';

CREATE INDEX IF NOT EXISTS exercises_exercisedb_id_idx
  ON public.exercises (exercisedb_id)
  WHERE exercisedb_id IS NOT NULL;

COMMIT;
