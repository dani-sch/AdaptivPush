-- AP-04 PRE-RELEASE: do not deploy until hosted preflight, restored-production rehearsal,
-- concurrency and client-contract gates pass. No historical placement is inferred from start_date.
-- These session bounds do not guarantee atomicity; verify the release runner's
-- transaction and single-session behavior before applying this migration.
SET lock_timeout = '5s';
SET statement_timeout = '120s';

ALTER TABLE public.program_days ADD CONSTRAINT program_days_owner_schedule_lineage_key
  UNIQUE (program_id,program_revision_id,stable_day_id,id);

CREATE TABLE public.program_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL UNIQUE REFERENCES public.programs(id) ON DELETE CASCADE,
  timezone text NOT NULL CHECK (length(timezone) BETWEEN 1 AND 128),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  recurrence_rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(recurrence_rules)='array'),
  availability_windows jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(availability_windows)='array'),
  source_operation_id uuid NOT NULL,
  source_hash text NOT NULL,
  source_receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_operation_id),
  UNIQUE (id, user_id, program_id)
);

CREATE TABLE public.scheduled_days (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  program_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  stable_day_id uuid NOT NULL,
  original_program_day_id uuid REFERENCES public.program_days(id),
  prescription_revision_id uuid NOT NULL REFERENCES public.program_revisions(id),
  current_program_day_id uuid REFERENCES public.program_days(id),
  current_prescription_revision_id uuid NOT NULL REFERENCES public.program_revisions(id),
  cycle_week integer NOT NULL CHECK (cycle_week > 0),
  original_local_date date,
  original_timezone text NOT NULL,
  original_placement_provenance text NOT NULL DEFAULT 'explicit_date',
  original_unplaced_reason text,
  current_local_date date,
  current_timezone text NOT NULL,
  original_kind text NOT NULL CHECK (original_kind IN ('workout','rest')),
  current_kind text NOT NULL CHECK (current_kind IN ('workout','rest')),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','unplaced','skipped','paused','fulfilled')),
  fulfillment_session_id uuid UNIQUE REFERENCES public.workout_sessions(id) ON DELETE RESTRICT,
  fulfillment_class text CHECK (fulfillment_class IN
    ('full','accepted_reduced','partial','abandoned','legacy_unknown')),
  fulfilled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (schedule_id,user_id,program_id)
    REFERENCES public.program_schedules(id,user_id,program_id) ON DELETE CASCADE,
  FOREIGN KEY (program_id,prescription_revision_id)
    REFERENCES public.program_revisions(program_id,id),
  FOREIGN KEY (program_id,prescription_revision_id,stable_day_id,original_program_day_id)
    REFERENCES public.program_days(program_id,program_revision_id,stable_day_id,id),
  FOREIGN KEY (current_program_day_id,current_prescription_revision_id)
    REFERENCES public.program_days(id,program_revision_id),
  CHECK (original_program_day_id IS NOT NULL OR original_kind='rest'),
  CHECK (current_program_day_id IS NOT NULL OR current_kind='rest'),
  CHECK ((original_placement_provenance='explicit_date'
      AND original_local_date IS NOT NULL AND original_unplaced_reason IS NULL)
    OR (original_placement_provenance='legacy_empty_prescription'
      AND original_local_date IS NULL AND original_kind='workout'
      AND original_program_day_id IS NOT NULL AND original_unplaced_reason IS NOT NULL
      AND length(btrim(original_unplaced_reason)) BETWEEN 1 AND 256)),
  CHECK ((status IN ('unplaced','skipped','paused') AND current_local_date IS NULL)
      OR (status IN ('planned','in_progress','fulfilled') AND current_local_date IS NOT NULL)),
  CHECK ((status = 'fulfilled') = (fulfillment_session_id IS NOT NULL)),
  CHECK ((fulfillment_session_id IS NULL AND fulfillment_class IS NULL AND fulfilled_at IS NULL)
      OR (fulfillment_session_id IS NOT NULL AND fulfillment_class IS NOT NULL AND fulfilled_at IS NOT NULL)),
  CHECK (fulfillment_session_id IS NULL OR current_kind = 'workout'),
  UNIQUE (schedule_id,stable_day_id)
);

CREATE TABLE public.schedule_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  request_hash text NOT NULL,
  base_revision integer NOT NULL,
  resulting_revision integer NOT NULL,
  changes jsonb NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  receipt jsonb NOT NULL,
  actor text NOT NULL DEFAULT 'owner' CHECK (actor = 'owner'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (schedule_id,user_id,program_id)
    REFERENCES public.program_schedules(id,user_id,program_id) ON DELETE CASCADE,
  UNIQUE (user_id,operation_id),
  CHECK (resulting_revision = base_revision + 1)
);
CREATE INDEX scheduled_days_owner_date_idx ON public.scheduled_days(user_id,current_local_date,status);
CREATE INDEX schedule_deviations_schedule_revision_idx ON public.schedule_deviations(schedule_id,resulting_revision);

ALTER TABLE public.program_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_deviations ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_schedules_read_owner ON public.program_schedules
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY scheduled_days_read_owner ON public.scheduled_days
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY schedule_deviations_read_owner ON public.schedule_deviations
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.program_schedules, public.scheduled_days, public.schedule_deviations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.program_schedules, public.scheduled_days, public.schedule_deviations TO authenticated;

