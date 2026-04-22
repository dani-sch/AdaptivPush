import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Link, router } from 'expo-router';
import { Plus, ChevronRight, MoreVertical, LayoutList, Archive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';

import { useCurrentProgram } from '@/hooks/useCurrentProgram';
import { WorkoutTemplateModal } from '@/components/WorkoutTemplateModal';
import { GenerateProgramModal } from '@/components/GenerateProgramModal';

import {
    BACKGROUND_COLOR_DARK,
    BORDER_COLOR,
    CARD_BG,
    MUTED_BG,
    PLACEHOLDER_TEXT,
    PRIMARY_COLOR,
    SURFACE_BG,
    TEXT_COLOR,
    WHITE,
    ERROR_COLOR_LIGHT,
} from '@/constants/colors';

function LoadingState() {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: TEXT_COLOR }}>Loading program...</Text>
        </View>
    );
}


function EmptyState({
                        onCreateProgram,
                        onCreateDevProgram,
                        onGenerateProgram,
                        onOpenArchived,
                        busy,
                    }: {
    onCreateProgram: () => void;
    onCreateDevProgram: () => void;
    onGenerateProgram: () => void;
    onOpenArchived: () => void;
    busy: boolean;
}) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <Text style={{ color: TEXT_COLOR, textAlign: 'center', marginBottom: 14 }}>
                No current program yet. Create one to get started.
            </Text>

            <Pressable
                disabled={busy}
                onPress={onGenerateProgram}
                style={({ pressed }) => [
                    {
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: PRIMARY_COLOR,
                        borderWidth: 1,
                        borderColor: BORDER_COLOR,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        alignItems: 'center' as const,
                        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                        marginBottom: 10,
                    },
                ]}
            >
                <Text style={{ color: WHITE, fontWeight: '700' }}>Generate Personal Program</Text>
            </Pressable>

            <Pressable
                disabled={busy}
                onPress={onCreateProgram}
                style={({ pressed }) => [
                    {
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: CARD_BG,
                        borderWidth: 1,
                        borderColor: BORDER_COLOR,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        alignItems: 'center',
                        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                        marginBottom: 10,
                    },
                ]}
            >
                <Text style={{ color: WHITE, fontWeight: '700' }}>{busy ? 'Working…' : 'Create Program'}</Text>
            </Pressable>

            <Pressable
                disabled={busy}
                onPress={onCreateDevProgram}
                style={({ pressed }) => [
                    {
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: MUTED_BG,
                        borderWidth: 1,
                        borderColor: BORDER_COLOR,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        alignItems: 'center',
                        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                    },
                ]}
            >
                <Text style={{ color: WHITE, fontWeight: '700' }}>{busy ? 'Working…' : 'Dev: Create Default Program'}</Text>
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
                        borderColor: BORDER_COLOR,
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
                    <Archive size={16} color={WHITE} />
                    <Text style={{ color: WHITE, fontWeight: '700' }}>Archived Programs</Text>
                </View>
            </Pressable>
        </View>
    );
}

