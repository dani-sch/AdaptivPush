-- Run this file twice, concurrently, against an isolated local database:
-- psql -v holder=1 -f flexible_program_sequence_concurrency.sql
-- psql -f flexible_program_sequence_concurrency.sql
-- Both sessions roll back. The second must run while the first holds the lock.
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('request.jwt.claim.sub','af000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
\if :{?holder}
SELECT pg_advisory_xact_lock(hashtextextended(
  'af000000-0000-4000-8000-000000000001:af000000-0000-4000-8000-000000000002',0));
SELECT pg_sleep(20);
\else
SET LOCAL lock_timeout='1s';
DO $concurrent$
DECLARE
  timed_out boolean:=false;
BEGIN
  BEGIN
    PERFORM public.change_program_sequence_v1(jsonb_build_object(
      'schemaVersion',1,
      'programId','af000000-0000-4000-8000-000000000002',
      'operationId',gen_random_uuid(),
      'expectedRevision',1,
      'kind','pause'));
  EXCEPTION WHEN lock_not_available THEN timed_out:=true;
  END;
  IF NOT timed_out THEN RAISE EXCEPTION 'concurrent sequence command passed locked program'; END IF;
END $concurrent$;
\endif
RESET ROLE;
ROLLBACK;