CREATE FUNCTION public.schedule_capability_v1() RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT 1 $$;
REVOKE ALL ON FUNCTION public.schedule_capability_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.schedule_capability_v1() TO authenticated;

-- Supabase stores named IANA zones in pg_timezone_names; abbreviations alone are ambiguous.
CREATE FUNCTION public.create_program_schedule_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid := auth.uid();
  op uuid := (p_payload->>'operationId')::uuid;
  pid uuid := (p_payload->>'programId')::uuid;
  sid uuid := gen_random_uuid();
  p public.programs%ROWTYPE;
  prior public.program_schedules%ROWTYPE;
  expected_program_revision uuid := (p_payload->>'expectedProgramRevisionId')::uuid;
  day jsonb;
  pd public.program_days%ROWTYPE;
  hash text;
  receipt jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF op IS NULL OR pid IS NULL THEN
    RAISE EXCEPTION 'invalid_input: schedule operation and program required';
  END IF;
  hash := encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  SELECT * INTO prior FROM public.program_schedules WHERE user_id=uid AND source_operation_id=op;
  IF FOUND THEN
    IF prior.source_hash<>hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN prior.source_receipt||'{"replayed":true}'::jsonb;
  END IF;
  IF EXISTS (SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    OR EXISTS (SELECT 1 FROM public.workout_sessions WHERE user_id=uid AND operation_id=op)
    OR EXISTS (SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op) THEN
    RAISE EXCEPTION 'operation_payload_mismatch';
  END IF;
  IF (p_payload->>'expectedRevision')::integer IS DISTINCT FROM 0
    OR expected_program_revision IS NULL
    OR jsonb_typeof(p_payload->'days') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_payload->'days') = 0
    OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=p_payload->>'timezone')
    OR (p_payload->>'timezone') IN ('Factory','localtime') THEN
    RAISE EXCEPTION 'invalid_input: explicit schedule, timezone and base revisions required';
  END IF;
  SELECT * INTO p FROM public.programs WHERE id=pid FOR UPDATE;
  IF NOT FOUND OR p.user_id<>uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT p.is_active OR p.lifecycle<>'active'
    OR p.current_revision_id IS DISTINCT FROM expected_program_revision
    OR EXISTS (SELECT 1 FROM public.program_schedules WHERE program_id=pid) THEN
    RAISE EXCEPTION 'stale_revision: schedule already exists or program inactive';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'days') d
    WHERE d->>'occurrenceId' IS NULL
      OR (d->>'programDayId' IS NULL AND
        (d->>'kind' IS DISTINCT FROM 'rest' OR d->>'localDate' IS NULL
          OR COALESCE(d->>'status','planned')<>'planned' OR d ? 'reason'))
      OR (d->>'programDayId' IS NOT NULL AND (
        (d->>'status'='unplaced' AND
          (d->>'kind' IS DISTINCT FROM 'workout' OR d ? 'localDate'
            OR length(btrim(COALESCE(d->>'reason',''))) NOT BETWEEN 1 AND 256))
        OR (d->>'status' IS DISTINCT FROM 'unplaced' AND
          (d->>'localDate' IS NULL OR COALESCE(d->>'status','planned')<>'planned'
            OR d ? 'reason'))))
    )
    OR (SELECT count(DISTINCT d->>'occurrenceId') FROM jsonb_array_elements(p_payload->'days') d)
      <> jsonb_array_length(p_payload->'days')
    OR (SELECT count(DISTINCT d->>'programDayId') FROM jsonb_array_elements(p_payload->'days') d)
      <> (SELECT count(*) FROM jsonb_array_elements(p_payload->'days') d
          WHERE d->>'programDayId' IS NOT NULL) THEN
    RAISE EXCEPTION 'invalid_input: unique explicit placement required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_days candidate
    WHERE candidate.program_id=pid AND candidate.program_revision_id=p.current_revision_id
      AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws
        JOIN public.program_days ancestor ON ancestor.id=ws.program_day_id
        WHERE ws.user_id=uid AND ancestor.program_id=pid
          AND ancestor.stable_day_id=candidate.stable_day_id AND ws.lifecycle='finalized')
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'days') proposed
        WHERE proposed->>'programDayId'=candidate.id::text)
  ) THEN RAISE EXCEPTION 'invalid_input: all uncompleted program days need explicit placement'; END IF;
  FOR day IN SELECT value FROM jsonb_array_elements(p_payload->'days') LOOP
    IF day->>'programDayId' IS NULL THEN
      IF COALESCE((day->>'cycleWeek')::integer,0) NOT BETWEEN 1 AND p.duration_weeks
        OR EXISTS (SELECT 1 FROM public.program_days existing
          WHERE existing.program_id=pid AND existing.stable_day_id=(day->>'occurrenceId')::uuid) THEN
        RAISE EXCEPTION 'invalid_input: explicit rest cycle or identity';
      END IF;
      CONTINUE;
    END IF;
    SELECT * INTO pd FROM public.program_days
      WHERE id=(day->>'programDayId')::uuid AND program_id=pid
        AND program_revision_id=p.current_revision_id;
    IF NOT FOUND OR EXISTS (SELECT 1 FROM public.workout_sessions ws
      JOIN public.program_days ancestor ON ancestor.id=ws.program_day_id
      WHERE ws.user_id=uid AND ancestor.program_id=pid AND ancestor.stable_day_id=pd.stable_day_id
        AND ws.lifecycle='finalized') THEN
      RAISE EXCEPTION 'invalid_input: placement must reference uncompleted current prescription';
    END IF;
    IF (day->>'kind' IS NOT NULL AND
        (day->>'kind'='rest') IS DISTINCT FROM pd.is_rest_day)
      OR (day->>'kind' IS NOT NULL AND day->>'kind' NOT IN ('workout','rest')) THEN
      RAISE EXCEPTION 'invalid_input: placement kind disagrees with prescription';
    END IF;
    IF NOT pd.is_rest_day AND NOT EXISTS (
      SELECT 1 FROM public.program_day_exercises WHERE program_day_id=pd.id AND set_count>0
    ) THEN
      IF p.schema_version<>1 OR day->>'status' IS DISTINCT FROM 'unplaced' THEN
        RAISE EXCEPTION 'invalid_input: only legacy empty workouts allow explicit unplaced intent';
      END IF;
    ELSIF day->>'status'='unplaced' THEN
      RAISE EXCEPTION 'invalid_input: only an empty workout may start unplaced';
    END IF;
  END LOOP;
  receipt:=jsonb_build_object('operationId',op,'programId',pid,'scheduleId',sid,'revision',1,'replayed',false);
  INSERT INTO public.program_schedules(id,user_id,program_id,timezone,source_operation_id,source_hash,source_receipt)
    VALUES(sid,uid,pid,p_payload->>'timezone',op,hash,receipt);
  FOR day IN SELECT value FROM jsonb_array_elements(p_payload->'days') LOOP
    IF day->>'programDayId' IS NULL THEN
      -- Rest without a program day has its own durable lineage, not a borrowed occurrence ID.
      INSERT INTO public.scheduled_days(id,user_id,program_id,schedule_id,stable_day_id,
        prescription_revision_id,current_prescription_revision_id,cycle_week,
        original_local_date,original_timezone,current_local_date,current_timezone,
        original_kind,current_kind)
      VALUES((day->>'occurrenceId')::uuid,uid,pid,sid,gen_random_uuid(),
        p.current_revision_id,p.current_revision_id,(day->>'cycleWeek')::integer,
        (day->>'localDate')::date,p_payload->>'timezone',(day->>'localDate')::date,
        p_payload->>'timezone','rest','rest');
      CONTINUE;
    END IF;
    SELECT * INTO pd FROM public.program_days WHERE id=(day->>'programDayId')::uuid;
    IF day->>'status'='unplaced' THEN
      INSERT INTO public.scheduled_days(id,user_id,program_id,schedule_id,stable_day_id,
        original_program_day_id,prescription_revision_id,current_program_day_id,
        current_prescription_revision_id,cycle_week,original_timezone,
        original_placement_provenance,original_unplaced_reason,
        current_timezone,original_kind,current_kind,status)
      VALUES ((day->>'occurrenceId')::uuid,uid,pid,sid,pd.stable_day_id,pd.id,
        pd.program_revision_id,pd.id,pd.program_revision_id,pd.week_number,
        p_payload->>'timezone','legacy_empty_prescription',btrim(day->>'reason'),
        p_payload->>'timezone','workout','workout','unplaced');
      CONTINUE;
    END IF;
    INSERT INTO public.scheduled_days(id,user_id,program_id,schedule_id,stable_day_id,
      original_program_day_id,prescription_revision_id,current_program_day_id,
      current_prescription_revision_id,cycle_week,original_local_date,original_timezone,
      current_local_date,current_timezone,original_kind,current_kind)
    VALUES ((day->>'occurrenceId')::uuid,uid,pid,sid,pd.stable_day_id,pd.id,
      pd.program_revision_id,pd.id,pd.program_revision_id,pd.week_number,(day->>'localDate')::date,
      p_payload->>'timezone',(day->>'localDate')::date,p_payload->>'timezone',
      CASE WHEN pd.is_rest_day THEN 'rest' ELSE 'workout' END,
      CASE WHEN pd.is_rest_day THEN 'rest' ELSE 'workout' END);
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.scheduled_days WHERE schedule_id=sid
    AND current_local_date IS NOT NULL
    GROUP BY current_local_date HAVING count(*)>1) THEN
    RAISE EXCEPTION 'conflict: multiple occurrences on one scheduled date';
  END IF;
  RETURN receipt;