export default function PlanScreen() {
    const insets = useSafeAreaInsets();

    const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);

    const { program, loading, refresh, swapExercise, endCurrentProgram, createBlankProgram, createDevTestProgram } = useCurrentProgram();
    const [creating, setCreating] = useState(false);

    // TODO: Replace fake completion count with real workout session / completion data.
    const completedCount = program?.workouts.filter((_, i) => i < 2).length ?? 0;
    const totalCount = program?.workouts.length ?? 0;

    const progressPct = useMemo(() => {
        if (!program) return 0;
        const pct = (program.currentWeek / program.totalWeeks) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [program]);

    const selectedWorkoutObj = useMemo(
        () => program?.workouts.find((workout) => workout.id === selectedWorkout) ?? null,
        [program, selectedWorkout],
    );

    const contentPaddingTop = useMemo(() => {
        return insets.top + 18;
    }, [insets.top]);

    if (loading) return <LoadingState />;
    if (!program)
        return (
            <>
                <EmptyState
                    busy={creating}
                    onGenerateProgram={() => setShowGenModal(true)}
                    onCreateProgram={async () => {
                        try {
                            setCreating(true);
                            await createBlankProgram();
                        } finally {
                            setCreating(false);
                        }
                    }}
                    onCreateDevProgram={async () => {
                        try {
                            setCreating(true);
                            await createDevTestProgram();
                        } finally {
                            setCreating(false);
                        }
                    }}
                    onOpenArchived={() => router.push('/archived-programs')}
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
                        <MoreVertical color={WHITE} size={20} />
                    </Pressable>
                </View>

                {/* Menu Dropdown */}
                {showMenu && (
                    <View style={styles.menuCard}>
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
                                <Archive size={16} color={WHITE} />
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
                                                    console.error(e);
                                                    setShowMenu(false);
                                                }
                                            },
                                        },
                                    ],
                                );
                            }}
                            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                        >
                            <Text style={[styles.menuText, { color: ERROR_COLOR_LIGHT }]}>End Current Program</Text>
                        </Pressable>
                    </View>
                )}

                {/* Progress Bar */}
                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.label}>Progress</Text>
                        <Text style={styles.label}>
                            Week {program.currentWeek} of {program.totalWeeks}
                        </Text>
                    </View>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                    </View>
                </View>

                {/* Week View */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>This Week’s Workouts</Text>

                    {/* Weekly Progress */}
                    <View style={styles.section}>

                        <View style={styles.summaryCard}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.summaryTitle}>Week {program.currentWeek}</Text>
                                <Text style={styles.summaryMeta}>
                                    {completedCount}/{totalCount} completed
                                </Text>
                            </View>

                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` },
                                    ]}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Workout List */}
                    <View style={{ marginTop: 18 }}>
                        {program.workouts.map((workout, idx) => (
                            <View key={workout.id} style={[styles.workoutCard, idx > 0 && { marginTop: 12 }]}>
                                <View style={styles.workoutTopRow}>
                                    <View style={styles.workoutLeft}>
                                        <View style={styles.workoutIndexBox}>
                                            <Text style={styles.workoutIndexText}>{idx + 1}</Text>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.workoutName}>{workout.name}</Text>
                                            <Text style={styles.workoutMeta}>
                                                Day {idx + 1} • {workout.estimatedTime} min
                                            </Text>
                                        </View>
                                    </View>

                                    <Pressable
                                        onPress={() => setSelectedWorkout(workout.id)}
                                        style={({ pressed }) => [styles.chevronButton, pressed && { opacity: 0.85 }]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open workout ${workout.name}`}
                                    >
                                        <ChevronRight color={WHITE} size={20} />
                                    </Pressable>
                                </View>

                                <Text style={styles.exerciseCount}>{workout.exercises.length} exercises</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* View Full Program */}
                <Pressable
                    style={({ pressed }) => [styles.viewFullProgramBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push('/program-overview')}
                    accessibilityRole="button"
                >
                    <LayoutList color={PRIMARY_COLOR} size={18} />
                    <Text style={styles.viewFullProgramText}>View Full Program</Text>
                    <ChevronRight color={PLACEHOLDER_TEXT} size={18} style={{ marginLeft: 'auto' }} />
                </Pressable>

                {/* Create Program */}
                <View style={styles.ctaCard}>
                    <Link href="/create-program" asChild>
                        <Pressable style={({ pressed }) => [styles.ctaCard, pressed && { opacity: 0.9 }]}>
                            <View style={styles.ctaLeft}>
                                <View style={styles.ctaIcon}>
                                    <Plus color={WHITE} size={20} />
                                </View>
                                <Text style={styles.ctaText}>Create Custom Program</Text>
                                <ChevronRight color={PLACEHOLDER_TEXT} size={20} />
                            </View>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>

            {/* Workout Template Modal */}
            {!!selectedWorkoutObj && (
                <Modal transparent animationType="slide" onRequestClose={() => setSelectedWorkout(null)}>
                    <WorkoutTemplateModal
                        workout={selectedWorkoutObj}
                        program={program}
                        onSwapExercise={swapExercise}
                        onClose={() => setSelectedWorkout(null)}
                    />
                </Modal>
            )}

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
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
        color: WHITE,
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtitle: {
        color: TEXT_COLOR,
        fontSize: 13,
    },
    summaryCard: {
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    summaryTitle: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
    },
    summaryMeta: {
        color: TEXT_COLOR,
        fontSize: 13,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },

    menuCard: {
        backgroundColor: SURFACE_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 18,
    },
    menuItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    menuItemPressed: {
        backgroundColor: MUTED_BG,
    },
    menuItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuText: {
        color: WHITE,
        fontSize: 14,
    },
    menuDivider: {
        height: 1,
        backgroundColor: BORDER_COLOR,
    },

    section: {
        marginBottom: 18,
    },
    sectionTitle: {
        color: WHITE,
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
        color: TEXT_COLOR,
        fontSize: 13,
    },

    progressTrack: {
        height: 8,
        backgroundColor: MUTED_BG,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: PRIMARY_COLOR,
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
        color: PLACEHOLDER_TEXT,
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
        backgroundColor: PRIMARY_COLOR,
    },
    dayBoxInactive: {
        backgroundColor: MUTED_BG,
    },
    dayBoxText: {
        fontSize: 12,
        fontWeight: '600',
    },

    workoutCard: {
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
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
        backgroundColor: PRIMARY_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    workoutIndexText: {
        color: WHITE,
        fontWeight: '700',
        fontSize: 14,
    },
    workoutName: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    workoutMeta: {
        color: TEXT_COLOR,
        fontSize: 13,
    },
    chevronButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: MUTED_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseCount: {
        color: TEXT_COLOR,
        fontSize: 13,
    },

    ctaCard: {
        marginTop: 8,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
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
        backgroundColor: PRIMARY_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaText: {
        color: WHITE,
        fontSize: 15,
        fontWeight: '600',
    },
    viewFullProgramBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 16,
        marginBottom: 4,
    },
    viewFullProgramText: {
        color: WHITE,
        fontSize: 15,
        fontWeight: '600',
    },
});