import type { WorkoutDraft } from './contracts';
import { nextRevision } from '../kernel/revisions';

/** Tombstones never alter original prescription positions or performance evidence. */
export interface WorkoutRemovals {
  version: 1;
  slots: string[];
  sets: { slotId: string; setId: string; order: number }[];
}
export interface ProgramRemovalRequest {
  programId: string;
  expectedRevision: number;
  expectedRevisionId: string;
  currentStableDayId: string;
  targets: { slotId: string; order: number | null }[];
}
export const emptyRemovals = (): WorkoutRemovals => ({ version: 1, slots: [], sets: [] });
export function isRemoved(removals: WorkoutRemovals | undefined, slotId: string, setId?: string): boolean {
  return Boolean(removals?.slots.includes(slotId) || (setId && removals?.sets.some(s => s.slotId === slotId && s.setId === setId)));
}
export function appendRemoval(removals: WorkoutRemovals | undefined, slotId: string, set?: { setId: string; order: number }): WorkoutRemovals {
  const next = structuredClone(removals ?? emptyRemovals());
  if (set) {
    if (!isRemoved(next, slotId, set.setId)) next.sets.push({ slotId, ...set });
  } else if (!next.slots.includes(slotId)) next.slots.push(slotId);
  return next;
}
export function removeDraftWork(draft: WorkoutDraft, slotId: string, setId?: string, programRemoval?: ProgramRemovalRequest): WorkoutDraft {
  if (draft.finalizationEndedAt || draft.lifecycle !== 'draft') throw new Error('Resolve synchronization before removing work.');
  const slot = draft.slots.find(s => s.slotId === slotId);
  const set = slot?.sets.find(s => s.setId === setId);
  if (!slot || (setId && !set)) throw new Error('Workout item is no longer available.');
  const removals = appendRemoval(draft.removals, slotId, set);
  return { ...draft, revision: nextRevision(draft.revision), removals, programRemoval: programRemoval ?? draft.programRemoval,
    slots: draft.slots.map(s => ({ ...s, sets: s.sets.map(row => isRemoved(removals, s.slotId, row.setId)
      ? { ...row, logged: false, outcome: 'not_attempted', actualLoad: null, actualReps: null, actualRpe: null,
        enteredLoadText: '', enteredRepsText: '', enteredRpeText: '', loggedAt: null } : row) })) };
}

export function addProgramRemoval(current: ProgramRemovalRequest | undefined, context: Omit<ProgramRemovalRequest, 'targets'>,
  target: ProgramRemovalRequest['targets'][number]): ProgramRemovalRequest {
  if (current && (current.expectedRevisionId !== context.expectedRevisionId || current.programId !== context.programId)) {
    throw new Error('The program changed. Save or resolve existing changes before removing more work.');
  }
  const targets = current?.targets ?? [];
  return { ...context, targets: targets.some(t => t.slotId === target.slotId && t.order === target.order) ? targets : [...targets, target] };
}
