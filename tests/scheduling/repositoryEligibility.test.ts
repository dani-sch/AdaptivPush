import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createOperationId } from '../../features/kernel/operationId';
import { createScheduleRepository } from '../../features/scheduling/repository';

test('eligible placement excludes finalized ancestor lineage without dating history', async () => {
  const programId = createOperationId();
  const revision = createOperationId();
  const oldRevision = createOperationId();
  const finishedLineage = createOperationId();
  const oldDay = {
    id: createOperationId(), stable_day_id: finishedLineage, program_revision_id: oldRevision,
    week_number: 1, day_index: 1, is_rest_day: false, program_day_exercises: [],
  };
  const completedCurrent = { ...oldDay, id: createOperationId(), program_revision_id: revision };
  const remaining = {
    ...oldDay, id: createOperationId(), stable_day_id: createOperationId(),
    program_revision_id: revision, day_index: 2, program_day_exercises: [{ set_count: 2 }],
  };
  const rest = {
    ...oldDay, id: createOperationId(), stable_day_id: createOperationId(),
    program_revision_id: revision, day_index: 3, is_rest_day: true,
  };
  let remainingIsEmpty = false;
  const queries: string[] = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-a' } } }, error: null }) },
    from(table: string) {
      let currentRevision: string | null = null;
      let dayIds: string[] = [];
      const query = {
        select() { return query; },
        eq(column: string, value: string) {
          if (column === 'program_revision_id') currentRevision = value;
          return query;
        },
        in(column: string, ids: string[]) {
          assert.equal(column, 'program_day_id');
          dayIds = ids;
          return query;
        },
        order() { return query; },
        range(start: number) {
          assert.equal(start, 0);
          queries.push(table);
          const currentDays = [completedCurrent,
            remainingIsEmpty ? { ...remaining, program_day_exercises: [] } : remaining, rest];
          const data = table === 'program_days'
            ? currentRevision ? currentDays : [oldDay, ...currentDays]
            : dayIds.includes(oldDay.id) ? [{ program_day_id: oldDay.id }] : [];
          return { returns: async () => ({ data, error: null }) };
        },
        maybeSingle: async () => ({
          data: { current_revision_id: revision, duration_weeks: 1, is_active: true, lifecycle: 'active', schema_version: 1 },
          error: null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const result = await createScheduleRepository(client).loadEligibleDays('owner-a', programId);
  assert.equal(result.revisionId, revision);
  assert.deepEqual(result.days.map((day) => day.id), [remaining.id, rest.id]);
  assert.deepEqual(queries, ['program_days', 'program_days', 'workout_sessions']);
  remainingIsEmpty = true;
  const legacyEmpty = await createScheduleRepository(client).loadEligibleDays('owner-a', programId);
  assert.equal(legacyEmpty.days.find((day) => day.id === remaining.id)?.program_schema_version, 1);
  await assert.rejects(
    createScheduleRepository(client).loadEligibleDays('owner-b', programId),
    /account changed/,
  );
});
