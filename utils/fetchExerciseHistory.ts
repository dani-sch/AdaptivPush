import { supabase } from '@/utils/supabase';
import type { ExerciseHistoryEntry } from '@/types/program';

export async function fetchExerciseHistory(
  exerciseId: string,
  limit = 10
): Promise<ExerciseHistoryEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch all sets for this exercise, newest first
    // Join workout_sessions for session metadata
    const { data: rows, error } = await supabase
      .from('workout_exercise_sets')
      .select(`
        id,
        session_id,
        set_number,
        weight_lb,
        reps,
        rpe,
        created_at,
        workout_sessions!inner (
          user_id,
          workout_name,
          ended_at
        )
      `)
      .eq('exercise_id', exerciseId)
      .eq('workout_sessions.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit * 8); // over-fetch since we group by session

    if (error || !rows) return [];

    // Group by session_id
    const sessionMap = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.session_id ?? row.created_at.slice(0, 10);
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(row);
    }

    // Convert to ExerciseHistoryEntry[], take at most `limit` sessions
    const entries: ExerciseHistoryEntry[] = [];
    for (const [key, sessionRows] of sessionMap) {
      if (entries.length >= limit) break;

      const firstRow = sessionRows[0];
      // Type the nested join result
      const sessionMeta = (firstRow.workout_sessions && typeof firstRow.workout_sessions === 'object')
        ? firstRow.workout_sessions as { workout_name?: string; ended_at?: string }
        : null;

      const sets = sessionRows
        .sort((a, b) => a.set_number - b.set_number)
        .map(r => ({
          setNumber: r.set_number,
          weightLb:  r.weight_lb !== null ? Number(r.weight_lb) : null,
          reps:      r.reps,
          rpe:       r.rpe !== null ? Number(r.rpe) : null,
        }));

      const totalVolumeLb = sets.reduce(
        (sum, s) => sum + ((s.weightLb ?? 0) * (s.reps ?? 0)),
        0
      );

      entries.push({
        sessionId:   key,
        workoutName: sessionMeta?.workout_name ?? 'Workout',
        completedAt: sessionMeta?.ended_at ?? firstRow.created_at,
        sets,
        totalVolumeLb,
      });
    }

    return entries; // already sorted newest-first
  } catch {
    return []; // never throw — empty is always a valid response
  }
}
