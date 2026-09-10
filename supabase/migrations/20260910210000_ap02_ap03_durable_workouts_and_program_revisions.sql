-- AP-02/AP-03 durable workout finalization and atomic program installation.
-- Additive compatibility migration; historical rows retain explicit legacy provenance.

ALTER TABLE public.programs
  ADD COLUMN schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN current_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN current_revision_id uuid,
  ADD COLUMN lifecycle text NOT NULL DEFAULT 'active',
  ADD COLUMN source_origin text NOT NULL DEFAULT 'legacy',
  ADD COLUMN archive_checkpoint jsonb,
  ADD COLUMN archive_checkpoint_provenance text;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_schema_version_check CHECK (schema_version > 0),
  ADD CONSTRAINT programs_current_revision_check CHECK (current_revision > 0),
  ADD CONSTRAINT programs_lifecycle_check CHECK (lifecycle IN ('active', 'archived')),
  ADD CONSTRAINT programs_archive_checkpoint_provenance_check
    CHECK (archive_checkpoint_provenance IS NULL OR archive_checkpoint_provenance IN ('exact_revision', 'legacy_approximate'));

UPDATE public.programs
SET lifecycle = CASE WHEN is_active THEN 'active' ELSE 'archived' END,
    archive_checkpoint = CASE
      WHEN NOT is_active AND last_active_week IS NOT NULL
        THEN jsonb_build_object('kind', 'legacy_week', 'week', last_active_week)
      ELSE NULL
    END,
    archive_checkpoint_provenance = CASE
      WHEN NOT is_active AND last_active_week IS NOT NULL THEN 'legacy_approximate'
      ELSE NULL
    END;

CREATE TABLE public.program_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  schema_version integer NOT NULL,
  catalog_version text NOT NULL,
  policy_version text NOT NULL,
  source_origin text NOT NULL,
  snapshot jsonb NOT NULL,
  payload_hash text NOT NULL,
  provenance text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_revisions_revision_check CHECK (revision > 0),
  CONSTRAINT program_revisions_schema_version_check CHECK (schema_version > 0),
  CONSTRAINT program_revisions_provenance_check CHECK (provenance IN ('installed', 'migration_snapshot')),
  CONSTRAINT program_revisions_program_revision_key UNIQUE (program_id, revision),
  CONSTRAINT program_revisions_program_id_id_key UNIQUE (program_id, id)
);

ALTER TABLE public.program_revisions ENABLE ROW LEVEL SECURITY;

CREATE INDEX program_revisions_owner_program_idx
  ON public.program_revisions(user_id, program_id, revision DESC);

CREATE POLICY program_revisions_select_own ON public.program_revisions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

INSERT INTO public.program_revisions (
  user_id,
  program_id,
  revision,
  schema_version,
  catalog_version,
  policy_version,
  source_origin,
  snapshot,
  payload_hash,
  provenance
)
SELECT
  p.user_id,
  p.id,
  1,
  1,
  'catalog-unknown',
  'legacy-unknown',
  'migration_snapshot',
  jsonb_build_object(
    'program', jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'goal', p.goal,
      'durationWeeks', p.duration_weeks,
      'daysPerWeek', p.days_per_week,
      'startDate', p.start_date
    ),
    'days', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'dayId', pd.id,
          'weekNumber', pd.week_number,
          'dayIndex', pd.day_index,
          'orderInWeek', pd.order_in_week,
          'workoutName', pd.workout_name,
          'isRestDay', pd.is_rest_day,
          'isDeloadWeek', pd.is_deload_week,
          'exercises', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'legacyPrescriptionId', pde.id,
                'exerciseId', pde.exercise_id,
                'position', pde.position,
                'setCount', pde.set_count,
                'repRangeMin', pde.rep_range_min,
                'repRangeMax', pde.rep_range_max,
                'targetRpe', pde.target_rpe,
                'suggestedLoadLb', pde.suggested_weight_lb
              ) ORDER BY pde.position
            )
            FROM public.program_day_exercises pde
            WHERE pde.program_day_id = pd.id
          ), '[]'::jsonb)
        ) ORDER BY pd.week_number, pd.order_in_week
      )
      FROM public.program_days pd
      WHERE pd.program_id = p.id
    ), '[]'::jsonb),
    'provenance', 'migration_snapshot',
    'historicalCompleteness', 'unknown'
  ),
  encode(extensions.digest(convert_to(p.id::text || ':migration_snapshot', 'UTF8'), 'sha256'), 'hex'),
  'migration_snapshot'
