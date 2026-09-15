-- AP-03 immutable successor-revision exercise swap proof. Isolated/local only.
\set ON_ERROR_STOP on

BEGIN;
SET LOCAL client_min_messages = warning;

SELECT set_config('adaptivpush.user_1', '11000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.user_2', '11000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.exercise_1', '21000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.exercise_2', '21000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.exercise_3', '21000000-0000-4000-8000-000000000003', true);
SELECT set_config('adaptivpush.install_op', '31000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.revise_op', '31000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.stale_op', '31000000-0000-4000-8000-000000000003', true);
SELECT set_config('adaptivpush.fail_op', '31000000-0000-4000-8000-000000000004', true);
SELECT set_config('adaptivpush.day_1', '41000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.day_2', '41000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.day_3', '41000000-0000-4000-8000-000000000003', true);
SELECT set_config('adaptivpush.slot_1', '51000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.slot_2', '51000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.slot_3', '51000000-0000-4000-8000-000000000003', true);

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (current_setting('adaptivpush.user_1')::uuid, 'authenticated', 'authenticated',
   'ap03-revision-user1@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  (current_setting('adaptivpush.user_2')::uuid, 'authenticated', 'authenticated',
   'ap03-revision-user2@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now());

SET LOCAL ROLE service_role;
INSERT INTO public.exercises (id, name, exercisedb_id) VALUES
  (current_setting('adaptivpush.exercise_1')::uuid, 'Revision fixture press', 'revision-press'),
  (current_setting('adaptivpush.exercise_2')::uuid, 'Revision fixture fly', 'revision-fly'),
  (current_setting('adaptivpush.exercise_3')::uuid, 'Revision fixture row', 'revision-row');
RESET ROLE;

CREATE OR REPLACE FUNCTION pg_temp.program_payload() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'operationId', current_setting('adaptivpush.install_op'),
    'artifact', jsonb_build_object(
      'name', 'Revision Program', 'goal', 'strength', 'durationWeeks', 3, 'daysPerWeek', 1,
      'source', 'manual', 'schemaVersion', 2, 'catalogVersion', 'catalog-test-v1',
      'policyVersion', 'program-install-v2',
      'days', (
        SELECT jsonb_agg(jsonb_build_object(
          'dayId', day_id, 'weekNumber', week_number, 'dayIndex', 1, 'orderInWeek', 1,
          'workoutName', 'Day ' || week_number, 'estimatedDurationMin', 45,
          'isRestDay', false, 'isDeloadWeek', false,
          'exercises', jsonb_build_array(jsonb_build_object(
            'slotId', slot_id, 'exerciseId', current_setting('adaptivpush.exercise_1'),
            'position', 1, 'setCount', 1, 'repRangeMin', 5, 'repRangeMax', 8,
            'targetRpe', 7, 'suggestedLoad', 50, 'loadUnit', 'lb',
            'loadKind', 'external', 'loadSide', 'external_total'
          ))
        ) ORDER BY week_number)
        FROM (VALUES
          (1, current_setting('adaptivpush.day_1'), current_setting('adaptivpush.slot_1')),
          (2, current_setting('adaptivpush.day_2'), current_setting('adaptivpush.slot_2')),
          (3, current_setting('adaptivpush.day_3'), current_setting('adaptivpush.slot_3'))
        ) AS fixture(week_number, day_id, slot_id)
      ),
      'context', NULL
    )
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.revision_payload(
  p_operation uuid,
  p_program uuid,
  p_revision integer,
  p_revision_id uuid,
  p_replacement uuid,
  p_include_current boolean DEFAULT false
) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'operationId', p_operation, 'programId', p_program,
    'expectedRevision', p_revision, 'expectedRevisionId', p_revision_id,
    'currentStableDayId', current_setting('adaptivpush.day_1'),
    'currentStableSlotId', current_setting('adaptivpush.slot_1'),
    'originalExerciseId', current_setting('adaptivpush.exercise_1'),
    'replacementExerciseId', p_replacement,
    'includeCurrentDay', p_include_current
  );
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_1'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT set_config('adaptivpush.install_receipt', public.install_program_v2(pg_temp.program_payload())::text, true);
SELECT set_config('adaptivpush.program', current_setting('adaptivpush.install_receipt')::jsonb->>'programId', true);
SELECT set_config('adaptivpush.revision_1', current_setting('adaptivpush.install_receipt')::jsonb->>'revisionId', true);

