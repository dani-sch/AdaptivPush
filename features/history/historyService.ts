import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkoutHistoryTable = 'workout_sessions' | 'workout_history';

export interface WorkoutHistoryRow {
  id: string;
  session_id?: string | null;
  linked_session_id?: string | null;
  workout_session_id?: string | null;
  workout_name?: string | null;
  title?: string | null;
  name?: string | null;
  ended_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  duration_min?: number | string | null;
  total_volume_lb?: number | string | null;
  total_volume_lbs?: number | string | null;
  volume_lb?: number | string | null;
  volume_lbs?: number | string | null;
  total_volume?: number | string | null;
  volume?: number | string | null;
  pr_count?: number | string | null;
  prs?: number | string | null;
  personal_records?: number | string | null;
  personal_record_count?: number | string | null;
  prs_hit?: number | string | null;
  is_pr?: boolean | null;
  notes?: string | null;
}

export interface HistoryItem {
  source: WorkoutHistoryTable;
  compositeId: string;
  row: WorkoutHistoryRow;
}

export interface HistoryFetchError {
  table: WorkoutHistoryTable;
  error: { code?: string | null; message?: string | null } | Error;
}

export interface PaginatedHistoryResult {
  items: HistoryItem[];
  nextCursor: string | null;
  complete: boolean;
  partial: boolean;
  unavailable: WorkoutHistoryTable[];
  errors: HistoryFetchError[];
  aborted: boolean;
}

const SOURCES: readonly WorkoutHistoryTable[] = ['workout_sessions', 'workout_history'];
const PAGE_SIZE = 500;

function missingTable(error: { code?: string | null; message?: string | null }, table: WorkoutHistoryTable): boolean {
  return error.code === 'PGRST205' &&
    Boolean(error.message?.toLowerCase().includes(table));
}

function timestamp(item: HistoryItem): string {
  return item.row.ended_at ?? item.row.completed_at ?? item.row.created_at ?? '';
}

function compareItems(a: HistoryItem, b: HistoryItem): number {
  const date = timestamp(b).localeCompare(timestamp(a));
  return date || b.compositeId.localeCompare(a.compositeId);
}

export async function fetchPaginatedWorkoutHistory(
  params: {
    limit?: number;
    cursor?: string | null;
    supabaseClient?: SupabaseClient;
    signal?: AbortSignal | null;
    userId?: string | null;
  } = {},
): Promise<PaginatedHistoryResult> {
  const { limit, cursor, signal } = params;
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new Error('History page size must be a positive integer.');
  }
  const empty = (aborted: boolean): PaginatedHistoryResult => ({
    items: [], nextCursor: null, complete: false, partial: false, unavailable: [], errors: [], aborted,
  });
  if (signal?.aborted) return empty(true);

  const client = params.supabaseClient ?? (await import('@/utils/supabase')).supabase;
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError) throw authError;
  const ownerId = auth.session?.user.id;
  if (!ownerId || (params.userId && params.userId !== ownerId)) {
    throw new Error('Workout history requires the current account.');
  }
  if (signal?.aborted) return empty(true);

  const items: HistoryItem[] = [];
  const errors: HistoryFetchError[] = [];
  const unavailable: WorkoutHistoryTable[] = [];

  for (const table of SOURCES) {
    const orderColumn = table === 'workout_sessions' ? 'ended_at' : 'completed_at';
    for (let offset = 0; ; offset += PAGE_SIZE) {
      if (signal?.aborted) return empty(true);
      const page = await client.from(table).select('*').eq('user_id', ownerId)
        .order(orderColumn, { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (signal?.aborted) return empty(true);
      if (page.error) {
        if (missingTable(page.error, table)) unavailable.push(table);
        else errors.push({ table, error: page.error });
        break;
      }
      const rows = page.data ?? [];
      for (const raw of rows) {
        if (!raw || typeof raw.id !== 'string' ||
          typeof (raw.ended_at ?? raw.completed_at ?? raw.created_at) !== 'string') {
          errors.push({ table, error: new Error(`Invalid ${table} history row.`) });
          continue;
        }
        items.push({ source: table, compositeId: `${table}:${raw.id}`, row: raw as WorkoutHistoryRow });
      }
      if (rows.length < PAGE_SIZE) break;
    }
  }

  items.sort(compareItems);
  const currentSessions = new Set(items.filter(item => item.source === 'workout_sessions').map(item => item.row.id));
  const deduped: HistoryItem[] = [];
  for (const item of items) {
    if (item.source === 'workout_history' &&
      [item.row.session_id, item.row.linked_session_id, item.row.workout_session_id]
        .some(id => id != null && currentSessions.has(id))) continue;
    deduped.push(item);
  }
  const afterCursor = cursor ? deduped.filter(item =>
    `${timestamp(item)}|${item.compositeId}` < cursor) : deduped;
  const selected = limit === undefined ? afterCursor : afterCursor.slice(0, limit);
  const last = selected.at(-1);
  const nextCursor = limit !== undefined && selected.length < afterCursor.length && last
    ? `${timestamp(last)}|${last.compositeId}` : null;
  const complete = errors.length === 0 && !unavailable.includes('workout_sessions');
  return {
    items: selected, nextCursor, complete, partial: !complete && selected.length > 0,
    unavailable, errors, aborted: false,
  };
}
