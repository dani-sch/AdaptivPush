import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase} from "@/utils/supabase";
import type { CurrentProgram, ProgramWorkout, WorkoutExercise } from '@/types/program';

type SwapArgs = { exerciseId: string; replacement: WorkoutExercise; applyToProgram: boolean };

type DbProgram = {
    id: string;
    name: string;
    goal: string | null;
    duration_weeks: number;
    start_date: string | null; // YYYY-MM-DD
};

type DbProgramDay = {
    id: string;
    week_number: number;
    day_index: number; // 1..7
    order_in_week: number;
    workout_name: string;
    estimated_duration_min: number | null;
    program_day_exercises: Array<{
        id: string;
        position: number;
        set_count: number;
        rep_range_min: number;
        rep_range_max: number;
        target_rpe: number | null;
        suggested_weight_lb: number | null;
        notes: string | null;
        exercises: {
            id: string;
            name: string;
            primary_muscle: string | null;
            equipment: string | null;
        } | null;
    }>;
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function computeWeekNumber(startDate: string | null, totalWeeks: number) {
    if (!startDate) return 1;

    // start_date is DATE; treat it as local date
    const start = new Date(startDate + 'T00:00:00');
    const now = new Date();

    const diffMs = now.getTime() - start.getTime();
    if (diffMs < 0) return 1;

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return clamp(week, 1, totalWeeks);
}

function todayISODate() {
    // YYYY-MM-DD in local time
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function requireUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not signed in');
    return data.user.id;
}

export function useCurrentProgram() {
    const [program, setProgram] = useState<CurrentProgram | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const {
                data: { user },
                error: authErr,
            } = await supabase.auth.getUser();

            if (authErr) throw authErr;
            if (!user) {
                setProgram(null);
                return;
            }

            // Get active program
            const { data: prog, error: progErr } = await supabase
                .from('programs')
                .select('id,name,goal,duration_weeks,start_date')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle<DbProgram>();

            if (progErr) throw progErr;
            if (!prog) {
                setProgram(null);
                return;
            }

            const currentWeek = computeWeekNumber(prog.start_date, prog.duration_weeks);

            // Get THIS WEEK's program_days with nested exercises
            const { data: days, error: daysErr } = await supabase
                .from('program_days')
                .select(
                    `
          id,
          week_number,
          day_index,
          order_in_week,
          workout_name,
          estimated_duration_min,
          program_day_exercises (
            id,
            position,
            set_count,
            rep_range_min,
            rep_range_max,
            target_rpe,
            suggested_weight_lb,
            notes,
            exercises (
              id,
              name,
              primary_muscle,
              equipment
            )
          )
        `,
                )
                .eq('program_id', prog.id)
                .eq('week_number', currentWeek)
                .order('day_index', { ascending: true })
                .order('order_in_week', { ascending: true })
                .returns<DbProgramDay[]>();

            if (daysErr) throw daysErr;

            // Map DB -> UI types
            const workouts: ProgramWorkout[] =
                (days ?? []).map((d) => {
                    const exercises: WorkoutExercise[] = (d.program_day_exercises ?? [])
                        .slice()
                        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                        .map((pde) => {
                            const ex = pde.exercises;
                            return {
                                id: pde.id, // program_day_exercises row id (swap targets this)
                                name: ex?.name ?? 'Unknown exercise',
                                sets: pde.set_count,
                                reps: `${pde.rep_range_min}-${pde.rep_range_max}`,
                                weight: pde.suggested_weight_lb ?? undefined,
                                muscleGroup: (ex?.primary_muscle as any) ?? undefined,
                                equipment: (ex?.equipment as any) ?? undefined,
                            };
                        });

                    return {
                        id: d.id, // program_day id
                        name: d.workout_name,
                        day: DAY_NAMES[(d.day_index ?? 1) - 1] ?? `Day ${d.day_index}`,
                        estimatedTime: d.estimated_duration_min ?? 0,
                        exercises,
                    };
                }) ?? [];

            // daysPerWeek is not stored on programs; infer from this week’s days count
            // may need to pull from user_profile.days_per_week instead
            const daysPerWeek = workouts.length;

            const mapped: CurrentProgram = {
                id: prog.id,
                name: prog.name,
                goal: prog.goal ?? '',
                currentWeek,
                totalWeeks: prog.duration_weeks,
                daysPerWeek,
                workouts,
            };

            setProgram(mapped);
        } catch (e) {
            console.error('useCurrentProgram refresh error', e);
            setProgram(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const swapExercise = useCallback(
        async ({ exerciseId, replacement, applyToProgram }: SwapArgs) => {
            // in the mapping above, exerciseId is the program_day_exercises row id (pde.id)
            // replacement.id should be the exercises.id from the exercises table
            if (!program) return;

            const pdeId = exerciseId;
            const newExerciseId = replacement.id;

            // find the PDE row to know the “original exercise” and parent program_day_id
            const { data: pdeRow, error: pdeErr } = await supabase
                .from('program_day_exercises')
                .select('id, program_day_id, exercise_id')
                .eq('id', pdeId)
                .single<{ id: string; program_day_id: string; exercise_id: string }>();

            if (pdeErr) throw pdeErr;

            if (!applyToProgram) {
                // update only this one row
                const { error: updErr } = await supabase
                    .from('program_day_exercises')
                    .update({ exercise_id: newExerciseId, updated_at: new Date().toISOString() })
                    .eq('id', pdeId);

                if (updErr) throw updErr;
                await refresh();
                return;
            }

            // applyToProgram = true means: replace this exercise everywhere in the program
            // Ww need to update all PDE rows in this program that currently reference old exercise_id
            const oldExerciseId = pdeRow.exercise_id;

            // get all program_day ids for this program (across all weeks)
            const { data: allDays, error: allDaysErr } = await supabase
                .from('program_days')
                .select('id')
                .eq('program_id', program.id);

            if (allDaysErr) throw allDaysErr;

            const dayIds = (allDays ?? []).map((d) => d.id);
            if (dayIds.length === 0) return;

            const { error: bulkErr } = await supabase
                .from('program_day_exercises')
                .update({ exercise_id: newExerciseId, updated_at: new Date().toISOString() })
                .in('program_day_id', dayIds)
                .eq('exercise_id', oldExerciseId);

            if (bulkErr) throw bulkErr;

            await refresh();
        },
        [program, refresh],
    );

    const createBlankProgram = useCallback(async () => {
        const userId = await requireUserId();

        // end any existing active programs
        // TODO: (decide whether to add archivability)
        await supabase
            .from('programs')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_active', true);

        const { data: prog, error: progErr } = await supabase
            .from('programs')
            .insert({
                user_id: userId,
                name: 'My Program',
                goal: 'Build strength',
                duration_weeks: 4,
                start_date: todayISODate(),
                is_active: true,
            })
            .select('id')
            .single<{ id: string }>();

        if (progErr) throw progErr;

        await refresh();
        return prog.id;
    }, [refresh]);

    const endCurrentProgram = useCallback(async () => {
        const userId = await requireUserId();

        // end the currently active program for this user
        const { error } = await supabase
            .from('programs')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        await refresh();
    }, [refresh]);

    const createDevTestProgram = useCallback(async () => {
        const userId = await requireUserId();

        // end any existing active programs
        // TODO: add archivability
        await supabase
            .from('programs')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_active', true);

        // create the program
        const { data: prog, error: progErr } = await supabase
            .from('programs')
            .insert({
                user_id: userId,
                name: 'Dev Default Program',
                goal: 'Full-body strength (demo)',
                duration_weeks: 4,
                start_date: todayISODate(),
                is_active: true,
            })
            .select('id')
            .single<{ id: string }>();

        if (progErr) throw progErr;

        // upsert exercises by name so this is repeatable
        // TODO: either add new exercise or choose existing instead of upsert after exercise DB incorporated
        const exerciseSeeds = [
            { name: 'Goblet Squat', primary_muscle: 'Legs', equipment: 'Dumbbell' },
            { name: 'Romanian Deadlift', primary_muscle: 'Back', equipment: 'Barbell' },
            { name: 'Bench Press', primary_muscle: 'Chest', equipment: 'Barbell' },
            { name: 'Overhead Press', primary_muscle: 'Shoulders', equipment: 'Dumbbell' },
            { name: 'Lat Pulldown', primary_muscle: 'Back', equipment: 'Machine' },
            { name: 'Plank', primary_muscle: 'Core', equipment: 'Bodyweight' },
        ] as const;

        const { data: exRows, error: exErr } = await supabase
            .from('exercises')
            .upsert(exerciseSeeds, { onConflict: 'name' })
            .select('id,name')
            .returns<Array<{ id: string; name: string }>>();

        if (exErr) throw exErr;

        const exIdByName = new Map(exRows.map((r) => [r.name, r.id]));

        // create program_days for Week 1 (3 days)
        const week1Days = [
            { day_index: 1, order_in_week: 1, workout_name: 'Day 1 — Full Body A', estimated_duration_min: 45 },
            { day_index: 3, order_in_week: 2, workout_name: 'Day 2 — Full Body B', estimated_duration_min: 45 },
            { day_index: 5, order_in_week: 3, workout_name: 'Day 3 — Full Body C', estimated_duration_min: 45 },
        ] as const;

        const { data: dayRows, error: dayErr } = await supabase
            .from('program_days')
            .insert(
                week1Days.map((d) => ({
                    program_id: prog.id,
                    week_number: 1,
                    day_index: d.day_index,
                    order_in_week: d.order_in_week,
                    workout_name: d.workout_name,
                    estimated_duration_min: d.estimated_duration_min,
                })),
            )
            .select('id,day_index')
            .returns<Array<{ id: string; day_index: number }>>();

        if (dayErr) throw dayErr;

        const dayIdByIndex = new Map(dayRows.map((d) => [d.day_index, d.id]));

        // create program_day_exercises
        const pde = [
            // Day 1
            {
                program_day_id: dayIdByIndex.get(1)!,
                exercise_id: exIdByName.get('Goblet Squat')!,
                position: 1,
                set_count: 3,
                rep_range_min: 8,
                rep_range_max: 12,
                target_rpe: 7,
                suggested_weight_lb: 35,
            },
            {
                program_day_id: dayIdByIndex.get(1)!,
                exercise_id: exIdByName.get('Bench Press')!,
                position: 2,
                set_count: 3,
                rep_range_min: 6,
                rep_range_max: 10,
                target_rpe: 7,
                suggested_weight_lb: 95,
            },
            {
                program_day_id: dayIdByIndex.get(1)!,
                exercise_id: exIdByName.get('Lat Pulldown')!,
                position: 3,
                set_count: 3,
                rep_range_min: 8,
                rep_range_max: 12,
                target_rpe: 7,
                suggested_weight_lb: 70,
            },
            {
                program_day_id: dayIdByIndex.get(1)!,
                exercise_id: exIdByName.get('Plank')!,
                position: 4,
                set_count: 3,
                rep_range_min: 30,
                rep_range_max: 45,
                target_rpe: 6,
                suggested_weight_lb: null,
            },

            // Day 2
            {
                program_day_id: dayIdByIndex.get(3)!,
                exercise_id: exIdByName.get('Romanian Deadlift')!,
                position: 1,
                set_count: 3,
                rep_range_min: 6,
                rep_range_max: 10,
                target_rpe: 7,
                suggested_weight_lb: 95,
            },
            {
                program_day_id: dayIdByIndex.get(3)!,
                exercise_id: exIdByName.get('Overhead Press')!,
                position: 2,
                set_count: 3,
                rep_range_min: 6,
                rep_range_max: 10,
                target_rpe: 7,
                suggested_weight_lb: 30,
            },
            {
                program_day_id: dayIdByIndex.get(3)!,
                exercise_id: exIdByName.get('Goblet Squat')!,
                position: 3,
                set_count: 3,
                rep_range_min: 10,
                rep_range_max: 15,
                target_rpe: 7,
                suggested_weight_lb: 30,
            },
            {
                program_day_id: dayIdByIndex.get(3)!,
                exercise_id: exIdByName.get('Plank')!,
                position: 4,
                set_count: 3,
                rep_range_min: 30,
                rep_range_max: 45,
                target_rpe: 6,
                suggested_weight_lb: null,
            },

            // Day 3
            {
                program_day_id: dayIdByIndex.get(5)!,
                exercise_id: exIdByName.get('Bench Press')!,
                position: 1,
                set_count: 3,
                rep_range_min: 6,
                rep_range_max: 10,
                target_rpe: 7,
                suggested_weight_lb: 95,
            },
            {
                program_day_id: dayIdByIndex.get(5)!,
                exercise_id: exIdByName.get('Lat Pulldown')!,
                position: 2,
                set_count: 3,
                rep_range_min: 8,
                rep_range_max: 12,
                target_rpe: 7,
                suggested_weight_lb: 70,
            },
            {
                program_day_id: dayIdByIndex.get(5)!,
                exercise_id: exIdByName.get('Romanian Deadlift')!,
                position: 3,
                set_count: 3,
                rep_range_min: 6,
                rep_range_max: 10,
                target_rpe: 7,
                suggested_weight_lb: 95,
            },
            {
                program_day_id: dayIdByIndex.get(5)!,
                exercise_id: exIdByName.get('Plank')!,
                position: 4,
                set_count: 3,
                rep_range_min: 30,
                rep_range_max: 45,
                target_rpe: 6,
                suggested_weight_lb: null,
            },
        ];

        const { error: pdeErr } = await supabase.from('program_day_exercises').insert(
            pde.map((row) => ({
                ...row,
                notes: null,
            })),
        );

        if (pdeErr) throw pdeErr;

        await refresh();
        return prog.id;
    }, [refresh]);

    return { program, loading, refresh, swapExercise, createBlankProgram, createDevTestProgram, endCurrentProgram };
}