// Nonvisual integration proof. Only the named local Supabase container is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const container = 'supabase_db_AdaptivPush';
const owner = randomUUID();
const exercises = [randomUUID(), randomUUID(), randomUUID()];
const days = [randomUUID(), randomUUID(), randomUUID()];
const slots = days.map(() => randomUUID());
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
function sql(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']);
    let out = ''; let error = '';
    child.stdout.on('data', (data) => { out += data; });
    child.stderr.on('data', (data) => { error += data; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(error)));
    child.stdin.end(statement);
  });
}
async function rpc(expression) {
  const output = await sql(`BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL request.jwt.claim.sub='${owner}'; SET LOCAL ROLE authenticated; SELECT ${expression}; COMMIT;`);
  return JSON.parse(output);
}
async function race(expression) {
  const receipts = await Promise.all([rpc(expression), rpc(expression)]);
  assert.deepEqual(receipts.map((r) => r.replayed).sort(), [false, true]);
  assert.equal(receipts[0].operationId, receipts[1].operationId);
  return receipts[0];
}
const artifact = {
  name: 'AP release concurrency fixture', goal: 'general_fitness', durationWeeks: 3, daysPerWeek: 1,
  source: 'manual', schemaVersion: 2, catalogVersion: 'local-fixture', policyVersion: 'program-install-v2', context: null,
  days: days.map((dayId, i) => ({ dayId, weekNumber: i + 1, dayIndex: 1, orderInWeek: 1,
    workoutName: 'Fixture day', estimatedDurationMin: 30, exercises: [{ slotId: slots[i], exerciseId: exercises[0],
      position: 1, setCount: 1, repRangeMin: 5, repRangeMax: 8, targetRpe: null, suggestedLoad: 0,
      loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total' }] })),
};
try {
  assert.match(await sql("SELECT current_setting('server_version')"), /^17\./);
  await sql(`INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    VALUES ('${owner}','authenticated','authenticated','${owner}@example.invalid','','{}','{}',now(),now());
    INSERT INTO public.exercises(id,name,exercisedb_id) VALUES ${exercises.map((id, i) => `('${id}','AP concurrency ${i}','${id}')`).join(',')};
    CREATE FUNCTION public.ap_release_race_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.user_id='${owner}'::uuid THEN PERFORM pg_sleep(0.5); END IF; RETURN NEW; END $$;
    CREATE TRIGGER ap_release_install_delay BEFORE INSERT ON public.programs FOR EACH ROW EXECUTE FUNCTION public.ap_release_race_delay();
    CREATE TRIGGER ap_release_workout_delay BEFORE INSERT ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.ap_release_race_delay();`);
  const install = await race(`public.install_program_v2(${json({ operationId: randomUUID(), expectedActiveProgramId: null, artifact })})`);
  console.log('PASS concurrent identical install returns one original receipt');
  const dayRow = await sql(`SELECT id FROM public.program_days WHERE program_id='${install.programId}' AND stable_day_id='${days[1]}';`);
  const workout = { operationId: randomUUID(), draftId: randomUUID(), schemaVersion: 2, policyVersion: 'workout-finalize-v2', revision: 1,
    programDayId: dayRow, prescriptionRevisionId: install.revisionId, workoutName: 'Fixture', startedAt: '2026-09-14T12:00:00Z',
    endedAt: '2026-09-14T12:10:00Z', durationMin: 10, frozenPrescription: { revisionId: install.revisionId },
    slots: [{ slotId: slots[1], prescribedExerciseId: exercises[0], actualExerciseId: exercises[0], prescribedSetCount: 1,
      sets: [{ setId: randomUUID(), order: 1, actualExerciseId: exercises[0], actualReps: 8, actualLoad: 0,
        actualRpe: null, logged: true, loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total' }] }] };
  const finalized = await race(`public.finalize_workout_v2(${json(workout)})`);
  console.log('PASS concurrent identical finalization creates one session and replay');
  const correction = { schemaVersion: 1, operationId: randomUUID(), sessionId: finalized.sessionId, expectedRevision: 0,
    sets: [{ actualSetId: workout.slots[0].sets[0].setId, prescriptionSlotId: slots[1], prescribedExerciseId: exercises[0],
      exerciseId: exercises[1], order: 1, reps: 10, loadValue: 25, loadKind: 'external', loadUnit: 'kg',
      loadSide: 'external_total', rpe: 7, loggedAt: '2026-09-17T12:00:00Z' }] };
  await race(`public.correct_completed_workout_v1(${json(correction)})`);
  assert.equal(await sql(`SELECT count(*) FROM public.workout_correction_audit WHERE workout_session_id='${finalized.sessionId}'`), '1');
  console.log('PASS concurrent identical corrections produce one revision and audit');
  const correctionRace = await Promise.allSettled([8, 9].map(reps => rpc(`public.correct_completed_workout_v1(${json({
    ...correction, operationId: randomUUID(), expectedRevision: 1, sets: [{ ...correction.sets[0], reps }],
  })})`)));
  assert.equal(correctionRace.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(correctionRace.find(r => r.status === 'rejected').reason.message, /stale_revision/);
  assert.equal(await sql(`SELECT correction_revision FROM public.workout_sessions WHERE id='${finalized.sessionId}'`), '2');
  console.log('PASS competing correction revisions accept one and reject the stale request');
  const revisionRequest = { operationId: randomUUID(), programId: install.programId, expectedRevision: 1,
    expectedRevisionId: install.revisionId, currentStableDayId: days[0], currentStableSlotId: slots[0],
    originalExerciseId: exercises[0], replacementExerciseId: exercises[1], includeCurrentDay: false };
  const revised = await race(`public.revise_program_exercise_v2(${json(revisionRequest)})`);
  const repeated = await race(`public.revise_program_exercise_v2(${json({ ...revisionRequest, operationId: randomUUID(), expectedRevision: 2,
    expectedRevisionId: revised.revisionId, replacementExerciseId: exercises[2] })})`);
  assert.equal(repeated.revision, 3);
  assert.equal(await sql(`SELECT pde.exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id WHERE pd.program_revision_id='${repeated.revisionId}' AND pd.stable_day_id='${days[1]}'`), exercises[0]);
  assert.equal(await sql(`SELECT pde.exercise_id FROM public.program_day_exercises pde JOIN public.program_days pd ON pd.id=pde.program_day_id WHERE pd.program_revision_id='${repeated.revisionId}' AND pd.stable_day_id='${days[2]}'`), exercises[2]);
  console.log('PASS successor retries replay; ancestor-completed prescriptions stay protected');
  const archived = await race(`public.archive_program_v2('${randomUUID()}','${install.programId}',3,'{"week":1}')`);
  assert.equal(archived.action, 'archive');
  await race(`public.restore_program_v2('${randomUUID()}','${install.programId}','exact',NULL)`);
  console.log('PASS concurrent archive and exact restore replay');
  const replacements = await Promise.allSettled([0, 1].map(() => rpc(`public.install_program_v2(${json({ operationId: randomUUID(),
    expectedActiveProgramId: install.programId, expectedActiveRevision: 3, artifact })})`)));
  assert.equal(replacements.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = replacements.find((r) => r.status === 'rejected');
  assert.match(rejected.reason.message, /stale_revision/);
  assert.equal(await sql(`SELECT count(*) FROM public.programs WHERE user_id='${owner}' AND is_active`), '1');
  console.log('PASS competing installations preserve one active program and return stale conflict');
} finally {
  await sql(`DROP TRIGGER IF EXISTS ap_release_install_delay ON public.programs;
    DROP TRIGGER IF EXISTS ap_release_workout_delay ON public.workout_sessions;
    DROP FUNCTION IF EXISTS public.ap_release_race_delay();
    DELETE FROM public.workout_sessions WHERE user_id='${owner}';
    DELETE FROM public.program_revision_command_receipts WHERE user_id='${owner}';
    DELETE FROM public.program_installation_receipts WHERE user_id='${owner}';
    DELETE FROM public.program_lifecycle_receipts WHERE user_id='${owner}';
    UPDATE public.programs SET current_revision_id=NULL WHERE user_id='${owner}';
    DELETE FROM public.program_generation_context WHERE user_id='${owner}';
    DELETE FROM public.program_days WHERE program_id IN (SELECT id FROM public.programs WHERE user_id='${owner}');
    UPDATE public.program_revisions SET parent_revision_id=NULL WHERE user_id='${owner}';
    DELETE FROM public.program_revisions WHERE user_id='${owner}';
    DELETE FROM public.programs WHERE user_id='${owner}';
    DELETE FROM auth.users WHERE id='${owner}';
    DELETE FROM public.exercises WHERE id IN (${exercises.map((id) => `'${id}'`).join(',')});`);
  assert.equal(await sql(`SELECT count(*) FROM auth.users WHERE id='${owner}'`), '0');
  console.log('PASS isolated synthetic fixture cleanup');
}