FROM public.programs p;

UPDATE public.programs p
SET current_revision_id = pr.id
FROM public.program_revisions pr
WHERE pr.program_id = p.id AND pr.revision = 1;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_current_revision_fk
  FOREIGN KEY (id, current_revision_id)
  REFERENCES public.program_revisions(program_id, id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.program_days
  ADD COLUMN stable_day_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN program_revision_id uuid;

UPDATE public.program_days pd
SET program_revision_id = p.current_revision_id
FROM public.programs p
WHERE p.id = pd.program_id;

ALTER TABLE public.program_days
  ADD CONSTRAINT program_days_revision_lineage_fk
  FOREIGN KEY (program_id, program_revision_id)
  REFERENCES public.program_revisions(program_id, id),
  ADD CONSTRAINT program_days_program_revision_stable_key UNIQUE (program_revision_id, stable_day_id);

ALTER TABLE public.program_day_exercises
  ADD COLUMN stable_slot_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN program_revision_id uuid,
  ADD COLUMN load_kind text NOT NULL DEFAULT 'external',
  ADD COLUMN load_unit text NOT NULL DEFAULT 'lb',
  ADD COLUMN load_side text NOT NULL DEFAULT 'external_total';

UPDATE public.program_day_exercises pde
SET program_revision_id = pd.program_revision_id
FROM public.program_days pd
WHERE pd.id = pde.program_day_id;

ALTER TABLE public.program_day_exercises
  ADD CONSTRAINT program_day_exercises_revision_fk
  FOREIGN KEY (program_revision_id) REFERENCES public.program_revisions(id),
  ADD CONSTRAINT program_day_exercises_load_kind_check
    CHECK (load_kind IN ('external', 'bodyweight', 'assistance', 'unknown')),
  ADD CONSTRAINT program_day_exercises_load_unit_check CHECK (load_unit IN ('lb', 'kg', 'none')),
  ADD CONSTRAINT program_day_exercises_load_side_check
    CHECK (load_side IN ('external_total', 'per_hand', 'combined', 'unilateral', 'unknown')),
  ADD CONSTRAINT program_day_exercises_revision_slot_key UNIQUE (program_revision_id, stable_slot_id);

ALTER TABLE public.program_generation_context
  ADD COLUMN program_revision_id uuid;

UPDATE public.program_generation_context pgc
SET program_revision_id = p.current_revision_id
FROM public.programs p
WHERE p.id = pgc.program_id;

ALTER TABLE public.program_generation_context
  ADD CONSTRAINT program_generation_context_revision_fk
  FOREIGN KEY (program_revision_id) REFERENCES public.program_revisions(id);

CREATE TABLE public.program_installation_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  payload_hash text NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  program_revision_id uuid NOT NULL REFERENCES public.program_revisions(id) ON DELETE RESTRICT,
  replaced_program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_installation_receipts_owner_operation_key UNIQUE (user_id, operation_id)
);

ALTER TABLE public.program_installation_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_installation_receipts_select_own ON public.program_installation_receipts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE INDEX program_installation_receipts_program_idx
  ON public.program_installation_receipts(user_id, program_id);

CREATE TABLE public.program_lifecycle_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  payload_hash text NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('archive', 'restore_exact', 'restart', 'restore_legacy_approximate')),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_lifecycle_receipts_owner_operation_key UNIQUE (user_id, operation_id)
);

ALTER TABLE public.program_lifecycle_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_lifecycle_receipts_select_own ON public.program_lifecycle_receipts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE UNIQUE INDEX programs_one_active_per_owner_idx
  ON public.programs(user_id) WHERE is_active;

ALTER TABLE public.workout_sessions
  ADD COLUMN operation_id uuid,
  ADD COLUMN draft_id uuid,
  ADD COLUMN schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN revision integer NOT NULL DEFAULT 1,
  ADD COLUMN lifecycle text NOT NULL DEFAULT 'finalized',
  ADD COLUMN completion_class text NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN payload_hash text,
  ADD COLUMN program_revision_id uuid,
  ADD COLUMN prescription_snapshot jsonb,
  ADD COLUMN source_timezone text,
  ADD COLUMN finalized_at timestamptz,
  ADD COLUMN receipt jsonb;

