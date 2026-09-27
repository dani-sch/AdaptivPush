-- Separate relative sequence authority. AP-04 placements and prescription revisions are untouched.
SET lock_timeout = '5s';
SET statement_timeout = '120s';

CREATE TABLE public.program_sequences (
  program_id uuid PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);

CREATE TABLE public.program_sequence_days (
  program_id uuid NOT NULL,
  user_id uuid NOT NULL,
  stable_day_id uuid NOT NULL,
  position integer NOT NULL CHECK (position > 0),
  original_kind text NOT NULL CHECK (original_kind IN ('workout','rest')),
  status text NOT NULL CHECK (status IN
    ('pending','skipped','replaced_with_rest','rest','completed','partial')),
  session_id uuid UNIQUE REFERENCES public.workout_sessions(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id,stable_day_id),
  FOREIGN KEY (program_id,user_id) REFERENCES public.program_sequences(program_id,user_id) ON DELETE CASCADE,
  CHECK ((original_kind='rest' AND status='rest' AND session_id IS NULL)
    OR (original_kind='workout' AND
      ((status IN ('completed','partial') AND session_id IS NOT NULL)
        OR (status IN ('pending','skipped','replaced_with_rest') AND session_id IS NULL))))
);
CREATE UNIQUE INDEX program_sequence_days_position_key ON public.program_sequence_days(program_id,position);

CREATE TABLE public.program_sequence_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  program_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initialize','change','finalize')),
  request_hash text NOT NULL,
  base_revision integer NOT NULL CHECK (base_revision >= 0),
  resulting_revision integer NOT NULL CHECK (resulting_revision=base_revision+1),
  receipt jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,operation_id),
  FOREIGN KEY (program_id,user_id) REFERENCES public.program_sequences(program_id,user_id) ON DELETE CASCADE
);

ALTER TABLE public.program_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sequence_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sequence_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_sequences_owner_read ON public.program_sequences
  FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY program_sequence_days_owner_read ON public.program_sequence_days
  FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY program_sequence_receipts_owner_read ON public.program_sequence_receipts
  FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
REVOKE ALL ON public.program_sequences,public.program_sequence_days,
  public.program_sequence_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.program_sequences,public.program_sequence_days,
  public.program_sequence_receipts TO authenticated;

CREATE FUNCTION public.program_sequence_capability_v1() RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$ SELECT 1 $$;

