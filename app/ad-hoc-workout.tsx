import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
} from 'react-native';

import ExerciseCard, { type WorkoutSet } from '@/components/ExerciseCard';
import { SwapExerciseModal } from '@/components/SwapExerciseModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import {
  adHocService, addAdHocExercises, appendAdHocSet, removeAdHocExercise, removeAdHocSet,
} from '@/features/workouts/adHocService';
import {
  adHocFinishCause,
  hasIncompleteAdHocSets,
  isAdHocValidationError,
  type AdHocDraft,
  type AdHocDraftSet,
} from '@/features/workouts/adHocFlow';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

export default function AdHocWorkoutScreen() {
  const { ownerId, canRequest } = useAuth();
  return <AdHocCapture key={`${ownerId ?? 'signed-out'}/${canRequest}`} ownerId={ownerId} canRequest={canRequest} />;
}

function AdHocCapture({ ownerId, canRequest }: { ownerId: string | null; canRequest: boolean }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [draft, setDraft] = useState<AdHocDraft | null>(null);
  const draftRef = useRef<AdHocDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(Boolean(ownerId && canRequest));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const saves = useRef<Promise<void>>(Promise.resolve());
  const saveFailed = useRef(false);

  const load = useCallback(async (currentOwner: string) => {
    setLoading(true);
    setError(null);
    try {
      const state = await adHocService.load(currentOwner);
      const restored = state.draft ?? await adHocService.start(currentOwner);
      draftRef.current = restored;
      setDraft(restored);
      setPending(state.pending);
    } catch (cause) {
      reportSupabaseFailure('workout.ad_hoc_restore', cause);
      setError(supabaseUserMessage(cause, 'Could not restore this workout. Retry to protect your draft.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ownerId && canRequest) void Promise.resolve().then(() => load(ownerId));
  }, [ownerId, canRequest, load]);

  const persist = (next: AdHocDraft) => {
    draftRef.current = next;
    setDraft(next);
    setError(null);
    const write = saves.current.catch(() => undefined).then(() => adHocService.save(next));
    saves.current = write;
    void write.then(() => { saveFailed.current = false; }, (cause: unknown) => {
      saveFailed.current = true;
      reportSupabaseFailure('workout.ad_hoc_draft', cause);
      setError(supabaseUserMessage(cause, 'Draft could not be saved. Retry before finishing.'));
    });
  };

  const update = (change: (value: AdHocDraft) => AdHocDraft) => {
    if (busyRef.current || pending || !canRequest || !draftRef.current) return;
    persist(change(draftRef.current));
  };

  const changeSet = (setId: string, fields: Partial<AdHocDraftSet>) => {
    update((value) => ({
      ...value, sets: value.sets.map((set) => set.setId === setId ? { ...set, ...fields } : set),
    }));
  };

  const groups = useMemo(() => {
    const byExercise = new Map<string, AdHocDraftSet[]>();
    for (const set of draft?.sets ?? []) {
      const group = byExercise.get(set.exerciseId) ?? [];
      group.push(set);
      byExercise.set(set.exerciseId, group);
    }
    return [...byExercise.entries()];
  }, [draft]);

  const updateCardSet = (setId: string, field: keyof WorkoutSet, value: string | boolean) => {
    const current = draftRef.current?.sets.find(set => set.setId === setId);
    if (!current) return;
    if (field === 'weight' && typeof value === 'string') changeSet(setId, { loadValue: value });
    if (field === 'reps' && typeof value === 'string') changeSet(setId, { reps: value });
    if (field === 'rpe' && typeof value === 'string') changeSet(setId, { rpe: value });
    if (field === 'loadKind' && (value === 'bodyweight' || value === 'external' || value === 'assistance')) {
      changeSet(setId, { loadKind: value, loadValue: value === 'bodyweight' ? '' : current.loadValue,
        loadUnit: value === 'bodyweight' ? 'none' : current.loadUnit === 'kg' ? 'kg' : 'lb' });
    }
    if (field === 'loadUnit' && (value === 'lb' || value === 'kg')) changeSet(setId, { loadUnit: value });
  };

  const finish = async (completionClass: 'complete' | 'partial' = 'complete') => {
    if (!ownerId || !canRequest || busyRef.current || !draftRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await saves.current;
      if (saveFailed.current) throw new Error('Save the draft before finishing.');
      await adHocService.finish(ownerId, completionClass);
      draftRef.current = null;
      setDraft(null);
      setPending(false);
      router.replace('/(tabs)/history');
    } catch (cause) {
      const failure = adHocFinishCause(cause);
      const error = failure?.cause ?? cause;
      if (isAdHocValidationError(error)) {
        setError(error.message);
      } else {
        reportSupabaseFailure(`workout.ad_hoc_finish.${failure?.stage ?? 'unknown'}`, error);
        setError(supabaseUserMessage(error, 'Could not confirm this workout. Retry the exact request.'));
        try {
          const state = await adHocService.load(ownerId);
          draftRef.current = state.draft;
          setDraft(state.draft);
          setPending(state.pending);
        } catch (restoreError) {
          reportSupabaseFailure('workout.ad_hoc_pending_restore', restoreError);
          setError(supabaseUserMessage(restoreError, 'Recovery could not be read. Reopen this screen before editing.'));
          setPending(true);
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const requestFinish = () => {
    const current = draftRef.current;
    if (!current || pending || busyRef.current) return void finish();
    if (!hasIncompleteAdHocSets(current)) return void finish();
    Alert.alert(
      'Submit incomplete workout?',
      'Sets without reps will not be logged.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => void finish('partial') },
      ],
    );
  };

  const cancel = async () => {
    if (!ownerId || !canRequest || busyRef.current || pending) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await saves.current;
      if (saveFailed.current) throw new Error('Save the draft before cancelling.');
      await adHocService.cancel(ownerId);
      draftRef.current = null;
      setDraft(null);
      router.replace('/(tabs)/home');
    } catch (cause) {
      reportSupabaseFailure('workout.ad_hoc_cancel', cause);
      setError(supabaseUserMessage(cause, 'Could not cancel this workout. Retry to protect your draft.'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const confirmCancel = () => {
    if (!draft || pending || busy) return;
    Alert.alert(
      'Cancel ad-hoc workout?',
      'Your unsaved workout draft and logged sets will be discarded. This cannot be undone.',
      [
        { text: 'Keep workout', style: 'cancel' },
        { text: 'Discard workout', style: 'destructive', onPress: () => void cancel() },
      ],
    );
  };

  const editable = Boolean(ownerId && canRequest && draft && !pending && !loading && !busy);

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>{draft?.sets.length ? 'Ad-hoc workout' : 'New ad-hoc workout'}</Text>
          <Text style={styles.muted}>Train outside your program.</Text>
          {!canRequest && <Text style={styles.warning}>Sign in and reconnect before editing or finishing.</Text>}
          {loading && <ActivityIndicator accessibilityLabel="Restoring workout" />}
          {error && <Text style={styles.warning} accessibilityRole="alert">{error}</Text>}
          {pending && <Text style={styles.warning}>A finish request is frozen. Editing is locked; retry the exact request to confirm your history.</Text>}
          {!loading && error && !pending && ownerId && (
            <Pressable accessibilityRole="button" style={styles.action}
              onPress={() => draftRef.current ? persist(draftRef.current) : void load(ownerId)}>
              <Text style={styles.actionText}>{draft ? 'Retry saving draft' : 'Retry restoring draft'}</Text>
            </Pressable>
          )}
          {draft && (
            <>
              <Text style={styles.label}>Workout name (optional)</Text>
              <TextInput style={styles.input} value={draft.workoutName} editable={editable}
                onChangeText={(workoutName) => update((value) => ({ ...value, workoutName }))}
                placeholder="Workout name" placeholderTextColor={theme.placeholder} accessibilityLabel="Workout name" />
              <Text style={styles.label}>Exercises and actual sets</Text>
              {groups.length === 0 && <Text style={styles.muted}>Choose exercises, then enter reps and load for each set.</Text>}
              {groups.map(([exerciseId, sets]) => (
                <ExerciseCard key={exerciseId} hideLoggedControl
                  exercise={{
                    id: exerciseId, exerciseId, name: sets[0].exerciseName,
                    prescription: 'Enter each set you performed. RPE is optional.',
                    completed: false, readOnly: !editable,
                    sets: sets.map(set => ({
                      id: set.setId, weight: set.loadValue, reps: set.reps, rpe: set.rpe,
                      logged: false, loadKind: set.loadKind, loadUnit: set.loadUnit,
                    })),
                  }}
                  onUpdateSet={updateCardSet}
                  onToggleComplete={() => {}}
                  onRemoveSet={editable ? setId => update(value => removeAdHocSet(value, setId)) : undefined}
                  onRemoveExercise={editable ? () => update(value => removeAdHocExercise(value, exerciseId)) : undefined}
                  onAddSet={editable ? () => update(value => appendAdHocSet(value, exerciseId)) : undefined}
                />
              ))}
              <Pressable accessibilityRole="button" disabled={!editable} style={styles.action}
                onPress={() => setPicker(true)}><Text style={styles.actionText}>Add exercises</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={!canRequest || busy || loading || (!pending && !draft.sets.length)}
                style={styles.action} onPress={requestFinish}>
                <Text style={styles.actionText}>{busy ? 'Confirming...' : pending ? 'Retry exact finish' : 'Finish workout'}</Text>
              </Pressable>
              {!pending && (
                <Pressable accessibilityRole="button" disabled={!editable} style={styles.cancelAction}
                  onPress={confirmCancel}>
                  <Text style={styles.cancelActionText}>Cancel workout</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
        <SafeAreaView style={styles.page}>
          {picker && <SwapExerciseModal mode="ad_hoc" embedded
            excludedExerciseIds={groups.map(([exerciseId]) => exerciseId)}
            onClose={() => setPicker(false)}
            onAddExercises={async exercises => {
              if (!editable || !draftRef.current) throw new Error('This workout is not editable.');
              const next = addAdHocExercises(draftRef.current, exercises);
              update(() => next);
              await saves.current;
            }}
          />}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    fill: { flex: 1 },
    page: { flex: 1, backgroundColor: theme.background },
    content: { padding: 18, paddingBottom: 48 },
    heading: { color: theme.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 8 },
    muted: { color: theme.text, marginVertical: 8 },
    warning: { color: theme.error, marginVertical: 12 },
    label: { color: theme.textPrimary, marginTop: 12, marginBottom: 5 },
    input: { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg,
      borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, minHeight: 48 },
    action: { backgroundColor: theme.primary, borderRadius: 8, padding: 16, marginTop: 18, minHeight: 48 },
    actionText: { color: theme.white, textAlign: 'center', fontWeight: '600' },
    cancelAction: { borderColor: theme.error, borderWidth: 1, borderRadius: 8, padding: 16, marginTop: 12, minHeight: 48 },
    cancelActionText: { color: theme.error, textAlign: 'center', fontWeight: '600' },
  });
}
