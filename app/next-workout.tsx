import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import {
    BACKGROUND_COLOR_DARK,
    BORDER_COLOR,
    CARD_BG,
    MUTED_BG,
    PRIMARY_COLOR,
    TEXT_COLOR,
    WHITE,
} from "../constants/colors";
import ExerciseCard, { Exercise, WorkoutSet } from "../components/ExerciseCard";

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const INITIAL_WORKOUT: { name: string; exercises: Exercise[] } = {
    name: "Upper Body A",
    exercises: [
        {
            id: "1",
            name: "Barbell Bench Press",
            prescription: "4×6–8 @ RPE 8",
            completed: false,
            sets: [
                { id: "1-1", weight: "185", reps: "8", rpe: "7", logged: false },
                { id: "1-2", weight: "185", reps: "8", rpe: "8", logged: false },
                { id: "1-3", weight: "185", reps: "7", rpe: "8", logged: false },
                { id: "1-4", weight: "185", reps: "6", rpe: "9", logged: false },
            ],
        },
        {
            id: "2",
            name: "Barbell Row",
            prescription: "4×8–10 @ RPE 7",
            completed: false,
            sets: [
                { id: "2-1", weight: "155", reps: "10", rpe: "7", logged: false },
                { id: "2-2", weight: "155", reps: "10", rpe: "7", logged: false },
                { id: "2-3", weight: "155", reps: "9", rpe: "8", logged: false },
                { id: "2-4", weight: "155", reps: "8", rpe: "8", logged: false },
            ],
        },
        {
            id: "3",
            name: "Overhead Press",
            prescription: "3×8–10 @ RPE 8",
            completed: false,
            sets: [
                { id: "3-1", weight: "95", reps: "10", rpe: "7", logged: false },
                { id: "3-2", weight: "95", reps: "9", rpe: "8", logged: false },
                { id: "3-3", weight: "95", reps: "8", rpe: "9", logged: false },
            ],
        },
        {
            id: "4",
            name: "Lateral Raises",
            prescription: "3×12–15 @ RPE 8",
            completed: false,
            sets: [
                { id: "4-1", weight: "25", reps: "15", rpe: "7", logged: false },
                { id: "4-2", weight: "25", reps: "14", rpe: "8", logged: false },
                { id: "4-3", weight: "25", reps: "12", rpe: "9", logged: false },
            ],
        },
        {
            id: "5",
            name: "Tricep Pushdowns",
            prescription: "3×12–15 @ RPE 8",
            completed: false,
            sets: [
                { id: "5-1", weight: "60", reps: "15", rpe: "7", logged: false },
                { id: "5-2", weight: "60", reps: "14", rpe: "8", logged: false },
                { id: "5-3", weight: "60", reps: "12", rpe: "9", logged: false },
            ],
        },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ visible, elapsed, completedCount, totalCount, onConfirm, onCancel }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Finish Workout?</Text>
                <Text style={styles.modalBody}>
                    {completedCount}/{totalCount} exercises completed · {formatTime(elapsed)}
                </Text>
                <View style={styles.modalButtons}>
                    <Pressable
                        style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                        onPress={onCancel}
                    >
                        <Text style={styles.modalCancelText}>Keep Going</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.modalConfirm, pressed && { opacity: 0.8 }]}
                        onPress={onConfirm}
                    >
                        <Text style={styles.modalConfirmText}>Finish</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    </Modal>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NextWorkoutScreen() {
    const [exercises, setExercises] = useState<Exercise[]>(
        INITIAL_WORKOUT.exercises.map((e) => ({
            ...e,
            sets: e.sets.map((s) => ({ ...s })),
        }))
    );
    const [elapsed, setElapsed] = useState(0);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const completedCount = exercises.filter((e) => e.completed).length;

    const updateSet = (
        exerciseId: string,
        setId: string,
        field: keyof WorkoutSet,
        value: string | boolean
    ) => {
        setExercises((prev) =>
            prev.map((ex) =>
                ex.id !== exerciseId
                    ? ex
                    : { ...ex, sets: ex.sets.map((s) => s.id === setId ? { ...s, [field]: value } : s) }
            )
        );
    };

    const toggleExerciseComplete = (exerciseId: string) => {
        setExercises((prev) =>
            prev.map((ex) => ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex)
        );
    };

    const handleFinish = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setShowFinishModal(false);
        router.back();
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
                        onPress={() => router.back()}
                        hitSlop={8}
                    >
                        <Ionicons name="chevron-back" size={24} color={WHITE} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{INITIAL_WORKOUT.name}</Text>
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
                                width: `${exercises.length > 0
                                    ? (completedCount / exercises.length) * 100
                                    : 0}%`,
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
                            onPressHistory={() => console.log("History:", exercise.name)}
                            onPressSwap={() => console.log("Swap:", exercise.name)}
                        />
                    ))}

                    <Pressable
                        style={({ pressed }) => [styles.finishButton, pressed && { opacity: 0.85 }]}
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
                onConfirm={handleFinish}
                onCancel={() => setShowFinishModal(false)}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
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
});