CREATE FUNCTION public.get_program_sequence_v1(p_program_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  uid uuid:=auth.uid();
  root public.program_sequences%ROWTYPE;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO root FROM public.program_sequences
    WHERE program_id=p_program_id AND user_id=uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object('programId',root.program_id,'revision',root.revision,
    'paused',root.paused,
    'nextStableDayId',CASE WHEN root.paused THEN NULL ELSE
      (SELECT d.stable_day_id FROM public.program_sequence_days d
       WHERE d.program_id=root.program_id AND d.status='pending'
         AND d.original_kind='workout' ORDER BY d.position LIMIT 1) END,
    'days',COALESCE(jsonb_agg(jsonb_build_object(
      'stableDayId',day.stable_day_id,'position',day.position,
      'originalKind',day.original_kind,'status',day.status,'sessionId',day.session_id,
      'actualCompletionClass',actual.completion_class) ORDER BY day.position),'[]'::jsonb),
    'counts',jsonb_build_object(
      'completed',count(*) FILTER (WHERE day.status='completed'),
      'partial',count(*) FILTER (WHERE day.status='partial'),
      'skipped',count(*) FILTER (WHERE day.status='skipped'),
      'pending',count(*) FILTER (WHERE day.status='pending'),
      'replacedWithRest',count(*) FILTER (WHERE day.status='replaced_with_rest'),
      'rest',count(*) FILTER (WHERE day.status='rest')))
  INTO result FROM public.program_sequence_days day
  LEFT JOIN public.workout_sessions actual ON actual.id=day.session_id AND actual.user_id=uid
  WHERE day.program_id=root.program_id;
  RETURN result;
END $$;

CREATE FUNCTION public.initialize_program_sequence_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid:=auth.uid();
  pid uuid:=(p_payload->>'programId')::uuid;
  op uuid:=(p_payload->>'operationId')::uuid;
  hash text:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  program public.programs%ROWTYPE;
  prior public.program_sequence_receipts%ROWTYPE;
  count_days integer;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF pid IS NULL OR op IS NULL
    THEN RAISE EXCEPTION 'invalid_input: program and operation required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  SELECT * INTO prior FROM public.program_sequence_receipts WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN
    IF prior.request_hash<>hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN prior.receipt||'{"replayed":true}'::jsonb;
  END IF;
  IF p_payload->>'schemaVersion' IS DISTINCT FROM '1'
    THEN RAISE EXCEPTION 'invalid_input: sequence schema required'; END IF;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  SELECT * INTO program FROM public.programs WHERE id=pid AND user_id=uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF program.current_revision_id IS NULL THEN RAISE EXCEPTION 'target_unavailable: program revision'; END IF;
  IF EXISTS(SELECT 1 FROM public.program_sequences WHERE program_id=pid) THEN
    RAISE EXCEPTION 'stale_revision: sequence exists';
  END IF;
  IF EXISTS(SELECT 1 FROM public.program_schedules WHERE program_id=pid) THEN
    RAISE EXCEPTION 'conflict: dated placement exists';
  END IF;
  SELECT count(*) INTO count_days FROM public.program_days
    WHERE program_id=pid AND program_revision_id=program.current_revision_id;
  IF count_days=0 THEN RAISE EXCEPTION 'target_unavailable: program days'; END IF;
  INSERT INTO public.program_sequences(program_id,user_id) VALUES(pid,uid);
  INSERT INTO public.program_sequence_days(program_id,user_id,stable_day_id,position,original_kind,status,session_id)
  SELECT pid,uid,d.stable_day_id,
    row_number() OVER (ORDER BY d.week_number,d.order_in_week,d.day_index,d.id),
    CASE WHEN d.is_rest_day THEN 'rest' ELSE 'workout' END,
    CASE WHEN d.is_rest_day THEN 'rest'
      WHEN actual.id IS NULL THEN 'pending'
      WHEN actual.completion_class='complete' THEN 'completed'
      ELSE 'partial' END,
    actual.id
  FROM public.program_days d
  LEFT JOIN LATERAL (
    SELECT ws.id,ws.completion_class FROM public.workout_sessions ws
    JOIN public.program_days historical ON historical.id=ws.program_day_id
    WHERE historical.program_id=pid AND historical.stable_day_id=d.stable_day_id
      AND ws.user_id=uid AND ws.schema_version=2 AND ws.operation_id IS NOT NULL
      AND ws.program_revision_id=historical.program_revision_id AND ws.lifecycle='finalized'
      AND ws.completion_class IN ('complete','partial')
    ORDER BY ws.finalized_at DESC,ws.id LIMIT 1
  ) actual ON NOT d.is_rest_day
  WHERE d.program_id=pid AND d.program_revision_id=program.current_revision_id;
  result:=jsonb_build_object('programId',pid,'revision',1,'replayed',false);
  INSERT INTO public.program_sequence_receipts(user_id,operation_id,program_id,kind,request_hash,base_revision,resulting_revision,receipt)
  VALUES(uid,op,pid,'initialize',hash,0,1,result);
  RETURN result;
END $$;

CREATE FUNCTION public.change_program_sequence_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid:=auth.uid();
  pid uuid:=(p_payload->>'programId')::uuid;
  op uuid:=(p_payload->>'operationId')::uuid;
  expected integer:=(p_payload->>'expectedRevision')::integer;
  hash text:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  root public.program_sequences%ROWTYPE;
  prior public.program_sequence_receipts%ROWTYPE;
  day public.program_sequence_days%ROWTYPE;
  kind text:=p_payload->>'kind';
  target uuid;
  state text;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF pid IS NULL OR op IS NULL
    THEN RAISE EXCEPTION 'invalid_input: program and operation required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  SELECT * INTO prior FROM public.program_sequence_receipts WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN
    IF prior.request_hash<>hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN prior.receipt||'{"replayed":true}'::jsonb;
  END IF;
  IF expected IS NULL OR p_payload->>'schemaVersion' IS DISTINCT FROM '1'
    THEN RAISE EXCEPTION 'invalid_input: sequence schema and revision required'; END IF;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  SELECT * INTO root FROM public.program_sequences WHERE program_id=pid AND user_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF root.revision<>expected THEN RAISE EXCEPTION 'stale_revision: sequence changed'; END IF;
  IF kind='reorder' THEN
    IF jsonb_typeof(p_payload->'dayIds') IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_payload->'dayIds') <>
        (SELECT count(*) FROM public.program_sequence_days WHERE program_id=pid)
      OR (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_payload->'dayIds')) <>
        jsonb_array_length(p_payload->'dayIds')
      OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_payload->'dayIds') v
        WHERE NOT EXISTS(SELECT 1 FROM public.program_sequence_days d
          WHERE d.program_id=pid AND d.stable_day_id::text=v.value))
      THEN RAISE EXCEPTION 'invalid_input: exact day order required'; END IF;
    -- The unique position index is immediate; use a disjoint temporary range within this transaction.
    UPDATE public.program_sequence_days SET position=position+
      (SELECT count(*) FROM public.program_sequence_days WHERE program_id=pid),updated_at=now()
      WHERE program_id=pid;
    UPDATE public.program_sequence_days d SET position=ordered.ordinality,updated_at=now()
      FROM jsonb_array_elements_text(p_payload->'dayIds') WITH ORDINALITY ordered(id,ordinality)
      WHERE d.program_id=pid AND d.stable_day_id::text=ordered.id;
  ELSIF kind='set_day' THEN
    target:=(p_payload->>'stableDayId')::uuid;
    state:=p_payload->>'status';
    SELECT * INTO day FROM public.program_sequence_days
      WHERE program_id=pid AND stable_day_id=target FOR UPDATE;
    IF NOT FOUND OR day.original_kind<>'workout' THEN RAISE EXCEPTION 'target_unavailable: workout day'; END IF;
    IF day.session_id IS NOT NULL THEN RAISE EXCEPTION 'conflict: finalized day'; END IF;
    IF state NOT IN ('pending','skipped','replaced_with_rest') OR state IS NULL OR state=day.status
      THEN RAISE EXCEPTION 'invalid_input: day transition'; END IF;
    UPDATE public.program_sequence_days SET status=state,updated_at=now()
      WHERE program_id=pid AND stable_day_id=target;
  ELSIF kind IN ('pause','resume') THEN
    IF root.paused=(kind='pause') THEN RAISE EXCEPTION 'conflict: pause unchanged'; END IF;
    UPDATE public.program_sequences SET paused=(kind='pause') WHERE program_id=pid;
  ELSE
    RAISE EXCEPTION 'invalid_input: sequence action';
  END IF;
  UPDATE public.program_sequences SET revision=expected+1,updated_at=now() WHERE program_id=pid;
  result:=jsonb_build_object('programId',pid,'revision',expected+1,'replayed',false);
  INSERT INTO public.program_sequence_receipts(user_id,operation_id,program_id,kind,request_hash,base_revision,resulting_revision,receipt)
  VALUES(uid,op,pid,'change',hash,expected,expected+1,result);
  RETURN result;
