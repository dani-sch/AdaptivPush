import { isCatalogExerciseId } from '@/features/catalog/contracts';
import { isOperationId } from '@/features/kernel/operationId';
import { entryLoadDefaults } from './loadPresentation';

export interface AdHocDraftSet {
  setId: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  reps: string;
  loadKind: 'external' | 'bodyweight' | 'assistance' | 'unknown';
  loadValue: string;
  loadUnit: 'lb' | 'kg' | 'none';
  loadSide: 'external_total' | 'per_hand' | 'combined' | 'unilateral' | 'unknown';
  rpe: string;
}

export interface AdHocDraft {
  ownerId: string;
  draftId: string;
  workoutName: string;
  startedAt: string;
  sets: AdHocDraftSet[];
}

export interface AdHocActualSet {
  setId: string;
  exerciseId: string;
  order: number;
  reps: number;
  loadKind: AdHocDraftSet['loadKind'];
  loadValue: number | null;
  loadUnit: AdHocDraftSet['loadUnit'];
  loadSide: AdHocDraftSet['loadSide'];
  rpe: number | null;
  loggedAt: string;
}

export interface AdHocPayload {
  schemaVersion: 1;
  operationId: string;
  draftId: string;
  workoutName: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
  sets: AdHocActualSet[];
}

interface AdHocState {
  draft: AdHocDraft;
  pending: AdHocPayload | null;
}

export interface AdHocStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface AdHocGateway {
  finalize(payload: AdHocPayload): Promise<unknown>;
  session(ownerId: string, operationId: string): Promise<unknown>;
  sets(sessionId: string): Promise<unknown>;
}

export type AdHocFinishStage = 'restore' | 'freeze' | 'submit' | 'verify';

export class AdHocFinishFailure extends Error {
  readonly name = 'AdHocFinishFailure';

  constructor(readonly stage: AdHocFinishStage, readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : `Ad-hoc workout ${stage} failed.`);
  }
}

export function adHocFinishCause(error: unknown): { stage: AdHocFinishStage; cause: unknown } | null {
  return error instanceof AdHocFinishFailure ? { stage: error.stage, cause: error.cause } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = ['external', 'bodyweight', 'assistance', 'unknown'];
const UNITS = ['lb', 'kg', 'none'];
const SIDES = ['external_total', 'per_hand', 'combined', 'unilateral', 'unknown'];
const PREFIX = '@adaptivpush/ad-hoc-workout/v1';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid ad-hoc recovery record.');
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid ad-hoc recovery record.');
  return value;
}

function date(value: string): boolean {
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function numeric(value: string, label: string, optional = false): number | null {
  if (optional && value.trim() === '') return null;
  if (!/^(?:\d+)(?:\.\d+)?$/.test(value.trim())) throw new Error(`${label} must be a non-negative number.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be finite.`);
  return parsed;
}

export function createAdHocSet(exerciseId: string, exerciseName: string, order: number, id: () => string,
  equipment?: string): AdHocDraftSet {
  if (!isCatalogExerciseId(exerciseId) || !exerciseName.trim() || !Number.isSafeInteger(order) || order < 1) {
    throw new Error('Choose an exercise from the catalog.');
  }
  const normalizedEquipment = equipment?.toLowerCase().trim();
  const bodyweight = normalizedEquipment === 'bodyweight';
  const knownExternal = Boolean(normalizedEquipment && normalizedEquipment !== 'other'
    && normalizedEquipment !== 'unknown');
  const defaults = bodyweight ? entryLoadDefaults('bodyweight')
    : knownExternal ? entryLoadDefaults('external') : { loadKind: 'unknown' as const, loadUnit: 'none' as const };
  const loadSide = normalizedEquipment === 'dumbbell' ? 'per_hand' as const
    : normalizedEquipment === 'barbell' ? 'external_total' as const : 'unknown' as const;
  return { setId: id(), exerciseId, exerciseName, order, reps: '', ...defaults,
    loadValue: '', loadSide, rpe: '' };
}

export function addAdHocExercises(draft: AdHocDraft,
  exercises: readonly { id: string; name: string; equipment: string }[], id: () => string): AdHocDraft {
  const existing = new Set(draft.sets.map(set => set.exerciseId));
  const sets = [...draft.sets];
  for (const exercise of exercises) {
    if (existing.has(exercise.id)) throw new Error(`${exercise.name} is already in this workout.`);
    sets.push(createAdHocSet(exercise.id, exercise.name, 1, id, exercise.equipment));
    existing.add(exercise.id);
  }
  return { ...draft, sets };
}

export function appendAdHocSet(draft: AdHocDraft, exerciseId: string, id: () => string): AdHocDraft {
  const group = draft.sets.filter(set => set.exerciseId === exerciseId);
  if (!group.length) throw new Error('Choose an exercise from this workout.');
  const previous = group[group.length - 1];
  return { ...draft, sets: [...draft.sets, {
    ...createAdHocSet(exerciseId, previous.exerciseName, Math.max(...group.map(set => set.order)) + 1, id),
    loadKind: previous.loadKind, loadUnit: previous.loadUnit, loadSide: previous.loadSide,
  }] };
}

export function removeAdHocSet(draft: AdHocDraft, setId: string): AdHocDraft {
  const removed = draft.sets.find(set => set.setId === setId);
  if (!removed) throw new Error('Set is not in this workout.');
  let order = 0;
  return { ...draft, sets: draft.sets.filter(set => set.setId !== setId).map(set =>
    set.exerciseId === removed.exerciseId ? { ...set, order: ++order } : set) };
}

export function removeAdHocExercise(draft: AdHocDraft, exerciseId: string): AdHocDraft {
  if (!draft.sets.some(set => set.exerciseId === exerciseId)) throw new Error('Exercise is not in this workout.');
  return { ...draft, sets: draft.sets.filter(set => set.exerciseId !== exerciseId) };
}

function validateDraft(draft: AdHocDraft, ownerId: string): void {
  if (!ownerId || !draft || draft.ownerId !== ownerId || typeof draft.draftId !== 'string'
    || !UUID.test(draft.draftId) || typeof draft.workoutName !== 'string'
    || typeof draft.startedAt !== 'string' || !date(draft.startedAt)
    || !Array.isArray(draft.sets)) throw new Error('Ad-hoc draft ownership or identity is invalid.');
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const set of draft.sets) {
    const position = `${set.exerciseId}:${set.order}`;
    if (!set || typeof set.setId !== 'string' || !UUID.test(set.setId)
      || !isCatalogExerciseId(set.exerciseId) || typeof set.exerciseName !== 'string'
      || !set.exerciseName.trim() || typeof set.reps !== 'string'
      || typeof set.loadValue !== 'string' || typeof set.rpe !== 'string'
      || !Number.isSafeInteger(set.order) || set.order < 1 || ids.has(set.setId) || positions.has(position)
      || !KINDS.includes(set.loadKind) || !UNITS.includes(set.loadUnit) || !SIDES.includes(set.loadSide)) {
      throw new Error('Ad-hoc set identity or load type is invalid.');
    }
    ids.add(set.setId);
    positions.add(position);
  }
}

