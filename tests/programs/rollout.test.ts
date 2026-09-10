import assert from 'node:assert/strict';
import test from 'node:test';

import { requireRollout } from '../../features/kernel/rollout';

test('disabled atomic program installation fails with actionable recovery text', () => {
  assert.throws(
    () => requireRollout(false, 'Atomic program installation'),
    /Atomic program installation is not enabled for this build\. Your existing data has not been changed\./,
  );
});

test('enabled atomic program installation passes the rollout guard', () => {
  assert.doesNotThrow(() => requireRollout(true, 'Atomic program installation'));
});
