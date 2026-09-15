import type { SupabaseClient } from '@supabase/supabase-js';
import type { FrozenWorkoutPrescription } from './contracts';
import type { CompletedWorkoutSetCorrection } from './correctionContracts';
import { classifySupabaseError } from '@/utils/supabaseResilience';

export const CORRECTIONS_UNAVAILABLE = 'This workout can be viewed, but updates are temporarily unavailable.';

export async function loadCompletedWorkout(client: SupabaseClient, ownerId: string, sessionId: string) {
  // Read stable columns first: an undeployed correction column must never hide history.
  const { data: session, error } = await client.from('workout_sessions').select('*')
    .eq('id', sessionId).eq('user_id', ownerId).maybeSingle();
  if (error) throw error;
  if (!session) throw new Error('This completed workout is unavailable for this account.');
  const { data: rows, error: setsError } = await client.from('workout_exercise_sets')
    .select('*').eq('session_id', sessionId).order('set_number');
  if (setsError) throw setsError;
  let canCorrect = false;
  // A read-only capability function confirms the RPC and snapshot-outcome contract together.
  const capability = await client.rpc('workout_correction_capability_v1');
  if (!capability.error) canCorrect = capability.data === 2 && session.correction_revision !== undefined && session.lifecycle === 'finalized';
  else if (classifySupabaseError(capability.error).category !== 'schema_unavailable') {
    // History remains readable during a capability/network failure.
    console.warn('[workout.capability]', capability.error.code);
  }
  const sets: CompletedWorkoutSetCorrection[] = (rows ?? []).map(row => ({
    actualSetId: row.actual_set_id ?? row.id, prescriptionSlotId: row.prescription_slot_id ?? null,
    prescribedExerciseId: row.prescribed_exercise_id ?? null, exerciseId: row.exercise_id,
    order: row.order_index ?? row.set_number, reps: row.reps,
    loadValue: row.load_value == null ? row.weight_lb == null ? null : Number(row.weight_lb) : Number(row.load_value),
    loadKind: row.load_kind ?? 'external', loadUnit: row.load_unit ?? 'lb', loadSide: row.load_side ?? 'unknown',
    rpe: row.rpe == null ? null : Number(row.rpe), loggedAt: row.logged_at ?? session.ended_at,
  }));
  return { session, snapshot: session.prescription_snapshot as FrozenWorkoutPrescription | null, sets, canCorrect };
}
