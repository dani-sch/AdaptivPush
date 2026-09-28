export interface ProgramSequenceDay {
  stableDayId: string;
  position: number;
  originalKind: 'workout' | 'rest';
  status: 'pending' | 'skipped' | 'replaced_with_rest' | 'rest' | 'completed' | 'partial';
  sessionId: string | null;
  actualCompletionClass: string | null;
}

export interface ProgramSequenceState {
  programId: string;
  revision: number;
  paused: boolean;
  nextStableDayId: string | null;
  days: ProgramSequenceDay[];
  counts: { completed: number; partial: number; skipped: number; pending: number;
    replacedWithRest: number; rest: number };
}

export function selectNextSequenceDay(state: Pick<ProgramSequenceState, 'days' | 'paused'>): string | null {
  if (state.paused) return null;
  return [...state.days].sort((left, right) => left.position - right.position)
    .find(day => day.originalKind === 'workout' && day.status === 'pending'
      && day.sessionId === null)?.stableDayId ?? null;
}

export function parseProgramSequenceState(value: unknown): ProgramSequenceState {
  if (!value || typeof value !== 'object') throw new Error('Program sequence is unavailable.');
  const state = value as Partial<ProgramSequenceState>;
  if (typeof state.programId !== 'string' || !Number.isInteger(state.revision)
    || typeof state.paused !== 'boolean' || !Array.isArray(state.days)
    || !state.counts || typeof state.counts !== 'object'
    || !['completed', 'partial', 'skipped', 'pending', 'replacedWithRest', 'rest']
      .every(name => Number.isInteger(state.counts?.[name as keyof typeof state.counts]))
    || !state.days.every(day => day && typeof day.stableDayId === 'string'
      && Number.isInteger(day.position) && day.position > 0
      && ['pending', 'skipped', 'replaced_with_rest', 'rest', 'completed', 'partial'].includes(day.status)
      && (day.originalKind === 'workout' || day.originalKind === 'rest'))) {
    throw new Error('Program sequence response is invalid.');
  }
  if ((state.nextStableDayId ?? null) !== selectNextSequenceDay(state as ProgramSequenceState)) {
    throw new Error('Program sequence suggestion is inconsistent.');
  }
  return state as ProgramSequenceState;
}
