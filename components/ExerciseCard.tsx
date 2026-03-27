import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
    BORDER_COLOR,
    BUTTON_DISABLED,
    CARD_BG,
    MUTED_BG,
    PLACEHOLDER_TEXT,
    PRIMARY_COLOR,
    SUCCESS,
    TEXT_COLOR,
    WHITE,
} from "../constants/colors";
import type { MuscleGroup } from "@/types/program";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutSet {
    id: string;
    weight: string;
    reps: string;
    rpe: string;
    logged: boolean;
}

export interface Exercise {
    id: string;
    name: string;
    prescription: string;
    sets: WorkoutSet[];
    completed: boolean;
    muscleGroup?: MuscleGroup;
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

interface SetRowProps {
    set: WorkoutSet;
    index: number;
    onChangeWeight: (val: string) => void;
    onChangeReps: (val: string) => void;
    onChangeRpe: (val: string) => void;
    onToggleLogged: () => void;
}

const SetRow: React.FC<SetRowProps> = ({
    set,
    index,
    onChangeWeight,
    onChangeReps,
    onChangeRpe,
    onToggleLogged,
}) => (
    <View style={[styles.setRow, set.logged && styles.setRowLogged]}>
        <Text style={styles.setNumber}>{index + 1}</Text>

        <TextInput
            style={[styles.setInput, set.logged && styles.setInputLogged]}
            value={set.weight}
            onChangeText={onChangeWeight}
            keyboardType="decimal-pad"
            selectTextOnFocus
            editable={!set.logged}
            placeholderTextColor={PLACEHOLDER_TEXT}
            placeholder="—"
        />

        <TextInput
            style={[styles.setInput, set.logged && styles.setInputLogged]}
            value={set.reps}
            onChangeText={onChangeReps}
            keyboardType="number-pad"
            selectTextOnFocus
            editable={!set.logged}
            placeholderTextColor={PLACEHOLDER_TEXT}
            placeholder="—"
        />

        <TextInput
            style={[styles.setInput, set.logged && styles.setInputLogged]}
            value={set.rpe}
            onChangeText={onChangeRpe}
            keyboardType="decimal-pad"
            selectTextOnFocus
            editable={!set.logged}
            placeholderTextColor={PLACEHOLDER_TEXT}
            placeholder="—"
        />

        <Pressable
            style={({ pressed }) => [
                styles.logButton,
                set.logged && styles.logButtonDone,
                pressed && { opacity: 0.7 },
            ]}
            onPress={onToggleLogged}
            hitSlop={6}
        >
            <Ionicons
                name="checkmark"
                size={16}
                color={set.logged ? WHITE : PLACEHOLDER_TEXT}
            />
        </Pressable>
    </View>
);

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

interface ExerciseCardProps {
    exercise: Exercise;
    onUpdateSet: (setId: string, field: keyof WorkoutSet, value: string | boolean) => void;
    onToggleComplete: () => void;
    onPressHistory: () => void;
    onPressSwap: () => void;
}

export default function ExerciseCard({
    exercise,
    onUpdateSet,
    onToggleComplete,
    onPressHistory,
    onPressSwap,
}: ExerciseCardProps) {
    return (
        <View style={[styles.card, exercise.completed && styles.cardCompleted]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.completionCircle,
                            exercise.completed && styles.completionCircleDone,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={onToggleComplete}
                        hitSlop={8}
                    >
                        {exercise.completed && (
                            <Ionicons name="checkmark" size={16} color={WHITE} />
                        )}
                    </Pressable>
                    <View>
                        <Text
                            style={[
                                styles.exerciseName,
                                exercise.completed && styles.exerciseNameCompleted,
                            ]}
                        >
                            {exercise.name}
                        </Text>
                        <Text style={styles.prescription}>{exercise.prescription}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                        onPress={onPressHistory}
                    >
                        <Ionicons name="time-outline" size={16} color={TEXT_COLOR} />
                        <Text style={styles.actionButtonText}>History</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                        onPress={onPressSwap}
                    >
                        <Ionicons name="swap-horizontal" size={16} color={TEXT_COLOR} />
                        <Text style={styles.actionButtonText}>Swap</Text>
                    </Pressable>
                </View>
            </View>

            {/* Sets table */}
            <View style={styles.setsTable}>
                <View style={styles.setRow}>
                    <Text style={styles.setHeaderLabel}>SET</Text>
                    <Text style={styles.setHeaderLabel}>LBS</Text>
                    <Text style={styles.setHeaderLabel}>REPS</Text>
                    <Text style={styles.setHeaderLabel}>RPE</Text>
                    <View style={styles.logButtonPlaceholder} />
                </View>

                {exercise.sets.map((set, idx) => (
                    <SetRow
                        key={set.id}
                        set={set}
                        index={idx}
                        onChangeWeight={(val) => onUpdateSet(set.id, "weight", val)}
                        onChangeReps={(val) => onUpdateSet(set.id, "reps", val)}
                        onChangeRpe={(val) => onUpdateSet(set.id, "rpe", val)}
                        onToggleLogged={() => onUpdateSet(set.id, "logged", !set.logged)}
                    />
                ))}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        padding: 16,
        marginBottom: 12,
    },
    cardCompleted: {
        borderColor: SUCCESS,
        borderWidth: 1.5,
        opacity: 0.75,
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    completionCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: BORDER_COLOR,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    completionCircleDone: {
        backgroundColor: SUCCESS,
        borderColor: SUCCESS,
    },
    exerciseName: {
        color: WHITE,
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
    },
    exerciseNameCompleted: {
        textDecorationLine: "line-through",
        color: TEXT_COLOR,
    },
    prescription: {
        color: TEXT_COLOR,
        fontSize: 13,
        fontWeight: "500",
    },

    actions: {
        flexDirection: "row",
        gap: 8,
        marginLeft: 8,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: MUTED_BG,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    actionButtonText: {
        color: TEXT_COLOR,
        fontSize: 12,
        fontWeight: "600",
    },

    setsTable: {
        gap: 4,
    },
    setRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
    },
    setRowLogged: {
        opacity: 0.6,
    },
    setNumber: {
        color: PLACEHOLDER_TEXT,
        fontSize: 14,
        fontWeight: "600",
        width: 24,
        textAlign: "center",
    },
    setHeaderLabel: {
        color: PLACEHOLDER_TEXT,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.8,
        flex: 1,
        textAlign: "center",
    },
    setInput: {
        flex: 1,
        backgroundColor: MUTED_BG,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 4,
        color: WHITE,
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    setInputLogged: {
        backgroundColor: "transparent",
        borderColor: "transparent",
        color: TEXT_COLOR,
    },
    logButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: BUTTON_DISABLED,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    logButtonDone: {
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
    },
    logButtonPlaceholder: {
        width: 32,
    },
});
