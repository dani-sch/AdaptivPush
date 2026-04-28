import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import type { ExerciseHistoryEntry } from '@/types/program';
import { fetchExerciseHistory } from '@/utils/fetchExerciseHistory';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

interface ExerciseHistoryModalProps {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}

function formatSessionDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ExerciseHistoryModal({
  exerciseId,
  exerciseName,
  onClose,
}: ExerciseHistoryModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [entries, setEntries] = useState<ExerciseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExerciseHistory(exerciseId).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, [exerciseId]);

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Exercise History</Text>
            <Text style={styles.headerSubtitle}>{exerciseName}</Text>
          </View>

          <Pressable
            style={styles.iconBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close exercise history"
          >
            <X color={theme.white} size={18} />
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading skeleton */}
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={[styles.sessionCard, { opacity: 0.4 }]}>
                <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
                <View style={[styles.skeletonLine, { width: '100%', height: 10, marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '100%', height: 10, marginTop: 6 }]} />
                <View style={[styles.skeletonLine, { width: '100%', height: 10, marginTop: 6 }]} />
              </View>
            ))}

          {/* Empty state */}
          {!loading && entries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptySubtitle}>
                Log a workout with this exercise and your history will appear here.
              </Text>
            </View>
          )}

          {/* Session cards — entries[0] is newest */}
          {!loading &&
            entries.map((entry, idx) => {
              const trendLb =
                idx < entries.length - 1
                  ? entry.totalVolumeLb - entries[idx + 1].totalVolumeLb
                  : null;

              return (
                <View key={entry.sessionId} style={styles.sessionCard}>
                  <Text style={styles.sessionHeader}>
                    {formatSessionDate(entry.completedAt)}
                    {'  ·  '}
                    {entry.workoutName}
                  </Text>

                  {entry.sets.map((s) => (
                    <Text key={s.setNumber} style={styles.setRow}>
                      {`Set ${s.setNumber}`}
                      {'   '}
                      {s.weightLb !== null ? `${s.weightLb} lb × ` : ''}
                      {s.reps !== null ? `${s.reps} reps` : '—'}
                      {s.rpe !== null ? `   @ RPE ${s.rpe}` : ''}
                    </Text>
                  ))}

                  <View style={styles.volumeRow}>
                    <Text style={styles.volumeText}>
                      Total: {entry.totalVolumeLb.toLocaleString()} lb
                    </Text>

                    {trendLb !== null && (
                      <Text
                        style={[
                          styles.trendText,
                          { color: trendLb >= 0 ? theme.success : theme.errorLight },
                        ]}
                      >
                        {trendLb >= 0 ? '▲' : '▼'} {Math.abs(trendLb).toLocaleString()} lb
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
        </ScrollView>
      </View>
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
    listContent: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      paddingBottom: 32,
    },
    sessionCard: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    sessionHeader: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    setRow: {
      color: theme.text,
      fontSize: 13,
      marginBottom: 4,
      fontVariant: ['tabular-nums'],
    },
    volumeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
    },
    volumeText: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    trendText: {
      fontSize: 13,
      fontWeight: '600',
    },
    skeletonLine: {
      backgroundColor: theme.mutedBg,
      borderRadius: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyIcon: {
      fontSize: 40,
      textAlign: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtitle: {
      color: theme.text,
      fontSize: 13,
      textAlign: 'center',
    },
    _sectionLabel: {
      color: theme.placeholder,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 10,
    },
  });
}
