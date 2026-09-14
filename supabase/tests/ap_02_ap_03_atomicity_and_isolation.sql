-- AP-02/AP-03 re-runnable atomicity, replay, conflict, lineage, and RLS proof.
-- Run only against an isolated Supabase database. All synthetic rows roll back.

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL client_min_messages = warning;

SELECT set_config('adaptivpush.user_1', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.user_2', '10000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.exercise_1', '20000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.exercise_2', '20000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.install_op_1', '30000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.install_op_2', '30000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.install_op_fail', '30000000-0000-4000-8000-000000000003', true);
SELECT set_config('adaptivpush.workout_op_1', '40000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.workout_op_fail', '40000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.draft_1', '50000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.day_1', '60000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.slot_1', '70000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.set_1', '80000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.set_2', '80000000-0000-4000-8000-000000000002', true);

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES
  (current_setting('adaptivpush.user_1')::uuid, 'authenticated', 'authenticated',
   'ap02-ap03-user1@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  (current_setting('adaptivpush.user_2')::uuid, 'authenticated', 'authenticated',
   'ap02-ap03-user2@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now());

SET LOCAL ROLE service_role;
INSERT INTO public.exercises (id, name, exercisedb_id)
VALUES
  (current_setting('adaptivpush.exercise_1')::uuid, 'AP fixture press', 'ap-fixture-press'),
  (current_setting('adaptivpush.exercise_2')::uuid, 'AP fixture row', 'ap-fixture-row');
RESET ROLE;

CREATE OR REPLACE FUNCTION pg_temp.install_payload(
  p_operation uuid,
  p_expected_program uuid DEFAULT NULL,
  p_name text DEFAULT 'Atomic Program',
  p_context jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'operationId', p_operation,
    'expectedActiveProgramId', p_expected_program,
    'artifact', jsonb_build_object(
      'name', p_name,
      'goal', 'general_fitness',
      'durationWeeks', 4,
      'daysPerWeek', 1,
      'source', CASE WHEN p_context IS NULL THEN 'manual' ELSE 'generated' END,
      'schemaVersion', 2,
      'catalogVersion', 'catalog-test-v1',
      'policyVersion', 'program-install-v2',
      'days', jsonb_build_array(jsonb_build_object(
        'dayId', current_setting('adaptivpush.day_1')::uuid,
        'weekNumber', 1,
        'dayIndex', 1,
        'orderInWeek', 1,
        'workoutName', 'Day 1',
        'estimatedDurationMin', 45,
        'isRestDay', false,
        'isDeloadWeek', false,
        'exercises', jsonb_build_array(jsonb_build_object(
          'slotId', current_setting('adaptivpush.slot_1')::uuid,
          'exerciseId', current_setting('adaptivpush.exercise_1')::uuid,
          'position', 1,
          'setCount', 4,
          'repRangeMin', 5,
          'repRangeMax', 8,
          'targetRpe', 7,
          'suggestedLoad', 0,
          'loadUnit', 'lb',
          'loadKind', 'bodyweight',
          'loadSide', 'external_total'
        ))
      )),
      'context', p_context
    )
  );
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_1'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT set_config(
  'adaptivpush.install_receipt_1',
  public.install_program_v2(pg_temp.install_payload(current_setting('adaptivpush.install_op_1')::uuid))::text,
  true
);
SELECT set_config(
  'adaptivpush.program_1',
  (current_setting('adaptivpush.install_receipt_1')::jsonb->>'programId'),
  true
);
SELECT set_config(
  'adaptivpush.revision_1',
  (current_setting('adaptivpush.install_receipt_1')::jsonb->>'revisionId'),
  true
);

DO $assert_install$
DECLARE replay jsonb;
DECLARE mismatch_denied boolean := false;
DECLARE conflict_denied boolean := false;
DECLARE affected integer;
BEGIN
  IF (SELECT count(*) FROM public.programs WHERE is_active) <> 1 THEN
    RAISE EXCEPTION 'atomic install did not produce exactly one active program';
  END IF;
  IF (SELECT count(*) FROM public.program_revisions WHERE program_id = current_setting('adaptivpush.program_1')::uuid) <> 1 THEN
    RAISE EXCEPTION 'install did not create one immutable revision';
  END IF;
  IF (SELECT count(*) FROM public.program_days WHERE program_id = current_setting('adaptivpush.program_1')::uuid) <> 1
     OR (SELECT count(*) FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
         WHERE pd.program_id = current_setting('adaptivpush.program_1')::uuid) <> 1 THEN
    RAISE EXCEPTION 'install hierarchy is incomplete';
  END IF;
  replay := public.install_program_v2(pg_temp.install_payload(current_setting('adaptivpush.install_op_1')::uuid));
  IF replay->>'programId' <> current_setting('adaptivpush.program_1') OR (replay->>'replayed')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'identical install replay did not return original receipt';
  END IF;
  BEGIN
    PERFORM public.install_program_v2(pg_temp.install_payload(
      current_setting('adaptivpush.install_op_1')::uuid, NULL, 'Changed payload'));
  EXCEPTION WHEN OTHERS THEN
    mismatch_denied := SQLERRM LIKE '%operation_payload_mismatch%';
  END;
  IF NOT mismatch_denied THEN RAISE EXCEPTION 'operation id payload mismatch was accepted'; END IF;
  BEGIN
    PERFORM public.install_program_v2(pg_temp.install_payload(
      current_setting('adaptivpush.install_op_2')::uuid, NULL, 'Concurrent loser'));
  EXCEPTION WHEN OTHERS THEN conflict_denied := SQLERRM LIKE '%stale_revision%';
  END;
  IF NOT conflict_denied THEN RAISE EXCEPTION 'concurrent replacement did not return an explicit conflict'; END IF;
  UPDATE public.programs SET name='mutated v2 root' WHERE id=current_setting('adaptivpush.program_1')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'ordinary client mutated installed v2 program'; END IF;
  UPDATE public.program_day_exercises SET set_count=99
  WHERE program_revision_id=current_setting('adaptivpush.revision_1')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'ordinary client mutated immutable v2 prescription'; END IF;
  IF (SELECT count(*) FROM public.programs) <> 1 THEN RAISE EXCEPTION 'install replay duplicated a program'; END IF;
END
$assert_install$;

DO $assert_failed_replacement_atomic$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.install_program_v2(pg_temp.install_payload(
      current_setting('adaptivpush.install_op_fail')::uuid,
      current_setting('adaptivpush.program_1')::uuid,
      'Invalid generated context',
      '{"depth_mode":"invalid"}'::jsonb
    ));
  EXCEPTION WHEN OTHERS THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'invalid context unexpectedly installed'; END IF;
  IF (SELECT count(*) FROM public.programs WHERE is_active AND id=current_setting('adaptivpush.program_1')::uuid) <> 1 THEN
    RAISE EXCEPTION 'failed replacement did not preserve prior active program';
  END IF;
  IF (SELECT count(*) FROM public.programs) <> 1 THEN RAISE EXCEPTION 'failed replacement left partial hierarchy'; END IF;
END
$assert_failed_replacement_atomic$;

SELECT set_config(
  'adaptivpush.workout_payload',
  jsonb_build_object(
    'operationId', current_setting('adaptivpush.workout_op_1')::uuid,
    'draftId', current_setting('adaptivpush.draft_1')::uuid,
    'schemaVersion', 2,
    'revision', 2,
    'programDayId', (SELECT id FROM public.program_days WHERE program_id=current_setting('adaptivpush.program_1')::uuid),
    'prescriptionRevisionId', current_setting('adaptivpush.revision_1')::uuid,
    'workoutName', 'Day 1',
    'startedAt', '2026-09-10T12:00:00Z',
    'endedAt', '2026-09-10T12:15:00Z',
    'durationMin', 15,
    'timezone', 'America/New_York',
    'frozenPrescription', jsonb_build_object('revisionId', current_setting('adaptivpush.revision_1')),
    'slots', jsonb_build_array(jsonb_build_object(
      'slotId', current_setting('adaptivpush.slot_1')::uuid,
      'prescribedExerciseId', current_setting('adaptivpush.exercise_1')::uuid,
      'actualExerciseId', current_setting('adaptivpush.exercise_1')::uuid,
      'prescribedSetCount', 4,
      'requiresRecalibration', false,
      'sets', jsonb_build_array(jsonb_build_object(
        'setId', current_setting('adaptivpush.set_1')::uuid,
        'order', 1,
        'actualExerciseId', current_setting('adaptivpush.exercise_1')::uuid,
        'actualReps', 8,
        'actualLoad', 0,
        'actualRpe', 7,
        'loadUnit', 'lb',
        'loadKind', 'bodyweight',
        'loadSide', 'external_total',
        'logged', true,
        'loggedAt', '2026-09-10T12:05:00Z'
      ))
    ))
  )::text,
  true
);

SELECT set_config(
  'adaptivpush.workout_receipt_1',
  public.finalize_workout_v2(current_setting('adaptivpush.workout_payload')::jsonb)::text,
  true
);

DO $assert_workout$
DECLARE replay jsonb;
BEGIN
  replay := public.finalize_workout_v2(current_setting('adaptivpush.workout_payload')::jsonb);
  IF replay->>'sessionId' <> (current_setting('adaptivpush.workout_receipt_1')::jsonb->>'sessionId')
     OR (replay->>'replayed')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'response-loss replay did not return original workout receipt';
  END IF;
  IF (SELECT count(*) FROM public.workout_sessions WHERE operation_id=current_setting('adaptivpush.workout_op_1')::uuid) <> 1
     OR (SELECT count(*) FROM public.workout_exercise_sets WHERE session_id=(replay->>'sessionId')::uuid) <> 1 THEN
    RAISE EXCEPTION 'workout replay duplicated session or sets';
  END IF;
  IF (SELECT count(*) FROM public.workout_receipt_effects WHERE workout_session_id=(replay->>'sessionId')::uuid) <> 3 THEN
    RAISE EXCEPTION 'durable receipt effects were missing or duplicated';
  END IF;
  IF (SELECT completion_class FROM public.workout_sessions WHERE id=(replay->>'sessionId')::uuid) <> 'partial' THEN
    RAISE EXCEPTION 'one of four sets was not classified partial';
  END IF;
  IF (SELECT load_value FROM public.workout_exercise_sets WHERE session_id=(replay->>'sessionId')::uuid) IS DISTINCT FROM 0::numeric THEN
    RAISE EXCEPTION 'zero load did not round trip as zero';
  END IF;
END
$assert_workout$;

DO $assert_mid_transaction_failure$
DECLARE payload jsonb;
DECLARE failed boolean := false;
BEGIN
  payload := jsonb_set(current_setting('adaptivpush.workout_payload')::jsonb, '{operationId}',
    to_jsonb(current_setting('adaptivpush.workout_op_fail')));
  payload := jsonb_set(payload, '{slots,0,sets}', jsonb_build_array(
    jsonb_build_object(
      'setId', current_setting('adaptivpush.set_2')::uuid, 'order', 1,
      'actualExerciseId', current_setting('adaptivpush.exercise_1')::uuid,
      'actualReps', 8, 'actualLoad', 10, 'loadUnit', 'lb', 'loadKind', 'external',
      'loadSide', 'external_total', 'logged', true, 'loggedAt', now()
    ),
    jsonb_build_object(
      'setId', current_setting('adaptivpush.set_2')::uuid, 'order', 2,
      'actualExerciseId', current_setting('adaptivpush.exercise_1')::uuid,
      'actualReps', 8, 'actualLoad', 10, 'loadUnit', 'lb', 'loadKind', 'external',
      'loadSide', 'external_total', 'logged', true, 'loggedAt', now()
    )
  ));
  BEGIN
    PERFORM public.finalize_workout_v2(payload);
  EXCEPTION WHEN unique_violation THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'duplicate set identity did not fail'; END IF;
  IF EXISTS (SELECT 1 FROM public.workout_sessions WHERE operation_id=current_setting('adaptivpush.workout_op_fail')::uuid) THEN
    RAISE EXCEPTION 'failure after session insert left a finalized session';
  END IF;
END
$assert_mid_transaction_failure$;

DO $assert_archive_restore$
DECLARE original_start date;
DECLARE sessions_before integer;
BEGIN
  SELECT start_date INTO original_start FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid;
  SELECT count(*) INTO sessions_before FROM public.workout_sessions;
  PERFORM public.archive_program_v2(
    '90000000-0000-4000-8000-000000000001'::uuid,
    current_setting('adaptivpush.program_1')::uuid,
    1,
    '{"week":1}'::jsonb
  );
  IF EXISTS (SELECT 1 FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid AND is_active) THEN
    RAISE EXCEPTION 'archive left program active';
  END IF;
  PERFORM public.restore_program_v2(
    '90000000-0000-4000-8000-000000000002'::uuid,
    current_setting('adaptivpush.program_1')::uuid,
    'exact',
    NULL
  );
  IF (SELECT start_date FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid) IS DISTINCT FROM original_start THEN
    RAISE EXCEPTION 'exact restore rewrote start date';
  END IF;
  PERFORM public.archive_program_v2(
    '90000000-0000-4000-8000-000000000003'::uuid,
    current_setting('adaptivpush.program_1')::uuid,
    1,
    '{"week":4}'::jsonb
  );
  PERFORM public.restore_program_v2(
    '90000000-0000-4000-8000-000000000004'::uuid,
    current_setting('adaptivpush.program_1')::uuid,
    'restart',
    NULL
  );
  IF (SELECT start_date FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid) <> current_date THEN
    RAISE EXCEPTION 'deliberate restart did not begin at current date';
  END IF;
  IF (SELECT count(*) FROM public.workout_sessions) <> sessions_before THEN
    RAISE EXCEPTION 'archive/restore replayed or removed workout history';
  END IF;
END
$assert_archive_restore$;

SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_2'), true);
SET LOCAL ROLE authenticated;
DO $assert_owner_isolation$
DECLARE denied boolean := false;
DECLARE foreign_payload jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid)
     OR EXISTS (SELECT 1 FROM public.program_revisions WHERE id=current_setting('adaptivpush.revision_1')::uuid)
     OR EXISTS (SELECT 1 FROM public.workout_sessions WHERE operation_id=current_setting('adaptivpush.workout_op_1')::uuid) THEN
    RAISE EXCEPTION 'owner two read owner one durable data';
  END IF;
  foreign_payload := jsonb_set(current_setting('adaptivpush.workout_payload')::jsonb, '{operationId}',
    '"40000000-0000-4000-8000-000000000099"'::jsonb);
  BEGIN
    PERFORM public.finalize_workout_v2(foreign_payload);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%forbidden%';
  END;
  IF NOT denied THEN RAISE EXCEPTION 'owner two finalized owner one prescription'; END IF;
