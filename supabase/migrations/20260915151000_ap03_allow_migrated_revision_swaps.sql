-- A migrated legacy program has a real persisted revision while retaining schema 1
-- and approximate historical provenance. Permit the existing immutable successor
-- command to use that lineage; all owner, catalog, slot, replay and conflict checks
-- remain unchanged. Never relabel a migration snapshot as an exact installation.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.revise_program_exercise_v2(jsonb)'::regprocedure);
  previous_guard text := 'IF NOT v_program.is_active OR v_program.lifecycle <> ''active'' OR v_program.schema_version < 2 THEN';
BEGIN
  IF strpos(definition, previous_guard) = 0 THEN
    RAISE EXCEPTION 'Unexpected revision function definition; review before applying';
  END IF;
  definition := replace(definition, previous_guard,
    'IF NOT v_program.is_active OR v_program.lifecycle <> ''active'' OR v_program.current_revision_id IS NULL THEN');
  definition := replace(definition, 'invalid_input: active schema-v2 program required',
    'invalid_input: active persisted program revision required');
  EXECUTE definition;
END;
$migration$;

-- A persisted legacy snapshot and its successors are command-owned just like a
-- new installation. Retain direct legacy policies only for unrevisioned rows.
ALTER POLICY programs_update_legacy ON public.programs
  USING (user_id = (SELECT auth.uid()) AND schema_version = 1 AND current_revision_id IS NULL)
  WITH CHECK (user_id = (SELECT auth.uid()) AND schema_version = 1 AND current_revision_id IS NULL);
ALTER POLICY programs_delete_legacy ON public.programs
  USING (user_id = (SELECT auth.uid()) AND schema_version = 1 AND current_revision_id IS NULL);

ALTER POLICY program_days_insert_legacy ON public.program_days
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_days.program_id
    AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1 AND p.current_revision_id IS NULL));
ALTER POLICY program_days_update_legacy ON public.program_days
  USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_days.program_id
    AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1 AND p.current_revision_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_days.program_id
    AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1 AND p.current_revision_id IS NULL));
ALTER POLICY program_days_delete_legacy ON public.program_days
  USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_days.program_id
    AND p.user_id = (SELECT auth.uid()) AND p.schema_version = 1 AND p.current_revision_id IS NULL));

ALTER POLICY program_day_exercises_insert_legacy ON public.program_day_exercises
  WITH CHECK (EXISTS (SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id AND p.user_id = (SELECT auth.uid())
      AND p.schema_version = 1 AND p.current_revision_id IS NULL));
ALTER POLICY program_day_exercises_update_legacy ON public.program_day_exercises
  USING (EXISTS (SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id AND p.user_id = (SELECT auth.uid())
      AND p.schema_version = 1 AND p.current_revision_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id AND p.user_id = (SELECT auth.uid())
      AND p.schema_version = 1 AND p.current_revision_id IS NULL));
ALTER POLICY program_day_exercises_delete_legacy ON public.program_day_exercises
  USING (EXISTS (SELECT 1 FROM public.program_days pd JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_day_exercises.program_day_id AND p.user_id = (SELECT auth.uid())
      AND p.schema_version = 1 AND p.current_revision_id IS NULL));
