import { SymbolView } from "expo-symbols";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PRIMARY_COLOR, WHITE } from "../constants/colors";

// TypeScript types
export interface ExerciseItem {
  name: string;
  prescription: string;
}

export interface WorkoutSummary {
  name: string;
  durationMinutes: number;
  exercises: ExerciseItem[];
  remainingExerciseCount?: number;
}

interface NextWorkoutCardProps {
  workout?: WorkoutSummary;
  onPressStart?: () => void;
  onPressCalendar?: () => void;
}

// mock workout
const MOCK_WORKOUT: WorkoutSummary = {
  name: "Upper Body A",
  durationMinutes: 75,
  exercises: [
    { name: "Bench Press", prescription: "4×6–8" },
    { name: "Incline DB Press", prescription: "3×8–10" },
    { name: "Cable Flyes", prescription: "3×12–15" },
    { name: "Overhead Press", prescription: "4×6–8" },
    { name: "Lateral Raises", prescription: "3×12–15" },
  ],
};

// Subcomponent: Card Header
const CardHeader: React.FC<{
  title: string;
  duration: number;
  onPressCalendar?: () => void;
}> = ({ title, duration, onPressCalendar }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <Text style={styles.label}>Next Workout</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.duration}>{duration} min</Text>
    </View>
    <Pressable
      onPress={onPressCalendar}
      style={styles.calendarButton}
      hitSlop={8}
    >
      <SymbolView name="calendar" size={24} tintColor={WHITE} />
    </Pressable>
  </View>
);

// subcomponent: exercise Row
const ExerciseRow: React.FC<{ exercise: ExerciseItem }> = ({ exercise }) => (
  <View style={styles.exerciseRow}>
    <Text style={styles.exerciseName}>{exercise.name}</Text>
    <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
  </View>
);

// subcomponent: more Exercises Row
const MoreExercisesRow: React.FC<{ count: number }> = ({ count }) => (
  <Text style={styles.moreExercises}>
    +{count} more exercise{count !== 1 ? "s" : ""}
  </Text>
);

// subcomponent: Start Workout Button
const StartWorkoutButton: React.FC<{ onPress?: () => void }> = ({
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.8 }]}
  >
    <Text style={styles.startButtonText}>Start Workout</Text>
  </Pressable>
);

// main Component
export default function NextWorkoutCard({
  workout = MOCK_WORKOUT,
  onPressStart,
  onPressCalendar,
}: NextWorkoutCardProps) {
  // display first 3 exercise
  const displayExercises = workout.exercises.slice(0, 3);

  // calculate remaining exercises
  const totalExercises = workout.exercises.length;
  const displayedCount = displayExercises.length;
  const remainingCount =
    workout.remainingExerciseCount ??
    Math.max(0, totalExercises - displayedCount);

  return (
    <View style={styles.card}>
      <View style={styles.gradientLayer} />

      <View style={styles.cardContent}>
        <CardHeader
          title={workout.name}
          duration={workout.durationMinutes}
          onPressCalendar={onPressCalendar}
        />

        <View style={styles.exerciseList}>
          {displayExercises.map((exercise, index) => (
            <ExerciseRow key={index} exercise={exercise} />
          ))}
        </View>

        {remainingCount > 0 && <MoreExercisesRow count={remainingCount} />}

        <StartWorkoutButton onPress={onPressStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: PRIMARY_COLOR,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PRIMARY_COLOR,
    opacity: 0.95,
  },
  cardContent: {
    padding: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  label: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.7,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: WHITE,
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
  },
  duration: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.85,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE,
    opacity: 0.15,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseList: {
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  exerciseName: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  exercisePrescription: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "600",
    opacity: 0.8,
    marginLeft: 12,
  },
  moreExercises: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  startButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 17,
    fontWeight: "700",
  },
});
