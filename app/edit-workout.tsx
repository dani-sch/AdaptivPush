import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Theme } from '@/constants/themes';
import { useTheme } from '@/contexts/ThemeContext';
import { createOperationId } from '@/features/kernel/operationId';
import { correctCompletedWorkout } from '@/features/workouts/correctionCommands';
import {
  createCompletedWorkoutCorrection,
  type CompletedWorkoutCorrectionRequest,
  type CompletedWorkoutSetCorrection,
} from '@/features/workouts/correctionContracts';
import type { LoadKind } from '@/features/workouts/contracts';
import { workoutCorrectionRepository } from '@/features/workouts/correctionRepository';
import { workoutCorrectionStore } from '@/features/workouts/correctionStore';
import { supabase } from '@/utils/supabase';

interface EditableSet extends CompletedWorkoutSetCorrection {
  exerciseName: string;
  loadText: string;
  repsText: string;
  rpeText: string;
}

interface CatalogExercise { id: string; name: string }

const asText = (value: number | null): string => value === null ? '' : String(value);

export default function EditWorkoutScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { sessionId: rawSessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('Workout');
  const [baseRevision, setBaseRevision] = useState(0);
  const [sets, setSets] = useState<EditableSet[]>([]);
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [pickerSetId, setPickerSetId] = useState<string | null>(null);
  const savingRef = useRef(false);
  const dirty = original !== JSON.stringify(sets);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!sessionId) throw new Error('Workout identity is missing.');
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) throw new Error('Sign in to edit this workout.');
        const [workoutResult, pending, setsResult, exerciseResult] = await Promise.all([
          supabase.from('workout_sessions')
            .select('id, user_id, workout_name, correction_revision, lifecycle')
            .eq('id', sessionId).single(),
          workoutCorrectionStore.load(session.user.id, sessionId),
          supabase.from('workout_exercise_sets')
            .select('actual_set_id, prescription_slot_id, prescribed_exercise_id, exercise_id, order_index, reps, load_value, load_unit, load_kind, load_side, rpe, logged_at, exercises(name)')
            .eq('session_id', sessionId).order('order_index'),
          supabase.from('exercises').select('id, name').order('name'),
        ]);
        const { data: workout, error: workoutError } = workoutResult;
        if (workoutError || !workout || workout.user_id !== session.user.id || workout.lifecycle !== 'finalized') {
          throw new Error('This completed workout is unavailable for this account.');
        }
        const { data: rows, error: setsError } = setsResult;
        if (setsError) throw setsError;
        const { data: exerciseRows, error: exerciseError } = exerciseResult;
        if (exerciseError) throw exerciseError;
        const names = new Map((exerciseRows ?? []).map(row => [row.id, row.name]));
        const source = pending?.sets ?? (rows ?? []).map(row => ({
          actualSetId: row.actual_set_id,
          prescriptionSlotId: row.prescription_slot_id,
          prescribedExerciseId: row.prescribed_exercise_id,
          exerciseId: row.exercise_id,
          order: row.order_index,
          reps: row.reps,
          loadValue: row.load_value === null ? null : Number(row.load_value),
          loadUnit: row.load_unit,
          loadKind: row.load_kind,
          loadSide: row.load_side,
          rpe: row.rpe === null ? null : Number(row.rpe),
          loggedAt: row.logged_at,
        })) as CompletedWorkoutSetCorrection[];
        const editable = source.map(set => ({
          ...set,
          exerciseName: names.get(set.exerciseId) ?? 'Unknown exercise',
          loadText: asText(set.loadValue),
          repsText: String(set.reps),
          rpeText: asText(set.rpe),
        }));
        if (cancelled) return;
        setOwnerId(session.user.id);
        setWorkoutName(workout.workout_name);
        setBaseRevision(pending?.expectedRevision ?? workout.correction_revision ?? 0);
        setSets(editable);
        setOriginal(JSON.stringify(editable));
        setCatalog((exerciseRows ?? []) as CatalogExercise[]);
        if (pending) setStatus('Pending update recovered on this device. Retry to confirm the saved result.');
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Workout could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const updateSet = (actualSetId: string, patch: Partial<EditableSet>) => {
    setSets(current => current.map(set => set.actualSetId === actualSetId ? { ...set, ...patch } : set));
  };

  const changeLoadKind = (set: EditableSet, loadKind: LoadKind) => {
    const loadUnit = loadKind === 'bodyweight' || loadKind === 'unknown' ? 'none' : set.loadUnit === 'none' ? 'lb' : set.loadUnit;
    updateSet(set.actualSetId, {
      loadKind,
      loadUnit,
      loadText: loadKind === 'bodyweight' || loadKind === 'unknown' ? '' : set.loadText,
    });
  };

  const addSet = () => {
    const prior = sets.at(-1);
    const now = new Date().toISOString();
    setSets(current => [...current, {
      actualSetId: createOperationId(),
      prescriptionSlotId: prior?.prescriptionSlotId ?? null,
      prescribedExerciseId: prior?.prescribedExerciseId ?? null,
      exerciseId: prior?.exerciseId ?? catalog[0]?.id ?? '',
      exerciseName: prior?.exerciseName ?? catalog[0]?.name ?? 'Choose exercise',
      order: (prior?.order ?? 0) + 1,
      reps: prior?.reps ?? 1,
      repsText: prior?.repsText ?? '1',
      loadValue: prior?.loadValue ?? null,
      loadText: prior?.loadText ?? '',
      loadUnit: prior?.loadUnit ?? 'none',
      loadKind: prior?.loadKind ?? 'unknown',
      loadSide: prior?.loadSide ?? 'unknown',
      rpe: prior?.rpe ?? null,
      rpeText: prior?.rpeText ?? '',
      loggedAt: now,
    }]);
  };

  const buildRequest = (operationId?: CompletedWorkoutCorrectionRequest['operationId']) => {
    if (!ownerId || !sessionId) throw new Error('Workout identity is unavailable.');
    return createCompletedWorkoutCorrection({
      ownerId,
      sessionId,
      expectedRevision: baseRevision,
      operationId,
      sets: sets.map(({ exerciseName: _exerciseName, loadText, repsText, rpeText, ...set }) => ({
        ...set,
        loadValue: loadText.trim() === '' ? null : Number(loadText),
        reps: Number(repsText),
        rpe: rpeText.trim() === '' ? null : Number(rpeText),
      })),
    });
  };

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStatus(null);
    try {
      const recovered = ownerId && sessionId ? await workoutCorrectionStore.load(ownerId, sessionId) : null;
      const outcome = await correctCompletedWorkout(
        workoutCorrectionRepository,
        workoutCorrectionStore,
        recovered ?? buildRequest(),
      );
      if (outcome.status === 'validation') {
        setStatus(outcome.errors.join(' '));
      } else if ('receipt' in outcome) {
        setStatus('Changes confirmed saved remotely.');
        setBaseRevision(outcome.receipt.revision);
        setOriginal(JSON.stringify(sets));
        router.back();
      } else {
        setStatus(outcome.message);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Workout changes could not be saved.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const cancel = () => {
    if (!dirty) { router.back(); return; }
    Alert.alert('Discard workout edits?', 'The saved workout will stay unchanged.', [
      { text: 'Continue editing', style: 'cancel' },
      { text: 'Save changes', onPress: () => void save() },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => subscription.remove();
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={cancel} accessibilityRole="button"><Text style={styles.cancel}>Cancel</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.title}>Edit workout</Text><Text style={styles.subtitle}>{workoutName}</Text></View>
          <Pressable onPress={() => void save()} disabled={saving || loading} accessibilityRole="button">
            <Text style={[styles.save, (saving || loading) && styles.disabled]}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} style={styles.loading} /> : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {status ? <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text> : null}
            {sets.map((set, index) => (
              <View key={set.actualSetId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.setTitle}>Set {index + 1}</Text>
                  <Pressable onPress={() => setSets(current => current.filter(row => row.actualSetId !== set.actualSetId))} accessibilityLabel={`Remove set ${index + 1}`}>
                    <Ionicons name="trash-outline" size={20} color={theme.error} />
                  </Pressable>
                </View>
                <Pressable style={styles.exerciseButton} onPress={() => setPickerSetId(set.actualSetId)}>
                  <Text style={styles.exerciseName}>{set.exerciseName}</Text><Text style={styles.change}>Change exercise</Text>
                </Pressable>
                <View style={styles.kindRow}>
                  {(['external', 'bodyweight', 'assistance', 'unknown'] as const).map(kind => (
                    <Pressable key={kind} onPress={() => changeLoadKind(set, kind)} style={[styles.kindButton, set.loadKind === kind && styles.kindSelected]}>
                      <Text style={styles.kindText}>{kind}</Text>
                    </Pressable>
                  ))}
                </View>
                {set.loadKind === 'external' || set.loadKind === 'assistance' ? (
                  <View style={styles.kindRow}>
                    {(['lb', 'kg'] as const).map(unit => (
                      <Pressable key={unit} onPress={() => updateSet(set.actualSetId, { loadUnit: unit })} style={[styles.kindButton, set.loadUnit === unit && styles.kindSelected]}>
                        <Text style={styles.kindText}>{unit}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.inputs}>
                  <TextInput style={styles.input} value={set.loadText} editable={set.loadKind !== 'bodyweight' && set.loadKind !== 'unknown'} onChangeText={value => updateSet(set.actualSetId, { loadText: value })} keyboardType="decimal-pad" placeholder="Load" placeholderTextColor={theme.placeholder} />
                  <TextInput style={styles.input} value={set.repsText} onChangeText={value => updateSet(set.actualSetId, { repsText: value })} keyboardType="number-pad" placeholder="Reps" placeholderTextColor={theme.placeholder} />
                  <TextInput style={styles.input} value={set.rpeText} onChangeText={value => updateSet(set.actualSetId, { rpeText: value })} keyboardType="decimal-pad" placeholder="RPE" placeholderTextColor={theme.placeholder} />
                </View>
              </View>
            ))}
            <Pressable style={styles.addButton} onPress={addSet}><Text style={styles.addText}>Add completed set</Text></Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <Modal visible={pickerSetId !== null} transparent animationType="slide" onRequestClose={() => setPickerSetId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.picker}>
            <Text style={styles.title}>Performed exercise</Text>
            <ScrollView>{catalog.map(exercise => (
              <Pressable key={exercise.id} style={styles.pickerRow} onPress={() => {
                if (pickerSetId) updateSet(pickerSetId, { exerciseId: exercise.id, exerciseName: exercise.name });
                setPickerSetId(null);
              }}><Text style={styles.exerciseName}>{exercise.name}</Text></Pressable>
            ))}</ScrollView>
            <Pressable style={styles.addButton} onPress={() => setPickerSetId(null)}><Text style={styles.addText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background }, flex: { flex: 1 },
    header: { minHeight: 64, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    headerCopy: { flex: 1, alignItems: 'center' }, title: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
    subtitle: { color: theme.text, fontSize: 12 }, cancel: { color: theme.text, fontWeight: '700' }, save: { color: theme.primary, fontWeight: '800' }, disabled: { opacity: 0.45 },
    loading: { marginTop: 60 }, content: { padding: 16, paddingBottom: 80, gap: 12 },
    status: { color: theme.textPrimary, backgroundColor: theme.mutedBg, padding: 12, borderRadius: 10, lineHeight: 19 },
    card: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceBg, borderRadius: 14, padding: 12, gap: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, setTitle: { color: theme.textPrimary, fontWeight: '800' },
    exerciseButton: { minHeight: 44, justifyContent: 'center' }, exerciseName: { color: theme.textPrimary, fontWeight: '700' }, change: { color: theme.primary, fontSize: 12, marginTop: 2 },
    kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, kindButton: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7 }, kindSelected: { borderColor: theme.primary, backgroundColor: theme.mutedBg }, kindText: { color: theme.text, fontSize: 11, textTransform: 'capitalize' },
    inputs: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.textPrimary, paddingHorizontal: 10 },
    addButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }, addText: { color: theme.primary, fontWeight: '800' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }, picker: { height: '75%', backgroundColor: theme.surfaceBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, gap: 12 }, pickerRow: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
  });
}