export function freezeAdHocDraft(draft: AdHocDraft, operationId: string, endedAt: string): AdHocPayload {
  validateDraft(draft, draft.ownerId);
  if (!isOperationId(operationId) || !date(endedAt) || Date.parse(endedAt) < Date.parse(draft.startedAt)) {
    throw new Error('Workout finish time or operation identity is invalid.');
  }
  const workoutName = draft.workoutName.trim() || 'Ad-hoc workout';
  if (draft.sets.length === 0) throw new Error('Log at least one actual set.');
  const sets = draft.sets.map((set): AdHocActualSet => {
    const reps = numeric(set.reps, 'Reps');
    if (reps === null || !Number.isSafeInteger(reps) || reps < 1) throw new Error('Reps must be a positive whole number.');
    const loadValue = numeric(set.loadValue, 'Load', set.loadKind === 'bodyweight' || set.loadKind === 'unknown');
    if (set.loadKind === 'external' || set.loadKind === 'assistance') {
      if (loadValue === null || !['lb', 'kg'].includes(set.loadUnit)) {
        throw new Error('External or assistance load needs a value in lb or kg.');
      }
    } else if (set.loadUnit !== 'none' || (loadValue !== null && loadValue !== 0)) {
      throw new Error('Bodyweight or unknown load must use none and no added weight.');
    }
    const rpe = numeric(set.rpe, 'RPE', true);
    if (rpe !== null && rpe > 10) throw new Error('RPE must be between 0 and 10.');
    return { setId: set.setId, exerciseId: set.exerciseId, order: set.order, reps,
      loadKind: set.loadKind, loadValue, loadUnit: set.loadUnit, loadSide: set.loadSide,
      rpe, loggedAt: endedAt };
  });
  return { schemaVersion: 1, operationId, draftId: draft.draftId, workoutName,
    startedAt: draft.startedAt, endedAt,
    durationMin: Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(draft.startedAt)) / 60000)), sets };
}

