import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Archive } from 'lucide-react-native';

import { supabase } from '@/utils/supabase';
import {
    BACKGROUND_COLOR_DARK,
    BORDER_COLOR,
    CARD_BG,
    PLACEHOLDER_TEXT,
    TEXT_COLOR,
    WHITE,
} from '@/constants/colors';

type ArchivedProgram = {
    id: string;
    name: string;
    goal: string | null;
    duration_weeks: number;
    start_date: string | null;
    created_at: string;
    updated_at: string;
};

function formatDate(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
}

export default function ArchivedProgramsScreen() {
    const router = useRouter();
    const [programs, setPrograms] = useState<ArchivedProgram[]>([]);
    const [loading, setLoading] = useState(true);

    const loadArchivedPrograms = useCallback(async () => {
        try {
            setLoading(true);

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
                .select('id,name,goal,duration_weeks,start_date,created_at,updated_at')
                .eq('user_id', user.id)
                .eq('is_active', false)
                .order('updated_at', { ascending: false })
                .returns<ArchivedProgram[]>();

            if (error) throw error;
            setPrograms(data ?? []);
        } catch (e) {
            console.error('loadArchivedPrograms error', e);
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadArchivedPrograms();
    }, [loadArchivedPrograms]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }]}
                    >
                        <ChevronLeft size={20} color={WHITE} />
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
                        <ActivityIndicator color={WHITE} />
                        <Text style={styles.emptyText}>Loading archived programs...</Text>
                    </View>
                ) : programs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Archive size={22} color={PLACEHOLDER_TEXT} />
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
                                    <Text style={styles.metaLabel}>Ended</Text>
                                    <Text style={styles.metaValue}>{formatDate(program.updated_at)}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
    },
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
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
        borderColor: BORDER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CARD_BG,
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '800',
        color: WHITE,
    },
    refreshButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        backgroundColor: CARD_BG,
    },
    refreshText: {
        color: WHITE,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 30,
    },
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        padding: 14,
        marginBottom: 12,
    },
    cardTitle: {
        color: WHITE,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardGoal: {
        color: TEXT_COLOR,
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
        color: PLACEHOLDER_TEXT,
        fontSize: 13,
    },
    metaValue: {
        color: WHITE,
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        color: WHITE,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 4,
    },
    emptyText: {
        color: PLACEHOLDER_TEXT,
        fontSize: 14,
        textAlign: 'center',
    },
});
