import { AppAlert as Alert } from '@/components/ui/AppDialog';
import React, { useMemo, useState, useCallback } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable, Modal, Platform } from 'react-native';
import { Plus, ChevronRight, MoreVertical, LayoutList, Archive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentProgram } from '@/hooks/useCurrentProgram';
import { GenerateProgramModal } from '@/components/GenerateProgramModal';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { reportSupabaseFailure, supabaseSaveFailureMessage } from '@/utils/supabaseResilience';
import { PendingSequenceBanner } from '@/components/PendingSequenceBanner';
import type { ProgramSequenceState } from '@/features/programs/sequenceRepository';
import sequenceOperations from '@/features/programs/sequenceService';
import { createOperationId } from '@/features/kernel/operationId';
import { sequenceOperationStore } from '@/features/programs/sequenceOperationStore';
import { supabase } from '@/utils/supabase';
import NextWorkoutCard from '@/components/NextWorkoutCard';
import { summarizeWorkout } from '@/features/workouts/workoutSummary';

function LoadingState({ styles }: { styles: ReturnType<typeof createStyles> }) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: styles.label.color }}>Loading program...</Text>
        </View>
    );
}

function UnavailableState({
    message,
    onRetry,
    styles,
    theme,
}: {
    message: string;
    onRetry: () => void;
    styles: ReturnType<typeof createStyles>;
    theme: Theme;
}) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
            <Text style={{ color: theme.text, textAlign: 'center', lineHeight: 21, marginBottom: 16 }}>
                {message}
            </Text>
            <Pressable
                onPress={onRetry}
                style={{ backgroundColor: theme.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
            >
                <Text style={{ color: theme.white, fontWeight: '700' }}>Try Again</Text>
            </Pressable>
        </View>
    );
}


function EmptyState({
                        onCreateProgram,
                        onGenerateProgram,
                        onOpenArchived,
                        busy,
                        styles,
                        theme,
                    }: {
    onCreateProgram: () => void;
    onGenerateProgram: () => void;
    onOpenArchived: () => void;
    busy: boolean;
    styles: ReturnType<typeof createStyles>;
    theme: Theme;
}) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <Text style={{ color: theme.text, textAlign: 'center', marginBottom: 14 }}>
                No current program yet. Create one to get started.
            </Text>

            <Pressable
                disabled={busy}
                onPress={onGenerateProgram}
                style={({ pressed }) => [
                    {
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: theme.primary,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        alignItems: 'center' as const,
                        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                        marginBottom: 10,
                    },
                ]}
            >
                <Text style={{ color: theme.white, fontWeight: '700' }}>Generate Personal Program</Text>
            </Pressable>

            <Pressable
                disabled={busy}
                onPress={onCreateProgram}
                style={({ pressed }) => [
                    {
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: theme.cardBg,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        alignItems: 'center',
                        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                        marginBottom: 10,
                    },
                ]}
            >
                <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{busy ? 'Working…' : 'Create Program'}</Text>
            </Pressable>

            <Pressable
                disabled={busy}
                onPress={onOpenArchived}
                style={({ pressed }) => [
                    {
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        alignItems: 'center',
                        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                        marginTop: 10,
                    },
                ]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Archive size={16} color={theme.textPrimary} />
                    <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Archived Programs</Text>
                </View>
            </Pressable>
        </View>
    );
}

