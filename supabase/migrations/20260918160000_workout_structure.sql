-- Additive packet. Hosted application requires explicit authorization.
ALTER TABLE public.program_day_exercises ADD COLUMN addition_lineage uuid;
ALTER TABLE public.program_revisions DROP CONSTRAINT program_revisions_provenance_check;
ALTER TABLE public.program_revisions ADD CONSTRAINT program_revisions_provenance_check
 CHECK (provenance IN ('installed','migration_snapshot','exercise_swap','workout_removal','workout_structure'));

CREATE FUNCTION public.workout_structure_capability_v1() RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT 1 $$;
REVOKE ALL ON FUNCTION public.workout_structure_capability_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workout_structure_capability_v1() TO authenticated;

CREATE OR REPLACE FUNCTION public.inherit_prescription_removals() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ancestor record;
BEGIN
 SELECT source.removal_mask,source.addition_lineage INTO ancestor FROM public.program_day_exercises source
 JOIN public.program_revisions successor ON successor.parent_revision_id=source.program_revision_id
 WHERE successor.id=NEW.program_revision_id AND source.stable_slot_id=NEW.stable_slot_id;
 IF FOUND THEN NEW.removal_mask:=COALESCE(NEW.removal_mask,ancestor.removal_mask); NEW.addition_lineage:=COALESCE(NEW.addition_lineage,ancestor.addition_lineage); END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.workout_addition_days(p_program uuid,p_revision uuid,p_day uuid)
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT d.id FROM public.program_days d JOIN public.program_days source ON source.program_revision_id=p_revision AND source.stable_day_id=p_day
 WHERE d.program_id=p_program AND d.program_revision_id=p_revision AND NOT d.is_rest_day
 AND d.day_index=source.day_index AND d.order_in_week=source.order_in_week
 AND (d.week_number,d.order_in_week,d.day_index)>(source.week_number,source.order_in_week,source.day_index)
 AND NOT EXISTS(SELECT 1 FROM public.workout_sessions ws JOIN public.program_days historical ON historical.id=ws.program_day_id
   WHERE historical.program_id=p_program AND historical.stable_day_id=d.stable_day_id)
$$;
REVOKE ALL ON FUNCTION public.workout_addition_days(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.workout_removal_targets(p_program uuid,p_revision uuid,p_day uuid,p_slot uuid,p_order integer)
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH source AS (
  SELECT s.*,d.day_index,d.order_in_week FROM public.program_day_exercises s JOIN public.program_days d ON d.id=s.program_day_id
  JOIN public.program_revisions r ON r.id=s.program_revision_id
  WHERE r.program_id=p_program AND d.stable_day_id=p_day AND s.stable_slot_id=p_slot ORDER BY r.revision LIMIT 1
 ), selected_day AS (SELECT * FROM public.program_days WHERE program_revision_id=p_revision AND stable_day_id=p_day)
 SELECT target.id FROM public.program_day_exercises target JOIN public.program_days td ON td.id=target.program_day_id
 CROSS JOIN source CROSS JOIN selected_day
 JOIN LATERAL (
  SELECT original.exercise_id,original.position,original.addition_lineage,od.day_index,od.order_in_week
  FROM public.program_day_exercises original JOIN public.program_days od ON od.id=original.program_day_id
  JOIN public.program_revisions r ON r.id=original.program_revision_id
  WHERE r.program_id=p_program AND original.stable_slot_id=target.stable_slot_id ORDER BY r.revision LIMIT 1
 ) earliest ON true
 WHERE td.program_id=p_program AND td.program_revision_id=p_revision
 AND ((source.addition_lineage IS NOT NULL AND earliest.addition_lineage=source.addition_lineage)
  OR (source.addition_lineage IS NULL AND earliest.addition_lineage IS NULL AND earliest.exercise_id=source.exercise_id
      AND earliest.position=source.position AND earliest.day_index=source.day_index AND earliest.order_in_week=source.order_in_week))
 AND (td.week_number,td.order_in_week,td.day_index)>(selected_day.week_number,selected_day.order_in_week,selected_day.day_index)
 AND (p_order IS NULL OR (p_order BETWEEN 1 AND source.set_count AND p_order<=target.set_count
  AND NOT COALESCE(target.removal_mask->'orders','[]') @> to_jsonb(ARRAY[p_order])))
 AND NOT COALESCE((target.removal_mask->>'removed')::boolean,false)
 AND NOT EXISTS(SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed ON completed.id=ws.program_day_id
  WHERE completed.program_id=p_program AND completed.stable_day_id=td.stable_day_id)
$$;

CREATE FUNCTION public.preview_workout_addition_v1(p_program_id uuid,p_day_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.programs%ROWTYPE; n integer:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
 SELECT * INTO p FROM public.programs WHERE id=p_program_id AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.program_days WHERE program_revision_id=p.current_revision_id AND stable_day_id=p_day_id) THEN RAISE EXCEPTION 'target_unavailable'; END IF;
 IF p.is_active AND p.lifecycle='active' THEN SELECT count(*) INTO n FROM public.workout_addition_days(p.id,p.current_revision_id,p_day_id); END IF;
 RETURN jsonb_build_object('programId',p.id,'expectedRevision',p.current_revision,'expectedRevisionId',p.current_revision_id,'currentStableDayId',p_day_id,'futureCount',n);
END $$;
REVOKE ALL ON FUNCTION public.preview_workout_addition_v1(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_workout_addition_v1(uuid,uuid) TO authenticated;

-- All rows, including unchecked extras, have identities. Original coverage may
-- only be hidden by a tombstone; extras cannot occupy a missing original order.
CREATE FUNCTION public.validate_workout_structure(p_snapshot jsonb,p_slots jsonb,p_removals jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s jsonb; t jsonb; original jsonb; required jsonb;
BEGIN
 IF jsonb_typeof(p_slots) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_input: effective slots'; END IF;
 IF (SELECT count(DISTINCT x->>'slotId') FROM jsonb_array_elements(p_slots) x)<>jsonb_array_length(p_slots)
 OR (SELECT count(DISTINCT row_set->>'setId') FROM jsonb_array_elements(p_slots) row_slot,jsonb_array_elements(row_slot->'sets') row_set)
 <> (SELECT count(*) FROM jsonb_array_elements(p_slots) row_slot,jsonb_array_elements(row_slot->'sets') row_set) THEN RAISE EXCEPTION 'invalid_input: duplicate structure identity'; END IF;
 FOR original IN SELECT value FROM jsonb_array_elements(COALESCE(p_snapshot->'slots','[]')) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_slots) row_slot WHERE row_slot->>'slotId'=original->>'slotId') THEN RAISE EXCEPTION 'invalid_input: missing original slot'; END IF;
 END LOOP;
 FOR s IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
  IF (s->>'slotId')::uuid IS NULL OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(s->>'actualExerciseId')::uuid)
  OR jsonb_typeof(s->'sets') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_input: structure exercise'; END IF;
  SELECT value INTO original FROM jsonb_array_elements(COALESCE(p_snapshot->'slots','[]')) WHERE value->>'slotId'=s->>'slotId';
  IF original IS NULL THEN
   IF (s->>'prescribedSetCount')::integer IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'invalid_input: addition claims prescription'; END IF;
  ELSE
   IF s->>'prescribedExerciseId' IS DISTINCT FROM original->>'prescribedExerciseId'
   OR s->>'prescribedSetCount' IS DISTINCT FROM original->>'prescribedSetCount' THEN RAISE EXCEPTION 'invalid_input: changed original prescription'; END IF;
   FOR required IN SELECT value FROM jsonb_array_elements(original->'sets') LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'sets') row_set WHERE row_set->>'setId'=required->>'setId' AND row_set->>'order'=required->>'order')
    AND NOT COALESCE(p_removals->'slots','[]') ? (s->>'slotId')
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(p_removals->'sets','[]')) r WHERE r->>'setId'=required->>'setId' AND r->>'slotId'=s->>'slotId') THEN RAISE EXCEPTION 'invalid_input: missing original set'; END IF;
   END LOOP;
  END IF;
  IF (SELECT count(DISTINCT row_set->>'order') FROM jsonb_array_elements(s->'sets') row_set)<>jsonb_array_length(s->'sets') THEN RAISE EXCEPTION 'invalid_input: duplicate structure order'; END IF;
  FOR t IN SELECT value FROM jsonb_array_elements(s->'sets') LOOP
   IF (t->>'setId')::uuid IS NULL OR COALESCE((t->>'order')::integer,0)<1
   OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(t->>'actualExerciseId')::uuid)
   OR COALESCE(t->>'outcome','not_attempted') NOT IN ('performed','skipped','not_attempted')
   OR COALESCE((t->>'logged')::boolean,false) IS DISTINCT FROM (COALESCE(t->>'outcome','not_attempted')='performed') THEN RAISE EXCEPTION 'invalid_input: structure set'; END IF;
   IF original IS NOT NULL AND (t->>'order')::integer<=(original->>'prescribedSetCount')::integer
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(original->'sets') r WHERE r->>'setId'=t->>'setId' AND r->>'order'=t->>'order') THEN RAISE EXCEPTION 'invalid_input: stable set order'; END IF;
  END LOOP;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.validate_workout_structure(jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.validate_workout_program_changes(p_changes jsonb,p_slots jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE change jsonb;
BEGIN
 IF p_changes IS NULL OR p_changes='null' THEN RETURN; END IF;
 IF (SELECT count(DISTINCT a->>'slotId') FROM jsonb_array_elements(COALESCE(p_changes->'additions','[]')) a)
 <>jsonb_array_length(COALESCE(p_changes->'additions','[]')) THEN RAISE EXCEPTION 'invalid_input: duplicate program addition'; END IF;
 FOR change IN SELECT value FROM jsonb_array_elements(COALESCE(p_changes->'additions','[]')) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_slots) s WHERE s->>'slotId'=change->>'slotId' AND (s->>'prescribedSetCount')::integer=0) THEN RAISE EXCEPTION 'invalid_input: program addition without occurrence'; END IF;
 END LOOP;
 FOR change IN SELECT value FROM jsonb_array_elements(COALESCE(p_changes->'swaps','[]')) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_slots) s WHERE s->>'slotId'=change->>'slotId') THEN RAISE EXCEPTION 'invalid_input: program swap without occurrence'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.validate_workout_program_changes(jsonb,jsonb) FROM PUBLIC,anon,authenticated;

