import { createOperationId, type OperationId } from '../kernel/operationId';
import { asRevision, nextRevision, type Revision } from '../kernel/revisions';

import { isRemoved, type WorkoutRemovals, type ProgramRemovalRequest } from './removals';

export const WORKOUT_SCHEMA_VERSION = 2 as const;
export const WORKOUT_POLICY_VERSION = 'workout-finalize-v2' as const;

export type WorkoutDraftLifecycle =
  | 'draft'
  | 'finalizing'
  | 'finalized'
  | 'conflict'
  | 'failed';
export type WorkoutCompletionClass =
  | 'complete'
  | 'reduced'
  | 'partial'
  | 'abandoned'
  | 'legacy_unknown';
export type LoadKind = 'external' | 'bodyweight' | 'assistance' | 'unknown';
export type LoadUnit = 'lb' | 'kg' | 'none';
export type LoadSide = 'external_total' | 'per_hand' | 'combined' | 'unilateral' | 'unknown';
export type SetOutcome = 'performed' | 'skipped' | 'not_attempted';

export interface FrozenPrescriptionSet {
  setId: string;
  order: number;
  plannedRepsMin: number;
  plannedRepsMax: number;
  plannedLoad: number | null;
  loadKind: LoadKind;
  loadUnit: LoadUnit;
  loadSide: LoadSide;
}

export interface FrozenPrescriptionSlot {
  slotId: string;
  prescribedExerciseId: string;
  exerciseName?: string;
  order: number;
  prescribedSetCount: number;
  sets: FrozenPrescriptionSet[];
}

export interface FrozenWorkoutPrescription {
  removals?: WorkoutRemovals;
  revisionId: string;
  programDayId: string;
  workoutName: string;
  slots: readonly FrozenPrescriptionSlot[];
  effectiveSlots?: WorkoutDraftSlot[];
  setOutcomes?: { setId: string; slotId: string; order: number; outcome: SetOutcome }[];
}

export interface WorkoutActualSet extends FrozenPrescriptionSet {
  outcome?: SetOutcome;
  actualExerciseId: string;
  actualExerciseName?: string;
  actualReps: number | null;
  actualLoad: number | null;
  actualRpe: number | null;
  logged: boolean;
  loggedAt: string | null;
  enteredLoadText: string;
  enteredRepsText: string;
  enteredRpeText: string;
}

export interface WorkoutDraftSlot {
  slotId: string;
  prescribedExerciseId: string;
  exerciseName?: string;
  replacementExerciseName?: string;
  actualExerciseId: string;
  order: number;
  prescribedSetCount: number;
  loadSuggestion?: { value: number; unit: 'lb' | 'kg'; kind: 'external' | 'assistance'; side: LoadSide };
  sets: WorkoutActualSet[];
}

export interface WorkoutDraft {
  removals?: WorkoutRemovals;
  programRemoval?: ProgramRemovalRequest;
  schemaVersion: typeof WORKOUT_SCHEMA_VERSION;
  policyVersion: typeof WORKOUT_POLICY_VERSION;
  ownerId: string;
  operationId: OperationId;
  draftId: string;
  revision: Revision;
  lifecycle: WorkoutDraftLifecycle;
  programId: string;
  programDayId: string;
  stableDayId: string;
  prescriptionRevisionId: string;
  workoutName: string;
  startedAt: string;
  finalizationEndedAt?: string;
  timezone: string;
  frozenPrescription: Readonly<FrozenWorkoutPrescription>;
  slots: WorkoutDraftSlot[];
  finalizedReceipt: WorkoutFinalizationReceipt | null;
  lastError: string | null;
}

export interface WorkoutFinalizationReceipt {
  sessionId: string;
  operationId: string;
  draftId: string;
  revision: number;
  completionClass: WorkoutCompletionClass;
  finalizedAt: string;
  setCount: number;
  replayed: boolean;
}

export type WorkoutCommandOutcome<T> =
  | { status: 'finalized'; receipt: T }
  | { status: 'pending'; message: string }
  | { status: 'validation'; errors: string[] }
  | { status: 'conflict'; message: string; currentRevision?: number }
  | { status: 'replay'; receipt: T }
  | { status: 'unavailable'; message: string };

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((child) => deepFreeze(child));
  }
  return value;
}

