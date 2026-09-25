import type { SupabaseClient } from '@supabase/supabase-js';

import { asLocalDate, validateTimeZone } from '../kernel/localDate';
import { classifySupabaseError, runSupabaseOperation } from '@/utils/supabaseResilience';
import type { NotificationPreferences } from '@/utils/profilePreferences';
import type { ReminderPlan } from '@/features/consistency/reminders';
import {
  hasTrainablePrescription, UnsupportedEmptyWorkoutError,
  type CreateProgramSchedulePayload, type ProgramDayIdentity,
} from './placementPreview';

export interface ScheduledDay {
  id: string;
  stableDayId: string;
  programDayId: string | null;
  prescriptionRevisionId: string;
  localDate: string | null;
  timeZone: string;
  kind: 'workout' | 'rest';
  status: 'planned' | 'in_progress' | 'unplaced' | 'skipped' | 'paused' | 'fulfilled';
  fulfillmentSessionId: string | null;
  fulfillmentClass: 'full' | 'accepted_reduced' | 'partial' | 'abandoned' | 'legacy_unknown' | null;
}

export type ScheduleRead =
  | { state: 'unavailable'; reason: string }
  | { state: 'unplaced' }
  | { state: 'conflict'; reason: string }
  | { state: 'ready'; revision: number; timeZone: string; days: ScheduledDay[] };

interface ScheduleRow {
  id: string;
  user_id: string;
  program_id: string;
  revision: number;
  timezone: string;
}

export interface ScheduledDayRow {
  id: string;
  stable_day_id: string;
  current_program_day_id: string | null;
  current_prescription_revision_id: string;
  current_local_date: string | null;
  current_timezone: string;
  current_kind: string;
  status: string;
  fulfillment_session_id: string | null;
  fulfillment_class: string | null;
}

const UNAVAILABLE = 'Dated scheduling is not available on this server yet. No dates have been inferred.';
export const scheduleWriterEnabled = process.env.EXPO_PUBLIC_AP04_SCHEDULE_WRITER === 'true';

export interface EligibleScheduleDays {
  revisionId: string;
  durationWeeks: number;
  days: ProgramDayIdentity[];
}

export function scheduleCapabilityMissing(read: ScheduleRead | null): boolean {
  return read?.state === 'unavailable' && read.reason === UNAVAILABLE;
}

export interface CreateScheduleReceipt {
  operationId: string;
  programId: string;
  scheduleId: string;
  revision: number;
  replayed: boolean;
}

async function requireOwner(client: SupabaseClient, ownerId: string): Promise<void> {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  if (!session || session.user.id !== ownerId) throw new Error('Schedule account changed. Sign in again.');
}

async function currentProgram(client: SupabaseClient, ownerId: string, programId: string) {
  const { data, error } = await client.from('programs')
    .select('current_revision_id,duration_weeks,is_active,lifecycle')
    .eq('id', programId).eq('user_id', ownerId)
    .maybeSingle<{ current_revision_id: string | null; duration_weeks: number; is_active: boolean; lifecycle: string }>();
  if (error) throw error;
  if (!data?.is_active || data.lifecycle !== 'active' || !data.current_revision_id) {
    throw new Error('Active program revision is unavailable. Refresh before scheduling.');
  }
  return { ...data, current_revision_id: data.current_revision_id };
}

async function allProgramDays(client: SupabaseClient, programId: string,
  revisionId?: string): Promise<ProgramDayIdentity[]> {
  const rows: ProgramDayIdentity[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from('program_days')
      .select('id,stable_day_id,program_revision_id,week_number,day_index,workout_name,is_rest_day,program_day_exercises!program_day_exercises_program_day_id_fkey(set_count)')
      .eq('program_id', programId);
    if (revisionId) query = query.eq('program_revision_id', revisionId);
    const page = await query.order('id').range(offset, offset + 499).returns<ProgramDayIdentity[]>();
    if (page.error) throw page.error;
    rows.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 500) break;
  }
  return rows;
}

async function finalizedDayIds(client: SupabaseClient, ownerId: string, dayIds: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  for (let start = 0; start < dayIds.length; start += 100) {
    const chunk = dayIds.slice(start, start + 100);
    for (let offset = 0; ; offset += 500) {
      const page = await client.from('workout_sessions')
        .select('program_day_id').eq('user_id', ownerId)
        .eq('lifecycle', 'finalized').in('program_day_id', chunk)
        .order('id').range(offset, offset + 499).returns<{ program_day_id: string }[]>();
      if (page.error) throw page.error;
      for (const session of page.data ?? []) result.add(session.program_day_id);
      if ((page.data?.length ?? 0) < 500) break;
    }
  }
  return result;
}

