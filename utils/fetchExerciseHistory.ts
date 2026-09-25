import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExerciseHistoryEntry } from '@/types/program';

export interface FetchExerciseHistoryResult {
  entries: ExerciseHistoryEntry[];
  unavailable: boolean;
  errors: Error[];
  partial: boolean;
  aborted: boolean;
  truncated: boolean;
}

const PAGE_SIZE = 500;

interface ActualSetRow {
  id: string;
  session_id: string;
  set_number: number;
  load_value: number | string | null;
  load_unit: 'lb' | 'kg' | 'none' | null;
  load_kind: 'external' | 'assistance' | 'bodyweight' | 'unknown' | null;
  load_side: 'per_hand' | 'total' | 'unknown' | null;
  weight_lb: number | string | null;
  reps: number | null;
  rpe: number | null;
  workout_sessions: { workout_name: string; ended_at: string | null };
}

export async function fetchExerciseHistory(
  exerciseId: string,
  limit = Number.MAX_SAFE_INTEGER,
  supabaseClient?: SupabaseClient,
  signal?: AbortSignal,
): Promise<FetchExerciseHistoryResult> {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Exercise history limit must be positive.');
  const empty = (aborted = false): FetchExerciseHistoryResult =>
    ({ entries: [], unavailable: false, errors: [], partial: false, aborted, truncated: false });
  if (signal?.aborted) return empty(true);
  const client = supabaseClient ?? (await import('@/utils/supabase')).supabase;
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError) throw authError;
  if (!auth.session?.user.id) throw new Error('Exercise history requires the current account.');
  const userId = auth.session.user.id;

  const rows: ActualSetRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    if (signal?.aborted) return empty(true);
    const page = await client.from('workout_exercise_sets')
      .select('id, session_id, set_number, load_value, load_unit, load_kind, load_side, weight_lb, reps, rpe, workout_sessions!inner(user_id, workout_name, ended_at)')
      .eq('exercise_id', exerciseId).eq('workout_sessions.user_id', userId)
      .order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
    if (signal?.aborted) return empty(true);
    if (page.error) {
      const unavailable = page.error.code === 'PGRST205' &&
        page.error.message.toLowerCase().includes('workout_exercise_sets');
      return { entries: [], unavailable, errors: [page.error], partial: rows.length > 0, aborted: false, truncated: false };
    }
    rows.push(...(page.data ?? []).map(row => ({
      ...row,
      workout_sessions: Array.isArray(row.workout_sessions)
        ? row.workout_sessions[0] : row.workout_sessions,
    })) as ActualSetRow[]);
    if ((page.data ?? []).length < PAGE_SIZE) break;
  }

  const grouped = new Map<string, ActualSetRow[]>();
  for (const row of rows) {
    if (!row.id || !row.session_id || !row.workout_sessions?.ended_at) {
      return { entries: [], unavailable: false, errors: [new Error('Invalid exercise history row.')],
        partial: rows.length > 0, aborted: false, truncated: false };
    }
    const group = grouped.get(row.session_id) ?? [];
    group.push(row);
    grouped.set(row.session_id, group);
  }
  const entries: ExerciseHistoryEntry[] = Array.from(grouped, ([sessionId, group]) => {
    const sets = group.sort((a, b) => a.set_number - b.set_number || a.id.localeCompare(b.id))
      .map(row => {
        const kind = row.load_kind ?? 'unknown';
        const unit = row.load_unit ?? (row.weight_lb == null ? 'none' : 'lb');
        const value = row.load_value == null ? row.weight_lb == null ? null : Number(row.weight_lb) : Number(row.load_value);
        const weightLb = (kind === 'external' || kind === 'assistance') && value !== null && unit !== 'none'
          ? value * (unit === 'kg' ? 2.2046226218 : 1) : null;
        return {
          setNumber: row.set_number, weightLb, loadValue: value, loadUnit: unit,
          loadKind: kind, loadSide: row.load_side ?? 'unknown',
          reps: row.reps, rpe: row.rpe,
        };
      });
    return {
      sessionId, workoutName: group[0].workout_sessions.workout_name,
      completedAt: group[0].workout_sessions.ended_at!,
      sets,
      totalVolumeLb: sets.reduce((sum, set) =>
        sum + (set.loadKind === 'external' ? (set.weightLb ?? 0) * (set.reps ?? 0) : 0), 0),
    };
  }).sort((a, b) => b.completedAt.localeCompare(a.completedAt) || b.sessionId.localeCompare(a.sessionId));

  return { entries: entries.slice(0, limit), unavailable: false, errors: [], partial: false,
    aborted: false, truncated: entries.length > limit };
}