END $$;

CREATE FUNCTION public.revise_program_schedule_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid := auth.uid();
  op uuid := (p_payload->>'operationId')::uuid;
  pid uuid := (p_payload->>'programId')::uuid;
  base integer := (p_payload->>'expectedRevision')::integer;
  expected_program_revision uuid := (p_payload->>'expectedProgramRevisionId')::uuid;
  s public.program_schedules%ROWTYPE;
  prior public.schedule_deviations%ROWTYPE;
  d public.scheduled_days%ROWTYPE;
  p public.programs%ROWTYPE;
  change jsonb;
  before_rows jsonb;
  after_rows jsonb;
  hash text;
  receipt jsonb;
  target_date date;
  target_kind text;
  target_status text;
  target_day uuid;
  target_timezone text := NULLIF(p_payload->>'timezone','');
  recurring jsonb := p_payload->'recurrence';
  availability jsonb := p_payload->'availability';
  effective_from date;
  interval_start date;
  interval_end date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF op IS NULL OR pid IS NULL THEN
    RAISE EXCEPTION 'invalid_input: schedule operation and program required';
  END IF;
  hash:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  SELECT * INTO prior FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN
    IF prior.request_hash<>hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN prior.receipt||'{"replayed":true}'::jsonb;
  END IF;
  IF EXISTS(SELECT 1 FROM public.program_schedules WHERE user_id=uid AND source_operation_id=op)
    OR EXISTS (SELECT 1 FROM public.workout_sessions WHERE user_id=uid AND operation_id=op)
    OR EXISTS (SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op) THEN
    RAISE EXCEPTION 'operation_payload_mismatch';
  END IF;
  IF base IS NULL OR expected_program_revision IS NULL
    OR jsonb_typeof(p_payload->'changes') IS DISTINCT FROM 'array'
    OR (jsonb_array_length(p_payload->'changes') = 0 AND target_timezone IS NULL
      AND recurring IS NULL AND availability IS NULL) THEN
    RAISE EXCEPTION 'invalid_input: schedule changes and expected revision required';
  END IF;
  SELECT * INTO s FROM public.program_schedules WHERE program_id=pid AND user_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO p FROM public.programs WHERE id=pid FOR UPDATE;
  IF NOT p.is_active OR p.lifecycle<>'active'
    OR p.current_revision_id IS DISTINCT FROM expected_program_revision THEN
    RAISE EXCEPTION 'stale_revision: program changed or inactive';
  END IF;
  IF s.revision<>base THEN RAISE EXCEPTION 'stale_revision: schedule changed'; END IF;
  IF p_payload ? 'timezone' AND (target_timezone IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=target_timezone)
    OR target_timezone IN ('Factory','localtime')
    OR target_timezone=s.timezone
    OR p_payload->>'timezonePolicy' IS DISTINCT FROM 'keep_dates') THEN
    RAISE EXCEPTION 'invalid_input: timezone change requires named zone and keep_dates policy';
  ELSIF NOT (p_payload ? 'timezone') AND p_payload ? 'timezonePolicy' THEN
    RAISE EXCEPTION 'invalid_input: timezone policy without change';
  END IF;
  IF recurring IS NOT NULL THEN
    IF jsonb_typeof(recurring) IS DISTINCT FROM 'object'
      OR (recurring->>'dayIndex')::integer NOT BETWEEN 1 AND 7
      OR (recurring->>'targetWeekday')::integer NOT BETWEEN 1 AND 7
      OR recurring->>'fromLocalDate' IS NULL THEN
      RAISE EXCEPTION 'invalid_input: recurrence requires future boundary, cycle day and weekday';
    END IF;
    effective_from:=(recurring->>'fromLocalDate')::date;
    IF effective_from < (now() AT TIME ZONE s.timezone)::date THEN
      RAISE EXCEPTION 'invalid_input: recurrence cannot rewrite past intent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.scheduled_days sd
      JOIN public.program_days pd ON pd.id=sd.original_program_day_id
      WHERE sd.schedule_id=s.id AND sd.status='planned' AND sd.current_kind='workout'
        AND sd.original_local_date>=effective_from
        AND pd.day_index=(recurring->>'dayIndex')::integer) OR EXISTS (
      SELECT 1 FROM public.scheduled_days sd
      JOIN public.program_days pd ON pd.id=sd.original_program_day_id
      WHERE sd.schedule_id=s.id AND sd.status='planned' AND sd.current_kind='workout'
        AND sd.original_local_date>=effective_from
        AND pd.day_index=(recurring->>'dayIndex')::integer
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'changes') c
          WHERE c->>'occurrenceId'=sd.id::text AND c->>'status'='planned'
            AND COALESCE(c->>'kind','workout')='workout'
            AND extract(isodow FROM (c->>'localDate')::date)=(recurring->>'targetWeekday')::integer)
    ) THEN RAISE EXCEPTION 'invalid_input: recurrence must explicitly place every eligible future workout'; END IF;
  END IF;
  IF availability IS NOT NULL THEN
    IF jsonb_typeof(availability) IS DISTINCT FROM 'object'
      OR jsonb_typeof(availability->'availableWeekdays') IS DISTINCT FROM 'array'
      OR nullif(btrim(availability->>'reason'),'') IS NULL
      OR availability->>'fromLocalDate' IS NULL OR availability->>'toLocalDate' IS NULL THEN
      RAISE EXCEPTION 'invalid_input: bounded availability and reason required';
    END IF;
    interval_start:=(availability->>'fromLocalDate')::date;
    interval_end:=(availability->>'toLocalDate')::date;
    IF interval_start < (now() AT TIME ZONE s.timezone)::date OR interval_end<interval_start
      OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(availability->'availableWeekdays') w
        WHERE w::integer NOT BETWEEN 1 AND 7)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(availability->'availableWeekdays') w
        WHERE jsonb_typeof(w.value)<>'number')
      OR (SELECT count(DISTINCT w::integer) FROM jsonb_array_elements_text(availability->'availableWeekdays') w)
        <> jsonb_array_length(availability->'availableWeekdays') THEN
      RAISE EXCEPTION 'invalid_input: availability interval or weekdays';
    END IF;
  END IF;
  IF (SELECT count(DISTINCT c->>'occurrenceId') FROM jsonb_array_elements(p_payload->'changes') c)
     <> jsonb_array_length(p_payload->'changes') THEN
    RAISE EXCEPTION 'invalid_input: duplicate occurrence in revision';
  END IF;
  SELECT jsonb_build_object('schedule',to_jsonb(s),
    'days',COALESCE(jsonb_agg(to_jsonb(sd) ORDER BY sd.id),'[]'::jsonb)) INTO before_rows
    FROM public.scheduled_days sd WHERE sd.schedule_id=s.id;
  FOR change IN SELECT value FROM jsonb_array_elements(p_payload->'changes') LOOP
    SELECT * INTO d FROM public.scheduled_days
      WHERE id=(change->>'occurrenceId')::uuid AND schedule_id=s.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'forbidden: occurrence lineage'; END IF;
    IF d.status IN ('in_progress','fulfilled') OR d.fulfillment_session_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.workout_sessions ws
        JOIN public.program_days pd ON pd.id=ws.program_day_id
        LEFT JOIN public.program_days current_day ON current_day.id=d.current_program_day_id
        WHERE ws.user_id=uid AND pd.program_id=pid
          AND pd.stable_day_id IN (d.stable_day_id,current_day.stable_day_id)
          AND ws.lifecycle='finalized') THEN
      RAISE EXCEPTION 'conflict: fixed work cannot be moved';
    END IF;
    target_status:=change->>'status';
    target_kind:=COALESCE(change->>'kind',d.current_kind);
    IF target_kind='rest' AND d.current_kind<>'rest'
       AND change->>'programDayId' IS NULL THEN
      target_day:=NULL;
    ELSIF change->>'programDayId' IS NULL THEN
      SELECT pd.id INTO target_day FROM public.program_days pd
        JOIN public.program_days old_day ON old_day.id=d.current_program_day_id
        WHERE pd.program_id=pid AND pd.program_revision_id=p.current_revision_id
          AND pd.stable_day_id=old_day.stable_day_id;
    ELSE
      target_day:=(change->>'programDayId')::uuid;
    END IF;
    target_date:=(change->>'localDate')::date;
    IF target_status IS NULL OR target_status NOT IN ('planned','unplaced','skipped','paused')
      OR target_kind NOT IN ('workout','rest')
      OR (d.original_placement_provenance='legacy_empty_prescription' AND target_kind='rest')
      OR (target_status='planned') IS DISTINCT FROM (target_date IS NOT NULL)
      OR (target_status IN ('unplaced','skipped','paused') AND NULLIF(btrim(change->>'reason'),'') IS NULL)
      OR (target_kind IS DISTINCT FROM d.current_kind AND NULLIF(btrim(change->>'reason'),'') IS NULL)
      OR (target_kind='workout' AND target_day IS NULL)
      OR (target_kind IS DISTINCT FROM d.current_kind AND target_kind='workout'
        AND change->>'programDayId' IS NULL)
      OR (target_kind='workout' AND NOT EXISTS (
        SELECT 1 FROM public.program_days pd
        JOIN public.program_day_exercises ex ON ex.program_day_id=pd.id AND ex.set_count>0
        WHERE pd.id=target_day AND pd.program_id=pid AND pd.program_revision_id=p.current_revision_id
          AND NOT pd.is_rest_day
          AND NOT EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            JOIN public.program_days ancestor ON ancestor.id=ws.program_day_id
            WHERE ws.user_id=uid AND ancestor.program_id=pid
              AND ancestor.stable_day_id=pd.stable_day_id AND ws.lifecycle='finalized'))
        AND NOT (d.original_placement_provenance='legacy_empty_prescription'
          AND d.current_kind='workout' AND target_status='unplaced'
          AND target_day=d.current_program_day_id))
      OR (target_kind='rest' AND target_day IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.program_days pd WHERE pd.id=target_day AND pd.program_id=pid
          AND pd.program_revision_id=p.current_revision_id AND pd.is_rest_day)) THEN
      RAISE EXCEPTION 'invalid_input: explicit placement, kind, reason or prescription required';
    END IF;
    -- A replacement changes current intent, not original prescription evidence.
    UPDATE public.scheduled_days SET current_local_date=target_date,current_kind=target_kind,
      current_program_day_id=target_day,current_prescription_revision_id=p.current_revision_id,
      status=target_status,updated_at=now() WHERE id=d.id;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM public.scheduled_days sd
    JOIN public.program_days pd ON pd.id=sd.current_program_day_id
    WHERE sd.schedule_id=s.id AND sd.current_kind='workout'
      AND sd.status IN ('planned','in_progress')
    GROUP BY pd.stable_day_id HAVING count(*)>1
  ) THEN RAISE EXCEPTION 'conflict: workout prescription assigned twice'; END IF;
  IF EXISTS (SELECT 1 FROM public.scheduled_days WHERE schedule_id=s.id
    AND status IN ('planned','in_progress','fulfilled')
    GROUP BY current_local_date HAVING count(*)>1) THEN
    RAISE EXCEPTION 'conflict: multiple occurrences on one scheduled date';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.scheduled_days sd
    JOIN LATERAL (
      SELECT w.value AS window FROM jsonb_array_elements(
        s.availability_windows||CASE WHEN availability IS NOT NULL THEN
          jsonb_build_array(availability||jsonb_build_object('revision',base+1))
          ELSE '[]'::jsonb END) w
      WHERE sd.current_local_date BETWEEN (w.value->>'fromLocalDate')::date
        AND (w.value->>'toLocalDate')::date
      ORDER BY (w.value->>'revision')::integer DESC LIMIT 1
    ) latest ON true
    WHERE sd.schedule_id=s.id AND sd.status='planned' AND sd.current_kind='workout'
      AND NOT (latest.window->'availableWeekdays') @>
        jsonb_build_array(extract(isodow FROM sd.current_local_date)::integer)
  ) THEN RAISE EXCEPTION 'conflict: unavailable workouts must be moved or explicitly unplaced'; END IF;
  IF target_timezone IS NOT NULL THEN
    UPDATE public.scheduled_days sd SET current_timezone=target_timezone,updated_at=now()
    WHERE sd.schedule_id=s.id AND sd.status NOT IN ('in_progress','fulfilled')
      AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws
        JOIN public.program_days ancestor ON ancestor.id=ws.program_day_id
        LEFT JOIN public.program_days current_day ON current_day.id=sd.current_program_day_id
        WHERE ws.user_id=uid AND ancestor.program_id=pid
          AND ancestor.stable_day_id IN (sd.stable_day_id,current_day.stable_day_id)
          AND ws.lifecycle='finalized');
  END IF;
  UPDATE public.program_schedules SET revision=base+1,
    timezone=COALESCE(target_timezone,s.timezone),
    recurrence_rules=recurrence_rules||CASE WHEN recurring IS NOT NULL THEN
      jsonb_build_array(recurring||jsonb_build_object('revision',base+1,
        'timezone',COALESCE(target_timezone,s.timezone),'acceptedAt',now()))
      ELSE '[]'::jsonb END,
    availability_windows=availability_windows||CASE WHEN availability IS NOT NULL THEN
      jsonb_build_array(availability||jsonb_build_object('revision',base+1,
        'timezone',COALESCE(target_timezone,s.timezone),'acceptedAt',now()))
      ELSE '[]'::jsonb END,updated_at=now() WHERE id=s.id;
  SELECT jsonb_build_object('schedule',to_jsonb(ps),
    'days',COALESCE(jsonb_agg(to_jsonb(sd) ORDER BY sd.id),'[]'::jsonb)) INTO after_rows
    FROM public.program_schedules ps LEFT JOIN public.scheduled_days sd ON sd.schedule_id=ps.id
    WHERE ps.id=s.id GROUP BY ps.id;
  receipt:=jsonb_build_object('operationId',op,'programId',pid,'scheduleId',s.id,'revision',base+1,'replayed',false);
  INSERT INTO public.schedule_deviations(user_id,program_id,schedule_id,operation_id,request_hash,
    base_revision,resulting_revision,changes,before_state,after_state,receipt)
  VALUES(uid,pid,s.id,op,hash,base,base+1,jsonb_build_object('placements',p_payload->'changes',
    'recurrence',recurring,'availability',availability,'timezone',target_timezone),
    before_rows,after_rows,receipt);
  RETURN receipt;
