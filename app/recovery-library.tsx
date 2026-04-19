import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, Clock3 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ─── Recovery Data ────────────────────────────────────────────────── */

type RecoveryExercise = { name: string; duration: string; notes?: string };
type RecoveryRoutine = {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  description: string;
  exercises: RecoveryExercise[];
};

const ROUTINES: RecoveryRoutine[] = [
  {
    id: 'full-stretch',
    title: 'Full Body Stretch',
    emoji: '🧘',
    duration: '15 min',
    description: 'A complete head-to-toe static stretch routine for post-workout or rest days.',
    exercises: [
      { name: 'Neck Rolls', duration: '30s each direction' },
      { name: 'Cross-Body Shoulder Stretch', duration: '30s each side' },
      { name: 'Chest Doorway Stretch', duration: '30s each side' },
      { name: 'Cat-Cow', duration: '10 reps' },
      { name: 'Standing Quad Stretch', duration: '30s each side' },
      { name: 'Standing Hamstring Stretch', duration: '30s each side' },
      { name: 'Pigeon Pose', duration: '45s each side' },
      { name: 'Seated Spinal Twist', duration: '30s each side' },
      { name: 'Child\'s Pose', duration: '60s' },
    ],
  },
  {
    id: 'upper-mobility',
    title: 'Upper Body Mobility',
    emoji: '💪',
    duration: '12 min',
    description: 'Improve shoulder and thoracic spine range of motion.',
    exercises: [
      { name: 'Arm Circles', duration: '30s each direction' },
      { name: 'Wall Slides', duration: '10 reps' },
      { name: 'Band Pull-Aparts', duration: '15 reps', notes: 'Use light band' },
      { name: 'Thread the Needle', duration: '30s each side' },
      { name: 'Thoracic Foam Roll Extension', duration: '60s' },
      { name: 'Prone Y-T-W Raises', duration: '8 reps each' },
    ],
  },
  {
    id: 'lower-mobility',
    title: 'Lower Body Mobility',
    emoji: '🦵',
    duration: '12 min',
    description: 'Open up hips, ankles, and hamstrings for better squat and deadlift depth.',
    exercises: [
      { name: '90/90 Hip Switch', duration: '10 reps' },
      { name: 'Deep Squat Hold', duration: '45s' },
      { name: 'Ankle Rocks (wall)', duration: '15 reps each side' },
      { name: 'Banded Hip Flexor Stretch', duration: '45s each side' },
      { name: 'Supine Figure-4 Stretch', duration: '30s each side' },
      { name: 'Calf Foam Roll', duration: '30s each side' },
    ],
  },
  {
    id: 'active-recovery',
    title: 'Active Recovery',
    emoji: '🏃',
    duration: '20 min',
    description: 'Light movement to promote blood flow and reduce soreness on rest days.',
    exercises: [
      { name: 'Brisk Walk or Light Jog', duration: '8 min' },
      { name: 'Bodyweight Squats', duration: '2 × 10' },
      { name: 'Push-Ups (easy pace)', duration: '2 × 8' },
      { name: 'Leg Swings', duration: '10 each direction per leg' },
      { name: 'Arm Swings', duration: '30s' },
      { name: 'Deep Breathing', duration: '2 min', notes: 'Inhale 4s, hold 4s, exhale 6s' },
    ],
  },
  {
    id: 'foam-rolling',
    title: 'Foam Rolling Protocol',
    emoji: '🧈',
    duration: '10 min',
    description: 'Self-myofascial release to reduce tightness and improve recovery.',
    exercises: [
      { name: 'Quads', duration: '60s each side' },
      { name: 'IT Band', duration: '45s each side' },
      { name: 'Glutes', duration: '45s each side' },
      { name: 'Upper Back', duration: '60s' },
      { name: 'Lats', duration: '30s each side' },
      { name: 'Calves', duration: '30s each side' },
    ],
  },
];

/* ─── Components ───────────────────────────────────────────────────── */

const RoutineCard = ({ routine }: { routine: RecoveryRoutine }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((p) => !p)} style={styles.cardHeader}>
        <Text style={styles.emoji}>{routine.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{routine.title}</Text>
          <View style={styles.durationRow}>
            <Clock3 color="#6f758a" size={13} />
            <Text style={styles.durationText}>{routine.duration}</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown color="#6f758a" size={20} />
        </Animated.View>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Text style={styles.cardDescription}>{routine.description}</Text>
          <View style={styles.exerciseList}>
            {routine.exercises.map((ex, i) => (
              <View key={ex.name} style={styles.exerciseRow}>
                <Text style={styles.exerciseIndex}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  {ex.notes && <Text style={styles.exerciseNotes}>{ex.notes}</Text>}
                </View>
                <Text style={styles.exerciseDuration}>{ex.duration}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

/* ─── Screen ───────────────────────────────────────────────────────── */

export default function RecoveryLibraryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ArrowLeft color="#f4f6ff" size={22} />
          </Pressable>
          <View>
            <Text style={styles.screenTitle}>Recovery & Mobility</Text>
            <Text style={styles.screenSubtitle}>Pre-built routines for rest days and cooldowns</Text>
          </View>
        </View>

        {ROUTINES.map((r) => (
          <RoutineCard key={r.id} routine={r} />
        ))}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#03040b' },
  scrollContent: { paddingHorizontal: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#181b26',
    borderWidth: 1,
    borderColor: '#242a3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { color: '#f4f6ff', fontSize: 22, fontWeight: '700' },
  screenSubtitle: { color: '#6f758a', fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#242a3b',
    backgroundColor: '#121621',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  emoji: { fontSize: 28 },
  cardTitle: { color: '#f4f6ff', fontSize: 16, fontWeight: '600' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  durationText: { color: '#6f758a', fontSize: 13 },
  cardDescription: {
    color: '#8d95ac',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: '#242a3b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  exerciseIndex: {
    color: '#6f758a',
    fontSize: 13,
    fontWeight: '600',
    width: 18,
    textAlign: 'center',
    marginTop: 1,
  },
  exerciseName: { color: '#e7ebf8', fontSize: 14, fontWeight: '500' },
  exerciseNotes: { color: '#6f758a', fontSize: 12, marginTop: 1 },
  exerciseDuration: { color: '#96c0ff', fontSize: 13, fontWeight: '500' },
});