-- One revision holds all future changes; none is committed before Finish/Save.
CREATE OR REPLACE FUNCTION public.revise_program_removals_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE
 uid uuid:=auth.uid(); op uuid:=(p_payload->>'operationId')::uuid; pid uuid:=(p_payload->>'programId')::uuid;
 base uuid:=(p_payload->>'expectedRevisionId')::uuid; rev integer:=(p_payload->>'expectedRevision')::integer;
 source_day uuid:=(p_payload->>'currentStableDayId')::uuid;
 p public.programs%ROWTYPE; r public.program_revisions%ROWTYPE; d public.program_days%ROWTYPE; ex public.program_day_exercises%ROWTYPE;
 prior public.program_revision_command_receipts%ROWTYPE; target jsonb; masks jsonb:='{}'; swaps jsonb:='{}'; mask jsonb; target_id uuid;
 successor uuid:=gen_random_uuid(); new_day uuid; receipt jsonb; hash text; n integer:=0; v_snapshot jsonb; v_position integer; eligible boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
 IF op IS NULL OR pid IS NULL OR base IS NULL OR rev IS NULL OR source_day IS NULL OR jsonb_typeof(p_payload->'targets') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_input: program change set'; END IF;
 hash:=encode(digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||':'||pid::text,0));
 SELECT * INTO prior FROM public.program_revision_command_receipts WHERE user_id=uid AND operation_id=op;
 IF FOUND THEN
  IF prior.request_hash<>hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  RETURN prior.receipt||'{"replayed":true}'::jsonb;
 END IF;
 SELECT * INTO p FROM public.programs WHERE id=pid FOR UPDATE;
 IF NOT FOUND OR p.user_id<>uid THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p.current_revision<>rev OR p.current_revision_id<>base THEN RAISE EXCEPTION 'stale_revision: program changed'; END IF;
 IF NOT p.is_active OR p.lifecycle<>'active' THEN RAISE EXCEPTION 'stale_revision: program ended'; END IF;
 SELECT * INTO r FROM public.program_revisions WHERE id=base AND program_id=pid AND user_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden: revision lineage'; END IF;
 FOR target IN SELECT value FROM jsonb_array_elements(p_payload->'targets') LOOP
  IF NOT EXISTS(SELECT 1 FROM public.program_day_exercises s JOIN public.program_days sd ON sd.id=s.program_day_id
   WHERE sd.program_revision_id=base AND sd.stable_day_id=source_day AND s.stable_slot_id=(target->>'slotId')::uuid
   AND (target->>'order' IS NULL OR (target->>'order')::integer BETWEEN 1 AND s.set_count)) THEN RAISE EXCEPTION 'invalid_input: removal lineage'; END IF;
  FOR target_id IN SELECT id FROM public.workout_removal_targets(pid,base,source_day,(target->>'slotId')::uuid,(target->>'order')::integer) LOOP
   SELECT COALESCE(masks->target_id::text,removal_mask,'{"version":1,"orders":[],"removed":false}') INTO mask FROM public.program_day_exercises WHERE id=target_id;
   IF target->>'order' IS NULL THEN mask:=mask||'{"removed":true}';
   ELSIF NOT mask->'orders' @> jsonb_build_array((target->>'order')::integer) THEN mask:=jsonb_set(mask,'{orders}',mask->'orders'||jsonb_build_array((target->>'order')::integer)); END IF;
   masks:=jsonb_set(masks,ARRAY[target_id::text],mask);
  END LOOP;
 END LOOP;
 FOR target IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'swaps','[]')) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(target->>'exerciseId')::uuid) THEN RAISE EXCEPTION 'invalid_input: swap exercise'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.program_day_exercises s JOIN public.program_days sd ON sd.id=s.program_day_id WHERE sd.program_revision_id=base AND sd.stable_day_id=source_day AND s.stable_slot_id=(target->>'slotId')::uuid) THEN RAISE EXCEPTION 'invalid_input: swap lineage'; END IF;
  FOR target_id IN SELECT id FROM public.workout_removal_targets(pid,base,source_day,(target->>'slotId')::uuid,NULL) LOOP
   swaps:=jsonb_set(swaps,ARRAY[target_id::text],target->'exerciseId');
  END LOOP;
 END LOOP;
 FOR target IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'additions','[]')) LOOP
  IF (target->>'slotId')::uuid IS NULL OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(target->>'exerciseId')::uuid)
  OR COALESCE((target->>'setCount')::integer,0) NOT BETWEEN 1 AND 100
  OR EXISTS(SELECT 1 FROM public.program_day_exercises WHERE program_revision_id=base AND stable_slot_id=(target->>'slotId')::uuid) THEN RAISE EXCEPTION 'invalid_input: addition'; END IF;
  n:=n+(SELECT count(*) FROM public.workout_addition_days(pid,base,source_day));
 END LOOP;
 n:=n+(SELECT count(*) FROM (SELECT jsonb_object_keys(masks) UNION SELECT jsonb_object_keys(swaps)) changed);
 IF n>0 THEN
  INSERT INTO public.program_revisions SELECT (jsonb_populate_record(NULL::public.program_revisions,to_jsonb(r)||jsonb_build_object('id',successor,'revision',rev+1,'parent_revision_id',base,'source_origin','workout_structure','provenance','workout_structure','snapshot','{}'::jsonb,'payload_hash',''))).*;
  FOR d IN SELECT * FROM public.program_days WHERE program_revision_id=base LOOP
   new_day:=gen_random_uuid();
   INSERT INTO public.program_days SELECT (jsonb_populate_record(NULL::public.program_days,to_jsonb(d)||jsonb_build_object('id',new_day,'program_revision_id',successor))).*;
   FOR ex IN SELECT * FROM public.program_day_exercises WHERE program_day_id=d.id LOOP
    INSERT INTO public.program_day_exercises SELECT (jsonb_populate_record(NULL::public.program_day_exercises,to_jsonb(ex)||jsonb_build_object('id',gen_random_uuid(),'program_day_id',new_day,'program_revision_id',successor,
      'exercise_id',COALESCE(swaps->ex.id::text,to_jsonb(ex.exercise_id)),'removal_mask',COALESCE(masks->ex.id::text,ex.removal_mask))
      || CASE WHEN swaps ? ex.id::text THEN '{"suggested_weight_lb":null,"per_set_weights_lb":null,"load_kind":"unknown","load_unit":"none","load_side":"unknown"}'::jsonb ELSE '{}'::jsonb END)).*;
   END LOOP;
   eligible:=EXISTS(SELECT 1 FROM public.workout_addition_days(pid,base,source_day) future WHERE future.id=d.id);
   IF eligible THEN
    SELECT COALESCE(max(s.position),0) INTO v_position FROM public.program_day_exercises s WHERE program_day_id=new_day;
    FOR target IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'additions','[]')) LOOP
     v_position:=v_position+1;
     INSERT INTO public.program_day_exercises(program_day_id,exercise_id,position,set_count,rep_range_min,rep_range_max,target_rpe,program_revision_id,stable_slot_id,addition_lineage,load_kind,load_unit,load_side)
     VALUES(new_day,(target->>'exerciseId')::uuid,v_position,(target->>'setCount')::integer,8,12,NULL,successor,
       md5((target->>'slotId')||d.stable_day_id::text)::uuid,(target->>'slotId')::uuid,'external','lb','unknown');
    END LOOP;
   END IF;
  END LOOP;
  INSERT INTO public.program_generation_context SELECT (jsonb_populate_record(NULL::public.program_generation_context,to_jsonb(c)||jsonb_build_object('id',gen_random_uuid(),'program_revision_id',successor))).* FROM public.program_generation_context c WHERE program_revision_id=base;
  SELECT jsonb_build_object('version',1,'kind','workout_structure','parentRevisionId',base,'request',p_payload,'days',jsonb_agg(to_jsonb(pd)||jsonb_build_object('exercises',(SELECT jsonb_agg(to_jsonb(s) ORDER BY position) FROM public.program_day_exercises s WHERE s.program_day_id=pd.id)))) INTO v_snapshot FROM public.program_days pd WHERE program_revision_id=successor;
  UPDATE public.program_revisions SET snapshot=v_snapshot,payload_hash=encode(digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex') WHERE id=successor;
  UPDATE public.programs SET current_revision=rev+1,current_revision_id=successor,updated_at=now() WHERE id=pid;
 ELSE successor:=base;
 END IF;
 receipt:=jsonb_build_object('operationId',op,'programId',pid,'baseRevisionId',base,'revisionId',successor,'revision',rev+CASE WHEN n>0 THEN 1 ELSE 0 END,'changedSlotCount',n,'futureChangedSlotCount',n,'replayed',false);
 INSERT INTO public.program_revision_command_receipts(user_id,operation_id,request_hash,program_id,base_revision_id,successor_revision_id,receipt) VALUES(uid,op,hash,pid,base,successor,receipt);
 RETURN receipt;
END $$;

CREATE OR REPLACE FUNCTION public.correct_completed_workout_v1(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_operation_id uuid := (p_payload->>'operationId')::uuid;
  v_session_id uuid := (p_payload->>'sessionId')::uuid;
  v_expected_revision integer := (p_payload->>'expectedRevision')::integer;
  v_request_hash text;
  v_existing public.workout_correction_receipts%ROWTYPE;
  v_session public.workout_sessions%ROWTYPE;
  v_set jsonb;
  v_before jsonb;
  v_after jsonb;
  v_planned_count integer;
  v_set_count integer;
  v_covered_count integer;
  v_total_volume numeric := 0;
  v_completion text;
  v_result_revision integer;
  v_receipt jsonb;
  v_program_receipt jsonb;
  v_parent public.program_days%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR jsonb_typeof(p_payload->'sets') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid_input: payload and sets required';
  END IF;
  IF COALESCE((p_payload->>'schemaVersion')::integer, 0) <> 1
     OR v_operation_id IS NULL OR v_session_id IS NULL OR v_expected_revision IS NULL THEN
    RAISE EXCEPTION 'invalid_input: operation, workout, schema, and revision required';
  END IF;
  v_request_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  SELECT pd.* INTO v_parent FROM public.program_days pd JOIN public.workout_sessions ws ON ws.program_day_id=pd.id WHERE ws.id=v_session_id AND ws.user_id=v_user_id;
  IF v_parent.program_id IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text||':'||v_parent.program_id::text,0)); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_session_id::text, 0));
  SELECT * INTO v_existing FROM public.workout_correction_receipts
  WHERE user_id = v_user_id AND operation_id = v_operation_id;
  IF FOUND THEN
    IF v_existing.request_hash <> v_request_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;
  SELECT * INTO v_session FROM public.workout_sessions WHERE id = v_session_id FOR UPDATE;
  IF NOT FOUND OR v_session.user_id <> v_user_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_session.lifecycle <> 'finalized' THEN RAISE EXCEPTION 'invalid_input: finalized workout required'; END IF;
  IF v_session.correction_revision <> v_expected_revision THEN
    RAISE EXCEPTION 'stale_revision: completed workout changed';
  END IF;
  SELECT jsonb_build_object('session', to_jsonb(v_session), 'sets', COALESCE(jsonb_agg(to_jsonb(wes) ORDER BY wes.order_index), '[]'::jsonb))
  INTO v_before FROM public.workout_exercise_sets wes WHERE wes.session_id = v_session_id;

  IF (SELECT count(DISTINCT value->>'actualSetId') FROM jsonb_array_elements(p_payload->'sets'))
     <> jsonb_array_length(p_payload->'sets') THEN
    RAISE EXCEPTION 'invalid_input: unique stable set identities required';
  END IF;
  IF (SELECT count(DISTINCT COALESCE(NULLIF(value->>'prescriptionSlotId', ''), value->>'exerciseId') || ':' || (value->>'order'))
      FROM jsonb_array_elements(p_payload->'sets')) <> jsonb_array_length(p_payload->'sets') THEN
    RAISE EXCEPTION 'invalid_input: unique set order within each exercise slot required';
  END IF;
  FOR v_set IN SELECT value FROM jsonb_array_elements(p_payload->'sets') LOOP
    IF NULLIF(v_set->>'actualSetId', '') IS NULL OR NULLIF(v_set->>'exerciseId', '') IS NULL
       OR COALESCE((v_set->>'order')::integer, 0) < 1 OR COALESCE((v_set->>'reps')::integer, 0) < 1
       OR COALESCE((v_set->>'loadKind'), '') NOT IN ('external', 'bodyweight', 'assistance', 'unknown')
       OR COALESCE((v_set->>'loadUnit'), '') NOT IN ('lb', 'kg', 'none')
       OR COALESCE((v_set->>'loadSide'), '') NOT IN ('external_total', 'per_hand', 'combined', 'unilateral', 'unknown') THEN
      RAISE EXCEPTION 'invalid_input: completed set';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = (v_set->>'exerciseId')::uuid) THEN
      RAISE EXCEPTION 'invalid_input: unknown exercise';
    END IF;
    IF NULLIF(v_set->>'prescriptionSlotId', '') IS NOT NULL AND v_session.program_revision_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.program_day_exercises pde
         WHERE pde.program_revision_id = v_session.program_revision_id
           AND pde.program_day_id = v_session.program_day_id
           AND pde.stable_slot_id = (v_set->>'prescriptionSlotId')::uuid
           AND (NULLIF(v_set->>'prescribedExerciseId', '') IS NULL
             OR pde.exercise_id = (v_set->>'prescribedExerciseId')::uuid)
       ) AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(COALESCE(p_payload->'effectiveSlots',v_session.prescription_snapshot->'effectiveSlots','[]')) extra
         WHERE extra->>'slotId'=v_set->>'prescriptionSlotId' AND (extra->>'prescribedSetCount')::integer=0
       ) THEN RAISE EXCEPTION 'invalid_input: prescription lineage'; END IF;
    IF NULLIF(v_set->>'loadValue', '') IS NOT NULL AND (v_set->>'loadValue')::numeric < 0 THEN
      RAISE EXCEPTION 'invalid_input: load';
    END IF;
    IF (v_set->>'loadKind' IN ('external', 'assistance') AND
        (NULLIF(v_set->>'loadValue', '') IS NULL OR v_set->>'loadUnit' NOT IN ('lb', 'kg')))
       OR (v_set->>'loadKind' IN ('bodyweight', 'unknown') AND
        (v_set->>'loadUnit' <> 'none' OR COALESCE((v_set->>'loadValue')::numeric, 0) <> 0))
       OR lower(COALESCE(v_set->>'loadValue', '')) IN ('nan', 'infinity', '-infinity') THEN
      RAISE EXCEPTION 'invalid_input: load semantics';
    END IF;
    IF NULLIF(v_set->>'rpe', '') IS NOT NULL AND (v_set->>'rpe')::numeric NOT BETWEEN 0 AND 10 THEN
      RAISE EXCEPTION 'invalid_input: rpe';
    END IF;
  END LOOP;

  IF p_payload ? 'setOutcomes' THEN
    IF jsonb_typeof(p_payload->'setOutcomes') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_input: set outcomes'; END IF;
    IF (SELECT count(DISTINCT value->>'setId') FROM jsonb_array_elements(p_payload->'setOutcomes'))
       <> jsonb_array_length(p_payload->'setOutcomes') THEN RAISE EXCEPTION 'invalid_input: duplicate set outcomes'; END IF;
    FOR v_set IN SELECT value FROM jsonb_array_elements(p_payload->'setOutcomes') LOOP
      IF COALESCE(v_set->>'outcome', '') NOT IN ('performed', 'skipped', 'not_attempted') OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_session.prescription_snapshot->'slots') slot,
          jsonb_array_elements(slot->'sets') planned
        WHERE slot->>'slotId' = v_set->>'slotId' AND planned->>'setId' = v_set->>'setId'
          AND planned->>'order' = v_set->>'order'
      ) THEN RAISE EXCEPTION 'invalid_input: outcome prescription lineage'; END IF;
      IF (v_set->>'outcome' = 'performed') IS DISTINCT FROM EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'sets') actual
        WHERE actual->>'actualSetId' = v_set->>'setId'
          AND actual->>'prescriptionSlotId' = v_set->>'slotId' AND actual->>'order' = v_set->>'order'
      ) THEN RAISE EXCEPTION 'invalid_input: outcome does not match performed result'; END IF;
    END LOOP;
  END IF;
  SELECT * INTO v_parent FROM public.program_days WHERE id=v_session.program_day_id;
  IF p_payload->'removals' IS NOT NULL AND p_payload->'removals'<>'null'::jsonb AND v_session.prescription_snapshot->'removals' IS NOT NULL
    AND NOT ((p_payload->'removals') @> (v_session.prescription_snapshot->'removals')) THEN RAISE EXCEPTION 'invalid_input: removed work cannot be restored by an older edit'; END IF;
  PERFORM public.validate_workout_removals(v_session.prescription_snapshot,p_payload->'removals',p_payload->'sets',p_payload->'programRemoval',v_parent.program_id,v_parent.stable_day_id);
  -- Omitted removal metadata from older clients preserves saved tombstones and cannot resurrect results.
  PERFORM public.validate_workout_removals(v_session.prescription_snapshot,v_session.prescription_snapshot->'removals',p_payload->'sets',NULL,v_parent.program_id,v_parent.stable_day_id);
  IF p_payload->'programRemoval' IS NOT NULL AND p_payload->'programRemoval'<>'null'::jsonb THEN
    PERFORM public.validate_workout_program_changes(p_payload->'programRemoval',p_payload->'effectiveSlots');
    v_program_receipt:=public.revise_program_removals_v1((p_payload->'programRemoval')||jsonb_build_object('operationId',v_operation_id));
  END IF;
  IF p_payload ? 'effectiveSlots' THEN
    PERFORM public.validate_workout_structure(v_session.prescription_snapshot,p_payload->'effectiveSlots',COALESCE(p_payload->'removals',v_session.prescription_snapshot->'removals'));
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'effectiveSlots') s,jsonb_array_elements(s->'sets') t
      WHERE COALESCE((t->>'logged')::boolean,false) IS DISTINCT FROM EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'sets') a
        WHERE a->>'actualSetId'=t->>'setId' AND a->>'prescriptionSlotId'=s->>'slotId' AND a->>'order'=t->>'order' AND a->>'exerciseId'=t->>'actualExerciseId'))
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'sets') a WHERE NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(p_payload->'effectiveSlots') s,jsonb_array_elements(s->'sets') t WHERE t->>'setId'=a->>'actualSetId'))
    THEN RAISE EXCEPTION 'invalid_input: effective results disagree'; END IF;
  END IF;
  DELETE FROM public.workout_exercise_sets WHERE session_id = v_session_id;
  FOR v_set IN SELECT value FROM jsonb_array_elements(p_payload->'sets') LOOP
    INSERT INTO public.workout_exercise_sets (
      id, session_id, exercise_id, set_number, reps, weight_lb, rpe, actual_set_id,
      prescription_slot_id, prescribed_exercise_id, order_index, load_value,
      load_unit, load_kind, load_side, logged_at, created_at
    ) VALUES (
      gen_random_uuid(), v_session_id, (v_set->>'exerciseId')::uuid, (v_set->>'order')::integer,
      (v_set->>'reps')::integer,
      CASE WHEN v_set->>'loadKind' = 'external' THEN COALESCE((v_set->>'loadValue')::numeric, 0)
        * CASE WHEN v_set->>'loadUnit' = 'kg' THEN 2.2046226218 ELSE 1 END ELSE 0 END,
      NULLIF(v_set->>'rpe', '')::numeric, (v_set->>'actualSetId')::uuid,
      NULLIF(v_set->>'prescriptionSlotId', '')::uuid, NULLIF(v_set->>'prescribedExerciseId', '')::uuid,
      (v_set->>'order')::integer, NULLIF(v_set->>'loadValue', '')::numeric,
      v_set->>'loadUnit', v_set->>'loadKind', v_set->>'loadSide',
      COALESCE(NULLIF(v_set->>'loggedAt', '')::timestamptz, v_session.ended_at, now()), now()
    );
  END LOOP;

  SELECT count(*), COALESCE(sum(CASE WHEN load_kind = 'external'
    THEN COALESCE(load_value, 0) * CASE WHEN load_unit = 'kg' THEN 2.2046226218 ELSE 1 END * reps ELSE 0 END), 0)
  INTO v_set_count, v_total_volume FROM public.workout_exercise_sets WHERE session_id = v_session_id;
  SELECT COALESCE(sum((slot->>'prescribedSetCount')::integer), 0) INTO v_planned_count
  FROM jsonb_array_elements(COALESCE(v_session.prescription_snapshot->'slots', '[]'::jsonb)) slot;
  SELECT count(*) INTO v_covered_count FROM public.program_day_exercises pde,
    generate_series(1, pde.set_count) required(set_order)
  WHERE pde.program_day_id = v_session.program_day_id AND EXISTS (
    SELECT 1 FROM public.workout_exercise_sets wes WHERE wes.session_id = v_session_id
      AND wes.prescription_slot_id = pde.stable_slot_id AND wes.order_index = required.set_order
  );
  v_completion := CASE WHEN v_set_count = 0 THEN 'abandoned'
    WHEN v_planned_count > 0 AND v_covered_count = v_planned_count THEN 'complete'
    WHEN v_planned_count = 0 THEN 'legacy_unknown' ELSE 'partial' END;
  v_result_revision := v_expected_revision + 1;
  UPDATE public.workout_sessions SET total_volume_lb = v_total_volume,
    completion_class = v_completion, correction_revision = v_result_revision,
    corrected_at = now(), pr_count = 0,
    prescription_snapshot = jsonb_set(COALESCE(prescription_snapshot, '{}'::jsonb), '{setOutcomes}', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'setId', planned->>'setId', 'slotId', slot->>'slotId', 'order', (planned->>'order')::integer,
        'outcome', CASE WHEN EXISTS (
          SELECT 1 FROM public.workout_exercise_sets actual WHERE actual.session_id = v_session_id
            AND actual.prescription_slot_id::text = slot->>'slotId' AND actual.order_index = (planned->>'order')::integer
        ) THEN 'performed' WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(p_payload->'setOutcomes', '[]'::jsonb)) outcome
          WHERE outcome->>'setId' = planned->>'setId' AND outcome->>'outcome' = 'skipped'
        ) THEN 'skipped' ELSE 'not_attempted' END
      )), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(v_session.prescription_snapshot->'slots', '[]'::jsonb)) slot,
        jsonb_array_elements(COALESCE(slot->'sets', '[]'::jsonb)) planned
    ), true)
  WHERE id = v_session_id;
  IF p_payload->'removals' IS NOT NULL AND p_payload->'removals'<>'null'::jsonb THEN
    UPDATE public.workout_sessions SET prescription_snapshot=jsonb_set(prescription_snapshot,'{removals}',p_payload->'removals') WHERE id=v_session_id;
  END IF;
  IF p_payload ? 'effectiveSlots' THEN
    UPDATE public.workout_sessions SET prescription_snapshot=jsonb_set(prescription_snapshot,'{effectiveSlots}',p_payload->'effectiveSlots') WHERE id=v_session_id;
  END IF;
  -- Rebuild only correction-aware PR rows owned by this session. Legacy rows
  -- without a session identity stay readable and are never guessed/deleted.
  DELETE FROM public.personal_records WHERE user_id = v_user_id AND session_id = v_session_id;
  INSERT INTO public.personal_records (
    user_id, exercise_id, weight_lb, reps, one_rep_max_lb, achieved_at, session_id
  )
  SELECT v_user_id, best.exercise_id::text, best.weight_lb, best.reps,
    best.weight_lb * (1 + best.reps::numeric / 30),
    COALESCE(v_session.ended_at::date, current_date), v_session_id
  FROM (
    SELECT DISTINCT ON (exercise_id) exercise_id, weight_lb, reps
    FROM public.workout_exercise_sets
    WHERE session_id = v_session_id AND load_kind = 'external' AND weight_lb > 0
    ORDER BY exercise_id, weight_lb DESC, reps DESC
  ) best
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workout_exercise_sets other_set
    JOIN public.workout_sessions other_session ON other_session.id = other_set.session_id
    WHERE other_session.user_id = v_user_id AND other_session.id <> v_session_id
      AND other_set.exercise_id = best.exercise_id AND other_set.load_kind = 'external'
      AND (other_set.weight_lb, other_set.reps) >= (best.weight_lb, best.reps)
  );
  UPDATE public.workout_sessions SET pr_count = (
    SELECT count(*) FROM public.personal_records WHERE user_id = v_user_id AND session_id = v_session_id
  ) WHERE id = v_session_id;
  UPDATE public.workout_receipt_effects SET status = 'pending', attempt_count = 0,
    last_error_code = NULL, updated_at = now() WHERE workout_session_id = v_session_id;
  SELECT jsonb_build_object('session', to_jsonb(ws), 'sets', COALESCE(jsonb_agg(to_jsonb(wes) ORDER BY wes.order_index) FILTER (WHERE wes.id IS NOT NULL), '[]'::jsonb))
  INTO v_after FROM public.workout_sessions ws LEFT JOIN public.workout_exercise_sets wes ON wes.session_id = ws.id
  WHERE ws.id = v_session_id GROUP BY ws.id;
  INSERT INTO public.workout_correction_audit (
    user_id, workout_session_id, operation_id, base_revision, resulting_revision, before_state, after_state
  ) VALUES (v_user_id, v_session_id, v_operation_id, v_expected_revision, v_result_revision, v_before, v_after);
  v_receipt := jsonb_build_object(
    'operationId', v_operation_id, 'sessionId', v_session_id, 'revision', v_result_revision,
    'completionClass', v_completion, 'setCount', v_set_count, 'totalVolumeLb', v_total_volume,
    'correctedAt', now(), 'replayed', false, 'programRemoval',v_program_receipt,'effectiveSlots',p_payload->'effectiveSlots'
  );
  INSERT INTO public.workout_correction_receipts (
    user_id, operation_id, workout_session_id, request_hash, base_revision, resulting_revision, receipt
  ) VALUES (v_user_id, v_operation_id, v_session_id, v_request_hash,
    v_expected_revision, v_result_revision, v_receipt);
  RETURN v_receipt;
