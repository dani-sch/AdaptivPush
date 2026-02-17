import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Medal,
  TrendingUp,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/utils/supabase';

interface WorkoutHistoryRow {
  id?: string;
  title?: string | null;
  name?: string | null;
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

interface MonthSection {
  label: string;
  workouts: WorkoutEntry[];
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

const toWorkoutEntry = (row: WorkoutHistoryRow, index: number): WorkoutEntry => ({
  id: row.id || `workout-${index}`,
  title: row.title || row.name || 'Workout',
  completedAt: row.completed_at || row.created_at || new Date().toISOString(),
  durationMin: parseDuration(row),
  totalVolumeLb: parseVolume(row),
  personalRecords: parsePrCount(row),
});

const isMissingWorkoutHistoryTableError = (error: { code?: string | null; message?: string | null } | null | undefined): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === 'PGRST205') {
    return true;
  }

  return Boolean(
    error.message?.toLowerCase().includes("could not find the table 'public.workout_history'"),
  );
};

interface SummaryMetricCardProps {
  icon: ReactNode;
  value: string;
  label: string;
}

const SummaryMetricCard = ({ icon, value, label }: SummaryMetricCardProps) => (
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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkoutHistory();
  }, []);

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

      const { data, error: historyError } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (historyError) {
        if (isMissingWorkoutHistoryTableError(historyError)) {
          setWorkouts([]);
          setError(null);
          return;
        }

        setError(historyError.message);
        setWorkouts([]);
        return;
      }

      const normalizedRows = (data ?? []) as WorkoutHistoryRow[];
      setWorkouts(normalizedRows.map(toWorkoutEntry));
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
            label="Personal Records"
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
                <LinearGradient
                  key={workout.id}
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
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
    minHeight: 154,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202433',
    paddingHorizontal: 18,
    paddingVertical: 18,
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
});
