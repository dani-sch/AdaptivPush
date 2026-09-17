import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { readRemovalCapability } from '@/features/workouts/removalRepository';
import { checkingRemovals, type RemovalCapability } from '@/features/workouts/removalCapability';

export function useRemovalCapability() {
  const auth = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ owner: string | null; value: RemovalCapability }>({ owner: null, value: checkingRemovals });
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setResult({ owner: auth.ownerId, value: checkingRemovals });
      if (!auth.canRequest) return;
      const value = await readRemovalCapability();
      if (active) setResult({ owner: auth.ownerId, value });
    });
    return () => { active = false; };
  }, [auth.ownerId, auth.canRequest, auth.expiresAt, attempt]);
  const capability: RemovalCapability = !auth.canRequest
    ? { status: 'failed', message: 'Reconnect or sign in to check removal support. Your drafts are preserved.' }
    : result.owner === auth.ownerId ? result.value : checkingRemovals;
  return { ...capability, retry, available: capability.status === 'available' && auth.canRequest };
}
