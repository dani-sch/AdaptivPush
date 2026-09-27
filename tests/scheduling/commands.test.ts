import test from 'node:test';
import assert from 'node:assert/strict';

import { makeMove, makeCarry, makeSwap, makeSkip, makeRecurring } from '../../features/scheduling/commands';
import { validateCommand, createOccurrenceId, stableCycleId } from '../../features/scheduling/contracts';
import { asLocalDate } from '../../features/kernel/localDate';

test('construct and validate move command with valid date', () => {
  const occ = createOccurrenceId();
  const cmd = makeMove('op-1', 0, occ, asLocalDate('2026-09-30'));
  validateCommand(cmd);
});

test('move command rejects invalid target dates and empty ids', () => {
  assert.throws(() => validateCommand({}));
  assert.throws(() => validateCommand({ schemaVersion: 1, operationId: 'x', expectedRevision: 0, type: 'move', occurrenceId: '', targetDate: '2026-02-30' }));
});

test('other command constructors validate shape and guards', () => {
  const occ = createOccurrenceId();
  const cyc = stableCycleId('p', 1);
  validateCommand(makeCarry('op-2', 0, occ, cyc));
  validateCommand(makeSwap('op-3', 0, occ, createOccurrenceId()));
  validateCommand(makeSkip('op-4', 0, occ, 'rest'));
  validateCommand(makeRecurring('op-5', 0, occ, 2, 'week', { count: 3 }));
});
