import { createOperationId, type OperationId } from '../kernel/operationId';
import { asRevision, nextRevision, type Revision } from '../kernel/revisions';

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
  revisionId: string;
  programDayId: string;
  workoutName: string;
  slots: readonly FrozenPrescriptionSlot[];
}

export interface WorkoutActualSet extends FrozenPrescriptionSet {
  actualExerciseId: string;
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
  requiresRecalibration: boolean;
  sets: WorkoutActualSet[];
}

export interface WorkoutDraft {
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
      requiresRecalibration: false,
      sets: slot.sets.map((set) => ({
        ...structuredClone(set),
        actualExerciseId: slot.prescribedExerciseId,
        actualReps: null,
        actualLoad: null,
        actualRpe: null,
        logged: false,
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
    logged?: boolean;
    loggedAt?: string | null;
    enteredLoadText?: string;
    enteredRepsText?: string;
    enteredRpeText?: string;
  },
): WorkoutDraft {
  let found = false;
  const slots = draft.slots.map((slot) => ({
    ...slot,
    sets: slot.sets.map((set) => {
      if (set.setId !== update.setId) return set;
      found = true;
      return {
        ...set,
        actualReps: update.reps === undefined ? set.actualReps : update.reps,
        actualLoad: update.load === undefined ? set.actualLoad : update.load,
        actualRpe: update.rpe === undefined ? set.actualRpe : update.rpe,
        logged: update.logged === undefined ? set.logged : update.logged,
        loggedAt: update.loggedAt === undefined ? set.loggedAt : update.loggedAt,
        enteredLoadText: update.enteredLoadText === undefined ? set.enteredLoadText : update.enteredLoadText,
        enteredRepsText: update.enteredRepsText === undefined ? set.enteredRepsText : update.enteredRepsText,
        enteredRpeText: update.enteredRpeText === undefined ? set.enteredRpeText : update.enteredRpeText,
      };
    }),
  }));
  if (!found) throw new Error('Stable set identity was not found in this draft.');
  return { ...draft, revision: nextRevision(draft.revision), slots };
}

export function amendWorkoutExercise(
  draft: WorkoutDraft,
  amendment: { slotId: string; replacementExerciseId: string; replacementName?: string; amendedAt: string },
): WorkoutDraft {
  let found = false;
  const slots = draft.slots.map((slot) => {
    if (slot.slotId !== amendment.slotId) return slot;
    found = true;
    return {
      ...slot,
      actualExerciseId: amendment.replacementExerciseId,
      replacementExerciseName: amendment.replacementName,
      requiresRecalibration: true,
      sets: slot.sets.map((set) =>
        set.logged
          ? set
          : {
              ...set,
              actualExerciseId: amendment.replacementExerciseId,
              actualLoad: null,
              loadKind: 'unknown' as const,
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

export function confirmWorkoutRecalibration(draft: WorkoutDraft, slotId: string): WorkoutDraft {
  const slot = draft.slots.find((candidate) => candidate.slotId === slotId);
  if (!slot) throw new Error('Stable prescription slot was not found in this draft.');
  if (!slot.requiresRecalibration) return draft;
  const replacementSets = slot.sets.filter(
    (set) => !set.logged && set.actualExerciseId === slot.actualExerciseId,
  );
  if (replacementSets.some((set) => set.actualLoad === null && set.loadKind !== 'bodyweight')) {
    throw new Error('Enter a replacement load for every remaining set before confirming recalibration.');
  }
  return {
    ...draft,
    revision: nextRevision(draft.revision),
    slots: draft.slots.map((candidate) =>
      candidate.slotId === slotId ? { ...candidate, requiresRecalibration: false } : candidate,
    ),
  };
}

export function applyWorkoutRecalibrationLoad(
  draft: WorkoutDraft,
  slotId: string,
  load: number,
): WorkoutDraft {
  if (!Number.isFinite(load) || load < 0) {
    throw new Error('Replacement load must be a nonnegative number.');
  }
  const slot = draft.slots.find((candidate) => candidate.slotId === slotId);
  if (!slot) throw new Error('Stable prescription slot was not found in this draft.');
  if (!slot.requiresRecalibration) return draft;

  const next = {
    ...draft,
    revision: nextRevision(draft.revision),
    slots: draft.slots.map((candidate) => candidate.slotId !== slotId
      ? candidate
      : {
          ...candidate,
          requiresRecalibration: false,
          sets: candidate.sets.map((set) => set.logged || set.actualExerciseId !== candidate.actualExerciseId
            ? set
            : {
                ...set,
                actualLoad: load,
                enteredLoadText: String(load),
                loadKind: 'external' as const,
                loadUnit: 'lb' as const,
                loadSide: 'external_total' as const,
              }),
        }),
  };
  return next;
}

export function classifyWorkoutCompletion(draft: WorkoutDraft): WorkoutCompletionClass {
  const sets = draft.slots.flatMap((slot) => slot.sets);
  const logged = sets.filter((set) => set.logged).length;
  if (logged === 0) return 'abandoned';
  if (logged === sets.length && draft.slots.every((slot) => !slot.requiresRecalibration)) {
    return 'complete';
  }
  return 'partial';
}

export function validateWorkoutDraft(draft: WorkoutDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.ownerId || !draft.programDayId || !draft.prescriptionRevisionId) {
    errors.push('Owner, program day, and prescription revision identity are required.');
  }
  const setIds = new Set<string>();
  for (const slot of draft.slots) {
    if (!slot.slotId || !slot.prescribedExerciseId || !slot.actualExerciseId) {
      errors.push('Every slot requires stable prescription and actual exercise identity.');
    }
    if (slot.sets.length !== slot.prescribedSetCount) {
      errors.push(`Slot ${slot.slotId || '(unknown)'} does not preserve its prescribed set count.`);
    }
    for (const set of slot.sets) {
      if (!set.setId || setIds.has(set.setId)) errors.push('Stable set identities must be present and unique.');
      setIds.add(set.setId);
      if (set.logged && (!Number.isInteger(set.actualReps) || (set.actualReps ?? 0) <= 0)) {
        errors.push(`Logged set ${set.setId} requires positive integer reps.`);
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