-- Reuse the complete lineage/atomicity/owner suite for a migration-snapshot base.
-- Set adaptivpush.test_legacy_revision=on before this script for that variant.
RESET ROLE;
DO $legacy_variant$
BEGIN
  IF current_setting('adaptivpush.test_legacy_revision', true) = 'on' THEN
    UPDATE public.programs SET schema_version=1, source_origin='legacy'
      WHERE id=current_setting('adaptivpush.program')::uuid;
    UPDATE public.program_revisions SET schema_version=1, provenance='migration_snapshot',
      source_origin='migration_snapshot', catalog_version='catalog-unknown', policy_version='legacy-unknown'
      WHERE id=current_setting('adaptivpush.revision_1')::uuid;
  END IF;
END;
$legacy_variant$;
SET LOCAL ROLE authenticated;

-- A prior workout on week two makes that base day immutable for the future swap.
SELECT public.finalize_workout_v2(jsonb_build_object(
  'operationId', '61000000-0000-4000-8000-000000000001',
  'draftId', '62000000-0000-4000-8000-000000000001',
  'schemaVersion', 2, 'revision', 1,
  'programDayId', (SELECT id FROM public.program_days WHERE program_revision_id=current_setting('adaptivpush.revision_1')::uuid AND week_number=2),
  'prescriptionRevisionId', current_setting('adaptivpush.revision_1'),
  'workoutName', 'Day 2', 'startedAt', '2026-09-11T12:00:00Z',
  'endedAt', '2026-09-11T12:10:00Z', 'durationMin', 10, 'timezone', 'America/New_York',
  'frozenPrescription', jsonb_build_object('revisionId', current_setting('adaptivpush.revision_1')),
  'slots', jsonb_build_array(jsonb_build_object(
    'slotId', current_setting('adaptivpush.slot_2'),
    'prescribedExerciseId', current_setting('adaptivpush.exercise_1'),
    'actualExerciseId', current_setting('adaptivpush.exercise_1'),
    'prescribedSetCount', 1, 'requiresRecalibration', false,
    'sets', jsonb_build_array(jsonb_build_object(
      'setId', '63000000-0000-4000-8000-000000000001', 'order', 1,
      'actualExerciseId', current_setting('adaptivpush.exercise_1'), 'actualReps', 6,
      'actualLoad', 50, 'actualRpe', 7, 'loadUnit', 'lb', 'loadKind', 'external',
      'loadSide', 'external_total', 'logged', true, 'loggedAt', '2026-09-11T12:05:00Z'
    ))
  ))
));

DO $assert_catalog_and_lineage_validation$
DECLARE
  catalog_denied boolean := false;
  slot_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.revise_program_exercise_v2(pg_temp.revision_payload(
      '31000000-0000-4000-8000-000000000005'::uuid,
      current_setting('adaptivpush.program')::uuid,
      1,
      current_setting('adaptivpush.revision_1')::uuid,
      '21000000-0000-4000-8000-000000000099'::uuid
    ));
  EXCEPTION WHEN OTHERS THEN catalog_denied := SQLERRM LIKE '%unknown catalog exercise%'; END;

  BEGIN
    PERFORM public.revise_program_exercise_v2(
      pg_temp.revision_payload(
        '31000000-0000-4000-8000-000000000006'::uuid,
        current_setting('adaptivpush.program')::uuid,
        1,
        current_setting('adaptivpush.revision_1')::uuid,
        current_setting('adaptivpush.exercise_2')::uuid
      ) || jsonb_build_object('currentStableSlotId', current_setting('adaptivpush.slot_2'))
    );
  EXCEPTION WHEN OTHERS THEN slot_denied := SQLERRM LIKE '%stable slot or original exercise mismatch%'; END;

  IF NOT catalog_denied OR NOT slot_denied THEN
    RAISE EXCEPTION 'catalog or stable slot lineage validation did not reject invalid identity';
  END IF;
END;
$assert_catalog_and_lineage_validation$;

