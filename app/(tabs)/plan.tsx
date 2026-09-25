import { visibleProgramExercises } from '@/features/workouts/visibleProgramExercises';
import { AppAlert as Alert } from '@/components/ui/AppDialog';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable, Modal, Platform } from 'react-native';
import { Plus, ChevronRight, MoreVertical, LayoutList, Archive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentProgram } from '@/hooks/useCurrentProgram';
import { useProgramSchedule } from '@/hooks/useProgramSchedule';
import {
    canStartUndatedWorkout, createScheduleRepository, scheduleCapabilityMissing,
    scheduleWriterEnabled, scheduledOutcomeLabel, type ScheduledDay,
} from '@/features/scheduling/repository';
import { createScheduleCommand } from '@/features/scheduling/createSchedule';
import { scheduleOperationStore } from '@/features/scheduling/operationStore';
import { ProgramSchedulePlacement } from '@/components/ProgramSchedulePlacement';
import { supabase } from '@/utils/supabase';
import type { ProgramWorkout } from '@/types/program';
import { WorkoutTemplateModal } from '@/components/WorkoutTemplateModal';
import { GenerateProgramModal } from '@/components/GenerateProgramModal';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { workoutRouteParams } from '@/features/workouts/routeResolution';
import { createCompletedNavigation } from '@/features/workouts/effectiveOccurrence';
import { reportSupabaseFailure, supabaseSaveFailureMessage } from '@/utils/supabaseResilience';

const scheduleCommand = createScheduleCommand(createScheduleRepository(supabase), scheduleOperationStore);

function placementLabel(workout: ProgramWorkout, days: ScheduledDay[]): string {
    const day = days.find((item) => item.stableDayId === workout.stableDayId && item.programDayId === workout.id);
    if (!day) return 'No confirmed placement for this program day';
    return day.localDate
        ? `${day.localDate} · ${day.kind} · ${day.status}`
        : `${day.kind} · ${day.status} (no date)`;
}

function scheduledWorkoutTarget(workout: ProgramWorkout, days: ScheduledDay[]): ScheduledDay | null {
    const matches = days.filter((day) => day.programDayId === workout.id && day.kind === 'workout'
        && (day.status === 'planned' || day.status === 'in_progress'));
    return matches.length === 1 ? matches[0] : null;
}

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
                <Text style={{ color: theme.white, fontWeight: '700' }}>{busy ? 'Working…' : 'Create Program'}</Text>
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
                    <Archive size={16} color={theme.white} />
                    <Text style={{ color: theme.white, fontWeight: '700' }}>Archived Programs</Text>
                </View>
            </Pressable>
        </View>
    );
}

