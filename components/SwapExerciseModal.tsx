import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import { X, Search, Check } from 'lucide-react-native';

import type { CurrentProgram, WorkoutExercise } from '@/types/program'; // adjust to your types
import { exerciseAlternatives } from '@/lib/mockData'; // your dummy map: muscleGroup -> Exercise[]

import {
    BORDER_COLOR,
    CARD_BG,
    MUTED_BG,
    PLACEHOLDER_TEXT,
    PRIMARY_COLOR,
    SURFACE_BG,
    TEXT_COLOR,
    WHITE,
} from '@/constants/colors';

type Props = {
    program: CurrentProgram;
    exerciseId: string;
    context: 'program' | 'workout';
    onClose: () => void;

    // This is how we actually "do the swap"
    onSwap: (args: {
        exerciseId: string;
        replacement: WorkoutExercise;
        applyToProgram: boolean;
    }) => void;
};

export function SwapExerciseModal({ program, exerciseId, context, onClose, onSwap }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [applyToProgram, setApplyToProgram] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);

    const currentExercise = useMemo(() => {
        for (const workout of program.workouts) {
            const found = workout.exercises.find((e) => e.id === exerciseId);
            if (found) return found as WorkoutExercise;
        }
        return null;
    }, [program, exerciseId]);

    {/*
    const alternatives = useMemo(() => {
        if (!currentExercise) return [];
        return exerciseAlternatives[currentExercise.muscleGroup] ?? [];
    }, [currentExercise]);
    */}

    {/*
    const filteredAlternatives = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return alternatives.filter((ex) => {
            if (ex.id === exerciseId) return false;
            if (currentExercise && ex.name === currentExercise.name) return false;
            if (!q) return true;
            return ex.name.toLowerCase().includes(q);
        });
    }, [alternatives, searchQuery, exerciseId, currentExercise]);
    */}

    const handleSwap = () => {
        if (!selectedExercise) return;
        onSwap({
            exerciseId,
            replacement: selectedExercise,
            applyToProgram: context === 'workout' ? applyToProgram : true, // program context implies yes
        });
        onClose();
    };

    if (!currentExercise) return null;

    return (
        <View style={styles.backdrop}>
            {/* tap outside */}
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

            <View style={styles.sheet}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Swap Exercise</Text>
                        <Text style={styles.headerSubtitle}>Replace {currentExercise.name}</Text>
                    </View>

                    <Pressable style={styles.iconBtn} onPress={onClose} accessibilityRole="button">
                        <X color={WHITE} size={18} />
                    </Pressable>
                </View>

                {/* Search */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <Search color={PLACEHOLDER_TEXT} size={18} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search exercises..."
                            placeholderTextColor={PLACEHOLDER_TEXT}
                            style={styles.searchInput}
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* List */}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionLabel}>{(currentExercise.muscleGroup ?? 'General').toUpperCase()} EXERCISES</Text>
                    {/*
                    {filteredAlternatives.map((ex) => {
                        const isSelected = selectedExercise?.id === ex.id;

                        return (
                            <Pressable
                                key={ex.id}
                                onPress={() => setSelectedExercise(ex)}
                                style={({ pressed }) => [
                                    styles.exerciseRow,
                                    isSelected && styles.exerciseRowSelected,
                                    pressed && { opacity: 0.92 },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exerciseName}>{ex.name}</Text>
                                    <Text style={styles.exerciseMeta}>{ex.equipment}</Text>

                                    <View style={styles.exerciseStatsRow}>
                                        <Text style={styles.statText}>{ex.sets} sets</Text>
                                        <Text style={styles.statText}>{ex.reps} reps</Text>
                                    </View>
                                </View>

                                {isSelected ? (
                                    <View style={styles.checkCircle}>
                                        <Check color={WHITE} size={14} />
                                    </View>
                                ) : null}
                            </Pressable>
                        );
                    })}
                    */}

                    {/*
                    {filteredAlternatives.length === 0 && (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>No exercises found</Text>
                        </View>
                    )}
                    */}
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    {context === 'workout' && (
                        <View style={styles.switchRow}>
                            <Text style={styles.switchText}>Apply to program going forward</Text>
                            <Switch
                                value={applyToProgram}
                                onValueChange={setApplyToProgram}
                                trackColor={{ false: MUTED_BG, true: PRIMARY_COLOR }}
                                thumbColor={WHITE}
                            />
                        </View>
                    )}

                    <Pressable
                        onPress={handleSwap}
                        disabled={!selectedExercise}
                        style={({ pressed }) => [
                            styles.swapBtn,
                            !selectedExercise && styles.swapBtnDisabled,
                            pressed && selectedExercise && { opacity: 0.92 },
                        ]}
                    >
                        <Text style={styles.swapBtnText}>Swap Exercise</Text>
                    </Pressable>
                </View>
            </View>
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
        fontWeight: '800',
        marginBottom: 2,
    },
    headerSubtitle: {
        color: TEXT_COLOR,
        fontSize: 13,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: MUTED_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },

    searchWrap: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLOR,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        color: WHITE,
        fontSize: 14,
    },

    listContent: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        paddingBottom: 24,
    },
    sectionLabel: {
        color: PLACEHOLDER_TEXT,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
    },

    exerciseRow: {
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    exerciseRowSelected: {
        borderColor: PRIMARY_COLOR,
        borderWidth: 2,
    },
    exerciseName: {
        color: WHITE,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    exerciseMeta: {
        color: TEXT_COLOR,
        fontSize: 12,
        marginBottom: 10,
    },
    exerciseStatsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    statText: {
        color: TEXT_COLOR,
        fontSize: 12,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: PRIMARY_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },

    emptyWrap: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyText: {
        color: TEXT_COLOR,
        fontSize: 13,
    },

    footer: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
        backgroundColor: SURFACE_BG,
        gap: 12,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    switchText: {
        color: WHITE,
        fontSize: 13,
        fontWeight: '600',
    },

    swapBtn: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    swapBtnDisabled: {
        opacity: 0.5,
    },
    swapBtnText: {
        color: WHITE,
        fontSize: 15,
        fontWeight: '800',
    },
});