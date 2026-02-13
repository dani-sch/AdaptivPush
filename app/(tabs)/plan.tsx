import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Link } from 'expo-router';
import { Plus, ChevronRight, MoreVertical } from 'lucide-react-native';

import { useCurrentProgram } from '@/hooks/useCurrentProgram';
import { WorkoutTemplateModal } from '@/components/WorkoutTemplateModal';

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

// Temporary placeholder components (replace with yours)
function LoadingState() {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: TEXT_COLOR }}>Loading program...</Text>
        </View>
    );
}
function EmptyState() {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <Text style={{ color: TEXT_COLOR, textAlign: 'center' }}>
                No current program yet. Create one to get started.
            </Text>
        </View>
    );
}

export default function PlanScreen() {
    const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);

    const { program, loading, swapExercise } = useCurrentProgram();

    const daysOfWeek = useMemo(() => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], []);

    const progressPct = useMemo(() => {
        if (!program) return 0;
        const pct = (program.currentWeek / program.totalWeeks) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [program]);

    if (loading) return <LoadingState />;
    if (!program) return <EmptyState />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                        <Link href="/program/create" asChild>
                            <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                                <Text style={styles.menuText}>Create Custom Program</Text>
                            </Pressable>
                        </Link>

                        <View style={styles.menuDivider} />

                        <Pressable
                            onPress={() => setShowMenu(false)}
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
                    <Text style={styles.sectionTitle}>This Week's Workouts</Text>

                    {/* Day Headers */}
                    <View style={styles.weekRow}>
                        {daysOfWeek.map((day) => (
                            <View key={day} style={styles.weekCell}>
                                <Text style={styles.weekHeaderText}>{day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Day Indicators */}
                    <View style={[styles.weekRow, { marginTop: 10 }]}>
                        {daysOfWeek.map((day, idx) => {
                            const hasWorkout = idx < program.daysPerWeek;
                            return (
                                <View key={day} style={styles.weekCell}>
                                    <View style={[styles.dayBox, hasWorkout ? styles.dayBoxActive : styles.dayBoxInactive]}>
                                        <Text style={[styles.dayBoxText, hasWorkout ? { color: WHITE } : { color: PLACEHOLDER_TEXT }]}>
                                            {idx + 1}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
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
                                                {workout.day} • {workout.estimatedTime} min
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

                {/* Create Program CTA */}
                <Link href="/program/create" asChild>
                    <Pressable style={({ pressed }) => [styles.ctaCard, pressed && { opacity: 0.9 }]}>
                        <View style={styles.ctaLeft}>
                            <View style={styles.ctaIcon}>
                                <Plus color={WHITE} size={20} />
                            </View>
                            <Text style={styles.ctaText}>Create Custom Program</Text>
                        </View>
                        <ChevronRight color={PLACEHOLDER_TEXT} size={20} />
                    </Pressable>
                </Link>
            </ScrollView>

            {/* Workout Template Modal */}
            {!!selectedWorkout && (
                <Modal transparent animationType="slide" onRequestClose={() => setSelectedWorkout(null)}>
                    <WorkoutTemplateModal
                        workout={selectedWorkoutObj}
                        program={program}
                        onSwapExercise={swapExercise}
                        onClose={() => setSelectedWorkout(null)}
                    />
                </Modal>
            )}
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
});
