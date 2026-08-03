-- FABLE-5 / Migration 016
-- Purpose: make the intentionally public avatar bucket match the app's actual
-- 400x400 JPEG upload contract and provide complete owner lifecycle policies.

BEGIN;

UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg']::text[]
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can select own objects" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can insert own objects" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can update own objects" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can delete own objects" ON storage.objects;

CREATE POLICY "Avatar owners can select own objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Avatar owners can insert own objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND storage.extension(name) = 'jpg'
  );

CREATE POLICY "Avatar owners can update own objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND storage.extension(name) = 'jpg'
  );

CREATE POLICY "Avatar owners can delete own objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

COMMIT;
