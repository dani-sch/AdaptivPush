import assert from 'node:assert/strict';
import test from 'node:test';

import { persistedSessionOwnerId } from '../../features/auth/persistedSession';

test('offline owner recovery accepts only a complete persisted Supabase session', () => {
  const ownerId = '10000000-0000-4000-8000-000000000001';
  assert.equal(persistedSessionOwnerId(JSON.stringify({
    access_token: 'access',
    refresh_token: 'refresh',
    user: { id: ownerId },
  })), ownerId);

  assert.equal(persistedSessionOwnerId(JSON.stringify({ user: { id: ownerId } })), null);
  assert.equal(persistedSessionOwnerId(JSON.stringify({
    access_token: 'access',
    refresh_token: 'refresh',
    user: { id: '' },
  })), null);
  assert.equal(persistedSessionOwnerId('{not-json'), null);
});
