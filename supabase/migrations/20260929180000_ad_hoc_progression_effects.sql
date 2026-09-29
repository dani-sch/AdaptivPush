-- History-only ad-hoc work informs matching exercise progression without
-- fulfilling a program day, sequence state, or prescription revision.
CREATE OR REPLACE FUNCTION public.finalize_ad_hoc_workout_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid:=auth.uid();
  op uuid:=(p_payload->>'operationId')::uuid;
  draft uuid:=(p_payload->>'draftId')::uuid;
  hash text:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  existing public.workout_sessions%ROWTYPE;
  sid uuid:=gen_random_uuid();
  entry jsonb;
  requested_completion text:=COALESCE(p_payload->>'completionClass','complete');
  count_sets integer:=0;
  volume numeric:=0;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF op IS NULL THEN RAISE EXCEPTION 'invalid_input: operation required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  SELECT * INTO existing FROM public.workout_sessions WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN
    IF existing.payload_hash IS DISTINCT FROM hash OR existing.program_day_id IS NOT NULL
      OR existing.program_revision_id IS NOT NULL OR existing.schema_version<>2
      OR existing.receipt IS NULL
      THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN existing.receipt||'{"replayed":true}'::jsonb;
  END IF;
  IF draft IS NULL OR p_payload->>'schemaVersion' IS DISTINCT FROM '1'
    OR requested_completion NOT IN ('complete','partial')
    OR p_payload ? 'programId' OR p_payload ? 'stableDayId'
    OR p_payload ? 'programDayId' OR p_payload ? 'prescriptionRevisionId'
    OR p_payload ? 'scheduleOccurrenceId' OR p_payload ? 'expectedScheduleRevision'
    OR p_payload ? 'programRemoval' OR p_payload ? 'sequenceRevision'
    OR NULLIF(btrim(p_payload->>'workoutName'),'') IS NULL
    OR (p_payload->>'startedAt')::timestamptz IS NULL
    OR COALESCE((p_payload->>'endedAt')::timestamptz,now()) < (p_payload->>'startedAt')::timestamptz
    OR jsonb_typeof(p_payload->'sets') IS DISTINCT FROM 'array'
    OR (requested_completion='complete' AND jsonb_array_length(p_payload->'sets')=0)
    THEN RAISE EXCEPTION 'invalid_input: ad-hoc actual history required'; END IF;
  IF EXISTS(SELECT 1 FROM public.program_sequence_receipts WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  IF (SELECT count(DISTINCT value->>'setId') FROM jsonb_array_elements(p_payload->'sets'))
    <> jsonb_array_length(p_payload->'sets')
    OR (SELECT count(DISTINCT (value->>'exerciseId')||':'||(value->>'order'))
      FROM jsonb_array_elements(p_payload->'sets')) <> jsonb_array_length(p_payload->'sets')
    THEN RAISE EXCEPTION 'invalid_input: unique actual sets and exercise order'; END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_payload->'sets') LOOP
    IF (entry->>'setId')::uuid IS NULL OR (entry->>'exerciseId')::uuid IS NULL
      OR COALESCE((entry->>'order')::integer,0)<1 OR COALESCE((entry->>'reps')::integer,0)<1
      OR COALESCE(entry->>'loadKind','') NOT IN ('external','bodyweight','assistance','unknown')
      OR COALESCE(entry->>'loadUnit','') NOT IN ('lb','kg','none')
      OR COALESCE(entry->>'loadSide','') NOT IN ('external_total','per_hand','combined','unilateral','unknown')
      OR (entry->>'loadKind' IN ('external','assistance')
        AND ((entry->>'loadValue')::numeric IS NULL OR entry->>'loadUnit' NOT IN ('lb','kg')))
      OR (entry->>'loadKind' IN ('bodyweight','unknown')
        AND (entry->>'loadUnit'<>'none' OR COALESCE((entry->>'loadValue')::numeric,0)<>0))
      OR lower(COALESCE(entry->>'loadValue','')) IN ('nan','infinity','-infinity')
      OR (entry->>'loadValue')::numeric < 0 OR (entry->>'rpe')::numeric NOT BETWEEN 0 AND 10
      OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(entry->>'exerciseId')::uuid)
      THEN RAISE EXCEPTION 'invalid_input: ad-hoc set'; END IF;
    count_sets:=count_sets+1;
    volume:=volume+CASE WHEN entry->>'loadKind'='external' THEN COALESCE((entry->>'loadValue')::numeric,0)
      * CASE WHEN entry->>'loadUnit'='kg' THEN 2.2046226218 ELSE 1 END * (entry->>'reps')::integer ELSE 0 END;
  END LOOP;
  INSERT INTO public.workout_sessions(id,user_id,program_day_id,workout_name,started_at,ended_at,
    duration_min,total_volume_lb,operation_id,draft_id,schema_version,revision,lifecycle,
    completion_class,payload_hash,source_timezone,finalized_at)
  VALUES(sid,uid,NULL,btrim(p_payload->>'workoutName'),(p_payload->>'startedAt')::timestamptz,
    COALESCE((p_payload->>'endedAt')::timestamptz,now()),GREATEST(0,COALESCE((p_payload->>'durationMin')::integer,0)),
    volume,op,draft,2,1,'finalized',requested_completion,hash,NULLIF(p_payload->>'timezone',''),now());
  FOR entry IN SELECT value FROM jsonb_array_elements(p_payload->'sets') LOOP
    INSERT INTO public.workout_exercise_sets(session_id,exercise_id,set_number,reps,weight_lb,rpe,
      actual_set_id,order_index,load_value,load_unit,load_kind,load_side,logged_at)
    VALUES(sid,(entry->>'exerciseId')::uuid,(entry->>'order')::integer,(entry->>'reps')::integer,
      CASE WHEN entry->>'loadKind'='external' THEN COALESCE((entry->>'loadValue')::numeric,0)
        * CASE WHEN entry->>'loadUnit'='kg' THEN 2.2046226218 ELSE 1 END ELSE 0 END,
      (entry->>'rpe')::numeric,(entry->>'setId')::uuid,(entry->>'order')::integer,
      (entry->>'loadValue')::numeric,entry->>'loadUnit',entry->>'loadKind',entry->>'loadSide',
      COALESCE((entry->>'loggedAt')::timestamptz,now()));
  END LOOP;
  INSERT INTO public.workout_receipt_effects(user_id,workout_session_id,effect_type)
  SELECT uid,sid,'progression_projection' WHERE count_sets>0;
  result:=jsonb_build_object('sessionId',sid,'operationId',op,'draftId',draft,
    'revision',1,'completionClass',requested_completion,'setCount',count_sets,'finalizedAt',now(),'replayed',false);
  UPDATE public.workout_sessions SET receipt=result WHERE id=sid;
  RETURN result;
END $$;
