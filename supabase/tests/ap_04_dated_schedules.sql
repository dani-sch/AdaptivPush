-- Run only against a disposable isolated database with the AP-04 migration applied.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL client_min_messages=warning;
INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES
('91000000-0000-4000-8000-000000000001','authenticated','authenticated','schedule-one@example.invalid','','{"provider":"email","providers":["email"]}','{}',now(),now()),
('91000000-0000-4000-8000-000000000002','authenticated','authenticated','schedule-two@example.invalid','','{"provider":"email","providers":["email"]}','{}',now(),now());
SET LOCAL ROLE service_role;
INSERT INTO public.exercises(id,name,exercisedb_id)
VALUES('92000000-0000-4000-8000-000000000001','Schedule press','schedule-press'),
('92000000-0000-4000-8000-000000000002','Schedule row','schedule-row');
RESET ROLE;
CREATE FUNCTION pg_temp.ap04_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('ap04.fail_schedule_audit',true)='on' THEN
    RAISE EXCEPTION 'injected_schedule_audit_failure';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ap04_audit_fault BEFORE INSERT ON public.schedule_deviations
  FOR EACH ROW EXECUTE FUNCTION pg_temp.ap04_audit_fault();
CREATE FUNCTION pg_temp.ap04_sync_fault() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('ap04.fail_prescription_sync',true)='on'
    AND NEW.current_prescription_revision_id IS DISTINCT FROM OLD.current_prescription_revision_id THEN
    RAISE EXCEPTION 'injected_prescription_sync_failure';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ap04_sync_fault BEFORE UPDATE ON public.scheduled_days
  FOR EACH ROW EXECUTE FUNCTION pg_temp.ap04_sync_fault();
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  installed jsonb;
  created jsonb;
  schedule_receipt jsonb;
  receipt jsonb;
  corrected jsonb;
  payload jsonb;
  correction jsonb;
  day_a uuid;
  day_b uuid;
  pid uuid;
  rev uuid;
  sess uuid;
  abandoned_session uuid;
  fault_op uuid;
  rejected boolean;
  owner uuid := '91000000-0000-4000-8000-000000000001';
  other uuid := '91000000-0000-4000-8000-000000000002';
  exercise uuid := '92000000-0000-4000-8000-000000000001';
  source_a uuid := '93000000-0000-4000-8000-000000000001';
  source_b uuid := '93000000-0000-4000-8000-000000000002';
  source_rest uuid := '93000000-0000-4000-8000-000000000003';
  source_rest_2 uuid := '93000000-0000-4000-8000-000000000004';
  source_future_1 uuid := '93000000-0000-4000-8000-000000000005';
  source_future_2 uuid := '93000000-0000-4000-8000-000000000006';
  slot_a uuid := '94000000-0000-4000-8000-000000000001';
  slot_b uuid := '94000000-0000-4000-8000-000000000002';
  slot_future_1 uuid := '94000000-0000-4000-8000-000000000005';
  slot_future_2 uuid := '94000000-0000-4000-8000-000000000006';
  occ_a uuid := '95000000-0000-4000-8000-000000000001';
  occ_b uuid := '95000000-0000-4000-8000-000000000002';
  occ_rest uuid := '95000000-0000-4000-8000-000000000003';
  occ_rest_2 uuid := '95000000-0000-4000-8000-000000000004';
  occ_future_1 uuid := '95000000-0000-4000-8000-000000000005';
  occ_future_2 uuid := '95000000-0000-4000-8000-000000000006';
  set_a uuid := '96000000-0000-4000-8000-000000000001';
  placed jsonb;
  set_value jsonb;
  slot_value jsonb;
