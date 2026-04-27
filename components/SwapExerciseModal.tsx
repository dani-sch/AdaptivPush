import React, { useMemo, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Switch,
} from 'react-native';
// Images are served from Supabase Storage (public) — no auth headers needed.
import { X, Search, Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import type { CurrentProgram, WorkoutExercise, MuscleGroup, Equipment } from '@/types/program';
import { getAlternativesFor, exercisesByMuscleGroup } from '@/lib/exerciseDatabase';
import { supabase } from '@/utils/supabase';

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

interface SwapOption extends WorkoutExercise {
    imageUrl?: string;
    description?: string;
}

type Props = {
    program: CurrentProgram;
    exerciseId: string;
    context: 'program' | 'workout';
    onClose: () => void;
    /** When true, skip the backdrop/sheet wrapper — parent handles layout. */
    embedded?: boolean;

    onSwap: (args: {
        exerciseId: string;
        replacement: WorkoutExercise;
        applyToProgram: boolean;
    }) => void;
};

export function SwapExerciseModal({ program, exerciseId, context, onClose, onSwap, embedded }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [applyToProgram, setApplyToProgram] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<SwapOption | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const currentExercise = useMemo(() => {
        for (const workout of program.workouts) {
            const found = workout.exercises.find((e) => e.id === exerciseId);
            if (found) return found as WorkoutExercise;
        }
        return null;
    }, [program, exerciseId]);

    const [alternatives, setAlternatives] = useState<SwapOption[]>([]);
    const [loadingExercises, setLoadingExercises] = useState(false);
    const [resolvedMuscleGroup, setResolvedMuscleGroup] = useState<MuscleGroup | undefined>(undefined);

    useEffect(() => {
        if (!currentExercise) return;
        let muscleGroup = currentExercise.muscleGroup;
        if (!muscleGroup && currentExercise.name) {
            const name = currentExercise.name.toLowerCase();
            for (const [group, exercises] of Object.entries(exercisesByMuscleGroup)) {
                if (exercises.some(ex => ex.name.toLowerCase() === name)) {
                    muscleGroup = group as MuscleGroup;
                    break;
                }
            }
        }
        loadAlternatives(muscleGroup);
        setResolvedMuscleGroup(muscleGroup);
    }, [currentExercise?.id]);

    async function loadAlternatives(muscleGroup: MuscleGroup | undefined) {
        setLoadingExercises(true);
        try {
            let query = supabase
                .from('exercises')
                .select('id, name, primary_muscle, equipment, image_url, instructions')
                .order('name');

            if (muscleGroup) {
                query = query.eq('primary_muscle', muscleGroup);
            }

            const { data, error } = await query;

            if (!error && data && data.length > 0) {
                setAlternatives(data.map(ex => ({
                    id:          ex.id,
                    name:        ex.name,
                    muscleGroup: ex.primary_muscle as MuscleGroup,
                    equipment:   ex.equipment as Equipment,
                    sets:        3,
                    reps:        '8–12',
                    imageUrl:    ex.image_url ?? undefined,
                    description: (ex.instructions as string[] | null)?.[0] ?? undefined,
                })));
            } else if (muscleGroup) {
                const local = getAlternativesFor(muscleGroup, [exerciseId]);
                setAlternatives(local.map(ex => ({
                    id:          ex.id,
                    name:        ex.name,
                    muscleGroup: ex.muscleGroup,
                    equipment:   ex.equipment,
                    sets:        ex.defaultSets,
                    reps:        `${ex.defaultRepMin}–${ex.defaultRepMax}`,
                })));
            }
        } finally {
            setLoadingExercises(false);
        }
    }

    const filteredAlternatives = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return alternatives.filter(ex => {
            if (ex.id === exerciseId) return false;
            if (currentExercise && ex.name === currentExercise.name) return false;
            if (!q) return true;
            return ex.name.toLowerCase().includes(q);
        });
    }, [alternatives, searchQuery, exerciseId, currentExercise]);

    const handleSwap = () => {
        if (!selectedExercise) return;
        onSwap({
            exerciseId,
            replacement: {
                id:          selectedExercise.id,
                name:        selectedExercise.name,
                muscleGroup: selectedExercise.muscleGroup,
                equipment:   selectedExercise.equipment,
                sets:        selectedExercise.sets,
                reps:        selectedExercise.reps,
            },
            applyToProgram: context === 'workout' ? applyToProgram : true,
        });
        onClose();
    };

    if (!currentExercise) return null;

    const content = (
        <>
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
                <Text style={styles.sectionLabel}>{(resolvedMuscleGroup ?? 'General').toUpperCase()} EXERCISES</Text>
                {loadingExercises ? (
                    <ActivityIndicator color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
                ) : filteredAlternatives.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>No exercises found</Text>
                    </View>
                ) : (
                    filteredAlternatives.map(ex => {
                        const isSelected = selectedExercise?.id === ex.id;
                        const isExpanded = expandedId === ex.id;
                        return (
                            <View
                                key={ex.id}
                                style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
                            >
                                {/* Tappable main row — selects the exercise */}
                                <Pressable
                                    onPress={() => setSelectedExercise(prev => prev?.id === ex.id ? null : ex)}
                                    style={({ pressed }) => [styles.exerciseRow, pressed && { opacity: 0.92 }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exerciseName}>{ex.name}</Text>
                                        <Text style={styles.exerciseMeta}>{ex.equipment}</Text>
                                        <View style={styles.exerciseStatsRow}>
                                            <Text style={styles.statText}>{ex.sets} sets</Text>
                                            <Text style={styles.statText}>{ex.reps} reps</Text>
                                        </View>
                                        {ex.description && !isExpanded && (
                                            <Text style={styles.exerciseDescription} numberOfLines={2}>
                                                {ex.description}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.rowActions}>
                                        {isSelected && (
                                            <View style={styles.checkCircle}>
                                                <Check color={WHITE} size={14} />
                                            </View>
                                        )}
                                        {/* Info toggle — separate from selection */}
                                        <Pressable
                                            onPress={() => setExpandedId(prev => prev === ex.id ? null : ex.id)}
                                            hitSlop={8}
                                            style={styles.chevronBtn}
                                        >
                                            {isExpanded
                                                ? <ChevronUp color={PLACEHOLDER_TEXT} size={16} />
                                                : <ChevronDown color={PLACEHOLDER_TEXT} size={16} />
                                            }
                                        </Pressable>
                                    </View>
                                </Pressable>

                                {/* Expanded detail — GIF + full instructions */}
                                {isExpanded && (
                                    <View style={styles.detailPanel}>
                                        {ex.imageUrl ? (
                                            <Image
                                                source={{ uri: ex.imageUrl }}
                                                style={styles.exerciseGif}
                                                resizeMode="contain"
                                            />
                                        ) : null}
                                        {ex.description && (
                                            <Text style={styles.descriptionText}>{ex.description}</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
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
        </>
    );

    if (embedded) {
        return <View style={styles.embeddedContainer}>{content}</View>;
    }

    return (
        <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <View style={styles.sheet}>
                {content}
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
    embeddedContainer: {
        flex: 1,
        backgroundColor: SURFACE_BG,
    },
    sheet: {
        backgroundColor: SURFACE_BG,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        overflow: 'hidden',
        maxHeight: '90%',
        height: '75%',
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

    exerciseCard: {
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
    },
    exerciseCardSelected: {
        borderColor: PRIMARY_COLOR,
        borderWidth: 2,
    },
    exerciseRow: {
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
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
        marginBottom: 8,
    },
    statText: {
        color: TEXT_COLOR,
        fontSize: 12,
    },
    exerciseDescription: {
        color: PLACEHOLDER_TEXT,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 2,
    },
    rowActions: {
        alignItems: 'center',
        gap: 8,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: PRIMARY_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chevronBtn: {
        padding: 2,
    },

    detailPanel: {
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
        padding: 14,
        gap: 12,
    },
    exerciseGif: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        backgroundColor: MUTED_BG,
    },
    descriptionText: {
        color: TEXT_COLOR,
        fontSize: 13,
        lineHeight: 19,
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