export function createWorkoutDraft(input: {
  ownerId: string;
  programId: string;
  programDayId: string;
  stableDayId: string;
  prescriptionRevisionId: string;
  workoutName: string;
  startedAt: string;
  timezone: string;
  slots: FrozenPrescriptionSlot[];
  operationId?: OperationId;
  draftId?: string;
}): WorkoutDraft {
  const frozenPrescription = deepFreeze({
    revisionId: input.prescriptionRevisionId,
    programDayId: input.programDayId,
    workoutName: input.workoutName,
    slots: structuredClone(input.slots),
  });
  return {
    schemaVersion: WORKOUT_SCHEMA_VERSION,
    policyVersion: WORKOUT_POLICY_VERSION,
    ownerId: input.ownerId,
    operationId: input.operationId ?? createOperationId(),
    draftId: input.draftId ?? createOperationId(),
    revision: asRevision(1),
    lifecycle: 'draft',
    programId: input.programId,
    programDayId: input.programDayId,
    stableDayId: input.stableDayId,
    prescriptionRevisionId: input.prescriptionRevisionId,
    workoutName: input.workoutName.trim() || 'Workout',
    startedAt: input.startedAt,
    timezone: input.timezone,
    frozenPrescription,
    slots: input.slots.map((slot) => ({
      ...structuredClone(slot),
      actualExerciseId: slot.prescribedExerciseId,
      sets: slot.sets.map((set) => ({
        ...structuredClone(set),
        actualExerciseId: slot.prescribedExerciseId,
        actualExerciseName: slot.exerciseName,
        actualReps: null,
        actualLoad: null,
        actualRpe: null,
        logged: false,
        outcome: 'not_attempted',
        loggedAt: null,
        enteredLoadText: set.plannedLoad === null ? '' : String(set.plannedLoad),
        enteredRepsText: '',
        enteredRpeText: '',
      })),
    })),
    finalizedReceipt: null,
    lastError: null,
  };
}

export function updateWorkoutSet(
  draft: WorkoutDraft,
  update: {
    setId: string;
    reps?: number | null;
    load?: number | null;
    rpe?: number | null;
    loadKind?: LoadKind;
    loadUnit?: LoadUnit;
    actualExerciseId?: string;
    actualExerciseName?: string;
    logged?: boolean;
    outcome?: SetOutcome;
    loggedAt?: string | null;
    enteredLoadText?: string;
    enteredRepsText?: string;
    enteredRpeText?: string;
  },
): WorkoutDraft {
  requireEditableWorkout(draft);
  let found = false;
  const slots = draft.slots.map((slot) => ({
    ...slot,
    sets: slot.sets.map((set) => {
      if (set.setId !== update.setId) return set;
      if (isRemoved(draft.removals, slot.slotId, set.setId)) throw new Error('This set was removed.');
      found = true;
      const next = {
        ...set,
        actualReps: update.reps === undefined ? set.actualReps : update.reps,
        actualLoad: update.load === undefined ? set.actualLoad : update.load,
        actualExerciseId: update.actualExerciseId ?? set.actualExerciseId,
        actualExerciseName: update.actualExerciseName ?? set.actualExerciseName,
        loadKind: update.loadKind ?? (update.load != null && set.loadKind === 'unknown' ? 'external' as const : set.loadKind),
        loadUnit: update.loadUnit ?? (update.load != null && set.loadUnit === 'none' ? 'lb' as const : set.loadUnit),
        actualRpe: update.rpe === undefined ? set.actualRpe : update.rpe,
        logged: update.logged === undefined ? set.logged : update.logged,
        loggedAt: update.loggedAt === undefined ? set.loggedAt : update.loggedAt,
        enteredLoadText: update.enteredLoadText === undefined ? set.enteredLoadText : update.enteredLoadText,
        enteredRepsText: update.enteredRepsText === undefined ? set.enteredRepsText : update.enteredRepsText,
        enteredRpeText: update.enteredRpeText === undefined ? set.enteredRpeText : update.enteredRpeText,
      };
      const editing = update.enteredLoadText !== undefined || update.enteredRepsText !== undefined
        || update.enteredRpeText !== undefined || update.reps !== undefined || update.load !== undefined || update.rpe !== undefined;
      next.outcome = update.outcome ?? (update.logged === undefined
        ? editing && set.outcome === 'skipped' ? 'not_attempted' : set.outcome ?? (set.logged ? 'performed' : 'not_attempted')
        : update.logged ? 'performed' : 'not_attempted');
      next.logged = next.outcome === 'performed';
      if (update.outcome === 'skipped') {
        next.actualReps = null;
        next.actualLoad = null;
        next.actualRpe = null;
        next.enteredLoadText = '';
        next.enteredRepsText = '';
        next.enteredRpeText = '';
        next.loggedAt = null;
      }
      if (update.loadKind === 'bodyweight') { next.actualLoad = null; next.enteredLoadText = ''; next.loadUnit = 'none'; }
      if (next.logged && update.logged === true) {
        if (!Number.isInteger(next.actualReps) || (next.actualReps ?? 0) <= 0) {
          throw new Error('Enter positive whole-number reps before logging this set.');
        }
        if ((next.loadKind === 'external' || next.loadKind === 'assistance') && next.actualLoad === null) {
          throw new Error(`Enter the ${next.loadKind === 'assistance' ? 'assistance' : 'load'} before logging this set.`);
        }
      }
      return next;
    }),
  }));
  if (!found) throw new Error('Stable set identity was not found in this draft.');
  return { ...draft, revision: nextRevision(draft.revision), slots };
}