END $$;

-- The old Finish RPCs have no sequence operation receipt. Only the pending
-- command receipt created by the sequence writer permits an insert for its selected day.
CREATE FUNCTION public.guard_program_sequence_finish_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  day public.program_days%ROWTYPE;
BEGIN
  IF EXISTS(SELECT 1 FROM public.program_sequence_receipts r
      WHERE r.user_id=NEW.user_id AND r.operation_id=NEW.operation_id
        AND (r.kind<>'finalize' OR r.receipt IS NOT NULL))
    THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  IF NEW.program_day_id IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.program_sequence_receipts r
      WHERE r.user_id=NEW.user_id AND r.operation_id=NEW.operation_id)
      THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO day FROM public.program_days WHERE id=NEW.program_day_id;
  IF EXISTS(SELECT 1 FROM public.program_sequences WHERE program_id=day.program_id) THEN
    IF NOT EXISTS(SELECT 1 FROM public.program_sequence_receipts r
      JOIN public.program_sequence_days sd ON sd.program_id=r.program_id AND sd.stable_day_id=day.stable_day_id
      WHERE r.user_id=NEW.user_id AND r.program_id=day.program_id
        AND r.operation_id=NEW.operation_id AND r.kind='finalize' AND r.receipt IS NULL
        AND sd.status='pending' AND sd.session_id IS NULL)
      THEN RAISE EXCEPTION 'conflict: sequence finish required'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_program_sequence_finish_v1 BEFORE INSERT ON public.workout_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_program_sequence_finish_v1();