UPDATE public.workout_sessions
SET lifecycle = 'finalized',
    completion_class = 'legacy_unknown',
    finalized_at = COALESCE(ended_at, created_at);

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_schema_version_check CHECK (schema_version > 0),
  ADD CONSTRAINT workout_sessions_revision_check CHECK (revision > 0),
  ADD CONSTRAINT workout_sessions_lifecycle_check CHECK (lifecycle IN ('finalized')),
  ADD CONSTRAINT workout_sessions_completion_class_check
    CHECK (completion_class IN ('complete', 'reduced', 'partial', 'abandoned', 'legacy_unknown')),
  ADD CONSTRAINT workout_sessions_program_revision_fk
    FOREIGN KEY (program_revision_id) REFERENCES public.program_revisions(id);

CREATE UNIQUE INDEX workout_sessions_owner_operation_idx
  ON public.workout_sessions(user_id, operation_id) WHERE operation_id IS NOT NULL;

CREATE TABLE public.workout_receipt_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  effect_type text NOT NULL CHECK (effect_type IN ('personal_record_projection', 'progression_projection', 'analytics_projection')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed_retryable')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_receipt_effects_session_type_key UNIQUE (workout_session_id, effect_type)
);

ALTER TABLE public.workout_receipt_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_receipt_effects_select_own ON public.workout_receipt_effects
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE INDEX workout_receipt_effects_pending_idx
  ON public.workout_receipt_effects(status, created_at) WHERE status IN ('pending', 'failed_retryable');

ALTER TABLE public.workout_exercise_sets
  DROP CONSTRAINT workout_exercise_sets_session_id_exercise_id_set_number_key,
  ADD COLUMN actual_set_id uuid,
  ADD COLUMN prescription_slot_id uuid,
  ADD COLUMN prescribed_exercise_id uuid,
  ADD COLUMN order_index integer,
  ADD COLUMN load_value numeric(10,3),
  ADD COLUMN load_unit text,
  ADD COLUMN load_kind text,
  ADD COLUMN load_side text,
  ADD COLUMN logged_at timestamptz;

UPDATE public.workout_exercise_sets
SET actual_set_id = id,
    prescribed_exercise_id = exercise_id,
    order_index = set_number,
    load_value = weight_lb,
    load_unit = 'lb',
    load_kind = CASE WHEN weight_lb = 0 THEN 'unknown' ELSE 'external' END,
    load_side = 'external_total',
    logged_at = created_at;

ALTER TABLE public.workout_exercise_sets
  ALTER COLUMN actual_set_id SET NOT NULL,
  ALTER COLUMN order_index SET NOT NULL,
  ALTER COLUMN load_unit SET NOT NULL,
  ALTER COLUMN load_kind SET NOT NULL,
  ALTER COLUMN load_side SET NOT NULL,
  ALTER COLUMN logged_at SET NOT NULL,
  ADD CONSTRAINT workout_exercise_sets_order_index_check CHECK (order_index > 0),
  ADD CONSTRAINT workout_exercise_sets_load_value_check CHECK (load_value IS NULL OR load_value >= 0),
  ADD CONSTRAINT workout_exercise_sets_load_unit_check CHECK (load_unit IN ('lb', 'kg', 'none')),
  ADD CONSTRAINT workout_exercise_sets_load_kind_check
    CHECK (load_kind IN ('external', 'bodyweight', 'assistance', 'unknown')),
  ADD CONSTRAINT workout_exercise_sets_load_side_check
    CHECK (load_side IN ('external_total', 'per_hand', 'combined', 'unilateral', 'unknown')),
  ADD CONSTRAINT workout_exercise_sets_session_actual_set_key UNIQUE (session_id, actual_set_id);

