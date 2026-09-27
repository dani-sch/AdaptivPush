import { createCompletedNavigation } from '@/features/workouts/effectiveOccurrence';
import { ExerciseHistoryModal } from '@/components/ExerciseHistoryModal';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Medal,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { supabase } from '@/utils/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';
import { fetchPaginatedWorkoutHistory, type HistoryItem, type WorkoutHistoryTable } from '@/features/history/historyService';

interface WorkoutHistoryRow {
  id?: string;
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

interface WorkoutEntry {
  id: string;
  sessionId: string | null;
  source: WorkoutHistoryTable;
  title: string;
  completedAt: string;
  durationMin: number;
  totalVolumeLb: number;
  personalRecords: number;
}

interface SessionExerciseSet {
  setId: string;
  setNumber: number;
  loadValue: number | null;
  loadUnit: 'lb' | 'kg' | 'none';
  loadKind: 'external' | 'bodyweight' | 'assistance' | 'unknown';
  reps: number | null;
  rpe: number | null;
}

interface SessionExercise {
  exerciseId: string;
  name: string;
  sets: SessionExerciseSet[];
}

interface MonthSection {
  label: string;
  workouts: WorkoutEntry[];
}

interface PersonalRecordRow {
  id: string;
  exercise_id: string;
  weight_lb: number | string;
  reps: number;
  achieved_at: string;
}

async function loadPersonalRecords(userId: string): Promise<PersonalRecordRow[]> {
  const records: PersonalRecordRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('personal_records')
      .select('id, exercise_id, weight_lb, reps, achieved_at')
      .eq('user_id', userId).order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    records.push(...(data ?? []));
    if ((data ?? []).length < pageSize) return records;
  }
}

function createDetailRequests() {
  let generation = 0;
  return {
    next: () => ++generation,
    isCurrent: (value: number) => value === generation,
    cancel: () => { generation++; },
  };
}

const parseNumericValue = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) {
      return null;
    }

    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
};

const parseVolume = (row: WorkoutHistoryRow): number => {
  const value =
    parseNumericValue(row.total_volume_lb) ??
    parseNumericValue(row.total_volume_lbs) ??
    parseNumericValue(row.volume_lb) ??
    parseNumericValue(row.volume_lbs) ??
    parseNumericValue(row.total_volume) ??
    parseNumericValue(row.volume);

  return value !== null ? Math.max(0, value) : 0;
};

const parsePrCount = (row: WorkoutHistoryRow): number => {
  const directCount =
    parseNumericValue(row.pr_count) ??
    parseNumericValue(row.prs) ??
    parseNumericValue(row.personal_records) ??
    parseNumericValue(row.personal_record_count) ??
    parseNumericValue(row.prs_hit);

  if (directCount !== null) {
    return Math.max(0, Math.round(directCount));
  }

  if (row.is_pr) {
    return 1;
  }

  if (!row.notes) {
    return 0;
  }

  const explicitMatch = row.notes.match(/(\d+)\s*PR/i);
  if (explicitMatch) {
    return Number(explicitMatch[1]);
  }

  return /\bPR\b/i.test(row.notes) ? 1 : 0;
};

const parseDuration = (row: WorkoutHistoryRow): number => {
  const value = parseNumericValue(row.duration_min);
  return value !== null ? Math.max(0, Math.round(value)) : 0;
};

const formatCompactVolume = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return `${Math.round(value)}`;
};

const formatExactVolume = (value: number): string => {
  return Math.round(value).toLocaleString();
};

const formatMonthLabel = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'UNKNOWN';
  }

  return date
    .toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
};

const formatWorkoutDate = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown Date';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const toWorkoutEntry = ({ row, source, compositeId }: HistoryItem): WorkoutEntry => ({
  id: compositeId,
  sessionId: source === 'workout_sessions' ? row.id : null,
  source,
  title: row.workout_name || row.title || row.name || 'Workout',
  completedAt: row.ended_at || row.completed_at || row.created_at || '',
  durationMin: parseDuration(row),
  totalVolumeLb: parseVolume(row),
  personalRecords: parsePrCount(row),
});