END;
$$;



CREATE OR REPLACE FUNCTION public.finalize_workout_v2(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_operation_id uuid;
  v_draft_id uuid;
  v_hash text;
  v_existing public.workout_sessions%ROWTYPE;
  v_program_day public.program_days%ROWTYPE;
  v_revision public.program_revisions%ROWTYPE;
  v_session_id uuid := gen_random_uuid();
  v_slot jsonb;
  v_set jsonb;
  v_planned_count integer := 0;
  v_logged_count integer := 0;
  v_recalibration boolean := false;
  v_completion text;
  v_total_volume numeric := 0;
  v_receipt jsonb;
  v_program_receipt jsonb;
  v_actuals jsonb;
  v_covered integer := 0;
  v_removals jsonb;
  v_snapshot jsonb;
  v_mask jsonb;
  v_planned jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_operation_id := (p_payload->>'operationId')::uuid;
  v_draft_id := (p_payload->>'draftId')::uuid;
  IF v_operation_id IS NULL OR v_draft_id IS NULL THEN RAISE EXCEPTION 'invalid_input: operation and draft identity required'; END IF;
  v_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');

  SELECT pd.* INTO v_program_day FROM public.program_days pd JOIN public.programs p ON p.id=pd.program_id WHERE pd.id=(p_payload->>'programDayId')::uuid AND p.user_id=v_user_id;
  IF v_program_day.program_id IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text||':'||v_program_day.program_id::text,0)); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_operation_id::text, 0));
  SELECT * INTO v_existing FROM public.workout_sessions
  WHERE user_id = v_user_id AND operation_id = v_operation_id;
  IF FOUND THEN
    IF v_existing.payload_hash <> v_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;

  SELECT * INTO v_program_day FROM public.program_days
  WHERE id = (p_payload->>'programDayId')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_unavailable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_program_day.stable_day_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days pd ON pd.id = ws.program_day_id
      WHERE ws.user_id = v_user_id AND pd.program_id = v_program_day.program_id
        AND pd.stable_day_id = v_program_day.stable_day_id AND ws.lifecycle = 'finalized') THEN
    RAISE EXCEPTION 'conflict: workout occurrence already finalized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.id = v_program_day.program_id AND p.user_id = v_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_revision FROM public.program_revisions
  WHERE id = (p_payload->>'prescriptionRevisionId')::uuid
    AND program_id = v_program_day.program_id AND user_id = v_user_id;
  IF NOT FOUND OR v_program_day.program_revision_id IS DISTINCT FROM v_revision.id THEN
    RAISE EXCEPTION 'stale_revision';
  END IF;
  IF COALESCE((p_payload->>'schemaVersion')::integer, 0) <> 2 THEN RAISE EXCEPTION 'unsupported_schema'; END IF;
  IF jsonb_typeof(p_payload->'slots') <> 'array' OR jsonb_array_length(p_payload->'slots') = 0 THEN
    RAISE EXCEPTION 'invalid_input: slots required';
  END IF;

  IF (SELECT count(DISTINCT value->>'slotId') FROM jsonb_array_elements(p_payload->'slots') WHERE COALESCE((value->>'prescribedSetCount')::integer,0)>0)
       <> (SELECT count(*) FROM public.program_day_exercises WHERE program_day_id = v_program_day.id)
     OR (SELECT count(DISTINCT value->>'slotId') FROM jsonb_array_elements(p_payload->'slots'))
       <> jsonb_array_length(p_payload->'slots') THEN
    RAISE EXCEPTION 'invalid_input: complete unique prescription slots required';
  END IF;

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_payload->'slots') LOOP
    IF (v_slot->>'prescribedSetCount')::integer>0 AND NOT EXISTS (
      SELECT 1 FROM public.program_day_exercises pde
      WHERE pde.program_day_id = v_program_day.id
        AND pde.program_revision_id = v_revision.id
        AND pde.stable_slot_id = (v_slot->>'slotId')::uuid
        AND pde.exercise_id = (v_slot->>'prescribedExerciseId')::uuid
        AND pde.set_count = (v_slot->>'prescribedSetCount')::integer
    ) THEN RAISE EXCEPTION 'invalid_input: prescription lineage'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = (v_slot->>'actualExerciseId')::uuid) THEN
      RAISE EXCEPTION 'invalid_input: actual exercise';
    END IF;
    v_planned_count := v_planned_count + COALESCE((v_slot->>'prescribedSetCount')::integer, 0);
    v_recalibration := v_recalibration OR COALESCE((v_slot->>'requiresRecalibration')::boolean, false);
    IF jsonb_typeof(v_slot->'sets') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_input: set array'; END IF;
    -- Extra rows are validated by stable identity, never by truncating to prescribed count.
    FOR v_set IN SELECT value FROM jsonb_array_elements(v_slot->'sets') LOOP
      IF COALESCE((v_set->>'logged')::boolean, false) THEN
        IF NULLIF(v_set->>'setId', '') IS NULL
           OR COALESCE((v_set->>'actualReps')::integer, 0) <= 0
           OR COALESCE((v_set->>'order')::integer, 0) < 1
           OR NULLIF(v_set->>'actualExerciseId', '') IS NULL THEN
          RAISE EXCEPTION 'invalid_input: logged set';
        END IF;
        IF NULLIF(v_set->>'actualLoad', '') IS NOT NULL AND (v_set->>'actualLoad')::numeric < 0 THEN
          RAISE EXCEPTION 'invalid_input: load';
        END IF;
        IF NULLIF(v_set->>'actualRpe', '') IS NOT NULL
           AND (v_set->>'actualRpe')::numeric NOT BETWEEN 0 AND 10 THEN
          RAISE EXCEPTION 'invalid_input: rpe';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = (v_set->>'actualExerciseId')::uuid) THEN RAISE EXCEPTION 'invalid_input: set exercise identity'; END IF;
        IF COALESCE(v_set->>'loadKind','unknown') NOT IN ('external','assistance','bodyweight','unknown')
          OR (v_set->>'loadKind' IN ('external','assistance') AND (NULLIF(v_set->>'actualLoad','') IS NULL OR v_set->>'loadUnit' NOT IN ('lb','kg')))
          OR lower(COALESCE(v_set->>'actualLoad','')) IN ('nan','infinity','-infinity') THEN RAISE EXCEPTION 'invalid_input: load semantics'; END IF;
        v_logged_count := v_logged_count + 1;
        IF (v_set->>'order')::integer <= (v_slot->>'prescribedSetCount')::integer THEN v_covered:=v_covered+1; END IF;
        v_total_volume := v_total_volume + CASE WHEN v_set->>'loadKind' = 'external'
          THEN COALESCE((v_set->>'actualLoad')::numeric, 0)
            * CASE WHEN v_set->>'loadUnit' = 'kg' THEN 2.2046226218 ELSE 1 END
            * (v_set->>'actualReps')::integer ELSE 0 END;
      END IF;
    END LOOP;
  END LOOP;

  IF (p_payload->>'structureVersion')::integer=1 THEN
    PERFORM public.validate_workout_structure(p_payload->'frozenPrescription',p_payload->'slots',p_payload->'removals');
  END IF;
  IF v_planned_count <= 0 THEN RAISE EXCEPTION 'invalid_input: set coverage'; END IF;
  v_completion := CASE
    WHEN v_logged_count = 0 THEN 'abandoned'
    WHEN v_covered = v_planned_count AND NOT v_recalibration THEN 'complete'
    ELSE 'partial'
  END;

  v_removals:=COALESCE(NULLIF(p_payload->'removals','null'::jsonb),'{"version":1,"slots":[],"sets":[]}'::jsonb);
  v_snapshot:=p_payload->'frozenPrescription';
  IF (p_payload->'removals' IS NOT NULL AND p_payload->'removals'<>'null'::jsonb) OR EXISTS(SELECT 1 FROM public.program_day_exercises WHERE program_day_id=v_program_day.id AND removal_mask IS NOT NULL) THEN
  -- Require original prescription coverage; IDs may be generated locally, positions may not be reassigned.
  IF jsonb_array_length(v_snapshot->'slots') IS DISTINCT FROM (SELECT count(*)::integer FROM jsonb_array_elements(p_payload->'slots') s WHERE (s->>'prescribedSetCount')::integer>0) THEN RAISE EXCEPTION 'invalid_input: frozen slot coverage'; END IF;
  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_payload->'slots') WHERE (value->>'prescribedSetCount')::integer>0 LOOP
    SELECT value INTO v_planned FROM jsonb_array_elements(v_snapshot->'slots') WHERE value->>'slotId'=v_slot->>'slotId';
    IF v_planned IS NULL OR v_planned->>'prescribedExerciseId' IS DISTINCT FROM v_slot->>'prescribedExerciseId'
      OR (v_planned->>'prescribedSetCount')::integer IS DISTINCT FROM (v_slot->>'prescribedSetCount')::integer
      OR jsonb_array_length(v_planned->'sets') IS DISTINCT FROM (v_slot->>'prescribedSetCount')::integer
      OR (SELECT count(DISTINCT (t->>'order')::integer) FROM jsonb_array_elements(v_planned->'sets') t WHERE (t->>'order')::integer BETWEEN 1 AND (v_slot->>'prescribedSetCount')::integer) <> (v_slot->>'prescribedSetCount')::integer
      THEN RAISE EXCEPTION 'invalid_input: frozen set coverage'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_slot->'sets') t WHERE (t->>'order')::integer <= (v_slot->>'prescribedSetCount')::integer AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(v_planned->'sets') f WHERE f->>'setId'=t->>'setId' AND f->>'order'=t->>'order')) THEN RAISE EXCEPTION 'invalid_input: stable set order'; END IF;
    SELECT removal_mask INTO v_mask FROM public.program_day_exercises WHERE program_day_id=v_program_day.id AND stable_slot_id=(v_slot->>'slotId')::uuid;
    IF COALESCE((v_mask->>'removed')::boolean,false) AND NOT (v_removals->'slots') ? (v_slot->>'slotId') THEN
      v_removals:=jsonb_set(v_removals,'{slots}',(v_removals->'slots')||jsonb_build_array(v_slot->>'slotId'));
    END IF;
    FOR v_set IN SELECT value FROM jsonb_array_elements(v_planned->'sets') LOOP
      IF COALESCE(v_mask->'orders','[]'::jsonb) @> jsonb_build_array((v_set->>'order')::integer) AND NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(v_removals->'sets') t WHERE t->>'setId'=v_set->>'setId') THEN
        v_removals:=jsonb_set(v_removals,'{sets}',(v_removals->'sets')||jsonb_build_array(jsonb_build_object('slotId',v_slot->>'slotId','setId',v_set->>'setId','order',(v_set->>'order')::integer)));
      END IF;
    END LOOP;
  END LOOP;
  END IF;
  v_snapshot:=jsonb_set(COALESCE(v_snapshot,'{}'::jsonb),'{removals}',v_removals);
  SELECT COALESCE(jsonb_agg(jsonb_build_object('actualSetId',t->>'setId','prescriptionSlotId',s->>'slotId','order',t->'order')),'[]'::jsonb) INTO v_actuals
    FROM jsonb_array_elements(p_payload->'slots') s,jsonb_array_elements(s->'sets') t WHERE COALESCE((t->>'logged')::boolean,false);
  PERFORM public.validate_workout_removals(v_snapshot,v_removals,v_actuals,p_payload->'programRemoval',v_program_day.program_id,v_program_day.stable_day_id);
  IF p_payload->'programRemoval' IS NOT NULL AND p_payload->'programRemoval'<>'null'::jsonb THEN
    PERFORM public.validate_workout_program_changes(p_payload->'programRemoval',p_payload->'slots');
    v_program_receipt:=public.revise_program_removals_v1((p_payload->'programRemoval')||jsonb_build_object('operationId',v_operation_id));
  END IF;
  INSERT INTO public.workout_sessions (
    id, user_id, program_day_id, workout_name, started_at, ended_at, duration_min,
    total_volume_lb, operation_id, draft_id, schema_version, revision, lifecycle,
    completion_class, payload_hash, program_revision_id, prescription_snapshot,
    source_timezone, finalized_at
  ) VALUES (
    v_session_id, v_user_id, v_program_day.id,
    COALESCE(NULLIF(btrim(p_payload->>'workoutName'), ''), v_program_day.workout_name),
    (p_payload->>'startedAt')::timestamptz, COALESCE((p_payload->>'endedAt')::timestamptz, now()),
    GREATEST(0, COALESCE((p_payload->>'durationMin')::integer, 0)), v_total_volume,
    v_operation_id, v_draft_id, 2, (p_payload->>'revision')::integer, 'finalized',
    v_completion, v_hash, v_revision.id, v_snapshot || jsonb_build_object('effectiveSlots', p_payload->'slots'),
    NULLIF(p_payload->>'timezone', ''), now()
  );

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_payload->'slots') LOOP
    FOR v_set IN SELECT value FROM jsonb_array_elements(v_slot->'sets') LOOP
      IF COALESCE((v_set->>'logged')::boolean, false) THEN
        INSERT INTO public.workout_exercise_sets (
          session_id, exercise_id, set_number, reps, weight_lb, rpe, actual_set_id,
          prescription_slot_id, prescribed_exercise_id, order_index, load_value,
          load_unit, load_kind, load_side, logged_at
        ) VALUES (
          v_session_id, (v_set->>'actualExerciseId')::uuid, (v_set->>'order')::integer,
          (v_set->>'actualReps')::integer, CASE WHEN v_set->>'loadKind' = 'external'
            THEN COALESCE((v_set->>'actualLoad')::numeric, 0)
              * CASE WHEN v_set->>'loadUnit' = 'kg' THEN 2.2046226218 ELSE 1 END ELSE 0 END,
          NULLIF(v_set->>'actualRpe', '')::numeric, (v_set->>'setId')::uuid,
          (v_slot->>'slotId')::uuid, (v_slot->>'prescribedExerciseId')::uuid,
          (v_set->>'order')::integer, NULLIF(v_set->>'actualLoad', '')::numeric,
          COALESCE(NULLIF(v_set->>'loadUnit', ''), 'none'),
          COALESCE(NULLIF(v_set->>'loadKind', ''), 'unknown'),
          COALESCE(NULLIF(v_set->>'loadSide', ''), 'unknown'),
          COALESCE((v_set->>'loggedAt')::timestamptz, now())
        );
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO public.workout_receipt_effects(user_id, workout_session_id, effect_type)
  SELECT v_user_id, v_session_id, effect_type
  FROM unnest(ARRAY['personal_record_projection', 'progression_projection', 'analytics_projection']) AS effect_type;

  v_receipt := jsonb_build_object(
    'sessionId', v_session_id, 'operationId', v_operation_id, 'draftId', v_draft_id,
    'revision', (p_payload->>'revision')::integer, 'completionClass', v_completion,
    'finalizedAt', now(), 'setCount', v_logged_count, 'replayed', false, 'programRemoval',v_program_receipt
  );
  UPDATE public.workout_sessions SET receipt = v_receipt WHERE id = v_session_id;
  RETURN v_receipt;
