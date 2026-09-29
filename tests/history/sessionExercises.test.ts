import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSessionExercises } from '../../features/history/sessionExercises';
import { fetchExerciseHistory } from '../../utils/fetchExerciseHistory';

type Row = Record<string, unknown>;

function clientFor(sets: Row[], onQuery: (table: string, column: string, value: string) => void,
  error: { message: string } | null = null): SupabaseClient {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'owner' } } }, error: null }) },
    from: (table: string) => {
      const builder = {
        select: (columns: string) => {
          if (columns.includes('exercises!')) {
            assert.match(columns, /exercises!workout_exercise_sets_exercise_id_fkey\(id, name\)/);
          }
          return builder;
        },
        eq: (column: string, value: string) => {
          onQuery(table, column, value);
          return builder;
        },
        order: () => builder,
        range: async (start: number, end: number) => ({
          data: error ? null : sets.slice(start, end + 1),
          error,
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

test('performed catalog identity names the detail and filters drill-down by the same ID', async () => {
  const queries: string[] = [];
  const client = clientFor([
    { id: 'set-1', actual_set_id: 'actual-1', exercise_id: 'performed-id',
      prescribed_exercise_id: 'prescribed-id', set_number: 1, load_value: 0, weight_lb: 0,
      load_unit: 'lb', load_kind: 'external', reps: 8, rpe: 7,
      exercises: { id: 'performed-id', name: 'Performed movement' },
      session_id: 'session', workout_sessions: { user_id: 'owner', workout_name: 'Workout',
        ended_at: '2026-09-25T10:00:00Z' } },
  ], (table, column, value) => queries.push(`${table}:${column}:${value}`));
  const [detail] = await fetchSessionExercises(client, 'session');
  assert.equal(detail.exerciseId, 'performed-id');
  assert.equal(detail.name, 'Performed movement');
  assert.equal(detail.sets[0].setId, 'actual-1');
  assert.equal(detail.sets[0].loadValue, 0);

  const history = await fetchExerciseHistory(detail.exerciseId, 10, client);
  assert.equal(history.entries.length, 1);
  assert.ok(queries.includes('workout_exercise_sets:exercise_id:performed-id'));
  assert.ok(!queries.includes('workout_exercise_sets:exercise_id:prescribed-id'));
});

test('detail retains legacy weight and separates missing performed relation from empty rows', async () => {
  const row = { id: 'legacy-set', actual_set_id: null, exercise_id: 'catalog-id',
    set_number: 1, load_value: null, weight_lb: 25, load_unit: null, load_kind: null,
    reps: 5, rpe: null, exercises: { id: 'catalog-id', name: 'Lift' } };
  const [detail] = await fetchSessionExercises(clientFor([row], () => {}), 'session');
  assert.equal(detail.sets[0].setId, 'legacy-set');
  assert.equal(detail.sets[0].loadValue, 25);
  assert.equal(detail.sets[0].loadUnit, 'lb');
  assert.deepEqual(await fetchSessionExercises(clientFor([], () => {}), 'session'), []);
  await assert.rejects(fetchSessionExercises(clientFor([], () => {}, { message: 'query failed' }), 'session'),
    (cause: unknown) => typeof cause === 'object' && cause !== null &&
      'message' in cause && cause.message === 'query failed');
});

test('detail rejects an unexpected embed rather than offering history for an unrelated exercise', async () => {
  const row = { id: 'set', exercise_id: 'performed-id', set_number: 1,
    exercises: [{ id: 'performed-id', name: 'Lift' }] };
  await assert.rejects(fetchSessionExercises(clientFor([row], () => {}), 'session'),
    /Invalid performed exercise/);
  await assert.rejects(fetchSessionExercises(clientFor([
    { ...row, exercises: { id: 'different-id', name: 'Wrong lift' } },
  ], () => {}), 'session'), /Invalid performed exercise/);
});