SELECT set_config(
  'adaptivpush.revise_receipt',
  public.revise_program_exercise_v2(pg_temp.revision_payload(
    current_setting('adaptivpush.revise_op')::uuid,
    current_setting('adaptivpush.program')::uuid,
    1,
    current_setting('adaptivpush.revision_1')::uuid,
    current_setting('adaptivpush.exercise_2')::uuid
  ))::text,
  true
);
SELECT set_config('adaptivpush.revision_2', current_setting('adaptivpush.revise_receipt')::jsonb->>'revisionId', true);

DO $assert_success_replay_conflict$
DECLARE
  replay jsonb;
  mismatch_denied boolean := false;
  stale_denied boolean := false;
  affected integer;
BEGIN
  IF (SELECT current_revision FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid) <> 2
     OR (SELECT count(*) FROM public.program_revisions WHERE program_id=current_setting('adaptivpush.program')::uuid) <> 2 THEN
    RAISE EXCEPTION 'successor did not advance exactly once';
  END IF;
  IF (current_setting('adaptivpush.revise_receipt')::jsonb->>'changedSlotCount')::integer <> 1 THEN
    RAISE EXCEPTION 'future revision changed the wrong number of slots';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
    WHERE pd.program_revision_id=current_setting('adaptivpush.revision_1')::uuid
      AND pde.exercise_id <> current_setting('adaptivpush.exercise_1')::uuid
  ) THEN RAISE EXCEPTION 'base revision was mutated'; END IF;
  IF (SELECT pde.exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
      WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.week_number=1)
      <> current_setting('adaptivpush.exercise_1')::uuid
     OR (SELECT pde.exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
      WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.week_number=2)
      <> current_setting('adaptivpush.exercise_1')::uuid
     OR (SELECT pde.exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
      WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.week_number=3)
      <> current_setting('adaptivpush.exercise_2')::uuid THEN
    RAISE EXCEPTION 'current/completed/future scope was not preserved';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
    WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.week_number=3
      AND pde.suggested_weight_lb IS NULL AND pde.per_set_weights_lb IS NULL
      AND pde.load_kind='unknown' AND pde.load_unit='none' AND pde.requires_recalibration
      AND pde.replaces_exercise_id=current_setting('adaptivpush.exercise_1')::uuid
  ) THEN RAISE EXCEPTION 'replacement was not reset for recalibration'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workout_sessions
    WHERE program_revision_id=current_setting('adaptivpush.revision_1')::uuid
  ) THEN RAISE EXCEPTION 'prior workout history lost base revision identity'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_revisions
    WHERE id=current_setting('adaptivpush.revision_2')::uuid
      AND payload_hash <> encode(extensions.digest(convert_to(snapshot::text, 'UTF8'), 'sha256'), 'hex')
  ) THEN RAISE EXCEPTION 'successor snapshot hash mismatch'; END IF;

  replay := public.revise_program_exercise_v2(pg_temp.revision_payload(
    current_setting('adaptivpush.revise_op')::uuid, current_setting('adaptivpush.program')::uuid,
    1, current_setting('adaptivpush.revision_1')::uuid, current_setting('adaptivpush.exercise_2')::uuid));
  IF (replay->>'replayed')::boolean IS NOT TRUE OR replay->>'revisionId' <> current_setting('adaptivpush.revision_2') THEN
    RAISE EXCEPTION 'identical revision replay did not return original receipt';
  END IF;
  IF (SELECT count(*) FROM public.program_revisions WHERE program_id=current_setting('adaptivpush.program')::uuid) <> 2 THEN
    RAISE EXCEPTION 'replay duplicated successor';
  END IF;
  BEGIN
    PERFORM public.revise_program_exercise_v2(pg_temp.revision_payload(
      current_setting('adaptivpush.revise_op')::uuid, current_setting('adaptivpush.program')::uuid,
      1, current_setting('adaptivpush.revision_1')::uuid, current_setting('adaptivpush.exercise_2')::uuid, true));
  EXCEPTION WHEN OTHERS THEN mismatch_denied := SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT mismatch_denied THEN RAISE EXCEPTION 'operation payload mismatch was accepted'; END IF;
  BEGIN
    PERFORM public.revise_program_exercise_v2(pg_temp.revision_payload(
      current_setting('adaptivpush.stale_op')::uuid, current_setting('adaptivpush.program')::uuid,
      1, current_setting('adaptivpush.revision_1')::uuid, current_setting('adaptivpush.exercise_2')::uuid));
  EXCEPTION WHEN OTHERS THEN stale_denied := SQLERRM LIKE '%stale_revision%'; END;
  IF NOT stale_denied THEN RAISE EXCEPTION 'stale revision did not conflict'; END IF;

  UPDATE public.program_day_exercises SET set_count=99
  WHERE program_revision_id=current_setting('adaptivpush.revision_2')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'ordinary client mutated successor rows'; END IF;
