-- Scoped removal transaction, historical lineage and compatibility regression.
-- Runs original correction fixture assertions before the removal packet.
-- One-occurrence swap and completed-workout correction proof. Local/isolated only.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL client_min_messages = warning;

SELECT set_config('adaptivpush.user_1', '91000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.user_2', '91000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.exercise_1', '92000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.exercise_2', '92000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.day_1', '93000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.day_2', '93000000-0000-4000-8000-000000000002', true);
SELECT set_config('adaptivpush.slot_1', '94000000-0000-4000-8000-000000000001', true);
SELECT set_config('adaptivpush.slot_2', '94000000-0000-4000-8000-000000000002', true);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  (current_setting('adaptivpush.user_1')::uuid, 'authenticated', 'authenticated', 'correction1@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  (current_setting('adaptivpush.user_2')::uuid, 'authenticated', 'authenticated', 'correction2@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now());
SET LOCAL ROLE service_role;
INSERT INTO public.exercises(id, name, exercisedb_id) VALUES
  (current_setting('adaptivpush.exercise_1')::uuid, 'Correction fixture press', 'correction-fixture-press'),
  (current_setting('adaptivpush.exercise_2')::uuid, 'Correction fixture row', 'correction-fixture-row');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_1'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT set_config('adaptivpush.install_receipt', public.install_program_v2(jsonb_build_object(
  'operationId', '95000000-0000-4000-8000-000000000001',
  'artifact', jsonb_build_object(
    'name', 'Correction Program', 'goal', 'strength', 'durationWeeks', 2, 'daysPerWeek', 1,
    'source', 'manual', 'schemaVersion', 2, 'catalogVersion', 'test-v1', 'policyVersion', 'program-install-v2',
    'days', jsonb_build_array(
      jsonb_build_object('dayId', current_setting('adaptivpush.day_1'), 'weekNumber', 1, 'dayIndex', 1, 'orderInWeek', 1, 'workoutName', 'Week 1', 'estimatedDurationMin', 30,
        'exercises', jsonb_build_array(jsonb_build_object('slotId', current_setting('adaptivpush.slot_1'), 'exerciseId', current_setting('adaptivpush.exercise_1'), 'position', 1, 'setCount', 2, 'repRangeMin', 5, 'repRangeMax', 8, 'targetRpe', 7, 'suggestedLoad', 20, 'loadKind', 'external', 'loadUnit', 'kg', 'loadSide', 'external_total'))),
      jsonb_build_object('dayId', current_setting('adaptivpush.day_2'), 'weekNumber', 2, 'dayIndex', 1, 'orderInWeek', 1, 'workoutName', 'Week 2', 'estimatedDurationMin', 30,
        'exercises', jsonb_build_array(jsonb_build_object('slotId', current_setting('adaptivpush.slot_2'), 'exerciseId', current_setting('adaptivpush.exercise_1'), 'position', 1, 'setCount', 2, 'repRangeMin', 5, 'repRangeMax', 8, 'targetRpe', 7, 'suggestedLoad', 20, 'loadKind', 'external', 'loadUnit', 'kg', 'loadSide', 'external_total')))
    ), 'context', NULL
  )
))::text, true);
SELECT set_config('adaptivpush.program', current_setting('adaptivpush.install_receipt')::jsonb->>'programId', true);
SELECT set_config('adaptivpush.revision_1', current_setting('adaptivpush.install_receipt')::jsonb->>'revisionId', true);

