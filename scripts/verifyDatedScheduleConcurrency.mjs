// Destructive synthetic proof for a disposable AP-04 database only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const container = process.env.AP04_CONCURRENCY_CONTAINER;
const database = process.env.AP04_CONCURRENCY_DATABASE ?? 'postgres';
assert.ok(container, 'Set AP04_CONCURRENCY_CONTAINER to the disposable Supabase database container.');
assert.match(container, /AP04Restore/i, 'Refusing to run outside the named AP-04 isolated restore stack.');

const owner = randomUUID();
const exercises = [randomUUID(), randomUUID()];
const stableDays = [randomUUID(), randomUUID(), randomUUID()];
const slots = stableDays.map(() => randomUUID());
const occurrenceIds = stableDays.map(() => randomUUID());
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

function sql(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'supabase_admin', '-d', database,
      '-v', 'ON_ERROR_STOP=1']);
    let out = ''; let error = '';
    child.stdout.on('data', (data) => { out += data; });
    child.stderr.on('data', (data) => { error += data; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(error)));
    child.stdin.end(statement);
  });
}

async function rpc(expression) {
  const output = await sql(`BEGIN; SET LOCAL statement_timeout='15s'; SET LOCAL request.jwt.claim.sub='${owner}'; SET LOCAL ROLE authenticated; SELECT ${expression}; COMMIT;`);
  return JSON.parse(output);
}

async function identicalRace(label, expression) {
  const receipts = await Promise.all([rpc(expression), rpc(expression)]);
  assert.deepEqual(receipts.map((receipt) => receipt.replayed).sort(), [false, true]);
  assert.equal(receipts[0].operationId, receipts[1].operationId);
  console.log(`PASS ${label}: one commit and one exact replay`);
  return receipts.find((receipt) => receipt.replayed === false);
}

