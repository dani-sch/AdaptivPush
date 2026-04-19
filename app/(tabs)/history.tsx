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
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { supabase } from '@/utils/supabase';

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
  title: string;
  completedAt: string;
  durationMin: number;
  totalVolumeLb: number;
  personalRecords: number;
}

interface SessionExerciseSet {
  setNumber: number;
  weightLb: number | null;
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

type WorkoutHistoryTable = 'workout_sessions' | 'workout_history';

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

const toWorkoutEntry = (row: WorkoutHistoryRow, index: number): WorkoutEntry => ({
  id: row.id || `workout-${index}`,
  title: row.workout_name || row.title || row.name || 'Workout',
  completedAt: row.ended_at || row.completed_at || row.created_at || new Date().toISOString(),
  durationMin: parseDuration(row),
  totalVolumeLb: parseVolume(row),
  personalRecords: parsePrCount(row),
});

const isMissingTableError = (
  error: { code?: string | null; message?: string | null } | null | undefined,
  tableName: WorkoutHistoryTable,
): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === 'PGRST205') {
    return true;
  }

  return Boolean(
    error.message?.toLowerCase().includes(`could not find the table 'public.${tableName}'`),
  );
};

const fetchRowsFromTable = async (
  tableName: WorkoutHistoryTable,
  userId: string,
): Promise<{
  rows: WorkoutHistoryRow[];
  error: { code?: string | null; message?: string | null } | null;
}> => {
  const orderColumn = tableName === 'workout_sessions' ? 'ended_at' : 'completed_at';

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .order(orderColumn, { ascending: false });

  return {
    rows: (data ?? []) as WorkoutHistoryRow[],
    error,
  };
};