BEGIN
  installed:=public.install_program_v2(jsonb_build_object('operationId',gen_random_uuid(),
    'artifact',jsonb_build_object('name','Schedule SQL','goal','strength','durationWeeks',3,
    'daysPerWeek',2,'source','manual','schemaVersion',2,'catalogVersion','test',
    'policyVersion','program-install-v2','days',jsonb_build_array(
      jsonb_build_object('dayId',source_a,'weekNumber',1,'dayIndex',1,'orderInWeek',1,
        'workoutName','A','estimatedDurationMin',30,'exercises',jsonb_build_array(
          jsonb_build_object('slotId',slot_a,'exerciseId',exercise,'position',1,
            'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
            'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
      jsonb_build_object('dayId',source_rest,'weekNumber',1,'dayIndex',2,'orderInWeek',2,
        'workoutName','Rest','isRestDay',true,'exercises','[]'::jsonb),
      jsonb_build_object('dayId',source_b,'weekNumber',1,'dayIndex',3,'orderInWeek',3,
        'workoutName','B','estimatedDurationMin',30,'exercises',jsonb_build_array(
          jsonb_build_object('slotId',slot_b,'exerciseId',exercise,'position',1,
            'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
            'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
      jsonb_build_object('dayId',source_rest_2,'weekNumber',1,'dayIndex',4,'orderInWeek',4,
        'workoutName','Rest later','isRestDay',true,'exercises','[]'::jsonb),
      jsonb_build_object('dayId',source_future_1,'weekNumber',2,'dayIndex',1,'orderInWeek',1,
        'workoutName','Future A','exercises',jsonb_build_array(
          jsonb_build_object('slotId',slot_future_1,'exerciseId',exercise,'position',1,
            'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
            'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
      jsonb_build_object('dayId',source_future_2,'weekNumber',3,'dayIndex',1,'orderInWeek',1,
        'workoutName','Future B','exercises',jsonb_build_array(
          jsonb_build_object('slotId',slot_future_2,'exerciseId',exercise,'position',1,
            'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
            'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown')))),
      'context',NULL)));
  pid:=(installed->>'programId')::uuid;
  rev:=(installed->>'revisionId')::uuid;
  SELECT id INTO day_a FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=source_a;
  SELECT id INTO day_b FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=source_b;
  placed:=jsonb_build_object('operationId',gen_random_uuid(),'programId',pid,
    'expectedRevision',0,'expectedProgramRevisionId',rev,
    'timezone','America/New_York','days',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_a,'programDayId',day_a,'localDate','2026-10-01'),
      jsonb_build_object('occurrenceId',occ_b,'programDayId',day_b,'localDate','2026-10-03'),
      jsonb_build_object('occurrenceId',occ_rest,'programDayId',
        (SELECT id FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=source_rest),
        'localDate','2026-10-02'),
      jsonb_build_object('occurrenceId',occ_rest_2,'programDayId',
        (SELECT id FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=source_rest_2),
        'localDate','2026-10-04'),
      jsonb_build_object('occurrenceId',occ_future_1,'programDayId',
        (SELECT id FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=source_future_1),
        'localDate','2026-10-09'),
      jsonb_build_object('occurrenceId',occ_future_2,'programDayId',
        (SELECT id FROM public.program_days WHERE program_revision_id=rev AND stable_day_id=source_future_2),
        'localDate','2026-10-16')));
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(placed||jsonb_build_object(
    'operationId',gen_random_uuid(),'days',jsonb_build_array(placed->'days'->0)));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%all uncompleted program days%'; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.program_schedules WHERE program_id=pid)
    THEN RAISE EXCEPTION 'partial placement stranded future program days'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(placed||jsonb_build_object(
    'operationId',gen_random_uuid(),'days',jsonb_set(placed->'days','{1,localDate}','"2026-10-01"'::jsonb)));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%multiple occurrences on one scheduled date%'; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.program_schedules WHERE program_id=pid)
    THEN RAISE EXCEPTION 'duplicate initial date accepted'; END IF;
  created:=public.create_program_schedule_v1(placed);
  IF (created->>'revision')::integer<>1 OR
    (SELECT count(*) FROM public.scheduled_days WHERE program_id=pid)<>6
    OR (SELECT count(*) FROM public.scheduled_days WHERE program_id=pid AND original_kind='rest')<>2
    THEN RAISE EXCEPTION 'explicit placement/rest missing'; END IF;
  IF NOT (public.create_program_schedule_v1(placed)->>'replayed')::boolean THEN
    RAISE EXCEPTION 'placement replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(placed||'{"timezone":"UTC"}');
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'placement payload mismatch accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(placed||jsonb_build_object('operationId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'duplicate schedule accepted'; END IF;

  -- Two-way cross-week swap shares one revision; no historical placement changes.
  payload:=jsonb_build_object('operationId',gen_random_uuid(),'programId',pid,
    'expectedRevision',1,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_a,'status','planned','localDate','2026-10-08'),
      jsonb_build_object('occurrenceId',occ_b,'status','planned','localDate','2026-10-01')));
  schedule_receipt:=public.revise_program_schedule_v1(payload);
  IF (schedule_receipt->>'revision')::integer<>2 OR
    (SELECT original_local_date FROM public.scheduled_days WHERE id=occ_a)<>'2026-10-01'
    OR (SELECT current_local_date FROM public.scheduled_days WHERE id=occ_a)<>'2026-10-08'
    THEN RAISE EXCEPTION 'swap changed original or failed'; END IF;
  IF NOT (public.revise_program_schedule_v1(payload)->>'replayed')::boolean THEN
    RAISE EXCEPTION 'swap replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(payload||'{"changes":[]}');
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'schedule payload mismatch accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(payload||jsonb_build_object('operationId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale schedule accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',2,
    'expectedProgramRevisionId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision: program changed%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale prescription accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',2,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_a,'status','skipped','reason','travel'),
      jsonb_build_object('occurrenceId',gen_random_uuid(),'status','skipped','reason','travel'))));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected OR (SELECT status FROM public.scheduled_days WHERE id=occ_a)<>'planned'
    OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=pid)<>2 THEN
    RAISE EXCEPTION 'partial schedule revision committed'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',2,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(jsonb_build_object('occurrenceId',occ_rest,
      'status','planned','localDate','2026-10-02','kind','workout','programDayId',day_b,
      'reason','attempted duplicate'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%prescription assigned twice%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'duplicate workout assignment accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',2,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(jsonb_build_object('occurrenceId',occ_a,
      'status','in_progress','localDate','2026-10-08'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%explicit placement, kind, reason or prescription%'; END;
  IF NOT rejected OR (SELECT status FROM public.scheduled_days WHERE id=occ_a)<>'planned'
    THEN RAISE EXCEPTION 'unverified in_progress accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',2,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(jsonb_build_object('occurrenceId',occ_a,
      'status','planned','localDate','2026-10-02'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%multiple occurrences on one scheduled date%'; END;
  IF NOT rejected OR (SELECT current_local_date FROM public.scheduled_days WHERE id=occ_a)<>'2026-10-08'
    THEN RAISE EXCEPTION 'duplicate revised date accepted'; END IF;

  PERFORM set_config('request.jwt.claim.sub',other::text,true);
  IF EXISTS(SELECT 1 FROM public.scheduled_days WHERE program_id=pid)
    OR has_table_privilege('authenticated','public.scheduled_days','INSERT')
    OR has_table_privilege('authenticated','public.program_schedules','UPDATE')
    OR has_function_privilege('authenticated','public.finalize_workout_ap04_base(jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_program_schedule_v1(jsonb)','EXECUTE')
    THEN RAISE EXCEPTION 'schedule RLS or grant exposure'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(payload||jsonb_build_object('operationId',gen_random_uuid(),'expectedRevision',2));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'cross-owner schedule revision'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner::text,true);

  set_value:=jsonb_build_object('setId',set_a,'order',1,'logged',true,
    'outcome','performed','actualExerciseId',exercise,'actualReps',8,
    'actualLoad',30,'loadKind','external','loadUnit','lb','loadSide','unknown');
  slot_value:=jsonb_build_object('slotId',slot_a,'prescribedExerciseId',exercise,
    'actualExerciseId',exercise,'prescribedSetCount',1,'sets',jsonb_build_array(set_value));
  payload:=jsonb_build_object('operationId',gen_random_uuid(),'draftId',gen_random_uuid(),
    'schemaVersion',2,'revision',1,'programDayId',day_a,'prescriptionRevisionId',rev,
    'scheduleOccurrenceId',occ_a,'expectedScheduleRevision',2,
    'workoutName','A','startedAt','2026-10-01T11:00:00Z','endedAt','2026-10-01T11:30:00Z',
    'durationMin',30,'timezone','America/New_York',
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(slot_value)),
    'slots',jsonb_build_array(slot_value));
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object('scheduleOccurrenceId',occ_b));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.workout_sessions WHERE operation_id=(payload->>'operationId')::uuid)
    THEN RAISE EXCEPTION 'wrong occurrence finalized'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_v2(payload-'scheduleOccurrenceId'-'expectedScheduleRevision');
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%scheduled workout requires selected occurrence%'; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.workout_sessions
      WHERE operation_id=(payload->>'operationId')::uuid) THEN
    RAISE EXCEPTION 'direct legacy finish bypassed schedule'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object(
    'operationId',schedule_receipt->>'operationId','draftId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'cross-command operation collision accepted'; END IF;
  fault_op:=gen_random_uuid();
  PERFORM set_config('ap04.fail_schedule_audit','on',true);
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object(
    'operationId',fault_op,'draftId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%injected_schedule_audit_failure%'; END;
  PERFORM set_config('ap04.fail_schedule_audit','off',true);
  IF NOT rejected
    OR EXISTS(SELECT 1 FROM public.workout_sessions WHERE operation_id=fault_op)
    OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=pid)<>2
    OR (SELECT fulfillment_session_id FROM public.scheduled_days WHERE id=occ_a) IS NOT NULL
    THEN RAISE EXCEPTION 'post-finalization fault did not roll back session'; END IF;
  fault_op:=gen_random_uuid();
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object(
    'operationId',fault_op,'draftId',gen_random_uuid(),'timezone','not-a-timezone'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%actual workout timezone%'; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.workout_sessions WHERE operation_id=fault_op)
    THEN RAISE EXCEPTION 'invalid actual timezone created a session'; END IF;
  receipt:=public.finalize_workout_structure_v1(payload);
  sess:=(receipt->>'sessionId')::uuid;
  IF (receipt->>'scheduleRevision')::integer<>3
    OR (SELECT fulfillment_session_id FROM public.scheduled_days WHERE id=occ_a)<>sess
    OR (SELECT fulfillment_class FROM public.scheduled_days WHERE id=occ_a)<>'full'
    OR NOT EXISTS(SELECT 1 FROM public.schedule_deviations sd
      WHERE sd.operation_id=(payload->>'operationId')::uuid
        AND sd.changes->>'scheduledLocalDate'='2026-10-08'
        AND sd.changes->>'actualLocalDate'='2026-10-01'
        AND sd.changes->>'actualTimezone'='America/New_York')
    THEN RAISE EXCEPTION 'atomic fulfillment missing'; END IF;
  IF NOT (public.finalize_workout_structure_v1(payload)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'finish replay'; END IF;
  IF NOT (public.finalize_workout_v2(payload)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'direct finalize replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(placed||jsonb_build_object(
    'operationId',payload->>'operationId'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'create reused finalized workout operation'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object(
    'operationId',payload->>'operationId','programId',pid,'expectedRevision',3,
    'expectedProgramRevisionId',rev,'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_rest_2,'status','planned','localDate','2026-10-04'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'revision reused finalized workout operation'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||'{"workoutName":"changed"}');
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'finish payload mismatch accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',3,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_a,'status','skipped','reason','changed mind'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%fixed work%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'fulfilled placement mutable'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'draftId',gen_random_uuid(),'expectedScheduleRevision',3));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected OR (SELECT count(*) FROM public.scheduled_days WHERE fulfillment_session_id=sess)<>1
    THEN RAISE EXCEPTION 'duplicate fulfillment'; END IF;

  correction:=jsonb_build_object('operationId',gen_random_uuid(),'schemaVersion',1,
    'sessionId',sess,'expectedRevision',0,'expectedScheduleRevision',3,
    'sets',jsonb_build_array(jsonb_build_object('actualSetId',set_a,
      'prescriptionSlotId',slot_a,'prescribedExerciseId',exercise,'exerciseId',exercise,
      'order',1,'reps',9,'loadValue',30,'loadKind','external','loadUnit','lb',
      'loadSide','unknown','rpe',NULL,'loggedAt','2026-10-01T11:10:00Z')));
  rejected:=false;
  BEGIN PERFORM public.correct_completed_workout_v1(correction||jsonb_build_object(
    'operationId',payload->>'operationId'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'correction reused finalized workout operation'; END IF;
  rejected:=false;
  BEGIN PERFORM public.correct_workout_structure_v1(correction||jsonb_build_object(
    'operationId',schedule_receipt->>'operationId'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'correction operation collision accepted'; END IF;
  fault_op:=gen_random_uuid();
  PERFORM set_config('ap04.fail_schedule_audit','on',true);
  rejected:=false;
  BEGIN PERFORM public.correct_workout_structure_v1(correction||jsonb_build_object(
    'operationId',fault_op));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%injected_schedule_audit_failure%'; END;
  PERFORM set_config('ap04.fail_schedule_audit','off',true);
  IF NOT rejected OR (SELECT correction_revision FROM public.workout_sessions WHERE id=sess)<>0
    OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=pid)<>3
    OR EXISTS(SELECT 1 FROM public.workout_correction_receipts
      WHERE operation_id=fault_op)
    THEN RAISE EXCEPTION 'post-correction fault did not roll back edit'; END IF;
  corrected:=public.correct_completed_workout_v1(correction);
  IF (corrected->>'scheduleRevision')::integer<>4
    OR (SELECT fulfillment_session_id FROM public.scheduled_days WHERE id=occ_a)<>sess
    OR (SELECT count(*) FROM public.schedule_deviations WHERE schedule_id=(created->>'scheduleId')::uuid)<>3
    THEN RAISE EXCEPTION 'correction changed fulfillment identity or failed audit'; END IF;
  IF NOT (public.correct_workout_structure_v1(correction)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'correction replay'; END IF;
  IF NOT (public.correct_workout_removals_v1(correction)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'removal correction alias replay'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(placed||jsonb_build_object(
    'operationId',correction->>'operationId'));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'create reused correction operation'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object(
    'operationId',correction->>'operationId','programId',pid,'expectedRevision',4,
    'expectedProgramRevisionId',rev,'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_rest_2,'status','planned','localDate','2026-10-04'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'revision reused correction operation'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object(
    'operationId',correction->>'operationId','draftId',gen_random_uuid()));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'finish reused correction operation'; END IF;
  rejected:=false;
  BEGIN PERFORM public.correct_workout_structure_v1(correction||jsonb_build_object(
    'operationId',gen_random_uuid(),'expectedRevision',1,'expectedScheduleRevision',3));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision: schedule changed%'; END;
  IF NOT rejected OR (SELECT correction_revision FROM public.workout_sessions WHERE id=sess)<>1
    THEN RAISE EXCEPTION 'stale schedule correction committed'; END IF;

  -- Replacement has an explicit displaced occurrence, not a second copy of B.
  schedule_receipt:=public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',4,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_b,'status','skipped','reason','replaced with rest slot'),
      jsonb_build_object('occurrenceId',occ_rest,'status','planned','localDate','2026-10-02',
        'kind','workout','programDayId',day_b,'reason','explicit rest replacement'))));
  IF (schedule_receipt->>'revision')::integer<>5
    OR (SELECT original_kind FROM public.scheduled_days WHERE id=occ_rest)<>'rest'
    OR (SELECT current_kind FROM public.scheduled_days WHERE id=occ_rest)<>'workout'
    OR (SELECT current_local_date FROM public.scheduled_days WHERE id=occ_b) IS NOT NULL
    THEN RAISE EXCEPTION 'replacement did not preserve original rest/displaced work'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_structure_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'draftId',gen_random_uuid(),
    'programDayId',day_b,'prescriptionRevisionId',rev,
    'scheduleOccurrenceId',occ_rest,'expectedScheduleRevision',4));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision: schedule changed%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale replacement finalization accepted'; END IF;
  set_value:=set_value||jsonb_build_object('setId',gen_random_uuid());
  slot_value:=jsonb_build_object('slotId',slot_b,'prescribedExerciseId',exercise,
    'actualExerciseId',exercise,'prescribedSetCount',1,'sets',jsonb_build_array(set_value));
  payload:=payload||jsonb_build_object('operationId',gen_random_uuid(),'draftId',gen_random_uuid(),
    'programDayId',day_b,'prescriptionRevisionId',rev,
    'scheduleOccurrenceId',occ_rest,'expectedScheduleRevision',5,
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(slot_value)),
    'slots',jsonb_build_array(slot_value));
  receipt:=public.finalize_workout_removals_v1(payload);
  IF (receipt->>'scheduleRevision')::integer<>6
    OR (SELECT original_kind FROM public.scheduled_days WHERE id=occ_rest)<>'rest'
    OR (SELECT fulfillment_session_id FROM public.scheduled_days WHERE id=occ_rest)
      IS DISTINCT FROM (receipt->>'sessionId')::uuid THEN
    RAISE EXCEPTION 'rest replacement not atomically fulfilled'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',6,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(jsonb_build_object(
      'occurrenceId',occ_rest,'status','paused','reason','after completion'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%fixed work%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'completed replacement mutable'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',6,'expectedProgramRevisionId',rev,
    'timezone','America/Los_Angeles','changes','[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%timezone change requires%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'timezone changed without policy'; END IF;
  schedule_receipt:=public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',6,'expectedProgramRevisionId',rev,
    'timezone','America/Los_Angeles','timezonePolicy','keep_dates','changes','[]'::jsonb));
  IF (schedule_receipt->>'revision')::integer<>7
    OR (SELECT current_timezone FROM public.scheduled_days WHERE id=occ_rest_2)<>'America/Los_Angeles'
    OR (SELECT current_timezone FROM public.scheduled_days WHERE id=occ_a)<>'America/New_York'
    OR (SELECT current_timezone FROM public.scheduled_days WHERE id=occ_rest)<>'America/New_York'
    OR (SELECT current_timezone FROM public.scheduled_days WHERE id=occ_b)<>'America/New_York'
    OR EXISTS(SELECT 1 FROM public.scheduled_days WHERE original_timezone<>'America/New_York'
      OR original_local_date IS NULL)
    OR (SELECT timezone FROM public.program_schedules WHERE program_id=pid)<>'America/Los_Angeles'
    THEN RAISE EXCEPTION 'timezone revision rewrote original or fixed work: %',
      (SELECT jsonb_agg(jsonb_build_object('id',id,'original',original_timezone,
        'current',current_timezone,'kind',current_kind,'status',status))
        FROM public.scheduled_days WHERE program_id=pid); END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',7,'expectedProgramRevisionId',rev,
    'recurrence',jsonb_build_object('fromLocalDate','2026-10-09',
      'dayIndex',1,'targetWeekday',1),
    'changes',jsonb_build_array(jsonb_build_object(
      'occurrenceId',occ_future_1,'status','planned','localDate','2026-10-12'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%every eligible future workout%'; END;
  IF NOT rejected OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=pid)<>7
    THEN RAISE EXCEPTION 'partial recurrence accepted'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',7,'expectedProgramRevisionId',rev,
    'recurrence',jsonb_build_object('fromLocalDate','2026-10-09',
      'dayIndex',1,'targetWeekday',1),
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_future_1,'status','planned','localDate','2026-10-12'),
      jsonb_build_object('occurrenceId',occ_future_2,'status','planned','localDate','2026-10-20'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%every eligible future workout%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'recurrence accepted wrong weekday'; END IF;
  schedule_receipt:=public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',7,'expectedProgramRevisionId',rev,
    'recurrence',jsonb_build_object('fromLocalDate','2026-10-09',
      'dayIndex',1,'targetWeekday',1),
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_future_1,'status','planned','localDate','2026-10-12'),
      jsonb_build_object('occurrenceId',occ_future_2,'status','planned','localDate','2026-10-19'))));
  IF (schedule_receipt->>'revision')::integer<>8
    OR (SELECT jsonb_array_length(recurrence_rules) FROM public.program_schedules WHERE program_id=pid)<>1
    OR (SELECT original_local_date FROM public.scheduled_days WHERE id=occ_future_2)<>'2026-10-16'
    THEN RAISE EXCEPTION 'future recurrence did not preserve original cycle'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',8,'expectedProgramRevisionId',rev,
    'availability',jsonb_build_object('fromLocalDate','2026-10-11','toLocalDate','2026-10-20',
      'availableWeekdays',jsonb_build_array(2),'reason','travel'),
    'changes','[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%unavailable workouts must be moved%'; END;
  IF NOT rejected OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=pid)<>8
    THEN RAISE EXCEPTION 'availability silently retained infeasible workouts'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',8,'expectedProgramRevisionId',rev,
    'availability',jsonb_build_object('fromLocalDate','2026-10-11','toLocalDate','2026-10-20',
      'availableWeekdays',jsonb_build_array(2,2),'reason','travel'),
    'changes','[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%availability interval or weekdays%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'duplicate availability weekday accepted'; END IF;
  schedule_receipt:=public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',8,'expectedProgramRevisionId',rev,
    'availability',jsonb_build_object('fromLocalDate','2026-10-11','toLocalDate','2026-10-20',
      'availableWeekdays',jsonb_build_array(2),'reason','travel'),
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_future_1,'status','planned','localDate','2026-10-13'),
      jsonb_build_object('occurrenceId',occ_future_2,'status','planned','localDate','2026-10-20'))));
  IF (schedule_receipt->>'revision')::integer<>9
    OR (SELECT jsonb_array_length(availability_windows) FROM public.program_schedules WHERE program_id=pid)<>1
    OR (SELECT current_local_date FROM public.scheduled_days WHERE id=occ_future_2)<>'2026-10-20'
    THEN RAISE EXCEPTION 'temporary availability did not apply explicit placement'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',9,'expectedProgramRevisionId',rev,
    'changes',jsonb_build_array(jsonb_build_object('occurrenceId',occ_future_1,
      'status','planned','localDate','2026-10-14'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%unavailable workouts must be moved%'; END;
  IF NOT rejected OR (SELECT current_local_date FROM public.scheduled_days WHERE id=occ_future_1)<>'2026-10-13'
    THEN RAISE EXCEPTION 'later move bypassed accepted availability'; END IF;
  set_value:=jsonb_build_object('setId',gen_random_uuid(),'order',1,'logged',false,
    'outcome','not_attempted','actualExerciseId',exercise,'actualReps',NULL,
    'actualLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown');
  slot_value:=jsonb_build_object('slotId',slot_future_1,'prescribedExerciseId',exercise,
    'actualExerciseId',exercise,'prescribedSetCount',1,'sets',jsonb_build_array(set_value));
  payload:=jsonb_build_object('operationId',gen_random_uuid(),'draftId',gen_random_uuid(),
    'schemaVersion',2,'revision',1,
    'programDayId',(SELECT id FROM public.program_days WHERE program_revision_id=rev
      AND stable_day_id=source_future_1),'prescriptionRevisionId',rev,
    'scheduleOccurrenceId',occ_future_1,'expectedScheduleRevision',9,
    'workoutName','Future A','startedAt','2026-10-13T11:00:00Z',
    'endedAt','2026-10-13T11:30:00Z','durationMin',30,'timezone','America/Los_Angeles',
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(slot_value)),
    'slots',jsonb_build_array(slot_value));
  receipt:=public.finalize_workout_structure_v1(payload);
  abandoned_session:=(receipt->>'sessionId')::uuid;
  IF receipt->>'completionClass'<>'abandoned' OR (receipt->>'scheduleRevision')::integer<>10
    OR (SELECT fulfillment_class FROM public.scheduled_days WHERE id=occ_future_1)<>'abandoned'
    OR (SELECT count(*) FROM public.workout_exercise_sets WHERE session_id=abandoned_session)<>0
    OR (SELECT count(*) FROM public.scheduled_days WHERE program_id=pid
      AND fulfillment_class IN ('full','accepted_reduced'))<>2
    THEN RAISE EXCEPTION 'zero-effort workout was misclassified as adherence'; END IF;
  IF NOT (public.finalize_workout_structure_v1(payload)->>'replayed')::boolean
    THEN RAISE EXCEPTION 'abandoned finish replay'; END IF;
  schedule_receipt:=public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',10,'expectedProgramRevisionId',rev,
    'availability',jsonb_build_object('fromLocalDate','2026-10-11','toLocalDate','2026-10-20',
      'availableWeekdays','[]'::jsonb,'reason','temporary pause'),
    'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',occ_future_2,'status','paused','reason','temporary pause'))));
  IF (schedule_receipt->>'revision')::integer<>11
    OR (SELECT count(*) FROM public.scheduled_days WHERE id IN (occ_future_1,occ_future_2)
      AND status='paused' AND current_local_date IS NULL)<>1
    OR (SELECT fulfillment_session_id FROM public.scheduled_days WHERE id=occ_future_1)
      IS DISTINCT FROM abandoned_session
    OR (SELECT fulfillment_session_id FROM public.scheduled_days WHERE id=occ_a) IS NULL
    THEN RAISE EXCEPTION 'pause rewrote fixed work or inferred debt'; END IF;
  correction:=jsonb_build_object('operationId',gen_random_uuid(),'schemaVersion',1,
    'sessionId',abandoned_session,'expectedRevision',0,'expectedScheduleRevision',11,
    'sets','[]'::jsonb);
  corrected:=public.correct_completed_workout_v1(correction);
  IF corrected->>'completionClass'<>'abandoned'
    OR (corrected->>'scheduleRevision')::integer<>12
    OR (SELECT fulfillment_class FROM public.scheduled_days WHERE id=occ_future_1)<>'abandoned'
    OR (SELECT count(*) FROM public.scheduled_days WHERE program_id=pid
      AND fulfillment_class IN ('full','accepted_reduced'))<>2
    THEN RAISE EXCEPTION 'zero-effort correction was misclassified as adherence'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',pid,'expectedRevision',12,'expectedProgramRevisionId',rev,
    'recurrence',jsonb_build_object('fromLocalDate','2026-11-01',
      'dayIndex',1,'targetWeekday',1),'changes','[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%every eligible future workout%'; END;
  IF NOT rejected OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=pid)<>12
    THEN RAISE EXCEPTION 'empty future recurrence pretended to apply'; END IF;
