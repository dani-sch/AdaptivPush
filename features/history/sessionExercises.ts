import type { SupabaseClient } from '@supabase/supabase-js';

export interface SessionExerciseSet {
  setId: string;
  setNumber: number;
  loadValue: number | null;
  loadUnit: 'lb' | 'kg' | 'none';
  loadKind: 'external' | 'bodyweight' | 'assistance' | 'unknown';
  reps: number | null;
  rpe: number | null;
}

export interface SessionExercise {
  exerciseId: string;
  name: string;
  sets: SessionExerciseSet[];
}

interface ActualSetRow {
  id: string;
  actual_set_id: string | null;
  exercise_id: string;
  set_number: number;
  load_value: number | string | null;
  weight_lb: number | string | null;
  load_unit: SessionExerciseSet['loadUnit'] | null;
  load_kind: SessionExerciseSet['loadKind'] | null;
  reps: number | null;
  rpe: number | null;
  exercises: { id: string; name: string };
}

const PAGE_SIZE = 500;

export async function fetchSessionExercises(client: SupabaseClient, sessionId: string): Promise<SessionExercise[]> {
  const rows: ActualSetRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client.from('workout_exercise_sets')
      .select('id, actual_set_id, exercise_id, set_number, load_value, weight_lb, load_unit, load_kind, reps, rpe, exercises!workout_exercise_sets_exercise_id_fkey(id, name)')
      .eq('session_id', sessionId)
      .order('set_number', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid performed exercise history response.');
    for (const raw of data) {
      const embedded: unknown = raw.exercises;
      if (typeof raw.id !== 'string' || typeof raw.exercise_id !== 'string' ||
        typeof raw.set_number !== 'number' || !embedded || typeof embedded !== 'object' ||
        Array.isArray(embedded) || !('id' in embedded) || !('name' in embedded) ||
        embedded.id !== raw.exercise_id || typeof embedded.name !== 'string') {
        throw new Error('Invalid performed exercise in workout history.');
      }
      rows.push({ ...raw, exercises: { id: embedded.id, name: embedded.name } });
    }
    if (data.length < PAGE_SIZE) break;
  }

  const grouped = new Map<string, SessionExercise>();
  for (const row of rows) {
    let exercise = grouped.get(row.exercise_id);
    if (!exercise) {
      exercise = { exerciseId: row.exercise_id, name: row.exercises.name, sets: [] };
      grouped.set(row.exercise_id, exercise);
    }
    exercise.sets.push({
      setId: row.actual_set_id ?? row.id,
      setNumber: row.set_number,
      loadValue: row.load_value == null
        ? row.weight_lb == null ? null : Number(row.weight_lb)
        : Number(row.load_value),
      loadUnit: row.load_unit ?? (row.weight_lb == null ? 'none' : 'lb'),
      loadKind: row.load_kind ?? 'external',
      reps: row.reps == null ? null : Number(row.reps),
      rpe: row.rpe == null ? null : Number(row.rpe),
    });
  }
  return Array.from(grouped.values());
}