const fetchSessionExercises = async (sessionId: string): Promise<SessionExercise[]> => {
  const { data, error } = await supabase
    .from('workout_exercise_sets')
    .select(`
      set_number,
      weight_lb,
      reps,
      rpe,
      exercise_id,
      exercises ( id, name )
    `)
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true });

  if (error || !data) return [];

  // Group sets by exercise
  const map = new Map<string, SessionExercise>();
  for (const row of data as any[]) {
    const exId: string = row.exercise_id;
    const exName: string = row.exercises?.name ?? 'Unknown exercise';
    if (!map.has(exId)) {
      map.set(exId, { exerciseId: exId, name: exName, sets: [] });
    }
    map.get(exId)!.sets.push({
      setNumber: row.set_number,
      weightLb: row.weight_lb != null ? Number(row.weight_lb) : null,
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
  const content = (
    <LinearGradient
      colors={['#181b26', '#12141b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      {icon}
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </LinearGradient>
  );
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session detail sheet state
  const [detailWorkout, setDetailWorkout] = useState<WorkoutEntry | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Exercise history modal state (drill-down from detail sheet)
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null);
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);

  // PR history modal state
  const [showPrModal, setShowPrModal] = useState(false);
  const [prRecords, setPrRecords] = useState<{ exerciseName: string; weightLb: number; reps: number; achievedAt: string }[]>([]);
  const [prLoading, setPrLoading] = useState(false);

  const handleOpenDetail = async (workout: WorkoutEntry) => {
    setDetailWorkout(workout);
    setSessionExercises([]);
    setDetailLoading(true);
    const exercises = await fetchSessionExercises(workout.id);
    setSessionExercises(exercises);
    setDetailLoading(false);
  };

  const handleCloseDetail = () => {
    setDetailWorkout(null);
    setSessionExercises([]);
  };

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPrLoading(false); return; }

      // Fetch all PR rows for this user
      const { data: prRows, error: prErr } = await supabase
        .from('personal_records')
        .select('exercise_id, weight_lb, reps, achieved_at')
        .eq('user_id', user.id)
        .order('achieved_at', { ascending: false });

      if (prErr) {
        console.warn('PR fetch error:', prErr.message);
        setPrLoading(false);
        return;
      }

      if (!prRows || prRows.length === 0) {
        setPrRecords([]);
        setPrLoading(false);
        return;
      }

      // Get unique exercise IDs and fetch names
      const exIds = [...new Set(prRows.map((r: any) => r.exercise_id))];
      const { data: exRows } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exIds);

      const nameMap = new Map<string, string>();
      for (const ex of (exRows ?? []) as any[]) {
        nameMap.set(ex.id, ex.name);
      }

      // Group by exercise, keep best per exercise
      const bestMap = new Map<string, { exerciseName: string; weightLb: number; reps: number; achievedAt: string }>();
      for (const row of prRows as any[]) {
        const name = nameMap.get(row.exercise_id) ?? 'Unknown';
        const w = Number(row.weight_lb) || 0;
        const r = Number(row.reps) || 0;
        const existing = bestMap.get(row.exercise_id);
        if (!existing || w > existing.weightLb || (w === existing.weightLb && r > existing.reps)) {
          bestMap.set(row.exercise_id, { exerciseName: name, weightLb: w, reps: r, achievedAt: row.achieved_at });
        }
      }
      setPrRecords(Array.from(bestMap.values()).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)));
    } catch (err) {
      console.warn('PR history fetch failed:', err);
    } finally {
      setPrLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkoutHistory();
    }, [])
  );

  const fetchWorkoutHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Unable to load user session.');
        setWorkouts([]);
        return;
      }

      const sessionsResult = await fetchRowsFromTable('workout_sessions', user.id);
      const sessionsMissing = isMissingTableError(sessionsResult.error, 'workout_sessions');
      if (sessionsResult.error && !sessionsMissing) {
        setError(sessionsResult.error.message ?? 'Failed to load workout history.');
        setWorkouts([]);
        return;
      }

      const shouldTryLegacyHistory =
        sessionsMissing || sessionsResult.rows.length === 0;

      if (shouldTryLegacyHistory) {
        const historyResult = await fetchRowsFromTable('workout_history', user.id);
        const historyMissing = isMissingTableError(historyResult.error, 'workout_history');

        if (historyResult.error && !historyMissing) {
          setError(historyResult.error.message ?? 'Failed to load workout history.');
          setWorkouts([]);
          return;
        }

        if (historyResult.rows.length > 0) {
          setWorkouts(historyResult.rows.map(toWorkoutEntry));
          setError(null);
          return;
        }

        if (sessionsResult.rows.length > 0) {
          setWorkouts(sessionsResult.rows.map(toWorkoutEntry));
          setError(null);
          return;
        }

        setWorkouts([]);
        setError(null);
        return;
      }

      setWorkouts(sessionsResult.rows.map(toWorkoutEntry));
      setError(null);
    } catch (fetchError) {
      console.error('Failed to fetch workout history:', fetchError);
      setError('Failed to load workout history.');
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce((total, workout) => total + workout.durationMin, 0);
    const totalVolumeLb = workouts.reduce((total, workout) => total + workout.totalVolumeLb, 0);
    const personalRecords = workouts.reduce((total, workout) => total + workout.personalRecords, 0);

    const avgDuration = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0;

    return {
      totalWorkouts,
      avgDuration,
      totalVolumeLb,
      personalRecords,
    };
  }, [workouts]);

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
            icon={<CalendarDays color="#2f7cff" size={24} />}
            value={`${summary.totalWorkouts}`}
            label="Total Workouts"
          />
          <SummaryMetricCard
            icon={<Clock3 color="#a14bff" size={24} />}
            value={`${summary.avgDuration}`}
            label="Avg Duration (min)"
          />
          <SummaryMetricCard
            icon={<TrendingUp color="#10d97a" size={24} />}
            value={formatCompactVolume(summary.totalVolumeLb)}
            label="Total Volume (lbs)"
          />
          <SummaryMetricCard
            icon={<Medal color="#ffc200" size={24} />}
            value={`${summary.personalRecords}`}
            label="PRs"
            onPress={handleOpenPrHistory}
          />
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#2f7cff" />
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
                    colors={['#181b26', '#12141b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.workoutCard}
                  >
                    <View style={styles.workoutHeaderRow}>
                      <View style={styles.workoutHeaderTextWrap}>
                        <Text style={styles.workoutTitle}>{workout.title}</Text>
                        <Text style={styles.workoutDate}>{formatWorkoutDate(workout.completedAt)}</Text>
                      </View>
                      <ChevronRight color="#4d5265" size={26} style={styles.workoutChevron} />
                    </View>

                    <View style={styles.workoutMetaRow}>
                      <View style={styles.workoutMetaItem}>
                        <Clock3 color="#8d93a7" size={18} />
                        <Text style={styles.workoutMetaText}>{workout.durationMin} min</Text>
                      </View>

                      <View style={styles.workoutMetaItem}>
                        <TrendingUp color="#8d93a7" size={18} />
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
        animationType="slide"
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
              <Pressable
                style={styles.sheetCloseBtn}
                onPress={handleCloseDetail}
                accessibilityRole="button"
                accessibilityLabel="Close workout detail"
              >
                <X color="#f4f6ff" size={18} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {detailLoading ? (
                <View style={styles.sheetStateWrap}>
                  <ActivityIndicator size="small" color="#2f7cff" />
                  <Text style={styles.sheetStateText}>Loading exercises…</Text>
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
                        <TrendingUp size={14} color="#2f7cff" />
                        <Text style={styles.historyBtnText}>History</Text>
                      </Pressable>
                    </View>

                    {ex.sets.map((s) => (
                      <Text key={s.setNumber} style={styles.setRow}>
                        {`Set ${s.setNumber}`}
                        {'   '}
                        {s.weightLb !== null ? `${s.weightLb} lb × ` : ''}
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
                <Ionicons name="close" size={18} color="#6f7485" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {prLoading ? (
                <View style={styles.sheetStateWrap}>
                  <ActivityIndicator size="large" color="#2f7cff" />
                </View>
              ) : prRecords.length === 0 ? (
                <View style={styles.sheetStateWrap}>
                  <Medal color="#6f7485" size={28} />
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
                      <Text style={{ color: '#f4f6ff', fontSize: 16, fontWeight: '600' }}>
                        {pr.weightLb} lbs × {pr.reps} reps
                      </Text>
                      <Text style={{ color: '#6f7485', fontSize: 13 }}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03040b',
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  screenTitle: {
    color: '#f4f6ff',
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
    borderColor: '#202433',
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  summaryValue: {
    color: '#f5f6ff',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
  },
  summaryLabel: {
    color: '#6f7485',
    fontSize: 14,
  },
  sectionWrap: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#696f82',
    fontSize: 15,
    letterSpacing: 1.2,
    marginBottom: 11,
  },
  workoutCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202433',
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
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
  },
  workoutDate: {
    color: '#6f7485',
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
    color: '#a8adbc',
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
    borderColor: '#202433',
    backgroundColor: '#12141b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    minHeight: 120,
  },
  stateTitle: {
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  stateText: {
    color: '#8d93a7',
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
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#12141b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#202433',
    overflow: 'hidden',
    maxHeight: '88%',
    height: '75%',
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#202433',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetTitle: {
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  sheetSubtitle: {
    color: '#6f7485',
    fontSize: 13,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e2130',
    borderWidth: 1,
    borderColor: '#202433',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#6f7485',
    fontSize: 14,
    textAlign: 'center',
  },

  // Exercise rows in detail sheet
  exerciseRow: {
    backgroundColor: '#181b26',
    borderWidth: 1,
    borderColor: '#202433',
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
    color: '#f4f6ff',
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
    color: '#2f7cff',
    fontSize: 13,
    fontWeight: '600',
  },
  setRow: {
    color: '#a8adbc',
    fontSize: 13,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
});
