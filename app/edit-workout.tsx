import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import type { Theme } from '@/constants/themes';
import { useTheme } from '@/contexts/ThemeContext';
import ExerciseCard, { type WorkoutSet } from '@/components/ExerciseCard';
import { createOperationId } from '@/features/kernel/operationId';
import { correctCompletedWorkout } from '@/features/workouts/correctionCommands';
import { createCompletedWorkoutCorrection } from '@/features/workouts/correctionContracts';
import { correctionLoadSelection, type EditableCorrectionSet } from '@/features/workouts/correctionEditor';
import { workoutCorrectionRepository } from '@/features/workouts/correctionRepository';
import { workoutCorrectionStore } from '@/features/workouts/correctionStore';
import { CORRECTIONS_UNAVAILABLE, loadCompletedWorkout, loadCorrectionCatalog } from '@/features/workouts/occurrenceRepository';
import { projectCompletedOccurrence, type OccurrenceExercise, type WorkoutMode } from '@/features/workouts/effectiveOccurrence';
import { supabase } from '@/utils/supabase';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

type EditableSet = EditableCorrectionSet;
type EditableExercise = Omit<OccurrenceExercise, 'sets'> & { sets: EditableSet[] };
const text = (v: number | null) => v === null ? '' : String(v);
const editable = (exercises: OccurrenceExercise[]): EditableExercise[] => exercises.map(e => ({ ...e,
  sets: e.sets.map(s => ({ ...s, loadText: text(s.loadValue), repsText: s.outcome === 'performed' ? text(s.reps) : '', rpeText: text(s.rpe) })) }));