CREATE OR REPLACE FUNCTION public.install_program_v2(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_operation_id uuid;
  v_hash text;
  v_existing public.program_installation_receipts%ROWTYPE;
  v_artifact jsonb;
  v_active public.programs%ROWTYPE;
  v_expected_active_id uuid;
  v_expected_revision integer;
  v_program_id uuid := gen_random_uuid();
  v_revision_id uuid := gen_random_uuid();
  v_day jsonb;
  v_exercise jsonb;
  v_day_id uuid;
  v_context jsonb;
  v_name text;
  v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_operation_id := (p_payload->>'operationId')::uuid;
  v_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');

  SELECT * INTO v_existing
  FROM public.program_installation_receipts
  WHERE user_id = v_user_id AND operation_id = v_operation_id;
  IF FOUND THEN
    IF v_existing.payload_hash <> v_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  SELECT * INTO v_active FROM public.programs
  WHERE user_id = v_user_id AND is_active FOR UPDATE;

  v_expected_active_id := NULLIF(p_payload->>'expectedActiveProgramId', '')::uuid;
  v_expected_revision := NULLIF(p_payload->>'expectedActiveRevision', '')::integer;
  IF p_payload ? 'expectedActiveProgramId' AND v_expected_active_id IS DISTINCT FROM v_active.id THEN
    RAISE EXCEPTION 'stale_revision: active program changed';
  END IF;
  IF v_expected_revision IS NOT NULL AND v_expected_revision IS DISTINCT FROM v_active.current_revision THEN
    RAISE EXCEPTION 'stale_revision: active revision changed';
  END IF;

  v_artifact := p_payload->'artifact';
  IF jsonb_typeof(v_artifact) <> 'object' THEN RAISE EXCEPTION 'invalid_input: artifact required'; END IF;
  IF COALESCE((v_artifact->>'schemaVersion')::integer, 0) <> 2 THEN RAISE EXCEPTION 'unsupported_schema'; END IF;
  IF COALESCE((v_artifact->>'durationWeeks')::integer, 0) NOT BETWEEN 1 AND 52 THEN RAISE EXCEPTION 'invalid_input: duration'; END IF;
  IF COALESCE((v_artifact->>'daysPerWeek')::integer, 0) NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'invalid_input: days per week'; END IF;
  IF jsonb_typeof(v_artifact->'days') <> 'array' OR jsonb_array_length(v_artifact->'days') = 0 THEN
    RAISE EXCEPTION 'invalid_input: complete days required';
  END IF;
  v_name := COALESCE(NULLIF(btrim(v_artifact->>'name'), ''), 'My Training Program');

  FOR v_day IN SELECT value FROM jsonb_array_elements(v_artifact->'days') LOOP
    IF COALESCE((v_day->>'weekNumber')::integer, 0) NOT BETWEEN 1 AND (v_artifact->>'durationWeeks')::integer
       OR COALESCE((v_day->>'dayIndex')::integer, 0) NOT BETWEEN 1 AND 7
       OR NULLIF(v_day->>'dayId', '') IS NULL THEN
      RAISE EXCEPTION 'invalid_input: invalid program day';
    END IF;
    IF COALESCE((v_day->>'isRestDay')::boolean, false) = false
       AND (jsonb_typeof(v_day->'exercises') <> 'array' OR jsonb_array_length(v_day->'exercises') = 0) THEN
      RAISE EXCEPTION 'invalid_input: workout day is not trainable';
    END IF;
    FOR v_exercise IN SELECT value FROM jsonb_array_elements(COALESCE(v_day->'exercises', '[]'::jsonb)) LOOP
      IF NULLIF(v_exercise->>'slotId', '') IS NULL OR NULLIF(v_exercise->>'exerciseId', '') IS NULL THEN
        RAISE EXCEPTION 'invalid_input: stable slot and catalog exercise required';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = (v_exercise->>'exerciseId')::uuid) THEN
        RAISE EXCEPTION 'invalid_input: unknown catalog exercise';
      END IF;
      IF COALESCE((v_exercise->>'setCount')::integer, 0) < 1
         OR COALESCE((v_exercise->>'repRangeMin')::integer, 0) < 1
         OR COALESCE((v_exercise->>'repRangeMax')::integer, 0) < COALESCE((v_exercise->>'repRangeMin')::integer, 0) THEN
        RAISE EXCEPTION 'invalid_input: invalid prescription';
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO public.programs (
    id, user_id, name, goal, duration_weeks, days_per_week, start_date, is_active,
    swap_interval_weeks, schema_version, current_revision, current_revision_id,
    lifecycle, source_origin
  ) VALUES (
    v_program_id, v_user_id, v_name, NULLIF(v_artifact->>'goal', ''),
    (v_artifact->>'durationWeeks')::integer, (v_artifact->>'daysPerWeek')::integer,
    current_date, false, COALESCE((v_artifact->>'swapIntervalWeeks')::integer, 4),
    2, 1, NULL, 'active', COALESCE(NULLIF(v_artifact->>'source', ''), 'manual')
  );

  INSERT INTO public.program_revisions (
    id, user_id, program_id, revision, schema_version, catalog_version, policy_version,
    source_origin, snapshot, payload_hash, provenance
  ) VALUES (
    v_revision_id, v_user_id, v_program_id, 1, 2,
    v_artifact->>'catalogVersion', v_artifact->>'policyVersion',
    COALESCE(NULLIF(v_artifact->>'source', ''), 'manual'), v_artifact, v_hash, 'installed'
  );
  UPDATE public.programs SET current_revision_id = v_revision_id WHERE id = v_program_id;

  FOR v_day IN SELECT value FROM jsonb_array_elements(v_artifact->'days') LOOP
    v_day_id := gen_random_uuid();
    INSERT INTO public.program_days (
      id, program_id, week_number, day_index, order_in_week, workout_name,
      estimated_duration_min, is_rest_day, is_deload_week, stable_day_id, program_revision_id
    ) VALUES (
      v_day_id, v_program_id, (v_day->>'weekNumber')::integer, (v_day->>'dayIndex')::integer,
      (v_day->>'orderInWeek')::integer,
      COALESCE(NULLIF(btrim(v_day->>'workoutName'), ''), 'Workout'),
      NULLIF(v_day->>'estimatedDurationMin', '')::integer,
      COALESCE((v_day->>'isRestDay')::boolean, false),
      COALESCE((v_day->>'isDeloadWeek')::boolean, false),
      (v_day->>'dayId')::uuid, v_revision_id
    );
    FOR v_exercise IN SELECT value FROM jsonb_array_elements(COALESCE(v_day->'exercises', '[]'::jsonb)) LOOP
      INSERT INTO public.program_day_exercises (
        program_day_id, exercise_id, position, set_count, rep_range_min, rep_range_max,
        target_rpe, suggested_weight_lb, notes, stable_slot_id, program_revision_id,
        load_kind, load_unit, load_side
      ) VALUES (
        v_day_id, (v_exercise->>'exerciseId')::uuid, (v_exercise->>'position')::integer,
        (v_exercise->>'setCount')::integer, (v_exercise->>'repRangeMin')::integer,
        (v_exercise->>'repRangeMax')::integer, NULLIF(v_exercise->>'targetRpe', '')::numeric,
        NULLIF(v_exercise->>'suggestedLoad', '')::numeric, NULLIF(v_exercise->>'notes', ''),
        (v_exercise->>'slotId')::uuid, v_revision_id,
        COALESCE(NULLIF(v_exercise->>'loadKind', ''), 'unknown'),
        COALESCE(NULLIF(v_exercise->>'loadUnit', ''), 'none'),
        COALESCE(NULLIF(v_exercise->>'loadSide', ''), 'unknown')
      );
    END LOOP;
  END LOOP;

  v_context := v_artifact->'context';
  IF jsonb_typeof(v_context) = 'object' THEN
    INSERT INTO public.program_generation_context (
      program_id, user_id, policy_version, evidence_version, depth_mode, experience_level,
      goal, days_per_week, duration_weeks, session_length_target_min, focus_muscle_groups,
      split_recommendation, volume_targets, readiness_strategy, cycle_strategy,
      warmup_strategy, explanation_density, input_snapshot, output_summary, program_revision_id
    ) VALUES (
      v_program_id, v_user_id, COALESCE(v_context->>'policy_version', v_artifact->>'policyVersion'),
      COALESCE(v_context->>'evidence_version', 'unknown'), COALESCE(v_context->>'depth_mode', 'guided'),
      COALESCE(v_context->>'experience_level', 'unknown'), COALESCE(v_context->>'goal', v_artifact->>'goal'),
      (v_artifact->>'daysPerWeek')::integer, (v_artifact->>'durationWeeks')::integer,
      NULLIF(v_context->>'session_length_target_min', '')::integer,
      COALESCE(v_context->'focus_muscle_groups', '[]'::jsonb),
      COALESCE(v_context->'split_recommendation', '{}'::jsonb),
      COALESCE(v_context->'volume_targets', '{}'::jsonb),
      COALESCE(v_context->>'readiness_strategy', 'unknown'), COALESCE(v_context->>'cycle_strategy', 'unknown'),
      COALESCE(v_context->>'warmup_strategy', 'unknown'), COALESCE(v_context->>'explanation_density', 'guided'),
      COALESCE(v_context->'input_snapshot', '{}'::jsonb), COALESCE(v_context->'output_summary', '{}'::jsonb),
      v_revision_id
    );
  END IF;

  IF v_active.id IS NOT NULL THEN
    UPDATE public.programs
    SET is_active = false, lifecycle = 'archived', updated_at = now(),
        archive_checkpoint = jsonb_build_object('kind', 'revision', 'revision', current_revision),
        archive_checkpoint_provenance = 'exact_revision'
    WHERE id = v_active.id;
  END IF;
  UPDATE public.programs SET is_active = true, updated_at = now() WHERE id = v_program_id;

  v_receipt := jsonb_build_object(
    'operationId', v_operation_id, 'programId', v_program_id, 'revisionId', v_revision_id,
    'revision', 1, 'installedAt', now(), 'replacedProgramId', v_active.id, 'replayed', false
  );
  INSERT INTO public.program_installation_receipts (
    user_id, operation_id, payload_hash, program_id, program_revision_id, replaced_program_id, receipt
  ) VALUES (v_user_id, v_operation_id, v_hash, v_program_id, v_revision_id, v_active.id, v_receipt);
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
  v_hash := encode(digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');

  SELECT * INTO v_existing FROM public.workout_sessions
  WHERE user_id = v_user_id AND operation_id = v_operation_id;
  IF FOUND THEN
    IF v_existing.payload_hash <> v_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_operation_id::text, 0));
  SELECT * INTO v_program_day FROM public.program_days
  WHERE id = (p_payload->>'programDayId')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_unavailable'; END IF;
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

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_payload->'slots') LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.program_day_exercises pde
      WHERE pde.program_day_id = v_program_day.id
        AND pde.program_revision_id = v_revision.id
        AND pde.stable_slot_id = (v_slot->>'slotId')::uuid
        AND pde.exercise_id = (v_slot->>'prescribedExerciseId')::uuid
    ) THEN RAISE EXCEPTION 'invalid_input: prescription lineage'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = (v_slot->>'actualExerciseId')::uuid) THEN
      RAISE EXCEPTION 'invalid_input: actual exercise';
    END IF;
    v_planned_count := v_planned_count + COALESCE((v_slot->>'prescribedSetCount')::integer, 0);
    v_recalibration := v_recalibration OR COALESCE((v_slot->>'requiresRecalibration')::boolean, false);
    IF jsonb_typeof(v_slot->'sets') <> 'array' THEN RAISE EXCEPTION 'invalid_input: set array'; END IF;
    FOR v_set IN SELECT value FROM jsonb_array_elements(v_slot->'sets') LOOP
      IF COALESCE((v_set->>'logged')::boolean, false) THEN
        IF NULLIF(v_set->>'setId', '') IS NULL
           OR COALESCE((v_set->>'actualReps')::integer, 0) <= 0
           OR COALESCE((v_set->>'order')::integer, 0) <= 0
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
        IF (v_set->>'actualExerciseId')::uuid NOT IN (
          (v_slot->>'prescribedExerciseId')::uuid, (v_slot->>'actualExerciseId')::uuid
        ) THEN RAISE EXCEPTION 'invalid_input: set exercise identity'; END IF;
        v_logged_count := v_logged_count + 1;
        v_total_volume := v_total_volume + COALESCE((v_set->>'actualLoad')::numeric, 0) * (v_set->>'actualReps')::integer;
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
    v_completion, v_hash, v_revision.id, p_payload->'frozenPrescription',
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
          (v_set->>'actualReps')::integer, COALESCE((v_set->>'actualLoad')::numeric, 0),
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

