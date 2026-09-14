// Synthetic public catalog only. This script has no remote-target option.
import { spawnSync } from 'node:child_process';
import { exercisesByMuscleGroup } from '../lib/exerciseDatabase';

const container = 'supabase_db_AdaptivPush';
function sql(statement: string) {
  const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: statement, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Local fixture command failed');
  return result.stdout.trim();
}
if (!sql('show server_version').startsWith('17.')) throw new Error('Local PostgreSQL 17 is required');
if (sql("select count(*) from supabase_migrations.schema_migrations where version in ('20260910210000','20260911120000')") !== '2') {
  throw new Error('Apply the reviewed local two-migration packet before fixtures.');
}
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const exercises = Object.values(exercisesByMuscleGroup).flat().filter((exercise) => exercise.catalogAvailability !== 'unresolved');
const values = exercises.map((exercise) => `(${quote(exercise.name)},${quote(exercise.muscleGroup)},${quote(exercise.equipment)},${exercise.catalogExerciseDbId ? quote(exercise.catalogExerciseDbId) : 'NULL'})`);
sql(`BEGIN; INSERT INTO public.exercises(name,primary_muscle,equipment,exercisedb_id) VALUES ${values.join(',')}
ON CONFLICT(name) DO NOTHING; COMMIT;`);
console.log(`Local manual-QA catalog ready: ${exercises.length} supported exercise names; no accounts or production data modified.`);
