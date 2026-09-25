import { useCallback, useEffect, useRef, useState } from 'react';

import { createScheduleRepository, selectScheduleToday, type ScheduleRead } from '@/features/scheduling/repository';
import { scheduleOperationStore } from '@/features/scheduling/operationStore';
import { classifySupabaseError, reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';
import { supabase } from '@/utils/supabase';

const repository = createScheduleRepository(supabase);

interface ScopedSchedule {
  ownerId: string;
  programId: string;
  read: ScheduleRead;
  pending: boolean;
}

export function useProgramSchedule(ownerId: string | null, programId: string | null) {
  const [result, setResult] = useState<ScopedSchedule | null>(null);
  const [today, setToday] = useState(() => new Date());
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (!ownerId || !programId) return;
    try {
      const operation = await scheduleOperationStore.load(ownerId, programId);
      if (request !== generation.current) return;
      setToday(new Date());
      setResult(null);
      if (operation) {
        setResult({ ownerId, programId, pending: true,
          read: { state: 'conflict', reason: 'A schedule change is pending reconciliation. Its exact request is saved; do not replace it.' } });
        return;
      }
      const read = await repository.read(ownerId, programId);
      if (request === generation.current) setResult({ ownerId, programId, read, pending: false });
    } catch (error) {
      if (request !== generation.current) return;
      reportSupabaseFailure('schedule.read', error);
      const failure = classifySupabaseError(error);
      const read: ScheduleRead = failure.category === 'conflict' || failure.category === 'validation'
        ? { state: 'conflict', reason: 'Schedule data needs reconciliation before it can be displayed.' }
        : { state: 'unavailable', reason: supabaseUserMessage(error, 'Dated schedule could not be checked. Try again.') };
      setResult({ ownerId, programId, read, pending: false });
    }
  }, [ownerId, programId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return refresh();
    });
    return () => { active = false; generation.current += 1; };
  }, [refresh]);

  const scoped = result?.ownerId === ownerId && result?.programId === programId ? result : null;
  return {
    read: scoped?.read ?? null,
    today: scoped ? selectScheduleToday(scoped.read, today) : null,
    pending: scoped?.pending ?? false,
    refresh,
  };
}