END $test$;
RESET ROLE;
-- Simulate a legacy/unknown frozen snapshot solely inside this rolled-back fixture.
-- New schedules cannot import a historical finalized workout as an invented original.
UPDATE public.workout_sessions SET prescription_snapshot=jsonb_set(prescription_snapshot,
  '{slots}','[]'::jsonb)
WHERE id=(SELECT fulfillment_session_id FROM public.scheduled_days
  WHERE id='95000000-0000-4000-8000-000000000005');
SET LOCAL ROLE authenticated;
DO $unknown$
DECLARE
  result jsonb;
  session_id uuid;
BEGIN
  SELECT fulfillment_session_id INTO session_id FROM public.scheduled_days
    WHERE id='95000000-0000-4000-8000-000000000005';
  result:=public.correct_completed_workout_v1(jsonb_build_object(
    'operationId',gen_random_uuid(),'schemaVersion',1,'sessionId',session_id,
    'expectedRevision',1,'expectedScheduleRevision',12,
    'sets',jsonb_build_array(jsonb_build_object(
      'actualSetId',gen_random_uuid(),
      'prescriptionSlotId','94000000-0000-4000-8000-000000000005',
      'prescribedExerciseId','92000000-0000-4000-8000-000000000001',
      'exerciseId','92000000-0000-4000-8000-000000000001',
      'order',1,'reps',8,'loadValue',30,'loadKind','external',
      'loadUnit','lb','loadSide','unknown','rpe',NULL))));
  IF result->>'completionClass'<>'legacy_unknown'
    OR (SELECT fulfillment_class FROM public.scheduled_days
      WHERE id='95000000-0000-4000-8000-000000000005')<>'legacy_unknown'
    OR (SELECT count(*) FROM public.scheduled_days
      WHERE fulfillment_class IN ('full','accepted_reduced'))<>2 THEN
    RAISE EXCEPTION 'legacy unknown correction became partial adherence';
  END IF;
