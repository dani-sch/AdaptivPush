import { supabase } from '@/utils/supabase';
import { Calendar, Play, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WorkoutEntry {
  id: string;
  title: string;
  completedAt: string;
  durationMin: number;
  exercises: number;
  calories: number;
  notes?: string | null;
  split?: string | null;
}

interface WorkoutHistoryRow {
  id: string;
  title?: string | null;
  name?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  duration_min?: number | null;
  exercises?: number | null;
  exercise_count?: number | null;
  calories?: number | null;
  calories_burned?: number | null;
  notes?: string | null;
  split?: string | null;
}

interface ExercisePreviewRow {
  name: string;
  reps: string;
}

const formatWorkoutRow = (row: WorkoutHistoryRow): WorkoutEntry => ({
  id: row.id,
  title: row.title || row.name || 'Upper Body A',
  completedAt: row.completed_at || row.created_at || new Date().toISOString(),
  durationMin: row.duration_min ?? 75,
  exercises: row.exercises ?? row.exercise_count ?? 5,
  calories: row.calories ?? row.calories_burned ?? 0,
  notes: row.notes,
  split: row.split,
});

const getExercisePreview = (entry: WorkoutEntry): ExercisePreviewRow[] => {
  const fallback: ExercisePreviewRow[] = [
    { name: 'Barbell Bench Press', reps: '4x6-8' },
    { name: 'Barbell Row', reps: '4x8-10' },
    { name: 'Overhead Press', reps: '3x8-10' },
  ];

  if (!entry.notes) {
    return fallback;
  }

  const parsed = entry.notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line, index) => {
      const [namePart, repsPart] = line.split('|').map((v) => v.trim());
      return {
        name: namePart || fallback[index]?.name || `Exercise ${index + 1}`,
        reps: repsPart || fallback[index]?.reps || '3x8-12',
      };
    });

  return parsed.length > 0 ? parsed : fallback;
};

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutEntry | null>(null);

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
        setWorkoutHistory([]);
        return;
      }

      const { data, error: historyError } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (historyError) {
        setError(historyError.message);
        setWorkoutHistory([]);
        return;
      }

      const normalized = (data as WorkoutHistoryRow[]).map(formatWorkoutRow);
      setWorkoutHistory(normalized);
    } catch (fetchError) {
      console.error('Failed to fetch workout history:', fetchError);
      setError('Failed to load workout history.');
      setWorkoutHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => {
    const now = new Date();
    return {
      day: now.toLocaleDateString(undefined, { weekday: 'long' }),
      date: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  }, []);

  const nextWorkout = workoutHistory[0] || null;

  const summary = useMemo(() => {
    const totalWorkouts = workoutHistory.length;
    const totalMinutes = workoutHistory.reduce((acc, workout) => acc + workout.durationMin, 0);

    return {
      totalWorkouts,
      lastWorkout: workoutHistory[0]?.completedAt
        ? new Date(workoutHistory[0].completedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : 'N/A',
      readiness: Math.min(10, Number((4 + totalWorkouts * 0.7 + totalMinutes / 300).toFixed(1))).toFixed(1),
      weekProgress: `${Math.min(totalWorkouts, 12)}/12`,
    };
  }, [workoutHistory]);

  const detailDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 18 }]}>
        <Text style={styles.dayText}>{today.day}</Text>
        <Text style={styles.dateText}>{today.date}</Text>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.stateText}>Loading workout...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : nextWorkout ? (
          <Pressable
            style={styles.nextWorkoutCard}
            onPress={() => setSelectedWorkout(nextWorkout)}
            android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
          >
            <View style={styles.nextWorkoutHeaderRow}>
              <View>
                <Text style={styles.nextWorkoutLabel}>Next Workout</Text>
                <Text style={styles.nextWorkoutTitle}>{nextWorkout.title}</Text>
                <Text style={styles.nextWorkoutDuration}>{nextWorkout.durationMin} min</Text>
              </View>
              <View style={styles.calendarPill}>
                <Calendar color="#dbeafe" size={18} />
              </View>
            </View>

            <View style={styles.exerciseListWrap}>
              {getExercisePreview(nextWorkout).map((exercise) => (
                <View key={`${nextWorkout.id}-${exercise.name}`} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseReps}>{exercise.reps}</Text>
                </View>
              ))}
              <Text style={styles.moreExercisesText}>
                +{Math.max(nextWorkout.exercises - 3, 0)} more exercises
              </Text>
            </View>

            <Pressable
              style={styles.startButton}
              onPress={() => setSelectedWorkout(nextWorkout)}
              android_ripple={{ color: 'rgba(37, 99, 235, 0.15)' }}
            >
              <Play color="#1d4ed8" size={16} />
              <Text style={styles.startButtonText}>Start Workout</Text>
            </Pressable>
          </Pressable>
        ) : (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No workouts yet</Text>
            <Text style={styles.stateText}>Complete a workout to populate this screen.</Text>
          </View>
        )}

        <View style={styles.bottomStatRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Last Workout</Text>
            <Text style={styles.statValue}>{summary.lastWorkout}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Readiness</Text>
            <Text style={styles.statValueAccent}>{summary.readiness}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Week</Text>
            <Text style={styles.statValue}>{summary.weekProgress}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedWorkout)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWorkout(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedWorkout(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Workout Details</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setSelectedWorkout(null)}
                android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
              >
                <X color="#e4e4e7" size={16} />
              </Pressable>
            </View>

            {selectedWorkout && (
              <View style={styles.modalContent}>
                <Text style={styles.modalWorkoutTitle}>{selectedWorkout.title}</Text>
                <Text style={styles.modalWorkoutDate}>{detailDate(selectedWorkout.completedAt)}</Text>

                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Duration</Text>
                    <Text style={styles.modalStatValue}>{selectedWorkout.durationMin} min</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Exercises</Text>
                    <Text style={styles.modalStatValue}>{selectedWorkout.exercises}</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Calories</Text>
                    <Text style={styles.modalStatValue}>{selectedWorkout.calories}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Split</Text>
                  <Text style={styles.detailValue}>{selectedWorkout.split || 'Not set'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{selectedWorkout.notes || 'No notes for this workout.'}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
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
    paddingBottom: 28,
  },
  dayText: {
    color: '#f4f4f5',
    fontSize: 44,
    fontWeight: '600',
    marginBottom: 3,
  },
  dateText: {
    color: '#71717a',
    fontSize: 34,
    fontWeight: '500',
    marginBottom: 18,
  },
  nextWorkoutCard: {
    backgroundColor: '#2154f4',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  nextWorkoutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  nextWorkoutLabel: {
    color: '#bfdbfe',
    fontSize: 30,
    marginBottom: 6,
  },
  nextWorkoutTitle: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextWorkoutDuration: {
    color: '#dbeafe',
    fontSize: 34,
    fontWeight: '500',
  },
  calendarPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  exerciseListWrap: {
    marginBottom: 14,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  exerciseName: {
    color: '#dbeafe',
    fontSize: 14,
    flex: 1,
  },
  exerciseReps: {
    color: '#bfdbfe',
    fontSize: 14,
    fontWeight: '600',
  },
  moreExercisesText: {
    color: '#dbeafe',
    fontSize: 14,
  },
  startButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#eceff3',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  startButtonText: {
    color: '#1d4ed8',
    fontSize: 26,
    fontWeight: '600',
  },
  bottomStatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#12141b',
    borderColor: '#232734',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 92,
  },
  statLabel: {
    color: '#71717a',
    fontSize: 13,
    marginBottom: 8,
  },
  statValue: {
    color: '#f4f4f5',
    fontSize: 24,
    fontWeight: '500',
  },
  statValueAccent: {
    color: '#4ade80',
    fontSize: 24,
    fontWeight: '700',
  },
  stateCard: {
    backgroundColor: '#12141b',
    borderWidth: 1,
    borderColor: '#232734',
    borderRadius: 16,
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 16,
  },
  stateTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  stateText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.68)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#0d1017',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: '#232734',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#2d3344',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12141b',
  },
  modalContent: {
    gap: 12,
  },
  modalWorkoutTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  modalWorkoutDate: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalStat: {
    flex: 1,
    backgroundColor: '#12141b',
    borderWidth: 1,
    borderColor: '#232734',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  modalStatLabel: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 4,
  },
  modalStatValue: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
  },
  detailRow: {
    backgroundColor: '#12141b',
    borderWidth: 1,
    borderColor: '#232734',
    borderRadius: 12,
    padding: 12,
  },
  detailLabel: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 6,
  },
  detailValue: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 20,
  },
});
