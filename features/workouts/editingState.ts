import type { WorkoutDraft } from './contracts';
import { validateWorkoutDraft } from './contracts';

/** Synchronous authority for event bursts; hydration may only fill an empty target. */
export function createWorkoutEditingState() {
  let target = '';
  let current: WorkoutDraft | null = null;
  const restoring = new Map<string, Promise<WorkoutDraft | null>>();
  return {
    select(key: string) { if (target !== key) { target = key; current = null; } },
    read: () => current,
    isTarget: (key: string) => target === key,
    restore(key: string, load: () => Promise<WorkoutDraft | null>): Promise<WorkoutDraft | null> {
      const existing = restoring.get(key);
      if (existing) return existing;
      const request = load().finally(() => { if (restoring.get(key) === request) restoring.delete(key); });
      restoring.set(key, request);
      return request;
    },
    replace(value: WorkoutDraft | null) { current = value; return value; },
    hydrate(key: string, value: WorkoutDraft): boolean {
      if (target !== key || current !== null) return false;
      current = value; return true;
    },
  };
}

/** Every entry/retry recovers pending operations, even if an earlier run installed
 * the draft before being cancelled. Recovery never replaces current user edits. */
export async function resolveWorkoutEditingSession<Recovery>(input: {
  state: ReturnType<typeof createWorkoutEditingState>;
  key: string;
  isCurrent: () => boolean;
  load: () => Promise<WorkoutDraft | null>;
  matches: (draft: WorkoutDraft) => boolean;
  completedSessionId?: string;
  recover: (draft: WorkoutDraft) => Promise<Recovery>;
  installed: (draft: WorkoutDraft) => void;
}): Promise<
  | { status: 'cancelled' }
  | { status: 'waiting' }
  | { status: 'completed'; sessionId: string }
  | { status: 'ready'; recovery: Recovery }
> {
  const current = () => input.isCurrent() && input.state.isTarget(input.key);
  if (!current()) return { status: 'cancelled' };
  if (input.completedSessionId) return { status: 'completed', sessionId: input.completedSessionId };
  let draft = input.state.read() ?? await input.state.restore(input.key, input.load);
  // A refresh may have joined a read started before the program became available.
  if (!draft && current()) draft = await input.state.restore(input.key, input.load);
  if (!current()) return { status: 'cancelled' };
  if (!draft) return { status: 'waiting' };
  if (!input.matches(draft)) throw new Error('This draft does not match the requested workout and account.');
  const validation = validateWorkoutDraft(draft, false);
  if (!validation.ok) throw new Error(`Stored workout draft is invalid. ${validation.errors.join(' ')}`);
  if (draft.finalizedReceipt?.sessionId) return { status: 'completed', sessionId: draft.finalizedReceipt.sessionId };
  if (input.state.hydrate(input.key, draft)) input.installed(draft);
  const recovery = await input.recover(input.state.read()!);
  if (!current()) return { status: 'cancelled' };
  return { status: 'ready', recovery };
}

export function parseEntry(text: string): number | null {
  // Partial text stays in the draft, never NaN (which JSON would turn into null).
  if (!/^\d+(?:\.\d*)?$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