SELECT set_config('adaptivpush.swap_receipt', public.revise_program_exercise_occurrence_v1(jsonb_build_object(
  'operationId', '95000000-0000-4000-8000-000000000002', 'programId', current_setting('adaptivpush.program'),
  'expectedRevision', 1, 'expectedRevisionId', current_setting('adaptivpush.revision_1'),
  'currentStableDayId', current_setting('adaptivpush.day_1'), 'currentStableSlotId', current_setting('adaptivpush.slot_1'),
  'originalExerciseId', current_setting('adaptivpush.exercise_1'), 'replacementExerciseId', current_setting('adaptivpush.exercise_2')
))::text, true);
SELECT set_config('adaptivpush.revision_2', current_setting('adaptivpush.swap_receipt')::jsonb->>'revisionId', true);
DO $assert_occurrence$
BEGIN
  IF (SELECT exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
      WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.stable_day_id=current_setting('adaptivpush.day_1')::uuid)
      <> current_setting('adaptivpush.exercise_2')::uuid THEN RAISE EXCEPTION 'selected occurrence did not change'; END IF;
  IF (SELECT exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
      WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.stable_day_id=current_setting('adaptivpush.day_2')::uuid)
      <> current_setting('adaptivpush.exercise_1')::uuid THEN RAISE EXCEPTION 'later occurrence changed during selected-only swap'; END IF;
  IF (SELECT set_count FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id
      WHERE pd.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND pd.stable_day_id=current_setting('adaptivpush.day_1')::uuid) <> 2
      THEN RAISE EXCEPTION 'swap changed prescribed sets'; END IF;
END $assert_occurrence$;

-- The source slot was already replaced for this occurrence. Future matching follows
-- its immutable slot lineage, and replaying a second swap must not create a revision.
SELECT set_config('adaptivpush.repeat_payload', jsonb_build_object(
  'operationId', '95000000-0000-4000-8000-000000000010', 'programId', current_setting('adaptivpush.program'),
  'expectedRevision', 2, 'expectedRevisionId', current_setting('adaptivpush.revision_2'),
  'currentStableDayId', current_setting('adaptivpush.day_1'), 'currentStableSlotId', current_setting('adaptivpush.slot_1'),
  'originalExerciseId', current_setting('adaptivpush.exercise_2'), 'replacementExerciseId', current_setting('adaptivpush.exercise_1'), 'includeCurrentDay', true
)::text, true);
SELECT set_config('adaptivpush.repeat_receipt', public.revise_program_exercise_v2(current_setting('adaptivpush.repeat_payload')::jsonb)::text, true);
SELECT set_config('adaptivpush.repeat_payload', jsonb_build_object(
  'operationId', '95000000-0000-4000-8000-000000000011', 'programId', current_setting('adaptivpush.program'),
  'expectedRevision', 3, 'expectedRevisionId', current_setting('adaptivpush.repeat_receipt')::jsonb->>'revisionId',
  'currentStableDayId', current_setting('adaptivpush.day_1'), 'currentStableSlotId', current_setting('adaptivpush.slot_1'),
  'originalExerciseId', current_setting('adaptivpush.exercise_1'), 'replacementExerciseId', current_setting('adaptivpush.exercise_2'), 'includeCurrentDay', true
)::text, true);
SELECT set_config('adaptivpush.repeat_receipt', public.revise_program_exercise_v2(current_setting('adaptivpush.repeat_payload')::jsonb)::text, true);
SELECT set_config('adaptivpush.revision_2', current_setting('adaptivpush.repeat_receipt')::jsonb->>'revisionId', true);
DO $repeat_swap$
BEGIN
  IF NOT (public.revise_program_exercise_v2(current_setting('adaptivpush.repeat_payload')::jsonb)->>'replayed')::boolean THEN RAISE EXCEPTION 'repeat swap replay failed'; END IF;
  IF (SELECT current_revision FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid) <> 4 THEN RAISE EXCEPTION 'duplicate swap revision'; END IF;
  IF EXISTS (SELECT 1 FROM public.program_day_exercises pde WHERE pde.program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND exercise_id<>current_setting('adaptivpush.exercise_2')::uuid) THEN RAISE EXCEPTION 'second swap did not reach future slots'; END IF;
END $repeat_swap$;

