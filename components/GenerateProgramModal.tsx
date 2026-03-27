import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { generateProgram } from '@/utils/programGenerator';
import { saveProgramToDb } from '@/utils/saveProgramToDb';
import type { ProgramGenParams, TrainingGoal, MuscleGroup } from '@/types/program';
import type { TrainingExperience } from '@/types/database';
import {
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  SURFACE_BG,
  MUTED_BG,
  BORDER_COLOR,
  TEXT_COLOR,
  PLACEHOLDER_TEXT,
  WHITE,
} from '@/constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DURATIONS = [4, 6, 8, 10, 12, 16] as const;

const GOAL_LABELS: Record<TrainingGoal, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Endurance',
  fat_loss: 'Fat Loss',
  general_fitness: 'General Fitness',
};

const GOALS = Object.keys(GOAL_LABELS) as TrainingGoal[];

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Glutes',
  'Core',
  'Full Body',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface GenerateProgramModalProps {
  visible: boolean;
  onClose: () => void;
  onProgramCreated: () => void;
  defaultParams?: Partial<ProgramGenParams>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerateProgramModal({
  visible,
  onClose,
  onProgramCreated,
  defaultParams,
}: GenerateProgramModalProps) {
  const [daysPerWeek, setDaysPerWeek] = useState(defaultParams?.daysPerWeek ?? 3);
  const [durationWeeks, setDurationWeeks] = useState(defaultParams?.durationWeeks ?? 8);
  const [goal, setGoal] = useState<TrainingGoal>(defaultParams?.goal ?? 'general_fitness');
  const [focusMuscles, setFocusMuscles] = useState<MuscleGroup[]>(
    defaultParams?.focusMuscleGroups ?? [],
  );
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleMuscle = (m: MuscleGroup) => {
    setFocusMuscles(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m],
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: profile } = await supabase
        .from('user_profile')
        .select('weight_lb, experience_level')
        .eq('user_id', user.id)
        .single();

      const weightLb = profile?.weight_lb ?? 150;
      const experience = (profile?.experience_level ?? 'beginner') as TrainingExperience;

      const params: ProgramGenParams = {
        daysPerWeek,
        durationWeeks,
        goal,
        focusMuscleGroups: focusMuscles,
      };

      const generated = generateProgram(params, weightLb, experience);
      await saveProgramToDb(user.id, params, generated);

      onProgramCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Could not generate program', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.backdrop}>
      {/* Dismiss tappable backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onClose} />

      <View style={styles.sheet}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Generate Your Program</Text>
            <Text style={styles.headerSubtitle}>Build a custom plan based on your goals</Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={loading ? undefined : onClose}
            accessibilityLabel="Close modal"
          >
            <X color={WHITE} size={18} />
          </Pressable>
        </View>

        {/* ── Scrollable Body ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Days per week */}
          <Text style={styles.sectionLabel}>DAYS PER WEEK</Text>
          <View style={styles.dayRow}>
            {DAYS.map(day => {
              const active = daysPerWeek === day;
              return (
                <Pressable
                  key={day}
                  onPress={() => setDaysPerWeek(day)}
                  accessibilityLabel={`${day} day${day > 1 ? 's' : ''} per week`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.dayCircle,
                    active
                      ? { backgroundColor: PRIMARY_COLOR }
                      : { backgroundColor: MUTED_BG, borderWidth: 1, borderColor: BORDER_COLOR },
                  ]}
                >
                  <Text style={[styles.dayCircleText, { color: active ? WHITE : TEXT_COLOR }]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Program duration */}
          <Text style={styles.sectionLabel}>PROGRAM LENGTH</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationRow}
          >
            {DURATIONS.map(weeks => {
              const active = durationWeeks === weeks;
              return (
                <Pressable
                  key={weeks}
                  onPress={() => setDurationWeeks(weeks)}
                  accessibilityLabel={`${weeks} weeks`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.durationPill,
                    active
                      ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                      : { backgroundColor: 'transparent', borderColor: BORDER_COLOR },
                  ]}
                >
                  <Text style={[styles.durationPillText, { color: active ? WHITE : TEXT_COLOR }]}>
                    {weeks} wk
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Training goal */}
          <Text style={styles.sectionLabel}>TRAINING GOAL</Text>
          <View style={styles.chipWrap}>
            {GOALS.map(g => {
              const active = goal === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  accessibilityLabel={GOAL_LABELS[g]}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                      : { backgroundColor: 'transparent', borderColor: BORDER_COLOR },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? WHITE : TEXT_COLOR }]}>
                    {GOAL_LABELS[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Focus muscle groups */}
          <Text style={styles.sectionLabel}>FOCUS MUSCLE GROUPS (OPTIONAL)</Text>
          <View style={styles.chipWrap}>
            {MUSCLE_GROUPS.map(m => {
              const active = focusMuscles.includes(m);
              return (
                <Pressable
                  key={m}
                  onPress={() => toggleMuscle(m)}
                  accessibilityLabel={m}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: SECONDARY_COLOR, borderColor: SECONDARY_COLOR }
                      : { backgroundColor: 'transparent', borderColor: BORDER_COLOR },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? WHITE : TEXT_COLOR }]}>
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleGenerate}
            disabled={loading}
            accessibilityLabel={loading ? 'Generating program' : 'Generate My Program'}
            style={({ pressed }) => [
              styles.generateBtn,
              loading && { opacity: 0.6 },
              pressed && !loading && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.generateBtnText}>
              {loading ? 'Generating…' : 'Generate My Program'}
            </Text>
          </Pressable>

          <Pressable
            onPress={loading ? undefined : onClose}
            accessibilityLabel="Skip for now"
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },

  // Sheet
  sheet: {
    backgroundColor: SURFACE_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    height: '88%',
  },

  // Header
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_COLOR,
    marginRight: 2,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: TEXT_COLOR,
    fontSize: 13,
    marginTop: 2,
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

  // Scroll body
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  // Section label
  sectionLabel: {
    color: PLACEHOLDER_TEXT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },

  // Day circles
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Duration pills
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  durationPill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  durationPillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Goal / muscle chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 4,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    gap: 10,
  },
  generateBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    backgroundColor: MUTED_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
});
