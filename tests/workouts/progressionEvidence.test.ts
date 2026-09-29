import assert from 'node:assert/strict';
import test from 'node:test';

import {
  asFrozenWorkoutPrescription,
  hasRequiredAdHocSetCoverage,
  selectLatestProgressionEvidence,
  toAdHocProgressionEvidence,
} from '../../features/workouts/progressionEvidence';

test('newer ad-hoc actuals supersede older program evidence without a program-day link', () => {
  const evidence = selectLatestProgressionEvidence(
    {
      id: 'program',
      endedAt: '2026-09-29T10:00:00.000Z',
      prescriptionSnapshot: {
        revisionId: 'revision',
        programDayId: 'day',
        workoutName: 'Program workout',
        slots: [],
      },
      source: 'program',
    },
    { id: 'ad-hoc', endedAt: '2026-09-29T11:00:00.000Z', prescriptionSnapshot: null, source: 'ad_hoc' },
  );

  assert.equal(evidence?.id, 'ad-hoc');
  assert.equal(evidence?.source, 'ad_hoc');
});

test('ad-hoc evidence progresses only when it covers the active prescription set count', () => {
  assert.equal(hasRequiredAdHocSetCoverage(3, 3), true);
  assert.equal(hasRequiredAdHocSetCoverage(4, 3), true);
  assert.equal(hasRequiredAdHocSetCoverage(2, 3), false);
});

test('untrusted Supabase relationship data is narrowed before becoming ad-hoc evidence', () => {
  const evidence = toAdHocProgressionEvidence({ id: 'session-id', ended_at: '2026-09-29T11:00:00.000Z' });

  assert.equal(evidence?.source, 'ad_hoc');
  assert.equal(toAdHocProgressionEvidence({ id: 1, ended_at: null }), null);
  assert.equal(asFrozenWorkoutPrescription({ slots: [] }), null);
});

test('a newer program omission continues to hold progression over older ad-hoc work', () => {
  const evidence = selectLatestProgressionEvidence(
    {
      id: 'program',
      endedAt: '2026-09-29T12:00:00.000Z',
      prescriptionSnapshot: {
        revisionId: 'revision',
        programDayId: 'day',
        workoutName: 'Program workout',
        slots: [],
      },
      source: 'program',
    },
    { id: 'ad-hoc', endedAt: '2026-09-29T11:00:00.000Z', prescriptionSnapshot: null, source: 'ad_hoc' },
  );

  assert.equal(evidence?.source, 'program');
});
