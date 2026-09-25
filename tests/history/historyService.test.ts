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
          assert.equal(expectedOwner, owner);
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
test('preserves same-day cross-source records without linkage, and deduplicates explicit session links', async () => {
  const result = await fetchPaginatedWorkoutHistory({ supabaseClient: clientFor({
    workout_sessions: [{ id: 's1', ended_at: date }],
    workout_history: [
      { id: 'same-id-but-distinct', completed_at: date },
      { id: 'legacy-linked', completed_at: date, session_id: 's1' },
    ],
  }) });
  assert.deepEqual(result.items.map(item => item.compositeId).sort(),
    ['workout_history:same-id-but-distinct', 'workout_sessions:s1'].sort());
  assert.equal(result.complete, true);
});

test('missing optional legacy relation is distinct from unavailable supported sessions', async () => {
  const supported = await fetchPaginatedWorkoutHistory({ supabaseClient: clientFor({
    workout_sessions: [{ id: 's1', ended_at: date }],
  }) });
  assert.equal(supported.complete, true);
  assert.deepEqual(supported.unavailable, ['workout_history']);

  const unavailable = await fetchPaginatedWorkoutHistory({ supabaseClient: clientFor({
    workout_history: [{ id: 'h1', completed_at: date }],
  }) });
  assert.equal(unavailable.complete, false);
  assert.equal(unavailable.partial, true);
  assert.deepEqual(unavailable.unavailable, ['workout_sessions']);
});

test('reads every page and preserves tied timestamps across a display cursor', async () => {
  const rows = Array.from({ length: 1001 }, (_, index) => ({ id: `${index}`.padStart(4, '0'), ended_at: date }));
  const client = clientFor({ workout_sessions: rows, workout_history: [] });
  const first = await fetchPaginatedWorkoutHistory({ supabaseClient: client, limit: 600 });
  const second = await fetchPaginatedWorkoutHistory({ supabaseClient: client, limit: 600, cursor: first.nextCursor });
  assert.equal(first.items.length, 600);
  assert.equal(second.items.length, 401);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.compositeId)).size, 1001);
});

test('later source page failure cannot look like complete history', async () => {
  const rows = Array.from({ length: 500 }, (_, index) => ({ id: `${index}`, ended_at: date }));
  const result = await fetchPaginatedWorkoutHistory({
    supabaseClient: clientFor({ workout_sessions: rows, workout_history: [] }, 'owner', 500),
  });
  assert.equal(result.items.length, 500);
  assert.equal(result.complete, false);
  assert.equal(result.partial, true);
  assert.match(result.errors[0].error.message ?? '', /later page/);
});

test('account mismatch rejects and pre-aborted requests never return cached data', async () => {
  const client = clientFor({ workout_sessions: [{ id: 's1', ended_at: date }], workout_history: [] });
  await assert.rejects(fetchPaginatedWorkoutHistory({ supabaseClient: client, userId: 'other' }), /current account/);
  const controller = new AbortController();
  controller.abort();
  const result = await fetchPaginatedWorkoutHistory({ supabaseClient: client, signal: controller.signal });
  assert.equal(result.aborted, true);
  assert.equal(result.items.length, 0);
});