const fetchSessionExercises = async (sessionId: string): Promise<SessionExercise[]> => {
  const rows: {
    set_number: number;
    actual_set_id: string | null;
    load_value: number | null;
    load_unit: SessionExerciseSet['loadUnit'];
    load_kind: SessionExerciseSet['loadKind'];
    reps: number | null;
    rpe: number | null;
    exercise_id: string;
    exercises: { id: string; name: string }[];
  }[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('workout_exercise_sets')
      .select(`
      set_number,
      actual_set_id,
      load_value,
      load_unit,
      load_kind,
      reps,
      rpe,
      exercise_id,
      exercises ( id, name )
    `)
      .eq('session_id', sessionId)
      .order('set_number', { ascending: true })
      .order('actual_set_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }

  // Group sets by exercise
  const map = new Map<string, SessionExercise>();
  for (const row of rows) {
    const exId: string = row.exercise_id;
    const exName: string = row.exercises?.[0]?.name ?? 'Unknown exercise';
    if (!map.has(exId)) {
      map.set(exId, { exerciseId: exId, name: exName, sets: [] });
    }
    map.get(exId)!.sets.push({
      setId: row.actual_set_id ?? `${sessionId}:${row.exercise_id}:${row.set_number}`,
      setNumber: row.set_number,
      loadValue: row.load_value != null ? Number(row.load_value) : null,
      loadUnit: row.load_unit,
      loadKind: row.load_kind,
      reps: row.reps != null ? Number(row.reps) : null,
      rpe: row.rpe != null ? Number(row.rpe) : null,
    });
  }

  return Array.from(map.values());
};

interface SummaryMetricCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  onPress?: () => void;
}

const SummaryMetricCard = ({ icon, value, label, onPress }: SummaryMetricCardProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const content = (
    <LinearGradient
      colors={[theme.background, theme.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.summaryCard, onPress && { width: '100%' }]}
    >
      {icon}
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </LinearGradient>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={{ width: '48.6%' }}>{content}</Pressable>;
  }
  return content;
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverageNotice, setCoverageNotice] = useState<string | null>(null);

  // Session detail sheet state
  const [pendingEdit] = useState(createCompletedNavigation);
  const navigateAfterDismiss = useCallback(() => {
    const sessionId = pendingEdit.dismiss();
    if (!sessionId) return;
    router.push({ pathname: '/edit-workout', params: { sessionId } });
  }, [pendingEdit]);
  const [detailWorkout, setDetailWorkout] = useState<WorkoutEntry | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRequests] = useState(createDetailRequests);

  // Exercise history modal state (drill-down from detail sheet)
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null);
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);

  const editWorkout = () => {
    if (!detailWorkout?.sessionId || !pendingEdit.request(detailWorkout.sessionId)) return;
    detailRequests.cancel();
    setHistoryExerciseId(null);
    setHistoryExerciseName(null);
    setSessionExercises([]);
    setDetailWorkout(null);
  };
  useEffect(() => {
    if (Platform.OS === 'ios' || detailWorkout || !pendingEdit.pending()) return;
    // Android/web use an unanimated dismissal; the next frame follows its committed removal.
    const frame = requestAnimationFrame(navigateAfterDismiss);
    return () => cancelAnimationFrame(frame);
  }, [detailWorkout, navigateAfterDismiss, pendingEdit]);

  // PR count from personal_records table
  const [prCount, setPrCount] = useState<number | null>(null);

  // PR history modal state
  const [showPrModal, setShowPrModal] = useState(false);
  const [prRecords, setPrRecords] = useState<{ exerciseName: string; weightLb: number; reps: number; achievedAt: string }[]>([]);
  const [prLoading, setPrLoading] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);

  const handleOpenDetail = useCallback(async (workout: WorkoutEntry) => {
    const generation = detailRequests.next();
    pendingEdit.reset();
    setDetailWorkout(workout);
    setSessionExercises([]);
    setDetailError(null);
    if (!workout.sessionId) {
      setDetailError('Detailed sets are not available for this legacy record.');
      return;
    }
    setDetailLoading(true);
    try {
      const exercises = await fetchSessionExercises(workout.sessionId);
      if (detailRequests.isCurrent(generation)) setSessionExercises(exercises);
    } catch (cause) {
      if (detailRequests.isCurrent(generation)) {
        reportSupabaseFailure('history.detail', cause);
        setDetailError(supabaseUserMessage(cause, 'Unable to load workout details.'));
      }
    } finally {
      if (detailRequests.isCurrent(generation)) setDetailLoading(false);
    }
  }, [pendingEdit, detailRequests]);

  const handleCloseDetail = useCallback(() => {
    detailRequests.cancel();
    setDetailWorkout(null);
    setSessionExercises([]);
  }, [detailRequests]);

  const handleOpenExerciseHistory = (exerciseId: string, exerciseName: string) => {
    setHistoryExerciseId(exerciseId);
    setHistoryExerciseName(exerciseName);
  };

  const handleCloseExerciseHistory = () => {
    setHistoryExerciseId(null);
    setHistoryExerciseName(null);
  };

  const handleOpenPrHistory = async () => {
    setShowPrModal(true);
    setPrLoading(true);
    setPrError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setPrError('Unable to load user session.'); return; }

      // Fetch all PR rows for this user
      const prRows = await loadPersonalRecords(user.id);
      if (prRows.length === 0) {
        setPrRecords([]);
        return;
      }

      const exIds = [...new Set(prRows.map(row => row.exercise_id))];
      const catalogIds = exIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

      const nameMap = new Map<string, string>();
      for (let offset = 0; offset < catalogIds.length; offset += 500) {
        const { data: exRows, error: exError } = await supabase
          .from('exercises').select('id, name').in('id', catalogIds.slice(offset, offset + 500));
        if (exError) throw exError;
        for (const ex of exRows ?? []) nameMap.set(ex.id, ex.name);
      }

      // Group by exercise, keep best per exercise
      const bestMap = new Map<string, { exerciseName: string; weightLb: number; reps: number; achievedAt: string }>();
      for (const row of prRows) {
        const name = nameMap.get(row.exercise_id) ?? row.exercise_id;
        const w = Number(row.weight_lb) || 0;
        const r = Number(row.reps) || 0;
        const existing = bestMap.get(row.exercise_id);
        if (!existing || w > existing.weightLb || (w === existing.weightLb && r > existing.reps)) {
          bestMap.set(row.exercise_id, { exerciseName: name, weightLb: w, reps: r, achievedAt: row.achieved_at });
        }
      }
      const { data: current } = await supabase.auth.getSession();
      if (current.session?.user.id !== user.id) throw new Error('Account changed while loading personal records.');
      setPrRecords(Array.from(bestMap.values()).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)));
    } catch (err) {
      reportSupabaseFailure('history.pr', err);
      setPrError(supabaseUserMessage(err, 'Unable to load personal records.'));
    } finally {
      setPrLoading(false);
    }
  };

  const fetchWorkoutHistory = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      setCoverageNotice(null);
      setWorkouts([]);
      setPrCount(null);
      detailRequests.cancel();
      setDetailWorkout(null);
      setSessionExercises([]);

      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (signal.aborted) return;
      const user = session?.user;

      if (authError || !user) {
        setError('Unable to load user session.');
        setWorkouts([]);
        return;
      }

      // Fetch PR count directly from personal_records table
      let prCountError: unknown = null;
      let prRows: PersonalRecordRow[] = [];
      try {
        prRows = await loadPersonalRecords(user.id);
      } catch (cause) {
        prCountError = cause;
      }
      if (signal.aborted) return;
      if (prCountError) reportSupabaseFailure('history.pr.count', prCountError);
      setPrCount(prCountError ? null : new Set(prRows.map(row => row.exercise_id)).size);

      const result = await fetchPaginatedWorkoutHistory({ supabaseClient: supabase, userId: user.id, signal });
      if (signal.aborted || result.aborted) return;
      if (!result.complete && result.items.length === 0) {
        const cause = result.errors[0]?.error ?? new Error('Workout session history is unavailable.');
        reportSupabaseFailure('history.union', cause);
        setError(supabaseUserMessage(cause, 'Unable to refresh workout history.'));
        setWorkouts([]);
        return;
      }
      setWorkouts(result.items.map(toWorkoutEntry));
      setCoverageNotice(!result.complete
        ? 'Some history could not be loaded. Totals below reflect only the records shown.'
        : result.unavailable.includes('workout_history')
          ? 'Legacy history is not available on this server; showing supported workout sessions.'
          : null);
    } catch (fetchError) {
      if (signal.aborted) return;
      reportSupabaseFailure('history.load', fetchError);
      setError(supabaseUserMessage(fetchError, 'Unable to refresh workout history.'));
      setWorkouts([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [detailRequests]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void fetchWorkoutHistory(controller.signal);
      return () => controller.abort();
    }, [fetchWorkoutHistory]),
  );

  const summary = useMemo(() => {
    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce((total, workout) => total + workout.durationMin, 0);
    const totalVolumeLb = workouts.reduce((total, workout) => total + workout.totalVolumeLb, 0);

    const avgDuration = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0;

    return {
      totalWorkouts,
      avgDuration,
      totalVolumeLb,
      personalRecords: prCount,
    };
  }, [workouts, prCount]);

  const monthSections = useMemo<MonthSection[]>(() => {
    const grouped = new Map<string, WorkoutEntry[]>();

    workouts.forEach((workout) => {
      const key = formatMonthLabel(workout.completedAt);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(workout);
    });

    return Array.from(grouped.entries()).map(([label, entries]) => ({
      label,
      workouts: entries,
    }));
  }, [workouts]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 116 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Workout History</Text>

        <View style={styles.summaryGrid}>
          <SummaryMetricCard
            icon={<CalendarDays color={theme.primary} size={24} />}
            value={coverageNotice && summary.totalWorkouts === 0 ? '-' : `${summary.totalWorkouts}`}
            label={coverageNotice ? 'Loaded Workouts' : 'Total Workouts'}
          />
          <SummaryMetricCard
            icon={<Clock3 color={theme.secondary} size={24} />}
            value={coverageNotice && summary.totalWorkouts === 0 ? '-' : `${summary.avgDuration}`}
            label="Avg Duration (min)"
          />
          <SummaryMetricCard
            icon={<TrendingUp color={theme.success} size={24} />}
            value={coverageNotice && summary.totalWorkouts === 0 ? '-' : formatCompactVolume(summary.totalVolumeLb)}
            label="Total Volume (lbs)"
          />
          <SummaryMetricCard
            icon={<Medal color="#ffc200" size={24} />}
            value={summary.personalRecords === null ? 'Unknown' : `${summary.personalRecords}`}
            label="PRs"
            onPress={handleOpenPrHistory}
          />
        </View>
        {coverageNotice && <Text style={styles.stateText}>{coverageNotice}</Text>}

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.stateText}>Loading workout history...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : monthSections.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No workouts yet</Text>
            <Text style={styles.stateText}>Complete a workout to populate your history.</Text>
          </View>
        ) : (
          monthSections.map((section) => (
            <View key={section.label} style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>{section.label}</Text>

              {section.workouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  onPress={() => handleOpenDetail(workout)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <LinearGradient
                    colors={[theme.background, theme.background]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.workoutCard}
                  >
                    <View style={styles.workoutHeaderRow}>
                      <View style={styles.workoutHeaderTextWrap}>
                        <Text style={styles.workoutTitle}>{workout.title}</Text>
                        <Text style={styles.workoutDate}>{formatWorkoutDate(workout.completedAt)}</Text>
                      </View>
                      <ChevronRight color={theme.placeholder} size={26} style={styles.workoutChevron} />
                    </View>

                    <View style={styles.workoutMetaRow}>
                      <View style={styles.workoutMetaItem}>
                        <Clock3 color={theme.text} size={18} />
                        <Text style={styles.workoutMetaText}>{workout.durationMin} min</Text>
                      </View>

                      <View style={styles.workoutMetaItem}>
                        <TrendingUp color={theme.text} size={18} />
                        <Text style={styles.workoutMetaText}>{formatExactVolume(workout.totalVolumeLb)} lbs</Text>
                      </View>

                      {workout.personalRecords > 0 ? (
                        <View style={styles.workoutMetaItem}>
                          <Medal color="#ffc200" size={18} />
                          <Text style={styles.workoutMetaPrText}>
                            {workout.personalRecords} {workout.personalRecords === 1 ? 'PR' : 'PRs'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Single Modal for session detail + exercise history drill-down.
          Using one Modal avoids stacked-transparent-modal scroll breakage on RN. */}
      <Modal
        visible={detailWorkout !== null}
        transparent
        animationType={Platform.OS === 'ios' ? 'slide' : 'none'}
        onDismiss={navigateAfterDismiss}
        onRequestClose={historyExerciseId !== null ? handleCloseExerciseHistory : handleCloseDetail}
      >
        {/* Session detail sheet */}
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseDetail} />
          <View style={styles.sheet}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{detailWorkout?.title ?? ''}</Text>
                <Text style={styles.sheetSubtitle}>
                  {detailWorkout ? formatWorkoutDate(detailWorkout.completedAt) : ''}
                </Text>
              </View>
              {detailWorkout?.sessionId && <Pressable
                style={styles.editWorkoutBtn}
                onPress={editWorkout}
                accessibilityRole="button"
                accessibilityLabel="Edit completed workout"
              >
                <Text style={styles.editWorkoutText}>Edit workout</Text>
              </Pressable>}
              <Pressable
                style={styles.sheetCloseBtn}
                onPress={handleCloseDetail}
                accessibilityRole="button"
                accessibilityLabel="Close workout detail"
              >
                <X color={theme.textPrimary} size={18} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {detailLoading ? (
                <View style={styles.sheetStateWrap}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.sheetStateText}>Loading exercises…</Text>
                </View>
              ) : detailError ? (
                <View style={styles.sheetStateWrap}>
                  <Text style={styles.sheetStateText}>{detailError}</Text>
                </View>
              ) : sessionExercises.length === 0 ? (
                <View style={styles.sheetStateWrap}>
                  <Text style={styles.sheetStateText}>No exercise data recorded for this session.</Text>
                </View>
              ) : (
                sessionExercises.map((ex) => (
                  <View key={ex.exerciseId} style={styles.exerciseRow}>
                    <View style={styles.exerciseRowHeader}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.historyBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => handleOpenExerciseHistory(ex.exerciseId, ex.name)}
                        accessibilityRole="button"
                        accessibilityLabel={`View history for ${ex.name}`}
                      >
                        <TrendingUp size={14} color={theme.primary} />
                        <Text style={styles.historyBtnText}>History</Text>
                      </Pressable>
                    </View>

                    {ex.sets.map((s) => (
                      <Text key={s.setId} style={styles.setRow}>
                        {`Set ${s.setNumber}`}
                        {'   '}
                        {s.loadKind === 'bodyweight' ? 'Bodyweight × ' : ''}
                        {s.loadKind === 'assistance' && s.loadValue !== null ? `${s.loadValue} ${s.loadUnit} assistance × ` : ''}
                        {s.loadKind === 'external' && s.loadValue !== null ? `${s.loadValue} ${s.loadUnit} × ` : ''}
                        {s.reps !== null ? `${s.reps} reps` : '—'}
                        {s.rpe !== null ? `   @ RPE ${s.rpe}` : ''}
                      </Text>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        {/* Exercise history drill-down — absolute overlay so it covers the session detail sheet */}
        {historyExerciseId !== null && historyExerciseName !== null && (
          <View style={StyleSheet.absoluteFill}>
            <ExerciseHistoryModal
              exerciseId={historyExerciseId}
              exerciseName={historyExerciseName}
              onClose={handleCloseExerciseHistory}
            />
          </View>
        )}
      </Modal>

      {/* PR History Modal */}
      <Modal visible={showPrModal} transparent animationType="slide">
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowPrModal(false)}>
          <Pressable style={[styles.sheet, { height: '70%' }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Personal Records</Text>
                <Text style={styles.sheetSubtitle}>All-time bests per exercise</Text>
              </View>
              <Pressable style={styles.sheetCloseBtn} onPress={() => setShowPrModal(false)}>
                <Ionicons name="close" size={18} color={theme.placeholder} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {prLoading ? (
                <View style={styles.sheetStateWrap}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : prError ? (
                <View style={styles.sheetStateWrap}>
                  <Text style={styles.sheetStateText}>{prError}</Text>
                </View>
              ) : prRecords.length === 0 ? (
                <View style={styles.sheetStateWrap}>
                  <Medal color={theme.placeholder} size={28} />
                  <Text style={styles.sheetStateText}>No personal records yet.{'\n'}Complete a workout to start tracking!</Text>
                </View>
              ) : (
                prRecords.map((pr) => (
                  <View key={pr.exerciseName} style={styles.exerciseRow}>
                    <View style={styles.exerciseRowHeader}>
                      <Text style={styles.exerciseName}>{pr.exerciseName}</Text>
                      <Medal color="#ffc200" size={18} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>
                        {pr.weightLb} lbs × {pr.reps} reps
                      </Text>
                      <Text style={{ color: theme.placeholder, fontSize: 13 }}>
                        {new Date(pr.achievedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundDark,
    },
    scrollContent: {
      paddingHorizontal: 18,
    },
    screenTitle: {
      color: theme.textPrimary,
      fontSize: 24,
      fontWeight: '500',
      marginBottom: 18,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
      marginBottom: 28,
    },
    summaryCard: {
      width: '48.6%',
      minHeight: 176,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 17,
      paddingVertical: 16,
    },
    summaryValue: {
      color: theme.textPrimary,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '500',
      marginTop: 12,
      marginBottom: 6,
    },
    summaryLabel: {
      color: theme.placeholder,
      fontSize: 14,
    },
    sectionWrap: {
      marginBottom: 8,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 15,
      letterSpacing: 1.2,
      marginBottom: 11,
    },
    workoutCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 18,
      paddingVertical: 16,
      marginBottom: 14,
    },
    workoutHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    workoutHeaderTextWrap: {
      flex: 1,
      paddingRight: 10,
    },
    workoutTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 5,
    },
    workoutDate: {
      color: theme.placeholder,
      fontSize: 14,
    },
    workoutMetaRow: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: 16,
      rowGap: 8,
    },
    workoutMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    workoutMetaText: {
      color: theme.placeholder,
      fontSize: 14,
    },
    workoutMetaPrText: {
      color: '#ffc200',
      fontSize: 14,
      fontWeight: '500',
    },
    workoutChevron: {
      marginTop: 2,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 20,
      minHeight: 120,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 6,
    },
    stateText: {
      color: theme.text,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    errorCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 59, 69, 0.35)',
      backgroundColor: 'rgba(255, 59, 69, 0.08)',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    errorText: {
      color: '#ff747c',
      fontSize: 13,
    },

    // Session detail bottom sheet
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      maxHeight: '88%',
      height: '75%',
    },
    sheetHeader: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sheetTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 2,
    },
    sheetSubtitle: {
      color: theme.placeholder,
      fontSize: 13,
    },
    sheetCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.mutedBg,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editWorkoutBtn: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    editWorkoutText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    sheetContent: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      paddingBottom: 32,
      gap: 12,
    },
    sheetStateWrap: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 10,
    },
    sheetStateText: {
      color: theme.placeholder,
      fontSize: 14,
      textAlign: 'center',
    },

    // Exercise rows in detail sheet
    exerciseRow: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
    },
    exerciseRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    exerciseName: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
      paddingRight: 8,
    },
    historyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(47,124,255,0.12)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(47,124,255,0.25)',
    },
    historyBtnText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    setRow: {
      color: theme.placeholder,
      fontSize: 13,
      marginBottom: 4,
      fontVariant: ['tabular-nums'],
    },
  });
}
