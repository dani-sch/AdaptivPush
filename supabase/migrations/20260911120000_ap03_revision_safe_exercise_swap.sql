-- AP-03 revision-safe future exercise replacement.
-- Creates an immutable successor revision; never updates accepted V2 prescriptions.

ALTER TABLE public.program_revisions
  ADD COLUMN parent_revision_id uuid REFERENCES public.program_revisions(id) ON DELETE RESTRICT;

ALTER TABLE public.program_revisions
  DROP CONSTRAINT program_revisions_provenance_check,
  ADD CONSTRAINT program_revisions_provenance_check
    CHECK (provenance IN ('installed', 'migration_snapshot', 'exercise_swap'));

ALTER TABLE public.program_days
  DROP CONSTRAINT program_days_program_id_week_number_day_index_key,
  ADD CONSTRAINT program_days_id_revision_key UNIQUE (id, program_revision_id);

CREATE UNIQUE INDEX program_days_revision_week_day_key
  ON public.program_days(program_revision_id, week_number, day_index)
  WHERE program_revision_id IS NOT NULL;

CREATE UNIQUE INDEX program_days_legacy_week_day_key
  ON public.program_days(program_id, week_number, day_index)
  WHERE program_revision_id IS NULL;

ALTER TABLE public.program_day_exercises
  ADD COLUMN replaces_exercise_id uuid REFERENCES public.exercises(id) ON DELETE RESTRICT,
  ADD COLUMN requires_recalibration boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT program_day_exercises_day_revision_fk
    FOREIGN KEY (program_day_id, program_revision_id)
    REFERENCES public.program_days(id, program_revision_id);

ALTER TABLE public.program_generation_context
  DROP CONSTRAINT program_generation_context_program_id_key,
  ADD CONSTRAINT program_generation_context_program_revision_fk
    FOREIGN KEY (program_id, program_revision_id)
    REFERENCES public.program_revisions(program_id, id);

CREATE UNIQUE INDEX program_generation_context_revision_key
  ON public.program_generation_context(program_revision_id)
  WHERE program_revision_id IS NOT NULL;

CREATE UNIQUE INDEX program_generation_context_legacy_program_key
  ON public.program_generation_context(program_id)
  WHERE program_revision_id IS NULL;

DROP POLICY "Users can insert own program_generation_context" ON public.program_generation_context;
DROP POLICY "Users can update own program_generation_context" ON public.program_generation_context;
DROP POLICY "Users can delete own program_generation_context" ON public.program_generation_context;

CREATE POLICY program_generation_context_insert_legacy ON public.program_generation_context
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND program_revision_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_generation_context.program_id
        AND p.user_id = (SELECT auth.uid())
        AND p.schema_version < 2
    )
  );

CREATE POLICY program_generation_context_update_legacy ON public.program_generation_context
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND program_revision_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_generation_context.program_id
        AND p.user_id = (SELECT auth.uid())
        AND p.schema_version < 2
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND program_revision_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_generation_context.program_id
        AND p.user_id = (SELECT auth.uid())
        AND p.schema_version < 2
    )
  );

CREATE POLICY program_generation_context_delete_legacy ON public.program_generation_context
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND program_revision_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_generation_context.program_id
        AND p.user_id = (SELECT auth.uid())
        AND p.schema_version < 2
    )
  );

CREATE TABLE public.program_revision_command_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  request_hash text NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  base_revision_id uuid NOT NULL REFERENCES public.program_revisions(id) ON DELETE RESTRICT,
  successor_revision_id uuid NOT NULL REFERENCES public.program_revisions(id) ON DELETE RESTRICT,
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_revision_command_receipts_owner_operation_key UNIQUE (user_id, operation_id)
);

ALTER TABLE public.program_revision_command_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_revision_command_receipts_select_own
  ON public.program_revision_command_receipts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE INDEX program_revision_command_receipts_program_idx
  ON public.program_revision_command_receipts(user_id, program_id, created_at DESC);

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

  IF v_original_exercise_id = v_replacement_exercise_id THEN
    RAISE EXCEPTION 'invalid_input: replacement must differ';
  END IF;

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
  WHERE program_id = v_program_id
    AND program_revision_id = v_expected_revision_id
    AND stable_day_id = v_current_stable_day_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_input: stable day not found in base revision'; END IF;

  SELECT pde.* INTO v_source_slot
  FROM public.program_day_exercises pde
  WHERE pde.program_day_id = v_source_day.id
    AND pde.program_revision_id = v_expected_revision_id
    AND pde.stable_slot_id = v_current_stable_slot_id;
  IF NOT FOUND OR v_source_slot.exercise_id <> v_original_exercise_id THEN
    RAISE EXCEPTION 'invalid_input: stable slot or original exercise mismatch';
  END IF;
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
      AND pde.exercise_id = v_original_exercise_id
      AND (pd.week_number, pd.order_in_week, pd.day_index) >=
          (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
      AND (v_include_current_day OR pd.stable_day_id <> v_current_stable_day_id)
      AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = pd.id)
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
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN v_replacement_exercise_id ELSE pde.exercise_id END,
      pde.position, pde.set_count, pde.rep_range_min, pde.rep_range_max, pde.target_rpe,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN NULL ELSE pde.suggested_weight_lb END,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN NULL ELSE pde.per_set_weights_lb END,
      pde.notes, pde.stable_slot_id, v_successor_revision_id,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN 'unknown' ELSE pde.load_kind END,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN 'none' ELSE pde.load_unit END,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN 'unknown' ELSE pde.load_side END,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN pde.exercise_id ELSE pde.replaces_exercise_id END,
      CASE WHEN pde.exercise_id = v_original_exercise_id
          AND (v_day.week_number, v_day.order_in_week, v_day.day_index) >=
              (v_source_day.week_number, v_source_day.order_in_week, v_source_day.day_index)
          AND (v_include_current_day OR v_day.stable_day_id <> v_current_stable_day_id)
          AND NOT EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.program_day_id = v_day.id)
        THEN true ELSE pde.requires_recalibration END
    FROM public.program_day_exercises pde
    WHERE pde.program_day_id = v_day.id AND pde.program_revision_id = v_expected_revision_id;

    SELECT count(*) INTO v_day_changed
    FROM public.program_day_exercises pde
    WHERE pde.program_day_id = v_new_day_id AND pde.replaces_exercise_id = v_original_exercise_id;
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

REVOKE ALL ON TABLE public.program_revision_command_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.program_revision_command_receipts TO authenticated;
REVOKE ALL ON FUNCTION public.revise_program_exercise_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revise_program_exercise_v2(jsonb) TO authenticated;