SELECT set_config('adaptivpush.session_receipt', public.finalize_workout_v2(jsonb_build_object(
  'operationId', '95000000-0000-4000-8000-000000000003', 'draftId', '96000000-0000-4000-8000-000000000001',
  'schemaVersion', 2, 'revision', 1,
  'programDayId', (SELECT id FROM public.program_days WHERE program_revision_id=current_setting('adaptivpush.revision_2')::uuid AND stable_day_id=current_setting('adaptivpush.day_1')::uuid),
  'prescriptionRevisionId', current_setting('adaptivpush.revision_2'), 'workoutName', 'Week 1',
  'startedAt', '2026-09-15T12:00:00Z', 'endedAt', '2026-09-15T12:20:00Z', 'durationMin', 20, 'timezone', 'America/New_York',
  'frozenPrescription', jsonb_build_object('slots', jsonb_build_array(jsonb_build_object(
    'slotId', current_setting('adaptivpush.slot_1'), 'prescribedExerciseId', current_setting('adaptivpush.exercise_2'), 'prescribedSetCount', 2,
    'sets', jsonb_build_array(
      jsonb_build_object('setId', '97000000-0000-4000-8000-000000000001', 'order', 1),
      jsonb_build_object('setId', '97000000-0000-4000-8000-000000000002', 'order', 2)
    )))),
  'slots', jsonb_build_array(jsonb_build_object(
    'slotId', current_setting('adaptivpush.slot_1'), 'prescribedExerciseId', current_setting('adaptivpush.exercise_2'), 'actualExerciseId', current_setting('adaptivpush.exercise_2'), 'prescribedSetCount', 2,
    'sets', jsonb_build_array(jsonb_build_object('setId', '97000000-0000-4000-8000-000000000001', 'order', 1, 'logged', true, 'actualExerciseId', current_setting('adaptivpush.exercise_2'), 'actualReps', 8, 'actualLoad', 20, 'loadUnit', 'kg', 'loadKind', 'external', 'loadSide', 'external_total', 'actualRpe', 8, 'loggedAt', '2026-09-15T12:10:00Z'))
  ))
))::text, true);
SELECT set_config('adaptivpush.session', current_setting('adaptivpush.session_receipt')::jsonb->>'sessionId', true);

SELECT set_config('adaptivpush.correction_payload', jsonb_build_object(
  'schemaVersion', 1, 'operationId', '95000000-0000-4000-8000-000000000004', 'sessionId', current_setting('adaptivpush.session'), 'expectedRevision', 0,
  'sets', jsonb_build_array(
    jsonb_build_object('actualSetId', '97000000-0000-4000-8000-000000000001', 'prescriptionSlotId', current_setting('adaptivpush.slot_1'), 'prescribedExerciseId', current_setting('adaptivpush.exercise_2'), 'exerciseId', current_setting('adaptivpush.exercise_2'), 'order', 1, 'reps', 10, 'loadValue', 25, 'loadUnit', 'kg', 'loadKind', 'external', 'loadSide', 'external_total', 'rpe', 9, 'loggedAt', '2026-09-15T12:10:00Z'),
    jsonb_build_object('actualSetId', '97000000-0000-4000-8000-000000000002', 'prescriptionSlotId', current_setting('adaptivpush.slot_1'), 'prescribedExerciseId', current_setting('adaptivpush.exercise_2'), 'exerciseId', current_setting('adaptivpush.exercise_1'), 'order', 2, 'reps', 6, 'loadValue', NULL, 'loadUnit', 'none', 'loadKind', 'bodyweight', 'loadSide', 'unknown', 'rpe', 7, 'loggedAt', '2026-09-15T12:15:00Z')
  )
)::text, true);
SELECT set_config('adaptivpush.correction_receipt', public.correct_completed_workout_v1(current_setting('adaptivpush.correction_payload')::jsonb)::text, true);
DO $assert_correction$
DECLARE replay jsonb; stale boolean := false;
BEGIN
  replay := public.correct_completed_workout_v1(current_setting('adaptivpush.correction_payload')::jsonb);
  IF NOT (replay->>'replayed')::boolean THEN RAISE EXCEPTION 'correction retry did not replay'; END IF;
  IF (SELECT correction_revision FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid) <> 1
     OR (SELECT count(*) FROM public.workout_exercise_sets WHERE session_id=current_setting('adaptivpush.session')::uuid) <> 2
     OR (SELECT completion_class FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid) <> 'complete' THEN
    RAISE EXCEPTION 'corrected effective workout state is wrong';
  END IF;
  BEGIN
    PERFORM public.correct_completed_workout_v1(jsonb_set(current_setting('adaptivpush.correction_payload')::jsonb, '{operationId}', '"95000000-0000-4000-8000-000000000005"'));
  EXCEPTION WHEN OTHERS THEN stale := SQLERRM LIKE '%stale_revision%'; END;
  IF NOT stale THEN RAISE EXCEPTION 'stale correction was not rejected'; END IF;
