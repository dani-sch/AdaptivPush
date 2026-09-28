import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { adHocService, createAdHocSet } from '@/features/workouts/adHocService';
import type { AdHocDraft, AdHocDraftSet } from '@/features/workouts/adHocFlow';
import { loadExercisePickerCatalog } from '@/features/workouts/occurrenceRepository';
import { supabase } from '@/utils/supabase';
import { reportSupabaseFailure, supabaseUserMessage } from '@/utils/supabaseResilience';

type CatalogRow = Awaited<ReturnType<typeof loadExercisePickerCatalog>>[number];
const LOAD_KINDS: AdHocDraftSet['loadKind'][] = ['external', 'bodyweight', 'assistance', 'unknown'];
const LOAD_SIDES: AdHocDraftSet['loadSide'][] = ['external_total', 'per_hand', 'combined', 'unilateral', 'unknown'];

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
  const [catalog, setCatalog] = useState<CatalogRow[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
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

  const loadCatalog = async () => {
    if (!canRequest || busyRef.current || pending) return;
    setCatalogError(null);
    setPicker(true);
    if (catalog) return;
    try {
      const rows = await loadExercisePickerCatalog(supabase);
      setCatalog(rows);
    } catch (cause) {
      reportSupabaseFailure('workout.ad_hoc_catalog', cause);
      setCatalogError(supabaseUserMessage(cause, 'Could not load the exercise catalog. Retry.'));
    }
  };

  const addSet = (exercise: CatalogRow) => {
    update((value) => ({
      ...value,
      sets: [...value.sets, createAdHocSet(exercise.id, exercise.name, value.sets.length + 1)],
    }));
    setPicker(false);
  };

  const changeSet = (setId: string, fields: Partial<AdHocDraftSet>) => {
    update((value) => ({
      ...value, sets: value.sets.map((set) => set.setId === setId ? { ...set, ...fields } : set),
    }));
  };

  const finish = async () => {
    if (!ownerId || !canRequest || busyRef.current || !draftRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await saves.current;
      if (saveFailed.current) throw new Error('Save the draft before finishing.');
      await adHocService.finish(ownerId);
      draftRef.current = null;
      setDraft(null);
      setPending(false);
      router.replace('/workout-history');
    } catch (cause) {
      reportSupabaseFailure('workout.ad_hoc_finish', cause);
      setError(supabaseUserMessage(cause, 'Could not confirm this workout. Retry the exact request.'));
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
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const editable = Boolean(ownerId && canRequest && draft && !pending && !loading && !busy);
  const filtered = catalog?.filter((row) =>
    `${row.name} ${row.primary_muscle} ${row.equipment}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [];

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>New ad-hoc workout</Text>
          <Text style={styles.muted}>History only. This does not complete or change your program.</Text>
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
              <Text style={styles.label}>Workout name</Text>
              <TextInput style={styles.input} value={draft.workoutName} editable={editable}
                onChangeText={(workoutName) => update((value) => ({ ...value, workoutName }))}
                placeholder="Workout name" placeholderTextColor={theme.placeholder} accessibilityLabel="Workout name" />
              <Text style={styles.label}>Actual sets</Text>
              {draft.sets.length === 0 && <Text style={styles.muted}>Select an exercise and log at least one set.</Text>}
              {draft.sets.map((set) => (
                <View key={set.setId} style={styles.card}>
                  <Text style={styles.setTitle}>{set.order}. {set.exerciseName}</Text>
                  <Pressable accessibilityRole="button" disabled={!editable}
                    accessibilityLabel={`Remove set ${set.order} of ${set.exerciseName}`}
                    onPress={() => update((value) => ({
                      ...value, sets: value.sets.filter((entry) => entry.setId !== set.setId)
                        .map((entry, index) => ({ ...entry, order: index + 1 })),
                    }))}><Text style={styles.link}>Remove set</Text></Pressable>
                  <View style={styles.row}>
                    <View style={styles.field}>
                      <Text style={styles.label}>Reps</Text>
                      <TextInput style={styles.input} value={set.reps} editable={editable} keyboardType="number-pad"
                        accessibilityLabel={`Reps for ${set.exerciseName} set ${set.order}`}
                        onChangeText={(reps) => changeSet(set.setId, { reps })} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>RPE (optional)</Text>
                      <TextInput style={styles.input} value={set.rpe} editable={editable} keyboardType="decimal-pad"
                        accessibilityLabel={`RPE for ${set.exerciseName} set ${set.order}`}
                        onChangeText={(rpe) => changeSet(set.setId, { rpe })} />
                    </View>
                  </View>
                  <Text style={styles.label}>Load type</Text>
                  <View style={styles.choices}>{LOAD_KINDS.map((kind) =>
                    <Pressable key={kind} accessibilityRole="radio" accessibilityState={{ checked: set.loadKind === kind }}
                      disabled={!editable} onPress={() => changeSet(set.setId, {
                        loadKind: kind, loadUnit: kind === 'external' || kind === 'assistance' ? 'lb' : 'none',
                        loadValue: '',
                      })} style={[styles.choice, set.loadKind === kind && styles.selected]}>
                      <Text style={styles.text}>{kind}</Text>
                    </Pressable>)}</View>
                  {(set.loadKind === 'external' || set.loadKind === 'assistance') && (
                    <>
                      <Text style={styles.label}>Load</Text>
                      <View style={styles.row}>
                        <TextInput style={[styles.input, styles.field]} value={set.loadValue} editable={editable}
                          keyboardType="decimal-pad" accessibilityLabel={`Load for ${set.exerciseName} set ${set.order}`}
                          onChangeText={(loadValue) => changeSet(set.setId, { loadValue })} />
                        {(['lb', 'kg'] as const).map((unit) =>
                          <Pressable key={unit} accessibilityRole="radio" accessibilityState={{ checked: set.loadUnit === unit }}
                            disabled={!editable} onPress={() => changeSet(set.setId, { loadUnit: unit })}
                            style={[styles.choice, set.loadUnit === unit && styles.selected]}>
                            <Text style={styles.text}>{unit}</Text>
                          </Pressable>)}
                      </View>
                    </>
                  )}
                  <Text style={styles.label}>Load side</Text>
                  <View style={styles.choices}>{LOAD_SIDES.map((side) =>
                    <Pressable key={side} accessibilityRole="radio" accessibilityState={{ checked: set.loadSide === side }}
                      disabled={!editable} onPress={() => changeSet(set.setId, { loadSide: side })}
                      style={[styles.choice, set.loadSide === side && styles.selected]}>
                      <Text style={styles.text}>{side.replace(/_/g, ' ')}</Text>
                    </Pressable>)}</View>
                </View>
              ))}
              <Pressable accessibilityRole="button" disabled={!editable} style={styles.action}
                onPress={() => void loadCatalog()}><Text style={styles.actionText}>Add exercise / set</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={!canRequest || busy || loading || (!pending && !draft.sets.length)}
                style={styles.action} onPress={() => void finish()}>
                <Text style={styles.actionText}>{busy ? 'Confirming...' : pending ? 'Retry exact finish' : 'Finish workout'}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
        <SafeAreaView style={styles.page}>
          <View style={styles.content}>
            <Pressable accessibilityRole="button" onPress={() => setPicker(false)}><Text style={styles.link}>Close catalog</Text></Pressable>
            <TextInput style={styles.input} value={search} onChangeText={setSearch}
              placeholder="Search exercises" placeholderTextColor={theme.placeholder}
              accessibilityLabel="Search catalog exercises" />
            {catalogError && <Text style={styles.warning}>{catalogError}</Text>}
            {catalogError && <Pressable accessibilityRole="button" onPress={() => { setPicker(false); void loadCatalog(); }}>
              <Text style={styles.link}>Retry catalog</Text>
            </Pressable>}
            {!catalog && !catalogError && <ActivityIndicator accessibilityLabel="Loading catalog" />}
            <ScrollView keyboardShouldPersistTaps="handled">
              {catalog && filtered.length === 0 && <Text style={styles.muted}>No matching catalog exercises.</Text>}
              {filtered.map((exercise) =>
                <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`Add ${exercise.name}`}
                  style={styles.card} onPress={() => addSet(exercise)}>
                  <Text style={styles.text}>{exercise.name}</Text>
                  <Text style={styles.muted}>{exercise.primary_muscle} · {exercise.equipment}</Text>
                  {exercise.instructions?.length ? <Text style={styles.muted} numberOfLines={3}>{exercise.instructions.join(' ')}</Text> : null}
                </Pressable>)}
            </ScrollView>
          </View>
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
    text: { color: theme.textPrimary, fontSize: 15 },
    muted: { color: theme.text, marginVertical: 8 },
    warning: { color: theme.error, marginVertical: 12 },
    label: { color: theme.textPrimary, marginTop: 12, marginBottom: 5 },
    setTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '600' },
    link: { color: theme.primaryLight, paddingVertical: 12 },
    input: { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg,
      borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, minHeight: 48 },
    card: { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1,
      borderRadius: 12, marginVertical: 8, padding: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    field: { flex: 1 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, minHeight: 44 },
    selected: { borderColor: theme.primary, backgroundColor: theme.mutedBg },
    action: { backgroundColor: theme.primary, borderRadius: 8, padding: 16, marginTop: 18, minHeight: 48 },
    actionText: { color: theme.white, textAlign: 'center', fontWeight: '600' },
  });
}
