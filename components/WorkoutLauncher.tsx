import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Theme } from '@/constants/themes';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentProgram } from '@/hooks/useCurrentProgram';
import { programSequenceRepository, type ProgramSequenceState } from '@/features/programs/sequenceRepository';
import sequenceOperations from '@/features/programs/sequenceService';
import { workoutDraftStore } from '@/features/workouts/draftStore';
import type { WorkoutDraft } from '@/features/workouts/contracts';
import { workoutRouteParams, workoutEntryIssue } from '@/features/workouts/routeResolution';
import { workoutRouteParamsForDraft } from '@/features/workouts/effectiveCurrentWorkout';
import { summarizeWorkout } from '@/features/workouts/workoutSummary';
import { adHocService } from '@/features/workouts/adHocService';
import type { AdHocDraft } from '@/features/workouts/adHocFlow';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';
import type { ProgramWorkout } from '@/types/program';
import NextWorkoutCard from './NextWorkoutCard';

type LauncherMode = 'new' | 'choose';
const LauncherContext = createContext<{ open: (mode?: LauncherMode) => void } | null>(null);

export function useWorkoutLauncher() {
  const context = useContext(LauncherContext);
  if (!context) throw new Error('Workout launcher must be inside the tab layout.');
  return context.open;
}

export function WorkoutLauncher({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { program, ownerId, refresh } = useCurrentProgram();
  const [mode, setMode] = useState<LauncherMode | null>(null);
  const [sequence, setSequence] = useState<ProgramSequenceState | null>(null);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [adHocDraft, setAdHocDraft] = useState<AdHocDraft | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!ownerId) throw new Error('Sign in to start a workout.');
      const active = program ? await workoutDraftStore.loadActiveForProgram(ownerId, program.id) : null;
      setDraft(active);
      const adHoc = await adHocService.load(ownerId);
      setAdHocDraft(adHoc.draft);
      if (program) {
        const state = await sequenceOperations.ensureInitialized(ownerId, program.id);
        setSequence(state);
        setSelectedDayId(previous => previous && state.days.some(day =>
          day.stableDayId === previous && day.status === 'pending') ? previous : state.nextStableDayId);
      } else {
        setSequence(null);
        setSelectedDayId(null);
      }
    } catch (cause) {
      reportSupabaseFailure('workout.launcher', cause);
      setError(supabaseUserMessage(cause, 'Could not load your workout. Retry.'));
    } finally {
      setLoading(false);
    }
  }, [ownerId, program]);

  useEffect(() => {
    if (mode) void Promise.resolve().then(load);
  }, [mode, load]);

  const open = useCallback((nextMode: LauncherMode = 'new') => {
    setMode(nextMode);
    void refresh();
  }, [refresh]);

  const options = sequence?.days.filter(day => day.originalKind === 'workout' && day.status === 'pending')
    .map(day => ({ day, workout: program?.workouts.find(workout => workout.stableDayId === day.stableDayId) }))
    .filter((item): item is { day: typeof item.day; workout: ProgramWorkout } => Boolean(item.workout)) ?? [];
  const selected = options.find(item => item.day.stableDayId === selectedDayId)?.workout;
  const activeWorkout = draft && program?.workouts.find(workout => workout.stableDayId === draft.stableDayId);
  const workout = activeWorkout ?? (sequence?.paused ? undefined : selected);
  const issue = workout && program ? workoutEntryIssue(program, workout) : null;

  const start = async () => {
    if (!ownerId || !program || busy || !workout) return;
    setBusy(true);
    try {
      if (!draft) {
        const current = await programSequenceRepository.get(program.id);
        if (current.paused || current.days.find(day => day.stableDayId === workout.stableDayId)?.status !== 'pending') {
          throw new Error('This workout is no longer available. Refresh to choose another.');
        }
      }
      if (issue) throw new Error(issue);
      setMode(null);
      router.push({ pathname: '/next-workout', params: draft
        ? workoutRouteParamsForDraft(draft) : workoutRouteParams(program, workout) });
    } catch (cause) {
      reportSupabaseFailure('workout.launcher_start', cause);
      setError(supabaseUserMessage(cause, 'Could not start this workout. Retry.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LauncherContext.Provider value={{ open }}>
      <View style={{ flex: 1 }}>
        {children}
        <Pressable accessibilityRole="button" accessibilityLabel="Start or continue workout"
          onPress={() => open()} style={[styles.floating, { bottom: 23 + Math.max(0, insets.bottom - 18) }]}>
          <Ionicons name="barbell" size={25} color={theme.white} />
        </Pressable>
      </View>
      <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => setMode(null)}>
        <View style={styles.overlay}>
          <Pressable style={{ flex: 1 }} accessibilityLabel="Close workout launcher" onPress={() => setMode(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.heading}>{mode === 'choose' ? 'Choose another workout'
                : draft || adHocDraft ? 'Ongoing Workout' : 'New Workout'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setMode(null)}
                style={styles.close}><Ionicons name="close" color={theme.textPrimary} size={22} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
              {loading && <ActivityIndicator color={theme.primary} accessibilityLabel="Loading workout" />}
              {error && <View style={styles.message}>
                <Text style={styles.error} accessibilityRole="alert">{error}</Text>
                <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.row}>
                  <Text style={styles.link}>Retry</Text>
                </Pressable>
              </View>}
              {!loading && (!error || draft || adHocDraft) && mode === 'choose' && (
                draft || adHocDraft ? <View style={styles.choice}>
                  <Text style={styles.choiceTitle}>Continue your current workout first</Text>
                  <Pressable accessibilityRole="button" style={styles.row}
                    onPress={() => setMode('new')}>
                    <Text style={styles.link}>Continue Workout</Text>
                  </Pressable>
                </View> : options.length ? options.map(({ day, workout: choice }) => (
                  <Pressable key={day.stableDayId} accessibilityRole="button"
                    accessibilityState={{ selected: selectedDayId === day.stableDayId }}
                    accessibilityLabel={`Choose ${choice.name}`}
                    onPress={() => { setSelectedDayId(day.stableDayId); setMode('new'); }}
                    style={styles.choice}>
                    <Text style={styles.choiceTitle}>{choice.name}</Text>
                    <Text style={styles.subtle}>{choice.day} · {choice.exercises.length} exercises</Text>
                    <Text style={styles.subtle} numberOfLines={2}>{choice.exercises.map(ex => ex.name).join(' · ')}</Text>
                  </Pressable>
                )) : <Text style={styles.subtle}>No other program workouts are available right now.</Text>
              )}
              {!loading && (!error || draft || adHocDraft) && mode === 'new' && <>
                {adHocDraft && !draft && <View style={styles.choice}>
                  <Text style={styles.choiceTitle}>{adHocDraft.workoutName.trim() || 'Ad-hoc workout'}</Text>
                  <Text style={styles.subtle}>{new Set(adHocDraft.sets.map(set => set.exerciseId)).size} exercises · {adHocDraft.sets.length} sets</Text>
                  <Pressable style={styles.primary} accessibilityRole="button"
                    onPress={() => { setMode(null); router.push('/ad-hoc-workout'); }}>
                    <Text style={styles.primaryText}>Continue Workout</Text>
                  </Pressable>
                </View>}
                {workout && (!adHocDraft || draft) && <NextWorkoutCard workout={summarizeWorkout(workout)}
                  statusLabel={draft ? 'In progress' : 'Next workout'} compact showAllExercises
                  entryIssue={issue}
                  hasActiveDraft={Boolean(draft)}
                  actionLabel={draft ? 'Continue Workout' : 'Start Workout'}
                  onPressStart={() => void start()} />}
                {draft && <Text style={[styles.subtle, { marginHorizontal: 16 }]}>
                  {draft.slots.reduce((count, slot) => count + slot.sets.filter(set => set.logged).length, 0)}
                  {' of '}
                  {draft.slots.reduce((count, slot) => count + slot.sets.length, 0)} sets logged
                </Text>}
                {!draft && sequence?.paused && <Text style={styles.subtle}>Program paused. Choose an ad-hoc workout or resume your program.</Text>}
                {!draft && !workout && !sequence?.paused && !adHocDraft &&
                  <Text style={styles.subtle}>No program workout is ready. You can still log an ad-hoc workout.</Text>}
                {!draft && !adHocDraft && !sequence?.paused && options.length > 1 &&
                  <Pressable style={styles.row} accessibilityRole="button" onPress={() => setMode('choose')}>
                    <Text style={styles.link}>Choose another workout</Text>
                  </Pressable>}
                {(draft || !adHocDraft) && <Pressable style={styles.row} accessibilityRole="button"
                  onPress={() => { setMode(null); router.push('/ad-hoc-workout'); }}>
                  <Text style={styles.link}>{adHocDraft ? 'Continue ad-hoc workout' : 'Ad-hoc workout'}</Text>
                </Pressable>}
              </>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LauncherContext.Provider>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    floating: { position: 'absolute', alignSelf: 'center', width: 58, height: 58,
      borderRadius: 20, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.primary, borderWidth: 3, borderColor: theme.cardBg },
    overlay: { flex: 1, backgroundColor: theme.backgroundDark + 'cc', justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.background, borderTopLeftRadius: 22, borderTopRightRadius: 22,
      paddingHorizontal: 16, paddingTop: 18, borderWidth: 1, borderColor: theme.border },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
    heading: { color: theme.textPrimary, fontSize: 22, fontWeight: '700' },
    close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    row: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
    link: { color: theme.primary, fontSize: 16, fontWeight: '600' },
    message: { padding: 16, backgroundColor: theme.cardBg, borderRadius: 12 },
    error: { color: theme.error, fontSize: 14 },
    choice: { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1,
      borderRadius: 14, padding: 16, marginBottom: 10, minHeight: 72 },
    choiceTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '600' },
    subtle: { color: theme.text, lineHeight: 20, marginTop: 5 },
    primary: { backgroundColor: theme.primary, borderRadius: 14, minHeight: 48,
      alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    primaryText: { color: theme.white, fontWeight: '700' },
  });
}
