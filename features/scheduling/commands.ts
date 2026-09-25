/* Convenience constructors for schedule commands (pure, versioned payloads). */

import { asOccurrenceId, asRevisionNumber } from './contracts';
import type { BaseScheduleCommand, OccurrenceId, CycleId, MovePlacementCommand, CarryPlacementCommand, SwapPlacementsCommand, SkipPlacementCommand, RecurringCommand, LocalDate } from './contracts';

export function makeBase(opId: string, expectedRevision: number): BaseScheduleCommand {
  return { schemaVersion: 1 as const, operationId: asOccurrenceId(opId), expectedRevision: asRevisionNumber(expectedRevision) } as BaseScheduleCommand;
}

export function makeMove(opId: string, expectedRevision: number, occurrenceId: OccurrenceId, targetDate: LocalDate): MovePlacementCommand {
  return { ...makeBase(opId, expectedRevision), type: 'move', occurrenceId, targetDate } as MovePlacementCommand;
}

export function makeCarry(opId: string, expectedRevision: number, occurrenceId: OccurrenceId, targetCycle: CycleId): CarryPlacementCommand {
  return { ...makeBase(opId, expectedRevision), type: 'carry', occurrenceId, targetCycle } as CarryPlacementCommand;
}

export function makeSwap(opId: string, expectedRevision: number, first: OccurrenceId, second: OccurrenceId): SwapPlacementsCommand {
  return { ...makeBase(opId, expectedRevision), type: 'swap', firstOccurrence: first, secondOccurrence: second } as SwapPlacementsCommand;
}

export function makeSkip(opId: string, expectedRevision: number, occurrenceId: OccurrenceId, asKind?: 'workout' | 'rest' | 'pause'): SkipPlacementCommand {
  return { ...makeBase(opId, expectedRevision), type: 'skip', occurrenceId, asKind } as SkipPlacementCommand;
}

export function makeRecurring(opId: string, expectedRevision: number, occurrenceId: OccurrenceId, every: number, unit: 'day'|'week'|'month', opts?: { count?: number; until?: LocalDate }): RecurringCommand {
  const recurrence: RecurringCommand['recurrence'] = { every, unit };
  if (opts?.count !== undefined) recurrence.count = opts.count;
  if (opts?.until !== undefined) recurrence.until = opts.until;
  return { ...makeBase(opId, expectedRevision), type: 'recurring', occurrenceId, recurrence } as RecurringCommand;
}
