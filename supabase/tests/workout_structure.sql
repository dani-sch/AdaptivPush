-- Combined sequence uses isolated synthetic data and rolls back all writes.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL client_min_messages=warning;
INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES('81000000-0000-4000-8000-000000000001','authenticated','authenticated','structure@example.invalid','','{"provider":"email","providers":["email"]}','{}',now(),now());
SET LOCAL ROLE service_role;
INSERT INTO public.exercises(id,name,exercisedb_id) VALUES
('82000000-0000-4000-8000-000000000001','Structure press','structure-press'),
('82000000-0000-4000-8000-000000000002','Structure row','structure-row');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $sequence$
DECLARE
 installed jsonb; payload jsonb; receipt jsonb; replay jsonb; correction jsonb; corrected jsonb; snapshot jsonb;
 original jsonb; slots jsonb; one jsonb; two jsonb; extra jsonb; added jsonb; changes jsonb;
 pid uuid; base uuid; day uuid; session uuid; rev uuid; rejected boolean;
 first_slot uuid:='84000000-0000-4000-8000-000000000001';
 second_slot uuid:='84000000-0000-4000-8000-000000000002';
 source_day uuid:='83000000-0000-4000-8000-000000000001';
 target_day uuid:='83000000-0000-4000-8000-000000000002';
 addition uuid:='84000000-0000-4000-8000-000000000003';
 press uuid:='82000000-0000-4000-8000-000000000001';
 row_ex uuid:='82000000-0000-4000-8000-000000000002';
