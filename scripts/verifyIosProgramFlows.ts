// Exercises the shipped repository + commands against LAN-reachable synthetic Supabase.
import assert from 'node:assert/strict';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'node:crypto';
import { createProgramRepository } from '../features/programs/repositoryCore';
import { archiveProgram, installProgram, restoreProgram } from '../features/programs/commands';
import { classifySupabaseError } from '../utils/supabaseResilience';
import type { ProgramArtifact } from '../features/programs/contracts';
import { createOperationId } from '../features/kernel/operationId';

async function main() {
const url = process.env.AP_QA_API_URL;
if (url !== 'http://192.168.2.49:54330') throw new Error('Only this verified local LAN QA endpoint is accepted.');
const admin = createClient(url, process.env.AP_QA_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const memory = new Map<string, string>();
AsyncStorage.getItem = async (key) => memory.get(key) ?? null;
AsyncStorage.setItem = async (key, value) => { memory.set(key, value); };
AsyncStorage.removeItem = async (key) => { memory.delete(key); };
const accounts: string[] = [];
const clients: SupabaseClient[] = [];
try {
  for (let i = 0; i < 2; i++) {
    const email = `ios-flow-${randomUUID()}@example.test`, password = randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Synthetic account creation failed');
    accounts.push(created.data.user.id);
    const client = createClient(url, process.env.AP_QA_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const session = await client.auth.signInWithPassword({ email, password });
    if (session.error) throw new Error('Synthetic login failed');
    clients.push(client);
  }
  const catalog = await clients[0].from('exercises').select('id').limit(1).single();
  assert.equal(catalog.error, null);
  const artifact = (source: 'manual' | 'generated'): ProgramArtifact => ({ name: `iOS QA ${source}`, goal: 'general_fitness', durationWeeks: 4,
    daysPerWeek: 1, source, schemaVersion: 2, catalogVersion: 'local-qa', policyVersion: 'program-install-v2', context: null,
    days: [{ dayId: randomUUID(), weekNumber: 1, dayIndex: 1, orderInWeek: 1, workoutName: 'QA day', estimatedDurationMin: 30,
      exercises: [{ slotId: randomUUID(), exerciseId: catalog.data!.id, position: 1, setCount: 1, repRangeMin: 5, repRangeMax: 8,
        targetRpe: null, suggestedLoad: null, loadKind: 'unknown', loadUnit: 'none', loadSide: 'unknown' }] }] });
  const enabled = createProgramRepository(clients[0], true), disabled = createProgramRepository(clients[0], false);
  const manual = artifact('manual');
  const off = await installProgram(disabled, accounts[0], manual, null, null);
  assert.equal(off.status, 'unavailable');
  if (off.status === 'unavailable') assert.equal(off.failure.category, 'feature_disabled');
  assert.equal((await clients[0].from('programs').select('id')).data?.length, 0);
  const installed = await installProgram(enabled, accounts[0], manual, null, null);
  if (installed.status !== 'installed') throw new Error('Manual installation did not succeed');
  const first = installed.receipt;
  await assert.rejects(() => archiveProgram(disabled, accounts[0], first.programId, 1, 1), (e: unknown) => classifySupabaseError(e).category === 'feature_disabled');
  await archiveProgram(enabled, accounts[0], first.programId, 1, 1);
  await assert.rejects(() => restoreProgram(disabled, accounts[0], first.programId, 'exact', null), (e: unknown) => classifySupabaseError(e).category === 'feature_disabled');
  await restoreProgram(enabled, accounts[0], first.programId, 'exact', null);
  const generated = await installProgram(enabled, accounts[0], artifact('generated'), first.programId, 1);
  if (generated.status !== 'installed') throw new Error('Generated installation did not succeed');
  assert.equal((await clients[0].from('programs').select('id').eq('is_active', true)).data?.length, 1);
  assert.equal((await clients[1].from('programs').select('id')).data?.length, 0);
  await assert.rejects(() => createProgramRepository(clients[1], true).restore({ operationId: createOperationId(), programId: first.programId,
    mode: 'exact', expectedActiveProgramId: null }), (e: unknown) => classifySupabaseError(e).category === 'conflict');
  const rows = await clients[0].from('program_days').select('stable_day_id,program_revision_id,program_day_exercises!program_day_exercises_program_day_id_fkey(stable_slot_id)').eq('program_id', generated.receipt.programId);
  assert.equal(rows.error, null); assert.equal(rows.data?.length, 1);
  assert.ok(rows.data![0].stable_day_id); assert.equal(rows.data![0].program_revision_id, generated.receipt.revisionId);
  assert.equal(rows.data![0].program_day_exercises.length, 1);
  assert.ok(rows.data![0].program_day_exercises[0].stable_slot_id);
  console.log('PASS: LAN login; shipped commands/repository; disabled install/archive/restore cause no mutation; enabled manual/generated install, exact archive/restore, complete identities, one active program and second-account isolation.');
} finally {
  for (const client of clients) await client.auth.signOut({ scope: 'local' });
  const cleanup = spawnSync('docker', ['exec', '-i', 'supabase_db_AdaptivPush', 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { encoding: 'utf8', input: `BEGIN; CREATE TEMP TABLE cleanup_owners AS SELECT id FROM auth.users WHERE id IN (${accounts.map((id) => `'${id}'::uuid`).join(',') || 'NULL'}); DELETE FROM public.program_revision_command_receipts WHERE user_id IN (SELECT id FROM cleanup_owners); DELETE FROM public.program_installation_receipts WHERE user_id IN (SELECT id FROM cleanup_owners); DELETE FROM public.program_lifecycle_receipts WHERE user_id IN (SELECT id FROM cleanup_owners); UPDATE public.programs SET current_revision_id=NULL WHERE user_id IN (SELECT id FROM cleanup_owners); DELETE FROM public.program_days WHERE program_id IN (SELECT id FROM public.programs WHERE user_id IN (SELECT id FROM cleanup_owners));
      DELETE FROM public.program_revisions WHERE user_id IN (${accounts.map((id) => `'${id}'::uuid`).join(',') || 'NULL'});
      
      DELETE FROM auth.users WHERE id IN (${accounts.map((id) => `'${id}'::uuid`).join(',') || 'NULL'}); COMMIT;` });
  if (cleanup.status !== 0) throw new Error('Synthetic account cleanup failed; inspect local test accounts.');
}
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Local flow verification failed'); process.exitCode = 1; });