END
$assert_success_replay_conflict$;

RESET ROLE;
CREATE FUNCTION public.ap03_test_fail_successor_insert() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.exercise_id = current_setting('adaptivpush.exercise_3')::uuid THEN
    RAISE EXCEPTION 'injected successor failure';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ap03_test_fail_successor_insert
  BEFORE INSERT ON public.program_day_exercises
  FOR EACH ROW EXECUTE FUNCTION public.ap03_test_fail_successor_insert();
SET LOCAL ROLE authenticated;

DO $assert_atomic_failure$
DECLARE failed boolean := false;
BEGIN
  BEGIN
    PERFORM public.revise_program_exercise_v2(jsonb_build_object(
      'operationId', current_setting('adaptivpush.fail_op'),
      'programId', current_setting('adaptivpush.program'),
      'expectedRevision', 2, 'expectedRevisionId', current_setting('adaptivpush.revision_2'),
      'currentStableDayId', current_setting('adaptivpush.day_1'),
      'currentStableSlotId', current_setting('adaptivpush.slot_1'),
      'originalExerciseId', current_setting('adaptivpush.exercise_1'),
      'replacementExerciseId', current_setting('adaptivpush.exercise_3'),
      'includeCurrentDay', true
    ));
  EXCEPTION WHEN OTHERS THEN failed := SQLERRM LIKE '%injected successor failure%'; END;
  IF NOT failed THEN RAISE EXCEPTION 'injected successor failure did not fire'; END IF;
  IF (SELECT current_revision FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid) <> 2
     OR (SELECT count(*) FROM public.program_revisions WHERE program_id=current_setting('adaptivpush.program')::uuid) <> 2 THEN
    RAISE EXCEPTION 'failed successor changed the active program';
  END IF;
END
$assert_atomic_failure$;

RESET ROLE;
DROP TRIGGER ap03_test_fail_successor_insert ON public.program_day_exercises;
DROP FUNCTION public.ap03_test_fail_successor_insert();

SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_2'), true);
SET LOCAL ROLE authenticated;
DO $assert_owner_isolation$
DECLARE denied boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.program_revision_command_receipts WHERE program_id=current_setting('adaptivpush.program')::uuid) THEN
    RAISE EXCEPTION 'another owner read revision receipts';
  END IF;
  BEGIN
    PERFORM public.revise_program_exercise_v2(jsonb_build_object(
      'operationId', '31000000-0000-4000-8000-000000000099',
      'programId', current_setting('adaptivpush.program'),
      'expectedRevision', 2, 'expectedRevisionId', current_setting('adaptivpush.revision_2'),
      'currentStableDayId', current_setting('adaptivpush.day_1'),
      'currentStableSlotId', current_setting('adaptivpush.slot_1'),
      'originalExerciseId', current_setting('adaptivpush.exercise_1'),
      'replacementExerciseId', current_setting('adaptivpush.exercise_2'),
      'includeCurrentDay', true
    ));
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%forbidden%'; END;
  IF NOT denied THEN RAISE EXCEPTION 'another owner revised the program'; END IF;
END
$assert_owner_isolation$;

RESET ROLE;
DO $legacy_provenance$
BEGIN
  IF current_setting('adaptivpush.test_legacy_revision', true) = 'on' THEN
    IF (SELECT schema_version FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid) <> 1
      OR (SELECT provenance FROM public.program_revisions WHERE id=current_setting('adaptivpush.revision_1')::uuid) <> 'migration_snapshot'
      OR EXISTS (SELECT 1 FROM public.program_revisions WHERE program_id=current_setting('adaptivpush.program')::uuid AND schema_version<>1) THEN
      RAISE EXCEPTION 'Legacy successor relabeled historical provenance';
    END IF;
  END IF;
END;
$legacy_provenance$;
ROLLBACK;