export default function PlanScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [showMenu, setShowMenu] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);

    const {
        program,
        ownerId,
        loading,
        refreshing,
        unavailable,
        availabilityMessage,
        refresh,
        endCurrentProgram,
    } = useCurrentProgram();
    const [sequence, setSequence] = useState<ProgramSequenceState | null>(null);
    const [sequenceError, setSequenceError] = useState<string | null>(null);
    const [sequenceBusy, setSequenceBusy] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const suggestedWeek = program?.workouts.find(workout =>
        workout.stableDayId === sequence?.nextStableDayId)?.weekNumber ?? program?.currentWeek ?? 1;
    const [longPause, setLongPause] = useState(false);
    const sequenceProgramId = program?.id ?? null;
    const loadSequence = useCallback(async () => {
        if (!ownerId || !sequenceProgramId) { setSequence(null); return; }
        try {
            const state = await sequenceOperations.ensureInitialized(ownerId, sequenceProgramId);
            if (state.programId !== sequenceProgramId) throw new Error('Program sequence belongs to a different program.');
            const linked = state.days.flatMap(day => day.sessionId ? [day.sessionId] : []);
            if (linked.length) {
                const { data, error } = await supabase.from('workout_sessions')
                    .select('finalized_at').eq('user_id', ownerId).in('id', linked)
                    .order('finalized_at', { ascending: false }).limit(1).maybeSingle();
                if (error) throw error;
                if (!data?.finalized_at) throw new Error('Last finalized program workout is unavailable.');
                const finalizedAt = Date.parse(data.finalized_at);
                if (!Number.isFinite(finalizedAt)) throw new Error('Last finalized program workout time is invalid.');
                setLongPause(Date.now() - finalizedAt >= 14 * 24 * 60 * 60 * 1000);
            } else setLongPause(false);
            setSequence(state);
            setSequenceError(null);
        } catch (error) {
            setSequence(null);
            setSequenceError(error instanceof Error ? error.message : 'Program sequence could not be loaded.');
        }
    }, [ownerId, sequenceProgramId]);
    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
    useFocusEffect(useCallback(() => { void loadSequence(); }, [loadSequence]));

    const changeSequence = async (kind: 'pause' | 'resume' | 'set_day' | 'reorder',
        fields: Record<string, unknown> = {}) => {
        if (!ownerId || !sequence || !program || sequenceBusy) return;
        setSequenceBusy(true);
        try {
            if ((await sequenceOperationStore.listPendingForOwner(ownerId))
                .some(operation => operation.programId === program.id)) {
                throw new Error('Retry or verify the pending program operation before making another change.');
            }
            await sequenceOperations.change(ownerId, program.id, {
                schemaVersion: 1, programId: program.id, operationId: createOperationId(),
                expectedRevision: sequence.revision, kind, ...fields,
            });
            await loadSequence();
        } catch (error) {
            reportSupabaseFailure('program.sequence_change', error);
            Alert.alert('Program not changed', error instanceof Error ? error.message : 'Retry the exact pending operation before making another change.');
            await loadSequence();
        } finally { setSequenceBusy(false); }
    };

    const contentPaddingTop = useMemo(() => {
        return insets.top + 18;
    }, [insets.top]);

    if (loading) return <LoadingState styles={styles} />;
    if (unavailable && !program) {
        return (
            <UnavailableState
                message={availabilityMessage ?? 'Unable to load your program. Try again.'}
                onRetry={() => void refresh()}
                styles={styles}
                theme={theme}
            />
        );
    }
    if (!program)
        return (
            <>
                <EmptyState
                    busy={false}
                    onGenerateProgram={() => setShowGenModal(true)}
                    onCreateProgram={() => router.push('/create-program')}
                    onOpenArchived={() => router.push('/archived-programs')}
                    styles={styles}
                    theme={theme}
                />
                <Modal visible={showGenModal} transparent animationType="slide">
                    <GenerateProgramModal
                        visible={showGenModal}
                        onClose={() => setShowGenModal(false)}
                        onProgramCreated={() => {
                            setShowGenModal(false);
                            refresh();
                        }}
                    />
                </Modal>
            </>
        );
    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
                showsVerticalScrollIndicator={false}
            >
                {unavailable ? (
                    <View style={{ backgroundColor: theme.mutedBg, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 }}>
                        <Text style={{ color: theme.text, lineHeight: 19 }}>
                            {availabilityMessage} Showing your last loaded program.
                        </Text>
                        <Pressable onPress={() => void refresh()} disabled={refreshing}>
                            <Text style={{ color: theme.primaryLight, fontWeight: '700', marginTop: 8 }}>
                                {refreshing ? 'Retrying…' : 'Try Again'}
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{program.name}</Text>
                        <Text style={styles.subtitle}>{program.goal}</Text>
                    </View>

                    <Pressable
                        onPress={() => setShowMenu((v) => !v)}
                        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.85 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Open program menu"
                    >
                        <MoreVertical color={theme.textPrimary} size={20} />
                    </Pressable>
                </View>

                {/* Menu Dropdown */}
                {showMenu && (
                    <View style={styles.menuCard}>
                        {sequence && <>
                            <Pressable accessibilityRole="button" disabled={sequenceBusy}
                                style={styles.menuItem} onPress={() => { setShowMenu(false); void changeSequence(sequence.paused ? 'resume' : 'pause'); }}>
                                <Text style={styles.menuText}>{sequence.paused ? 'Resume program' : 'Pause program'}</Text>
                            </Pressable>
                            <View style={styles.menuDivider} />
                        </>}
                        <Pressable
                            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                            onPress={() => {
                                setShowMenu(false);
                                setShowGenModal(true);
                            }}
                        >
                            <Text style={styles.menuText}>Generate New Program</Text>
                        </Pressable>

                        <View style={styles.menuDivider} />

                        <Link href="/create-program" asChild>
                            <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                                <View style={styles.menuItem}>
                                    <Text style={styles.menuText}>Create Custom Program</Text>
                                </View>
                            </Pressable>
                        </Link>

                        <View style={styles.menuDivider} />

                        <Pressable
                            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                            onPress={() => {
                                setShowMenu(false);
                                router.push('/archived-programs');
                            }}
                        >
                            <View style={styles.menuItemRow}>
                                <Archive size={16} color={theme.textPrimary} />
                                <Text style={styles.menuText}>Archived Programs</Text>
                            </View>
                        </Pressable>

                        <View style={styles.menuDivider} />

                        <Pressable
                            onPress={() => {
                                Alert.alert(
                                    'End current program?',
                                    'This will stop the current program and return you to the program setup screen.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'End Program',
                                            style: 'destructive',
                                            onPress: async () => {
                                                try {
                                                    await endCurrentProgram();
                                                    setShowMenu(false);
                                                } catch (e) {
                                                    reportSupabaseFailure('program.archive', e);
                                                    Alert.alert('Program not ended', supabaseSaveFailureMessage(e));
                                                    setShowMenu(false);
                                                }
                                            },
                                        },
                                    ],
                                );
                            }}
                            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                        >
                            <Text style={[styles.menuText, { color: theme.errorLight }]}>End Current Program</Text>
                        </Pressable>
                    </View>
                )}

                {!sequence && (
                    <View style={[styles.section, { backgroundColor: theme.mutedBg, borderRadius: 14, padding: 14 }]}>
                        <Text style={{ color: theme.text }}>Your workouts are not ready yet. {sequenceError}</Text>
                        <Pressable accessibilityRole="button" onPress={() => void loadSequence()}
                            style={{ paddingVertical: 12 }}>
                            <Text style={{ color: theme.primary }}>Retry workout setup</Text>
                        </Pressable>
                    </View>
                )}
                {sequence && longPause && (
                    <View style={[styles.section, { backgroundColor: theme.mutedBg, padding: 14, borderRadius: 12 }]}>
                        <Text style={{ color: theme.text, marginBottom: 8 }}>
                            It has been at least 14 days since your last finalized program workout. Nothing changes automatically.
                        </Text>
                        <Pressable accessibilityRole="button" onPress={() => {
                            if (sequence.paused) void changeSequence('resume');
                            else Alert.alert('Program unchanged', 'Select a pending workout day when ready.');
                        }} style={{ padding: 10 }}>
                            <Text style={{ color: theme.primary }}>Resume unchanged</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => router.push('/program-overview')}
                            style={{ padding: 10 }}>
                            <Text style={{ color: theme.primary }}>Review/adjust program</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => router.push('/create-program')}
                            style={{ padding: 10 }}>
                            <Text style={{ color: theme.primary }}>Start new program</Text>
                        </Pressable>
                    </View>
                )}
                <PendingSequenceBanner key={`${ownerId}-${sequenceBusy}`} ownerId={ownerId}
                    refreshProgram={() => { void loadSequence(); void refresh(); }} />
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your program</Text>
                    <Text style={styles.subtitle}>{program.totalWeeks} weeks · {program.daysPerWeek} days per week</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingVertical: 16 }}>
                        {Array.from(new Set(program.workouts.map(workout => workout.weekNumber ?? program.currentWeek)))
                            .sort((a, b) => a - b).map(week => (
                                <Pressable key={week} accessibilityRole="button"
                                    accessibilityState={{ selected: (selectedWeek ?? suggestedWeek) === week }}
                                    onPress={() => setSelectedWeek(week)}
                                    style={{ minHeight: 48, minWidth: 80, borderRadius: 12, borderWidth: 1,
                                        justifyContent: 'center', alignItems: 'center', padding: 10,
                                        borderColor: theme.border, backgroundColor:
                                            (selectedWeek ?? suggestedWeek) === week ? theme.mutedBg : theme.cardBg }}>
                                    <Text style={{ color: theme.textPrimary }}>Week {week}</Text>
                                </Pressable>
                            ))}
                    </ScrollView>
                    {program.workouts.filter(workout => (workout.weekNumber ?? program.currentWeek) ===
                        (selectedWeek ?? suggestedWeek)).map(workout => (
                        workout.exercises.length ? <NextWorkoutCard key={workout.id} compact showAllExercises
                            statusLabel={`Week ${workout.weekNumber ?? program.currentWeek} · ${workout.day}`}
                            workout={summarizeWorkout(workout)} />
                            : <View key={workout.id} style={styles.workoutCard}>
                                <Text style={styles.workoutName}>{workout.name || 'Rest day'}</Text>
                                <Text style={styles.workoutMeta}>{workout.day} · Rest</Text>
                            </View>
                    ))}
                </View>

                {/* View Full Program */}
                <Pressable
                    style={({ pressed }) => [styles.viewFullProgramBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push('/program-overview')}
                    accessibilityRole="button"
                >
                    <LayoutList color={theme.primary} size={18} />
                    <Text style={styles.viewFullProgramText}>View Full Program</Text>
                    <ChevronRight color={theme.placeholder} size={18} style={{ marginLeft: 'auto' }} />
                </Pressable>

                {/* Create Program */}
                <View style={styles.ctaCard}>
                    <Link href="/create-program" asChild>
                        <Pressable style={({ pressed }) => [styles.ctaCard, pressed && { opacity: 0.9 }]}>
                            <View style={styles.ctaLeft}>
                                <View style={styles.ctaIcon}>
                                    <Plus color={theme.white} size={20} />
                                </View>
                                <Text style={styles.ctaText}>Create Custom Program</Text>
                                <ChevronRight color={theme.placeholder} size={20} />
                            </View>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>

            {/* Generate Program Modal */}
            <Modal visible={showGenModal} transparent animationType="slide">
                <GenerateProgramModal
                    visible={showGenModal}
                    onClose={() => setShowGenModal(false)}
                    onProgramCreated={() => {
                        setShowGenModal(false);
                        refresh();
                    }}
                />
            </Modal>
        </View>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
        },
        content: {
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 28,
        },

        headerRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
        },
        title: {
            color: theme.textPrimary,
            fontSize: 24,
            fontWeight: '600',
            marginBottom: 4,
        },
        subtitle: {
            color: theme.text,
            fontSize: 13,
        },
        summaryCard: {
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 18,
            padding: 14,
            gap: 12,
        },
        summaryTitle: {
            color: theme.textPrimary,
            fontSize: 16,
            fontWeight: '600',
        },
        summaryMeta: {
            color: theme.text,
            fontSize: 13,
        },
        iconButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
        },

        menuCard: {
            backgroundColor: theme.surfaceBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 18,
        },
        menuItem: {
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        menuItemPressed: {
            backgroundColor: theme.mutedBg,
        },
        menuItemRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        menuText: {
            color: theme.textPrimary,
            fontSize: 14,
        },
        menuDivider: {
            height: 1,
            backgroundColor: theme.border,
        },

        section: {
            marginBottom: 18,
        },
        sectionTitle: {
            color: theme.textPrimary,
            fontSize: 18,
            fontWeight: '600',
            marginBottom: 12,
        },
        rowBetween: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        label: {
            color: theme.text,
            fontSize: 13,
        },

        progressTrack: {
            height: 8,
            backgroundColor: theme.mutedBg,
            borderRadius: 999,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            backgroundColor: theme.primary,
            borderRadius: 999,
        },

        weekRow: {
            flexDirection: 'row',
        },
        weekCell: {
            width: `${100 / 7}%`,
            alignItems: 'center',
        },
        weekHeaderText: {
            color: theme.placeholder,
            fontSize: 12,
        },
        dayBox: {
            width: '86%',
            aspectRatio: 1,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dayBoxActive: {
            backgroundColor: theme.primary,
        },
        dayBoxInactive: {
            backgroundColor: theme.mutedBg,
        },
        dayBoxText: {
            fontSize: 12,
            fontWeight: '600',
        },

        workoutCard: {
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 18,
            padding: 14,
        },
        workoutTopRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
        },
        workoutLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: 1,
        },
        workoutIndexBox: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        workoutIndexText: {
            color: theme.white,
            fontWeight: '700',
            fontSize: 14,
        },
        workoutName: {
            color: theme.textPrimary,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 2,
        },
        workoutMeta: {
            color: theme.text,
            fontSize: 13,
        },
        chevronButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.mutedBg,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        exerciseCount: {
            color: theme.text,
            fontSize: 13,
        },

        ctaCard: {
            marginTop: 8,
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 18,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        ctaLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        ctaIcon: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            color: theme.textPrimary,
            fontSize: 15,
            fontWeight: '600',
        },
        viewFullProgramBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginTop: 16,
            marginBottom: 4,
        },
        viewFullProgramText: {
            color: theme.textPrimary,
            fontSize: 15,
            fontWeight: '600',
        },
    });
}
