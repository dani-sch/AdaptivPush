-- AP-01.3 re-runnable, non-persistent role and relationship proof.
-- Run only against an isolated Supabase database after applying all migrations.
-- Every synthetic row is rolled back.

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL client_min_messages = warning;

SELECT set_config('adaptivpush.test_user_1', '00000000-0000-4000-8000-000000000131', true);
SELECT set_config('adaptivpush.test_user_2', '00000000-0000-4000-8000-000000000132', true);

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    current_setting('adaptivpush.test_user_1')::uuid,
    'authenticated', 'authenticated', 'ap-01-3-user-1@example.invalid', '',
    '{"provider":"email","providers":["email"]}', '{"full_name":"AP 01.3 User 1"}',
    now(), now()
  ),
  (
    current_setting('adaptivpush.test_user_2')::uuid,
    'authenticated', 'authenticated', 'ap-01-3-user-2@example.invalid', '',
    '{"provider":"email","providers":["email"]}', '{"full_name":"AP 01.3 User 2"}',
    now(), now()
  );

DO $assert_signup_trigger$
BEGIN
  IF (
    SELECT count(*)
    FROM public.user_profile
    WHERE user_id IN (
      current_setting('adaptivpush.test_user_1')::uuid,
      current_setting('adaptivpush.test_user_2')::uuid
    )
  ) <> 2 THEN
    RAISE EXCEPTION 'auth.users signup trigger did not create both profiles';
  END IF;
END
$assert_signup_trigger$;

SET LOCAL ROLE service_role;
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.exercises (id, name, exercisedb_id)
VALUES
  ('00000000-0000-4000-8000-000000000161', 'AP 01.3 catalog fixture', 'ap-01-3-fixture'),
  ('00000000-0000-4000-8000-000000000162', 'AP 01.3 disposable fixture', 'ap-01-3-disposable');
UPDATE public.exercises
SET primary_muscle = 'verification'
WHERE id = '00000000-0000-4000-8000-000000000162';
DELETE FROM public.exercises
WHERE id = '00000000-0000-4000-8000-000000000162';

DO $assert_admin_catalog$
BEGIN
  IF (
    SELECT count(*)
    FROM public.exercises
    WHERE id = '00000000-0000-4000-8000-000000000161'
      AND exercisedb_id = 'ap-01-3-fixture'
  ) <> 1 THEN
    RAISE EXCEPTION 'trusted catalog curation did not persist the fixture';
  END IF;
END
$assert_admin_catalog$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $assert_anon_catalog$
DECLARE
  denied boolean;
BEGIN
  IF (SELECT count(*) FROM public.exercises) = 0 THEN
    RAISE EXCEPTION 'anonymous catalog SELECT returned no rows';
  END IF;

  denied := false;
  BEGIN
    INSERT INTO public.exercises (name) VALUES ('AP 01.3 anonymous mutation');
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'anonymous catalog INSERT was not denied';
  END IF;

  denied := false;
  BEGIN
    UPDATE public.exercises SET name = name WHERE false;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'anonymous catalog UPDATE was not denied';
  END IF;

  denied := false;
  BEGIN
    DELETE FROM public.exercises WHERE false;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'anonymous catalog DELETE was not denied';
  END IF;
END
$assert_anon_catalog$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('adaptivpush.test_user_1'),
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $assert_authenticated_catalog$
DECLARE
  denied boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.exercises) = 0 THEN
    RAISE EXCEPTION 'authenticated catalog SELECT returned no rows';
  END IF;

  BEGIN
    INSERT INTO public.exercises (name) VALUES ('AP 01.3 authenticated mutation');
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'authenticated catalog INSERT was not denied';
  END IF;