CREATE OR REPLACE FUNCTION public.archive_program_v2(
  p_operation_id uuid,
  p_program_id uuid,
  p_expected_revision integer,
  p_checkpoint jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program public.programs%ROWTYPE;
  v_hash text;
  v_existing public.program_lifecycle_receipts%ROWTYPE;
  v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_hash := encode(digest(convert_to(concat_ws(':', p_program_id, p_expected_revision, p_checkpoint::text), 'UTF8'), 'sha256'), 'hex');
  SELECT * INTO v_existing FROM public.program_lifecycle_receipts
  WHERE user_id = v_user_id AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.payload_hash <> v_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  SELECT * INTO v_program FROM public.programs
  WHERE id = p_program_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_unavailable'; END IF;
  IF v_program.current_revision <> p_expected_revision THEN RAISE EXCEPTION 'stale_revision'; END IF;
  UPDATE public.programs SET
    is_active = false, lifecycle = 'archived', last_active_week = NULL,
    archive_checkpoint = jsonb_build_object(
      'kind', 'revision_checkpoint', 'revision', current_revision,
      'week', NULLIF(p_checkpoint->>'week', '')::integer,
      'archivedAt', now()
    ),
    archive_checkpoint_provenance = 'exact_revision', updated_at = now()
  WHERE id = p_program_id;
  v_receipt := jsonb_build_object('operationId', p_operation_id, 'programId', p_program_id,
    'action', 'archive', 'revision', p_expected_revision, 'replayed', false, 'completedAt', now());
  INSERT INTO public.program_lifecycle_receipts(user_id, operation_id, payload_hash, program_id, action, receipt)
  VALUES (v_user_id, p_operation_id, v_hash, p_program_id, 'archive', v_receipt);
  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_program_v2(
  p_operation_id uuid,
  p_program_id uuid,
  p_mode text,
  p_expected_active_program_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program public.programs%ROWTYPE;
  v_active public.programs%ROWTYPE;
  v_hash text;
  v_action text;
  v_existing public.program_lifecycle_receipts%ROWTYPE;
  v_receipt jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_mode NOT IN ('exact', 'restart', 'legacy_approximate') THEN RAISE EXCEPTION 'invalid_input: restore mode'; END IF;
  v_hash := encode(digest(convert_to(concat_ws(':', p_program_id, p_mode, p_expected_active_program_id), 'UTF8'), 'sha256'), 'hex');
  SELECT * INTO v_existing FROM public.program_lifecycle_receipts
  WHERE user_id = v_user_id AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.payload_hash <> v_hash THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
    RETURN jsonb_set(v_existing.receipt, '{replayed}', 'true'::jsonb, true);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_unavailable'; END IF;
  SELECT * INTO v_active FROM public.programs WHERE user_id = v_user_id AND is_active FOR UPDATE;
  IF p_expected_active_program_id IS DISTINCT FROM v_active.id THEN RAISE EXCEPTION 'stale_revision: active program changed'; END IF;
  IF p_mode = 'exact' AND v_program.archive_checkpoint_provenance IS DISTINCT FROM 'exact_revision' THEN
    RAISE EXCEPTION 'exact_checkpoint_unavailable';
  END IF;
  IF p_mode = 'legacy_approximate' AND v_program.archive_checkpoint_provenance IS DISTINCT FROM 'legacy_approximate' THEN
    RAISE EXCEPTION 'legacy_checkpoint_unavailable';
  END IF;
  IF v_active.id IS NOT NULL AND v_active.id <> p_program_id THEN
    UPDATE public.programs SET is_active = false, lifecycle = 'archived', updated_at = now(),
      archive_checkpoint = jsonb_build_object('kind', 'revision', 'revision', current_revision, 'archivedAt', now()),
      archive_checkpoint_provenance = 'exact_revision'
    WHERE id = v_active.id;
  END IF;
  UPDATE public.programs SET
    is_active = true, lifecycle = 'active',
    start_date = CASE WHEN p_mode = 'restart' THEN current_date ELSE start_date END,
    archive_checkpoint = CASE WHEN p_mode = 'restart' THEN NULL ELSE archive_checkpoint END,
    archive_checkpoint_provenance = CASE WHEN p_mode = 'restart' THEN NULL ELSE archive_checkpoint_provenance END,
    last_active_week = NULL, updated_at = now()
  WHERE id = p_program_id;
  v_action := CASE p_mode WHEN 'exact' THEN 'restore_exact' WHEN 'restart' THEN 'restart' ELSE 'restore_legacy_approximate' END;
  v_receipt := jsonb_build_object('operationId', p_operation_id, 'programId', p_program_id,
    'action', v_action, 'revision', v_program.current_revision, 'replayed', false,
    'placementPrecision', CASE WHEN p_mode = 'legacy_approximate' THEN 'approximate' ELSE 'exact' END,
    'completedAt', now());
  INSERT INTO public.program_lifecycle_receipts(user_id, operation_id, payload_hash, program_id, action, receipt)
  VALUES (v_user_id, p_operation_id, v_hash, p_program_id, v_action, v_receipt);
  RETURN v_receipt;
END;
$$;

-- V2 writes are command-owned. Existing V1 clients retain their legacy policies.
DROP POLICY workout_sessions_insert ON public.workout_sessions;
DROP POLICY workout_sessions_update ON public.workout_sessions;
DROP POLICY workout_sessions_delete ON public.workout_sessions;
CREATE POLICY workout_sessions_insert_legacy ON public.workout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND schema_version = 1 AND operation_id IS NULL);
CREATE POLICY workout_sessions_update_legacy ON public.workout_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND schema_version = 1)
  WITH CHECK (user_id = (SELECT auth.uid()) AND schema_version = 1);