END $$;

REVOKE ALL ON FUNCTION public.create_program_schedule_v1(jsonb),
  public.revise_program_schedule_v1(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_program_schedule_v1(jsonb),
  public.revise_program_schedule_v1(jsonb) TO authenticated;

CREATE FUNCTION public.sync_scheduled_prescription_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  v_schedule_id uuid;
  finalizing uuid := NULLIF(current_setting('adaptivpush.finalizing_occurrence_id',true),'')::uuid;
BEGIN
  IF NEW.current_revision_id IS NOT DISTINCT FROM OLD.current_revision_id THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.program_schedules
    WHERE program_id=NEW.id AND user_id=NEW.user_id) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text||':'||NEW.id::text,0));
  SELECT id INTO v_schedule_id FROM public.program_schedules
    WHERE program_id=NEW.id AND user_id=NEW.user_id FOR UPDATE;
  IF NEW.current_revision<>OLD.current_revision+1 OR NOT EXISTS (
    SELECT 1 FROM public.program_revisions successor
    WHERE successor.id=NEW.current_revision_id AND successor.program_id=NEW.id
      AND successor.user_id=NEW.user_id AND successor.parent_revision_id=OLD.current_revision_id
      AND successor.revision=NEW.current_revision
  ) THEN RAISE EXCEPTION 'stale_revision: scheduled prescription successor lineage'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.scheduled_days sd
    JOIN public.program_days previous ON previous.id=sd.current_program_day_id
    LEFT JOIN public.program_days successor ON successor.program_id=NEW.id
      AND successor.program_revision_id=NEW.current_revision_id
      AND successor.stable_day_id=previous.stable_day_id
    WHERE sd.schedule_id=v_schedule_id AND sd.status NOT IN ('fulfilled','in_progress')
      AND sd.id IS DISTINCT FROM finalizing AND successor.id IS NULL
  ) THEN RAISE EXCEPTION 'conflict: scheduled prescription successor day missing'; END IF;
  UPDATE public.scheduled_days sd
    SET current_program_day_id=successor.id,
      current_prescription_revision_id=NEW.current_revision_id,updated_at=now()
  FROM public.program_days previous
  JOIN public.program_days successor ON successor.program_id=NEW.id
    AND successor.program_revision_id=NEW.current_revision_id
    AND successor.stable_day_id=previous.stable_day_id
  WHERE sd.schedule_id=v_schedule_id AND sd.current_program_day_id=previous.id
    AND sd.status NOT IN ('fulfilled','in_progress')
    AND sd.id IS DISTINCT FROM finalizing;
  UPDATE public.scheduled_days SET current_prescription_revision_id=NEW.current_revision_id,
    updated_at=now()
  WHERE schedule_id=v_schedule_id AND current_program_day_id IS NULL
    AND status NOT IN ('fulfilled','in_progress') AND id IS DISTINCT FROM finalizing;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_scheduled_prescription_revision_v1
  AFTER UPDATE OF current_revision_id ON public.programs FOR EACH ROW
  EXECUTE FUNCTION public.sync_scheduled_prescription_revision_v1();