export function canStartUndatedWorkout(read: ScheduleRead | null, pending: boolean): boolean {
  return !pending && (read?.state === 'unplaced'
    || (read?.state === 'unavailable' && read.reason === UNAVAILABLE));
}

export function scheduledPrescriptionsMatchRevision(
  days: readonly ScheduledDay[],
  currentRevisionId: string | null,
): boolean {
  return Boolean(currentRevisionId)
    && days.every((day) => day.kind !== 'workout'
      || (day.status !== 'planned' && day.status !== 'in_progress')
      || day.prescriptionRevisionId === currentRevisionId);
}

export function reminderPlanForSchedule(
  read: Extract<ScheduleRead, { state: 'ready' }>,
  ownerId: string,
  programId: string,
  preferences: NotificationPreferences,
): ReminderPlan {
  if (!ownerId || !programId) throw new Error('Owner and program are required for dated reminders.');
  return {
    ownerId,
    programId,
    revision: read.revision,
    occurrences: read.days.flatMap((day) => day.localDate === null ? [] : [{
      occurrenceId: day.id,
      localDate: day.localDate,
      timeZone: day.timeZone,
      kind: day.kind,
      status: day.status,
    }]),
    preferences,
  };
}

export function scheduledOutcomeLabel(day: ScheduledDay): string {
  switch (day.fulfillmentClass) {
    case 'full': return 'Workout completed';
    case 'accepted_reduced': return 'Reduced workout recorded';
    case 'partial': return 'Partial session recorded';
    case 'abandoned': return 'Session ended without completed work';
    case 'legacy_unknown': return 'Workout outcome unknown';
    default: throw new Error('A fulfilled occurrence needs a known outcome.');
  }
}

export function todayInScheduleZone(now: Date, timeZone: string): string {
  validateTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return asLocalDate(`${part('year')}-${part('month')}-${part('day')}`);
}

export type TodaySchedule =
  | { state: 'unavailable' | 'unplaced' | 'conflict'; message: string }
  | { state: 'rest' | 'workout' | 'fulfilled'; day: ScheduledDay; localDate: string };

export function selectScheduleToday(read: ScheduleRead, now: Date): TodaySchedule {
  if (read.state === 'unavailable') return { state: read.state, message: read.reason };
  if (read.state === 'conflict') return { state: read.state, message: read.reason };
  if (read.state === 'unplaced') {
    return { state: 'unplaced', message: 'This program has no confirmed dated placement. Your next workout is not assigned to today.' };
  }
  try {
    todayInScheduleZone(now, read.timeZone);
  } catch {
    return { state: 'conflict', message: 'The schedule timezone is invalid. Dates cannot be shown safely.' };
  }
  let days: ScheduledDay[];
  try {
    days = read.days.filter((day) => day.localDate !== null
      && day.localDate === todayInScheduleZone(now, day.timeZone));
  } catch {
    return { state: 'conflict', message: 'A scheduled occurrence has an invalid timezone.' };
  }
  if (days.length > 1) return { state: 'conflict', message: 'Multiple placements claim today. Review the schedule before training.' };
  const day = days[0];
  if (!day) return { state: 'unplaced', message: 'No workout or rest is placed on today. Nothing is inferred from the program order.' };
  if (!day.localDate) return { state: 'conflict', message: 'Today has no accepted placement date.' };
  if (day.status === 'fulfilled') return { state: 'fulfilled', day, localDate: day.localDate };
  if (day.status !== 'planned' && day.status !== 'in_progress') {
    return { state: 'unplaced', message: `Today's placement is ${day.status}; no workout is assigned.` };
  }
  return { state: day.kind, day, localDate: day.localDate };
}