END $assert_correction$;

RESET ROLE;
DO $assert_internal_audit$
BEGIN
  IF (SELECT count(*) FROM public.workout_correction_audit WHERE workout_session_id=current_setting('adaptivpush.session')::uuid) <> 1 THEN
    RAISE EXCEPTION 'correction audit was not written exactly once';
  END IF;
END $assert_internal_audit$;
-- One extra performed set cannot replace an unperformed prescribed slot.
SELECT set_config('adaptivpush.partial_correction', jsonb_build_object(
  'schemaVersion', 1, 'operationId', '95000000-0000-4000-8000-000000000012', 'sessionId', current_setting('adaptivpush.session'), 'expectedRevision', 1,
  'sets', jsonb_build_array(
    current_setting('adaptivpush.correction_payload')::jsonb->'sets'->0,
    jsonb_set(jsonb_set(current_setting('adaptivpush.correction_payload')::jsonb->'sets'->1, '{order}', '3'), '{actualSetId}', '"97000000-0000-4000-8000-000000000003"')
  ),
  'setOutcomes', jsonb_build_array(jsonb_build_object('setId', '97000000-0000-4000-8000-000000000002', 'slotId', current_setting('adaptivpush.slot_1'), 'order', 2, 'outcome', 'skipped'))
)::text, true);
SELECT public.correct_completed_workout_v1(current_setting('adaptivpush.partial_correction')::jsonb);
DO $partial_outcomes$
BEGIN
  IF (SELECT completion_class FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid) <> 'partial' THEN RAISE EXCEPTION 'extra set hid incomplete prescribed work'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workout_sessions ws,
    jsonb_array_elements(ws.prescription_snapshot->'setOutcomes') outcome
    WHERE ws.id=current_setting('adaptivpush.session')::uuid
      AND outcome->>'setId'='97000000-0000-4000-8000-000000000002' AND outcome->>'outcome'='skipped') THEN RAISE EXCEPTION 'skip not persisted'; END IF;
  IF (SELECT count(*) FROM public.workout_sessions WHERE user_id=current_setting('adaptivpush.user_1')::uuid) <> 1 THEN RAISE EXCEPTION 'correction duplicated session'; END IF;
  IF (SELECT current_revision FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid) <> 4 THEN RAISE EXCEPTION 'correction replayed advancement'; END IF;
  IF public.workout_correction_capability_v1() <> 2 THEN RAISE EXCEPTION 'capability version mismatch'; END IF;
END $partial_outcomes$;