END
$assert_owner_isolation$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_1'), true);
SET LOCAL ROLE authenticated;
DO $assert_release_payloads$
DECLARE payload jsonb; v_test_receipt jsonb; denied boolean := false;
BEGIN
  payload := jsonb_set(current_setting('adaptivpush.workout_payload')::jsonb, '{operationId}', to_jsonb(gen_random_uuid()));
  payload := jsonb_set(payload, '{slots,0,prescribedSetCount}', '1');
  BEGIN PERFORM public.finalize_workout_v2(payload);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%prescription lineage%'; END;
  IF NOT denied THEN RAISE EXCEPTION 'client reduced planned count to forge completion'; END IF;

  payload := jsonb_set(current_setting('adaptivpush.workout_payload')::jsonb, '{operationId}', to_jsonb(gen_random_uuid()));
  payload := jsonb_set(payload, '{slots,0,sets,0,loadKind}', '"assistance"');
  payload := jsonb_set(payload, '{slots,0,sets,0,actualLoad}', '25');
  v_test_receipt := public.finalize_workout_v2(payload);
  IF (SELECT total_volume_lb FROM public.workout_sessions WHERE id=(v_test_receipt->>'sessionId')::uuid) <> 0
    OR (SELECT load_value FROM public.workout_exercise_sets WHERE session_id=(v_test_receipt->>'sessionId')::uuid) <> 25
    OR (SELECT load_kind FROM public.workout_exercise_sets WHERE session_id=(v_test_receipt->>'sessionId')::uuid) <> 'assistance' THEN
    RAISE EXCEPTION 'assistance was misclassified as external volume';
  END IF;
  payload := jsonb_set(payload, '{operationId}', to_jsonb(gen_random_uuid()));
  payload := jsonb_set(payload, '{slots,0,sets,0,loadKind}', '"external"');
  payload := jsonb_set(payload, '{slots,0,sets,0,loadUnit}', '"kg"');
  v_test_receipt := public.finalize_workout_v2(payload);
  IF abs((SELECT weight_lb FROM public.workout_exercise_sets WHERE session_id=(v_test_receipt->>'sessionId')::uuid) - 55.115565545) > 0.01
    OR (SELECT load_value FROM public.workout_exercise_sets WHERE session_id=(v_test_receipt->>'sessionId')::uuid) <> 25 THEN
    RAISE EXCEPTION 'kilograms were relabeled as pounds or raw load was changed';
  END IF;
  PERFORM public.archive_program_v2('90000000-0000-4000-8000-000000000050', current_setting('adaptivpush.program_1')::uuid, 1, '{"week":1}');
