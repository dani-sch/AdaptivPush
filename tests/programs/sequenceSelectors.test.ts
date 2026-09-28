import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseProgramSequenceState, selectNextSequenceDay, type ProgramSequenceDay,
} from '../../features/programs/sequenceSelectors';

const day = (id: string, position: number, status: ProgramSequenceDay['status'],
  originalKind: ProgramSequenceDay['originalKind'] = 'workout'): ProgramSequenceDay => ({
  stableDayId: id, position, status, originalKind,
  sessionId: status === 'completed' || status === 'partial' ? `session-${id}` : null,
  actualCompletionClass: status === 'completed' || status === 'partial' ? status : null,
});

test('paused sequence has no suggested workout even when work is pending', () => {
  assert.equal(selectNextSequenceDay({ paused: true, days: [day('a', 1, 'pending')] }), null);
});

test('suggestion follows persisted order and ignores rest, skipped, partial and completed days', () => {
  const days = [
    day('later', 6, 'pending'),
    day('complete', 2, 'completed'),
    day('partial', 3, 'partial'),
    day('skipped', 1, 'skipped'),
    day('rest', 4, 'rest', 'rest'),
    day('next', 5, 'pending'),
  ];
  assert.equal(selectNextSequenceDay({ paused: false, days }), 'next');
  assert.equal(selectNextSequenceDay({ paused: false, days: [
    day('later', 1, 'pending'), day('next', 2, 'pending'),
  ] }), 'later');
});

test('server suggestion mismatch is rejected instead of falling back to another day', () => {
  const state = {
    programId: 'program', revision: 2, paused: false, nextStableDayId: 'wrong',
    days: [day('actual', 1, 'pending')],
    counts: { completed: 0, partial: 0, skipped: 0, pending: 1, rest: 0, replacedWithRest: 0 },
  };
  assert.throws(() => parseProgramSequenceState(state), /inconsistent/);
});
