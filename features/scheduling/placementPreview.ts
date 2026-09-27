import { asLocalDate, validateTimeZone } from '../kernel/localDate';
import { asOperationId, createOperationId } from '../kernel/operationId';

export interface ProgramDayIdentity {
  id: string;
  stable_day_id: string;
  program_revision_id: string;
  week_number: number;
  day_index: number;
  workout_name?: string;
  is_rest_day: boolean;
  program_day_exercises: { set_count: number }[];
}

export type ExplicitPlacement =
  | { occurrenceId: string; programDayId: string; localDate: string }
  | { occurrenceId: string; programDayId: string; kind: 'workout'; status: 'unplaced'; reason: string }
  | { occurrenceId: string; kind: 'rest'; cycleWeek: number; localDate: string };

export interface CreateProgramSchedulePayload {
  operationId: string;
  programId: string;
  expectedRevision: 0;
  expectedProgramRevisionId: string;
  timezone: string;
  days: ExplicitPlacement[];
}

export interface PlacementPreviewInput {
  programId: string;
  expectedProgramRevisionId: string;
  programSchemaVersion: number;
  durationWeeks: number;
  uncompletedProgramDays: readonly ProgramDayIdentity[];
  explicitPlacements: readonly ExplicitPlacement[];
  timezone: string;
}

export class UnsupportedEmptyWorkoutError extends Error {
  constructor() {
    super('Only a legacy schema-v1 workout may remain explicitly unplaced when its prescription is empty.');
    this.name = 'UnsupportedEmptyWorkoutError';
  }
}

export function hasTrainablePrescription(day: ProgramDayIdentity): boolean {
  return Array.isArray(day.program_day_exercises)
    && day.program_day_exercises.some((exercise) => Number.isFinite(exercise.set_count) && exercise.set_count > 0);
}

export function validateExplicitPlacements(input: PlacementPreviewInput): void {
  const { programId, expectedProgramRevisionId, programSchemaVersion, durationWeeks, uncompletedProgramDays,
    explicitPlacements, timezone } = input;
  if (!programId || !expectedProgramRevisionId) throw new Error('An active program revision is required.');
  if (!Number.isSafeInteger(programSchemaVersion) || programSchemaVersion < 1) throw new Error('Invalid program schema version.');
  if (!Number.isSafeInteger(durationWeeks) || durationWeeks < 1) throw new Error('Invalid program duration.');
  if (!timezone || timezone === 'Factory' || timezone === 'localtime') throw new Error('Select a named timezone.');
  validateTimeZone(timezone);
  if (!Array.isArray(uncompletedProgramDays) || uncompletedProgramDays.length === 0) {
    throw new Error('No uncompleted current program days are available to place.');
  }
  if (!Array.isArray(explicitPlacements) || explicitPlacements.length === 0) {
    throw new Error('Choose dates for every uncompleted program day.');
  }
  const uncompleted = new Map<string, ProgramDayIdentity>();
  const lineage = new Set<string>();
  for (const day of uncompletedProgramDays) {
    if (!day.id || !day.stable_day_id || uncompleted.has(day.id) || lineage.has(day.stable_day_id)
      || day.program_revision_id !== expectedProgramRevisionId
      || !Number.isSafeInteger(day.week_number) || day.week_number < 1 || day.week_number > durationWeeks
      || typeof day.is_rest_day !== 'boolean') {
      throw new Error('Program days or revision changed. Reload the plan.');
    }
    if (!day.is_rest_day && !hasTrainablePrescription(day) && programSchemaVersion !== 1) {
      throw new UnsupportedEmptyWorkoutError();
    }
    uncompleted.set(day.id, day);
    lineage.add(day.stable_day_id);
  }
  const ids = new Set<string>();
  const dates = new Set<string>();
  const placed = new Set<string>();
  for (const selection of explicitPlacements) {
    if (!selection || typeof selection.occurrenceId !== 'string') throw new Error('Select an identity for every placement.');
    asOperationId(selection.occurrenceId);
    if ('localDate' in selection) asLocalDate(selection.localDate);
    if (ids.has(selection.occurrenceId)
      || ('localDate' in selection && dates.has(selection.localDate))) throw new Error('Every occurrence and date must be unique.');
    ids.add(selection.occurrenceId);
    if ('localDate' in selection) dates.add(selection.localDate);
    if ('programDayId' in selection) {
      const day = uncompleted.get(selection.programDayId);
      if (!day || placed.has(selection.programDayId) || 'cycleWeek' in selection) {
        throw new Error('Placement must reference one uncompleted current program day.');
      }
      const emptyLegacyWorkout = !day.is_rest_day && !hasTrainablePrescription(day);
      if (emptyLegacyWorkout) {
        if (programSchemaVersion !== 1 || !('status' in selection)
          || selection.status !== 'unplaced' || selection.kind !== 'workout'
          || 'localDate' in selection || selection.reason.trim().length < 1 || selection.reason.trim().length > 256) {
          throw new UnsupportedEmptyWorkoutError();
        }
      } else if (!('localDate' in selection) || 'status' in selection || 'kind' in selection || 'reason' in selection) {
        throw new Error('Trainable workouts and prescribed rest require an explicit date.');
      }
      placed.add(selection.programDayId);
    } else if (selection.kind !== 'rest' || !Number.isSafeInteger(selection.cycleWeek)
      || selection.cycleWeek < 1 || selection.cycleWeek > durationWeeks
      || lineage.has(selection.occurrenceId)) {
      throw new Error('Extra rest needs its own occurrence, a valid cycle week, and an explicit date.');
    }
  }
  if (placed.size !== uncompleted.size) throw new Error('Place every uncompleted program day, including prescribed rest.');
}

export function buildCreateProgramSchedulePayload(
  input: PlacementPreviewInput,
  operationId = createOperationId(),
): CreateProgramSchedulePayload {
  asOperationId(operationId);
  validateExplicitPlacements(input);
  return {
    operationId,
    programId: input.programId,
    expectedRevision: 0,
    expectedProgramRevisionId: input.expectedProgramRevisionId,
    timezone: input.timezone,
    days: input.explicitPlacements.map((day) => ({ ...day })),
  };
}