export default function PlanScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
    const [pendingEdit] = useState(createCompletedNavigation);
    const navigateAfterDismiss = useCallback(() => {
        const sessionId = pendingEdit.dismiss();
        if (sessionId) router.push({ pathname: '/edit-workout', params: { sessionId } });
    }, [pendingEdit]);
    useEffect(() => {
        if (Platform.OS === 'ios' || selectedWorkout || !pendingEdit.pending()) return;
        const frame = requestAnimationFrame(navigateAfterDismiss);
        return () => cancelAnimationFrame(frame);
    }, [selectedWorkout, navigateAfterDismiss, pendingEdit]);
    const [showMenu, setShowMenu] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);
    const [retryingSchedule, setRetryingSchedule] = useState(false);
    const [scheduleIssue, setScheduleIssue] = useState<string | null>(null);

    const {
        program,
        ownerId,
        loading,
        refreshing,
        unavailable,
        availabilityMessage,
        refresh,
        swapExercise,
        endCurrentProgram,
    } = useCurrentProgram();
    const schedule = useProgramSchedule(ownerId, program?.id ?? null);
    const refreshSchedule = schedule.refresh;
    const scheduledDays = schedule.read?.state === 'ready' ? schedule.read.days : null;

    const retrySchedule = useCallback(async () => {
        if (!ownerId || !program || retryingSchedule || !scheduleWriterEnabled) return;
        setRetryingSchedule(true);
        try {
            const outcome = await scheduleCommand.retry(ownerId, program.id);
            if (outcome.status === 'created' || outcome.status === 'replayed') {
                setScheduleIssue(null);
                await schedule.refresh();
                await refresh();
            } else if ('message' in outcome) {
                setScheduleIssue(outcome.message);
            }
        } catch (error) {
            reportSupabaseFailure('schedule.retry', error);
            setScheduleIssue('Saved schedule request could not be reconciled. Try again when connected.');
        } finally {
            setRetryingSchedule(false);
        }
    }, [ownerId, program, retryingSchedule, schedule, refresh]);
    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
    useFocusEffect(useCallback(() => { void refreshSchedule(); }, [refreshSchedule]));

    const completedCount = program?.workouts.filter((w) => w.isCompleted).length ?? 0;
    const partialCount = program?.workouts.filter(w => w.isFinalized && !w.isCompleted).length ?? 0;
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
                <View style={[styles.section, { backgroundColor: theme.mutedBg, borderRadius: 14, padding: 14 }]}>
                    <Text style={{ color: theme.text, lineHeight: 20 }}>
                        {!schedule.today ? 'Checking dated placement…'
                            : schedule.today.state === 'workout'
                                ? `Placed workout on ${schedule.today.localDate}. Start it here or from Today; Finish will preserve this occurrence.`
                                : schedule.today.state === 'rest'
                                    ? `Rest day on ${schedule.today.localDate}.`
                                    : schedule.today.state === 'fulfilled'
                                        ? `${scheduledOutcomeLabel(schedule.today.day)} on ${schedule.today.localDate}.`
                                        : 'message' in schedule.today ? schedule.today.message : 'Dated schedule unavailable.'}
                    </Text>
                </View>
                {schedule.pending ? (
                    <View style={[styles.section, { backgroundColor: theme.mutedBg, borderRadius: 14, padding: 14 }]}>
                        <Text style={{ color: theme.text }}>
                            A dated placement request is saved for this account. Its exact dates and operation ID must be reconciled before another placement.
                        </Text>
                        {scheduleIssue ? <Text style={{ color: theme.errorLight }}>{scheduleIssue}</Text> : null}
                        {!scheduleWriterEnabled ? <Text style={{ color: theme.text }}>
                            Retry is unavailable until schedule support is enabled in this build and server.
                        </Text> : null}
                        <Pressable accessibilityRole="button" accessibilityState={{ disabled: retryingSchedule || !scheduleWriterEnabled }}
                            disabled={retryingSchedule || !scheduleWriterEnabled} onPress={() => void retrySchedule()}
                            style={{ minHeight: 44, justifyContent: 'center' }}>
                            <Text style={{ color: scheduleWriterEnabled ? theme.primaryLight : theme.placeholder }}>
                                {retryingSchedule ? 'Reconciling…' : 'Retry the exact saved placement'}
                            </Text>
                        </Pressable>
                    </View>
                ) : (schedule.read?.state === 'unplaced' || scheduleCapabilityMissing(schedule.read)) && ownerId && program.currentRevisionId ? (
                    <ProgramSchedulePlacement
                        key={`${ownerId}/${program.id}/${program.currentRevisionId}`}
                        ownerId={ownerId}
                        programId={program.id}
                        revisionId={program.currentRevisionId}
                        scheduleConfirmedAbsent={schedule.read?.state === 'unplaced'}
                        onAccepted={() => { void schedule.refresh(); void refresh(); }}
                        onRecoveryNeeded={() => { void schedule.refresh(); }}
                    />
                ) : null}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>This Week&apos;s Workouts</Text>

                    {/* Weekly Progress */}
                    <View style={styles.section}>

                        <View style={styles.summaryCard}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.summaryTitle}>Week {program.currentWeek}</Text>
                                <Text style={styles.summaryMeta}>
                                    {completedCount}/{totalCount} complete · {partialCount} partial
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
                                            {scheduledDays ? (
                                                <Text style={styles.workoutMeta}>
                                                    {placementLabel(workout, scheduledDays)}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    <Pressable
                                        onPress={() => { pendingEdit.reset(); setSelectedWorkout(workout.id); }}
                                        style={({ pressed }) => [styles.chevronButton, pressed && { opacity: 0.85 }]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open workout ${workout.name}`}
                                    >
                                        <ChevronRight color={theme.textPrimary} size={20} />
                                    </Pressable>
                                </View>

                                <Text style={styles.exerciseCount}>{visibleProgramExercises(workout.exercises).length} exercises</Text>
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

            {/* Workout Template Modal */}
                <Modal visible={!!selectedWorkoutObj} transparent animationType={Platform.OS === 'ios' ? 'slide' : 'none'} onDismiss={navigateAfterDismiss} onRequestClose={() => setSelectedWorkout(null)}>
                    {selectedWorkoutObj ? <WorkoutTemplateModal
                        workout={selectedWorkoutObj}
                        program={program}
                        onSwapExercise={swapExercise}
                        onClose={() => setSelectedWorkout(null)}
                        onStart={() => {
                            if (selectedWorkoutObj.sessionId) {
                                if (pendingEdit.request(selectedWorkoutObj.sessionId)) setSelectedWorkout(null);
                                return;
                            }
                            const scheduledDay = schedule.read?.state === 'ready'
                                ? scheduledWorkoutTarget(selectedWorkoutObj, schedule.read.days) : null;
                            if (schedule.read?.state === 'ready' && !scheduledDay) {
                                Alert.alert('Workout start unavailable', 'This workout has no active dated placement. Refresh or revise the schedule before starting it.');
                                return;
                            }
                            if (!scheduledDay && !canStartUndatedWorkout(schedule.read, schedule.pending)) {
                                Alert.alert('Workout start unavailable', 'Dated placement cannot be confirmed. Your workout and draft have not been changed.');
                                return;
                            }
                            setSelectedWorkout(null);
                            const expectedScheduleRevision = schedule.read?.state === 'ready'
                                ? schedule.read.revision : undefined;
                            router.push({ pathname: '/next-workout', params: {
                                ...workoutRouteParams(program, selectedWorkoutObj),
                                ...(scheduledDay ? { scheduleOccurrenceId: scheduledDay.id,
                                    expectedScheduleRevision: String(expectedScheduleRevision) } : {}),
                            } });
                        }}
                    /> : null}
                </Modal>

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
