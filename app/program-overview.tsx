import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { useCurrentProgram } from '@/hooks/useCurrentProgram';
import { supabase } from '@/utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewExercise {
  pdeId: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  targetRpe: number | null;
  weightLb: number | null;
}

interface OverviewDay {
  id: string;
  name: string;
  dayIndex: number;
  exercises: OverviewExercise[];
}

interface OverviewWeek {
  weekNumber: number;
  days: OverviewDay[];
}

interface ProgramRationale {
  label: string;
  detail: string;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchProgramOverview(programId: string, revisionId?: string): Promise<OverviewWeek[]> {
  let query = supabase
    .from('program_days')
    .select(`
      id,
      week_number,
      day_index,
      workout_name,
      program_day_exercises!program_day_exercises_program_day_id_fkey (
        id,
        position,
        set_count,
        rep_range_min,
        rep_range_max,
        target_rpe,
        suggested_weight_lb,
        exercises!program_day_exercises_exercise_id_fkey ( id, name )
      )
    `)
    .eq('program_id', programId);
  if (revisionId) query = query.eq('program_revision_id', revisionId);
  const { data, error } = await query
    .order('week_number', { ascending: true })
    .order('day_index', { ascending: true });

  if (error || !data) return [];

  const weekMap = new Map<number, OverviewDay[]>();

  for (const day of data as any[]) {
    const weekNum: number = day.week_number;
    if (!weekMap.has(weekNum)) weekMap.set(weekNum, []);

    const exercises: OverviewExercise[] = ((day.program_day_exercises ?? []) as any[])
      .slice()
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map((pde: any) => ({
        pdeId: pde.id,
        name: pde.exercises?.name ?? 'Unknown exercise',
        sets: pde.set_count ?? 3,
        repMin: pde.rep_range_min ?? 8,
        repMax: pde.rep_range_max ?? 12,
        targetRpe: pde.target_rpe != null ? Number(pde.target_rpe) : null,
        weightLb: pde.suggested_weight_lb != null ? Number(pde.suggested_weight_lb) : null,
      }));

    weekMap.get(weekNum)!.push({
      id: day.id,
      name: day.workout_name ?? `Day ${day.day_index}`,
      dayIndex: day.day_index ?? 1,
      exercises,
    });
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, days]) => ({ weekNumber, days }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExerciseRow({ ex, styles }: { ex: OverviewExercise; styles: ReturnType<typeof createStyles> }) {
  const prescription =
    ex.repMin === ex.repMax
      ? `${ex.sets}×${ex.repMin}`
      : `${ex.sets}×${ex.repMin}–${ex.repMax}`;
  const rpe = ex.targetRpe != null ? ` @ RPE ${ex.targetRpe}` : '';
  const weight = ex.weightLb != null ? `${ex.weightLb} lb` : null;

  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseLeft}>
        <Text style={styles.exerciseName}>{ex.name}</Text>
        <Text style={styles.exercisePrescription}>
          {prescription}
          {rpe}
        </Text>
      </View>
      {weight != null && (
        <View style={styles.weightBadge}>
          <Text style={styles.weightText}>{weight}</Text>
        </View>
      )}
    </View>
  );
}