REVOKE ALL ON FUNCTION public.sync_scheduled_prescription_revision_v1()
  FROM PUBLIC,anon,authenticated;

-- Keep the released validation, swap, receipt and correction engines intact.
-- The new public entrypoints serialize on their existing program advisory lock
-- before entering those engines, so their effects and schedule links commit together.
ALTER FUNCTION public.finalize_workout_v2(jsonb) RENAME TO finalize_workout_ap04_base;
ALTER FUNCTION public.correct_completed_workout_v1(jsonb) RENAME TO correct_completed_workout_ap04_base;
REVOKE ALL ON FUNCTION public.finalize_workout_ap04_base(jsonb),
  public.correct_completed_workout_ap04_base(jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.finalize_workout_v2(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid := auth.uid();
  pid uuid;
  op uuid := (p_payload->>'operationId')::uuid;
  selected uuid := (p_payload->>'scheduleOccurrenceId')::uuid;
  expected integer := (p_payload->>'expectedScheduleRevision')::integer;
  s public.program_schedules%ROWTYPE;
  d public.scheduled_days%ROWTYPE;
  pd public.program_days%ROWTYPE;
  prior public.workout_sessions%ROWTYPE;
  result jsonb;
  before_row jsonb;
  after_row jsonb;
  sid uuid;
  fulfillment text;
  actual_started_at timestamptz;
  actual_timezone text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT day.* INTO pd FROM public.program_days day
    JOIN public.programs p ON p.id=day.program_id AND p.user_id=uid
    WHERE day.id=(p_payload->>'programDayId')::uuid;
  pid:=pd.program_id;
  IF pid IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  END IF;
  IF op IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  END IF;
  SELECT * INTO prior FROM public.workout_sessions WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN RETURN public.finalize_workout_ap04_base(p_payload); END IF;
  IF EXISTS (SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    OR EXISTS (SELECT 1 FROM public.program_schedules WHERE user_id=uid AND source_operation_id=op)
    OR EXISTS (SELECT 1 FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op) THEN
    RAISE EXCEPTION 'operation_payload_mismatch';
  END IF;
  SELECT * INTO s FROM public.program_schedules WHERE program_id=pid AND user_id=uid FOR UPDATE;
  IF FOUND THEN
    IF selected IS NULL OR expected IS NULL THEN
      RAISE EXCEPTION 'invalid_input: scheduled workout requires selected occurrence and expected revision';
    END IF;
    IF s.revision<>expected THEN RAISE EXCEPTION 'stale_revision: schedule changed'; END IF;
    SELECT * INTO d FROM public.scheduled_days WHERE id=selected AND schedule_id=s.id FOR UPDATE;
    IF NOT FOUND OR d.current_kind<>'workout' OR d.status NOT IN ('planned','in_progress')
      OR d.current_program_day_id<>pd.id OR d.current_prescription_revision_id<>pd.program_revision_id
      OR d.fulfillment_session_id IS NOT NULL THEN
      RAISE EXCEPTION 'conflict: scheduled occurrence unavailable or incorrect prescription';
    END IF;
    before_row:=to_jsonb(d);
  ELSIF selected IS NOT NULL OR expected IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_input: schedule not established';
  END IF;
  IF d.id IS NOT NULL AND p_payload->'programRemoval' IS NOT NULL
    AND p_payload->'programRemoval'<>'null'::jsonb THEN
    PERFORM set_config('adaptivpush.finalizing_occurrence_id',d.id::text,true);
  END IF;
  result:=public.finalize_workout_ap04_base(p_payload);
  PERFORM set_config('adaptivpush.finalizing_occurrence_id','',true);
  IF s.id IS NULL THEN RETURN result; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.scheduled_days sd
    WHERE sd.id=d.id AND sd.current_program_day_id=pd.id
      AND sd.current_prescription_revision_id=pd.program_revision_id) THEN
    RAISE EXCEPTION 'conflict: selected workout prescription changed during Finish';
  END IF;
  sid:=(result->>'sessionId')::uuid;
  SELECT ws.started_at,COALESCE(NULLIF(ws.source_timezone,''),s.timezone)
    INTO actual_started_at,actual_timezone FROM public.workout_sessions ws WHERE ws.id=sid;
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=actual_timezone) THEN
    RAISE EXCEPTION 'invalid_input: actual workout timezone';
  END IF;
  fulfillment:=CASE result->>'completionClass'
    WHEN 'complete' THEN 'full'
    WHEN 'reduced' THEN 'accepted_reduced'
    WHEN 'partial' THEN 'partial'
    WHEN 'abandoned' THEN 'abandoned'
    WHEN 'legacy_unknown' THEN 'legacy_unknown' END;
  IF fulfillment IS NULL THEN RAISE EXCEPTION 'invalid_input: unknown completion class'; END IF;
  UPDATE public.scheduled_days SET status='fulfilled',fulfillment_session_id=sid,
    fulfillment_class=fulfillment,fulfilled_at=now(),updated_at=now() WHERE id=d.id;
  SELECT to_jsonb(sd) INTO after_row FROM public.scheduled_days sd WHERE sd.id=d.id;
  UPDATE public.program_schedules SET revision=expected+1,updated_at=now() WHERE id=s.id;
  result:=result||jsonb_build_object('scheduleOccurrenceId',d.id,'scheduleRevision',expected+1);
  UPDATE public.workout_sessions SET receipt=result WHERE id=sid;
  INSERT INTO public.schedule_deviations(user_id,program_id,schedule_id,operation_id,request_hash,
    base_revision,resulting_revision,changes,before_state,after_state,receipt)
  VALUES(uid,pid,s.id,op,encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex'),
    expected,expected+1,jsonb_build_object('kind','fulfillment','sessionId',sid,
      'scheduledLocalDate',d.current_local_date,'actualLocalDate',(actual_started_at AT TIME ZONE actual_timezone)::date,
      'actualTimezone',actual_timezone),
    before_row,after_row,result);
  RETURN result;
END $$;

CREATE FUNCTION public.correct_completed_workout_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
  uid uuid := auth.uid();
  op uuid := (p_payload->>'operationId')::uuid;
  session_id uuid := (p_payload->>'sessionId')::uuid;
  expected integer := (p_payload->>'expectedScheduleRevision')::integer;
  pid uuid;
  s public.program_schedules%ROWTYPE;
  d public.scheduled_days%ROWTYPE;
  prior public.workout_correction_receipts%ROWTYPE;
  result jsonb;
  before_row jsonb;
  after_row jsonb;
  fulfillment text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT pd.program_id INTO pid FROM public.workout_sessions ws
    JOIN public.program_days pd ON pd.id=ws.program_day_id
    WHERE ws.id=session_id AND ws.user_id=uid;
  IF pid IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
  END IF;
  IF op IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||op::text,0));
  END IF;
  SELECT * INTO prior FROM public.workout_correction_receipts WHERE user_id=uid AND operation_id=op;
  IF FOUND THEN RETURN public.correct_completed_workout_ap04_base(p_payload); END IF;
  IF EXISTS (SELECT 1 FROM public.schedule_deviations WHERE user_id=uid AND operation_id=op)
    OR EXISTS (SELECT 1 FROM public.program_schedules WHERE user_id=uid AND source_operation_id=op)
    OR EXISTS (SELECT 1 FROM public.workout_sessions WHERE user_id=uid AND operation_id=op) THEN
    RAISE EXCEPTION 'operation_payload_mismatch';
  END IF;
  SELECT * INTO d FROM public.scheduled_days
    WHERE user_id=uid AND fulfillment_session_id=session_id FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO s FROM public.program_schedules WHERE id=d.schedule_id FOR UPDATE;
    IF expected IS NULL OR s.revision<>expected THEN
      RAISE EXCEPTION 'stale_revision: schedule changed';
    END IF;
    before_row:=to_jsonb(d);
  ELSIF expected IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_input: session has no scheduled fulfillment';
  END IF;
  result:=public.correct_completed_workout_ap04_base(p_payload);
  IF d.id IS NULL THEN RETURN result; END IF;
  fulfillment:=CASE result->>'completionClass'
    WHEN 'complete' THEN 'full'
    WHEN 'reduced' THEN 'accepted_reduced'
    WHEN 'partial' THEN 'partial'
    WHEN 'abandoned' THEN 'abandoned'
    WHEN 'legacy_unknown' THEN 'legacy_unknown' END;
  IF fulfillment IS NULL THEN RAISE EXCEPTION 'invalid_input: unknown completion class'; END IF;
  UPDATE public.scheduled_days SET fulfillment_class=fulfillment,updated_at=now() WHERE id=d.id;
  SELECT to_jsonb(sd) INTO after_row FROM public.scheduled_days sd WHERE sd.id=d.id;
  UPDATE public.program_schedules SET revision=expected+1,updated_at=now() WHERE id=s.id;
  result:=result||jsonb_build_object('scheduleOccurrenceId',d.id,'scheduleRevision',expected+1);
  UPDATE public.workout_correction_receipts SET receipt=result WHERE user_id=uid AND operation_id=op;
  INSERT INTO public.schedule_deviations(user_id,program_id,schedule_id,operation_id,request_hash,
    base_revision,resulting_revision,changes,before_state,after_state,receipt)
  VALUES(uid,pid,s.id,op,encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex'),
    expected,expected+1,jsonb_build_object('kind','correction','sessionId',session_id),
    before_row,after_row,result);
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.finalize_workout_v2(jsonb),
  public.correct_completed_workout_v1(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_workout_v2(jsonb),
  public.correct_completed_workout_v1(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_workout_removals_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public
AS $$ SELECT public.finalize_workout_v2(p_payload) $$;
CREATE OR REPLACE FUNCTION public.finalize_workout_structure_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public
AS $$ SELECT public.finalize_workout_v2(p_payload) $$;
CREATE OR REPLACE FUNCTION public.correct_workout_removals_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public
AS $$ SELECT public.correct_completed_workout_v1(p_payload) $$;
CREATE OR REPLACE FUNCTION public.correct_workout_structure_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public
AS $$ SELECT public.correct_completed_workout_v1(p_payload) $$;
REVOKE ALL ON FUNCTION public.finalize_workout_removals_v1(jsonb),
  public.finalize_workout_structure_v1(jsonb),
  public.correct_workout_removals_v1(jsonb),
  public.correct_workout_structure_v1(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_workout_removals_v1(jsonb),
  public.finalize_workout_structure_v1(jsonb),
  public.correct_workout_removals_v1(jsonb),
  public.correct_workout_structure_v1(jsonb) TO authenticated;

RESET statement_timeout;
RESET lock_timeout;
