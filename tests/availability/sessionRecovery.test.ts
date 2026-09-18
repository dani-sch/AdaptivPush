import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionRecovery, type LocalSession } from '../../features/auth/sessionRecovery';
import { backendConfigurationIssue } from '../../features/auth/backendConfiguration';

const session = (id = 'owner-a'): LocalSession => ({ user: { id }, expires_at: 200 });
const offline = { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed: UnexpectedException: Could not connect to the server. (at ExpoModulesCore/Promise.swift:56)' };
test('native refresh failure and null INITIAL_SESSION preserve local ownership without authorizing writes', async () => {
  let error: unknown = offline;
  const recovery = createSessionRecovery({ now: () => 100_000, persistedOwner: async () => 'owner-a',
    getSession: async () => ({ data: { session: error ? null : session() }, error }), changed: () => {} });
  recovery.event('INITIAL_SESSION', null);
  assert.equal(recovery.snapshot().phase, 'hydrating');
  await recovery.retry();
  assert.equal(recovery.snapshot().phase, 'recovering');
  assert.equal(recovery.snapshot().ownerId, 'owner-a');
  recovery.event('INITIAL_SESSION', null);
  assert.equal(recovery.snapshot().ownerId, 'owner-a');
  error = null;
  await recovery.retry();
  assert.equal(recovery.snapshot().phase, 'ready');
});
test('a failed refresh of a mounted workout does not sign out; expired credentials never become ready', async () => {
  const recovery = createSessionRecovery({ now: () => 300_000, persistedOwner: async () => 'owner-a',
    getSession: async () => { throw offline; }, changed: () => {} });
  recovery.event('SIGNED_IN', session());
  assert.equal(recovery.snapshot().phase, 'recovering');
  await recovery.retry();
  assert.equal(recovery.snapshot().ownerId, 'owner-a');
  recovery.event('SIGNED_OUT', null);
  assert.equal(recovery.snapshot().ownerId, null);
  assert.equal(recovery.snapshot().phase, 'signed_out');
});
test('an older hydration result cannot expose the previous account after sign-in or sign-out', async () => {
  let finish!: (result: { data: { session: LocalSession }; error: null }) => void;
  const recovery = createSessionRecovery({ now: () => 100_000, persistedOwner: async () => 'owner-a',
    getSession: () => new Promise(resolve => { finish = resolve; }), changed: () => {} });
  const pending = recovery.retry();
  await Promise.resolve();
  recovery.event('SIGNED_IN', session('owner-b'));
  finish({ data: { session: session() }, error: null });
  await pending;
  assert.equal(recovery.snapshot().ownerId, 'owner-b');
  recovery.event('SIGNED_OUT', null);
  assert.equal(recovery.snapshot().ownerId, null);
});
test('invalid refresh credentials require reauthentication, distinct from network failure', async () => {
  const recovery = createSessionRecovery({ persistedOwner: async () => 'owner-a',
    getSession: async () => ({ data: { session: null }, error: { code: 'refresh_token_not_found' } }), changed: () => {} });
  await recovery.retry();
  assert.equal(recovery.snapshot().phase, 'signed_out');
  assert.equal(recovery.snapshot().ownerId, null);
});
test('native loopback test configuration is blocked without breaking browser or LAN QA', () => {
  for (const url of ['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321']) {
    assert.match(backendConfigurationIssue(url, 'ios')!, /hosted Expo server/);
    assert.equal(backendConfigurationIssue(url, 'web'), null);
  }
  assert.equal(backendConfigurationIssue('https://thfxcvxcsfvrzdysdnkq.supabase.co', 'ios'), null);
  assert.equal(backendConfigurationIssue('http://192.168.1.2:54330', 'ios'), null);
});