CREATE POLICY workout_sessions_delete_legacy ON public.workout_sessions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND schema_version = 1);

DROP POLICY workout_sets_insert ON public.workout_exercise_sets;
DROP POLICY workout_sets_update ON public.workout_exercise_sets;
DROP POLICY workout_sets_delete ON public.workout_exercise_sets;
CREATE POLICY workout_sets_insert_legacy ON public.workout_exercise_sets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_exercise_sets.session_id
      AND s.user_id = (SELECT auth.uid()) AND s.schema_version = 1
  ));
CREATE POLICY workout_sets_update_legacy ON public.workout_exercise_sets
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_exercise_sets.session_id
      AND s.user_id = (SELECT auth.uid()) AND s.schema_version = 1
  ));
CREATE POLICY workout_sets_delete_legacy ON public.workout_exercise_sets
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_exercise_sets.session_id
      AND s.user_id = (SELECT auth.uid()) AND s.schema_version = 1
  ));

-- Installed V2 program hierarchies are command-owned and immutable to ordinary clients.
DROP POLICY programs_insert ON public.programs;
DROP POLICY programs_update ON public.programs;
DROP POLICY programs_delete ON public.programs;
CREATE POLICY programs_insert_legacy ON public.programs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND schema_version = 1);
CREATE POLICY programs_update_legacy ON public.programs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND schema_version = 1)
  WITH CHECK (user_id = (SELECT auth.uid()) AND schema_version = 1);
