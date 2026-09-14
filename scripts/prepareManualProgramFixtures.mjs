// Bounded synthetic fixtures. Fixed local container and synthetic account only.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const container = 'supabase_db_AdaptivPush';
const sql = (query) => {
  const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Local fixture failed');
  return result.stdout.trim();
};
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
if (!sql('show server_version').startsWith('17.')) throw new Error('Local PostgreSQL 17 required');
const owner = sql("select id from auth.users where email='apqa-a@example.test'");
if (!/^[0-9a-f-]{36}$/.test(owner)) throw new Error('Create the synthetic local A account before program fixtures.');
if (sql(`select count(*) from public.programs where user_id='${owner}' and name like 'AP QA %'`) !== '0') {
  console.log('Existing manual fixtures preserved. No reset or replacement performed.');
  process.exit(0);
}
const catalog = JSON.parse(sql("select json_agg(json_build_object('id',id,'name',name,'equipment',equipment)) from public.exercises"));
const external = catalog.find((exercise) => exercise.equipment === 'Barbell') ?? catalog[0];
const bodyweight = catalog.find((exercise) => exercise.equipment === 'Bodyweight');
if (!bodyweight) throw new Error('Bodyweight catalog fixture missing');
function artifact(name) {
  return { name, goal: 'general_fitness', durationWeeks: 4, daysPerWeek: 2, source: 'manual', schemaVersion: 2,
    catalogVersion: 'local-manual-qa-2026-09-14', policyVersion: 'program-install-v2', context: null,
    days: Array.from({ length: 8 }, (_, index) => ({ dayId: randomUUID(), weekNumber: Math.floor(index / 2) + 1,
      dayIndex: index % 2 + 1, orderInWeek: index % 2 + 1, workoutName: `QA Load Day ${index % 2 + 1}`, estimatedDurationMin: 30,
      exercises: ['external', 'bodyweight', 'assistance', 'unknown'].map((kind, position) => ({ slotId: randomUUID(),
        exerciseId: kind === 'bodyweight' ? bodyweight.id : external.id, position: position + 1, setCount: 3,
        repRangeMin: 5, repRangeMax: 8, targetRpe: 7, suggestedLoad: kind === 'unknown' ? null : kind === 'assistance' ? 25 : 0,
        loadKind: kind, loadUnit: kind === 'unknown' ? 'none' : 'lb', loadSide: 'external_total' })) })) };
}
function rpc(expression) {
  return JSON.parse(sql(`BEGIN; SET LOCAL request.jwt.claim.sub='${owner}'; SET LOCAL ROLE authenticated; SELECT ${expression}; COMMIT;`));
}
const exact = rpc(`public.install_program_v2(${json({ operationId: randomUUID(), expectedActiveProgramId: null, artifact: artifact('AP QA Exact Archive') })})`);
const active = rpc(`public.install_program_v2(${json({ operationId: randomUUID(), expectedActiveProgramId: exact.programId, expectedActiveRevision: 1, artifact: artifact('AP QA Loads') })})`);
// Trusted local time fixture: simulate a saved end-of-week-1 archive checkpoint.
sql(`UPDATE public.programs SET start_date=current_date-20, archive_checkpoint=archive_checkpoint || '{"elapsedDays":6}'::jsonb WHERE id='${exact.programId}';
INSERT INTO public.programs(user_id,name,duration_weeks,days_per_week,start_date,is_active,schema_version,lifecycle,last_active_week,archive_checkpoint,archive_checkpoint_provenance)
VALUES ('${owner}','AP QA Legacy Approximate',4,1,current_date-14,false,1,'archived',2,'{"kind":"legacy_week","week":2}','legacy_approximate');`);
sql(`WITH legacy AS (SELECT id FROM public.programs WHERE user_id='${owner}' AND name='AP QA Legacy Approximate'),
new_days AS (INSERT INTO public.program_days(program_id,week_number,day_index,workout_name)
SELECT legacy.id,week,1,'Legacy QA day' FROM legacy CROSS JOIN generate_series(1,4) week RETURNING id)
INSERT INTO public.program_day_exercises(program_day_id,exercise_id,set_count,rep_range_min,rep_range_max,suggested_weight_lb)
SELECT id,'${bodyweight.id}',3,5,8,0 FROM new_days;`);
console.log(JSON.stringify({ backend: 'local only', owner, exactArchive: exact.programId, activeLoadProgram: active.programId,
  syntheticPrograms: 3, catalogNames: catalog.length, accountB: 'empty', note: 'No manual passes claimed' }));
