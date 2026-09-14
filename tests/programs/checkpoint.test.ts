import assert from 'node:assert/strict';
import test from 'node:test';
import { checkpointWeek } from '../../features/programs/checkpoint';

test('exact resume ignores time archived while preserving the original start date', () => {
  const checkpoint = { resumedOn: '2026-09-14', elapsedDays: 6 };
  assert.equal(checkpointWeek('2026-08-25', 4, checkpoint, '2026-09-14'), 1);
  assert.equal(checkpointWeek('2026-08-25', 4, checkpoint, '2026-09-15'), 2);
});
test('legacy week and invalid checkpoint metadata have bounded fallback', () => {
  assert.equal(checkpointWeek('2026-09-01', 4, null, '2026-09-14'), 2);
  assert.equal(checkpointWeek(null, 4, { resumedOn: 'bad', elapsedDays: 6 }, '2026-09-14'), 1);
  assert.equal(checkpointWeek('2026-09-01', 4, { resumedOn: '2026-09-14', elapsedDays: 14 }, '2026-09-14'), 3);
});
