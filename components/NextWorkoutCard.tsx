import { SymbolView } from "expo-symbols";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/constants/themes";
import {
  visibleWorkoutExercises,
  type HomeExerciseItem,
} from "@/features/workouts/homePresentation";

// TypeScript types
export type ExerciseItem = HomeExerciseItem;

export interface WorkoutSummary {
  id: string;
  name: string;
  durationMinutes: number;
  exercises: ExerciseItem[];
  remainingExerciseCount?: number;
}

interface NextWorkoutCardProps {
  entryIssue?: string | null;
  hasActiveDraft?: boolean;
  actionLabel?: string;
  workout?: WorkoutSummary;
  onPressStart?: () => void;
  onPressCalendar?: () => void;
}


// Subcomponent: Card Header
const CardHeader: React.FC<{
  title: string;
  duration: number;
  onPressCalendar?: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}> = ({ title, duration, onPressCalendar, styles, theme }) => (
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
      <SymbolView name="calendar" size={24} tintColor={theme.white} />
    </Pressable>
  </View>
);

// subcomponent: exercise Row
const ExerciseRow: React.FC<{ exercise: ExerciseItem; styles: ReturnType<typeof createStyles> }> = ({ exercise, styles }) => (
  <View style={styles.exerciseRow}>
    <Text style={styles.exerciseName}>{exercise.name}</Text>
    <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
  </View>
);

// subcomponent: Start Workout Button
const StartWorkoutButton: React.FC<{
  continuing: boolean;
  label?: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}> = ({
  continuing,
  label,
  onPress,
  styles,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.8 }]}
    accessibilityRole="button"
    accessibilityLabel={label ?? (continuing ? "Continue workout" : "Start workout")}
  >
    <Text style={styles.startButtonText}>{label ?? (continuing ? "Continue Workout" : "Start Workout")}</Text>
  </Pressable>
);

// main Component
export default function NextWorkoutCard({
  entryIssue,
  hasActiveDraft = false,
  actionLabel,
  workout,
  onPressStart,
  onPressCalendar,
}: NextWorkoutCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  if (!workout) return null;
  const expanded = expandedWorkoutId === workout.id;
  const displayExercises = visibleWorkoutExercises(workout.exercises, expanded);

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
          styles={styles}
          theme={theme}
        />

        <View style={styles.exerciseList}>
          {displayExercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} styles={styles} />
          ))}
        </View>

        {remainingCount > 0 && (
          <Pressable
            onPress={() => setExpandedWorkoutId((value) => value === workout.id ? null : workout.id)}
            style={({ pressed }) => [styles.moreExercisesButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded
              ? "Show fewer exercises"
              : `Show ${remainingCount} more exercise${remainingCount === 1 ? "" : "s"}`}
            hitSlop={8}
          >
            <Text style={styles.moreExercises}>
              {expanded
                ? "Show fewer exercises"
                : `Show ${remainingCount} more exercise${remainingCount === 1 ? "" : "s"}`}
            </Text>
            {expanded
              ? <ChevronUp color={theme.white} size={18} />
              : <ChevronDown color={theme.white} size={18} />}
          </Pressable>
        )}

        {entryIssue ? <Text style={styles.exercisePrescription}>{entryIssue}</Text>
          : <StartWorkoutButton label={actionLabel} continuing={hasActiveDraft} onPress={onPressStart} styles={styles} />}
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: 24,
      backgroundColor: theme.primary,
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
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.primary,
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
      color: theme.white,
      fontSize: 13,
      fontWeight: "500",
      opacity: 0.7,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    title: {
      color: theme.white,
      fontSize: 26,
      fontWeight: "700",
      marginBottom: 4,
    },
    duration: {
      color: theme.white,
      fontSize: 15,
      fontWeight: "500",
      opacity: 0.85,
    },
    calendarButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.white,
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
      color: theme.white,
      fontSize: 16,
      fontWeight: "500",
      flex: 1,
    },
    exercisePrescription: {
      color: theme.white,
      fontSize: 15,
      fontWeight: "600",
      opacity: 0.8,
      marginLeft: 12,
    },
    moreExercisesButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginTop: 4,
      marginBottom: 12,
    },
    moreExercises: {
      color: theme.white,
      fontSize: 14,
      fontWeight: "500",
      opacity: 0.85,
    },
    pressed: {
      opacity: 0.7,
    },
    startButton: {
      backgroundColor: theme.white,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    startButtonText: {
      color: theme.primary,
      fontSize: 17,
      fontWeight: "700",
    },
  });
}
