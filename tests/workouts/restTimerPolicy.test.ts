import assert from 'node:assert/strict';
import test from 'node:test';

import { extendRestSeconds, restTimeRemaining } from '../../features/workouts/restTimerPolicy';

test('rest timer restart derives remaining time from persisted absolute deadline', () => {
  assert.equal(restTimeRemaining('2026-09-27T12:01:00.000Z',
    Date.parse('2026-09-27T12:00:15.000Z')), 45);
  assert.equal(restTimeRemaining('2026-09-27T12:01:00.000Z',
    Date.parse('2026-09-27T12:02:00.000Z')), 0);
});

test('rest timer extension adds only the chosen interval', () => {
  assert.equal(extendRestSeconds(45, 30), 75);
  assert.throws(() => extendRestSeconds(45, 0), /positive/);
});
