import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X, ArrowLeftRight, Info } from 'lucide-react-native';

import { SwapExerciseModal } from '@/components/SwapExerciseModal';
import { ExerciseInfoPanel } from '@/components/ExerciseInfoPanel';
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

function ExerciseRow({ exercise, idx, onSwap }: {
    exercise: WorkoutExercise;
    idx: number;
    onSwap: () => void;
}) {
    const [showInfo, setShowInfo] = useState(false);
    const hasInfo = !!(exercise.imageUrl || exercise.description);

    return (
        <View style={styles.exerciseCard}>
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

                <View style={styles.cardActions}>
                    {hasInfo && (
                        <Pressable
                            onPress={() => setShowInfo(p => !p)}
                            style={({ pressed }) => [styles.iconBtn, showInfo && styles.iconBtnActive, pressed && { opacity: 0.75 }]}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Exercise info"
                        >
                            <Info color={WHITE} size={15} />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={onSwap}
                        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Swap ${exercise.name}`}
                    >
                        <ArrowLeftRight color={WHITE} size={15} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.exerciseStatsRow}>
                <Text style={styles.statText}>{exercise.sets ?? '-'} sets</Text>
                <Text style={styles.statText}>{exercise.reps ?? '-'} reps</Text>
                {exercise.weight ? <Text style={styles.statText}>{exercise.weight} lbs</Text> : null}
            </View>

            {showInfo && (
                <ExerciseInfoPanel imageUrl={exercise.imageUrl} description={exercise.description} />
            )}
        </View>
    );
}

export function WorkoutTemplateModal({ workout, program, onSwapExercise, onClose }: Props) {
    const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);

    return (
        <View style={styles.backdrop}>
            {!swapExerciseId && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}

            <View style={[styles.sheet, swapExerciseId && { opacity: 0.25 }]}>
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
                    >
                        <X color={WHITE} size={18} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {workout.exercises.map((exercise, idx) => (
                        <ExerciseRow
                            key={exercise.id}
                            exercise={exercise}
                            idx={idx}
                            onSwap={() => setSwapExerciseId(exercise.id)}
                        />
                    ))}
                </ScrollView>
            </View>

            {!!swapExerciseId && (
                <View style={styles.swapOverlay} pointerEvents="auto">
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setSwapExerciseId(null)} />
                    <View style={styles.nestedSheet}>
                        <View style={{ flex: 1 }}>
                            <SwapExerciseModal
                                program={program}
                                exerciseId={swapExerciseId}
                                context="program"
                                embedded
                                onClose={() => setSwapExerciseId(null)}
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
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: MUTED_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBtnActive: {
        borderColor: TEXT_COLOR,
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
