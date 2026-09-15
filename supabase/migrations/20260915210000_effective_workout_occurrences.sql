-- Local-only. Requires explicit authorization before hosted deployment.
-- JSON snapshot outcomes avoid nonperformed rows in volume/history queries.
CREATE OR REPLACE FUNCTION public.revise_program_exercise_v2(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_operation_id uuid;
  v_program_id uuid;
  v_expected_revision integer;
  v_expected_revision_id uuid;
  v_current_stable_day_id uuid;
  v_current_stable_slot_id uuid;
  v_original_exercise_id uuid;
  v_replacement_exercise_id uuid;
  v_include_current_day boolean := false;
  v_request_hash text;
  v_existing public.program_revision_command_receipts%ROWTYPE;
  v_program public.programs%ROWTYPE;
  v_base_revision public.program_revisions%ROWTYPE;
  v_source_day public.program_days%ROWTYPE;
  v_source_slot public.program_day_exercises%ROWTYPE;
  v_target_slots uuid[];
  v_day public.program_days%ROWTYPE;
  v_successor_revision integer;
  v_successor_revision_id uuid := gen_random_uuid();
  v_new_day_id uuid;
  v_changed integer := 0;
  v_day_changed integer;
  v_snapshot jsonb;
  v_snapshot_hash text;
  v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'invalid_input: payload required'; END IF;

  v_operation_id := (p_payload->>'operationId')::uuid;
  v_program_id := (p_payload->>'programId')::uuid;
  v_expected_revision := (p_payload->>'expectedRevision')::integer;
  v_expected_revision_id := (p_payload->>'expectedRevisionId')::uuid;
  v_current_stable_day_id := (p_payload->>'currentStableDayId')::uuid;
  v_current_stable_slot_id := (p_payload->>'currentStableSlotId')::uuid;
  v_original_exercise_id := (p_payload->>'originalExerciseId')::uuid;
  v_replacement_exercise_id := (p_payload->>'replacementExerciseId')::uuid;
  v_include_current_day := COALESCE((p_payload->>'includeCurrentDay')::boolean, false);
  v_request_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');



  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_program_id::text, 0));

  SELECT * INTO v_existing
  FROM public.program_revision_command_receipts
  WHERE user_id = v_user_id AND operation_id = v_operation_id;
  IF FOUND THEN
    IF v_existing.request_hash <> v_request_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;

  SELECT * INTO v_program FROM public.programs WHERE id = v_program_id FOR UPDATE;
  IF NOT FOUND OR v_program.user_id <> v_user_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT v_program.is_active OR v_program.lifecycle <> 'active' OR v_program.current_revision_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: active schema-v2 program required';
  END IF;
  IF v_program.current_revision <> v_expected_revision
     OR v_program.current_revision_id IS DISTINCT FROM v_expected_revision_id THEN
    RAISE EXCEPTION 'stale_revision: active revision changed';
  END IF;

  SELECT * INTO v_base_revision FROM public.program_revisions
  WHERE id = v_expected_revision_id AND program_id = v_program_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden: revision lineage'; END IF;

  SELECT * INTO v_source_day FROM public.program_days
  WHERE program_id = v_program_id
    AND program_revision_id = v_expected_revision_id
    AND stable_day_id = v_current_stable_day_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_input: stable day not found in base revision'; END IF;

  SELECT pde.* INTO v_source_slot
  FROM public.program_day_exercises pde
  WHERE pde.program_day_id = v_source_day.id
    AND pde.program_revision_id = v_expected_revision_id
    AND pde.stable_slot_id = v_current_stable_slot_id;
  IF NOT FOUND OR v_source_slot.stable_slot_id IS DISTINCT FROM v_current_stable_slot_id THEN
    RAISE EXCEPTION 'invalid_input: stable slot or original exercise mismatch';
  END IF;
  -- Anchor matching to immutable earliest prescription slots, never their current occupants.
  SELECT array_agg(DISTINCT target.stable_slot_id) INTO v_target_slots
  FROM public.program_day_exercises target
  JOIN public.program_days td ON td.id = target.program_day_id
  WHERE td.program_id = v_program_id AND target.program_revision_id = (
    SELECT pr.id FROM public.program_revisions pr WHERE pr.program_id = v_program_id ORDER BY pr.revision LIMIT 1
  ) AND target.exercise_id = (
    SELECT source.exercise_id FROM public.program_day_exercises source
    JOIN public.program_revisions pr ON pr.id = source.program_revision_id
    WHERE pr.program_id = v_program_id AND source.stable_slot_id = v_current_stable_slot_id
    ORDER BY pr.revision LIMIT 1
  );
  IF NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = v_replacement_exercise_id) THEN
    RAISE EXCEPTION 'invalid_input: unknown catalog exercise';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_days pd
    JOIN public.program_day_exercises pde ON pde.program_day_id = pd.id
    WHERE pd.program_id = v_program_id
      AND pd.program_revision_id = v_expected_revision_id
      AND pde.program_revision_id = v_expected_revision_id
      AND pde.stable_slot_id = ANY(v_target_slots)
      AND (pd.week_number, pd.order_in_week, pd.day_index) >=
          (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
      AND (v_include_current_day OR pd.stable_day_id <> v_current_stable_day_id)
      AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = pd.stable_day_id)
  ) THEN
    RAISE EXCEPTION 'invalid_input: no eligible future uncompleted prescriptions';
  END IF;

  v_successor_revision := v_expected_revision + 1;
  INSERT INTO public.program_revisions (
    id, user_id, program_id, revision, schema_version, catalog_version, policy_version,
    source_origin, snapshot, payload_hash, provenance, parent_revision_id
  ) VALUES (
    v_successor_revision_id, v_user_id, v_program_id, v_successor_revision,
    v_base_revision.schema_version, v_base_revision.catalog_version, v_base_revision.policy_version,
    'exercise_swap', '{}'::jsonb, '', 'exercise_swap', v_expected_revision_id
  );

  FOR v_day IN
    SELECT * FROM public.program_days
    WHERE program_id = v_program_id AND program_revision_id = v_expected_revision_id
    ORDER BY week_number, order_in_week, day_index, stable_day_id
  LOOP
    v_new_day_id := gen_random_uuid();
    INSERT INTO public.program_days (
      id, program_id, week_number, day_index, order_in_week, workout_name,
      estimated_duration_min, is_rest_day, is_deload_week, stable_day_id, program_revision_id
    ) VALUES (
      v_new_day_id, v_program_id, v_day.week_number, v_day.day_index, v_day.order_in_week,
      v_day.workout_name, v_day.estimated_duration_min, v_day.is_rest_day,
      v_day.is_deload_week, v_day.stable_day_id, v_successor_revision_id
    );

    INSERT INTO public.program_day_exercises (
      program_day_id, exercise_id, position, set_count, rep_range_min, rep_range_max,
      target_rpe, suggested_weight_lb, per_set_weights_lb, notes, stable_slot_id,
      program_revision_id, load_kind, load_unit, load_side,
      replaces_exercise_id, requires_recalibration
    )
    SELECT
      v_new_day_id,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN v_replacement_exercise_id ELSE pde.exercise_id END,
      pde.position, pde.set_count, pde.rep_range_min, pde.rep_range_max, pde.target_rpe,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN NULL ELSE pde.suggested_weight_lb END,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN NULL ELSE pde.per_set_weights_lb END,
      pde.notes, pde.stable_slot_id, v_successor_revision_id,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN 'unknown' ELSE pde.load_kind END,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN 'none' ELSE pde.load_unit END,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN 'unknown' ELSE pde.load_side END,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN pde.exercise_id ELSE pde.replaces_exercise_id END,
      CASE WHEN pde.stable_slot_id = ANY(v_target_slots)
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_day.stable_day_id)
        THEN true ELSE pde.requires_recalibration END
    FROM public.program_day_exercises pde
    WHERE pde.program_day_id = v_day.id AND pde.program_revision_id = v_expected_revision_id;

    SELECT count(*) INTO v_day_changed
    FROM public.program_day_exercises pde
    WHERE pde.program_day_id = v_new_day_id AND pde.stable_slot_id = ANY(v_target_slots) AND pde.exercise_id = v_replacement_exercise_id;
    v_changed := v_changed + v_day_changed;
  END LOOP;

  INSERT INTO public.program_generation_context (
    program_id, user_id, policy_version, evidence_version, depth_mode, experience_level,
    goal, days_per_week, duration_weeks, session_length_target_min, focus_muscle_groups,
    split_recommendation, volume_targets, readiness_strategy, cycle_strategy,
    warmup_strategy, explanation_density, input_snapshot, output_summary, program_revision_id
  )
  SELECT
    program_id, user_id, policy_version, evidence_version, depth_mode, experience_level,
    goal, days_per_week, duration_weeks, session_length_target_min, focus_muscle_groups,
    split_recommendation, volume_targets, readiness_strategy, cycle_strategy,
    warmup_strategy, explanation_density, input_snapshot, output_summary, v_successor_revision_id
  FROM public.program_generation_context
  WHERE program_id = v_program_id AND program_revision_id = v_expected_revision_id;

  SELECT jsonb_build_object(
    'schemaVersion', v_base_revision.schema_version,
    'programId', v_program_id,
    'revision', v_successor_revision,
    'parentRevisionId', v_expected_revision_id,
    'change', jsonb_build_object(
      'kind', 'exercise_swap',
      'sourceStableDayId', v_current_stable_day_id,
      'sourceStableSlotId', v_current_stable_slot_id,
      'originalExerciseId', v_original_exercise_id,
      'replacementExerciseId', v_replacement_exercise_id,
      'changedSlotCount', v_changed
    ),
    'days', COALESCE(jsonb_agg(jsonb_build_object(
      'dayId', pd.stable_day_id,
      'weekNumber', pd.week_number,
      'dayIndex', pd.day_index,
      'orderInWeek', pd.order_in_week,
      'workoutName', pd.workout_name,
      'exercises', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'slotId', pde.stable_slot_id,
          'exerciseId', pde.exercise_id,
          'position', pde.position,
          'setCount', pde.set_count,
          'repRangeMin', pde.rep_range_min,
          'repRangeMax', pde.rep_range_max,
          'targetRpe', pde.target_rpe,
          'suggestedLoad', pde.suggested_weight_lb,
          'loadKind', pde.load_kind,
          'loadUnit', pde.load_unit,
          'loadSide', pde.load_side,
          'replacesExerciseId', pde.replaces_exercise_id,
          'requiresRecalibration', pde.requires_recalibration
        ) ORDER BY pde.position), '[]'::jsonb)
        FROM public.program_day_exercises pde WHERE pde.program_day_id = pd.id
      )
    ) ORDER BY pd.week_number, pd.order_in_week), '[]'::jsonb)
  ) INTO v_snapshot
  FROM public.program_days pd
  WHERE pd.program_id = v_program_id AND pd.program_revision_id = v_successor_revision_id;

  v_snapshot_hash := encode(digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex');
  UPDATE public.program_revisions
  SET snapshot = v_snapshot, payload_hash = v_snapshot_hash
  WHERE id = v_successor_revision_id;

  UPDATE public.programs
  SET current_revision = v_successor_revision,
      current_revision_id = v_successor_revision_id,
      updated_at = now()
  WHERE id = v_program_id
    AND current_revision = v_expected_revision
    AND current_revision_id = v_expected_revision_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'stale_revision: active revision changed'; END IF;

  v_receipt := jsonb_build_object(
    'operationId', v_operation_id,
    'programId', v_program_id,
    'baseRevisionId', v_expected_revision_id,
    'revisionId', v_successor_revision_id,
    'revision', v_successor_revision,
    'changedSlotCount', v_changed,
    'revisedAt', now(),
    'replayed', false
  );
  INSERT INTO public.program_revision_command_receipts (
    user_id, operation_id, request_hash, program_id, base_revision_id, successor_revision_id, receipt
  ) VALUES (
    v_user_id, v_operation_id, v_request_hash, v_program_id,
    v_expected_revision_id, v_successor_revision_id, v_receipt
  );
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_operation_id := (p_payload->>'operationId')::uuid;
  v_draft_id := (p_payload->>'draftId')::uuid;
  IF v_operation_id IS NULL OR v_draft_id IS NULL THEN RAISE EXCEPTION 'invalid_input: operation and draft identity required'; END IF;
  v_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');

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

  IF (SELECT count(DISTINCT value->>'slotId') FROM jsonb_array_elements(p_payload->'slots'))
       <> (SELECT count(*) FROM public.program_day_exercises WHERE program_day_id = v_program_day.id)
     OR (SELECT count(DISTINCT value->>'slotId') FROM jsonb_array_elements(p_payload->'slots'))
       <> jsonb_array_length(p_payload->'slots') THEN
    RAISE EXCEPTION 'invalid_input: complete unique prescription slots required';
  END IF;

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_payload->'slots') LOOP
    IF NOT EXISTS (
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
    IF jsonb_array_length(v_slot->'sets') > (v_slot->>'prescribedSetCount')::integer THEN
      RAISE EXCEPTION 'invalid_input: set coverage';
    END IF;
    FOR v_set IN SELECT value FROM jsonb_array_elements(v_slot->'sets') LOOP
      IF COALESCE((v_set->>'logged')::boolean, false) THEN
        IF NULLIF(v_set->>'setId', '') IS NULL
           OR COALESCE((v_set->>'actualReps')::integer, 0) <= 0
           OR COALESCE((v_set->>'order')::integer, 0) NOT BETWEEN 1 AND (v_slot->>'prescribedSetCount')::integer
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
        v_logged_count := v_logged_count + 1;
        v_total_volume := v_total_volume + CASE WHEN v_set->>'loadKind' = 'external'
          THEN COALESCE((v_set->>'actualLoad')::numeric, 0)
            * CASE WHEN v_set->>'loadUnit' = 'kg' THEN 2.2046226218 ELSE 1 END
            * (v_set->>'actualReps')::integer ELSE 0 END;
      END IF;
    END LOOP;
  END LOOP;

  IF v_planned_count <= 0 OR v_logged_count > v_planned_count THEN RAISE EXCEPTION 'invalid_input: set coverage'; END IF;
  v_completion := CASE
    WHEN v_logged_count = 0 THEN 'abandoned'
    WHEN v_logged_count = v_planned_count AND NOT v_recalibration THEN 'complete'
    ELSE 'partial'
  END;

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
    v_completion, v_hash, v_revision.id, (p_payload->'frozenPrescription') || jsonb_build_object('effectiveSlots', p_payload->'slots'),
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
    'finalizedAt', now(), 'setCount', v_logged_count, 'replayed', false
  );
  UPDATE public.workout_sessions SET receipt = v_receipt WHERE id = v_session_id;
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.workout_correction_capability_v1()
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $$ SELECT 2 $$;
REVOKE ALL ON FUNCTION public.workout_correction_capability_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workout_correction_capability_v1() TO authenticated;
