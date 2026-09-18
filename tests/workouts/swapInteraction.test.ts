import assert from 'node:assert/strict';
import test from 'node:test';

import { OptionalValueCache, SingleFlightGate, InteractionScope, applyExercisePickerSelection, filterExercisePickerOptions } from '../../features/workouts/swapInteraction';

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

test('Add searches without excluding existing exercises; Swap retains exclusions', () => {
  const options = [{ id: 'a', name: 'Press' }, { id: 'b', name: 'Row' }, { id: 'c', name: 'Press' }];
  const current = { exerciseId: 'a', name: 'Press' };
  assert.deepEqual(filterExercisePickerOptions(options, '', 'add'), options);
  assert.deepEqual(filterExercisePickerOptions(options, '  press ', 'add', current), [options[0], options[2]]);
  assert.deepEqual(filterExercisePickerOptions(options, '', 'swap', current), [options[1]]);
});

for (const completion of ['success', 'failure'] as const) test(`close/account change and reopen ignores old ${completion} and admits one Add`, async () => {
  const interaction = new InteractionScope(); const gate = new SingleFlightGate();
  let resolve!: () => void; let reject!: (error: Error) => void;
  const pending = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  let submissions = 0; const events: string[] = [];
  const input = { interaction, gate, apply: async (isCurrent: () => boolean) => {
    assert.equal(isCurrent(), true); submissions++; await pending;
  }, started: () => events.push('start'), succeeded: () => events.push('close'),
  failed: () => events.push('error'), settled: () => events.push('settled') };
  const first = applyExercisePickerSelection(input);
  await applyExercisePickerSelection(input);
  assert.equal(submissions, 1);
  const oldResult = interaction.capture(); interaction.invalidate();
  const reopened = new InteractionScope(); const reopenedResult = reopened.capture();
  if (completion === 'success') resolve(); else reject(new Error('late failure'));
  await first;
  await applyExercisePickerSelection(input);
  assert.equal(submissions, 1); assert.deepEqual(events, ['start']);
  assert.equal(oldResult(), false); assert.equal(reopenedResult(), true);
});

test('rejected apply stays open and can retry; successful apply closes exactly once', async () => {
  const interaction = new InteractionScope(); const gate = new SingleFlightGate();
  const events: string[] = [];
  const input = { interaction, gate, apply: async () => false,
    started: () => events.push('start'), succeeded: () => events.push('close'), failed: () => events.push('error'), settled: () => events.push('settled') };
  await applyExercisePickerSelection(input);
  assert.deepEqual(events, ['start', 'settled']);
  await applyExercisePickerSelection({ ...input, apply: async () => true });
  assert.deepEqual(events, ['start', 'settled', 'start', 'close', 'settled']);
});
