import test from 'node:test';
import assert from 'node:assert/strict';

import { asLocalDate, validateTimeZone, toUtcDateFromLocal } from '../../features/kernel/localDate';
import { stableOccurrenceKey, stableCycleId, createPlacement, isAvailable, createOccurrenceId, asOccurrenceId } from '../../features/scheduling/contracts';

test('local date validation rejects invalid calendar dates', () => {
  assert.throws(() => asLocalDate('2026-02-30'));
  assert.doesNotThrow(() => asLocalDate('2024-02-29'));
});

test('timezone validation rejects unknown zones', () => {
  assert.doesNotThrow(() => validateTimeZone('UTC'));
  assert.throws(() => validateTimeZone('Foo/Bar'));
});

test('toUtcDateFromLocal rejects DST gaps and resolves valid times', () => {
  const nyGapDate = asLocalDate('2026-03-08');
  assert.throws(() => toUtcDateFromLocal(nyGapDate, 'America/New_York', '02:30'));
  const ok = toUtcDateFromLocal(asLocalDate('2026-03-09'), 'America/New_York', '09:00');
  assert.equal(ok.toISOString(), '2026-03-09T13:00:00.000Z');
  assert.equal(toUtcDateFromLocal(asLocalDate('2026-09-25'), 'UTC').toISOString(),
    '2026-09-25T00:00:00.000Z');
  assert.equal(toUtcDateFromLocal(asLocalDate('2026-11-01'), 'America/New_York', '01:30').toISOString(),
    '2026-11-01T05:30:00.000Z');
});

test('stable occurrence key deterministic for frontend lineage', () => {
  const a = stableOccurrenceKey('prog-x', 3, 'progday-1', 'presc-1');
  const b = stableOccurrenceKey('prog-x', 3, 'progday-1', 'presc-1');
  assert.equal(a, b);
});

test('placement fixed and availability with backend UUID occurrenceId', () => {
  const occurrenceId = createOccurrenceId();
  const cycleId = stableCycleId('p', 0);
  const placement = createPlacement({ identity: { occurrenceId, cycleId }, kind: 'workout', originalDate: '2026-09-25', timeZone: 'UTC', fixed: true });
  assert.equal(isAvailable(placement), true);
});
