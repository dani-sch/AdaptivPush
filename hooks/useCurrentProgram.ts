import { workoutDraftStore } from '@/features/workouts/draftStore';
import { amendWorkoutExercise } from '@/features/workouts/contracts';
import { resolveProgramOccurrences } from '@/features/workouts/resolveProgramOccurrences';
import { checkpointWeek } from '@/features/programs/checkpoint';
import {
    createContext,
    createElement,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
} from 'react';
import { supabase } from "@/utils/supabase";
import { notifyDeloadWeek } from '@/utils/notifications';
import type { CurrentProgram, ProgramWorkout, WorkoutExercise } from '@/types/program';
import { computeProgression } from '@/utils/progressionEngine';
import type { ProgressionContext, LoggedSet } from '@/types/progression';
import type { TrainingExperience } from '@/types/database';
import { computeCyclePhase } from '@/utils/cyclePhase';
import { isCatalogExerciseId } from '@/features/catalog/contracts';
import { archiveProgram, reviseProgramExercise } from '@/features/programs/commands';
import { programRepository } from '@/features/programs/repository';
import { isMissingRelationOrColumnError } from '@/utils/profilePreferences';
import {
    classifySupabaseError,
    OperationFailureError,
    reportSupabaseFailure,
    runSupabaseOperation,
    supabaseUserMessage,
    type SupabaseFailureCategory,
} from '@/utils/supabaseResilience';
import {
    canApplyOwnerScopedResult,
    programStateAfterFailure,
} from '@/features/programs/availability';

type SwapArgs = {
    exerciseId: string;
    replacement: WorkoutExercise;
    scope: 'workout_only' | 'rest_of_program';
    startedWorkout?: boolean;
};

type DbProgram = {
    id: string;
    name: string;
    goal: string | null;
    duration_weeks: number;
    start_date: string | null; // YYYY-MM-DD
    swap_interval_weeks?: number | null;
    current_revision?: number;
    archive_checkpoint?: Record<string, unknown> | null;
    current_revision_id?: string | null;
};

