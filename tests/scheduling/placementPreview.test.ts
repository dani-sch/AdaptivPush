import assert from 'node:assert/strict';
import test from 'node:test';

import { createOperationId } from '../../features/kernel/operationId';
import {
  buildCreateProgramSchedulePayload,
  type PlacementPreviewInput,
  type ProgramDayIdentity,
} from '../../features/scheduling/placementPreview';

function fixture(): PlacementPreviewInput {
  const revision = createOperationId();
  const first: ProgramDayIdentity = {
    id: createOperationId(), stable_day_id: createOperationId(), program_revision_id: revision,
    week_number: 1, day_index: 1, is_rest_day: false, program_day_exercises: [{ set_count: 3 }],
  };
  const second: ProgramDayIdentity = {
    ...first, id: createOperationId(), stable_day_id: createOperationId(), day_index: 3,
  };
  return {
    programId: createOperationId(), expectedProgramRevisionId: revision, durationWeeks: 2,
    timezone: 'America/New_York', uncompletedProgramDays: [first, second],
    explicitPlacements: [
      { occurrenceId: createOperationId(), programDayId: first.id, localDate: '2026-11-01' },
      { occurrenceId: createOperationId(), programDayId: second.id, localDate: '2026-11-03' },
    ],
  };
}

test('generated and manual no-rest programs require explicit workout dates', () => {
  for (const source of ['generated', 'manual']) {
    const input = fixture();
    const payload = buildCreateProgramSchedulePayload(input);
    assert.equal(payload.expectedRevision, 0, source);
    assert.equal(payload.days.length, 2, source);
    assert.equal(payload.days.some((day) => 'kind' in day), false);
    assert.throws(() => buildCreateProgramSchedulePayload({
      ...input, explicitPlacements: input.explicitPlacements.slice(0, 1),
    }), /every uncompleted/);
  }
});

test('explicit program rest and optional schedule-owned rest keep separate identity', () => {
  const input = fixture();
  const rest: ProgramDayIdentity = {
    ...input.uncompletedProgramDays[0], id: createOperationId(), stable_day_id: createOperationId(),
    is_rest_day: true, day_index: 2, program_day_exercises: [],
  };
  const extra = { occurrenceId: createOperationId(), kind: 'rest' as const, cycleWeek: 1, localDate: '2026-11-04' };
  const payload = buildCreateProgramSchedulePayload({
    ...input,
    uncompletedProgramDays: [...input.uncompletedProgramDays, rest],
    explicitPlacements: [
      ...input.explicitPlacements, { occurrenceId: createOperationId(), programDayId: rest.id, localDate: '2026-11-02' }, extra,
    ],
  });
  assert.deepEqual(payload.days[3], extra);
  assert.equal(payload.days.length, 4);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, explicitPlacements: [...input.explicitPlacements, { ...extra, cycleWeek: 3 }],
  }), /Extra rest/);
});

test('existing program never derives historical dates and completed ancestors must be excluded by loader', () => {
  const input = fixture();
  const onlyRemaining = {
    ...input, uncompletedProgramDays: input.uncompletedProgramDays.slice(1),
    explicitPlacements: input.explicitPlacements.slice(1),
  };
  assert.equal(buildCreateProgramSchedulePayload(onlyRemaining).days.length, 1);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...onlyRemaining, explicitPlacements: input.explicitPlacements,
  }), /uncompleted current program day/);
});

test('rejects missing, duplicate and invalid dates or identities', () => {
  const input = fixture();
  const [first, second] = input.explicitPlacements;
  const firstDate = '2026-11-01';
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, explicitPlacements: [first, { ...second, localDate: firstDate }],
  }), /unique/);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, explicitPlacements: [first, { ...second, occurrenceId: first.occurrenceId }],
  }), /unique/);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, explicitPlacements: [first, { ...second, localDate: '' }],
  }), /LocalDate/);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, timezone: 'Factory',
  }), /timezone/);
});

test('schema-v1 empty non-rest remains explicitly unplaced, never a dated workout or rest', () => {
  const input = fixture();
  const emptyDay = { ...input.uncompletedProgramDays[0], program_day_exercises: [], program_schema_version: 1 };
  const unplaced = {
    occurrenceId: input.explicitPlacements[0].occurrenceId, programDayId: emptyDay.id,
    kind: 'workout' as const, status: 'unplaced' as const,
    reason: 'Legacy workout has no recorded prescription; original date is unknown.',
  };
  const payload = buildCreateProgramSchedulePayload({
    ...input, uncompletedProgramDays: [emptyDay, input.uncompletedProgramDays[1]],
    explicitPlacements: [unplaced, input.explicitPlacements[1]],
  });
  assert.deepEqual(payload.days[0], unplaced);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, uncompletedProgramDays: [emptyDay, input.uncompletedProgramDays[1]],
    explicitPlacements: input.explicitPlacements,
  }), /unknown original date/);
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input,
    uncompletedProgramDays: [emptyDay, input.uncompletedProgramDays[1]],
    explicitPlacements: [input.explicitPlacements[1], {
      occurrenceId: input.explicitPlacements[0].occurrenceId, kind: 'rest' as const,
      cycleWeek: 1, localDate: '2026-11-01',
    }],
  }), /every uncompleted/);
});

test('stale program revision is rejected before creating an operation', () => {
  const input = fixture();
  assert.throws(() => buildCreateProgramSchedulePayload({
    ...input, expectedProgramRevisionId: createOperationId(),
  }), /revision changed/);
});
