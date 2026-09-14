// Real AP-01 -> AP-02/AP-03 upgrade on a separate synthetic local database.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { workoutEntryIssue } from '../features/workouts/routeResolution';
import { createWorkoutDraft, validateWorkoutDraft } from '../features/workouts/contracts';
import type { CurrentProgram } from '../types/program';

const container = 'supabase_db_AdaptivPushIosLegacy';
function sql(statement: string): string {
  const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: statement, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Isolated migration check failed: ${result.stderr.slice(0, 500)}`);
  return result.stdout.trim();
}
assert.match(sql('show server_version'), /^17\./);
assert.equal(sql("select count(*) from information_schema.columns where table_schema='public' and table_name='programs' and column_name='current_revision_id'"), '0', 'Run only against a fresh AP-01 isolated stack');
const owner = randomUUID(), programId = randomUUID(), archiveId = randomUUID(), dayId = randomUUID(), slotId = randomUUID(), exerciseId = randomUUID();
sql(`INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 VALUES ('${owner}','authenticated','authenticated','${owner}@example.invalid','','{}','{}',now(),now());
 INSERT INTO public.exercises(id,name,exercisedb_id) VALUES ('${exerciseId}','Legacy migration fixture','${exerciseId}');
 INSERT INTO public.programs(id,user_id,name,duration_weeks,days_per_week,start_date,is_active,last_active_week)
 VALUES ('${programId}','${owner}','Pre-migration active',4,1,current_date,true,NULL),
 ('${archiveId}','${owner}','Pre-migration archive',4,1,current_date-14,false,2);
 INSERT INTO public.program_days(id,program_id,week_number,day_index,workout_name) VALUES ('${dayId}','${programId}',1,1,'Legacy day');
 INSERT INTO public.program_day_exercises(id,program_day_id,exercise_id,set_count,rep_range_min,rep_range_max)
 VALUES ('${slotId}','${dayId}','${exerciseId}',1,5,8);`);
const legacy: CurrentProgram = { id: programId, currentRevision: 1, name: 'Legacy', goal: 'strength', currentWeek: 1, totalWeeks: 4, daysPerWeek: 1,
  workouts: [{ id: dayId, name: 'Legacy day', day: 'Monday', estimatedTime: 30, exercises: [{ id: slotId, exerciseId, name: 'Legacy exercise', sets: 1, reps: '5-8' }] }] };
assert.match(workoutEntryIssue(legacy, legacy.workouts[0])!, /service update/);
for (const migration of ['20260910210000_ap02_ap03_durable_workouts_and_program_revisions.sql', '20260911120000_ap03_revision_safe_exercise_swap.sql']) {
  sql(`BEGIN; ${readFileSync(new URL('../supabase/migrations/' + migration, import.meta.url), 'utf8')} COMMIT;`);
}
const row = JSON.parse(sql(`select json_build_object('revision',p.current_revision_id,'day',d.stable_day_id,'slot',s.stable_slot_id,
 'schema',p.schema_version,'provenance',r.provenance,'dayRevision',d.program_revision_id,'slotRevision',s.program_revision_id)
 from public.programs p join public.program_revisions r on r.id=p.current_revision_id
 join public.program_days d on d.program_id=p.id join public.program_day_exercises s on s.program_day_id=d.id where p.id='${programId}'`));
assert.equal(row.schema, 1); assert.equal(row.provenance, 'migration_snapshot');
assert.equal(row.dayRevision, row.revision); assert.equal(row.slotRevision, row.revision);
const migrated: CurrentProgram = { ...legacy, currentRevisionId: row.revision, workouts: [{ ...legacy.workouts[0], stableDayId: row.day,
  prescriptionRevisionId: row.revision, exercises: [{ ...legacy.workouts[0].exercises[0], stableSlotId: row.slot }] }] };
assert.equal(workoutEntryIssue(migrated, migrated.workouts[0]), null);
const draft = createWorkoutDraft({ ownerId: owner, programId, programDayId: dayId, stableDayId: row.day, prescriptionRevisionId: row.revision,
  workoutName: 'Legacy day', startedAt: new Date().toISOString(), timezone: 'UTC', slots: [{ slotId: row.slot, prescribedExerciseId: exerciseId,
    order: 1, prescribedSetCount: 1, sets: [{ setId: randomUUID(), order: 1, plannedRepsMin: 5, plannedRepsMax: 8,
      plannedLoad: null, loadKind: 'unknown', loadUnit: 'none', loadSide: 'unknown' }] }] });
assert.equal(validateWorkoutDraft(draft).ok, true);
assert.equal(sql(`select archive_checkpoint_provenance from public.programs where id='${archiveId}'`), 'legacy_approximate');
sql(`BEGIN; SET LOCAL request.jwt.claim.sub='${owner}'; SET LOCAL ROLE authenticated;
 SELECT public.archive_program_v2('${randomUUID()}','${programId}',1,'{}');
 SELECT public.restore_program_v2('${randomUUID()}','${programId}','restart',NULL); ROLLBACK;`);
assert.equal(sql(`select count(*) from public.programs where user_id='${owner}'`), '2');
console.log('PASS: real AP-01 legacy input blocked; exact reviewed migrations apply; database-derived identities create a valid startable draft; V1 provenance and archive approximation retained; archive/restart transaction succeeds. No device pass claimed.');
