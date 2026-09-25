import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchExerciseHistory } from '../../utils/fetchExerciseHistory';

const timestamp = '2026-09-25T10:00:00Z';
const meta = { user_id: 'owner', workout_name: 'Workout', ended_at: timestamp };

function clientFor(rows: object[], failOffset = -1,
  error: { message: string; code?: string } = { message: 'read failed' }): SupabaseClient {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'owner' } } }, error: null }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: async (start: number, end: number) => start === failOffset
          ? { data: null, error }
          : { data: rows.slice(start, end + 1), error: null },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

test('effective actual sets retain load kind, unit and side without counting assistance as lifted volume', async () => {
  const rows = [
    { id: 'a', session_id: 's1', set_number: 1, load_value: 10, weight_lb: null,
      load_unit: 'kg', load_kind: 'external', load_side: 'per_hand', reps: 5, rpe: null, workout_sessions: meta },
    { id: 'b', session_id: 's1', set_number: 2, load_value: 20, weight_lb: null,
      load_unit: 'lb', load_kind: 'assistance', load_side: 'total', reps: 3, rpe: null, workout_sessions: meta },
  ];
  const result = await fetchExerciseHistory('exercise', 10, clientFor(rows));
  assert.equal(result.entries[0].sets[0].loadSide, 'per_hand');
  assert.equal(result.entries[0].sets[1].loadKind, 'assistance');
  assert.ok(Math.abs(result.entries[0].totalVolumeLb - 110.231) < 0.01);
});

test('later-page failure does not return incomplete exercise history as a success', async () => {
  const rows = Array.from({ length: 500 }, (_, index) => ({
    id: String(index), session_id: 's1', set_number: index + 1, load_value: 10, weight_lb: null,
    load_unit: 'lb', load_kind: 'external', load_side: 'unknown', reps: 2, rpe: null, workout_sessions: meta,
  }));
  const result = await fetchExerciseHistory('exercise', 10, clientFor(rows, 500));
  assert.equal(result.entries.length, 0);
  assert.equal(result.partial, true);
  assert.equal(result.errors.length, 1);
});

test('missing supported actual-set relation is unavailable, not empty history', async () => {
  const result = await fetchExerciseHistory('exercise', 10,
    clientFor([], 0, { code: 'PGRST205', message: 'missing workout_exercise_sets' }));
  assert.equal(result.unavailable, true);
  assert.equal(result.entries.length, 0);
});

test('cancelled exercise history returns no owner data', async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await fetchExerciseHistory('exercise', 10, clientFor([]), controller.signal);
  assert.equal(result.aborted, true);
  assert.deepEqual(result.entries, []);
});
