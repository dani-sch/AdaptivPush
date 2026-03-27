import { supabase } from '@/utils/supabase';
import type { ProgramGenParams, GeneratedProgram } from '@/types/program';

export async function saveProgramToDb(
  userId: string,
  params: ProgramGenParams,
  generated: GeneratedProgram,
): Promise<string> {
  // Step 1: Deactivate existing active programs
  await supabase
    .from('programs')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  // Step 2: Insert new program row
  const todayISO = new Date().toISOString().split('T')[0];

  const { data: prog, error: progErr } = await supabase
    .from('programs')
    .insert({
      user_id:        userId,
      name:           generated.name,
      goal:           generated.goal,
      duration_weeks: generated.durationWeeks,
      days_per_week:  generated.daysPerWeek,
      start_date:     todayISO,
      is_active:      true,
    })
    .select('id')
    .single();

  if (progErr) throw progErr;
  const programId = prog.id as string;

  // Step 3: Upsert all unique exercises by name
  const uniqueExercises = [...new Set(
    generated.days.flatMap(d => d.exercises.map(e => e.exerciseName)),
  )];

  const exerciseRows = uniqueExercises.map(name => ({ name }));

  const { data: exData, error: exErr } = await supabase
    .from('exercises')
    .upsert(exerciseRows, { onConflict: 'name', ignoreDuplicates: true })
    .select('id, name');

  if (exErr) throw exErr;

  const exIdByName = new Map<string, string>();

  if (exData) {
    for (const ex of exData) exIdByName.set(ex.name as string, ex.id as string);
  }

  // Fetch any exercises not returned by the upsert (already existed)
  const missingNames = uniqueExercises.filter(n => !exIdByName.has(n));
  if (missingNames.length > 0) {
    const { data: fetchedEx, error: fetchErr } = await supabase
      .from('exercises')
      .select('id, name')
      .in('name', missingNames);

    if (fetchErr) throw fetchErr;

    for (const ex of fetchedEx ?? []) exIdByName.set(ex.name as string, ex.id as string);
  }

  // Step 4: Insert all program_days
  const dayInserts = generated.days.map(d => ({
    program_id:             programId,
    week_number:            d.weekNumber,
    day_index:              d.dayIndex,
    order_in_week:          d.orderInWeek,
    workout_name:           d.workoutName,
    estimated_duration_min: d.estimatedDurationMin,
  }));

  const { data: dayData, error: dayErr } = await supabase
    .from('program_days')
    .insert(dayInserts)
    .select('id, week_number, day_index');

  if (dayErr) throw dayErr;

  const dayIdByKey = new Map<string, string>();
  for (const d of dayData ?? []) {
    dayIdByKey.set(`${d.week_number}_${d.day_index}`, d.id as string);
  }

  // Step 5: Insert all program_day_exercises
  const pdeInserts = generated.days.flatMap(d => {
    const dayId = dayIdByKey.get(`${d.weekNumber}_${d.dayIndex}`);
    if (!dayId) return [];

    return d.exercises
      .map(ex => {
        const exerciseId = exIdByName.get(ex.exerciseName);
        if (!exerciseId) return null;

        return {
          program_day_id:      dayId,
          exercise_id:         exerciseId,
          position:            ex.position,
          set_count:           ex.setCount,
          rep_range_min:       ex.repRangeMin,
          rep_range_max:       ex.repRangeMax,
          target_rpe:          ex.targetRPE,
          suggested_weight_lb: ex.suggestedWeightLb,
          notes:               null,
        };
      })
      .filter(Boolean);
  });

  const { error: pdeErr } = await supabase
    .from('program_day_exercises')
    .insert(pdeInserts);

  if (pdeErr) throw pdeErr;

  // Step 6: Return programId
  return programId;
}
