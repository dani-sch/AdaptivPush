import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('local notification producers are limited to inactivity and rest completion', () => {
  const source = readFileSync('utils/notifications.ts', 'utf8');
  assert.equal((source.match(/Notifications\.scheduleNotificationAsync\(/g) ?? []).length, 2);
  assert.match(source, /function scheduleInactivityNotification\(/);
  assert.match(source, /function scheduleRestNotification\(/);
  for (const forbidden of [
    'Workout planned for today', 'notifyPRCelebration', 'notifyDeloadWeek',
    'sendTestNotification', 'reconcileWorkoutReminders',
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});