END;
$$;



CREATE FUNCTION public.correct_workout_structure_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public AS $$ SELECT public.correct_completed_workout_v1(p_payload) $$;
CREATE FUNCTION public.finalize_workout_structure_v1(p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public AS $$ SELECT public.finalize_workout_v2(p_payload) $$;
REVOKE ALL ON FUNCTION public.correct_workout_structure_v1(jsonb),public.finalize_workout_structure_v1(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.correct_workout_structure_v1(jsonb),public.finalize_workout_structure_v1(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_workout_removals(p_snapshot jsonb,p_removals jsonb,p_actuals jsonb,p_program jsonb,p_pid uuid,p_day uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; target jsonb;
BEGIN
 IF p_removals IS NULL OR p_removals='null'::jsonb THEN
   IF p_program IS NOT NULL AND p_program<>'null'::jsonb THEN RAISE EXCEPTION 'invalid_input: missing occurrence removal'; END IF;
   RETURN;
 END IF;
 IF (p_removals->>'version')::integer IS DISTINCT FROM 1 OR jsonb_typeof(p_removals->'slots') IS DISTINCT FROM 'array'
   OR jsonb_typeof(p_removals->'sets') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_input: removal version'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_removals->'slots') LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(p_snapshot->'slots','[]')||COALESCE(p_snapshot->'effectiveSlots','[]')) s WHERE s->>'slotId'=item#>>'{}') THEN RAISE EXCEPTION 'invalid_input: removed slot lineage'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(p_removals->'sets') LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(p_snapshot->'slots','[]')||COALESCE(p_snapshot->'effectiveSlots','[]')) s,jsonb_array_elements(s->'sets') t
     WHERE s->>'slotId'=item->>'slotId' AND t->>'setId'=item->>'setId' AND t->>'order'=item->>'order') THEN RAISE EXCEPTION 'invalid_input: removed set lineage'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_actuals) a WHERE (p_removals->'slots') ? (a->>'prescriptionSlotId') OR EXISTS(
   SELECT 1 FROM jsonb_array_elements(p_removals->'sets') t WHERE t->>'slotId'=a->>'prescriptionSlotId' AND (t->>'setId'=a->>'actualSetId' OR t->>'order'=a->>'order'))) THEN RAISE EXCEPTION 'invalid_input: removed result retained'; END IF;
 IF p_program IS NOT NULL AND p_program<>'null'::jsonb THEN
   IF p_program->>'programId' IS DISTINCT FROM p_pid::text OR p_program->>'currentStableDayId' IS DISTINCT FROM p_day::text THEN RAISE EXCEPTION 'invalid_input: program removal parent'; END IF;
   FOR target IN SELECT value FROM jsonb_array_elements(p_program->'targets') LOOP
     IF NOT ((target->>'order' IS NULL AND (p_removals->'slots') ? (target->>'slotId')) OR EXISTS(
       SELECT 1 FROM jsonb_array_elements(p_removals->'sets') t WHERE t->>'slotId'=target->>'slotId' AND t->>'order'=target->>'order')) THEN RAISE EXCEPTION 'invalid_input: program removal without occurrence removal'; END IF;
   END LOOP;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.validate_workout_removals(jsonb,jsonb,jsonb,jsonb,uuid,uuid) FROM PUBLIC,anon,authenticated;