END $unknown$;
DO $implicit_rest$
DECLARE
  source text;
  installed jsonb;
  created jsonb;
  revised jsonb;
  artifact jsonb;
  successor uuid;
  pid uuid;
  rev uuid;
  first_day uuid;
  second_day uuid;
  first_stable uuid;
  second_stable uuid;
  first_slot uuid;
  second_slot uuid;
  rest_occurrence uuid;
  first_occurrence uuid;
  second_occurrence uuid;
  rest_lineage uuid;
  rejected boolean;
  base_changes jsonb;
  finish_slot jsonb;
BEGIN
  FOR source IN SELECT unnest(ARRAY['generated','manual']) LOOP
    first_stable:=gen_random_uuid();
    second_stable:=gen_random_uuid();
    first_slot:=gen_random_uuid();
    second_slot:=gen_random_uuid();
    first_occurrence:=gen_random_uuid();
    second_occurrence:=gen_random_uuid();
    rest_occurrence:=gen_random_uuid();
    artifact:=jsonb_build_object('name',source||' without rest rows',
      'goal','strength','durationWeeks',1,'daysPerWeek',2,'source',source,
      'schemaVersion',2,'catalogVersion','test','policyVersion','program-install-v2',
      'days',jsonb_build_array(
        jsonb_build_object('dayId',first_stable,'weekNumber',1,'dayIndex',1,
          'orderInWeek',1,'workoutName','A','exercises',jsonb_build_array(
            jsonb_build_object('slotId',first_slot,'exerciseId',
              '92000000-0000-4000-8000-000000000001','position',1,
              'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
              'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
        jsonb_build_object('dayId',second_stable,'weekNumber',1,'dayIndex',3,
          'orderInWeek',2,'workoutName','B','exercises',jsonb_build_array(
            jsonb_build_object('slotId',second_slot,'exerciseId',
              '92000000-0000-4000-8000-000000000001','position',1,
              'setCount',1,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,
              'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown')))),
      'context',NULL);
    installed:=public.install_program_v2(jsonb_build_object('operationId',gen_random_uuid(),
      'artifact',artifact));
    pid:=(installed->>'programId')::uuid;
    rev:=(installed->>'revisionId')::uuid;
    SELECT id INTO first_day FROM public.program_days
      WHERE program_revision_id=rev AND stable_day_id=first_stable;
    SELECT id INTO second_day FROM public.program_days
      WHERE program_revision_id=rev AND stable_day_id=second_stable;
    IF (SELECT count(*) FROM public.program_days WHERE program_revision_id=rev AND is_rest_day)<>0
      THEN RAISE EXCEPTION 'fixture must model actual % install without rest rows',source; END IF;
    rejected:=false;
    BEGIN PERFORM public.create_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',0,
      'expectedProgramRevisionId',rev,'timezone','America/New_York',
      'days',jsonb_build_array(
        jsonb_build_object('occurrenceId',first_occurrence,'programDayId',first_day,
          'localDate','2026-11-01'),
        jsonb_build_object('occurrenceId',second_occurrence,'programDayId',second_day,
          'localDate','2026-11-03'),
        jsonb_build_object('occurrenceId',rest_occurrence,'kind','rest',
          'localDate','2026-11-02'))));
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%explicit rest cycle or identity%'; END;
    IF NOT rejected OR EXISTS(SELECT 1 FROM public.program_schedules WHERE program_id=pid)
      THEN RAISE EXCEPTION 'schedule-only rest invented cycle identity'; END IF;
    rejected:=false;
    BEGIN PERFORM public.create_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',0,
      'expectedProgramRevisionId',rev,'timezone','America/New_York',
      'days',jsonb_build_array(
        jsonb_build_object('occurrenceId',first_occurrence,'programDayId',first_day,
          'localDate','2026-11-01','kind','rest'),
        jsonb_build_object('occurrenceId',second_occurrence,'programDayId',second_day,
          'localDate','2026-11-03'),
        jsonb_build_object('occurrenceId',rest_occurrence,'kind','rest','cycleWeek',1,
          'localDate','2026-11-02'))));
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%placement kind disagrees%'; END;
    IF NOT rejected OR EXISTS(SELECT 1 FROM public.program_schedules WHERE program_id=pid)
      THEN RAISE EXCEPTION 'existing workout was mislabelled as programmed rest'; END IF;
    created:=public.create_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',0,
      'expectedProgramRevisionId',rev,'timezone','America/New_York',
      'days',jsonb_build_array(
        jsonb_build_object('occurrenceId',first_occurrence,'programDayId',first_day,
          'localDate','2026-11-01'),
        jsonb_build_object('occurrenceId',second_occurrence,'programDayId',second_day,
          'localDate','2026-11-03'),
        jsonb_build_object('occurrenceId',rest_occurrence,'kind','rest','cycleWeek',1,
          'localDate','2026-11-02'))));
    SELECT stable_day_id INTO rest_lineage FROM public.scheduled_days
      WHERE id=rest_occurrence;
    IF (created->>'revision')::integer<>1 OR
      rest_lineage IS NULL OR rest_lineage=rest_occurrence OR
      NOT EXISTS(SELECT 1 FROM public.scheduled_days WHERE id=rest_occurrence
        AND original_kind='rest' AND current_kind='rest'
        AND original_program_day_id IS NULL AND current_program_day_id IS NULL
        AND stable_day_id=rest_lineage
        AND cycle_week=1 AND original_local_date='2026-11-02')
      OR EXISTS(SELECT 1 FROM public.program_days
        WHERE program_id=pid AND stable_day_id=rest_lineage)
      THEN RAISE EXCEPTION 'explicit % rest was not schedule-owned',source; END IF;
    rejected:=false;
    BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',1,
      'expectedProgramRevisionId',rev,'changes',jsonb_build_array(
        jsonb_build_object('occurrenceId',rest_occurrence,'status','planned',
          'localDate','2026-11-02','kind','workout','reason','workout on rest'))));
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%explicit placement, kind, reason or prescription%'; END;
    IF NOT rejected THEN RAISE EXCEPTION 'rest converted without actual prescription'; END IF;
    rejected:=false;
    BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',1,
      'expectedProgramRevisionId',rev,'changes',jsonb_build_array(
        jsonb_build_object('occurrenceId',rest_occurrence,'status','planned',
          'localDate','2026-11-02','kind','workout','programDayId',second_day,
          'reason','workout on rest'))));
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%prescription assigned twice%'; END;
    IF NOT rejected THEN RAISE EXCEPTION 'rest conversion duplicated existing workout'; END IF;
    base_changes:=jsonb_build_array(
      jsonb_build_object('occurrenceId',second_occurrence,'status','unplaced',
        'reason','displaced by explicit rest conversion'),
      jsonb_build_object('occurrenceId',rest_occurrence,'status','planned',
        'localDate','2026-11-02','kind','workout','programDayId',second_day,
        'reason','explicitly move second workout'));
    revised:=public.revise_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',1,
      'expectedProgramRevisionId',rev,'changes',base_changes));
    IF (revised->>'revision')::integer<>2 OR
      NOT EXISTS(SELECT 1 FROM public.scheduled_days WHERE id=rest_occurrence
        AND original_kind='rest' AND original_program_day_id IS NULL
        AND stable_day_id=rest_lineage
        AND current_kind='workout' AND current_program_day_id=second_day)
      OR (SELECT status FROM public.scheduled_days WHERE id=second_occurrence)<>'unplaced'
      THEN RAISE EXCEPTION 'explicit % rest conversion lost displaced work',source; END IF;
    revised:=public.revise_program_schedule_v1(jsonb_build_object(
      'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',2,
      'expectedProgramRevisionId',rev,'changes',jsonb_build_array(
        jsonb_build_object('occurrenceId',first_occurrence,'status','planned',
          'localDate','2026-11-01','kind','rest','reason','manual rest conversion'))));
    IF (revised->>'revision')::integer<>3 OR
      NOT EXISTS(SELECT 1 FROM public.scheduled_days WHERE id=first_occurrence
        AND original_kind='workout' AND original_program_day_id=first_day
        AND current_kind='rest' AND current_program_day_id IS NULL)
      THEN RAISE EXCEPTION 'workout to schedule-only rest lost original prescription'; END IF;
    IF source='generated' THEN
      revised:=public.revise_program_exercise_v2(jsonb_build_object(
        'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',1,
        'expectedRevisionId',rev,'currentStableDayId',first_stable,
        'currentStableSlotId',first_slot,
        'originalExerciseId','92000000-0000-4000-8000-000000000001',
        'replacementExerciseId','92000000-0000-4000-8000-000000000002',
        'includeCurrentDay',true));
      successor:=(revised->>'revisionId')::uuid;
      IF successor IS NULL OR NOT EXISTS(SELECT 1 FROM public.program_revisions
          WHERE id=successor AND parent_revision_id=rev AND program_id=pid) THEN
        RAISE EXCEPTION 'program revision successor lineage'; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.scheduled_days sd
          JOIN public.program_days pd ON pd.id=sd.current_program_day_id
          WHERE sd.id=rest_occurrence AND sd.original_program_day_id IS NULL
            AND sd.stable_day_id=rest_lineage
            AND sd.prescription_revision_id=rev AND sd.current_prescription_revision_id=successor
            AND pd.stable_day_id=second_stable AND pd.program_revision_id=successor
            AND sd.original_local_date='2026-11-02')
        OR NOT EXISTS(SELECT 1 FROM public.scheduled_days sd
          JOIN public.program_days pd ON pd.id=sd.current_program_day_id
          WHERE sd.id=second_occurrence AND sd.status='unplaced'
            AND pd.stable_day_id=second_stable AND pd.program_revision_id=successor)
        THEN RAISE EXCEPTION 'exercise revision stranded future scheduled workout'; END IF;
      rejected:=false;
      PERFORM set_config('ap04.fail_prescription_sync','on',true);
      BEGIN
        PERFORM public.revise_program_exercise_occurrence_v1(jsonb_build_object(
          'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',2,
          'expectedRevisionId',successor,'currentStableDayId',second_stable,
          'currentStableSlotId',second_slot,
          'originalExerciseId','92000000-0000-4000-8000-000000000002',
          'replacementExerciseId','92000000-0000-4000-8000-000000000001'));
      EXCEPTION WHEN OTHERS THEN
        rejected:=SQLERRM LIKE '%injected_prescription_sync_failure%';
      END;
      PERFORM set_config('ap04.fail_prescription_sync','off',true);
      IF NOT rejected OR (SELECT current_revision_id FROM public.programs WHERE id=pid)<>successor
        OR EXISTS(SELECT 1 FROM public.program_revisions
          WHERE program_id=pid AND revision=3)
        THEN RAISE EXCEPTION 'failed successor revision was not rolled back'; END IF;
      revised:=public.revise_program_exercise_occurrence_v1(jsonb_build_object(
        'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',2,
        'expectedRevisionId',successor,'currentStableDayId',second_stable,
        'currentStableSlotId',second_slot,
        'originalExerciseId','92000000-0000-4000-8000-000000000002',
        'replacementExerciseId','92000000-0000-4000-8000-000000000001'));
      successor:=(revised->>'revisionId')::uuid;
      IF successor IS NULL OR (SELECT revision FROM public.program_schedules
          WHERE program_id=pid)<>3
        OR NOT EXISTS(SELECT 1 FROM public.scheduled_days sd
          JOIN public.program_days pd ON pd.id=sd.current_program_day_id
          WHERE sd.id=rest_occurrence AND sd.current_prescription_revision_id=successor
            AND sd.stable_day_id=rest_lineage
            AND pd.stable_day_id=second_stable AND pd.program_revision_id=successor
            AND pd.id<>second_day AND sd.original_program_day_id IS NULL)
        THEN RAISE EXCEPTION 'occurrence swap failed to map converted rest by current day'; END IF;
      revised:=public.revise_program_schedule_v1(jsonb_build_object(
        'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',3,
        'expectedProgramRevisionId',successor,'changes',jsonb_build_array(
          jsonb_build_object('occurrenceId',first_occurrence,'status','planned',
            'localDate','2026-11-01'))));
      IF (revised->>'revision')::integer<>4
        OR NOT EXISTS(SELECT 1 FROM public.scheduled_days WHERE id=first_occurrence
          AND original_program_day_id=first_day AND prescription_revision_id=rev
          AND current_kind='rest' AND current_program_day_id IS NULL
          AND current_prescription_revision_id=successor) THEN
        RAISE EXCEPTION 'synthetic rest lost lineage across program successor'; END IF;
      finish_slot:=jsonb_build_object('slotId',second_slot,
        'prescribedExerciseId','92000000-0000-4000-8000-000000000001',
        'actualExerciseId','92000000-0000-4000-8000-000000000001',
        'prescribedSetCount',1,'sets',jsonb_build_array(
          jsonb_build_object('setId',gen_random_uuid(),'order',1,'logged',true,
            'outcome','performed','actualExerciseId','92000000-0000-4000-8000-000000000001',
            'actualReps',8,'actualLoad',30,'loadKind','external',
            'loadUnit','lb','loadSide','unknown')));
      revised:=public.finalize_workout_structure_v1(jsonb_build_object(
        'operationId',gen_random_uuid(),'draftId',gen_random_uuid(),
        'schemaVersion',2,'revision',1,
        'programDayId',(SELECT current_program_day_id FROM public.scheduled_days
          WHERE id=rest_occurrence),'prescriptionRevisionId',successor,
        'scheduleOccurrenceId',rest_occurrence,'expectedScheduleRevision',4,
        'workoutName','B','startedAt','2026-11-02T11:00:00Z',
        'endedAt','2026-11-02T11:30:00Z','durationMin',30,
        'timezone','America/New_York',
        'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(finish_slot)),
        'slots',jsonb_build_array(finish_slot)));
      IF (revised->>'scheduleRevision')::integer<>5 OR NOT EXISTS(
        SELECT 1 FROM public.scheduled_days sd
        JOIN public.workout_sessions ws ON ws.id=sd.fulfillment_session_id
        WHERE sd.id=rest_occurrence AND sd.status='fulfilled'
          AND ws.program_day_id=sd.current_program_day_id
          AND ws.program_revision_id=successor)
        THEN RAISE EXCEPTION 'successor-day Finish stranded after revision'; END IF;
    END IF;
  END LOOP;
