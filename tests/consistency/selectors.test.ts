import assert from 'node:assert/strict';
import test from 'node:test';

import {
  selectWeeklyAdherence,
  weeksOnPlan,
  type ConsistencyWindow,
} from '../../features/consistency/selectors';

const window: ConsistencyWindow = {
  weekStart: '2026-09-21',
  weekEndExclusive: '2026-09-28',
  timezone: 'America/New_York',
  scheduleRevision: 3,
  sourceWatermark: 'session-12',
  correctionWatermark: 'correction-2',
  paused: false,
  sourceCoverage: 'complete',
};

test('two workouts and five rests count only eligible work', () => {
  const result = selectWeeklyAdherence(window, [
    { occurrenceId: 'a', localDate: '2026-09-21', kind: 'workout', state: 'finalized', completionClass: 'complete' },
    { occurrenceId: 'b', localDate: '2026-09-25', kind: 'workout', state: 'finalized', completionClass: 'reduced', acceptedReductionId: 'reduction-1' },
    ...[22, 23, 24, 26, 27].map(day => ({
      occurrenceId: `rest-${day}`,
      localDate: `2026-09-${day}`,
      kind: 'rest' as const,
      state: 'planned' as const,
    })),
  ]);
  assert.equal(result.eligibleWorkouts, 2);
  assert.equal(result.fulfilledWorkouts, 2);
  assert.equal(result.restDays, 5);
  assert.equal(result.fraction, 1);
  assert.equal(result.correctionWatermark, 'correction-2');
});

test('unaccepted reduced, partial, and pending work never earn credit', () => {
  const result = selectWeeklyAdherence(window, [
    { occurrenceId: 'a', localDate: '2026-09-21', kind: 'workout', state: 'finalized', completionClass: 'reduced' },
    { occurrenceId: 'b', localDate: '2026-09-22', kind: 'workout', state: 'finalized', completionClass: 'partial' },
    { occurrenceId: 'c', localDate: '2026-09-23', kind: 'workout', state: 'pending' },
  ]);
  assert.equal(result.partial, 2);
  assert.equal(result.pending, 1);
  assert.equal(result.fraction, null);
});

test('cross-week move changes reporting week only and correction updates watermark', () => {
  const moved = { occurrenceId: 'cycle-2-pull', localDate: '2026-09-28', kind: 'workout' as const, state: 'finalized' as const, completionClass: 'complete' as const };
  assert.equal(selectWeeklyAdherence(window, [moved]).eligibleWorkouts, 0);
  const next = selectWeeklyAdherence({ ...window, weekStart: '2026-09-28', weekEndExclusive: '2026-10-05', correctionWatermark: 'correction-3' }, [moved]);
  assert.equal(next.fraction, 1);
  assert.equal(next.correctionWatermark, 'correction-3');
});

test('pause preserves without incrementing and hidden weeks are not shown', () => {
  const complete = selectWeeklyAdherence(window, [{ occurrenceId: 'a', localDate: '2026-09-21', kind: 'workout', state: 'finalized', completionClass: 'complete' }]);
  const paused = selectWeeklyAdherence({ ...window, paused: true }, []);
  assert.equal(weeksOnPlan([complete, paused, complete], false), 2);
  assert.equal(weeksOnPlan([complete, paused], true), null);
  assert.equal(selectWeeklyAdherence({ ...window, sourceCoverage: 'partial' }, []).fraction, null);
});