const artifact = {
  name: 'AP-04 concurrency proof', goal: 'general_fitness', durationWeeks: 3, daysPerWeek: 1,
  source: 'manual', schemaVersion: 2, catalogVersion: 'ap04-fixture', policyVersion: 'program-install-v2', context: null,
  days: stableDays.map((stableDayId, index) => ({
    dayId: stableDayId, weekNumber: index + 1, dayIndex: 1, orderInWeek: 1,
    workoutName: `AP-04 day ${index + 1}`, estimatedDurationMin: 30,
    exercises: [{ slotId: slots[index], exerciseId: exercises[0], position: 1, setCount: 1,
      repRangeMin: 5, repRangeMax: 8, targetRpe: null, suggestedLoad: 0,
      loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total' }],
  })),
};

try {
  assert.match(await sql("SELECT current_setting('server_version')"), /^17\./);
  assert.equal(await sql("SELECT public.schedule_capability_v1()"), '1');
  await sql(`INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    VALUES ('${owner}','authenticated','authenticated','${owner}@example.invalid','','{}','{}',now(),now());
    INSERT INTO public.exercises(id,name,exercisedb_id) VALUES
      ('${exercises[0]}','AP-04 concurrency press','${exercises[0]}'),
      ('${exercises[1]}','AP-04 concurrency row','${exercises[1]}');`);

  const install = await rpc(`public.install_program_v2(${json({ operationId: randomUUID(), expectedActiveProgramId: null, artifact })})`);
  const programDays = await Promise.all(stableDays.map((stableDayId) =>
    sql(`SELECT id FROM public.program_days WHERE program_revision_id='${install.revisionId}' AND stable_day_id='${stableDayId}'`)));

  const schedulePayload = {
    operationId: randomUUID(), programId: install.programId, expectedRevision: 0,
    expectedProgramRevisionId: install.revisionId, timezone: 'America/New_York',
    days: programDays.map((programDayId, index) => ({ occurrenceId: occurrenceIds[index], programDayId,
      localDate: `2026-10-${String(1 + index * 2).padStart(2, '0')}` })),
  };
  const schedule = await identicalRace('concurrent schedule creation',
    `public.create_program_schedule_v1(${json(schedulePayload)})`);
  assert.equal(await sql(`SELECT count(*) FROM public.program_schedules WHERE id='${schedule.scheduleId}'`), '1');
  assert.equal(await sql(`SELECT count(*) FROM public.scheduled_days WHERE schedule_id='${schedule.scheduleId}'`), '3');

  const revisionPayload = {
    operationId: randomUUID(), programId: install.programId, expectedRevision: 1,
    expectedRevisionId: install.revisionId, currentStableDayId: stableDays[0], currentStableSlotId: slots[0],
    originalExerciseId: exercises[0], replacementExerciseId: exercises[1], includeCurrentDay: false,
  };
  const revised = await identicalRace('concurrent prescription revision',
    `public.revise_program_exercise_v2(${json(revisionPayload)})`);
  const afterPrescriptionRevision = Number(await sql(`SELECT revision FROM public.program_schedules WHERE id='${schedule.scheduleId}'`));
  assert.equal(afterPrescriptionRevision, 1);
  const scheduled = JSON.parse(await sql(`SELECT json_build_object('id',id,'programDayId',current_program_day_id,
    'revisionId',current_prescription_revision_id)::text FROM public.scheduled_days
    WHERE id='${occurrenceIds[1]}'`));
  assert.equal(scheduled.revisionId, revised.revisionId);

  const workout = {
    operationId: randomUUID(), draftId: randomUUID(), schemaVersion: 2, policyVersion: 'workout-finalize-v2', revision: 1,
    programDayId: scheduled.programDayId, prescriptionRevisionId: scheduled.revisionId,
    scheduleOccurrenceId: scheduled.id, expectedScheduleRevision: afterPrescriptionRevision,
    workoutName: 'AP-04 scheduled workout', startedAt: '2026-10-03T12:00:00Z', endedAt: '2026-10-03T12:10:00Z',
    durationMin: 10, timezone: 'America/New_York', frozenPrescription: { revisionId: scheduled.revisionId },
    slots: [{ slotId: slots[1], prescribedExerciseId: exercises[1], actualExerciseId: exercises[1], prescribedSetCount: 1,
      sets: [{ setId: randomUUID(), order: 1, actualExerciseId: exercises[1], actualReps: 8, actualLoad: 20,
        actualRpe: 7, logged: true, loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total' }] }],
  };
  const finalized = await identicalRace('concurrent scheduled Finish',
    `public.finalize_workout_v2(${json(workout)})`);
  assert.equal(finalized.scheduleOccurrenceId, scheduled.id);
  assert.equal(finalized.scheduleRevision, 2);

  const correction = {
    schemaVersion: 1, operationId: randomUUID(), sessionId: finalized.sessionId, expectedRevision: 0,
    expectedScheduleRevision: finalized.scheduleRevision,
    sets: [{ actualSetId: workout.slots[0].sets[0].setId, prescriptionSlotId: slots[1],
      prescribedExerciseId: exercises[1], exerciseId: exercises[1], order: 1, reps: 7, loadValue: 20,
      loadKind: 'external', loadUnit: 'lb', loadSide: 'external_total', rpe: 8,
      loggedAt: '2026-10-03T12:05:00Z' }],
  };
  const corrected = await identicalRace('concurrent scheduled correction',
    `public.correct_completed_workout_v1(${json(correction)})`);
  assert.equal(corrected.scheduleOccurrenceId, scheduled.id);
  assert.equal(corrected.scheduleRevision, 3);
  assert.equal(await sql(`SELECT revision FROM public.program_schedules WHERE id='${schedule.scheduleId}'`), '3');
  assert.equal(await sql(`SELECT count(*) FROM public.schedule_deviations WHERE schedule_id='${schedule.scheduleId}'`), '2');
  console.log('PASS AP-04 schedule, prescription, Finish, and correction serialization');
} finally {
  await sql(`SET ROLE supabase_admin;
    DELETE FROM public.schedule_deviations WHERE user_id='${owner}';
    DELETE FROM public.scheduled_days WHERE user_id='${owner}';
    DELETE FROM public.program_schedules WHERE user_id='${owner}';
    DELETE FROM public.workout_sessions WHERE user_id='${owner}';
    DELETE FROM public.program_revision_command_receipts WHERE user_id='${owner}';
    DELETE FROM public.program_installation_receipts WHERE user_id='${owner}';
    UPDATE public.programs SET current_revision_id=NULL WHERE user_id='${owner}';
    DELETE FROM public.program_day_exercises WHERE program_revision_id IN
      (SELECT id FROM public.program_revisions WHERE user_id='${owner}');
    DELETE FROM public.program_days WHERE program_id IN (SELECT id FROM public.programs WHERE user_id='${owner}');
    UPDATE public.program_revisions SET parent_revision_id=NULL WHERE user_id='${owner}';
    DELETE FROM public.program_revisions WHERE user_id='${owner}';
    DELETE FROM public.programs WHERE user_id='${owner}';
    DELETE FROM auth.users WHERE id='${owner}';
    DELETE FROM public.exercises WHERE id IN ('${exercises[0]}','${exercises[1]}');
    RESET ROLE;`);
  assert.equal(await sql(`SELECT count(*) FROM auth.users WHERE id='${owner}'`), '0');
  console.log('PASS isolated AP-04 synthetic fixture cleanup');
}