END
$assert_release_payloads$;
RESET ROLE;
-- Simulate time spent archived without waiting or changing the server clock.
UPDATE public.programs SET start_date=current_date-20,
  archive_checkpoint=jsonb_set(jsonb_set(archive_checkpoint, '{archivedAt}', to_jsonb((now()-interval '14 days')::text)), '{elapsedDays}', '6')
WHERE id=current_setting('adaptivpush.program_1')::uuid;
SET LOCAL ROLE authenticated;
DO $assert_exact_placement$
BEGIN
  PERFORM public.restore_program_v2('90000000-0000-4000-8000-000000000051', current_setting('adaptivpush.program_1')::uuid, 'exact', NULL);
  IF (SELECT start_date FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid) <> current_date-20
    OR (SELECT (archive_checkpoint->>'elapsedDays')::integer FROM public.programs WHERE id=current_setting('adaptivpush.program_1')::uuid) <> 6 THEN
    RAISE EXCEPTION 'time archived advanced the exact checkpoint';
  END IF;
END
$assert_exact_placement$;
RESET ROLE;
-- A V1 program archived by the V2 command must never gain exact revision provenance.
INSERT INTO public.programs(id,user_id,name,duration_weeks,days_per_week,is_active,start_date)
VALUES ('a9000000-0000-4000-8000-000000000001',current_setting('adaptivpush.user_1')::uuid,'Legacy checkpoint fixture',4,1,false,current_date-8);
SET LOCAL ROLE authenticated;
DO $assert_legacy_checkpoint$
DECLARE denied boolean := false;
BEGIN
  PERFORM public.archive_program_v2(gen_random_uuid(),'a9000000-0000-4000-8000-000000000001',1,'{"week":2}');
  IF (SELECT archive_checkpoint_provenance FROM public.programs WHERE id='a9000000-0000-4000-8000-000000000001') <> 'legacy_approximate' THEN
    RAISE EXCEPTION 'legacy archive gained false exact provenance';
  END IF;
  BEGIN
    PERFORM public.restore_program_v2(gen_random_uuid(),'a9000000-0000-4000-8000-000000000001','exact',current_setting('adaptivpush.program_1')::uuid);
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%exact_checkpoint_unavailable%'; END;
  IF NOT denied THEN RAISE EXCEPTION 'legacy program falsely restored exactly'; END IF;
END
$assert_legacy_checkpoint$;
RESET ROLE;
ROLLBACK;
