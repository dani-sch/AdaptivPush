import type { SupabaseClient } from '@supabase/supabase-js';
import type { FrozenWorkoutPrescription } from './contracts';
import type { CompletedWorkoutSetCorrection } from './correctionContracts';
import { classifySupabaseError, reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

export const CORRECTIONS_UNAVAILABLE = 'This workout can be viewed. The server does not yet support workout updates.';

/** Stable pagination includes the complete catalog, including detailed card metadata. */
export async function loadExercisePickerCatalog(client: SupabaseClient, muscleGroup?: string, isCurrent = () => true) {
  const rows: { id: string; name: string; primary_muscle: string; equipment: string; image_url: string | null; instructions: string[] | null }[] = [];
  const pageSize = 500;
  for (let offset = 0; isCurrent(); offset += pageSize) {
    let query = client.from('exercises').select('id, name, primary_muscle, equipment, image_url, instructions')
      .order('name').order('id').range(offset, offset + pageSize - 1);
    if (muscleGroup) query = query.eq('primary_muscle', muscleGroup);
    const page = await query;
    if (!isCurrent()) return [];
    if (page.error) throw page.error;
    rows.push(...page.data);
    if (page.data.length < pageSize) return rows;
  }
  return [];
}

export async function loadCorrectionCatalog(client: SupabaseClient) {
  const data: { id: string; name: string }[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from('exercises').select('id,name').order('name').order('id').range(offset, offset + pageSize - 1);
    if (page.error) return { data: [], error: page.error };
    data.push(...page.data);
    if (page.data.length < pageSize) return { data, error: null };
  }
}

export async function workoutCorrectionsAvailable(client: SupabaseClient): Promise<boolean> {
  return await workoutCorrectionIssue(client) === null;
}

async function workoutCorrectionIssue(client: SupabaseClient): Promise<string | null> {
  try {
    const capability = await client.rpc('workout_correction_capability_v1');
    if (!capability.error) return capability.data === 2 ? null : CORRECTIONS_UNAVAILABLE;
    throw capability.error;
  } catch (error) {
    if (classifySupabaseError(error).category === 'schema_unavailable') return CORRECTIONS_UNAVAILABLE;
    reportSupabaseFailure('workout.capability', error);
    return supabaseUserMessage(error, 'Workout updates could not be checked. Reload to try again.');
  }
}

export async function loadCompletedWorkout(client: SupabaseClient, ownerId: string, sessionId: string) {
  // Read stable columns first: an undeployed correction column must never hide history.
  const { data: session, error } = await client.from('workout_sessions').select('*')
    .eq('id', sessionId).eq('user_id', ownerId).maybeSingle();
  if (error) throw error;
  if (!session) throw new Error('This completed workout is unavailable for this account.');
  const { data: rows, error: setsError } = await client.from('workout_exercise_sets')
    .select('*').eq('session_id', sessionId).order('set_number');
  if (setsError) throw setsError;
  // A read-only capability function confirms the RPC and snapshot-outcome contract together.
  const capabilityIssue = await workoutCorrectionIssue(client);
  const correctionIssue = session.lifecycle !== 'finalized'
    ? 'Only finalized workouts can be updated.'
    : !Number.isInteger(session.correction_revision) || session.correction_revision < 0
      ? 'This workout is missing the revision information required for safe updates.'
      : capabilityIssue;
  const canCorrect = correctionIssue === null;
  const sets: CompletedWorkoutSetCorrection[] = (rows ?? []).map(row => ({
    actualSetId: row.actual_set_id ?? row.id, prescriptionSlotId: row.prescription_slot_id ?? null,
    prescribedExerciseId: row.prescribed_exercise_id ?? null, exerciseId: row.exercise_id,
    order: row.order_index ?? row.set_number, reps: row.reps,
    loadValue: row.load_value == null
      ? row.load_kind === 'bodyweight' || row.load_kind === 'unknown' || row.weight_lb == null ? null : Number(row.weight_lb)
      : Number(row.load_value),
    loadKind: row.load_kind ?? 'external',
    loadUnit: row.load_kind === 'bodyweight' || row.load_kind === 'unknown' ? 'none' : row.load_unit ?? 'lb',
    loadSide: row.load_side ?? 'unknown',
    rpe: row.rpe == null ? null : Number(row.rpe), loggedAt: row.logged_at ?? session.ended_at,
  }));
  return { session, snapshot: session.prescription_snapshot as FrozenWorkoutPrescription | null, sets, canCorrect, correctionIssue };
}
