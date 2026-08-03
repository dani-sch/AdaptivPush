-- FABLE-5 / Migration 015
-- Purpose: make every Phase 2 user-owned table usable by authenticated clients
-- while preserving strict per-user isolation and linked-record ownership.
-- Apply after migrations 008-014.

BEGIN;

ALTER TABLE public.user_adaptation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_display_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_generation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deload_recommendations ENABLE ROW LEVEL SECURITY;

-- Directly user-keyed preference and log tables.
DO $policies$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'user_adaptation_preferences',
    'evidence_display_preferences',
    'readiness_checkins',
    'cycle_symptom_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can select own ' || target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can insert own ' || target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update own ' || target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can delete own ' || target_table, target_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)',
      'Users can select own ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)',
      'Users can insert own ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)',
      'Users can update own ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id)',
      'Users can delete own ' || target_table,
      target_table
    );
  END LOOP;
END
$policies$;

-- A context row must belong to the signed-in user and to one of their programs.
DROP POLICY IF EXISTS "Users can select own program_generation_context" ON public.program_generation_context;
DROP POLICY IF EXISTS "Users can insert own program_generation_context" ON public.program_generation_context;
DROP POLICY IF EXISTS "Users can update own program_generation_context" ON public.program_generation_context;
DROP POLICY IF EXISTS "Users can delete own program_generation_context" ON public.program_generation_context;

CREATE POLICY "Users can select own program_generation_context"
  ON public.program_generation_context FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own program_generation_context"
  ON public.program_generation_context FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own program_generation_context"
  ON public.program_generation_context FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own program_generation_context"
  ON public.program_generation_context FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Deload recommendations may only reference a program owned by the same user.
DROP POLICY IF EXISTS "Users can select own deload_recommendations" ON public.deload_recommendations;
DROP POLICY IF EXISTS "Users can insert own deload_recommendations" ON public.deload_recommendations;
DROP POLICY IF EXISTS "Users can update own deload_recommendations" ON public.deload_recommendations;
DROP POLICY IF EXISTS "Users can delete own deload_recommendations" ON public.deload_recommendations;

CREATE POLICY "Users can select own deload_recommendations"
  ON public.deload_recommendations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own deload_recommendations"
  ON public.deload_recommendations FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own deload_recommendations"
  ON public.deload_recommendations FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own deload_recommendations"
  ON public.deload_recommendations FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Adaptation events may only link to records owned by the signed-in user.
DROP POLICY IF EXISTS "Users can select own adaptation_events" ON public.adaptation_events;
DROP POLICY IF EXISTS "Users can insert own adaptation_events" ON public.adaptation_events;
DROP POLICY IF EXISTS "Users can update own adaptation_events" ON public.adaptation_events;
DROP POLICY IF EXISTS "Users can delete own adaptation_events" ON public.adaptation_events;

CREATE POLICY "Users can select own adaptation_events"
  ON public.adaptation_events FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own adaptation_events"
  ON public.adaptation_events FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (program_id IS NULL OR EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id AND p.user_id = (SELECT auth.uid())
    ))
    AND (program_day_id IS NULL OR EXISTS (
      SELECT 1 FROM public.program_days pd
      JOIN public.programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_id AND p.user_id = (SELECT auth.uid())
    ))
    AND (workout_session_id IS NULL OR EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_id AND ws.user_id = (SELECT auth.uid())
    ))
    AND (readiness_checkin_id IS NULL OR EXISTS (
      SELECT 1 FROM public.readiness_checkins rc
      WHERE rc.id = readiness_checkin_id AND rc.user_id = (SELECT auth.uid())
    ))
    AND (cycle_symptom_log_id IS NULL OR EXISTS (
      SELECT 1 FROM public.cycle_symptom_logs csl
      WHERE csl.id = cycle_symptom_log_id AND csl.user_id = (SELECT auth.uid())
    ))
    AND (deload_recommendation_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deload_recommendations dr
      WHERE dr.id = deload_recommendation_id AND dr.user_id = (SELECT auth.uid())
    ))
  );

CREATE POLICY "Users can update own adaptation_events"
  ON public.adaptation_events FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (program_id IS NULL OR EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id AND p.user_id = (SELECT auth.uid())
    ))
    AND (program_day_id IS NULL OR EXISTS (
      SELECT 1 FROM public.program_days pd
      JOIN public.programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_id AND p.user_id = (SELECT auth.uid())
    ))
    AND (workout_session_id IS NULL OR EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_id AND ws.user_id = (SELECT auth.uid())
    ))
    AND (readiness_checkin_id IS NULL OR EXISTS (
      SELECT 1 FROM public.readiness_checkins rc
      WHERE rc.id = readiness_checkin_id AND rc.user_id = (SELECT auth.uid())
    ))
    AND (cycle_symptom_log_id IS NULL OR EXISTS (
      SELECT 1 FROM public.cycle_symptom_logs csl
      WHERE csl.id = cycle_symptom_log_id AND csl.user_id = (SELECT auth.uid())
    ))
    AND (deload_recommendation_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deload_recommendations dr
      WHERE dr.id = deload_recommendation_id AND dr.user_id = (SELECT auth.uid())
    ))
  );

CREATE POLICY "Users can delete own adaptation_events"
  ON public.adaptation_events FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

COMMIT;
