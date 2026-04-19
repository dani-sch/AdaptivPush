import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X, ArrowLeftRight } from 'lucide-react-native';

import { SwapExerciseModal } from '@/components/SwapExerciseModal';
import type { CurrentProgram, ProgramWorkout, WorkoutExercise } from '@/types/program';

import {
    BORDER_COLOR,
    CARD_BG,
    MUTED_BG,
    PLACEHOLDER_TEXT,
    SURFACE_BG,
    TEXT_COLOR,
    WHITE,
} from '@/constants/colors';

type Props = {
    workout: ProgramWorkout;
    program: CurrentProgram;
    onSwapExercise: (args: { exerciseId: string; replacement: WorkoutExercise; applyToProgram: boolean }) => void;
    onClose: () => void;
};

export function WorkoutTemplateModal({ workout, program, onSwapExercise, onClose }: Props) {
    const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);

    const closeSwap = () => setSwapExerciseId(null);
    const openSwap = (id: string) => setSwapExerciseId(id);

    return (
        <View style={styles.backdrop}>
            {/* Tap outside to close only when swap sheet isn't open */}
            {!swapExerciseId && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}

            {/* Main bottom sheet */}
            <View style={[styles.sheet, swapExerciseId && { opacity: 0.25 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>{workout.name}</Text>
                        <Text style={styles.headerSubtitle}>
                            {workout.estimatedTime} min • {workout.exercises.length} exercises
                        </Text>
                    </View>

                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.85 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Close workout details"
                    >
                        <X color={WHITE} size={18} />
                    </Pressable>
                </View>

                {/* Exercise List */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {workout.exercises.map((exercise: WorkoutExercise, idx: number) => (
                        <View key={exercise.id} style={styles.exerciseCard}>
                            <View style={styles.exerciseTopRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.exerciseTitleRow}>
                                        <Text style={styles.exerciseIndex}>{idx + 1}</Text>
                                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                                    </View>

                                    {(exercise.muscleGroup || exercise.equipment) && (
                                        <Text style={styles.exerciseMeta}>
                                            {exercise.muscleGroup ?? ''}{exercise.muscleGroup && exercise.equipment ? ' • ' : ''}{exercise.equipment ?? ''}
                                        </Text>
                                    )}
                                </View>

                                <Pressable
                                    onPress={() => openSwap(exercise.id)}
                                    style={({ pressed }) => [styles.swapButton, pressed && { opacity: 0.85 }]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Swap exercise ${exercise.name}`}
                                >
                                    <ArrowLeftRight color={WHITE} size={16} />
                                </Pressable>
                            </View>

                            <View style={styles.exerciseStatsRow}>
                                <Text style={styles.statText}>{exercise.sets ?? '-'} sets</Text>
                                <Text style={styles.statText}>{exercise.reps ?? '-'} reps</Text>
                                {exercise.weight ? <Text style={styles.statText}>{exercise.weight} lbs</Text> : null}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Swap overlay sheet (not a modal due to nesting issues) */}
            {!!swapExerciseId && (
                <View style={styles.swapOverlay} pointerEvents="auto">
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSwap} />

                    <View style={styles.nestedSheet}>
                        {/* Wrapper guarantees minimum height to display all content */}
                        <View style={{ flex: 1 }}>
                            <SwapExerciseModal
                                program={program}
                                exerciseId={swapExerciseId}
                                context="program"
                                onClose={closeSwap}
                                onSwap={onSwapExercise}
                            />
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.82)',
        justifyContent: 'flex-end',
    },

    sheet: {
        backgroundColor: SURFACE_BG,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        overflow: 'hidden',
        height: '75%',
        maxHeight: '90%',
    },

    header: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLOR,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        color: WHITE,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    headerSubtitle: {
        color: TEXT_COLOR,
        fontSize: 13,
    },

    closeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: MUTED_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrollContent: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        paddingBottom: 26,
    },

    exerciseCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        padding: 14,
        marginBottom: 12,
    },

    exerciseTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
    },

    exerciseTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    exerciseIndex: {
        color: PLACEHOLDER_TEXT,
        fontSize: 12,
        fontWeight: '700',
        width: 16,
        textAlign: 'center',
    },
    exerciseName: {
        color: WHITE,
        fontSize: 14,
        fontWeight: '700',
        flexShrink: 1,
    },
    exerciseMeta: {
        color: TEXT_COLOR,
        fontSize: 12,
    },

    swapButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: MUTED_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },

    exerciseStatsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    statText: {
        color: TEXT_COLOR,
        fontSize: 13,
    },

    swapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.82)',
        justifyContent: 'flex-end',
    },

    nestedSheet: {
        backgroundColor: SURFACE_BG,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        overflow: 'hidden',
        height: '72%',
        maxHeight: '85%',
        minHeight: 280,
    },
});