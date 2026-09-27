import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPaginatedWorkoutHistory } from '../../features/history/historyService';

type Row = { id: string; ended_at?: string; completed_at?: string; session_id?: string };

type Source = Row[] | { error: { code?: string; message: string } };

function clientFor(sources: Record<string, Source>, owner = 'owner', failPage = -1): SupabaseClient {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: owner } } }, error: null }) },
    from: (table: string) => {
      let expectedOwner: string | null = null;
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => { if (column === 'user_id') expectedOwner = value; return builder; },
        order: () => builder,
        range: async (start: number, end: number) => {
          if (start === failPage) return { data: null, error: { message: 'later page failed' } };
          const source = sources[table];
          if (!source) return { data: null, error: { code: 'PGRST205', message: `missing ${table}` } };
          return Array.isArray(source)
            ? { data: source.slice(start, end + 1), error: null }
            : { data: null, error: source.error };
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

const date = '2026-09-25T10:00:00Z';

test('both history sources unavailable surfaces unavailable flags and not complete', async () => {
  const result = await fetchPaginatedWorkoutHistory({ supabaseClient: clientFor({}), });
  // both relations missing should be listed as unavailable
  assert.equal(result.complete, false);
  assert.equal(result.partial, false);
  assert.deepEqual(new Set(result.unavailable), new Set(['workout_sessions', 'workout_history']));
  assert.equal(result.items.length, 0);
});

test('partial history with legacy only is partial and reports workout_sessions unavailable', async () => {
  const result = await fetchPaginatedWorkoutHistory({ supabaseClient: clientFor({ workout_history: [{ id: 'h1', completed_at: date }] }) });
  assert.equal(result.complete, false);
  assert.equal(result.partial, true);
  assert.deepEqual(result.unavailable, ['workout_sessions']);
  assert.equal(result.items.length, 1);
});
