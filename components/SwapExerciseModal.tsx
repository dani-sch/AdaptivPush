import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
// Images are served from Supabase Storage (public) — no auth headers needed.
import { X, Search, Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import type { CurrentProgram, WorkoutExercise, MuscleGroup, Equipment } from '@/types/program';
import { getAlternativesFor, exercisesByMuscleGroup } from '@/lib/exerciseDatabase';
import { supabase } from '@/utils/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { isCatalogExerciseId, type CatalogExerciseId } from '@/features/catalog/contracts';

interface SwapOption extends WorkoutExercise {
    catalogExerciseId?: CatalogExerciseId;
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
        scope: 'workout_only' | 'rest_of_program';
    }) => unknown | Promise<unknown>;
};

export function SwapExerciseModal({ program, exerciseId, onClose, onSwap, embedded }: Props) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [searchQuery, setSearchQuery] = useState('');
    const [scope, setScope] = useState<'workout_only' | 'rest_of_program'>('workout_only');
    const [selectedExercise, setSelectedExercise] = useState<SwapOption | null>(null);
    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);
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
    const resolvedMuscleGroup = useMemo<MuscleGroup | undefined>(() => {
        if (!currentExercise) return undefined;
        if (currentExercise.muscleGroup) return currentExercise.muscleGroup;
        if (!currentExercise.name) return undefined;
        const name = currentExercise.name.toLowerCase();
        const match = Object.entries(exercisesByMuscleGroup).find(([, exercises]) =>
            exercises.some((exercise) => exercise.name.toLowerCase() === name),
        );
        return match?.[0] as MuscleGroup | undefined;
    }, [currentExercise]);
    const [catalogUnavailable, setCatalogUnavailable] = useState(false);

    const loadAlternatives = useCallback(async (
        muscleGroup: MuscleGroup | undefined,
        excludedExerciseId?: string,
        preferredEquipment?: Equipment,
        originalName?: string,
    ) => {
        setLoadingExercises(true);
        setSelectedExercise(null);
        setAlternatives([]);
        setCatalogUnavailable(false);
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
                const { data: { session } } = await supabase.auth.getSession();
                const { data: profile } = session ? await supabase.from('user_profile')
                    .select('equipment_profile').eq('user_id', session.user.id).maybeSingle() : { data: null };
                const availableEquipment = JSON.stringify(profile?.equipment_profile ?? '').toLowerCase();
                const nameTokens = (originalName ?? '').toLowerCase().split(/\W+/).filter(token => token.length > 3);
                const resolvedAlternatives = data.flatMap(ex => {
                    if (!isCatalogExerciseId(ex.id)) return [];
                    return [{
                        id:          ex.id,
                        catalogExerciseId: ex.id,
                        name:        ex.name,
                        muscleGroup: ex.primary_muscle as MuscleGroup,
                        equipment:   ex.equipment as Equipment,
                        sets:        currentExercise?.sets,
                        reps:        currentExercise?.reps,
                        imageUrl:    ex.image_url ?? undefined,
                        description: (ex.instructions as string[] | null)?.[0] ?? undefined,
                    }];
                }).sort((left, right) => {
                    const score = (option: SwapOption) =>
                        (option.equipment === preferredEquipment ? 100 : 0)
                        + (availableEquipment.includes(String(option.equipment).toLowerCase()) ? 50 : 0)
                        + nameTokens.filter(token => option.name.toLowerCase().includes(token)).length * 10;
                    return score(right) - score(left) || left.name.localeCompare(right.name);
                });
                if (resolvedAlternatives.length > 0) {
                    setAlternatives(resolvedAlternatives);
                } else if (muscleGroup) {
                    setCatalogUnavailable(true);
                    const local = getAlternativesFor(
                        muscleGroup,
                        excludedExerciseId ? [excludedExerciseId] : [],
                    );
                    setAlternatives(local.map(ex => ({
                        id:          ex.id,
                        name:        ex.name,
                        muscleGroup: ex.muscleGroup,
                        equipment:   ex.equipment,
                        sets:        currentExercise?.sets,
                        reps:        currentExercise?.reps,
                    })));
                }
            } else if (muscleGroup) {
                setCatalogUnavailable(true);
                const local = getAlternativesFor(muscleGroup, excludedExerciseId ? [excludedExerciseId] : []);
                setAlternatives(local.map(ex => ({
                    id:          ex.id,
                    name:        ex.name,
                    muscleGroup: ex.muscleGroup,
                    equipment:   ex.equipment,
                    sets:        currentExercise?.sets,
                    reps:        currentExercise?.reps,
                })));
            }
        } finally {
            setLoadingExercises(false);
        }
    }, [currentExercise?.reps, currentExercise?.sets]);

    useEffect(() => {
        if (!currentExercise) return;
        void Promise.resolve().then(() =>
            loadAlternatives(resolvedMuscleGroup, currentExercise.exerciseId, currentExercise.equipment, currentExercise.name),
        );
    }, [currentExercise, loadAlternatives, resolvedMuscleGroup]);

    const filteredAlternatives = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return alternatives.filter(ex => {
            if (currentExercise?.exerciseId && ex.id === currentExercise.exerciseId) return false;
            if (currentExercise && ex.name === currentExercise.name) return false;
            if (!q) return true;
            return ex.name.toLowerCase().includes(q);
        });
    }, [alternatives, searchQuery, currentExercise]);

    const handleSwap = async () => {
        const catalogExerciseId = selectedExercise?.catalogExerciseId;
        if (!selectedExercise || !isCatalogExerciseId(catalogExerciseId)) return;
        setApplying(true);
        setApplyError(null);
        try {
            const { data: historyRows } = await supabase.from('workout_exercise_sets')
                .select('load_value, load_unit, load_kind, load_side')
                .eq('exercise_id', catalogExerciseId)
                .in('load_kind', ['external', 'assistance'])
                .not('load_value', 'is', null)
                .order('logged_at', { ascending: false })
                .limit(1);
            const history = historyRows?.[0];
            const hasSuggestion = history
                && Number.isFinite(Number(history.load_value))
                && (history.load_unit === 'lb' || history.load_unit === 'kg')
                && (history.load_kind === 'external' || history.load_kind === 'assistance');
            const applied = await onSwap({
                exerciseId,
                replacement: {
                    id:          catalogExerciseId,
                    exerciseId:  catalogExerciseId,
                    name:        selectedExercise.name,
                    muscleGroup: selectedExercise.muscleGroup,
                    equipment:   selectedExercise.equipment,
                    sets:        selectedExercise.sets,
                    reps:        selectedExercise.reps,
                    imageUrl:    selectedExercise.imageUrl,
                    description: selectedExercise.description,
                    loadSuggestion: hasSuggestion ? {
                        value: Number(history.load_value),
                        unit: history.load_unit,
                        kind: history.load_kind,
                        side: history.load_side ?? 'unknown',
                    } : undefined,
                },
                scope,
            });
            if (applied !== false) onClose();
        } catch (error) {
            setApplyError(error instanceof Error ? error.message : 'The exercise swap could not be saved.');
        } finally {
            setApplying(false);
        }
    };

    const canApplySelectedExercise = isCatalogExerciseId(selectedExercise?.catalogExerciseId);

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
                    <X color={theme.white} size={18} />
                </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Search color={theme.placeholder} size={18} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search exercises..."
                        placeholderTextColor={theme.placeholder}
                        style={styles.searchInput}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {/* List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>{(resolvedMuscleGroup ?? 'General').toUpperCase()} EXERCISES</Text>
                {catalogUnavailable ? (
                    <Text style={styles.catalogUnavailableText}>
                        Showing local previews. Reconnect to resolve a catalog ID before applying a swap.
                    </Text>
                ) : null}
                {loadingExercises ? (
                    <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
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
                                                <Check color={theme.white} size={14} />
                                            </View>
                                        )}
                                        {/* Info toggle — separate from selection */}
                                        <Pressable
                                            onPress={() => setExpandedId(prev => prev === ex.id ? null : ex.id)}
                                            hitSlop={8}
                                            style={styles.chevronBtn}
                                        >
                                            {isExpanded
                                                ? <ChevronUp color={theme.placeholder} size={16} />
                                                : <ChevronDown color={theme.placeholder} size={16} />
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
                <Text style={styles.scopeLabel}>SCOPE</Text>
                <View style={styles.scopeOptions}>
                    <Pressable
                        style={[styles.scopeButton, scope === 'workout_only' && styles.scopeButtonSelected]}
                        onPress={() => setScope('workout_only')}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: scope === 'workout_only' }}
                    >
                        <Text style={styles.switchText}>This workout only</Text>
                        <Text style={styles.switchDescription}>Changes this scheduled workout. Logged sets remain unchanged.</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.scopeButton, scope === 'rest_of_program' && styles.scopeButtonSelected]}
                        onPress={() => setScope('rest_of_program')}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: scope === 'rest_of_program' }}
                    >
                        <Text style={styles.switchText}>Rest of program</Text>
                        <Text style={styles.switchDescription}>
                            Changes this workout’s remaining work and later uncompleted occurrences. Completed history stays unchanged.
                        </Text>
                    </Pressable>
                </View>
                {applyError ? <Text style={styles.applyError} accessibilityLiveRegion="assertive">{applyError}</Text> : null}

                <Pressable
                    onPress={() => void handleSwap()}
                    disabled={!canApplySelectedExercise || applying}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canApplySelectedExercise }}
                    style={({ pressed }) => [
                        styles.swapBtn,
                        (!canApplySelectedExercise || applying) && styles.swapBtnDisabled,
                        pressed && canApplySelectedExercise && { opacity: 0.92 },
                    ]}
                >
                    <Text style={styles.swapBtnText}>
                        {applying
                            ? 'Saving…'
                            : selectedExercise && !canApplySelectedExercise
                            ? 'Reconnect to Apply'
                            : 'Apply swap'}
                    </Text>
                </Pressable>
            </View>
        </>
    );

    if (embedded) {
        return <KeyboardAvoidingView
            style={styles.embeddedContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >{content}</KeyboardAvoidingView>;
    }

    return (
        <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {content}
            </KeyboardAvoidingView>
        </View>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.82)',
            justifyContent: 'flex-end',
        },
        embeddedContainer: {
            flex: 1,
            backgroundColor: theme.surfaceBg,
        },
        sheet: {
            backgroundColor: theme.surfaceBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
            maxHeight: '90%',
            height: '75%',
        },

        header: {
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        headerTitle: {
            color: theme.textPrimary,
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 2,
        },
        headerSubtitle: {
            color: theme.text,
            fontSize: 13,
        },
        iconBtn: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.mutedBg,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
        },

        searchWrap: {
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        searchInput: {
            flex: 1,
            color: theme.textPrimary,
            fontSize: 14,
        },

        listContent: {
            paddingHorizontal: 18,
            paddingVertical: 14,
            paddingBottom: 24,
        },
        sectionLabel: {
            color: theme.placeholder,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
            marginBottom: 10,
        },
        catalogUnavailableText: {
            color: theme.text,
            fontSize: 12,
            lineHeight: 17,
            marginBottom: 12,
        },

        exerciseCard: {
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            marginBottom: 10,
            overflow: 'hidden',
        },
        exerciseCardSelected: {
            borderColor: theme.primary,
            borderWidth: 2,
        },
        exerciseRow: {
            padding: 14,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
        },
        exerciseName: {
            color: theme.textPrimary,
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 4,
        },
        exerciseMeta: {
            color: theme.text,
            fontSize: 12,
            marginBottom: 10,
        },
        exerciseStatsRow: {
            flexDirection: 'row',
            gap: 14,
            marginBottom: 8,
        },
        statText: {
            color: theme.text,
            fontSize: 12,
        },
        exerciseDescription: {
            color: theme.placeholder,
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
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        chevronBtn: {
            padding: 2,
        },

        detailPanel: {
            borderTopWidth: 1,
            borderTopColor: theme.border,
            padding: 14,
            gap: 12,
        },
        exerciseGif: {
            width: '100%',
            height: 200,
            borderRadius: 10,
            backgroundColor: theme.mutedBg,
        },
        descriptionText: {
            color: theme.text,
            fontSize: 13,
            lineHeight: 19,
        },

        emptyWrap: {
            paddingVertical: 30,
            alignItems: 'center',
        },
        emptyText: {
            color: theme.text,
            fontSize: 13,
        },

        footer: {
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.surfaceBg,
            gap: 12,
        },
        scopeLabel: {
            color: theme.placeholder,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.8,
        },
        scopeOptions: {
            flexDirection: 'row',
            gap: 8,
        },
        scopeButton: {
            flex: 1,
            minHeight: 72,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 10,
        },
        scopeButtonSelected: {
            borderColor: theme.primary,
            backgroundColor: theme.mutedBg,
        },
        switchText: {
            color: theme.textPrimary,
            fontSize: 13,
            fontWeight: '600',
        },

        swapBtn: {
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        swapBtnDisabled: {
            opacity: 0.5,
        },
        swapBtnText: {
            color: theme.white,
            fontSize: 15,
            fontWeight: '800',
        },
        switchDescription: {
            color: theme.text,
            fontSize: 11,
            lineHeight: 16,
            marginTop: 3,
        },
        applyError: {
            color: theme.error,
            fontSize: 12,
            lineHeight: 18,
        },
    });
}
