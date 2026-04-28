import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { generateProgram } from '@/utils/programGenerator';
import { saveProgramToDb } from '@/utils/saveProgramToDb';
import { computeCyclePhase } from '@/utils/cyclePhase';
import type { ProgramGenParams, TrainingGoal, MuscleGroup, GeneratedProgram } from '@/types/program';
import type { TrainingExperience } from '@/types/database';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DURATIONS = [4, 6, 8, 10, 12, 16] as const;
const SESSION_LENGTHS: { label: string; value: number | null }[] = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90+ min', value: null },
];

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [daysPerWeek, setDaysPerWeek] = useState(defaultParams?.daysPerWeek ?? 3);
  const [durationWeeks, setDurationWeeks] = useState(defaultParams?.durationWeeks ?? 8);
  const [goal, setGoal] = useState<TrainingGoal>(defaultParams?.goal ?? 'general_fitness');
  const [focusMuscles, setFocusMuscles] = useState<MuscleGroup[]>(
    defaultParams?.focusMuscleGroups ?? [],
  );
  const [targetSessionMinutes, setTargetSessionMinutes] = useState<number | null>(60);
  const [swapIntervalWeeks, setSwapIntervalWeeks] = useState(defaultParams?.swapIntervalWeeks ?? 4);
  const [loading, setLoading] = useState(false);
  const [pendingProgram, setPendingProgram] = useState<GeneratedProgram | null>(null);
  const [customName, setCustomName] = useState('');

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
        .select('weight_lb, experience_level, cycle_enabled, last_period_start_date, avg_cycle_length_days')
        .eq('user_id', user.id)
        .single();

      const weightLb = profile?.weight_lb ?? 150;
      const experience = (profile?.experience_level ?? 'intermediate') as TrainingExperience;

      const cyclePhase = profile?.cycle_enabled && profile?.last_period_start_date
        ? computeCyclePhase(profile.last_period_start_date, profile.avg_cycle_length_days ?? 28)
        : undefined;

      const params: ProgramGenParams = {
        daysPerWeek,
        durationWeeks,
        goal,
        focusMuscleGroups: focusMuscles,
        targetSessionMinutes,
        swapIntervalWeeks,
      };

      const generated = generateProgram(params, weightLb, experience, cyclePhase);
      setPendingProgram(generated);
      setCustomName(generated.name);
    } catch (err: any) {
      Alert.alert('Could not generate program', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pendingProgram) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const params: ProgramGenParams = {
        daysPerWeek,
        durationWeeks,
        goal,
        focusMuscleGroups: focusMuscles,
        targetSessionMinutes,
        swapIntervalWeeks,
      };

      const programName = customName.trim() || pendingProgram.name;
      await saveProgramToDb(user.id, params, { ...pendingProgram, name: programName });

      onProgramCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Could not save program', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setPendingProgram(null);
    setCustomName('');
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
            <Text style={styles.headerSubtitle}>
              {pendingProgram ? 'Name your program' : 'Build a custom plan based on your goals'}
            </Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={loading ? undefined : onClose}
            accessibilityLabel="Close modal"
          >
            <X color={theme.white} size={18} />
          </Pressable>
        </View>

        {pendingProgram ? (
          // ── Name step ──────────────────────────────────────────────────────
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionLabel}>PROGRAM NAME</Text>
              <TextInput
                style={styles.nameInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder={pendingProgram.name}
                placeholderTextColor={theme.placeholder}
                returnKeyType="done"
                autoFocus
                autoCapitalize="words"
              />
              <Text style={styles.nameHint}>
                Leave blank to use the default name
              </Text>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                accessibilityLabel={loading ? 'Saving program' : 'Save Program'}
                style={({ pressed }) => [
                  styles.generateBtn,
                  loading && { opacity: 0.6 },
                  pressed && !loading && { opacity: 0.92 },
                ]}
              >
                <Text style={styles.generateBtnText}>
                  {loading ? 'Saving…' : 'Save Program'}
                </Text>
              </Pressable>

              <Pressable
                onPress={loading ? undefined : handleBack}
                accessibilityLabel="Back to settings"
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.skipBtnText}>Back</Text>
              </Pressable>
            </View>
          </>
        ) : (
          // ── Params step ────────────────────────────────────────────────────
          <>
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
                          ? { backgroundColor: theme.primary }
                          : { backgroundColor: theme.mutedBg, borderWidth: 1, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.dayCircleText, { color: active ? theme.white : theme.text }]}>
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
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.durationPillText, { color: active ? theme.white : theme.text }]}>
                        {weeks} wk
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Session length */}
              <Text style={styles.sectionLabel}>SESSION LENGTH</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.durationRow}
              >
                {SESSION_LENGTHS.map(({ label, value }) => {
                  const active = targetSessionMinutes === value;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setTargetSessionMinutes(value)}
                      accessibilityLabel={label}
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.durationPill,
                        active
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.durationPillText, { color: active ? theme.white : theme.text }]}>
                        {label}
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
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? theme.white : theme.text }]}>
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
                          ? { backgroundColor: theme.secondary, borderColor: theme.secondary }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? theme.white : theme.text }]}>
                        {m}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Accessory swap interval */}
              <Text style={styles.sectionLabel}>ACCESSORY SWAP INTERVAL</Text>
              <View style={styles.chipWrap}>
                {([3, 4, 6] as const).map(w => {
                  const active = swapIntervalWeeks === w;
                  return (
                    <Pressable
                      key={w}
                      onPress={() => setSwapIntervalWeeks(w)}
                      style={[
                        styles.chip,
                        active
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? theme.white : theme.text }]}>
                        Every {w} weeks
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

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
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(theme: Theme) {
  return StyleSheet.create({
    // Backdrop
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.82)',
      justifyContent: 'flex-end',
    },

    // Sheet
    sheet: {
      backgroundColor: theme.surfaceBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      height: '88%',
    },

    // Header
    header: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
      marginRight: 2,
    },
    headerTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    headerSubtitle: {
      color: theme.text,
      fontSize: 13,
      marginTop: 2,
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

    // Scroll body
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 24,
    },

    // Section label
    sectionLabel: {
      color: theme.placeholder,
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

    // Name step
    nameInput: {
      backgroundColor: theme.mutedBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    nameHint: {
      color: theme.placeholder,
      fontSize: 12,
      marginTop: 8,
    },

    // Footer
    footer: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 10,
    },
    generateBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    generateBtnText: {
      color: theme.white,
      fontSize: 15,
      fontWeight: '800',
    },
    skipBtn: {
      backgroundColor: theme.mutedBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    skipBtnText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