export function amendWorkoutExercise(
  draft: WorkoutDraft,
  amendment: {
    slotId: string;
    replacementExerciseId: string;
    replacementName?: string;
    amendedAt: string;
    loadSuggestion?: WorkoutDraftSlot['loadSuggestion'];
    replacementLoadKind?: LoadKind;
  },
): WorkoutDraft {
  requireEditableWorkout(draft);
  let found = false;
  const slots = draft.slots.map((slot) => {
    if (slot.slotId !== amendment.slotId) return slot;
    found = true;
    return {
      ...slot,
      actualExerciseId: amendment.replacementExerciseId,
      replacementExerciseName: amendment.replacementName,
      loadSuggestion: amendment.loadSuggestion,
      sets: slot.sets.map((set) =>
        set.logged
          ? set
          : {
              ...set,
              actualExerciseId: amendment.replacementExerciseId,
              actualExerciseName: amendment.replacementName,
              actualLoad: null,
              enteredLoadText: '',
              loadKind: amendment.replacementLoadKind ?? 'unknown' as const,
              loadUnit: 'none' as const,
              loadSide: 'unknown' as const,
              loggedAt: null,
            },
      ),
    };
  });
  if (!found) throw new Error('Stable prescription slot was not found in this draft.');
  return { ...draft, revision: nextRevision(draft.revision), slots };
}

export function classifyWorkoutCompletion(draft: WorkoutDraft): WorkoutCompletionClass {
  const sets = draft.slots.flatMap((slot) => slot.sets);
  const logged = sets.filter((set) => set.logged).length;
  if (logged === 0) return 'abandoned';
  if (draft.frozenPrescription.slots.every(slot => slot.sets.every(required =>
    draft.slots.find(s => s.slotId === slot.slotId)?.sets.some(set => set.setId === required.setId && set.logged)))) {
    return 'complete';
  }
  return 'partial';
}

function requireEditableWorkout(draft: WorkoutDraft): void {
  if (draft.finalizationEndedAt || draft.lifecycle === 'finalized' || draft.lifecycle === 'finalizing') {
    throw new Error('This workout has been submitted. Retry synchronization before making changes.');
  }
}

export function validateWorkoutDraft(draft: WorkoutDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.ownerId || !draft.programDayId || !draft.prescriptionRevisionId) {
    errors.push('Owner, program day, and prescription revision identity are required.');
  }
  if (draft.slots.length === 0) {
    errors.push('Workout draft must contain at least one exercise slot.');
  }
  const setIds = new Set<string>();
  const slotIds = new Set<string>();
  for (const slot of draft.slots) {
    if (slotIds.has(slot.slotId)) errors.push('Stable exercise identities must be unique.');
    slotIds.add(slot.slotId);
    if (!slot.slotId || !slot.prescribedExerciseId || !slot.actualExerciseId) {
      errors.push('Every slot requires stable prescription and actual exercise identity.');
    }
    if (slot.sets.length < slot.prescribedSetCount) {
      errors.push(`Slot ${slot.slotId || '(unknown)'} does not preserve its prescribed set count.`);
    }
    for (const set of slot.sets) {
      const label = `${slot.replacementExerciseName ?? slot.exerciseName ?? 'Exercise'}, set ${set.order}`;
      if (set.logged) {
        for (const [field, raw] of [['load', set.enteredLoadText], ['reps', set.enteredRepsText], ['RPE', set.enteredRpeText]]) {
          if (raw && !/^\d+(?:\.\d*)?$/.test(raw.trim())) errors.push(`${label}: enter a valid ${field}.`);
        }
      }
      if (!set.setId || setIds.has(set.setId)) errors.push('Stable set identities must be present and unique.');
      setIds.add(set.setId);
      if (set.logged && (!Number.isInteger(set.actualReps) || (set.actualReps ?? 0) <= 0)) {
        errors.push(`${label}: enter positive whole-number reps.`);
      }
      if (set.logged && (set.loadKind === 'external' || set.loadKind === 'assistance') && (set.actualLoad === null || set.loadUnit === 'none')) {
        errors.push(`${label}: enter a load and measurement unit.`);
      }
      if (set.actualLoad !== null && (!Number.isFinite(set.actualLoad) || set.actualLoad < 0)) {
        errors.push(`Set ${set.setId} has an invalid actual load.`);
      }
      if (set.actualRpe !== null && (!Number.isFinite(set.actualRpe) || set.actualRpe < 0 || set.actualRpe > 10)) {
        errors.push(`Set ${set.setId} has an invalid RPE.`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function workoutFinalizationPayload(draft: WorkoutDraft, endedAt: string): Record<string, unknown> {
  const started = new Date(draft.startedAt).getTime();
  const ended = new Date(endedAt).getTime();
  return {
    operationId: draft.operationId,
    draftId: draft.draftId,
    schemaVersion: draft.schemaVersion,
    policyVersion: draft.policyVersion,
    revision: draft.revision,
    programDayId: draft.programDayId,
    prescriptionRevisionId: draft.prescriptionRevisionId,
    workoutName: draft.workoutName,
    startedAt: draft.startedAt,
    endedAt,
    durationMin: Math.max(0, Math.round((ended - started) / 60_000)),
    timezone: draft.timezone,
    frozenPrescription: { ...draft.frozenPrescription, effectiveSlots: draft.slots, removals: draft.removals },
    removals: draft.removals,
    programRemoval: draft.programRemoval,
    slots: draft.slots,
  };
}
