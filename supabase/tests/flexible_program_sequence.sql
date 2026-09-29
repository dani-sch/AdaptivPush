-- Run against an isolated local database with the sequence migration applied.
-- Every fixture and assertion rolls back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL client_min_messages=warning;
INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES
('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','sequence-one@example.invalid','','{"provider":"email","providers":["email"]}','{}',now(),now()),
('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','sequence-two@example.invalid','','{"provider":"email","providers":["email"]}','{}',now(),now());
SET LOCAL ROLE service_role;
INSERT INTO public.exercises(id,name,exercisedb_id)
VALUES('a2000000-0000-4000-8000-000000000001','Sequence press','sequence-press'),
('a2000000-0000-4000-8000-000000000002','Sequence pull','sequence-pull');
RESET ROLE;
INSERT INTO public.workout_sessions(user_id,program_day_id,workout_name,started_at)
VALUES('a1000000-0000-4000-8000-000000000001',NULL,'Unlinked legacy',
  '2026-09-20T10:00:00Z');
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  owner_a uuid:='a1000000-0000-4000-8000-000000000001';
  owner_b uuid:='a1000000-0000-4000-8000-000000000002';
  ex uuid:='a2000000-0000-4000-8000-000000000001';
  replacement uuid:='a2000000-0000-4000-8000-000000000002';
  stable_a uuid:='a3000000-0000-4000-8000-000000000001';
  stable_b uuid:='a3000000-0000-4000-8000-000000000002';
  stable_rest uuid:='a3000000-0000-4000-8000-000000000003';
  slot_a uuid:='a4000000-0000-4000-8000-000000000001';
  slot_b uuid:='a4000000-0000-4000-8000-000000000002';
  set_one uuid:='a5000000-0000-4000-8000-000000000001';
  set_two uuid:='a5000000-0000-4000-8000-000000000002';
  installed jsonb;
  other_installed jsonb;
  init jsonb;
  request jsonb;
  changed jsonb;
  finish jsonb;
  payload jsonb;
  workout jsonb;
  frozen jsonb;
  corrected jsonb;
  correction_request jsonb;
  ad_hoc jsonb;
  ad_hoc_request jsonb;
  alternate jsonb;
  alternate_payload jsonb;
  alternate_op uuid;
  other_stable uuid;
  other_slot uuid;
  other_day uuid;
  other_revision uuid;
  pid uuid;
  other_pid uuid;
  rev uuid;
  day_id uuid;
  sid uuid;
  op uuid:=gen_random_uuid();
  actual jsonb;
  rejected boolean;
