import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { workoutStructureAvailable } from '@/features/workouts/structureRepository';

export function useWorkoutStructure() {
  const auth = useAuth();
  const [attempt, retry] = useState(0);
  const [state, setState] = useState<{ owner: string | null; available: boolean; message: string }>({ owner: null, available: false, message: 'Checking workout editing support…' });
  useEffect(() => {
    let current = true;
    if (auth.canRequest) void workoutStructureAvailable().then(available => {
      if (current) setState({ owner: auth.ownerId, available, message: available ? '' : 'Exercise additions and structural edits need the prepared server update.' });
    }).catch(() => { if (current) setState({ owner: auth.ownerId, available: false, message: 'Workout editing support could not be checked. Reconnect and retry.' }); });
    return () => { current = false; };
  }, [auth.ownerId, auth.canRequest, auth.expiresAt, attempt]);
  return { available: auth.canRequest && state.owner === auth.ownerId && state.available, message: state.message, retry: () => retry(n => n + 1) };
}