type DbProgramDay = {
    id: string;
    stable_day_id?: string;
    week_number: number;
    day_index: number; // 1..7
    order_in_week: number;
    workout_name: string;
    estimated_duration_min: number | null;
    program_revision_id?: string | null;
    program_day_exercises: Array<{
        id: string;
        stable_slot_id?: string;
        position: number;
        set_count: number;
        rep_range_min: number;
        rep_range_max: number;
        target_rpe: number | null;
        suggested_weight_lb: number | null;
        load_kind?: WorkoutExercise['loadKind'];
        load_unit?: WorkoutExercise['loadUnit'];
        load_side?: WorkoutExercise['loadSide'];
        per_set_weights_lb: number[] | null;
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

function todayISODate() {
    // YYYY-MM-DD in local time
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function requireUserId() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) throw new Error('Not signed in');
    return data.session.user.id;
}

function useCurrentProgramState() {
    const [program, setProgram] = useState<CurrentProgram | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [failureCategory, setFailureCategory] = useState<SupabaseFailureCategory | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [ownerId, setOwnerId] = useState<string | null>(null);

    const prevWeekRef = useRef<number>(0);
    const applyProgressionRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const programRef = useRef<CurrentProgram | null>(null);
    const ownerIdRef = useRef<string | null>(null);
    const refreshControllerRef = useRef<AbortController | null>(null);
    const refreshGenerationRef = useRef(0);

    useEffect(() => {
        programRef.current = program;
    }, [program]);

    const refresh = useCallback(async () => {
        const generation = refreshGenerationRef.current + 1;
        refreshGenerationRef.current = generation;
        refreshControllerRef.current?.abort();
        const controller = new AbortController();
        refreshControllerRef.current = controller;
        const hadProgram = programRef.current !== null;
        setLoading(!hadProgram);
        setRefreshing(hadProgram);
        try {
            const {
                data: { session },
                error: authErr,
            } = await runSupabaseOperation(() => supabase.auth.getSession(), {
                kind: 'auth',
                operation: 'program.local_session',
                signal: controller.signal,
            });

            if (authErr) throw authErr;
            const user = session?.user;
            if (!user) {
                ownerIdRef.current = null;
                setOwnerId(null);
                setProgram(null);
                programRef.current = null;
                setUnavailable(false);
                setFailureCategory(null);
                return;
            }
            const requestOwnerId = user.id;
            setOwnerId(requestOwnerId);
            if (ownerIdRef.current !== requestOwnerId) {
                ownerIdRef.current = requestOwnerId;
                programRef.current = null;
                setProgram(null);
                prevWeekRef.current = 0;
            }

            // Get active program
            const currentProgramResult = await runSupabaseOperation(
                (signal) => supabase
                    .from('programs')
                    .select('id,name,goal,duration_weeks,start_date,swap_interval_weeks,current_revision,current_revision_id,archive_checkpoint')
                    .eq('user_id', requestOwnerId)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .abortSignal(signal)
                    .maybeSingle<DbProgram>(),
                {
                    kind: 'read',
                    operation: 'program.active',
                    signal: controller.signal,
                },
            );

            let prog = currentProgramResult.data;
            let progErr = currentProgramResult.error;

            // AP-03 ships additively. Keep existing programs readable while the
            // database migration and writer flag are still rolling out.
            if (
                progErr &&
                isMissingRelationOrColumnError(progErr, 'programs', 'current_revision')
            ) {
                const legacyProgramResult = await runSupabaseOperation(
                    (signal) => supabase
                        .from('programs')
                        .select('id,name,goal,duration_weeks,start_date,swap_interval_weeks')
                        .eq('user_id', requestOwnerId)
                        .eq('is_active', true)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .abortSignal(signal)
                        .maybeSingle<Omit<DbProgram, 'current_revision' | 'current_revision_id'>>(),
                    {
                        kind: 'read',
                        operation: 'program.active_legacy',
                        signal: controller.signal,
                    },
                );

                prog = legacyProgramResult.data
                    ? {
                        ...legacyProgramResult.data,
                        current_revision: 1,
                        current_revision_id: null,
                    }
                    : null;
                progErr = legacyProgramResult.error;
            }

            if (progErr) throw progErr;
            if (!prog) {
                if (canApplyOwnerScopedResult(requestOwnerId, ownerIdRef.current, controller.signal.aborted)) {
                    setProgram(null);
                    programRef.current = null;
                    setUnavailable(false);
                    setFailureCategory(null);
                }
                return;
            }

            const currentWeek = checkpointWeek(prog.start_date, prog.duration_weeks, prog.archive_checkpoint, todayISODate());

            // Get THIS WEEK's program_days with nested exercises
            let currentDaysQuery = supabase
                .from('program_days')
                .select(
                    `
          id,
          stable_day_id,
          week_number,
          day_index,
          order_in_week,
          workout_name,
          estimated_duration_min,
          program_revision_id,
          program_day_exercises!program_day_exercises_program_day_id_fkey (
            id,
            stable_slot_id,
            load_kind,
            load_unit,
            load_side,
            position,
            set_count,
            rep_range_min,
            rep_range_max,
            target_rpe,
            suggested_weight_lb,
            per_set_weights_lb,
            notes,
            exercises!program_day_exercises_exercise_id_fkey (
              id,
              name,
              primary_muscle,
              equipment,
              image_url,
              instructions
            )
          )
        `,
                )
                .eq('program_id', prog.id)
                .eq('week_number', currentWeek);
            if (prog.current_revision_id) {
                currentDaysQuery = currentDaysQuery.eq('program_revision_id', prog.current_revision_id);
            }
            const currentDaysResult = await runSupabaseOperation(
                (signal) => currentDaysQuery
                    .order('day_index', { ascending: true })
                    .order('order_in_week', { ascending: true })
                    .abortSignal(signal)
                    .returns<DbProgramDay[]>(),
                {
                    kind: 'read',
                    operation: 'program.current_days',
                    signal: controller.signal,
                },
            );

            let days = currentDaysResult.data;
            let daysErr = currentDaysResult.error;

            if (
                daysErr &&
                isMissingRelationOrColumnError(daysErr, 'program_days', 'program_revision_id')
            ) {
                const legacyDaysResult = await runSupabaseOperation(
                    (signal) => supabase
                        .from('program_days')
                        .select(
                        `
          id,
          week_number,
          day_index,
          order_in_week,
          workout_name,
          estimated_duration_min,
          program_day_exercises!program_day_exercises_program_day_id_fkey (
            id,
            position,
            set_count,
            rep_range_min,
            rep_range_max,
            target_rpe,
            suggested_weight_lb,
            per_set_weights_lb,
            notes,
            exercises!program_day_exercises_exercise_id_fkey (
              id,
              name,
              primary_muscle,
              equipment,
              image_url,
              instructions
            )
          )
        `,
                        )
                        .eq('program_id', prog.id)
                        .eq('week_number', currentWeek)
                        .order('day_index', { ascending: true })
                        .order('order_in_week', { ascending: true })
                        .abortSignal(signal)
                        .returns<DbProgramDay[]>(),
                    {
                        kind: 'read',
                        operation: 'program.current_days_legacy',
                        signal: controller.signal,
                    },
                );

                days = legacyDaysResult.data;
                daysErr = legacyDaysResult.error;
            }

            if (daysErr) throw daysErr;

            // Find which days in this week already have a completed session
            let completionDays = (days ?? []).map((d) => ({ id: d.id, stable_day_id: d.stable_day_id }));
            const stableDayIds = completionDays.flatMap((day) => day.stable_day_id ? [day.stable_day_id] : []);
            if (prog.current_revision_id && stableDayIds.length > 0) {
                const lineageDaysResult = await runSupabaseOperation(
                    (signal) => supabase
                        .from('program_days')
                        .select('id,stable_day_id')
                        .eq('program_id', prog.id)
                        .in('stable_day_id', stableDayIds)
                        .abortSignal(signal)
                        .returns<Array<{ id: string; stable_day_id: string }>>(),
                    {
                        kind: 'read',
                        operation: 'program.day_lineage',
                        signal: controller.signal,
                    },
                );
                if (!lineageDaysResult.error && lineageDaysResult.data) completionDays = lineageDaysResult.data;
            }
            const dayIds = completionDays.map((d) => d.id);
            let completedDayIds = new Set<string>();
            if (dayIds.length > 0) {
                const currentSessionsResult = await runSupabaseOperation(
                    (signal) => supabase
                        .from('workout_sessions')
                        .select('program_day_id,completion_class,lifecycle')
                        .eq('user_id', requestOwnerId)
                        .in('program_day_id', dayIds)
                        .eq('lifecycle', 'finalized')
                        .abortSignal(signal),
                    {
                        kind: 'read',
                        operation: 'program.completed_sessions',
                        signal: controller.signal,
                    },
                );

                let sessions: { program_day_id: string }[] | null = currentSessionsResult.data;
                let sessionsErr = currentSessionsResult.error;

                if (
                    sessionsErr &&
                    isMissingRelationOrColumnError(sessionsErr, 'workout_sessions', 'lifecycle')
                ) {
                    const legacySessionsResult = await runSupabaseOperation(
                        (signal) => supabase
                            .from('workout_sessions')
                            .select('program_day_id')
                            .eq('user_id', requestOwnerId)
                            .in('program_day_id', dayIds)
                            .abortSignal(signal),
                        {
                            kind: 'read',
                            operation: 'program.completed_sessions_legacy',
                            signal: controller.signal,
                        },
                    );

                    sessions = legacySessionsResult.data;
                    sessionsErr = legacySessionsResult.error;
                }

                if (sessionsErr) throw sessionsErr;
                completedDayIds = new Set(
                    (sessions ?? []).map((s: { program_day_id: string }) => s.program_day_id)
                );
            }
            const completedStableDayIds = new Set(
                completionDays
                    .filter((day) => completedDayIds.has(day.id) && day.stable_day_id)
                    .map((day) => day.stable_day_id as string),
            );

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
                                stableSlotId: pde.stable_slot_id,
                                exerciseId: ex?.id ?? undefined,
                                name: ex?.name ?? 'Unknown exercise',
                                imageUrl: (ex as any)?.image_url ?? undefined,
                                description: ((ex as any)?.instructions as string[] | null)?.[0] ?? undefined,
                                sets: pde.set_count,
                                reps: `${pde.rep_range_min}-${pde.rep_range_max}`,
                                weight: pde.suggested_weight_lb ?? undefined,
                                perSetWeights: pde.per_set_weights_lb ?? undefined,
                                loadKind: pde.load_kind,
                                loadUnit: pde.load_unit,
                                loadSide: pde.load_side,
                                targetRpe: pde.target_rpe ?? undefined,
                                muscleGroup: (ex?.primary_muscle as any) ?? undefined,
                                equipment: (ex?.equipment as any) ?? undefined,
                            };
                        });

                    return {
                        id: d.id, // program_day id
                        stableDayId: d.stable_day_id,
                        prescriptionRevisionId: d.program_revision_id ?? prog.current_revision_id ?? undefined,
                        name: d.workout_name,
                        day: DAY_NAMES[(d.day_index ?? 1) - 1] ?? `Day ${d.day_index}`,
                        estimatedTime: d.estimated_duration_min ?? 0,
                        exercises,
                        isCompleted: completedDayIds.has(d.id)
                            || Boolean(d.stable_day_id && completedStableDayIds.has(d.stable_day_id)),
                    };
                }) ?? [];

            // Sort: uncompleted workouts first (preserving order_in_week DB order), completed last
            workouts.sort((a, b) => {
                if (a.isCompleted === b.isCompleted) return 0;
                return a.isCompleted ? 1 : -1;
            });

            // daysPerWeek is not stored on programs; infer from this week’s days count
            // may need to pull from user_profile.days_per_week instead
            const daysPerWeek = workouts.length;

            const mapped: CurrentProgram = {
                id: prog.id,
                currentRevision: prog.current_revision ?? 1,
                currentRevisionId: prog.current_revision_id ?? undefined,
                name: prog.name,
                goal: prog.goal ?? '',
                currentWeek,
                totalWeeks: prog.duration_weeks,
                daysPerWeek,
                swapIntervalWeeks: prog.swap_interval_weeks ?? 4,
                workouts,
            };

            if (!canApplyOwnerScopedResult(requestOwnerId, ownerIdRef.current, controller.signal.aborted)) {
                return;
            }
            const resolved = await resolveProgramOccurrences(mapped, requestOwnerId);
            if (!canApplyOwnerScopedResult(requestOwnerId, ownerIdRef.current, controller.signal.aborted)) return;
            setProgram(resolved);
            programRef.current = resolved;
            setUnavailable(false);
            setFailureCategory(null);

            // Trigger progression when week advances
            if (mapped.currentWeek > prevWeekRef.current && prevWeekRef.current !== 0) {
                applyProgressionRef.current?.();
            }
            prevWeekRef.current = mapped.currentWeek;
        } catch (e) {
            const failure = classifySupabaseError(e);
            if (failure.category === 'cancelled' || generation !== refreshGenerationRef.current) return;
            reportSupabaseFailure('program.refresh', e);
            const failedState = programStateAfterFailure(programRef.current, failure.category);
            setProgram(failedState.program);
            setUnavailable(failedState.unavailable);
            setFailureCategory(failedState.failureCategory);
        } finally {
            if (generation === refreshGenerationRef.current) {
                setLoading(false);
                setRefreshing(false);
                if (refreshControllerRef.current === controller) refreshControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        void refresh();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextOwnerId = session?.user.id ?? null;
            if (nextOwnerId === ownerIdRef.current) return;
            refreshControllerRef.current?.abort();
            ownerIdRef.current = nextOwnerId;
            setOwnerId(nextOwnerId);
            programRef.current = null;
            setProgram(null);
            setUnavailable(false);
            setFailureCategory(null);
            prevWeekRef.current = 0;
            void refresh();
        });
        return () => {
            subscription.unsubscribe();
            refreshControllerRef.current?.abort();
        };
    }, [refresh]);

    const applyProgressionToNextWeek = useCallback(async () => {
        if (!program) return;

        const userId = await requireUserId();
        const nextWeek = program.currentWeek + 1;
        if (nextWeek > program.totalWeeks) return;

        // Fetch user profile fields needed for progression adjustments
        const { data: profile, error: profileError } = await supabase
            .from('user_profile')
            .select('experience_level, cycle_enabled, last_period_start_date, avg_cycle_length_days')
            .eq('user_id', userId)
            .single();
        if (profileError) throw profileError;
        const experienceLevel = (profile?.experience_level ?? 'intermediate') as TrainingExperience;

        const cyclePhase = profile?.cycle_enabled && profile?.last_period_start_date
            ? computeCyclePhase(profile.last_period_start_date, profile.avg_cycle_length_days ?? 28)
            : undefined;

        const isCycleReduced = cyclePhase === 'menstrual' || cyclePhase === 'luteal';

        // Get next week's program_days with nested program_day_exercises
        let nextDaysQuery = supabase
            .from('program_days')
            .select(`
              id,
              program_day_exercises!program_day_exercises_program_day_id_fkey (
                id,
                exercise_id,
                set_count,
                rep_range_min,
                rep_range_max,
                target_rpe,
                suggested_weight_lb,
                exercises!program_day_exercises_exercise_id_fkey ( name )
              )
            `)
            .eq('program_id', program.id)
            .eq('week_number', nextWeek);
        if (program.currentRevisionId) {
            nextDaysQuery = nextDaysQuery.eq('program_revision_id', program.currentRevisionId);
        }
        const { data: nextDays, error: nextDaysError } = await nextDaysQuery;
        if (nextDaysError) throw nextDaysError;

        if (!nextDays) return;

        const updates: Promise<void>[] = [];

        for (const day of nextDays) {
            const pdes = (day as any).program_day_exercises ?? [];
            for (const pde of pdes) {
                const exerciseName: string = (pde.exercises as any)?.name ?? '';

                // Fetch most recent logged sets for this exercise (scoped to this user).
                // First find the most recent session_id, then get all sets from that session.
                const { data: latestSession, error: latestSessionError } = await supabase
                    .from('workout_exercise_sets')
                    .select('session_id, workout_sessions!inner(user_id,completion_class)')
                    .eq('exercise_id', pde.exercise_id)
                    .eq('workout_sessions.user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (latestSessionError) throw latestSessionError;

                const latestSessionId = (latestSession?.[0] as any)?.session_id;

                let recentSets = null;
                if (latestSessionId) {
                    const { data: latestSets, error: recentSetsError } = await supabase
                        .from('workout_exercise_sets')
                        .select('set_number, weight_lb, reps, rpe')
                        .eq('exercise_id', pde.exercise_id)
                        .eq('session_id', latestSessionId)
                        .order('set_number', { ascending: true })
                    if (recentSetsError) throw recentSetsError;
                    recentSets = latestSets;
                }

                const lastSessionSets: LoggedSet[] = (recentSets ?? [])
                    .filter((s: any) => s.weight_lb !== null && s.reps !== null)
                    .map((s: any) => ({
                        setNumber: s.set_number,
                        weightLb:  Number(s.weight_lb),
                        reps:      Number(s.reps),
                        rpe:       s.rpe != null ? Number(s.rpe) : null,
                    }));

                // Use actually-lifted weight as progression baseline (falls back to programmed weight)
                const liftedWeightAvg = lastSessionSets.length > 0
                    ? lastSessionSets.reduce((sum, s) => sum + s.weightLb, 0) / lastSessionSets.length
                    : null;
                const baselineWeight = liftedWeightAvg ?? (pde.suggested_weight_lb ?? 0);

                const ctx: ProgressionContext = {
                    pdeId:           pde.id,
                    exerciseName,
                    currentWeightLb: baselineWeight,
                    currentRepMin:   pde.rep_range_min,
                    currentRepMax:   pde.rep_range_max,
                    currentTargetRPE: pde.target_rpe,
                    experienceLevel,
                    lastSessionSets,
                    requiredSetCount: pde.set_count,
                    completionClass: (latestSession?.[0] as any)?.workout_sessions?.completion_class ?? 'legacy_unknown',
                    readinessScore:  null, // Readiness is applied as UI overlay only, not baked into progression
                };

                // Double-progression model:
                //   Increase weight  → ALL sets hit repMax with acceptable RPE
                //   Hold weight      → sets within range (repMin–repMax) but not all at repMax
                //   Per-set decrease → any set failed to reach repMin (missed the bottom of range)
                const targetRPE = pde.target_rpe ?? 8.0;

                // Sets that reached the TOP of the rep range with acceptable RPE
                const setsHitMax = lastSessionSets.filter(
                    (s) => s.reps >= pde.rep_range_max && (s.rpe === null || s.rpe <= targetRPE + 0.5)
                );
                // Sets that missed the BOTTOM of the rep range (too few reps regardless of RPE)
                const setsMissedMin = lastSessionSets.filter(
                    (s) => s.reps < pde.rep_range_min
                );

                const fullCoverage = (latestSession?.[0] as any)?.workout_sessions?.completion_class === 'complete'
                    && lastSessionSets.length >= pde.set_count;
                const allHitMax   = fullCoverage && setsHitMax.length === lastSessionSets.length && lastSessionSets.length > 0;
                const allMissedMin = setsMissedMin.length === lastSessionSets.length && lastSessionSets.length > 0;
                const someMissedMin = setsMissedMin.length > 0 && lastSessionSets.length > 0;

                // Experience-based increment (matches progressionEngine)
                const incrementLb: Record<string, number> = { beginner: 5.0, intermediate: 2.5, advanced: 1.25 };
                const increment = incrementLb[experienceLevel] ?? 2.5;

                let perSetWeightsLb: number[] | null = null;
                let newUniformWeight: number;

                if (lastSessionSets.length === 0) {
                    // No data — hold
                    newUniformWeight = baselineWeight;
                } else if (allHitMax) {
                    // Every set hit repMax with good RPE → increase weight
                    newUniformWeight = Math.max(0, Math.round((baselineWeight + increment) / 2.5) * 2.5);
                } else if (allMissedMin) {
                    // Every set missed repMin → uniform decrease 5%
                    newUniformWeight = Math.max(0, Math.round((baselineWeight * 0.95) / 2.5) * 2.5);
                } else if (someMissedMin) {
                    // Mixed: sets below repMin decrease 5%, sets within or at range hold
                    const missedSetNumbers = new Set(setsMissedMin.map((s) => s.setNumber));
                    perSetWeightsLb = Array.from({ length: pde.set_count }, (_, i) => {
                        const setNum = i + 1;
                        const logged = lastSessionSets.find((s) => s.setNumber === setNum);
                        const currentSetWeight = logged?.weightLb ?? baselineWeight;
                        return missedSetNumbers.has(setNum)
                            ? Math.max(0, Math.round((currentSetWeight * 0.95) / 2.5) * 2.5) // decrease
                            : Math.round(currentSetWeight / 2.5) * 2.5;                        // hold
                    });
                    newUniformWeight = baselineWeight;
                } else {
                    // Hit repMin but not all sets hit repMax — hold, build up to repMax
                    newUniformWeight = baselineWeight;
                }

                // Still run computeProgression for RPE adjustment
                const result = computeProgression(ctx);

                const dbUpdate: Record<string, unknown> = {
                    suggested_weight_lb: Math.round(newUniformWeight / 2.5) * 2.5,
                    per_set_weights_lb: perSetWeightsLb,
                    updated_at: new Date().toISOString(),
                };
                if (result.suggestedRPE !== null) {
                    // Apply cycle phase RPE reduction on top of progression engine suggestion
                    const adjustedRPE = isCycleReduced
                        ? Math.max(result.suggestedRPE - 0.5, 5.0)
                        : result.suggestedRPE;
                    dbUpdate.target_rpe = adjustedRPE;
                }

                updates.push(
                    (async () => {
                        const { error: updateError } = await supabase
                            .from('program_day_exercises')
                            .update(dbUpdate)
                            .eq('id', pde.id);

                        if (updateError) throw updateError;
                    })()
                );
            }
        }

        await Promise.all(updates);
        await refresh();
    }, [program, refresh]);

    applyProgressionRef.current = applyProgressionToNextWeek;

    const swapExercise = useCallback(
        async ({ exerciseId, replacement, scope, startedWorkout = false }: SwapArgs) => {
            // in the mapping above, exerciseId is the program_day_exercises row id (pde.id)
            // replacement.id should be the exercises.id from the exercises table
            if (!program) return;
            const newExerciseId = replacement.exerciseId ?? replacement.id;
            if (!isCatalogExerciseId(newExerciseId)) {
                throw new Error(
                    'This exercise is only available in the local preview. Reconnect and resolve its catalog ID before applying the swap.',
                );
            }

            if (program.currentRevisionId) {
                const workout = program.workouts.find((candidate) => candidate.exercises.some(
                    (exercise) => exercise.id === exerciseId || exercise.stableSlotId === exerciseId,
                ));
                const original = workout?.exercises.find(
                    (exercise) => exercise.id === exerciseId || exercise.stableSlotId === exerciseId,
                );
                if (!workout?.stableDayId || !original?.stableSlotId || !original.exerciseId) {
                    throw new Error('Stable program revision identity is unavailable for this exercise.');
                }
                const ownerId = await requireUserId();
                const active = await workoutDraftStore.loadMatching(ownerId, { programId: program.id, stableDayId: workout.stableDayId, programDayId: workout.id });
                if (active?.finalizationEndedAt || active?.lifecycle === 'finalized' || workout.sessionId) throw new Error('Open the completed workout to update it.');
                const amended = active ? amendWorkoutExercise(active, { slotId: original.stableSlotId,
                    replacementExerciseId: newExerciseId, replacementName: replacement.name,
                    amendedAt: new Date().toISOString(), replacementLoadKind: replacement.equipment === 'Bodyweight' ? 'bodyweight' : 'unknown',
                }) : null;
                if (amended && scope === 'workout_only') {
                    await workoutDraftStore.save(amended);
                    await refresh();
                    return { status: 'no_change' as const, reason: 'no_future_workouts' as const };
                }
                const outcome = await reviseProgramExercise(programRepository, ownerId, {
                    programId: program.id,
                    expectedRevision: program.currentRevision,
                    expectedRevisionId: program.currentRevisionId,
                    currentStableDayId: workout.stableDayId,
                    currentStableSlotId: original.stableSlotId,
                    originalExerciseId: original.exerciseId,
                    replacementExerciseId: newExerciseId,
                    scope: scope === 'workout_only'
                        ? 'selected_only'
                        : startedWorkout ? 'future_after_current' : 'selected_and_future',
                });
                if (outcome.status === 'validation') throw new OperationFailureError({ category: 'validation', retryable: false }, outcome.errors.join(' '));
                if (outcome.status === 'conflict') throw new OperationFailureError({ category: 'conflict', retryable: false }, outcome.message);
                if (outcome.status === 'unavailable') throw new OperationFailureError(outcome.failure, outcome.message);
                if (amended) await workoutDraftStore.save(amended);
                await refresh();
                return outcome;
            }

            throw new Error('Revision-safe exercise swaps are unavailable for this program. Refresh it before trying again.');
        },
        [program, refresh],
    );

    const endCurrentProgram = useCallback(async () => {
        const programId = program?.id;
        if (!programId) return;
        await archiveProgram(
            programRepository,
            await requireUserId(),
            programId,
            program.currentRevision,
            program.currentWeek,
        );

        await refresh();
    }, [program, refresh]);

    /* Legacy development multiwrite coordinator removed from the runtime.
        const userId = await requireUserId();

        const exerciseSeeds = [
            { name: 'Goblet Squat' },
            { name: 'Romanian Deadlift' },
            { name: 'Bench Press' },
            { name: 'Overhead Press' },
            { name: 'Lat Pulldown' },
            { name: 'Plank' },
        ] as const;
        const resolvedExercises = await resolveCatalogExerciseRequests(
            exerciseSeeds.map(({ name }) => ({
                localExerciseId: name,
                displayName: name,
                source: 'dev_fixture' as const,
                snapshotVersion: 'dev-default-program-v1',
            })),
        );
        const exIdByName = new Map(
            [...resolvedExercises.values()].map((exercise) => [
                exercise.request.displayName,
                exercise.catalogExerciseId,
            ]),
        );

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
    }, []);
    */

    // Kept for API compatibility. A readiness response cannot mutate a frozen workout;
    // a future AP-08 decision command must create an explicit accepted amendment.
    const applyReadinessAdjustmentOnly = useCallback(async (_readinessScore: number) => {
        await refresh();
    }, [refresh]);

    // Advance to the next week immediately by back-dating start_date so computeWeekNumber returns currentWeek+1.
    const advanceToNextWeek = useCallback(async () => {
        console.log('[advanceToNextWeek] Pressed. program:', program?.id, 'currentWeek:', program?.currentWeek, 'totalWeeks:', program?.totalWeeks);
        if (!program) return;
        const nextWeek = program.currentWeek + 1;
        if (nextWeek > program.totalWeeks) {
            console.log('[advanceToNextWeek] Already at last week, skipping');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
            console.log('[advanceToNextWeek] No user');
            return;
        }

        // Use local date (not UTC) to match computeWeekNumber which parses as local
        const daysToSubtract = (nextWeek - 1) * 7;
        const newStart = new Date();
        newStart.setDate(newStart.getDate() - daysToSubtract);
        const y = newStart.getFullYear();
        const m = String(newStart.getMonth() + 1).padStart(2, '0');
        const d = String(newStart.getDate()).padStart(2, '0');
        const newStartISO = `${y}-${m}-${d}`;
        console.log('[advanceToNextWeek] Updating start_date to', newStartISO, 'for week', nextWeek);

        const { error: updateErr } = await supabase
            .from('programs')
            .update({ start_date: newStartISO })
            .eq('id', program.id)
            .eq('user_id', user.id);

        if (updateErr) {
            reportSupabaseFailure('program.advance_week', updateErr);
            setActionError(supabaseUserMessage(updateErr, 'Unable to start the next week. Try again.'));
            return;
        }

        console.log('[advanceToNextWeek] Success, refreshing');
        setActionError(null);
        await refresh();

        // Every 4th week is a deload — notify the user when transitioning into one
        if (nextWeek % 4 === 0) {
            void notifyDeloadWeek();
        }
    }, [program, refresh]);

    const availabilityMessage = useMemo(
        () => failureCategory
            ? supabaseUserMessage(
                { category: failureCategory, retryable: failureCategory === 'retryable_service_unavailable' || failureCategory === 'timeout' || failureCategory === 'offline' },
                'Unable to refresh your program. Try again.',
            )
            : null,
        [failureCategory],
    );

    return {
        program,
        loading,
        refreshing,
        unavailable,
        failureCategory,
        availabilityMessage,
        actionError,
        ownerId,
        refresh,
        retry: refresh,
        swapExercise,
        endCurrentProgram,
        applyProgressionToNextWeek,
        applyReadinessAdjustmentOnly,
        advanceToNextWeek,
    };
}

type CurrentProgramContextValue = ReturnType<typeof useCurrentProgramState>;

const CurrentProgramContext = createContext<CurrentProgramContextValue | null>(null);

export function CurrentProgramProvider({ children }: { children: ReactNode }) {
    const value = useCurrentProgramState();
    return createElement(CurrentProgramContext.Provider, { value }, children);
}

export function useCurrentProgram(): CurrentProgramContextValue {
    const value = useContext(CurrentProgramContext);
    if (!value) {
        throw new Error('useCurrentProgram must be used within CurrentProgramProvider');
    }
    return value;
}