BEGIN
  installed:=public.install_program_v2(jsonb_build_object('operationId',gen_random_uuid(),
    'artifact',jsonb_build_object('name','Sequence SQL','goal','strength',
    'durationWeeks',1,'daysPerWeek',3,'source','manual','schemaVersion',2,
    'catalogVersion','test','policyVersion','program-install-v2',
    'days',jsonb_build_array(
      jsonb_build_object('dayId',stable_a,'weekNumber',1,'dayIndex',1,'orderInWeek',1,
        'workoutName','A','estimatedDurationMin',30,'exercises',jsonb_build_array(
          jsonb_build_object('slotId',slot_a,'exerciseId',ex,'position',1,
            'setCount',2,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
            'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
      jsonb_build_object('dayId',stable_rest,'weekNumber',1,'dayIndex',2,'orderInWeek',2,
        'workoutName','Rest','isRestDay',true,'exercises','[]'::jsonb),
      jsonb_build_object('dayId',stable_b,'weekNumber',1,'dayIndex',3,'orderInWeek',3,
        'workoutName','B','estimatedDurationMin',30,'exercises',jsonb_build_array(
          jsonb_build_object('slotId',slot_b,'exerciseId',ex,'position',1,
            'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
            'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown')))),
    'context',NULL)));
  pid:=(installed->>'programId')::uuid;
  rev:=(installed->>'revisionId')::uuid;
  SELECT id INTO day_id FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=stable_a;
  request:=jsonb_build_object('schemaVersion',1,'programId',pid,'operationId',gen_random_uuid());
  init:=public.initialize_program_sequence_v1(request);
  IF init->>'revision'<>'1' OR (SELECT count(*) FROM public.program_sequence_days WHERE program_id=pid)<>3
    OR (SELECT status FROM public.program_sequence_days WHERE program_id=pid AND stable_day_id=stable_rest)<>'rest'
    OR (SELECT count(*) FROM public.program_sequence_days WHERE program_id=pid AND session_id IS NOT NULL)<>0
    OR public.get_program_sequence_v1(pid)->>'nextStableDayId'<>stable_a::text
    THEN RAISE EXCEPTION 'initial state / rest content'; END IF;
  IF NOT (public.initialize_program_sequence_v1(request)->>'replayed')::boolean THEN RAISE EXCEPTION 'initial replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.initialize_program_sequence_v1(request||'{"schemaVersion":2}'::jsonb);
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'initial replay mismatch accepted'; END IF;
  SELECT jsonb_build_object('slotId',slot_a,'prescribedExerciseId',ex,'actualExerciseId',ex,
    'prescribedSetCount',2,'sets',jsonb_build_array(
      jsonb_build_object('setId',set_one,'order',1,'logged',true,'outcome','performed',
        'actualExerciseId',ex,'actualReps',8,'actualLoad',30,'loadKind','external',
        'loadUnit','lb','loadSide','unknown','actualRpe',NULL),
      jsonb_build_object('setId',set_two,'order',2,'logged',false,'outcome','not_attempted',
        'actualExerciseId',ex,'actualReps',NULL,'actualLoad',NULL,'loadKind','external',
        'loadUnit','lb','loadSide','unknown','actualRpe',NULL))) INTO frozen;
  workout:=jsonb_build_object('operationId',op,'draftId',gen_random_uuid(),
    'schemaVersion',2,'revision',1,'programDayId',day_id,'prescriptionRevisionId',rev,
    'workoutName','A','startedAt','2026-09-27T10:00:00Z',
    'endedAt','2026-09-27T10:30:00Z','durationMin',30,'timezone','UTC',
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(frozen)),
    'slots',jsonb_build_array(frozen));
  payload:=jsonb_build_object('schemaVersion',1,'programId',pid,'stableDayId',stable_a,
    'operationId',op,'expectedRevision',1,'workout',workout);
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_v2(workout);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%sequence finish required%' THEN RAISE; END IF;
    rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'old Finish bypassed sequence'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||
    jsonb_build_object('stableDayId',stable_b));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%selected prescription lineage%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'invalid day lineage accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||
    jsonb_build_object('workout',workout||jsonb_build_object('programDayId',gen_random_uuid())));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%selected prescription lineage%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'foreign day lineage accepted'; END IF;
  finish:=public.finalize_program_sequence_day_v1(payload);
  sid:=(finish->>'sessionId')::uuid;
  IF finish->>'completionClass'<>'partial' OR finish->>'sequenceRevision'<>'2'
    OR (SELECT status FROM public.program_sequence_days WHERE program_id=pid AND stable_day_id=stable_a)<>'partial'
    OR (SELECT status FROM public.program_sequence_days WHERE program_id=pid AND stable_day_id=stable_b)<>'pending'
    THEN RAISE EXCEPTION 'partial did not resolve only selected day'; END IF;
  IF NOT (public.finalize_program_sequence_day_v1(payload)->>'replayed')::boolean
    OR (SELECT revision FROM public.program_sequences WHERE program_id=pid)<>2
    OR (SELECT count(*) FROM public.workout_sessions WHERE user_id=owner_a AND operation_id=op)<>1
    THEN RAISE EXCEPTION 'finish replay changed authority'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||jsonb_build_object('expectedRevision',2));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'finish mismatch accepted'; END IF;
  op:=gen_random_uuid();
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||jsonb_build_object(
    'operationId',op,'workout',workout||jsonb_build_object('operationId',op)));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale selected Finish accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'workout',workout||jsonb_build_object('operationId',gen_random_uuid())));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%matching workout operation%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'mismatched operation accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||
    jsonb_build_object('operationId',gen_random_uuid(),'workout',workout));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%matching workout operation%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'operation collision accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',2,'stableDayId',stable_rest,
    'workout',workout||jsonb_build_object('operationId',gen_random_uuid())));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%matching workout operation%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'rest selection accepted'; END IF;
  -- Correct the linked actual without a second sequence revision.
  correction_request:=jsonb_build_object('schemaVersion',1,
    'operationId',gen_random_uuid(),'sessionId',sid,'expectedRevision',0,
    'sets',jsonb_build_array(
      jsonb_build_object('actualSetId',set_one,'prescriptionSlotId',slot_a,
        'prescribedExerciseId',ex,'exerciseId',ex,'order',1,'reps',8,'loadValue',30,
        'loadKind','external','loadUnit','lb','loadSide','unknown','rpe',NULL),
      jsonb_build_object('actualSetId',set_two,'prescriptionSlotId',slot_a,
        'prescribedExerciseId',ex,'exerciseId',ex,'order',2,'reps',8,'loadValue',30,
        'loadKind','external','loadUnit','lb','loadSide','unknown','rpe',NULL)));
  corrected:=public.correct_workout_structure_v1(correction_request);
  IF corrected->>'completionClass'<>'complete'
    OR (SELECT status FROM public.program_sequence_days WHERE session_id=sid)<>'completed'
    OR public.get_program_sequence_v1(pid)->'counts'->>'completed'<>'1'
    OR public.get_program_sequence_v1(pid)->'days'->0->>'actualCompletionClass'<>'complete'
    OR (SELECT revision FROM public.program_sequences WHERE program_id=pid)<>2
    OR (SELECT current_revision_id FROM public.programs WHERE id=pid)<>rev
    THEN RAISE EXCEPTION 'correction did not recompute linked completion'; END IF;
  IF NOT (public.correct_workout_structure_v1(correction_request)->>'replayed')::boolean
    OR (SELECT revision FROM public.program_sequences WHERE program_id=pid)<>2
    THEN RAISE EXCEPTION 'correction replay transitioned sequence'; END IF;
  rejected:=false;
  BEGIN PERFORM public.correct_workout_structure_v1(correction_request||
    jsonb_build_object('sets','[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'correction mismatch accepted'; END IF;
  corrected:=public.correct_workout_structure_v1(correction_request||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',1,
    'sets',jsonb_build_array(correction_request->'sets'->0)));
  IF corrected->>'completionClass'<>'partial'
    OR public.get_program_sequence_v1(pid)->'counts'->>'partial'<>'1'
    OR public.get_program_sequence_v1(pid)->'days'->0->>'actualCompletionClass'<>'partial'
    OR (SELECT revision FROM public.program_sequences WHERE program_id=pid)<>2
    THEN RAISE EXCEPTION 'second correction changed sequence or stale context'; END IF;
  -- History-only ad-hoc has no program day, sequence receipt, or progression effect.
  ad_hoc_request:=jsonb_build_object('schemaVersion',1,'operationId',gen_random_uuid(),
    'draftId',gen_random_uuid(),'workoutName','Walk','startedAt','2026-09-27T11:00:00Z',
    'sets',jsonb_build_array(jsonb_build_object('setId',gen_random_uuid(),'exerciseId',ex,
      'order',1,'reps',8,'loadKind','bodyweight','loadUnit','none','loadSide','unknown')));
  ad_hoc:=public.finalize_ad_hoc_workout_v1(ad_hoc_request);
  IF (SELECT program_day_id FROM public.workout_sessions WHERE id=(ad_hoc->>'sessionId')::uuid) IS NOT NULL
    OR EXISTS(SELECT 1 FROM public.workout_receipt_effects WHERE workout_session_id=(ad_hoc->>'sessionId')::uuid)
    OR (SELECT revision FROM public.program_sequences WHERE program_id=pid)<>2
    OR (SELECT count(*) FROM public.workout_exercise_sets WHERE session_id=(ad_hoc->>'sessionId')::uuid)<>1
    THEN RAISE EXCEPTION 'ad-hoc wrote program or lost actual history'; END IF;
  IF NOT (public.finalize_ad_hoc_workout_v1(ad_hoc_request)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'ad-hoc replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_ad_hoc_workout_v1(ad_hoc_request||
    jsonb_build_object('operationId',gen_random_uuid(),
      'endedAt','2026-09-27T10:00:00Z'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%invalid_input%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'ad-hoc reversed timestamps accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_ad_hoc_workout_v1(ad_hoc_request||'{"workoutName":"Other"}'::jsonb);
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'ad-hoc mismatch accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_ad_hoc_workout_v1(ad_hoc_request||
    jsonb_build_object('operationId',gen_random_uuid(),'programDayId',day_id));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%invalid_input%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'ad-hoc program link accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_ad_hoc_workout_v1(ad_hoc_request||
    jsonb_build_object('operationId',gen_random_uuid(),'programId',pid));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%invalid_input%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'ad-hoc program ID accepted'; END IF;
  request:=jsonb_build_object('schemaVersion',1,'programId',pid,'operationId',gen_random_uuid(),
    'expectedRevision',2,'kind','set_day','stableDayId',stable_b,'status','skipped');
  changed:=public.change_program_sequence_v1(request);
  IF changed->>'revision'<>'3' OR NOT (public.change_program_sequence_v1(request)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'skip or replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.change_program_sequence_v1(request||jsonb_build_object('operationId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale change accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.change_program_sequence_v1(request||
    jsonb_build_object('status','pending'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'change mismatch accepted'; END IF;
  PERFORM public.change_program_sequence_v1(request||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',3,'status','replaced_with_rest'));
  PERFORM public.change_program_sequence_v1(request||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',4,'status','pending'));
  request:=jsonb_build_object('schemaVersion',1,'programId',pid,'operationId',gen_random_uuid(),
    'expectedRevision',5,'kind','reorder','dayIds',jsonb_build_array(stable_b,stable_rest,stable_a));
  PERFORM public.change_program_sequence_v1(request);
  IF (SELECT stable_day_id FROM public.program_sequence_days WHERE program_id=pid AND status='pending'
    ORDER BY position LIMIT 1)<>stable_b THEN RAISE EXCEPTION 'explicit next pending order'; END IF;
  rejected:=false;
  BEGIN PERFORM public.change_program_sequence_v1(request||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',6,'dayIds',jsonb_build_array(stable_a,stable_a,stable_b)));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%exact day order%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'invalid order accepted'; END IF;
  -- An alternate-day request remains possible only for its own pending day.
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',6,'stableDayId',stable_b,
    'workout',workout||jsonb_build_object('operationId',gen_random_uuid())));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%matching workout operation%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'alternate day mismatch accepted'; END IF;
  PERFORM public.change_program_sequence_v1(jsonb_build_object('schemaVersion',1,
    'programId',pid,'operationId',gen_random_uuid(),'expectedRevision',6,'kind','pause'));
  IF (SELECT NOT paused FROM public.program_sequences WHERE program_id=pid) THEN
    RAISE EXCEPTION 'pause missing'; END IF;
  IF public.get_program_sequence_v1(pid)->>'nextStableDayId' IS NOT NULL
    THEN RAISE EXCEPTION 'paused selector suggested workout'; END IF;
  alternate_op:=gen_random_uuid();
  SELECT id INTO day_id FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=stable_b;
  alternate:=jsonb_build_object('operationId',alternate_op,'draftId',gen_random_uuid(),
    'schemaVersion',2,'revision',1,'programDayId',day_id,'prescriptionRevisionId',rev,
    'workoutName','B','startedAt','2026-09-28T10:00:00Z',
    'endedAt','2026-09-28T10:30:00Z','durationMin',30,'timezone','UTC',
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(
      jsonb_build_object('slotId',slot_b,'prescribedExerciseId',ex,
        'prescribedSetCount',1,'sets',jsonb_build_array(
          jsonb_build_object('setId',gen_random_uuid(),'order',1))))),
    'slots',jsonb_build_array(jsonb_build_object('slotId',slot_b,'prescribedExerciseId',ex,
      'actualExerciseId',ex,'prescribedSetCount',1,'sets',jsonb_build_array(
        jsonb_build_object('setId',gen_random_uuid(),'order',1,'logged',true,
          'outcome','performed','actualExerciseId',ex,'actualReps',8,'actualLoad',30,
          'loadKind','external','loadUnit','lb','loadSide','unknown')))));
  -- A frozen set and its actual must have the same stable identity.
  alternate:=jsonb_set(alternate,'{frozenPrescription,slots,0,sets,0,setId}',
    alternate->'slots'->0->'sets'->0->'setId');
  alternate_payload:=jsonb_build_object('schemaVersion',1,'programId',pid,
    'stableDayId',stable_b,'operationId',alternate_op,'expectedRevision',7,
    'workout',alternate);
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(alternate_payload);
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%program paused%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'paused program accepted selected Finish'; END IF;
  PERFORM public.change_program_sequence_v1(jsonb_build_object('schemaVersion',1,
    'programId',pid,'operationId',gen_random_uuid(),'expectedRevision',7,'kind','resume'));
  finish:=public.finalize_program_sequence_day_v1(
    alternate_payload||jsonb_build_object('expectedRevision',8));
  IF finish->>'completionClass'<>'complete'
    OR (SELECT status FROM public.program_sequence_days WHERE program_id=pid AND stable_day_id=stable_b)<>'completed'
    OR (SELECT status FROM public.program_sequence_days WHERE program_id=pid AND stable_day_id=stable_rest)<>'rest'
    OR public.get_program_sequence_v1(pid)->>'nextStableDayId' IS NOT NULL
    OR (SELECT revision FROM public.program_sequences WHERE program_id=pid)<>9
    THEN RAISE EXCEPTION 'selected day Finish after resume'; END IF;
  -- Owner B creates a separate program and cannot read or mutate A.
  PERFORM set_config('request.jwt.claim.sub',owner_b::text,true);
  other_installed:=public.install_program_v2(jsonb_build_object('operationId',gen_random_uuid(),
    'artifact',jsonb_build_object('name','Other owner','goal','strength',
      'durationWeeks',1,'daysPerWeek',1,'source','manual','schemaVersion',2,
      'catalogVersion','test','policyVersion','program-install-v2',
      'days',jsonb_build_array(jsonb_build_object('dayId',gen_random_uuid(),
        'weekNumber',1,'dayIndex',1,'orderInWeek',1,'workoutName','Other',
        'exercises',jsonb_build_array(jsonb_build_object('slotId',gen_random_uuid(),
          'exerciseId',ex,'position',1,'setCount',1,'repRangeMin',8,'repRangeMax',12,
          'targetRpe',7,'suggestedLoad',NULL,'loadKind','external','loadUnit','lb',
          'loadSide','unknown')))),'context',NULL)));
  other_pid:=(other_installed->>'programId')::uuid;
  PERFORM public.initialize_program_sequence_v1(jsonb_build_object(
    'schemaVersion',1,'programId',other_pid,'operationId',gen_random_uuid()));
  other_revision:=(other_installed->>'revisionId')::uuid;
  SELECT d.stable_day_id,d.id,pde.stable_slot_id INTO other_stable,other_day,other_slot
    FROM public.program_days d JOIN public.program_day_exercises pde ON pde.program_day_id=d.id
    WHERE d.program_id=other_pid AND d.program_revision_id=other_revision;
  changed:=public.revise_program_exercise_occurrence_v1(jsonb_build_object(
    'operationId',gen_random_uuid(),'programId',other_pid,'expectedRevision',1,
    'expectedRevisionId',other_revision,'currentStableDayId',other_stable,
    'currentStableSlotId',other_slot,'originalExerciseId',ex,
    'replacementExerciseId',replacement,'includeCurrentDay',true));
  IF changed->>'revisionId'=other_revision::text
    THEN RAISE EXCEPTION 'prescription revision did not advance'; END IF;
  alternate_op:=gen_random_uuid();
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(jsonb_build_object(
    'schemaVersion',1,'programId',other_pid,'stableDayId',other_stable,
    'operationId',alternate_op,'expectedRevision',1,
    'workout',jsonb_build_object('operationId',alternate_op,'programDayId',other_day,
      'prescriptionRevisionId',other_revision)));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision: selected prescription lineage%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'superseded prescription accepted by Finish'; END IF;
  IF EXISTS(SELECT 1 FROM public.program_sequences WHERE program_id=pid)
    OR EXISTS(SELECT 1 FROM public.program_sequence_days WHERE program_id=pid)
    OR EXISTS(SELECT 1 FROM public.program_sequence_receipts WHERE program_id=pid)
    THEN RAISE EXCEPTION 'owner B read A sequence'; END IF;
  rejected:=false;
  BEGIN PERFORM public.change_program_sequence_v1(jsonb_build_object('schemaVersion',1,
    'programId',pid,'operationId',gen_random_uuid(),'expectedRevision',8,'kind','pause'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%forbidden%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'owner B changed A sequence'; END IF;
  rejected:=false;
  BEGIN PERFORM public.get_program_sequence_v1(pid);
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%forbidden%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'owner B read A sequence context'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_program_sequence_day_v1(payload);
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%forbidden%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'owner B accessed A Finish'; END IF;
  rejected:=false;
  BEGIN PERFORM public.initialize_program_sequence_v1(jsonb_build_object('schemaVersion',1,
    'programId',pid,'operationId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%forbidden%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'owner B initialized A sequence'; END IF;
  IF has_function_privilege('anon','public.initialize_program_sequence_v1(jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.finalize_program_sequence_day_v1(jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.get_program_sequence_v1(uuid)','EXECUTE')
    OR has_function_privilege('anon','public.finalize_ad_hoc_workout_v1(jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.guard_program_sequence_finish_v1()','EXECUTE')
    OR has_function_privilege('authenticated','public.create_program_schedule_v1(jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.revise_program_schedule_v1(jsonb)','EXECUTE')
    OR has_table_privilege('authenticated','public.program_sequence_days','INSERT')
    THEN RAISE EXCEPTION 'sequence grants'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1('{}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'dated schedule creation still callable'; END IF;
END $test$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  IF has_table_privilege('anon','public.program_sequences','SELECT')
    OR has_table_privilege('anon','public.program_sequence_days','SELECT')
    OR has_table_privilege('anon','public.program_sequence_receipts','SELECT')
    THEN RAISE EXCEPTION 'anonymous sequence read'; END IF;
  BEGIN
    PERFORM public.get_program_sequence_v1(gen_random_uuid());
    RAISE EXCEPTION 'anonymous sequence RPC executed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.change_program_sequence_v1('{}'::jsonb);
    RAISE EXCEPTION 'anonymous mutation RPC executed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $anon$;
RESET ROLE;
ROLLBACK;
