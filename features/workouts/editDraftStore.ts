import type { OccurrenceExercise } from './effectiveOccurrence';
import type { EditableCorrectionSet } from './correctionEditor';
import type { ProgramRemovalRequest, WorkoutRemovals } from './removals';

export interface WorkoutEditDraft {
  ownerId: string;
  sessionId: string;
  revision: number;
  exercises: (Omit<OccurrenceExercise, 'sets'> & { sets: EditableCorrectionSet[] })[];
  removals?: WorkoutRemovals;
  programRemoval?: ProgramRemovalRequest;
}
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> }
/** Unsubmitted text is separate from the immutable pending submission. */
export function createWorkoutEditDraftStore(storage: Storage) {
  let queue: Promise<unknown> = Promise.resolve();
  const key = (owner: string, session: string) => {
    if (!owner || !session) throw new Error('Account and workout identity are required.');
    return `@adaptivpush/workout-edit-drafts/v1/${owner}/${session}`;
  };
  return {
    async load(owner: string, session: string): Promise<WorkoutEditDraft | null> {
      await queue;
      const value = await storage.getItem(key(owner, session));
      if (!value) return null;
      const draft = JSON.parse(value) as WorkoutEditDraft;
      if (draft.ownerId !== owner || draft.sessionId !== session) throw new Error('Workout edits belong to another account.');
      return draft;
    },
    save(draft: WorkoutEditDraft) {
      const serialized = JSON.stringify(draft);
      const next = queue.catch(() => undefined).then(() => storage.setItem(key(draft.ownerId, draft.sessionId), serialized));
      queue = next;
      return next;
    },
    remove(owner: string, session: string) {
      const next = queue.catch(() => undefined).then(() => storage.removeItem(key(owner, session)));
      queue = next;
      return next;
    },
  };
}