END
$assert_authenticated_catalog$;
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('adaptivpush.test_user_1'),
  true
);
SET LOCAL ROLE authenticated;
INSERT INTO public.programs (
  id, user_id, name, goal, duration_weeks, days_per_week, start_date, is_active
)
VALUES (
  '00000000-0000-4000-8000-000000000141',
  current_setting('adaptivpush.test_user_1')::uuid,
  'AP 01.3 generated-save fixture', 'verification', 4, 3, CURRENT_DATE, true
);
INSERT INTO public.program_days (
  id, program_id, week_number, day_index, order_in_week, workout_name
)
VALUES (
  '00000000-0000-4000-8000-000000000151',
  '00000000-0000-4000-8000-000000000141',
  1, 1, 1, 'Verification Day'
);
INSERT INTO public.program_day_exercises (
  id, program_day_id, exercise_id, position, set_count, rep_range_min, rep_range_max
)
VALUES (
  '00000000-0000-4000-8000-000000000181',
  '00000000-0000-4000-8000-000000000151',
  '00000000-0000-4000-8000-000000000161',
  1, 3, 8, 12
);
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('adaptivpush.test_user_2'),
  true
);
SET LOCAL ROLE authenticated;
INSERT INTO public.programs (
  id, user_id, name, goal, duration_weeks, days_per_week, start_date, is_active
)
VALUES (
  '00000000-0000-4000-8000-000000000142',
  current_setting('adaptivpush.test_user_2')::uuid,
  'AP 01.3 owner-two fixture', 'verification', 4, 3, CURRENT_DATE, true
);
INSERT INTO public.program_days (
  id, program_id, week_number, day_index, order_in_week, workout_name
)
VALUES (
  '00000000-0000-4000-8000-000000000152',
  '00000000-0000-4000-8000-000000000142',
  1, 1, 1, 'Owner Two Day'
);
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('adaptivpush.test_user_1'),
  true
);
SET LOCAL ROLE authenticated;
DO $assert_owner_isolation$
DECLARE
  affected_count integer;
  denied boolean := false;
BEGIN
  IF (
    SELECT count(*)
    FROM public.programs
    WHERE id = '00000000-0000-4000-8000-000000000142'
  ) <> 0 THEN
    RAISE EXCEPTION 'owner one could read owner two program';
  END IF;

  UPDATE public.programs
  SET name = 'cross-owner update'
  WHERE id = '00000000-0000-4000-8000-000000000142';
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'owner one could update owner two program';
  END IF;

  BEGIN
    INSERT INTO public.program_day_exercises (
      program_day_id, exercise_id, position, set_count, rep_range_min, rep_range_max
    )
    VALUES (
      '00000000-0000-4000-8000-000000000152',
      '00000000-0000-4000-8000-000000000161',
      1, 3, 8, 12
    );
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'owner one could write through owner two program day';
  END IF;
END
$assert_owner_isolation$;

INSERT INTO storage.objects (id, bucket_id, name, owner, owner_id)
VALUES (
  '00000000-0000-4000-8000-000000000171',
  'avatars',
  current_setting('adaptivpush.test_user_1') || '/ap-01-3.jpg',
  current_setting('adaptivpush.test_user_1')::uuid,
  current_setting('adaptivpush.test_user_1')
);
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('adaptivpush.test_user_2'),
  true
);
SET LOCAL ROLE authenticated;
DO $assert_storage_isolation$
DECLARE
  affected_count integer;
  denied boolean := false;
BEGIN
  IF (
    SELECT count(*)
    FROM storage.objects
    WHERE id = '00000000-0000-4000-8000-000000000171'
  ) <> 0 THEN
    RAISE EXCEPTION 'owner two could read owner one storage object';
  END IF;

  UPDATE storage.objects
  SET user_metadata = '{"attempt":"cross-owner"}'
  WHERE id = '00000000-0000-4000-8000-000000000171';
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'owner two could update owner one storage object';
  END IF;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
    VALUES (
      'avatars',
      current_setting('adaptivpush.test_user_1') || '/cross-owner.jpg',
      current_setting('adaptivpush.test_user_2')::uuid,
      current_setting('adaptivpush.test_user_2')
    );
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'owner two could insert into owner one storage folder';
  END IF;
END
$assert_storage_isolation$;
RESET ROLE;

DO $assert_database_shape$
BEGIN
  IF (
    SELECT count(*)
    FROM public.program_day_exercises
    WHERE id = '00000000-0000-4000-8000-000000000181'
      AND exercise_id = '00000000-0000-4000-8000-000000000161'
  ) <> 1 THEN
    RAISE EXCEPTION 'generated program relationship did not save with catalog UUID';
  END IF;

  BEGIN
    INSERT INTO public.exercises (name, exercisedb_id)
    VALUES ('AP 01.3 catalog fixture', 'ap-01-3-duplicate');
    RAISE EXCEPTION 'duplicate catalog name was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$assert_database_shape$;

ROLLBACK;