SET LOCAL ROLE authenticated;
DO $correction_validation$
DECLARE base jsonb; bad jsonb; rejected boolean; modification jsonb;
BEGIN
  base := current_setting('adaptivpush.correction_payload')::jsonb || jsonb_build_object('operationId', gen_random_uuid(), 'expectedRevision', 2);
  FOREACH modification IN ARRAY ARRAY[
    '{"loadKind":"external","loadUnit":"none"}'::jsonb,
    '{"loadKind":"bodyweight","loadUnit":"lb"}'::jsonb,
    '{"loadKind":"assistance","loadValue":null}'::jsonb,
    '{"loadValue":"NaN"}'::jsonb,
    jsonb_build_object('prescriptionSlotId', current_setting('adaptivpush.slot_2'))
  ] LOOP
    bad := jsonb_set(base, '{sets,0}', (base->'sets'->0) || modification);
    rejected := false;
    BEGIN PERFORM public.correct_completed_workout_v1(bad);
    EXCEPTION WHEN OTHERS THEN rejected := SQLERRM LIKE '%invalid_input%'; END;
    IF NOT rejected THEN RAISE EXCEPTION 'malformed load or cross-day lineage accepted'; END IF;
  END LOOP;
  bad := base || jsonb_build_object('setOutcomes', jsonb_build_array(jsonb_build_object(
    'setId', '97000000-0000-4000-8000-000000000001', 'slotId', current_setting('adaptivpush.slot_1'), 'order', 1, 'outcome', 'skipped')));
  rejected := false;
  BEGIN PERFORM public.correct_completed_workout_v1(bad);
  EXCEPTION WHEN OTHERS THEN rejected := SQLERRM LIKE '%invalid_input%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'contradictory outcome accepted'; END IF;
  IF (SELECT correction_revision FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid) <> 2 THEN
    RAISE EXCEPTION 'rejected correction changed revision'; END IF;
  BEGIN PERFORM 1 FROM public.workout_correction_audit; RAISE EXCEPTION 'client can read audit';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.correct_completed_workout_v1(base || jsonb_build_object('sets', '[]'::jsonb));
  IF (SELECT completion_class FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid) <> 'abandoned'
     OR EXISTS (SELECT 1 FROM public.workout_sessions ws, jsonb_array_elements(ws.prescription_snapshot->'setOutcomes') outcome
       WHERE ws.id=current_setting('adaptivpush.session')::uuid AND outcome->>'outcome' <> 'not_attempted') THEN
    RAISE EXCEPTION 'clear did not retain explicit unattempted prescription'; END IF;
END $correction_validation$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $anonymous_denial$
BEGIN
  BEGIN PERFORM public.workout_correction_capability_v1(); RAISE EXCEPTION 'anonymous capability access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.correct_completed_workout_v1('{}'::jsonb); RAISE EXCEPTION 'anonymous correction access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $anonymous_denial$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', current_setting('adaptivpush.user_2'), true);
SET LOCAL ROLE authenticated;
DO $assert_owner$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.correct_completed_workout_v1(jsonb_build_object('schemaVersion', 1, 'operationId', '95000000-0000-4000-8000-000000000006', 'sessionId', current_setting('adaptivpush.session'), 'expectedRevision', 1, 'sets', '[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN denied := SQLERRM LIKE '%forbidden%'; END;
  IF NOT denied THEN RAISE EXCEPTION 'another owner corrected workout'; END IF;
  IF EXISTS (SELECT 1 FROM public.workout_correction_receipts WHERE workout_session_id=current_setting('adaptivpush.session')::uuid) THEN
    RAISE EXCEPTION 'another owner read correction receipts';
  END IF;
END $assert_owner$;
RESET ROLE;
DO $removal_security$
DECLARE f regprocedure;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.workout_removal_capability_v1()'::regprocedure,'public.program_removal_state_v1(uuid)'::regprocedure,
    'public.preview_workout_removal_v1(uuid,uuid,uuid,integer)'::regprocedure,'public.finalize_workout_removals_v1(jsonb)'::regprocedure,'public.correct_workout_removals_v1(jsonb)'::regprocedure] LOOP
    IF has_function_privilege('anon',f,'EXECUTE') OR NOT has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION 'incorrect removal entrypoint grants: %',f; END IF;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['public.revise_program_removals_v1(jsonb)'::regprocedure,'public.workout_removal_targets(uuid,uuid,uuid,uuid,integer)'::regprocedure,'public.validate_workout_removals(jsonb,jsonb,jsonb,jsonb,uuid,uuid)'::regprocedure] LOOP
    IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION 'private removal helper accessible: %',f; END IF;
  END LOOP;
END $removal_security$;
SET LOCAL ROLE authenticated;
DO $removal_wrong_owner$
DECLARE denied boolean;
BEGIN
  denied:=false;
  BEGIN PERFORM public.preview_workout_removal_v1(current_setting('adaptivpush.program')::uuid,current_setting('adaptivpush.day_1')::uuid,current_setting('adaptivpush.slot_1')::uuid,1);
  EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE '%forbidden%'; END;
  IF NOT denied THEN RAISE EXCEPTION 'foreign preview accessible'; END IF;
  denied:=false;
  BEGIN PERFORM public.program_removal_state_v1(current_setting('adaptivpush.program')::uuid);
  EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE '%forbidden%'; END;
  IF NOT denied THEN RAISE EXCEPTION 'foreign removal masks accessible'; END IF;
END $removal_wrong_owner$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('adaptivpush.user_1'),true);
DO $shorter_and_ended$
DECLARE n integer;
BEGIN
  UPDATE public.program_day_exercises SET set_count=1 WHERE stable_slot_id=current_setting('adaptivpush.slot_2')::uuid;
  n:=(public.preview_workout_removal_v1(current_setting('adaptivpush.program')::uuid,current_setting('adaptivpush.day_1')::uuid,current_setting('adaptivpush.slot_1')::uuid,2)->>'futureCount')::integer;
  IF n<>0 THEN RAISE EXCEPTION 'shorter target substituted a different set'; END IF;
  UPDATE public.program_day_exercises SET set_count=2 WHERE stable_slot_id=current_setting('adaptivpush.slot_2')::uuid;
  UPDATE public.programs SET is_active=false WHERE id=current_setting('adaptivpush.program')::uuid;
  n:=(public.preview_workout_removal_v1(current_setting('adaptivpush.program')::uuid,current_setting('adaptivpush.day_1')::uuid,current_setting('adaptivpush.slot_1')::uuid,1)->>'futureCount')::integer;
  IF n<>0 THEN RAISE EXCEPTION 'ended program offered targets'; END IF;
  UPDATE public.programs SET is_active=true WHERE id=current_setting('adaptivpush.program')::uuid;