BEGIN
 installed:=public.install_program_v2(jsonb_build_object('operationId',gen_random_uuid(),'artifact',jsonb_build_object(
 'name','Editing sequence','goal','strength','durationWeeks',2,'daysPerWeek',1,'source','manual','schemaVersion',2,'catalogVersion','test','policyVersion','program-install-v2',
 'days',jsonb_build_array(
 jsonb_build_object('dayId',source_day,'weekNumber',1,'dayIndex',1,'orderInWeek',1,'workoutName','Day','estimatedDurationMin',30,'exercises',jsonb_build_array(jsonb_build_object('slotId',first_slot,'exerciseId',press,'position',1,'setCount',2,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown'))),
 jsonb_build_object('dayId',target_day,'weekNumber',2,'dayIndex',1,'orderInWeek',1,'workoutName','Day','estimatedDurationMin',30,'exercises',jsonb_build_array(jsonb_build_object('slotId',second_slot,'exerciseId',press,'position',1,'setCount',2,'repRangeMin',8,'repRangeMax',12,'targetRpe',7,'suggestedLoad',NULL,'loadKind','external','loadUnit','lb','loadSide','unknown')))),'context',NULL)));
 pid:=(installed->>'programId')::uuid; base:=(installed->>'revisionId')::uuid;
 SELECT id INTO day FROM public.program_days WHERE program_revision_id=base AND stable_day_id=source_day;
 one:=jsonb_build_object('setId','87000000-0000-4000-8000-000000000001','order',1,'logged',true,'outcome','performed','actualExerciseId',press,'actualReps',8,'actualLoad',30,'loadKind','external','loadUnit','lb','loadSide','unknown','actualRpe',NULL);
 two:=one||jsonb_build_object('setId','87000000-0000-4000-8000-000000000002','order',2,'logged',false,'outcome','not_attempted','actualReps',NULL,'actualLoad',NULL,'actualExerciseId',row_ex);
 extra:=two||jsonb_build_object('setId','87000000-0000-4000-8000-000000000003','order',3,'enteredLoadText','3.','enteredRepsText','9');
 original:=jsonb_build_object('slotId',first_slot,'prescribedExerciseId',press,'prescribedSetCount',2,'sets',jsonb_build_array(one,two));
 slots:=jsonb_build_array(original||jsonb_build_object('actualExerciseId',row_ex,'sets',jsonb_build_array(one,two,extra)));
 payload:=jsonb_build_object('operationId',gen_random_uuid(),'draftId',gen_random_uuid(),'schemaVersion',2,'revision',1,
 'programDayId',day,'prescriptionRevisionId',base,'workoutName','Day','startedAt','2026-09-18T10:00:00Z','endedAt','2026-09-18T10:30:00Z','durationMin',30,'timezone','UTC',
 'frozenPrescription',jsonb_build_object('slots',jsonb_build_array(original)),'slots',slots);
 -- Baseline fails HERE with P0001 invalid_input: set coverage despite valid originals.
 receipt:=public.finalize_workout_removals_v1(payload);
 session:=(receipt->>'sessionId')::uuid;
 IF (receipt->>'setCount')::integer<>1 OR receipt->>'completionClass'<>'partial' THEN RAISE EXCEPTION 'unchecked extra became performance'; END IF;
 IF jsonb_array_length((SELECT prescription_snapshot->'effectiveSlots'->0->'sets' FROM public.workout_sessions WHERE id=session))<>3 THEN RAISE EXCEPTION 'blank extra disappeared'; END IF;
 replay:=public.finalize_workout_removals_v1(payload);
 IF NOT (replay->>'replayed')::boolean THEN RAISE EXCEPTION 'finish replay'; END IF;
 -- Correct a performed number; add blank set; swap the effective assignment;
 -- remove a prescribed set and add the same catalog exercise twice, one future.
 extra:=extra||jsonb_build_object('setId','87000000-0000-4000-8000-000000000004','order',4);
 slots:=jsonb_build_array((slots->0)||jsonb_build_object('actualExerciseId',row_ex,'sets',jsonb_build_array(one,extra)));
 added:=jsonb_build_object('slotId',addition,'prescribedExerciseId',press,'actualExerciseId',press,'prescribedSetCount',0,'order',2,'exerciseName','Added press',
 'sets',jsonb_build_array(two||jsonb_build_object('setId','87000000-0000-4000-8000-000000000005','order',1,'actualExerciseId',press)));
 slots:=slots||jsonb_build_array(added,added||jsonb_build_object('slotId','84000000-0000-4000-8000-000000000004','order',3,'sets',jsonb_build_array(two||jsonb_build_object('setId','87000000-0000-4000-8000-000000000006','order',1,'actualExerciseId',press))));
 changes:=jsonb_build_object('programId',pid,'expectedRevision',1,'expectedRevisionId',base,'currentStableDayId',source_day,
 'targets',jsonb_build_array(jsonb_build_object('slotId',first_slot,'order',2)),
 'swaps',jsonb_build_array(jsonb_build_object('slotId',first_slot,'exerciseId',row_ex)),
 'additions',jsonb_build_array(jsonb_build_object('slotId',addition,'exerciseId',press,'setCount',1)));
 correction:=jsonb_build_object('schemaVersion',1,'operationId',gen_random_uuid(),'sessionId',session,'expectedRevision',0,'effectiveSlots',slots,'programRemoval',changes,
 'removals',jsonb_build_object('version',1,'slots','[]'::jsonb,'sets',jsonb_build_array(jsonb_build_object('slotId',first_slot,'setId',two->>'setId','order',2))),
 'sets',jsonb_build_array(jsonb_build_object('actualSetId',one->>'setId','prescriptionSlotId',first_slot,'prescribedExerciseId',press,'exerciseId',press,'order',1,'reps',9,'loadValue',30,'loadKind','external','loadUnit','lb','loadSide','unknown','rpe',NULL,'loggedAt','2026-09-18T10:10:00Z')));
 corrected:=public.correct_workout_structure_v1(correction);
 rev:=(corrected->'programRemoval'->>'revisionId')::uuid;
 IF (SELECT current_revision FROM public.programs WHERE id=pid)<>2 THEN RAISE EXCEPTION 'changes were not one revision'; END IF;
 SELECT prescription_snapshot INTO snapshot FROM public.workout_sessions WHERE id=session;
 IF snapshot->'slots'<>payload->'frozenPrescription'->'slots' OR snapshot->'effectiveSlots'<>slots THEN RAISE EXCEPTION 'structural intent or original history lost'; END IF;
 IF (SELECT count(*) FROM public.workout_exercise_sets WHERE session_id=session)<>1 THEN RAISE EXCEPTION 'blank additions manufactured results'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.program_day_exercises WHERE program_revision_id=rev AND stable_slot_id=second_slot AND exercise_id=row_ex AND removal_mask->'orders'='[2]') THEN RAISE EXCEPTION 'swap/removal composition'; END IF;
 IF (SELECT count(*) FROM public.program_day_exercises WHERE program_revision_id=rev AND addition_lineage=addition)<>1 THEN RAISE EXCEPTION 'future addition scope'; END IF;
 IF EXISTS(SELECT 1 FROM public.program_day_exercises WHERE program_revision_id=base AND (removal_mask IS NOT NULL OR addition_lineage IS NOT NULL)) THEN RAISE EXCEPTION 'original program changed'; END IF;
 replay:=public.correct_workout_structure_v1(correction);
 IF NOT (replay->>'replayed')::boolean OR (SELECT current_revision FROM public.programs WHERE id=pid)<>2 THEN RAISE EXCEPTION 'correction replay duplicate effects'; END IF;
 rejected:=false;
 BEGIN PERFORM public.correct_workout_structure_v1(correction||jsonb_build_object('operationId',gen_random_uuid())); EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision%'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'stale correction accepted'; END IF;
 rejected:=false;
 BEGIN PERFORM public.correct_workout_structure_v1(correction||'{"sets":[]}'::jsonb); EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%operation_payload_mismatch%'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'replay changed payload'; END IF;
 rejected:=false;
 BEGIN PERFORM public.correct_workout_structure_v1(correction||jsonb_build_object('operationId',gen_random_uuid(),'expectedRevision',1)); EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%stale_revision: program changed%'; END;
 IF NOT rejected OR (SELECT correction_revision FROM public.workout_sessions WHERE id=session)<>1 THEN RAISE EXCEPTION 'stale program did not roll back correction'; END IF;
 PERFORM set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
 rejected:=false;
 BEGIN PERFORM public.correct_workout_structure_v1(correction); EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE '%forbidden%'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'different owner accessed correction'; END IF;
 PERFORM set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
 IF has_function_privilege('anon','public.workout_structure_capability_v1()','EXECUTE')
 OR has_function_privilege('anon','public.correct_workout_structure_v1(jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.finalize_workout_structure_v1(jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.revise_program_removals_v1(jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.validate_workout_structure(jsonb,jsonb,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.validate_workout_program_changes(jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'entrypoint grants'; END IF;
END $sequence$;
RESET ROLE;
ROLLBACK;