CREATE FUNCTION public.finalize_program_sequence_day_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid:=auth.uid();
  pid uuid:=(p_payload->>'programId')::uuid;
  op uuid:=(p_payload->>'operationId')::uuid;
  target uuid:=(p_payload->>'stableDayId')::uuid;
  expected integer:=(p_payload->>'expectedRevision')::integer;
  hash text:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  root public.program_sequences%ROWTYPE;
  day public.program_sequence_days%ROWTYPE;
  prior public.program_sequence_receipts%ROWTYPE;
  prescription public.program_days%ROWTYPE;
  result jsonb;
  sid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF pid IS NULL OR op IS NULL
    THEN RAISE EXCEPTION 'invalid_input: program and operation required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  SELECT * INTO prior FROM public.program_sequence_receipts WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN
    IF prior.request_hash<>hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN prior.receipt||'{"replayed":true}'::jsonb;
  END IF;
  IF target IS NULL OR expected IS NULL OR p_payload->>'schemaVersion' IS DISTINCT FROM '1'
    OR jsonb_typeof(p_payload->'workout') IS DISTINCT FROM 'object'
    OR p_payload->'workout'->>'operationId' IS DISTINCT FROM op::text
    THEN RAISE EXCEPTION 'invalid_input: selected day and matching workout operation required'; END IF;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op)
    OR EXISTS(SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  SELECT * INTO root FROM public.program_sequences WHERE program_id=pid AND user_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF root.revision<>expected THEN RAISE EXCEPTION 'stale_revision: sequence changed'; END IF;
  IF root.paused THEN RAISE EXCEPTION 'conflict: program paused'; END IF;
  SELECT * INTO day FROM public.program_sequence_days
    WHERE program_id=pid AND stable_day_id=target FOR UPDATE;
  IF NOT FOUND OR day.status<>'pending' OR day.original_kind<>'workout'
    THEN RAISE EXCEPTION 'conflict: selected day unavailable'; END IF;
  SELECT * INTO prescription FROM public.program_days
    WHERE id=(p_payload->'workout'->>'programDayId')::uuid AND program_id=pid
      AND stable_day_id=target AND program_revision_id=(p_payload->'workout'->>'prescriptionRevisionId')::uuid
      AND program_revision_id=(SELECT current_revision_id FROM public.programs
        WHERE id=pid AND user_id=uid);
  IF NOT FOUND OR prescription.is_rest_day THEN RAISE EXCEPTION 'stale_revision: selected prescription lineage'; END IF;
  IF (p_payload->'workout' ? 'scheduleOccurrenceId')
    OR (p_payload->'workout' ? 'expectedScheduleRevision')
    THEN RAISE EXCEPTION 'invalid_input: dated placement not sequence authority'; END IF;
  INSERT INTO public.program_sequence_receipts(user_id,operation_id,program_id,kind,request_hash,base_revision,resulting_revision)
  VALUES(uid,op,pid,'finalize',hash,expected,expected+1);
  result:=public.finalize_workout_v2(p_payload->'workout');
  IF result->>'completionClass' NOT IN ('complete','partial')
    THEN RAISE EXCEPTION 'invalid_input: finalized complete or partial work required'; END IF;
  sid:=(result->>'sessionId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id=sid AND ws.user_id=uid AND ws.program_day_id=prescription.id
      AND ws.lifecycle='finalized' AND ws.operation_id=op) THEN
    RAISE EXCEPTION 'conflict: finalized workout lineage'; END IF;
  UPDATE public.program_sequence_days SET
    status=CASE WHEN result->>'completionClass'='complete' THEN 'completed' ELSE 'partial' END,
    session_id=sid,updated_at=now() WHERE program_id=pid AND stable_day_id=target;
  UPDATE public.program_sequences SET revision=expected+1,updated_at=now() WHERE program_id=pid;
  result:=result||jsonb_build_object('sequenceRevision',expected+1,'stableDayId',target);
  UPDATE public.program_sequence_receipts SET receipt=result WHERE user_id=uid AND operation_id=op;
  RETURN result;
END $$;

-- Completion context follows the linked actual session, not the original receipt.
-- A correction changes classification, never the sequence revision or selected day.
CREATE FUNCTION public.refresh_program_sequence_completion_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  UPDATE public.program_sequence_days SET
    status=CASE WHEN NEW.completion_class='complete' THEN 'completed' ELSE 'partial' END,
    updated_at=now()
    WHERE session_id=NEW.id AND user_id=NEW.user_id
      AND status IS DISTINCT FROM CASE WHEN NEW.completion_class='complete' THEN 'completed' ELSE 'partial' END;
  RETURN NEW;
END $$;
CREATE TRIGGER refresh_program_sequence_completion_v1
AFTER UPDATE OF completion_class ON public.workout_sessions
FOR EACH ROW WHEN (OLD.completion_class IS DISTINCT FROM NEW.completion_class)
EXECUTE FUNCTION public.refresh_program_sequence_completion_v1();

CREATE FUNCTION public.finalize_ad_hoc_workout_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid:=auth.uid();
  op uuid:=(p_payload->>'operationId')::uuid;
  draft uuid:=(p_payload->>'draftId')::uuid;
  hash text:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  existing public.workout_sessions%ROWTYPE;
  sid uuid:=gen_random_uuid();
  entry jsonb;
  actual jsonb;
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
    OR p_payload ? 'programId' OR p_payload ? 'stableDayId'
    OR p_payload ? 'programDayId' OR p_payload ? 'prescriptionRevisionId'
    OR p_payload ? 'scheduleOccurrenceId' OR p_payload ? 'expectedScheduleRevision'
    OR p_payload ? 'programRemoval'
    OR p_payload ? 'sequenceRevision'
    OR NULLIF(btrim(p_payload->>'workoutName'),'') IS NULL
    OR (p_payload->>'startedAt')::timestamptz IS NULL
    OR COALESCE((p_payload->>'endedAt')::timestamptz,now()) <
       (p_payload->>'startedAt')::timestamptz
    OR jsonb_typeof(p_payload->'sets') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_payload->'sets')=0
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
      OR COALESCE((entry->>'order')::integer,0)<1
      OR COALESCE((entry->>'reps')::integer,0)<1
      OR COALESCE(entry->>'loadKind','') NOT IN ('external','bodyweight','assistance','unknown')
      OR COALESCE(entry->>'loadUnit','') NOT IN ('lb','kg','none')
      OR COALESCE(entry->>'loadSide','') NOT IN ('external_total','per_hand','combined','unilateral','unknown')
      OR (entry->>'loadKind' IN ('external','assistance')
        AND ((entry->>'loadValue')::numeric IS NULL OR entry->>'loadUnit' NOT IN ('lb','kg')))
      OR (entry->>'loadKind' IN ('bodyweight','unknown')
        AND (entry->>'loadUnit'<>'none' OR COALESCE((entry->>'loadValue')::numeric,0)<>0))
      OR lower(COALESCE(entry->>'loadValue','')) IN ('nan','infinity','-infinity')
      OR (entry->>'loadValue')::numeric < 0
      OR (entry->>'rpe')::numeric NOT BETWEEN 0 AND 10
      OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(entry->>'exerciseId')::uuid)
      THEN RAISE EXCEPTION 'invalid_input: ad-hoc set'; END IF;
    count_sets:=count_sets+1;
    volume:=volume+CASE WHEN entry->>'loadKind'='external' THEN
      COALESCE((entry->>'loadValue')::numeric,0)
        * CASE WHEN entry->>'loadUnit'='kg' THEN 2.2046226218 ELSE 1 END
        * (entry->>'reps')::integer ELSE 0 END;
  END LOOP;
  INSERT INTO public.workout_sessions(id,user_id,program_day_id,workout_name,started_at,ended_at,
    duration_min,total_volume_lb,operation_id,draft_id,schema_version,revision,lifecycle,
    completion_class,payload_hash,source_timezone,finalized_at)
  VALUES(sid,uid,NULL,btrim(p_payload->>'workoutName'),(p_payload->>'startedAt')::timestamptz,
    COALESCE((p_payload->>'endedAt')::timestamptz,now()),
    GREATEST(0,COALESCE((p_payload->>'durationMin')::integer,0)),
    volume,op,draft,2,1,'finalized','complete',hash,NULLIF(p_payload->>'timezone',''),now());
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
  result:=jsonb_build_object('sessionId',sid,'operationId',op,'draftId',draft,
    'revision',1,'completionClass','complete','setCount',count_sets,'finalizedAt',now(),'replayed',false);
  UPDATE public.workout_sessions SET receipt=result WHERE id=sid;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.program_sequence_capability_v1(),
  public.get_program_sequence_v1(uuid),
  public.initialize_program_sequence_v1(jsonb),public.change_program_sequence_v1(jsonb),
  public.finalize_program_sequence_day_v1(jsonb),public.finalize_ad_hoc_workout_v1(jsonb),
  public.guard_program_sequence_finish_v1(),public.refresh_program_sequence_completion_v1()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.program_sequence_capability_v1(),
  public.get_program_sequence_v1(uuid),
  public.initialize_program_sequence_v1(jsonb),public.change_program_sequence_v1(jsonb),
  public.finalize_program_sequence_day_v1(jsonb),public.finalize_ad_hoc_workout_v1(jsonb)
  TO authenticated;

-- The dated AP-04 API remains defined and its empty tables remain untouched,
-- but ordinary clients can no longer establish a competing schedule authority.
REVOKE EXECUTE ON FUNCTION public.create_program_schedule_v1(jsonb),
  public.revise_program_schedule_v1(jsonb) FROM authenticated;
RESET statement_timeout;
RESET lock_timeout;
