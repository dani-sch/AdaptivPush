import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Archive } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/utils/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { restoreProgram } from '@/features/programs/commands';
import { programRepository } from '@/features/programs/repository';

type ArchivedProgram = {
    id: string;
    name: string;
    goal: string | null;
    duration_weeks: number;
    start_date: string | null;
    created_at: string;
    updated_at: string;
    last_active_week: number | null;
    current_revision: number;
    archive_checkpoint_provenance: 'exact_revision' | 'legacy_approximate' | null;
};

function formatDate(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
}

export default function ArchivedProgramsScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [programs, setPrograms] = useState<ArchivedProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadArchivedPrograms = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);

            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) throw authError;
            if (!user) {
                setPrograms([]);
                return;
            }

            const { data, error } = await supabase
                .from('programs')
                .select('id,name,goal,duration_weeks,start_date,created_at,updated_at,last_active_week,current_revision,archive_checkpoint_provenance')
                .eq('user_id', user.id)
                .eq('is_active', false)
                .order('updated_at', { ascending: false })
                .returns<ArchivedProgram[]>();

            if (error) throw error;
            setPrograms(data ?? []);
        } catch (e) {
            console.error('loadArchivedPrograms error', e);
            setPrograms([]);
            setLoadError('Archived programs are unavailable. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadArchivedPrograms();
        }, [loadArchivedPrograms]),
    );

    const unarchiveProgram = async (
        programId: string,
        mode: 'exact' | 'restart' | 'legacy_approximate',
    ) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: active, error: activeError } = await supabase
                .from('programs')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle<{ id: string }>();
            if (activeError) throw activeError;
            await restoreProgram(programRepository, programId, mode, active?.id ?? null);

            await loadArchivedPrograms();
            router.back();
        } catch (e) {
            console.error('unarchiveProgram error', e);
            Alert.alert(
                'Could not restore program',
                e instanceof Error ? e.message : 'The program was not changed. Please try again.',
            );
        }
    };

    const handleUnarchive = (prog: ArchivedProgram) => {
        const hasExactCheckpoint = prog.archive_checkpoint_provenance === 'exact_revision';
        const hasLegacyApproximation = prog.archive_checkpoint_provenance === 'legacy_approximate';
        Alert.alert(
            `Restore "${prog.name}"?`,
            hasLegacyApproximation
                ? 'The saved legacy week is approximate. Restoring it will not invent an exact historical date.'
                : 'This will make it your active program. Any currently running program will be archived.',
            [
                { text: 'Cancel', style: 'cancel' },
                ...(hasExactCheckpoint ? [{
                    text: 'Resume exact checkpoint',
                    onPress: () => unarchiveProgram(prog.id, 'exact'),
                }] : []),
                ...(hasLegacyApproximation ? [{
                    text: `Resume near week ${prog.last_active_week ?? 1}`,
                    onPress: () => unarchiveProgram(prog.id, 'legacy_approximate'),
                }] : []),
                {
                    text: 'Restart from Week 1',
                    onPress: () => unarchiveProgram(prog.id, 'restart'),
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }]}
                    >
                        <ChevronLeft size={20} color={theme.textPrimary} />
                    </Pressable>

                    <Text style={styles.title}>Archived Programs</Text>

                    <Pressable
                        onPress={loadArchivedPrograms}
                        style={({ pressed }) => [styles.refreshButton, pressed && { opacity: 0.8 }]}
                    >
                        <Text style={styles.refreshText}>Refresh</Text>
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator color={theme.textPrimary} />
                        <Text style={styles.emptyText}>Loading archived programs...</Text>
                    </View>
                ) : loadError ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>Archived programs unavailable</Text>
                        <Text style={styles.emptyText}>{loadError}</Text>
                        <Pressable onPress={loadArchivedPrograms} style={styles.refreshButton}>
                            <Text style={styles.refreshText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : programs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Archive size={22} color={theme.placeholder} />
                        <Text style={styles.emptyTitle}>No archived programs yet</Text>
                        <Text style={styles.emptyText}>Programs you end will show up here.</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        {programs.map((program) => (
                            <View key={program.id} style={styles.card}>
                                <Text style={styles.cardTitle}>{program.name}</Text>
                                <Text style={styles.cardGoal}>{program.goal || 'No goal set'}</Text>

                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Duration</Text>
                                    <Text style={styles.metaValue}>{program.duration_weeks} weeks</Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Start Date</Text>
                                    <Text style={styles.metaValue}>{formatDate(program.start_date)}</Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Ended on</Text>
                                    <Text style={styles.metaValue}>{formatDate(program.updated_at)}</Text>
                                </View>
                                {program.last_active_week != null && (
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>Left off at</Text>
                                        <Text style={styles.metaValue}>Week {program.last_active_week}</Text>
                                    </View>
                                )}

                                <Pressable
                                    onPress={() => handleUnarchive(program)}
                                    style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.8 }]}
                                >
                                    <Text style={styles.restoreBtnText}>Restore Program</Text>
                                </Pressable>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
        },
        container: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
            paddingHorizontal: 16,
            paddingTop: 8,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
            gap: 10,
        },
        iconButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.cardBg,
        },
        title: {
            flex: 1,
            fontSize: 22,
            fontWeight: '800',
            color: theme.textPrimary,
        },
        refreshButton: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.cardBg,
        },
        refreshText: {
            color: theme.textPrimary,
            fontWeight: '600',
        },
        listContent: {
            paddingBottom: 30,
        },
        card: {
            backgroundColor: theme.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 12,
        },
        cardTitle: {
            color: theme.textPrimary,
            fontSize: 17,
            fontWeight: '700',
            marginBottom: 4,
        },
        cardGoal: {
            color: theme.text,
            fontSize: 14,
            marginBottom: 12,
        },
        metaRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 4,
        },
        metaLabel: {
            color: theme.placeholder,
            fontSize: 13,
        },
        metaValue: {
            color: theme.textPrimary,
            fontSize: 13,
            fontWeight: '600',
        },
        restoreBtn: {
            marginTop: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.cardBg,
            paddingVertical: 10,
            alignItems: 'center',
        },
        restoreBtnText: {
            color: theme.textPrimary,
            fontSize: 14,
            fontWeight: '700',
        },
        emptyState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 24,
        },
        emptyTitle: {
            color: theme.textPrimary,
            fontSize: 18,
            fontWeight: '700',
            marginTop: 4,
        },
        emptyText: {
            color: theme.placeholder,
            fontSize: 14,
            textAlign: 'center',
        },
    });
}