export function verifyAdHocHistory(ownerId: string, payload: AdHocPayload, receiptValue: unknown,
  sessionValue: unknown, setsValue: unknown): string {
  const receipt = record(receiptValue);
  const session = record(sessionValue);
  if (!UUID.test(text(receipt.sessionId)) || receipt.operationId !== payload.operationId
    || receipt.draftId !== payload.draftId || receipt.revision !== 1
    || receipt.completionClass !== 'complete' || receipt.setCount !== payload.sets.length
    || typeof receipt.replayed !== 'boolean'
    || session.id !== receipt.sessionId || session.user_id !== ownerId
    || session.operation_id !== payload.operationId || session.draft_id !== payload.draftId
    || session.program_day_id !== null || session.program_revision_id !== null
    || session.workout_name !== payload.workoutName
    || typeof session.started_at !== 'string' || Date.parse(session.started_at) !== Date.parse(payload.startedAt)
    || typeof session.ended_at !== 'string' || Date.parse(session.ended_at) !== Date.parse(payload.endedAt)
    || session.duration_min !== payload.durationMin
    || session.schema_version !== 2
    || session.revision !== 1 || session.lifecycle !== 'finalized'
    || session.completion_class !== 'complete') {
    throw new Error('Stored ad-hoc session does not match the frozen request. Exact retry is preserved.');
  }
  if (!Array.isArray(setsValue) || setsValue.length !== payload.sets.length) {
    throw new Error('Stored ad-hoc set count does not match the frozen request. Exact retry is preserved.');
  }
  for (const expected of payload.sets) {
    const actual = setsValue.find((row: unknown) =>
      row && typeof row === 'object' && (row as Record<string, unknown>).actual_set_id === expected.setId);
    if (!actual) throw new Error('Stored ad-hoc set identity is missing. Exact retry is preserved.');
    const row = record(actual);
    if (row.session_id !== receipt.sessionId || row.exercise_id !== expected.exerciseId
      || row.order_index !== expected.order || row.set_number !== expected.order
      || row.reps !== expected.reps || row.load_kind !== expected.loadKind
      || row.load_unit !== expected.loadUnit || row.load_side !== expected.loadSide
      || (row.load_value === null ? null : Number(row.load_value)) !== expected.loadValue
      || (row.rpe === null ? null : Number(row.rpe)) !== expected.rpe
      || typeof row.logged_at !== 'string'
      || Date.parse(row.logged_at) !== Date.parse(expected.loggedAt)) {
      throw new Error('Stored ad-hoc set differs from the frozen request. Exact retry is preserved.');
    }
  }
  return text(receipt.sessionId);
}

export function createAdHocFlow(storage: AdHocStorage, gateway: AdHocGateway,
  id: () => string, now: () => string) {
  const key = (ownerId: string) => {
    if (!UUID.test(ownerId)) throw new Error('Sign in to manage your ad-hoc workout.');
    return `${PREFIX}/${ownerId}`;
  };
  const read = async (ownerId: string): Promise<AdHocState | null> => {
    const value = await storage.getItem(key(ownerId));
    if (!value) return null;
    const state = record(JSON.parse(value));
    const draft = state.draft as AdHocDraft;
    validateDraft(draft, ownerId);
    if (state.pending !== null) {
      const pending = record(state.pending);
      if (pending.draftId !== draft.draftId || !isOperationId(text(pending.operationId))
        || pending.schemaVersion !== 1 || !Array.isArray(pending.sets)) {
        throw new Error('Frozen ad-hoc request is invalid. Recovery is preserved.');
      }
      const expected = freezeAdHocDraft(draft, text(pending.operationId), text(pending.endedAt));
      if (JSON.stringify(expected) !== JSON.stringify(state.pending)) {
        throw new Error('Frozen ad-hoc request differs from its draft. Recovery is preserved.');
      }
    }
    return state as unknown as AdHocState;
  };
  return {
    async load(ownerId: string): Promise<{ draft: AdHocDraft | null; pending: boolean }> {
      const state = await read(ownerId);
      return { draft: state?.draft ?? null, pending: Boolean(state?.pending) };
    },
    async start(ownerId: string): Promise<AdHocDraft> {
      const existing = await read(ownerId);
      if (existing) return existing.draft;
      const draft: AdHocDraft = { ownerId, draftId: id(), workoutName: '', startedAt: now(), sets: [] };
      validateDraft(draft, ownerId);
      await storage.setItem(key(ownerId), JSON.stringify({ draft, pending: null }));
      return draft;
    },
    async save(draft: AdHocDraft): Promise<void> {
      validateDraft(draft, draft.ownerId);
      const state = await read(draft.ownerId);
      if (!state || state.draft.draftId !== draft.draftId || state.pending) {
        throw new Error('This draft cannot be edited while a finish is pending or its identity changed.');
      }
      await storage.setItem(key(draft.ownerId), JSON.stringify({ draft, pending: null }));
    },
    async finish(ownerId: string): Promise<string> {
      let state: AdHocState | null;
      try {
        state = await read(ownerId);
      } catch (cause) {
        throw new AdHocFinishFailure('restore', cause);
      }
      if (!state) throw new Error('Start a workout before finishing.');
      let payload = state.pending;
      if (!payload) {
        try {
          payload = freezeAdHocDraft(state.draft, id(), now());
          await storage.setItem(key(ownerId), JSON.stringify({ draft: state.draft, pending: payload }));
        } catch (cause) {
          throw new AdHocFinishFailure('freeze', cause);
        }
      }
      let receipt: unknown;
      try {
        receipt = await gateway.finalize(payload);
      } catch (cause) {
        throw new AdHocFinishFailure('submit', cause);
      }
      try {
        const session = await gateway.session(ownerId, payload.operationId);
        const savedSets = await gateway.sets(text(record(receipt).sessionId));
        const sessionId = verifyAdHocHistory(ownerId, payload, receipt, session, savedSets);
        await storage.removeItem(key(ownerId));
        return sessionId;
      } catch (cause) {
        throw new AdHocFinishFailure('verify', cause);
      }
    },
  };
}
