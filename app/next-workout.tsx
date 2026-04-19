import { ExerciseHistoryModal } from "@/components/ExerciseHistoryModal";
import { SwapExerciseModal } from "@/components/SwapExerciseModal";
import { useCurrentProgram } from "@/hooks/useCurrentProgram";
import type { CurrentProgram, ProgramWorkout } from "@/types/program";
import { supabase } from "@/utils/supabase";
import { getReadinessModifier } from "@/utils/progressionEngine";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ExerciseCard, { Exercise, WorkoutSet } from "../components/ExerciseCard";
import {
    BACKGROUND_COLOR_DARK,
    BORDER_COLOR,
    CARD_BG,
    MUTED_BG,
    PRIMARY_COLOR,
    TEXT_COLOR,
    WHITE,
} from "../constants/colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build ExerciseCard Exercise[] from a real ProgramWorkout, with optional readiness overlay */
function buildExercises(workout: ProgramWorkout, readinessScore: number | null): Exercise[] {
  const modifier = readinessScore !== null ? getReadinessModifier(readinessScore) : null;

  return workout.exercises.map((ex) => {
    const setCount = ex.sets ?? 3;
    const baseWeight = ex.weight != null ? ex.weight : 0;

    // Apply readiness modifier to the displayed weight (UI overlay only — not persisted)
    const weightForSet = (setIndex: number): string => {
      const raw = ex.perSetWeights?.[setIndex] ?? baseWeight;
      const adjusted = modifier
        ? Math.max(0, Math.round((raw * modifier.weightMultiplier) / 2.5) * 2.5)
        : raw;
      return adjusted > 0 ? String(adjusted) : "";
    };

    // Apply readiness RPE delta
    const baseRpe = ex.targetRpe != null ? ex.targetRpe : null;
    const adjustedRpe = baseRpe !== null && modifier
      ? Math.min(10, Math.max(5, baseRpe + modifier.rpeDelta))
      : baseRpe;
    const rpeStr = adjustedRpe != null ? String(adjustedRpe) : "";

    const sets: WorkoutSet[] = Array.from({ length: setCount }, (_, i) => ({
      id: `${ex.id}-${i + 1}`,
      weight: weightForSet(i),
      reps: "",
      rpe: rpeStr,
      logged: false,
    }));

    const repDisplay = (ex.reps ?? "8-12").replace("-", "–");
    const prescription =
      ex.targetRpe != null
        ? `${setCount}×${repDisplay} @ RPE ${ex.targetRpe}`
        : `${setCount}×${repDisplay}`;

    if (!ex.exerciseId) {
      console.warn(`[buildExercises] Missing exerciseId for "${ex.name}" (pde.id=${ex.id})`);
    }

    return {
      id: ex.id,
      exerciseId: ex.exerciseId,
      name: ex.name,
      prescription,
      muscleGroup: ex.muscleGroup,
      sets,
      completed: false,
    };
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Finish Modal ─────────────────────────────────────────────────────────────

const FinishModal: React.FC<{
  visible: boolean;
  elapsed: number;
  completedCount: number;
  totalCount: number;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  visible,
  elapsed,
  completedCount,
  totalCount,
  saving,
  onConfirm,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Finish Workout?</Text>
        <Text style={styles.modalBody}>
          {completedCount}/{totalCount} exercises completed ·{" "}
          {formatTime(elapsed)}
        </Text>
        <View style={styles.modalButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.modalCancel,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onCancel}
          >
            <Text style={styles.modalCancelText}>Keep Going</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.modalConfirm,
              (pressed || saving) && { opacity: 0.8 },
            ]}
            onPress={saving ? undefined : onConfirm}
            disabled={saving}
          >
            <Text style={styles.modalConfirmText}>
              {saving ? "Saving…" : "Finish"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NextWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { program, loading, applyProgressionToNextWeek } = useCurrentProgram();

  // Find the matching workout day; fall back to first in current week
  const programWorkout = workoutId
    ? (program?.workouts.find((w) => w.id === workoutId) ??
      program?.workouts[0])
    : program?.workouts[0];

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutName, setWorkoutName] = useState("Workout");
  const [programDayId, setProgramDayId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(
    null,
  );
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch latest readiness score once on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("readiness_logs")
          .select("readiness_score")
          .eq("user_id", user.id)
          .order("log_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.readiness_score != null) {
          setReadinessScore(Number(data.readiness_score));
        }
      } catch {
        // Readiness fetch is best-effort; proceed without overlay
      }
    })();
  }, []);

  // Populate exercises once the program workout and readiness score are available
  useEffect(() => {
    if (programWorkout) {
      setExercises(buildExercises(programWorkout, readinessScore));
      setWorkoutName(programWorkout.name);
      setProgramDayId(programWorkout.id);
    }
  }, [programWorkout?.id, readinessScore]);

  const programForSwap = useMemo<CurrentProgram | null>(() => {
    if (!program || !programWorkout) return null;
    return {
      ...program,
      workouts: [
        {
          id: programWorkout.id,
          name: programWorkout.name,
          day: programWorkout.day,
          estimatedTime: programWorkout.estimatedTime,
          exercises: exercises.map((ex) => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            equipment: undefined,
          })),
        },
      ],
    };
  }, [program, programWorkout, exercises]);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setElapsed((prev) => prev + 1),
      1000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const completedCount = exercises.filter((e) => e.completed).length;

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof WorkoutSet,
    value: string | boolean,
  ) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s,
              ),
            },
      ),
    );
  };

  const toggleExerciseComplete = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex,
      ),
    );
  };

  const handleFinish = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowFinishModal(false);
    setSaving(true);

    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Not signed in");

      const totalVolumeLb = exercises.reduce(
        (total, ex) =>
          total +
          ex.sets
            .filter((s) => s.logged)
            .reduce((setTotal, s) => {
              const weight = parseFloat(s.weight) || 0;
              const reps = parseInt(s.reps) || 0;
              return setTotal + weight * reps;
            }, 0),
        0,
      );

      const { data: sessionRow, error: sessionErr } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          program_day_id: programDayId,
          workout_name: workoutName,
          started_at: new Date(Date.now() - elapsed * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_min: Math.round(elapsed / 60),
          total_volume_lb: Math.round(totalVolumeLb),
        })
        .select("id")
        .single();

      if (sessionErr) throw sessionErr;

      // Filter to only sets with valid exerciseId (FK constraint requires non-null)
      const setRows = exercises.flatMap((ex) => {
        if (!ex.exerciseId) {
          console.warn(`[handleFinish] Skipping sets for "${ex.name}" — missing exerciseId`);
          return [];
        }
        return ex.sets
          .filter((s) => s.logged && parseInt(s.reps) > 0)
          .map((s, idx) => ({
            session_id: sessionRow?.id,
            exercise_id: ex.exerciseId!,
            set_number: idx + 1,
            weight_lb: parseFloat(s.weight) || null,
            reps: parseInt(s.reps),
            rpe: parseFloat(s.rpe) || null,
          }));
      });

      if (setRows.length > 0) {
        const { error: setsErr } = await supabase
          .from("workout_exercise_sets")
          .insert(setRows);
        if (setsErr) {
          console.error("[handleFinish] Sets insert failed:", setsErr.message);
          Alert.alert(
            "Workout Saved Partially",
            `Your session was recorded but individual set data failed to save: ${setsErr.message}`,
            [{ text: "OK" }],
          );
          setSaving(false);
          router.back();
          return;
        }
      }

      // Trigger progression for next week now that new data is available
      try {
        await applyProgressionToNextWeek();
      } catch (progressionErr) {
        console.warn("[handleFinish] Progression update failed:", progressionErr);
      }

      setSaving(false);
      router.back();
    } catch (err) {
      console.error("[handleFinish] Failed to save workout:", err);
      setSaving(false);
      Alert.alert(
        "Save Failed",
        "Could not save your workout. Please try again.",
        [
          { text: "Retry", onPress: () => handleFinish() },
          { text: "Discard", style: "destructive", onPress: () => router.back() },
        ],
      );
    }
  };

  if (loading && exercises.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={WHITE} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{workoutName}</Text>
            <Text style={styles.headerSubtitle}>
              {completedCount}/{exercises.length} done
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${
                  exercises.length > 0
                    ? (completedCount / exercises.length) * 100
                    : 0
                }%`,
              },
            ]}
          />
        </View>

        {/* Exercise list */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onUpdateSet={(setId, field, value) =>
                updateSet(exercise.id, setId, field, value)
              }
              onToggleComplete={() => toggleExerciseComplete(exercise.id)}
              onPressHistory={() => {
                setHistoryExerciseId(exercise.exerciseId ?? null);
                setHistoryExerciseName(exercise.name);
              }}
              onPressSwap={() => setSwapTargetId(exercise.id)}
            />
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.finishButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => setShowFinishModal(true)}
          >
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </Pressable>
        </ScrollView>

        {/* Floating timer */}
        <View style={styles.timerBubble} pointerEvents="none">
          <Ionicons name="timer-outline" size={14} color={TEXT_COLOR} />
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>
      </KeyboardAvoidingView>

      <FinishModal
        visible={showFinishModal}
        elapsed={elapsed}
        completedCount={completedCount}
        totalCount={exercises.length}
        saving={saving}
        onConfirm={handleFinish}
        onCancel={() => setShowFinishModal(false)}
      />

      {/* Swap Exercise Modal */}
      <Modal visible={swapTargetId !== null} transparent animationType="slide">
        {swapTargetId !== null && programForSwap !== null && (
          <SwapExerciseModal
            program={programForSwap}
            exerciseId={swapTargetId}
            context="workout"
            onClose={() => setSwapTargetId(null)}
            onSwap={({ exerciseId, replacement }) => {
              setExercises((prev) =>
                prev.map((ex) =>
                  ex.id === exerciseId
                    ? {
                        ...ex,
                        id: replacement.id,
                        exerciseId: replacement.exerciseId,
                        name: replacement.name,
                        muscleGroup: replacement.muscleGroup,
                      }
                    : ex,
                ),
              );
              setSwapTargetId(null);
            }}
          />
        )}
      </Modal>

      {/* Exercise History Modal */}
      <Modal
        visible={historyExerciseId !== null}
        transparent
        animationType="slide"
      >
        {historyExerciseId !== null && historyExerciseName !== null && (
          <ExerciseHistoryModal
            exerciseId={historyExerciseId}
            exerciseName={historyExerciseName}
            onClose={() => {
              setHistoryExerciseId(null);
              setHistoryExerciseName(null);
            }}
          />
        )}
      </Modal>

      {/* Saving overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.savingText}>Saving workout…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR_DARK,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: TEXT_COLOR,
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MUTED_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: TEXT_COLOR,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  headerRight: {
    width: 36,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: BORDER_COLOR,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  finishButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  finishButtonText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "700",
  },
  timerBubble: {
    position: "absolute",
    bottom: 32,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  timerText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalTitle: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    color: TEXT_COLOR,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: MUTED_BG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalCancelText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 999,
  },
  savingText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});