export function parseScheduledDay(row: ScheduledDayRow): ScheduledDay {
  if (!row.id || !row.stable_day_id || !row.current_prescription_revision_id
    || !['workout', 'rest'].includes(row.current_kind)
    || (row.current_kind === 'workout' && !row.current_program_day_id)
    || !['planned', 'in_progress', 'unplaced', 'skipped', 'paused', 'fulfilled'].includes(row.status)
    || (row.current_local_date === null) !== ['unplaced', 'skipped', 'paused'].includes(row.status)
    || (row.status === 'fulfilled') !== (row.fulfillment_session_id !== null)
    || (row.status === 'fulfilled') !== (row.fulfillment_class !== null)
    || (row.fulfillment_class !== null
      && !['full', 'accepted_reduced', 'partial', 'abandoned', 'legacy_unknown'].includes(row.fulfillment_class))) {
    throw new Error('Invalid scheduled occurrence');
  }
  validateTimeZone(row.current_timezone);
  if (row.current_local_date) asLocalDate(row.current_local_date);
  return {
    id: row.id, stableDayId: row.stable_day_id, programDayId: row.current_program_day_id,
    prescriptionRevisionId: row.current_prescription_revision_id,
    localDate: row.current_local_date, timeZone: row.current_timezone, kind: row.current_kind as ScheduledDay['kind'],
    status: row.status as ScheduledDay['status'], fulfillmentSessionId: row.fulfillment_session_id,
    fulfillmentClass: row.fulfillment_class as ScheduledDay['fulfillmentClass'],
  };
}