export default function EditWorkoutScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [title, setTitle] = useState('Workout');
  const [summary, setSummary] = useState('');
  const [revision, setRevision] = useState(0);
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const original = useRef<EditableExercise[]>([]);
  const [mode, setMode] = useState<WorkoutMode>('completed_view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canCorrect, setCanCorrect] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [pickerSetId, setPickerSetId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [discard, setDiscard] = useState<{ title: string; action: () => void } | null>(null);
  const confirmDiscard = (title: string, action: () => void) => setDiscard({ title, action });
  useEffect(() => { if (status && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(status); }, [status]);
  const savingRef = useRef(false);
  const generation = useRef(0);
  const account = useRef<string | null>(null);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setCanCorrect(false);
    setPickerSetId(null);
    try {
      if (!sessionId) throw new Error('Workout identity is missing.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to view this workout.');
      if (request !== generation.current) return false;
      account.current = session.user.id;
      const [loaded, catalogResult, recovered] = await Promise.all([
        loadCompletedWorkout(supabase, session.user.id, sessionId),
        loadCorrectionCatalog(supabase),
        workoutCorrectionStore.load(session.user.id, sessionId).then(request => ({ request, issue: null as string | null })).catch(error => {
          reportSupabaseFailure('workout.correction_recovery', error);
          return { request: null, issue: 'The pending update could not be read. Reload to retry before making more changes.' };
        }),
      ]);
      if (catalogResult.error) reportSupabaseFailure('workout.catalog', catalogResult.error);
      if (request !== generation.current) return false;
      const names = new Map((catalogResult.data ?? []).map(e => [e.id, e.name]));
      const projection = projectCompletedOccurrence(loaded.snapshot, loaded.sets, names);
      const base = editable(projection.exercises);
      original.current = structuredClone(base);
      setExercises(base);
      setOwnerId(session.user.id);
      setTitle(loaded.session.workout_name);
      setRevision(loaded.session.correction_revision ?? 0);
      setSummary(`${new Date(loaded.session.ended_at).toLocaleDateString()} · ${loaded.session.completion_class ?? 'Recorded'}`);
      setCatalog(catalogResult.data ?? []);
      setCanCorrect(loaded.canCorrect && !recovered.issue);
      setPending(Boolean(recovered.request));
      setMode('completed_view');
      setStatus(recovered.issue ?? loaded.correctionIssue ?? (recovered.request
        ? 'An update is awaiting confirmation. Retry Sync to reconcile it before editing.'
        : projection.missingPrescription ? 'Original prescription context is unavailable. Showing recorded sets.' : null));
      return true;
    } catch (error) {
      if (request !== generation.current) return;
      reportSupabaseFailure('workout.completed_view', error);
      setCanCorrect(false);
      setExercises([]);
      original.current = [];
      setTitle('Workout'); setSummary(''); setMode('completed_view');
      setStatus(supabaseUserMessage(error, 'Workout could not be loaded for this account. Retry.'));
      return false;
    } finally { if (request === generation.current) setLoading(false); }
  }, [sessionId]);
  useEffect(() => {
    let active = true;
    const requests = generation;
    void Promise.resolve().then(() => { if (active) return load(); });
    return () => { active = false; requests.current++; };
  }, [load]);
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (account.current && session?.user.id !== account.current) {
        generation.current++; account.current = null; original.current = [];
        setExercises([]); setOwnerId(null); setCanCorrect(false); setPickerSetId(null);
        setDiscard(null);
        setTitle('Workout'); setSummary(''); setMode('completed_view'); setPending(false);
        setLoading(false); setStatus('The account changed. Reload to view this workout with the current account.');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const patchSet = (id: string, patch: Partial<EditableSet>) => setExercises(current => current.map(e => ({ ...e,
    sets: e.sets.map(s => s.actualSetId === id ? { ...s, ...patch } : s) })));
  const updateSet = (id: string, field: keyof WorkoutSet, value: string | boolean) => {
    if (field === 'outcome') patchSet(id, { outcome: value as EditableSet['outcome'], loadText: '', repsText: '', rpeText: '' });
    else if (field === 'logged') patchSet(id, { outcome: value ? 'performed' : 'not_attempted' });
    else patchSet(id, { [field === 'weight' ? 'loadText' : field === 'reps' ? 'repsText' : 'rpeText']: String(value), outcome: 'performed' });
  };
  const cancel = () => { if (savingRef.current) return; setExercises(structuredClone(original.current)); setMode('completed_view'); setPickerSetId(null); };
  usePreventRemove(Boolean(ownerId) && (mode === 'completed_edit' || saving), ({ data }) => {
    if (savingRef.current) return;
    confirmDiscard('Discard workout edits?', () => navigation.dispatch(data.action));
  });
  const leave = () => {
    if (saving) return;
    if (mode === 'completed_edit') confirmDiscard('Discard workout edits?', cancel);
    else router.back();
  };
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true; }); return () => sub.remove(); });
  const save = async () => {
    if (savingRef.current || !canCorrect || !ownerId || !sessionId) return;
    savingRef.current = true; setSaving(true);
    const requestGeneration = generation.current;
    try {
      const recovered = await workoutCorrectionStore.load(ownerId, sessionId);
      if (requestGeneration !== generation.current || account.current !== ownerId) return;
      const all = exercises.flatMap(e => e.sets);
      const request = recovered ?? createCompletedWorkoutCorrection({ ownerId, sessionId, expectedRevision: revision,
        sets: all.filter(s => s.outcome === 'performed').map(s => ({
          actualSetId: s.actualSetId, prescriptionSlotId: s.prescriptionSlotId, prescribedExerciseId: s.prescribedExerciseId,
          exerciseId: s.exerciseId, order: s.order, reps: Number(s.repsText),
          loadValue: s.loadText.trim() ? Number(s.loadText) : null, loadKind: s.loadKind, loadUnit: s.loadUnit,
          loadSide: s.loadSide, rpe: s.rpeText.trim() ? Number(s.rpeText) : null, loggedAt: s.loggedAt || new Date().toISOString(),
        })),
        setOutcomes: all.filter(s => s.prescribed && s.prescriptionSlotId).map(s => ({
          setId: s.actualSetId, slotId: s.prescriptionSlotId!, order: s.order, outcome: s.outcome,
        })),
      });
      const outcome = await correctCompletedWorkout(workoutCorrectionRepository, workoutCorrectionStore, request);
      if (requestGeneration !== generation.current || account.current !== ownerId) return;
      if ('receipt' in outcome) { if (await load()) setStatus('Workout updated.'); }
      else if (outcome.status === 'validation') { setPending(false); setStatus(outcome.errors.join(' ')); }
      else if (outcome.status === 'conflict') { if (await load()) setStatus('This workout changed elsewhere. The latest saved workout has been loaded.'); }
      else {
        setStatus(outcome.message);
        setPending(true);
        if (outcome.message === CORRECTIONS_UNAVAILABLE) { setCanCorrect(false); setMode('completed_view'); }
      }
    } catch (error) {
      reportSupabaseFailure('workout.correct', error);
      if (requestGeneration === generation.current) {
        setStatus('Could not save this update. Retry Sync to confirm it.'); setPending(true);
      }
    }
    finally { savingRef.current = false; setSaving(false); }
  };
  const editing = mode === 'completed_edit' && !saving && !pending;
  return <SafeAreaView style={styles.safeArea}>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: mode !== 'completed_edit' && !saving }} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" style={styles.headerButton} disabled={saving} onPress={mode === 'completed_edit' ? cancel : leave}><Text style={styles.cancel}>{mode === 'completed_edit' ? 'Cancel' : 'Back'}</Text></Pressable>
        <View style={styles.headerCopy}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{summary}</Text></View>
        {canCorrect ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || loading, busy: saving }} style={styles.headerButton} disabled={saving || loading} onPress={() => mode === 'completed_edit' || pending ? void save() : setMode('completed_edit')}>
          <Text style={styles.save}>{saving ? 'Saving…' : pending ? 'Retry Sync' : mode === 'completed_edit' ? 'Save changes' : 'Update Workout'}</Text>
        </Pressable> : null}
      </View>
      {loading ? <ActivityIndicator style={styles.loading} color={theme.primary} /> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {status ? <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text> : null}
        {exercises.map(exercise => <ExerciseCard key={exercise.slotId} exercise={{
          id: exercise.slotId, exerciseId: exercise.exerciseId, name: exercise.name, prescription: exercise.prescription,
          completed: exercise.sets.length > 0 && exercise.sets.every(s => s.outcome === 'performed'), readOnly: !editing,
          editingCompleted: editing, loadLabel: 'LOAD', sets: exercise.sets.map(s => ({ id: s.actualSetId,
            weight: s.loadText, reps: s.repsText, rpe: s.rpeText, logged: s.outcome === 'performed', outcome: s.outcome,
            loadUnit: s.loadUnit, loadKind: s.loadKind, exerciseName: catalog.find(e => e.id === s.exerciseId)?.name })),
        }} onUpdateSet={(id, field, value) => updateSet(id, field, value)} onToggleComplete={() => {}}
          onPressSwap={() => {}}
          onAddSet={editing ? () => {
            const prior = exercise.sets.at(-1);
            setExercises(current => current.map(e => e.slotId !== exercise.slotId ? e : { ...e, sets: [...e.sets, {
              prescriptionSlotId: prior?.prescriptionSlotId ?? null, prescribedExerciseId: prior?.prescribedExerciseId ?? null,
              exerciseId: exercise.exerciseId, reps: 0, loadValue: null, loadUnit: 'none', loadKind: 'unknown', loadSide: 'unknown', rpe: null,
              ...prior, actualSetId: createOperationId(), order: Math.max(0, ...e.sets.map(s => s.order)) + 1,
              prescribed: false, outcome: 'not_attempted', loadText: '', repsText: '', rpeText: '', loggedAt: '',
            }] }));
          } : undefined}
          renderSetControls={editing ? row => {
            const set = exercise.sets.find(s => s.actualSetId === row.id)!;
            return <View style={styles.kindRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Change exercise for set ${set.order}`} style={styles.kindButton} onPress={() => { setExerciseSearch(''); setPickerSetId(row.id); }}><Text style={styles.kindText}>Change exercise</Text></Pressable>
              {(['lb', 'kg', 'none', 'assistance', 'external'] as const).map(selection => {
                const selected = selection === 'assistance' || selection === 'external' ? set.loadKind === selection : set.loadUnit === selection;
                return <Pressable key={selection} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${selection === 'none' ? 'Bodyweight' : selection}, set ${set.order}`} style={[styles.kindButton, selected && styles.kindSelected]} onPress={() => patchSet(row.id, correctionLoadSelection(set, selection))}><Text style={styles.kindText}>{selection === 'none' ? 'Bodyweight' : selection === 'external' ? 'External load' : selection}</Text></Pressable>;
              })}
              <Pressable accessibilityRole="button" style={styles.kindButton} onPress={() => set.prescribed ? patchSet(row.id, { outcome: 'not_attempted', loadText: '', repsText: '', rpeText: '' }) : setExercises(current => current.map(e => ({ ...e, sets: e.sets.filter(s => s.actualSetId !== row.id) })))}><Text style={styles.kindText}>{set.prescribed ? 'Clear result' : 'Remove extra set'}</Text></Pressable>
            </View>;
          } : undefined}
        />)}
        {!exercises.length && !status ? <Text style={styles.status}>No sets were recorded for this workout.</Text> : null}
        <Pressable accessibilityRole="button" style={styles.addButton} disabled={saving} onPress={() => {
          if (mode !== 'completed_edit') void load();
          else confirmDiscard('Reload saved workout?', () => void load());
        }}><Text style={styles.addText}>Reload workout</Text></Pressable>
      </ScrollView>}
    </KeyboardAvoidingView>
    <Modal visible={discard !== null} transparent animationType="fade" onRequestClose={() => setDiscard(null)}>
      <View style={styles.modalBackdrop}><View style={styles.discardDialog} accessibilityViewIsModal>
        <Text style={styles.title}>{discard?.title}</Text>
        <Text style={styles.status}>Unsaved edits will be discarded. Your saved workout will stay unchanged.</Text>
        <Pressable accessibilityRole="button" style={styles.addButton} onPress={() => setDiscard(null)}><Text style={styles.addText}>Keep editing</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.addButton} onPress={() => { const action = discard?.action; setDiscard(null); action?.(); }}><Text style={styles.addText}>Discard edits</Text></Pressable>
      </View></View>
    </Modal>
    <Modal visible={pickerSetId !== null} transparent animationType="slide" onRequestClose={() => setPickerSetId(null)}>
      <View style={styles.modalBackdrop}><View style={styles.picker}><Text style={styles.title}>Performed exercise</Text>
        <TextInput accessibilityLabel="Search exercises" placeholder="Search exercises" placeholderTextColor={theme.placeholder} value={exerciseSearch} onChangeText={setExerciseSearch} style={styles.search} />
        <ScrollView keyboardShouldPersistTaps="handled">{!catalog.length ? <Text style={styles.status}>Exercise list unavailable. Close and reload the workout to retry.</Text> : catalog.filter(e => e.name.toLowerCase().includes(exerciseSearch.trim().toLowerCase())).map(e => <Pressable accessibilityRole="button" key={e.id} style={styles.pickerRow} onPress={() => { if (pickerSetId && editing) patchSet(pickerSetId, { exerciseId: e.id }); setPickerSetId(null); }}><Text style={styles.exerciseName}>{e.name}</Text></Pressable>)}</ScrollView>
        <Pressable accessibilityRole="button" style={styles.addButton} onPress={() => setPickerSetId(null)}><Text style={styles.addText}>Close</Text></Pressable>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background }, flex: { flex: 1 },
    header: { minHeight: 64, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    headerButton: { minHeight: 48, minWidth: 48, maxWidth: '35%', justifyContent: 'center' },
    search: { minHeight: 48, borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.textPrimary, paddingHorizontal: 10 },
    discardDialog: { backgroundColor: theme.surfaceBg, padding: 24, gap: 12, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    headerCopy: { flex: 1, alignItems: 'center' }, title: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
    subtitle: { color: theme.text, fontSize: 12 }, cancel: { color: theme.text, fontWeight: '700' }, save: { color: theme.primary, fontWeight: '800' }, disabled: { opacity: 0.45 },
    loading: { marginTop: 60 }, content: { padding: 16, paddingBottom: 80, gap: 12 },
    status: { color: theme.textPrimary, backgroundColor: theme.mutedBg, padding: 12, borderRadius: 10, lineHeight: 19 },
    card: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceBg, borderRadius: 14, padding: 12, gap: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, setTitle: { color: theme.textPrimary, fontWeight: '800' },
    exerciseButton: { minHeight: 44, justifyContent: 'center' }, exerciseName: { color: theme.textPrimary, fontWeight: '700' }, change: { color: theme.primary, fontSize: 12, marginTop: 2 },
    kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, kindButton: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7 }, kindSelected: { borderColor: theme.primary, backgroundColor: theme.mutedBg }, kindText: { color: theme.text, fontSize: 11, textTransform: 'capitalize' },
    inputs: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.textPrimary, paddingHorizontal: 10 },
    addButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }, addText: { color: theme.primary, fontWeight: '800' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }, picker: { height: '75%', backgroundColor: theme.surfaceBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, gap: 12 }, pickerRow: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
  });
}
