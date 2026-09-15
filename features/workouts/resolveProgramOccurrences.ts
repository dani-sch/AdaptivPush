import type { CurrentProgram, ProgramWorkout } from '@/types/program';
import type { FrozenWorkoutPrescription } from './contracts';
import { workoutDraftStore } from './draftStore';
import { effectiveCurrentWorkout } from './effectiveCurrentWorkout';
import { projectCompletedOccurrence } from './effectiveOccurrence';
import { supabase } from '@/utils/supabase';

/** One reconciliation boundary for Home, Plan and full-program previews. */
export async function resolveProgramOccurrences(program: CurrentProgram, ownerId: string): Promise<CurrentProgram> {
  const lineage = await supabase.from('program_days').select('id,stable_day_id').eq('program_id', program.id);
  if (lineage.error) throw lineage.error;
  const ids = (lineage.data ?? []).map(d => d.id);
  const sessions = ids.length ? await supabase.from('workout_sessions')
    .select('id,program_day_id,prescription_snapshot,completion_class,ended_at')
    .eq('user_id', ownerId).in('program_day_id', ids).eq('lifecycle', 'finalized').order('ended_at', { ascending: false })
    : { data: [], error: null };
  if (sessions.error) throw sessions.error;
  const workouts = await Promise.all(program.workouts.map(async (workout): Promise<ProgramWorkout> => {
    const session = sessions.data?.find(s => lineage.data?.some(d => d.id === s.program_day_id && d.stable_day_id === workout.stableDayId));
    if (session) {
      const snapshot = session.prescription_snapshot as FrozenWorkoutPrescription | null;
      const projected = projectCompletedOccurrence(snapshot, []);
      return { ...workout, isCompleted: true, sessionId: session.id,
        exercises: projected.missingPrescription ? workout.exercises : projected.exercises.map(e => ({
          id: e.slotId, stableSlotId: e.slotId, exerciseId: e.exerciseId, name: e.name,
          sets: e.sets.length, reps: snapshot?.slots.find(s => s.slotId === e.slotId)?.sets[0]
            ? `${snapshot.slots.find(s => s.slotId === e.slotId)!.sets[0].plannedRepsMin}-${snapshot.slots.find(s => s.slotId === e.slotId)!.sets[0].plannedRepsMax}` : undefined,
        })),
      };
    }
    const draft = await workoutDraftStore.loadMatching(ownerId, {
      programId: program.id, stableDayId: workout.stableDayId, programDayId: workout.id,
    });
    return { ...effectiveCurrentWorkout(program, workout, ownerId, draft)!,
      isCompleted: draft?.lifecycle === 'finalized' || workout.isCompleted,
      sessionId: draft?.finalizedReceipt?.sessionId };
  }));
  return { ...program, workouts };
}