export function createScheduleRepository(client: SupabaseClient) {
  return {
    async loadEligibleDays(ownerId: string, programId: string): Promise<EligibleScheduleDays> {
      await requireOwner(client, ownerId);
      const program = await currentProgram(client, ownerId, programId);
      const current = await allProgramDays(client, programId, program.current_revision_id);
      const ancestry = await allProgramDays(client, programId);
      const finalized = await finalizedDayIds(client, ownerId, ancestry.map((day) => day.id));
      const completedLineage = new Set(ancestry.filter((day) => finalized.has(day.id)).map((day) => day.stable_day_id));
      const refreshed = await currentProgram(client, ownerId, programId);
      if (program.current_revision_id !== refreshed.current_revision_id || program.duration_weeks !== refreshed.duration_weeks) {
        throw new Error('Program changed while loading placement. Refresh and choose dates again.');
      }
      if (current.length === 0 || current.some((day) => !day.id || !day.stable_day_id
        || day.program_revision_id !== program.current_revision_id)) {
        throw new Error('Complete current program days are required for placement.');
      }
      const days = current.filter((day) => !completedLineage.has(day.stable_day_id));
      if (days.some((day) => !day.is_rest_day && !hasTrainablePrescription(day))) {
        throw new UnsupportedEmptyWorkoutError();
      }
      return {
        revisionId: program.current_revision_id,
        durationWeeks: program.duration_weeks,
        days,
      };
    },
    async assertCreateAvailable(ownerId: string): Promise<void> {
      if (!scheduleWriterEnabled) throw new Error('Dated schedule saving is not enabled in this build.');
      await requireOwner(client, ownerId);
      const capability = await client.rpc('schedule_capability_v1');
      if (capability.error) throw capability.error;
      if (capability.data !== 1) throw new Error('This client does not support the server schedule version.');
    },
    async currentRevision(ownerId: string, programId: string): Promise<string> {
      await requireOwner(client, ownerId);
      return (await currentProgram(client, ownerId, programId)).current_revision_id;
    },
    async sendCreate(ownerId: string, requestJson: string): Promise<unknown> {
      if (!scheduleWriterEnabled) throw new Error('Dated schedule saving is not enabled in this build.');
      await requireOwner(client, ownerId);
      const capability = await client.rpc('schedule_capability_v1');
      if (capability.error) throw capability.error;
      if (capability.data !== 1) throw new Error('This client does not support the server schedule version.');
      const payload: unknown = JSON.parse(requestJson);
      const { data, error } = await runSupabaseOperation(
        (signal) => client.rpc('create_program_schedule_v1', { p_payload: payload }).abortSignal(signal),
        { kind: 'write', operation: 'schedule.create' },
      );
      if (error) throw error;
      return data;
    },
    async verifyCreate(ownerId: string, payload: CreateProgramSchedulePayload,
      receipt: CreateScheduleReceipt): Promise<boolean> {
      await requireOwner(client, ownerId);
      const { data: schedule, error } = await client.from('program_schedules')
        .select('id,source_operation_id,program_id,timezone,revision')
        .eq('user_id', ownerId).eq('program_id', payload.programId)
        .maybeSingle<{ id: string; source_operation_id: string; program_id: string; timezone: string; revision: number }>();
      if (error) throw error;
      if (!schedule) return false;
      if (schedule.id !== receipt.scheduleId || schedule.source_operation_id !== payload.operationId
        || schedule.program_id !== payload.programId || schedule.timezone !== payload.timezone
        || schedule.revision < receipt.revision) return false;
      const rows: { id: string; original_program_day_id: string | null; original_kind: string;
        original_local_date: string; original_timezone: string }[] = [];
      for (let offset = 0; ; offset += 500) {
        const page = await client.from('scheduled_days')
          .select('id,original_program_day_id,original_kind,original_local_date,original_timezone')
          .eq('user_id', ownerId).eq('program_id', payload.programId).eq('schedule_id', schedule.id)
          .order('id').range(offset, offset + 499)
          .returns<typeof rows>();
        if (page.error) throw page.error;
        rows.push(...(page.data ?? []));
        if ((page.data?.length ?? 0) < 500) break;
      }
      if (rows.length !== payload.days.length) return false;
      return payload.days.every((day) => {
        const row = rows.find((entry) => entry.id === day.occurrenceId);
        return row?.original_local_date === day.localDate
          && row.original_timezone === payload.timezone
          && ('programDayId' in day
            ? row.original_program_day_id === day.programDayId
            : row.original_program_day_id === null && row.original_kind === 'rest');
      });
    },
    async read(ownerId: string, programId: string): Promise<ScheduleRead> {
      if (!ownerId || !programId) throw new Error('Owner and program are required');
      const { data: { session }, error: authError } = await client.auth.getSession();
      if (authError) throw authError;
      if (session?.user.id !== ownerId) throw new Error('Schedule account changed');
      const capability = await client.rpc('schedule_capability_v1');
      if (capability.error) {
        if (classifySupabaseError(capability.error).category === 'schema_unavailable') {
          return { state: 'unavailable', reason: UNAVAILABLE };
        }
        throw capability.error;
      }
      if (capability.data !== 1) {
        return { state: 'conflict', reason: 'This client does not understand the server schedule version. Update the app before starting a workout.' };
      }
      const schedules = await client.from('program_schedules')
        .select('id,user_id,program_id,revision,timezone')
        .eq('user_id', ownerId).eq('program_id', programId).limit(2).returns<ScheduleRow[]>();
      if (schedules.error) throw schedules.error;
      if ((schedules.data?.length ?? 0) > 1) return { state: 'conflict', reason: 'More than one schedule was found for this program.' };
      const schedule = schedules.data?.[0];
      if (!schedule) return { state: 'unplaced' };
      if (schedule.user_id !== ownerId || schedule.program_id !== programId
        || !Number.isSafeInteger(schedule.revision) || schedule.revision < 1) {
        return { state: 'conflict', reason: 'Schedule ownership or revision could not be confirmed.' };
      }
      try {
        validateTimeZone(schedule.timezone);
      } catch {
        return { state: 'conflict', reason: 'The schedule timezone is invalid.' };
      }
      const days: ScheduledDay[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const page = await client.from('scheduled_days')
          .select('id,stable_day_id,current_program_day_id,current_prescription_revision_id,current_local_date,current_timezone,current_kind,status,fulfillment_session_id,fulfillment_class')
          .eq('user_id', ownerId).eq('program_id', programId).eq('schedule_id', schedule.id)
          .order('id').range(offset, offset + pageSize - 1).returns<ScheduledDayRow[]>();
        if (page.error) throw page.error;
        try {
          days.push(...(page.data ?? []).map(parseScheduledDay));
        } catch {
          return { state: 'conflict', reason: 'A scheduled occurrence has inconsistent data.' };
        }
        if ((page.data?.length ?? 0) < pageSize) break;
      }
      const revision = await client.from('program_schedules').select('revision')
        .eq('id', schedule.id).eq('user_id', ownerId).single<{ revision: number }>();
      if (revision.error) throw revision.error;
      if (revision.data.revision !== schedule.revision || days.length === 0) {
        return { state: 'conflict', reason: 'Schedule changed while loading or has no placements. Refresh to reconcile.' };
      }
      const program = await client.from('programs')
        .select('current_revision_id,is_active,lifecycle')
        .eq('id', programId).eq('user_id', ownerId)
        .maybeSingle<{ current_revision_id: string | null; is_active: boolean; lifecycle: string }>();
      if (program.error) throw program.error;
      if (!program.data?.is_active || program.data.lifecycle !== 'active'
        || !scheduledPrescriptionsMatchRevision(days, program.data.current_revision_id)) {
        return { state: 'conflict', reason: 'The schedule no longer matches the active program prescription. Refresh after it is reconciled.' };
      }
      const stableIds = new Set(days.map((day) => day.stableDayId));
      const dated = days.flatMap((day) => day.localDate ? [day.localDate] : []);
      if (stableIds.size !== days.length || new Set(dated).size !== dated.length) {
        return { state: 'conflict', reason: 'Schedule contains duplicate day lineages or dates.' };
      }
      return { state: 'ready', revision: schedule.revision, timeZone: schedule.timezone, days };
    },
  };
}
