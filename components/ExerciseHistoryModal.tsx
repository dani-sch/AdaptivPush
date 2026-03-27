import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import type { ExerciseHistoryEntry } from '@/types/program';
import { fetchExerciseHistory } from '@/utils/fetchExerciseHistory';

import {
  BORDER_COLOR,
  CARD_BG,
  ERROR_COLOR_LIGHT,
  MUTED_BG,
  PLACEHOLDER_TEXT,
  SUCCESS,
  SURFACE_BG,
  TEXT_COLOR,
  WHITE,
} from '@/constants/colors';

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
      {/* Tap-outside-to-close backdrop */}
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
            <X color={WHITE} size={18} />
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
                  {/* Date · Workout name */}
                  <Text style={styles.sessionHeader}>
                    {formatSessionDate(entry.completedAt)}
                    {'  ·  '}
                    {entry.workoutName}
                  </Text>

                  {/* Set rows */}
                  {entry.sets.map((s) => (
                    <Text key={s.setNumber} style={styles.setRow}>
                      {`Set ${s.setNumber}`}
                      {'   '}
                      {s.weightLb !== null ? `${s.weightLb} lb × ` : ''}
                      {s.reps !== null ? `${s.reps} reps` : '—'}
                      {s.rpe !== null ? `   @ RPE ${s.rpe}` : ''}
                    </Text>
                  ))}

                  {/* Volume + trend */}
                  <View style={styles.volumeRow}>
                    <Text style={styles.volumeText}>
                      Total: {entry.totalVolumeLb.toLocaleString()} lb
                    </Text>

                    {trendLb !== null && (
                      <Text
                        style={[
                          styles.trendText,
                          { color: trendLb >= 0 ? SUCCESS : ERROR_COLOR_LIGHT },
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

  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  sessionCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sessionHeader: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  setRow: {
    color: TEXT_COLOR,
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
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },

  skeletonLine: {
    backgroundColor: MUTED_BG,
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
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: TEXT_COLOR,
    fontSize: 13,
    textAlign: 'center',
  },

  // unused — referenced only for label alignment with spec
  _sectionLabel: {
    color: PLACEHOLDER_TEXT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
});