CREATE POLICY programs_delete_legacy ON public.programs
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND schema_version = 1);

DROP POLICY program_days_insert ON public.program_days;
DROP POLICY program_days_update ON public.program_days;
DROP POLICY program_days_delete ON public.program_days;
CREATE POLICY program_days_insert_legacy ON public.program_days
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_days.program_id AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1
  ));
CREATE POLICY program_days_update_legacy ON public.program_days
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_days.program_id AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1
  ));
CREATE POLICY program_days_delete_legacy ON public.program_days
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_days.program_id AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1
  ));

DROP POLICY program_day_exercises_insert ON public.program_day_exercises;
DROP POLICY program_day_exercises_update ON public.program_day_exercises;
DROP POLICY program_day_exercises_delete ON public.program_day_exercises;
CREATE POLICY program_day_exercises_insert_legacy ON public.program_day_exercises
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id
      AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1
  ));
CREATE POLICY program_day_exercises_update_legacy ON public.program_day_exercises
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id
      AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1
  ));
CREATE POLICY program_day_exercises_delete_legacy ON public.program_day_exercises
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id
      AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1
  ));

REVOKE ALL ON TABLE public.program_revisions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.program_installation_receipts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.program_lifecycle_receipts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.workout_receipt_effects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.program_revisions TO authenticated;
GRANT SELECT ON TABLE public.program_installation_receipts TO authenticated;
GRANT SELECT ON TABLE public.program_lifecycle_receipts TO authenticated;
GRANT SELECT ON TABLE public.workout_receipt_effects TO authenticated;

REVOKE ALL ON FUNCTION public.install_program_v2(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_workout_v2(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_program_v2(uuid, uuid, integer, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_program_v2(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.install_program_v2(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_workout_v2(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_program_v2(uuid, uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_program_v2(uuid, uuid, text, uuid) TO authenticated;
