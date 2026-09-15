-- Consistent one-occurrence swaps and owner-authorized completed-workout corrections.
-- Additive only: finalized sessions stay finalized and program revisions remain immutable.

ALTER TABLE public.workout_sessions
  ADD COLUMN correction_revision integer NOT NULL DEFAULT 0,
  ADD COLUMN corrected_at timestamptz;

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_correction_revision_check CHECK (correction_revision >= 0);

CREATE TABLE public.workout_correction_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  request_hash text NOT NULL,
  base_revision integer NOT NULL,
  resulting_revision integer NOT NULL,
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_correction_receipts_owner_operation_key UNIQUE (user_id, operation_id)
);

CREATE TABLE public.workout_correction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  base_revision integer NOT NULL,
  resulting_revision integer NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_correction_audit_owner_operation_key UNIQUE (user_id, operation_id)
);

ALTER TABLE public.workout_correction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_correction_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX workout_correction_receipts_session_idx
  ON public.workout_correction_receipts(user_id, workout_session_id, created_at DESC);
CREATE INDEX workout_correction_audit_session_idx
  ON public.workout_correction_audit(user_id, workout_session_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.revise_program_exercise_occurrence_v1(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_operation_id uuid := (p_payload->>'operationId')::uuid;
  v_program_id uuid := (p_payload->>'programId')::uuid;
  v_expected_revision integer := (p_payload->>'expectedRevision')::integer;
  v_expected_revision_id uuid := (p_payload->>'expectedRevisionId')::uuid;
  v_stable_day_id uuid := (p_payload->>'currentStableDayId')::uuid;
  v_stable_slot_id uuid := (p_payload->>'currentStableSlotId')::uuid;
  v_original_exercise_id uuid := (p_payload->>'originalExerciseId')::uuid;
  v_replacement_exercise_id uuid := (p_payload->>'replacementExerciseId')::uuid;
  v_request_hash text;
  v_existing public.program_revision_command_receipts%ROWTYPE;
  v_program public.programs%ROWTYPE;
  v_base_revision public.program_revisions%ROWTYPE;
  v_source_day public.program_days%ROWTYPE;
  v_day public.program_days%ROWTYPE;
  v_successor_revision integer;
  v_successor_revision_id uuid := gen_random_uuid();
  v_new_day_id uuid;
  v_snapshot jsonb;
  v_snapshot_hash text;
  v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'invalid_input: payload required'; END IF;
  IF v_operation_id IS NULL OR v_program_id IS NULL OR v_expected_revision_id IS NULL
     OR v_stable_day_id IS NULL OR v_stable_slot_id IS NULL
     OR v_original_exercise_id IS NULL OR v_replacement_exercise_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: complete stable identity required';
  END IF;
  IF v_original_exercise_id = v_replacement_exercise_id THEN
    RAISE EXCEPTION 'invalid_input: replacement must differ';
  END IF;
  v_request_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_program_id::text, 0));

  SELECT * INTO v_existing FROM public.program_revision_command_receipts
  WHERE user_id = v_user_id AND operation_id = v_operation_id;
  IF FOUND THEN
    IF v_existing.request_hash <> v_request_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;

  SELECT * INTO v_program FROM public.programs WHERE id = v_program_id FOR UPDATE;
  IF NOT FOUND OR v_program.user_id <> v_user_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT v_program.is_active OR v_program.lifecycle <> 'active' OR v_program.schema_version < 2 THEN
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
  WHERE program_id = v_program_id AND program_revision_id = v_expected_revision_id
    AND stable_day_id = v_stable_day_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_input: stable day not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.program_days completed_day ON completed_day.id = ws.program_day_id
    WHERE completed_day.program_id = v_program_id AND completed_day.stable_day_id = v_stable_day_id
  ) THEN RAISE EXCEPTION 'invalid_input: selected workout is already completed; use Edit workout'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.program_day_exercises pde
    WHERE pde.program_day_id = v_source_day.id AND pde.program_revision_id = v_expected_revision_id
      AND pde.stable_slot_id = v_stable_slot_id AND pde.exercise_id = v_original_exercise_id
  ) THEN RAISE EXCEPTION 'invalid_input: stable slot or original exercise mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = v_replacement_exercise_id) THEN
    RAISE EXCEPTION 'invalid_input: unknown catalog exercise';
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

  FOR v_day IN SELECT * FROM public.program_days
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
      program_revision_id, load_kind, load_unit, load_side, replaces_exercise_id, requires_recalibration
    )
    SELECT v_new_day_id,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN v_replacement_exercise_id ELSE pde.exercise_id END,
      pde.position, pde.set_count, pde.rep_range_min, pde.rep_range_max, pde.target_rpe,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN NULL ELSE pde.suggested_weight_lb END,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN NULL ELSE pde.per_set_weights_lb END,
      pde.notes, pde.stable_slot_id, v_successor_revision_id,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN 'unknown' ELSE pde.load_kind END,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN 'none' ELSE pde.load_unit END,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN 'unknown' ELSE pde.load_side END,
      CASE WHEN v_day.stable_day_id = v_stable_day_id AND pde.stable_slot_id = v_stable_slot_id
        THEN pde.exercise_id ELSE pde.replaces_exercise_id END,
      false
    FROM public.program_day_exercises pde
    WHERE pde.program_day_id = v_day.id AND pde.program_revision_id = v_expected_revision_id;
  END LOOP;

  INSERT INTO public.program_generation_context (
    program_id, user_id, policy_version, evidence_version, depth_mode, experience_level,
    goal, days_per_week, duration_weeks, session_length_target_min, focus_muscle_groups,
    split_recommendation, volume_targets, readiness_strategy, cycle_strategy,
    warmup_strategy, explanation_density, input_snapshot, output_summary, program_revision_id
  )
  SELECT program_id, user_id, policy_version, evidence_version, depth_mode, experience_level,
    goal, days_per_week, duration_weeks, session_length_target_min, focus_muscle_groups,
    split_recommendation, volume_targets, readiness_strategy, cycle_strategy,
    warmup_strategy, explanation_density, input_snapshot, output_summary, v_successor_revision_id
  FROM public.program_generation_context
  WHERE program_id = v_program_id AND program_revision_id = v_expected_revision_id;

  SELECT jsonb_build_object(
    'schemaVersion', v_base_revision.schema_version, 'programId', v_program_id,
    'revision', v_successor_revision, 'parentRevisionId', v_expected_revision_id,
    'change', jsonb_build_object('kind', 'exercise_swap', 'scope', 'selected_only',
      'sourceStableDayId', v_stable_day_id, 'sourceStableSlotId', v_stable_slot_id,
      'originalExerciseId', v_original_exercise_id, 'replacementExerciseId', v_replacement_exercise_id,
      'changedSlotCount', 1),
    'days', COALESCE(jsonb_agg(jsonb_build_object(
      'dayId', pd.stable_day_id, 'weekNumber', pd.week_number, 'dayIndex', pd.day_index,
      'orderInWeek', pd.order_in_week, 'workoutName', pd.workout_name,
      'exercises', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'slotId', pde.stable_slot_id, 'exerciseId', pde.exercise_id, 'position', pde.position,
        'setCount', pde.set_count, 'repRangeMin', pde.rep_range_min, 'repRangeMax', pde.rep_range_max,
        'targetRpe', pde.target_rpe, 'suggestedLoad', pde.suggested_weight_lb,
        'loadKind', pde.load_kind, 'loadUnit', pde.load_unit, 'loadSide', pde.load_side,
        'replacesExerciseId', pde.replaces_exercise_id, 'requiresRecalibration', pde.requires_recalibration
      ) ORDER BY pde.position), '[]'::jsonb) FROM public.program_day_exercises pde WHERE pde.program_day_id = pd.id)
    ) ORDER BY pd.week_number, pd.order_in_week), '[]'::jsonb)
  ) INTO v_snapshot FROM public.program_days pd
  WHERE pd.program_id = v_program_id AND pd.program_revision_id = v_successor_revision_id;
  v_snapshot_hash := encode(digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex');
  UPDATE public.program_revisions SET snapshot = v_snapshot, payload_hash = v_snapshot_hash
  WHERE id = v_successor_revision_id;
  UPDATE public.programs SET current_revision = v_successor_revision,
    current_revision_id = v_successor_revision_id, updated_at = now()
  WHERE id = v_program_id AND current_revision = v_expected_revision
    AND current_revision_id = v_expected_revision_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'stale_revision: active revision changed'; END IF;

  v_receipt := jsonb_build_object(
    'operationId', v_operation_id, 'programId', v_program_id,
    'baseRevisionId', v_expected_revision_id, 'revisionId', v_successor_revision_id,
    'revision', v_successor_revision, 'changedSlotCount', 1, 'revisedAt', now(), 'replayed', false
  );
  INSERT INTO public.program_revision_command_receipts (
    user_id, operation_id, request_hash, program_id, base_revision_id, successor_revision_id, receipt
  ) VALUES (v_user_id, v_operation_id, v_request_hash, v_program_id,
    v_expected_revision_id, v_successor_revision_id, v_receipt);
  RETURN v_receipt;
END;
$$;

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
  v_total_volume numeric := 0;
  v_completion text;
  v_result_revision integer;
  v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF jsonb_typeof(p_payload) <> 'object' OR jsonb_typeof(p_payload->'sets') <> 'array' THEN
    RAISE EXCEPTION 'invalid_input: payload and sets required';
  END IF;
  IF COALESCE((p_payload->>'schemaVersion')::integer, 0) <> 1
     OR v_operation_id IS NULL OR v_session_id IS NULL OR v_expected_revision IS NULL THEN
    RAISE EXCEPTION 'invalid_input: operation, workout, schema, and revision required';
  END IF;
  v_request_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
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
           AND pde.stable_slot_id = (v_set->>'prescriptionSlotId')::uuid
           AND (NULLIF(v_set->>'prescribedExerciseId', '') IS NULL
             OR pde.exercise_id = (v_set->>'prescribedExerciseId')::uuid)
       ) THEN RAISE EXCEPTION 'invalid_input: prescription lineage'; END IF;
    IF NULLIF(v_set->>'loadValue', '') IS NOT NULL AND (v_set->>'loadValue')::numeric < 0 THEN
      RAISE EXCEPTION 'invalid_input: load';
    END IF;
    IF NULLIF(v_set->>'rpe', '') IS NOT NULL AND (v_set->>'rpe')::numeric NOT BETWEEN 0 AND 10 THEN
      RAISE EXCEPTION 'invalid_input: rpe';
    END IF;
  END LOOP;

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
  v_completion := CASE WHEN v_set_count = 0 THEN 'abandoned'
    WHEN v_planned_count > 0 AND v_set_count = v_planned_count THEN 'complete'
    WHEN v_planned_count = 0 THEN 'legacy_unknown' ELSE 'partial' END;
  v_result_revision := v_expected_revision + 1;
  UPDATE public.workout_sessions SET total_volume_lb = v_total_volume,
    completion_class = v_completion, correction_revision = v_result_revision,
    corrected_at = now(), pr_count = 0
  WHERE id = v_session_id;
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
  SELECT jsonb_build_object('session', to_jsonb(ws), 'sets', COALESCE(jsonb_agg(to_jsonb(wes) ORDER BY wes.order_index), '[]'::jsonb))
  INTO v_after FROM public.workout_sessions ws LEFT JOIN public.workout_exercise_sets wes ON wes.session_id = ws.id
  WHERE ws.id = v_session_id GROUP BY ws.id;
  INSERT INTO public.workout_correction_audit (
    user_id, workout_session_id, operation_id, base_revision, resulting_revision, before_state, after_state
  ) VALUES (v_user_id, v_session_id, v_operation_id, v_expected_revision, v_result_revision, v_before, v_after);
  v_receipt := jsonb_build_object(
    'operationId', v_operation_id, 'sessionId', v_session_id, 'revision', v_result_revision,
    'completionClass', v_completion, 'setCount', v_set_count, 'totalVolumeLb', v_total_volume,
    'correctedAt', now(), 'replayed', false
  );
  INSERT INTO public.workout_correction_receipts (
    user_id, operation_id, workout_session_id, request_hash, base_revision, resulting_revision, receipt
  ) VALUES (v_user_id, v_operation_id, v_session_id, v_request_hash,
    v_expected_revision, v_result_revision, v_receipt);
  RETURN v_receipt;
END;
$$;

REVOKE ALL ON TABLE public.workout_correction_receipts, public.workout_correction_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workout_correction_receipts TO authenticated;
CREATE POLICY workout_correction_receipts_select_own ON public.workout_correction_receipts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON FUNCTION public.revise_program_exercise_occurrence_v1(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.correct_completed_workout_v1(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revise_program_exercise_occurrence_v1(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_completed_workout_v1(jsonb) TO authenticated;