function DayCard({
  day,
  expanded,
  onToggle,
  styles,
  theme,
}: {
  day: OverviewDay;
  expanded: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <View style={styles.dayCard}>
      <Pressable
        style={({ pressed }) => [styles.dayHeader, pressed && { opacity: 0.8 }]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${day.name}`}
      >
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayName}>{day.name}</Text>
          <Text style={styles.dayMeta}>{day.exercises.length} exercises</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.placeholder}
        />
      </Pressable>

      {expanded && (
        <View style={styles.exerciseList}>
          {day.exercises.map((ex) => (
            <ExerciseRow key={ex.pdeId} ex={ex} styles={styles} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProgramOverviewScreen() {
  const insets = useSafeAreaInsets();
  const { program } = useCurrentProgram();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [isDark, theme]);

  const [weeks, setWeeks] = useState<OverviewWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [rationale, setRationale] = useState<ProgramRationale>({
    label: 'Rationale unknown',
    detail: 'This legacy program has no persisted generation context. No explanation has been fabricated.',
  });

  useEffect(() => {
    if (!program) return;
    let contextQuery = supabase
      .from('program_generation_context')
      .select('goal,policy_version,experience_level,session_length_target_min')
      .eq('program_id', program.id);
    contextQuery = program.currentRevisionId
      ? contextQuery.eq('program_revision_id', program.currentRevisionId)
      : contextQuery.is('program_revision_id', null);
    Promise.all([
      fetchProgramOverview(program.id, program.currentRevisionId),
      contextQuery.maybeSingle(),
    ]).then(([data, contextResult]) => {
      setWeeks(data);
      const context = contextResult.data as {
        goal?: string;
        policy_version?: string;
        experience_level?: string;
        session_length_target_min?: number | null;
      } | null;
      if (context) {
        setRationale({
          label: 'Persisted program context',
          detail: [
            context.goal ? `Goal: ${context.goal}` : null,
            context.experience_level ? `Experience: ${context.experience_level}` : null,
            context.session_length_target_min ? `Session target: ${context.session_length_target_min} min` : null,
            context.policy_version ? `Policy: ${context.policy_version}` : null,
          ].filter(Boolean).join(' · '),
        });
      }
      setExpandedWeeks(new Set([program.currentWeek]));
      setLoading(false);
    });
  }, [program]);

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{program?.name ?? 'Program'}</Text>
          {program && (
            <Text style={styles.headerMeta}>
              {program.totalWeeks} weeks · {program.daysPerWeek} days/week
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.stateText}>Loading program…</Text>
        </View>
      ) : weeks.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>No program data found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rationaleCard} accessibilityLabel={`${rationale.label}. ${rationale.detail}`}>
            <Text style={styles.rationaleTitle}>{rationale.label}</Text>
            <Text style={styles.rationaleText}>{rationale.detail}</Text>
          </View>
          {weeks.map((week) => {
            const isCurrent = program?.currentWeek === week.weekNumber;
            const isPast = (program?.currentWeek ?? 0) > week.weekNumber;
            const isExpanded = expandedWeeks.has(week.weekNumber);
            const isDeload = week.days.some((d) => d.name.includes('(Deload)'));

            return (
              <View key={week.weekNumber} style={styles.weekSection}>
                {/* Week header row */}
                <Pressable
                  style={({ pressed }) => [
                    styles.weekHeader,
                    isCurrent && styles.weekHeaderCurrent,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => toggleWeek(week.weekNumber)}
                  accessibilityRole="button"
                >
                  <View style={styles.weekHeaderLeft}>
                    <Text
                      style={[
                        styles.weekTitle,
                        isPast && !isCurrent && styles.weekTitleMuted,
                      ]}
                    >
                      Week {week.weekNumber}
                    </Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                    {isDeload && (
                      <View style={styles.deloadBadge}>
                        <Text style={styles.deloadBadgeText}>Deload</Text>
                      </View>
                    )}
                    <Text style={[styles.weekDayCount, isCurrent && styles.weekDayCountCurrent]}>
                      {week.days.length} workout{week.days.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={isCurrent ? theme.textPrimary : theme.placeholder}
                  />
                </Pressable>

                {/* Day cards inside expanded week */}
                {isExpanded && (
                  <View style={styles.daysContainer}>
                    {week.days.map((day) => (
                      <DayCard
                        key={day.id}
                        day={day}
                        expanded={expandedDays.has(day.id)}
                        onToggle={() => toggleDay(day.id)}
                        styles={styles}
                        theme={theme}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.surfaceBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.mutedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    headerMeta: {
      color: theme.placeholder,
      fontSize: 13,
      marginTop: 2,
    },

    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    stateText: {
      color: theme.text,
      fontSize: 14,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
      gap: 10,
    },
    rationaleCard: {
      backgroundColor: theme.cardBg,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
    },
    rationaleTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
    rationaleText: { color: theme.text, fontSize: 13, lineHeight: 19, marginTop: 4 },

    // Week accordion
    weekSection: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    weekHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.cardBg,
    },
    weekHeaderCurrent: {
      backgroundColor: theme.mutedBg,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.primary,
    },
    weekHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    weekTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    weekTitleMuted: {
      color: theme.placeholder,
    },
    weekDayCount: {
      color: theme.placeholder,
      fontSize: 13,
    },
    weekDayCountCurrent: {
      color: theme.text,
    },
    currentBadge: {
      backgroundColor: theme.textPrimary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    currentBadgeText: {
      color: theme.surfaceBg,
      fontSize: 11,
      fontWeight: '700',
    },
    deloadBadge: {
      backgroundColor: isDark ? '#3a2504' : '#fef3c7',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: isDark ? '#fbbf24' : '#b45309',
    },
    deloadBadgeText: {
      color: isDark ? '#fde68a' : '#92400e',
      fontSize: 11,
      fontWeight: '700',
    },

    // Day cards
    daysContainer: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.backgroundDark,
      gap: 8,
    },
    dayCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dayHeaderLeft: {
      flex: 1,
    },
    dayName: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    dayMeta: {
      color: theme.placeholder,
      fontSize: 12,
    },

    // Exercise rows
    exerciseList: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 2,
    },
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: theme.border + '66',
    },
    exerciseLeft: {
      flex: 1,
      paddingRight: 8,
    },
    exerciseName: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 2,
    },
    exercisePrescription: {
      color: theme.text,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    weightBadge: {
      backgroundColor: theme.mutedBg,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    weightText: {
      color: theme.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
  });
}