END $implicit_rest$;
DO $composed_successor$
DECLARE
  installed jsonb;
  finished jsonb;
  corrected jsonb;
  revision_id uuid;
  successor uuid;
  v_program_id uuid;
  first_day uuid;
  second_day uuid;
  first_stable uuid:=gen_random_uuid();
  second_stable uuid:=gen_random_uuid();
  first_slot uuid:=gen_random_uuid();
  second_slot uuid:=gen_random_uuid();
  added_slot uuid:=gen_random_uuid();
  first_occurrence uuid:=gen_random_uuid();
  second_occurrence uuid:=gen_random_uuid();
  first_set jsonb;
  second_set jsonb;
  original jsonb;
  edited jsonb;
  added jsonb;
  correction jsonb;
BEGIN
  installed:=public.install_program_v2(jsonb_build_object('operationId',gen_random_uuid(),
    'artifact',jsonb_build_object('name','Scheduled future structure',
      'durationWeeks',2,'daysPerWeek',1,'source','manual','schemaVersion',2,
      'catalogVersion','test','policyVersion','program-install-v2',
      'days',jsonb_build_array(
        jsonb_build_object('dayId',first_stable,'weekNumber',1,'dayIndex',1,
          'orderInWeek',1,'workoutName','A','exercises',jsonb_build_array(
            jsonb_build_object('slotId',first_slot,
              'exerciseId','92000000-0000-4000-8000-000000000001',
              'position',1,'setCount',2,'repRangeMin',8,'repRangeMax',12,
              'targetRpe',7,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
        jsonb_build_object('dayId',second_stable,'weekNumber',2,'dayIndex',1,
          'orderInWeek',1,'workoutName','B','exercises',jsonb_build_array(
            jsonb_build_object('slotId',second_slot,
              'exerciseId','92000000-0000-4000-8000-000000000001',
              'position',1,'setCount',2,'repRangeMin',8,'repRangeMax',12,
              'targetRpe',7,'loadKind','external','loadUnit','lb','loadSide','unknown')))),
      'context',NULL)));
  v_program_id:=(installed->>'programId')::uuid;
  revision_id:=(installed->>'revisionId')::uuid;
  SELECT id INTO first_day FROM public.program_days
    WHERE program_revision_id=revision_id AND stable_day_id=first_stable;
  SELECT id INTO second_day FROM public.program_days
    WHERE program_revision_id=revision_id AND stable_day_id=second_stable;
  PERFORM public.create_program_schedule_v1(jsonb_build_object('operationId',gen_random_uuid(),
    'programId',v_program_id,'expectedRevision',0,'expectedProgramRevisionId',revision_id,
    'timezone','UTC','days',jsonb_build_array(
      jsonb_build_object('occurrenceId',first_occurrence,'programDayId',first_day,
        'localDate','2026-11-01'),
      jsonb_build_object('occurrenceId',second_occurrence,'programDayId',second_day,
        'localDate','2026-11-08'))));
  first_set:=jsonb_build_object('setId',gen_random_uuid(),'order',1,
    'logged',true,'outcome','performed',
    'actualExerciseId','92000000-0000-4000-8000-000000000001',
    'actualReps',8,'actualLoad',30,'loadKind','external','loadUnit','lb',
    'loadSide','unknown');
  second_set:=jsonb_build_object('setId',gen_random_uuid(),'order',2,
    'logged',false,'outcome','not_attempted',
    'actualExerciseId','92000000-0000-4000-8000-000000000001');
  original:=jsonb_build_object('slotId',first_slot,
    'prescribedExerciseId','92000000-0000-4000-8000-000000000001',
    'actualExerciseId','92000000-0000-4000-8000-000000000001',
    'prescribedSetCount',2,'sets',jsonb_build_array(first_set,second_set));
  finished:=public.finalize_workout_structure_v1(jsonb_build_object(
    'operationId',gen_random_uuid(),'draftId',gen_random_uuid(),'schemaVersion',2,
    'revision',1,'programDayId',first_day,'prescriptionRevisionId',revision_id,
    'scheduleOccurrenceId',first_occurrence,'expectedScheduleRevision',1,
    'workoutName','A','startedAt','2026-11-01T10:00:00Z',
    'endedAt','2026-11-01T10:30:00Z','durationMin',30,'timezone','UTC',
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(original)),
    'slots',jsonb_build_array(original)));
  edited:=jsonb_build_array(original,jsonb_build_object('slotId',added_slot,
    'prescribedExerciseId','92000000-0000-4000-8000-000000000001',
    'actualExerciseId','92000000-0000-4000-8000-000000000001',
    'prescribedSetCount',0,'order',2,'sets','[]'::jsonb));
  correction:=jsonb_build_object('operationId',gen_random_uuid(),'schemaVersion',1,
    'sessionId',finished->>'sessionId','expectedRevision',0,'expectedScheduleRevision',2,
    'effectiveSlots',edited,
    'programRemoval',jsonb_build_object('programId',v_program_id,'expectedRevision',1,
      'expectedRevisionId',revision_id,'currentStableDayId',first_stable,
      'targets',jsonb_build_array(jsonb_build_object('slotId',first_slot,'order',2)),
      'swaps',jsonb_build_array(jsonb_build_object('slotId',first_slot,
        'exerciseId','92000000-0000-4000-8000-000000000002')),
      'additions',jsonb_build_array(jsonb_build_object('slotId',added_slot,
        'exerciseId','92000000-0000-4000-8000-000000000001','setCount',1))),
    'removals',jsonb_build_object('version',1,'slots','[]'::jsonb,
      'sets',jsonb_build_array(jsonb_build_object('slotId',first_slot,
        'setId',second_set->>'setId','order',2))),
    'sets',jsonb_build_array(jsonb_build_object('actualSetId',first_set->>'setId',
      'prescriptionSlotId',first_slot,
      'prescribedExerciseId','92000000-0000-4000-8000-000000000001',
      'exerciseId','92000000-0000-4000-8000-000000000001',
      'order',1,'reps',8,'loadValue',30,'loadKind','external',
      'loadUnit','lb','loadSide','unknown')));
  corrected:=public.correct_workout_structure_v1(correction);
  successor:=(corrected->'programRemoval'->>'revisionId')::uuid;
  IF successor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.scheduled_days sd
    JOIN public.program_days successor_day ON successor_day.id=sd.current_program_day_id
    WHERE sd.id=second_occurrence AND sd.original_program_day_id=second_day
      AND sd.prescription_revision_id=revision_id
      AND sd.current_prescription_revision_id=successor
      AND successor_day.stable_day_id=second_stable
      AND successor_day.program_revision_id=successor
      AND successor_day.id<>second_day)
    OR NOT EXISTS(SELECT 1 FROM public.scheduled_days
      WHERE id=first_occurrence AND status='fulfilled'
        AND current_program_day_id=first_day
        AND current_prescription_revision_id=revision_id)
    OR (SELECT ps.revision FROM public.program_schedules ps WHERE ps.program_id=v_program_id)<>3
    OR NOT EXISTS(SELECT 1 FROM public.program_day_exercises
      WHERE program_revision_id=successor AND stable_slot_id=second_slot
        AND exercise_id='92000000-0000-4000-8000-000000000002'
        AND removal_mask->'orders'='[2]'::jsonb)
    OR NOT EXISTS(SELECT 1 FROM public.program_day_exercises
      WHERE program_revision_id=successor AND addition_lineage=added_slot)
    THEN RAISE EXCEPTION 'composed Add/Swap/Remove stranded scheduled successor or rewrote fixed work'; END IF;
  SELECT pde.stable_slot_id INTO added_slot FROM public.program_day_exercises pde
    WHERE pde.program_day_id=(SELECT current_program_day_id FROM public.scheduled_days
      WHERE id=second_occurrence) AND pde.addition_lineage=added_slot;
  first_set:=jsonb_build_object('setId',gen_random_uuid(),'order',1,
    'logged',true,'outcome','performed',
    'actualExerciseId','92000000-0000-4000-8000-000000000002',
    'actualReps',8,'actualLoad',30,'loadKind','external','loadUnit','lb',
    'loadSide','unknown');
  second_set:=jsonb_build_object('setId',gen_random_uuid(),'order',2,
    'logged',false,'outcome','not_attempted',
    'actualExerciseId','92000000-0000-4000-8000-000000000002');
  original:=jsonb_build_object('slotId',second_slot,
    'prescribedExerciseId','92000000-0000-4000-8000-000000000002',
    'actualExerciseId','92000000-0000-4000-8000-000000000002',
    'prescribedSetCount',2,'sets',jsonb_build_array(first_set,second_set));
  added:=jsonb_build_object('slotId',added_slot,
    'prescribedExerciseId','92000000-0000-4000-8000-000000000001',
    'actualExerciseId','92000000-0000-4000-8000-000000000001',
    'prescribedSetCount',1,'sets',jsonb_build_array(
      jsonb_build_object('setId',gen_random_uuid(),'order',1,
        'logged',false,'outcome','not_attempted',
        'actualExerciseId','92000000-0000-4000-8000-000000000001')));
  finished:=public.finalize_workout_structure_v1(jsonb_build_object(
    'operationId',gen_random_uuid(),'draftId',gen_random_uuid(),'schemaVersion',2,
    'revision',1,'programDayId',(SELECT current_program_day_id
      FROM public.scheduled_days WHERE id=second_occurrence),
    'prescriptionRevisionId',successor,'scheduleOccurrenceId',second_occurrence,
    'expectedScheduleRevision',3,'workoutName','B',
    'startedAt','2026-11-08T10:00:00Z','endedAt','2026-11-08T10:30:00Z',
    'durationMin',30,'timezone','UTC',
    'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(original,added)),
    'slots',jsonb_build_array(original,added),
    'removals',jsonb_build_object('version',1,'slots','[]'::jsonb,
      'sets',jsonb_build_array(jsonb_build_object('slotId',second_slot,
        'setId',second_set->>'setId','order',2)))));
  IF (finished->>'scheduleRevision')::integer<>4 OR NOT EXISTS(
    SELECT 1 FROM public.scheduled_days sd
    JOIN public.workout_sessions ws ON ws.id=sd.fulfillment_session_id
    WHERE sd.id=second_occurrence AND sd.status='fulfilled'
      AND ws.program_revision_id=successor
      AND ws.program_day_id=sd.current_program_day_id)
    OR NOT EXISTS (SELECT 1 FROM public.scheduled_days WHERE id=first_occurrence
      AND status='fulfilled' AND current_program_day_id=first_day
      AND current_prescription_revision_id=revision_id) THEN
    RAISE EXCEPTION 'composed successor Finish lost fixed prescription'; END IF;
END $composed_successor$;
RESET ROLE;
DO $legacy_setup$
DECLARE
  owner_id uuid := '91000000-0000-4000-8000-000000000001';
  pid uuid := '97000000-0000-4000-8000-000000000001';
  revision_id uuid := '97000000-0000-4000-8000-000000000002';
BEGIN
  UPDATE public.programs SET is_active=false,lifecycle='archived'
    WHERE user_id=owner_id AND is_active;
  INSERT INTO public.programs(id,user_id,name,duration_weeks,days_per_week,start_date,
    is_active,schema_version,current_revision,lifecycle,source_origin)
  VALUES(pid,owner_id,'Synthetic existing legacy program',1,2,'2023-01-01',
    true,1,1,'active','legacy');
  INSERT INTO public.program_revisions(id,user_id,program_id,revision,schema_version,
    catalog_version,policy_version,source_origin,snapshot,payload_hash,provenance)
  VALUES(revision_id,owner_id,pid,1,1,'catalog-unknown','legacy-unknown',
    'migration_snapshot','{"historicalCompleteness":"unknown"}',repeat('0',64),
    'migration_snapshot');
  UPDATE public.programs SET current_revision_id=revision_id WHERE id=pid;
  INSERT INTO public.program_days(id,program_id,week_number,day_index,order_in_week,
    workout_name,stable_day_id,program_revision_id)
  VALUES('97000000-0000-4000-8000-000000000003',pid,1,1,1,
    'Existing workout','97000000-0000-4000-8000-000000000004',revision_id),
    ('97000000-0000-4000-8000-000000000007',pid,1,2,2,
    'Existing empty workout','97000000-0000-4000-8000-000000000008',revision_id);
  INSERT INTO public.program_day_exercises(program_day_id,exercise_id,position,set_count,
    rep_range_min,rep_range_max,program_revision_id,stable_slot_id)
  VALUES('97000000-0000-4000-8000-000000000003',
    '92000000-0000-4000-8000-000000000001',1,1,8,12,revision_id,
    '97000000-0000-4000-8000-000000000005');
END $legacy_setup$;
SET LOCAL ROLE authenticated;
DO $legacy_rest$
DECLARE
  created jsonb;
  owner_id uuid := '91000000-0000-4000-8000-000000000001';
  pid uuid := '97000000-0000-4000-8000-000000000001';
  revision_id uuid := '97000000-0000-4000-8000-000000000002';
  rest_id uuid := '97000000-0000-4000-8000-000000000006';
  empty_id uuid := '97000000-0000-4000-8000-000000000009';
  empty_day uuid := '97000000-0000-4000-8000-000000000007';
  payload jsonb;
  rejected boolean;
BEGIN
  payload:=jsonb_build_object(
    'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',0,
    'expectedProgramRevisionId',revision_id,'timezone','America/New_York',
    'days',jsonb_build_array(
      jsonb_build_object('occurrenceId',gen_random_uuid(),
        'programDayId','97000000-0000-4000-8000-000000000003',
        'localDate','2026-11-01'),
      jsonb_build_object('occurrenceId',rest_id,'kind','rest','cycleWeek',1,
        'localDate','2026-11-02'),
      jsonb_build_object('occurrenceId',empty_id,'programDayId',empty_day,
        'kind','workout','status','unplaced','reason','legacy day has no exercise prescription')));
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'days',jsonb_set(payload->'days','{2,localDate}','"2026-11-03"'::jsonb)));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'empty legacy workout accepted a fabricated date'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'days',jsonb_set(payload->'days','{2,kind}','"rest"'::jsonb)));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'empty legacy workout became programmed rest'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'days',(payload->'days')-2));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%all uncompleted program days%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'empty legacy workout omitted from complete schedule'; END IF;
  rejected:=false;
  BEGIN PERFORM public.create_program_schedule_v1(payload||jsonb_build_object(
    'operationId',gen_random_uuid(),'days',jsonb_set(payload->'days','{2,reason}','""'::jsonb)));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'empty legacy workout lacks unplaced reason'; END IF;
  created:=public.create_program_schedule_v1(payload);
  IF (created->>'revision')::integer<>1
    OR NOT (public.create_program_schedule_v1(payload)->>'replayed')::boolean
    OR (SELECT start_date FROM public.programs WHERE id=pid)<>'2023-01-01'
    OR (SELECT count(*) FROM public.scheduled_days WHERE program_id=pid)<>3
    OR NOT EXISTS(SELECT 1 FROM public.scheduled_days WHERE id=rest_id
      AND original_kind='rest' AND original_program_day_id IS NULL
      AND stable_day_id<>id
      AND prescription_revision_id=revision_id AND cycle_week=1)
    OR NOT EXISTS(SELECT 1 FROM public.scheduled_days WHERE id=empty_id
      AND original_program_day_id=empty_day AND current_program_day_id=empty_day
      AND stable_day_id='97000000-0000-4000-8000-000000000008'
      AND original_kind='workout' AND current_kind='workout' AND status='unplaced'
      AND original_local_date IS NULL AND current_local_date IS NULL
      AND original_placement_provenance='legacy_empty_prescription'
      AND original_unplaced_reason='legacy day has no exercise prescription'
      AND fulfillment_session_id IS NULL)
    THEN RAISE EXCEPTION 'legacy revision rest fabricated historical placement'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object(
    'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',1,
    'expectedProgramRevisionId',revision_id,'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',empty_id,'kind','workout',
        'status','planned','localDate','2026-11-03'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%prescription required%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'unprescribed legacy day became startable'; END IF;
  rejected:=false;
  BEGIN PERFORM public.revise_program_schedule_v1(jsonb_build_object(
    'operationId',gen_random_uuid(),'programId',pid,'expectedRevision',1,
    'expectedProgramRevisionId',revision_id,'changes',jsonb_build_array(
      jsonb_build_object('occurrenceId',empty_id,'kind','rest',
        'status','planned','localDate','2026-11-03','reason','not a rest prescription'))));
  EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%prescription required%'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'legacy empty day revised into rest'; END IF;
  rejected:=false;
  BEGIN PERFORM public.finalize_workout_v2(jsonb_build_object(
    'operationId',gen_random_uuid(),'draftId',gen_random_uuid(),
    'schemaVersion',2,'revision',1,'programDayId',empty_day,
    'prescriptionRevisionId',revision_id,'scheduleOccurrenceId',empty_id,
    'expectedScheduleRevision',1,'slots','[]'::jsonb));
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.workout_sessions WHERE program_day_id=empty_day)
    THEN RAISE EXCEPTION 'empty legacy workout was finalized'; END IF;
END $legacy_rest$;
RESET ROLE;
ROLLBACK;