END $shorter_and_ended$;
SET LOCAL ROLE authenticated;
DO $removals$
DECLARE payload jsonb; result jsonb; replay jsonb; before_revision uuid; after_revision uuid; rejected boolean; n integer;
BEGIN
 SELECT current_revision_id INTO before_revision FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid;
 payload:=jsonb_build_object('schemaVersion',1,'operationId',gen_random_uuid(),'sessionId',current_setting('adaptivpush.session'),'expectedRevision',3,'sets','[]'::jsonb,
   'removals',jsonb_build_object('version',1,'slots','[]'::jsonb,'sets',jsonb_build_array(jsonb_build_object('slotId',current_setting('adaptivpush.slot_1'),'setId','97000000-0000-4000-8000-000000000002','order',2))),
   'programRemoval',jsonb_build_object('programId',current_setting('adaptivpush.program'),'expectedRevision',4,'expectedRevisionId',before_revision,'currentStableDayId',current_setting('adaptivpush.day_1'),
     'targets',jsonb_build_array(jsonb_build_object('slotId',current_setting('adaptivpush.slot_1'),'order',2))));
 n:=(public.preview_workout_removal_v1(current_setting('adaptivpush.program')::uuid,current_setting('adaptivpush.day_1')::uuid,current_setting('adaptivpush.slot_1')::uuid,2)->>'futureCount')::integer;
 IF n<>1 THEN RAISE EXCEPTION 'preview after repeated swaps lost original lineage: %',n; END IF;
 -- A stale future revision must roll back the session correction as well.
 rejected:=false;
 BEGIN PERFORM public.correct_workout_removals_v1(jsonb_set(payload,'{programRemoval,expectedRevision}','1'));
 EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision%'; END;
 IF NOT rejected OR (SELECT correction_revision FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid)<>3 THEN RAISE EXCEPTION 'partial correction committed'; END IF;
 result:=public.correct_workout_removals_v1(payload);
 replay:=public.correct_workout_removals_v1(payload);
 IF NOT (replay->>'replayed')::boolean OR (result->'programRemoval'->>'futureChangedSlotCount')::integer<>1 THEN RAISE EXCEPTION 'atomic removal replay/receipt wrong'; END IF;
 SELECT current_revision_id INTO after_revision FROM public.programs WHERE id=current_setting('adaptivpush.program')::uuid;
 IF after_revision=before_revision THEN RAISE EXCEPTION 'no successor revision'; END IF;
 IF (SELECT removal_mask->'orders' FROM public.program_day_exercises WHERE program_revision_id=after_revision AND stable_slot_id=current_setting('adaptivpush.slot_2')::uuid)<>'[2]'::jsonb THEN RAISE EXCEPTION 'wrong corresponding set'; END IF;
 IF EXISTS(SELECT 1 FROM public.program_day_exercises WHERE program_revision_id=before_revision AND removal_mask IS NOT NULL) THEN RAISE EXCEPTION 'immutable base changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workout_sessions WHERE id=current_setting('adaptivpush.session')::uuid AND prescription_snapshot->'removals'=payload->'removals' AND completion_class='abandoned') THEN RAISE EXCEPTION 'removal not durable/neutral'; END IF;
 -- Exact operation rejects changed payload; old clients cannot resurrect removed work.
 rejected:=false;
 BEGIN PERFORM public.correct_workout_removals_v1(payload||'{"sets":[{}]}'::jsonb); EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'replay payload changed'; END IF;
 rejected:=false;
 BEGIN PERFORM public.correct_completed_workout_v1(current_setting('adaptivpush.correction_payload')::jsonb||jsonb_build_object('operationId',gen_random_uuid(),'expectedRevision',4));
 EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%removed result%'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'old client resurrected removal'; END IF;
 -- Repeating an already removed future position truthfully changes only the occurrence.
 payload:=payload||jsonb_build_object('operationId',gen_random_uuid(),'expectedRevision',4);
 payload:=jsonb_set(payload,'{programRemoval,expectedRevision}','5');payload:=jsonb_set(payload,'{programRemoval,expectedRevisionId}',to_jsonb(after_revision));
 result:=public.correct_workout_removals_v1(payload);
 IF (result->'programRemoval'->>'futureChangedSlotCount')::integer<>0 THEN RAISE EXCEPTION 'repeat removed different set'; END IF;
 -- Final exercise removal leaves the future day non-rest and uncompleted.
 payload:=payload||jsonb_build_object('operationId',gen_random_uuid(),'expectedRevision',5);
 payload:=jsonb_set(payload,'{removals,slots}',jsonb_build_array(current_setting('adaptivpush.slot_1')));
 payload:=jsonb_set(payload,'{programRemoval,targets}',jsonb_build_array(jsonb_build_object('slotId',current_setting('adaptivpush.slot_1'),'order',NULL)));
 result:=public.correct_workout_removals_v1(payload);
 IF (result->'programRemoval'->>'futureChangedSlotCount')::integer<>1 THEN RAISE EXCEPTION 'exercise not removed'; END IF;
 IF EXISTS(SELECT 1 FROM public.program_days WHERE program_revision_id=(result->'programRemoval'->>'revisionId')::uuid AND is_rest_day) THEN RAISE EXCEPTION 'removal became rest'; END IF;
 IF (SELECT count(*) FROM public.workout_sessions WHERE user_id=current_setting('adaptivpush.user_1')::uuid)<>1 THEN RAISE EXCEPTION 'removal advanced/completed another day'; END IF;
-- A subsequent legacy swap clone must retain the removal mask.
 result:=public.revise_program_exercise_v2(jsonb_build_object('operationId',gen_random_uuid(),'programId',current_setting('adaptivpush.program'),
   'expectedRevision',6,'expectedRevisionId',result->'programRemoval'->>'revisionId','currentStableDayId',current_setting('adaptivpush.day_1'),
   'currentStableSlotId',current_setting('adaptivpush.slot_1'),'originalExerciseId',current_setting('adaptivpush.exercise_2'),'replacementExerciseId',current_setting('adaptivpush.exercise_1'),'includeCurrentDay',false));
 IF NOT EXISTS(SELECT 1 FROM public.program_day_exercises WHERE program_revision_id=(result->>'revisionId')::uuid AND stable_slot_id=current_setting('adaptivpush.slot_2')::uuid AND (removal_mask->>'removed')::boolean) THEN RAISE EXCEPTION 'subsequent swap resurrected removed exercise'; END IF;
END $removals$;
RESET ROLE;
ROLLBACK;
