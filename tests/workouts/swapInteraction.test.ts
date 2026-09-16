import assert from 'node:assert/strict';
import test from 'node:test';

import { OptionalValueCache, SingleFlightGate } from '../../features/workouts/swapInteraction';

test('Apply can proceed without waiting for optional replacement history', async () => {
  let resolveHistory: ((value: number) => void) | undefined;
  const history = new Promise<number>((resolve) => { resolveHistory = resolve; });
  const cache = new OptionalValueCache<string, number>();
  cache.prefetch('replacement-id', () => history);

  const suggestionAtApply = cache.peek('replacement-id');

  assert.equal(suggestionAtApply, undefined);
  resolveHistory?.(135);
  await history;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cache.peek('replacement-id'), 135);
});

test('rapid duplicate Apply attempts admit only one durable operation', () => {
  const gate = new SingleFlightGate();

  assert.equal(gate.tryEnter(), true);
  assert.equal(gate.tryEnter(), false);
  gate.leave();
  assert.equal(gate.tryEnter(), true);
});
