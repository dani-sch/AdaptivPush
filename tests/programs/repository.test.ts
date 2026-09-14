import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createProgramRepository, type ProgramRepository } from '../../features/programs/repositoryCore';
import { classifySupabaseError } from '../../utils/supabaseResilience';

test('every disabled program repository writer rejects before auth or fetch', async () => {
  let fetched = 0;
  const client = createClient('http://127.0.0.1:54321', 'test-public-key', { auth: { persistSession: false },
    global: { fetch: async () => { fetched++; throw new Error('unexpected fetch'); } } });
  const repository = createProgramRepository(client, false);
  // A disabled command must reject before even validating or reading the input.
  for (const method of ['install', 'archive', 'restore', 'reviseExercise'] as const) {
    await assert.rejects(() => (repository[method] as (input: never) => Promise<unknown>)({} as never),
      (error: unknown) => classifySupabaseError(error).category === 'feature_disabled');
  }
  assert.equal(fetched, 0);
});

test('enabled lifecycle repository preserves missing-schema and stale errors from HTTP', async () => {
  for (const [response, expected] of [
    [{ code: 'PGRST202', message: 'RPC missing' }, 'schema_unavailable'],
    [{ code: 'P0001', message: 'stale_revision' }, 'conflict'],
  ] as const) {
    const client = createClient('http://127.0.0.1:54321', 'test-public-key', { auth: { persistSession: false },
      global: { fetch: async () => new Response(JSON.stringify(response), { status: 400 }) } });
    const repository = createProgramRepository(client, true);
    await assert.rejects(() => repository.restore({ operationId: 'operation', programId: 'program', mode: 'restart', expectedActiveProgramId: null } as Parameters<ProgramRepository['restore']>[0]),
      (error: unknown) => classifySupabaseError(error).category === expected);
  }
});
