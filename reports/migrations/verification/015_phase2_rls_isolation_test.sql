-- Re-runnable, non-persistent proof for migration 015.
-- Requires at least two auth users who each own a program.
-- Every inserted row is rolled back.

BEGIN;

SELECT set_config(
  'adaptivpush.test_user_1',
  (SELECT user_id::text FROM public.programs GROUP BY user_id ORDER BY user_id LIMIT 1),
  true
);
SELECT set_config(
  'adaptivpush.test_user_2',
  (SELECT user_id::text FROM public.programs GROUP BY user_id ORDER BY user_id OFFSET 1 LIMIT 1),
  true
);
SELECT set_config(
  'adaptivpush.test_program_1',
  (SELECT id::text FROM public.programs WHERE user_id = current_setting('adaptivpush.test_user_1')::uuid ORDER BY id LIMIT 1),
  true
);
SELECT set_config(
  'adaptivpush.test_program_2',
  (SELECT id::text FROM public.programs WHERE user_id = current_setting('adaptivpush.test_user_2')::uuid ORDER BY id LIMIT 1),
  true
);

-- Seed one row per table for user 2 as postgres. User 1 must not see these.
INSERT INTO public.user_adaptation_preferences (user_id)
VALUES (current_setting('adaptivpush.test_user_2')::uuid);
INSERT INTO public.evidence_display_preferences (user_id)
VALUES (current_setting('adaptivpush.test_user_2')::uuid);
INSERT INTO public.readiness_checkins (user_id, checkin_date, checkin_mode)
VALUES (current_setting('adaptivpush.test_user_2')::uuid, DATE '1900-01-01', 'one_tap');
INSERT INTO public.cycle_symptom_logs (user_id, log_date)
VALUES (current_setting('adaptivpush.test_user_2')::uuid, DATE '1900-01-01');
INSERT INTO public.program_generation_context (
  program_id, user_id, policy_version, evidence_version, depth_mode,
  experience_level, goal, days_per_week, duration_weeks,
  focus_muscle_groups, split_recommendation, volume_targets,
  readiness_strategy, cycle_strategy, warmup_strategy,
  explanation_density, input_snapshot, output_summary
)
VALUES (
  current_setting('adaptivpush.test_program_2')::uuid,
  current_setting('adaptivpush.test_user_2')::uuid,
  'rls-test', 'rls-test', 'essential', 'beginner', 'strength', 3, 4,
  '[]', '{}', '{}', 'manual', 'disabled', 'standard',
  'essential', '{}', '{}'
);
INSERT INTO public.deload_recommendations (
  user_id, program_id, status, trigger_type, reason_summary, evidence_keys
)
VALUES (
  current_setting('adaptivpush.test_user_2')::uuid,
  current_setting('adaptivpush.test_program_2')::uuid,
  'recommended', 'rls_test', 'Rolled-back RLS test', '[]'
);
INSERT INTO public.adaptation_events (
  user_id, event_type, trigger_source, explanation_payload, evidence_keys
)
VALUES (
  current_setting('adaptivpush.test_user_2')::uuid,
  'rls_test', 'verification', '{}', '[]'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  current_setting('adaptivpush.test_user_1'),
  true
);

-- User 1 can create one valid owned row in every Phase 2 table.
INSERT INTO public.user_adaptation_preferences (user_id)
VALUES (current_setting('adaptivpush.test_user_1')::uuid);
INSERT INTO public.evidence_display_preferences (user_id)
VALUES (current_setting('adaptivpush.test_user_1')::uuid);
INSERT INTO public.readiness_checkins (user_id, checkin_date, checkin_mode)
VALUES (current_setting('adaptivpush.test_user_1')::uuid, DATE '1900-01-01', 'one_tap');
INSERT INTO public.cycle_symptom_logs (user_id, log_date)
VALUES (current_setting('adaptivpush.test_user_1')::uuid, DATE '1900-01-01');
INSERT INTO public.program_generation_context (
  program_id, user_id, policy_version, evidence_version, depth_mode,
  experience_level, goal, days_per_week, duration_weeks,
  focus_muscle_groups, split_recommendation, volume_targets,
  readiness_strategy, cycle_strategy, warmup_strategy,
  explanation_density, input_snapshot, output_summary
)
VALUES (
  current_setting('adaptivpush.test_program_1')::uuid,
  current_setting('adaptivpush.test_user_1')::uuid,
  'rls-test', 'rls-test', 'essential', 'beginner', 'strength', 3, 4,
  '[]', '{}', '{}', 'manual', 'disabled', 'standard',
  'essential', '{}', '{}'
);
INSERT INTO public.deload_recommendations (
  user_id, program_id, status, trigger_type, reason_summary, evidence_keys
)
VALUES (
  current_setting('adaptivpush.test_user_1')::uuid,
  current_setting('adaptivpush.test_program_1')::uuid,
  'recommended', 'rls_test', 'Rolled-back RLS test', '[]'
);
INSERT INTO public.adaptation_events (
  user_id, event_type, trigger_source, explanation_payload, evidence_keys
)
VALUES (
  current_setting('adaptivpush.test_user_1')::uuid,
  'rls_test', 'verification', '{}', '[]'
);

DO $assertions$
DECLARE
  target_table text;
  visible_count integer;
  affected_count integer;
  denied boolean;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'user_adaptation_preferences',
    'evidence_display_preferences',
    'readiness_checkins',
    'cycle_symptom_logs',
    'program_generation_context',
    'adaptation_events',
    'deload_recommendations'
  ]
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', target_table)
      INTO visible_count;
    IF visible_count <> 1 THEN
      RAISE EXCEPTION 'RLS visibility failed for %: expected 1 owned row, got %',
        target_table, visible_count;
    END IF;
  END LOOP;

  UPDATE public.evidence_display_preferences
  SET verbosity = 'advanced'
  WHERE user_id = current_setting('adaptivpush.test_user_2')::uuid;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Cross-user update was not blocked';
  END IF;

  DELETE FROM public.cycle_symptom_logs
  WHERE user_id = current_setting('adaptivpush.test_user_2')::uuid;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Cross-user delete was not blocked';
  END IF;

  denied := false;
  BEGIN
    INSERT INTO public.readiness_checkins (user_id, checkin_date, checkin_mode)
    VALUES (current_setting('adaptivpush.test_user_2')::uuid, DATE '1900-01-02', 'one_tap');
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Cross-user insert was not blocked';
  END IF;

  denied := false;
  BEGIN
    INSERT INTO public.deload_recommendations (
      user_id, program_id, status, trigger_type, reason_summary, evidence_keys
    )
    VALUES (
      current_setting('adaptivpush.test_user_1')::uuid,
      current_setting('adaptivpush.test_program_2')::uuid,
      'recommended', 'rls_test', 'Invalid cross-program test', '[]'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Cross-user program linkage was not blocked';
  END IF;
END
$assertions$;

RESET ROLE;
ROLLBACK;
