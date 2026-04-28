import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ExerciseInfoPanel } from "./ExerciseInfoPanel";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/constants/themes";
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
    exerciseId?: string;
    name: string;
    prescription: string;
    sets: WorkoutSet[];
    completed: boolean;
    muscleGroup?: MuscleGroup;
    imageUrl?: string;
    description?: string;
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

interface SetRowProps {
    set: WorkoutSet;
    index: number;
    onChangeWeight: (val: string) => void;
    onChangeReps: (val: string) => void;
    onChangeRpe: (val: string) => void;
    onToggleLogged: () => void;
    styles: ReturnType<typeof createStyles>;
    theme: Theme;
}

const SetRow: React.FC<SetRowProps> = ({
    set,
    index,
    onChangeWeight,
    onChangeReps,
    onChangeRpe,
    onToggleLogged,
    styles,
    theme,
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
            placeholderTextColor={theme.placeholder}
            placeholder="—"
        />

        <TextInput
            style={[styles.setInput, set.logged && styles.setInputLogged]}
            value={set.reps}
            onChangeText={onChangeReps}
            keyboardType="number-pad"
            selectTextOnFocus
            editable={!set.logged}
            placeholderTextColor={theme.placeholder}
            placeholder="—"
        />

        <TextInput
            style={[styles.setInput, set.logged && styles.setInputLogged]}
            value={set.rpe}
            onChangeText={onChangeRpe}
            keyboardType="decimal-pad"
            selectTextOnFocus
            editable={!set.logged}
            placeholderTextColor={theme.placeholder}
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
                color={set.logged ? theme.white : theme.placeholder}
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
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [showInfo, setShowInfo] = useState(false);
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
                            <Ionicons name="checkmark" size={16} color={theme.white} />
                        )}
                    </Pressable>
                    <View style={styles.exerciseNameWrapper}>
                        <Text
                            style={[
                                styles.exerciseName,
                                exercise.completed && styles.exerciseNameCompleted,
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {exercise.name}
                        </Text>
                        <Text style={styles.prescription}>{exercise.prescription}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    {(exercise.imageUrl || exercise.description) && (
                        <Pressable
                            style={({ pressed }) => [styles.actionButton, showInfo && styles.actionButtonActive, pressed && { opacity: 0.7 }]}
                            onPress={() => setShowInfo(p => !p)}
                            hitSlop={6}
                        >
                            <Ionicons name="information-circle-outline" size={16} color={showInfo ? theme.text : theme.text} />
                        </Pressable>
                    )}
                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                        onPress={onPressHistory}
                    >
                        <Ionicons name="time-outline" size={16} color={theme.text} />
                        <Text style={styles.actionButtonText}>History</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                        onPress={onPressSwap}
                    >
                        <Ionicons name="swap-horizontal" size={16} color={theme.text} />
                        <Text style={styles.actionButtonText}>Swap</Text>
                    </Pressable>
                </View>
            </View>

            {showInfo && (
                <ExerciseInfoPanel imageUrl={exercise.imageUrl} description={exercise.description} />
            )}

            {/* Sets table */}
            <View style={styles.setsTable}>
                <View style={styles.setRow}>
                    <Text style={styles.setHeaderSet}>SET</Text>
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
                        styles={styles}
                        theme={theme}
                    />
                ))}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(theme: Theme) {
    return StyleSheet.create({
        card: {
            backgroundColor: theme.cardBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 12,
        },
        cardCompleted: {
            borderColor: theme.success,
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
            borderColor: theme.border,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
        },
        completionCircleDone: {
            backgroundColor: theme.success,
            borderColor: theme.success,
        },
        exerciseNameWrapper: {
            flex: 1,
            flexShrink: 1,
        },
        exerciseName: {
            color: theme.textPrimary,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 2,
        },
        exerciseNameCompleted: {
            textDecorationLine: "line-through",
            color: theme.text,
        },
        prescription: {
            color: theme.text,
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
            backgroundColor: theme.mutedBg,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: theme.border,
        },
        actionButtonActive: {
            borderColor: theme.text,
        },
        actionButtonText: {
            color: theme.text,
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
            color: theme.placeholder,
            fontSize: 14,
            fontWeight: "600",
            width: 24,
            textAlign: "center",
        },
        setHeaderSet: {
            color: theme.placeholder,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            width: 24,
            textAlign: "center",
        },
        setHeaderLabel: {
            color: theme.placeholder,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            flex: 1,
            textAlign: "center",
        },
        setInput: {
            flex: 1,
            backgroundColor: theme.mutedBg,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 4,
            color: theme.textPrimary,
            fontSize: 15,
            fontWeight: "600",
            textAlign: "center",
            borderWidth: 1,
            borderColor: theme.border,
        },
        setInputLogged: {
            backgroundColor: "transparent",
            borderColor: "transparent",
            color: theme.text,
        },
        logButton: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: theme.buttonDisabled,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.border,
        },
        logButtonDone: {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
        },
        logButtonPlaceholder: {
            width: 32,
        },
    });
}
