import { haptic, Haptics } from "@/utils/haptic";
import { ExerciseHistoryModal } from "@/components/ExerciseHistoryModal";
import { SwapExerciseModal } from "@/components/SwapExerciseModal";
import { useCurrentProgram } from "@/hooks/useCurrentProgram";
import type { CurrentProgram, ProgramWorkout } from "@/types/program";
import { getPersistedSessionOwnerId, supabase } from "@/utils/supabase";
import { notifyPRCelebration } from "@/utils/notifications";
import { createOperationId } from "@/features/kernel/operationId";
import {
  amendWorkoutExercise,
  createWorkoutDraft,
  updateWorkoutSet,
  validateWorkoutDraft,
  type WorkoutDraft,
} from "@/features/workouts/contracts";
import { finalizeWorkout } from "@/features/workouts/commands";
import { externalActualSets } from "@/features/workouts/actualLoads";
import { workoutDraftStore } from "@/features/workouts/draftStore";
import {
  draftLookupForRoute,
  resolveProgramWorkout,
  workoutAvailability,
  type WorkoutRouteTarget,
} from "@/features/workouts/routeResolution";
import { workoutRepository } from "@/features/workouts/repository";
import { reviseProgramExercise } from '@/features/programs/commands';
import { programRepository } from '@/features/programs/repository';
import {
  type PendingWorkoutSwap,
  workoutSwapOperationStore,
} from '@/features/workouts/swapOperationStore';
import { reportSupabaseFailure, supabaseUserMessage } from "@/utils/supabaseResilience";
import { workoutEntryIssue } from '@/features/workouts/routeResolution';
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ExerciseCard, { Exercise, WorkoutSet } from "../components/ExerciseCard";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/constants/themes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function draftToExercises(draft: WorkoutDraft, workout?: ProgramWorkout): Exercise[] {
  return draft.slots.map((slot) => {
    const current = workout?.exercises.find((exercise) => exercise.stableSlotId === slot.slotId);
    const frozen = draft.frozenPrescription.slots.find((candidate) => candidate.slotId === slot.slotId);
    const originalExerciseName = frozen?.exerciseName ?? current?.name ?? 'the original exercise';
    const firstSet = slot.sets[0];
    const frozenRepDisplay = firstSet
      ? firstSet.plannedRepsMin === firstSet.plannedRepsMax
        ? String(firstSet.plannedRepsMin)
        : `${firstSet.plannedRepsMin}–${firstSet.plannedRepsMax}`
      : 'prescribed reps';
    const repDisplay = current?.reps?.replace("-", "–") ?? frozenRepDisplay;
    return {
      id: slot.slotId,
      exerciseId: slot.actualExerciseId,
      name: slot.actualExerciseId !== slot.prescribedExerciseId
        ? slot.replacementExerciseName ?? "Replacement exercise"
        : current?.name ?? slot.exerciseName ?? "Prescribed exercise",
      prescription: `${slot.prescribedSetCount}×${repDisplay}`,
      readOnly: Boolean(draft.finalizationEndedAt) || draft.lifecycle === 'finalized',
      loadLabel: firstSet?.loadUnit === 'kg' ? 'KG' : firstSet?.loadUnit === 'lb' ? 'LBS' : 'LOAD',
      muscleGroup: current?.muscleGroup,
      imageUrl: current?.imageUrl,
      description: current?.description,
      sets: slot.sets.map((set) => ({
        id: set.setId,
        weight: set.enteredLoadText,
        reps: set.enteredRepsText,
        rpe: set.enteredRpeText,
        logged: set.logged,
        exerciseName: set.actualExerciseId === slot.actualExerciseId
          ? slot.replacementExerciseName ?? current?.name ?? slot.exerciseName
          : originalExerciseName,
      })),
      completed: slot.sets.length > 0 && slot.sets.every((set) => set.logged),
      loadSuggestion: slot.loadSuggestion
        ? `Previous ${slot.loadSuggestion.kind === 'assistance' ? 'assistance' : 'load'} for this exercise: ${slot.loadSuggestion.value} ${slot.loadSuggestion.unit}`
        : undefined,
    };
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type WorkoutSwapResult = {
  currentDraft: 'saved';
  futureProgram: 'not_requested' | 'revised' | 'failed';
  futureMessage?: string;
};

// ─── Finish Modal ─────────────────────────────────────────────────────────────

const FinishModal: React.FC<{
  visible: boolean;
  elapsed: number;
  completedCount: number;
  totalCount: number;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  styles: ReturnType<typeof createStyles>;
}> = ({
  visible,
  elapsed,
  completedCount,
  totalCount,
  saving,
  onConfirm,
  onCancel,
  styles,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Finish Workout?</Text>
        <Text style={styles.modalBody}>
          {completedCount}/{totalCount} exercises completed ·{" "}
          {formatTime(elapsed)}
        </Text>
        <View style={styles.modalButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.modalCancel,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onCancel}
          >
            <Text style={styles.modalCancelText}>Keep Going</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.modalConfirm,
              (pressed || saving) && { opacity: 0.8 },
            ]}
            onPress={saving ? undefined : onConfirm}
            disabled={saving}
          >
            <Text style={styles.modalConfirmText}>
              {saving ? "Saving…" : "Finish"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NextWorkoutScreen() {
  const params = useLocalSearchParams<{
    workoutId?: string;
    programId?: string;
    revisionId?: string;
    stableDayId?: string;
    programDayId?: string;
  }>();
  const { program, loading, refresh, swapExercise, failureCategory } = useCurrentProgram();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const routeTarget = useMemo<WorkoutRouteTarget>(() => ({
    workoutId: params.workoutId,
    programId: params.programId,
    revisionId: params.revisionId,
    stableDayId: params.stableDayId,
    programDayId: params.programDayId,
  }), [params.programDayId, params.programId, params.revisionId, params.stableDayId, params.workoutId]);
  const programWorkout = useMemo(
    () => resolveProgramWorkout(program, routeTarget),
    [program, routeTarget],
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutName, setWorkoutName] = useState("Workout");
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [resolutionAttempt, setResolutionAttempt] = useState(0);
  const [resolvedTargetKey, setResolvedTargetKey] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [pendingSwap, setPendingSwap] = useState<PendingWorkoutSwap | null>(null);
  const [prExercises, setPrExercises] = useState<string[]>([]); // exercise names with new PRs
  const [showPrModal, setShowPrModal] = useState(false);
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(
    null,
  );
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const hydratedTargetRef = useRef<string | null>(null);
  const resolutionTargetKey = useMemo(
    () => JSON.stringify([
      ownerId,
      routeTarget.programId,
      routeTarget.revisionId,
      routeTarget.stableDayId,
      routeTarget.programDayId,
      routeTarget.workoutId,
    ]),
    [ownerId, routeTarget],
  );

  const persistDraft = (nextDraft: WorkoutDraft) => {
    const save = persistQueueRef.current
      .catch(() => undefined)
      .then(() => workoutDraftStore.save(nextDraft));
    persistQueueRef.current = save;
    return save;
  };

  useEffect(() => {
    let mounted = true;
    void getPersistedSessionOwnerId().then((persistedOwnerId) => {
      if (!mounted || !persistedOwnerId) return;
      setOwnerId(persistedOwnerId);
      setAuthLoading(false);
    }).catch(() => undefined);
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setOwnerId(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setOwnerId(session?.user.id ?? null);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Resolve the exact owner/revision/stable-day target. A local draft may win while
  // the network-backed program is still loading, but an unrelated workout never does.
  useEffect(() => {
    let cancelled = false;
    if (hydratedTargetRef.current !== resolutionTargetKey) {
      hydratedTargetRef.current = resolutionTargetKey;
      setDraft(null);
      setExercises([]);
      setResolutionError(null);
      setSyncMessage(null);
      setDraftLoading(true);
      setResolvedTargetKey(null);
    }
    if (authLoading) return () => { cancelled = true; };
    (async () => {
      let settled = false;
      try {
        if (!ownerId) throw new Error('Sign in to restore this workout draft.');
        const lookup = draftLookupForRoute(routeTarget, programWorkout ?? undefined);
        const stored = await workoutDraftStore.loadMatching(ownerId, lookup);
        if (stored) {
          const validation = validateWorkoutDraft(stored);
          if (!validation.ok) {
            throw new Error(`Stored workout draft is invalid. ${validation.errors.join(' ')}`);
          }
          settled = true;
          if (cancelled) return;
          setDraft(stored);
          setElapsed(Math.max(0, Math.floor((Date.now() - new Date(stored.startedAt).getTime()) / 1000)));
          setExercises(draftToExercises(stored, programWorkout ?? undefined));
          setWorkoutName(stored.workoutName);
          setResolutionError(null);
          const recoveredSwap = await workoutSwapOperationStore.load(stored.ownerId, stored.draftId);
          if (!cancelled) setPendingSwap(recoveredSwap);
          if (stored.lifecycle === 'finalized') setSyncMessage('This workout is already finalized.');
          return;
        }
        if (loading) return;
        settled = true;
        if (failureCategory) throw new Error(supabaseUserMessage({ category: failureCategory, retryable: false }, 'The plan could not be loaded. Check your connection and refresh.'));
        const entryIssue = workoutEntryIssue(program, programWorkout);
        if (entryIssue) throw new Error(entryIssue);
        if (!program || !programWorkout?.prescriptionRevisionId || !programWorkout.stableDayId) {
          throw new Error('Return to Plan and select a current workout.');
        }
        if (programWorkout.exercises.length === 0) {
          throw new Error('This requested workout has no exercise prescription. Refresh the plan and try again.');
        }
        const nextDraft = createWorkoutDraft({
          ownerId,
          programId: program.id,
          programDayId: programWorkout.id,
          stableDayId: programWorkout.stableDayId,
          prescriptionRevisionId: programWorkout.prescriptionRevisionId,
          workoutName: programWorkout.name,
          startedAt: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          slots: programWorkout.exercises.map((exercise, slotIndex) => {
            if (!exercise.exerciseId) throw new Error(`${exercise.name} has no catalog exercise identity.`);
            const repMatch = (exercise.reps ?? '8-12').match(/(\d+)\D+(\d+)/);
            const min = Number(repMatch?.[1] ?? 8);
            const max = Number(repMatch?.[2] ?? min);
            const setCount = exercise.sets ?? 3;
            return {
              slotId: exercise.stableSlotId ?? exercise.id,
              prescribedExerciseId: exercise.exerciseId,
              exerciseName: exercise.name,
              order: slotIndex + 1,
              prescribedSetCount: setCount,
              sets: Array.from({ length: setCount }, (_, setIndex) => {
                const plannedLoad = exercise.perSetWeights?.[setIndex] ?? exercise.weight ?? null;
                return {
                  setId: createOperationId(),
                  order: setIndex + 1,
                  plannedRepsMin: min,
                  plannedRepsMax: max,
                  plannedLoad,
                  loadKind: exercise.loadKind ?? (exercise.equipment === 'Bodyweight' ? 'bodyweight' : plannedLoad === null ? 'unknown' : 'external'),
                  loadUnit: exercise.loadUnit ?? (plannedLoad === null ? 'none' : 'lb'),
                  loadSide: exercise.loadSide ?? 'unknown',
                };
              }),
            };
          }),
        });
        await workoutDraftStore.save(nextDraft);
        if (cancelled) return;
        setDraft(nextDraft);
        setElapsed(Math.max(0, Math.floor((Date.now() - new Date(nextDraft.startedAt).getTime()) / 1000)));
        setExercises(draftToExercises(nextDraft, programWorkout));
        setWorkoutName(nextDraft.workoutName);
        setResolutionError(null);
      } catch (error) {
        settled = true;
        if (!cancelled) setResolutionError(error instanceof Error ? error.message : 'Workout draft is unavailable.');
      } finally {
        if (!cancelled && settled) {
          setResolvedTargetKey(resolutionTargetKey);
          setDraftLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, failureCategory, loading, ownerId, program, programWorkout, resolutionAttempt, resolutionTargetKey, routeTarget]);

  const availability = workoutAvailability({
    authLoading,
    programLoading: loading || draftLoading || resolvedTargetKey !== resolutionTargetKey,
    program,
    programWorkout,
    draft,
    ownerId,
    route: routeTarget,
  });
  const canFinishWorkout = availability === 'ready'
    && draft?.ownerId === ownerId
    && draft.lifecycle !== 'finalized'
    && !saving;

  const programForSwap = useMemo<CurrentProgram | null>(() => {
    if (!program || !draft) return null;
    const activeWorkout = programWorkout
      ?? program.workouts.find((workout) => workout.stableDayId === draft.stableDayId);
    return {
      ...program,
      workouts: [
        {
          id: activeWorkout?.id ?? draft.programDayId,
          stableDayId: draft.stableDayId,
          prescriptionRevisionId: activeWorkout?.prescriptionRevisionId ?? draft.prescriptionRevisionId,
          name: draft.workoutName,
          day: activeWorkout?.day ?? 'Current workout',
          estimatedTime: activeWorkout?.estimatedTime ?? 0,
          exercises: exercises.map((ex) => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            equipment: undefined,
          })),
        },
      ],
    };
  }, [draft, program, programWorkout, exercises]);

  useEffect(() => {
    if (!draft || draft.lifecycle === 'finalized') return;
    intervalRef.current = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(draft.startedAt).getTime()) / 1000))),
      1000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [draft]);

  const completedCount = exercises.filter((e) => e.completed).length;

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof WorkoutSet,
    value: string | boolean,
  ) => {
    if (!draft || draft.finalizationEndedAt || saving) return;
    const asNumber = (input: string): number | null => input.trim() === '' ? null : Number(input);
    const update = field === 'weight'
      ? { enteredLoadText: String(value), load: asNumber(String(value)) }
      : field === 'reps'
        ? { enteredRepsText: String(value), reps: asNumber(String(value)) }
        : field === 'rpe'
          ? { enteredRpeText: String(value), rpe: asNumber(String(value)) }
          : { logged: Boolean(value), loggedAt: value ? new Date().toISOString() : null };
    const nextDraft = updateWorkoutSet(draft, { setId, ...update });
    setDraft(nextDraft);
    setExercises(draftToExercises(nextDraft, programWorkout ?? undefined));
    persistDraft(nextDraft);
  };

  const toggleExerciseComplete = (exerciseId: string) => {
    if (!draft || draft.finalizationEndedAt || saving) return;
    const slot = draft.slots.find((candidate) => candidate.slotId === exerciseId);
    if (!slot) return;
    const shouldLog = !slot.sets.every((set) => set.logged);
    let nextDraft = draft;
    for (const set of slot.sets) {
      if (!set.actualReps || set.actualReps <= 0) continue;
      nextDraft = updateWorkoutSet(nextDraft, {
        setId: set.setId,
        logged: shouldLog,
        loggedAt: shouldLog ? new Date().toISOString() : null,
      });
    }
    setDraft(nextDraft);
    setExercises(draftToExercises(nextDraft, programWorkout ?? undefined));
    persistDraft(nextDraft);
  };

  const applyWorkoutSwap = async ({
    exerciseId,
    replacement,
    scope,
  }: {
    exerciseId: string;
    replacement: ProgramWorkout["exercises"][number];
    scope: 'workout_only' | 'rest_of_program';
  }): Promise<WorkoutSwapResult | null> => {
    if (!draft) throw new Error('Workout draft is unavailable.');
    if (draft.finalizationEndedAt || saving) throw new Error('Retry synchronization before changing this submitted workout.');
    const replacementExerciseId = replacement.exerciseId ?? replacement.id;
    const slot = draft.slots.find((candidate) => candidate.slotId === exerciseId);
    if (!slot || !replacementExerciseId) throw new Error('Replacement identity is unavailable.');
    if (slot.sets.every((set) => set.logged)) {
      throw new Error('All sets for this exercise are already performed. Use Edit workout after finishing to correct history.');
    }
    const nextDraft = amendWorkoutExercise(draft, {
      slotId: exerciseId,
      replacementExerciseId,
      replacementName: replacement.name,
      amendedAt: new Date().toISOString(),
      loadSuggestion: replacement.loadSuggestion,
      replacementLoadKind: replacement.equipment === 'Bodyweight' ? 'bodyweight' : replacement.loadSuggestion?.kind,
    });
    await persistDraft(nextDraft);
    setDraft(nextDraft);
    setExercises(draftToExercises(nextDraft, programWorkout ?? undefined));
    setSyncMessage('Saved for this workout on this device. Logged sets remain unchanged.');

    if (scope === 'rest_of_program') {
      const activeWorkout = program?.workouts.find(
        (workout) => workout.stableDayId === draft.stableDayId,
      );
      const original = activeWorkout?.exercises.find(
        (exercise) => exercise.stableSlotId === exerciseId || exercise.id === exerciseId,
      );
      if (!original) {
        const message = 'The active program changed and no longer contains this stable exercise slot.';
        setSyncMessage(`Current workout swap saved. Future program update failed: ${message}`);
        return { currentDraft: 'saved', futureProgram: 'failed', futureMessage: message };
      }
      const request = {
        programId: program!.id,
        expectedRevision: program!.currentRevision,
        expectedRevisionId: program!.currentRevisionId!,
        currentStableDayId: draft.stableDayId,
        currentStableSlotId: slot.slotId,
        originalExerciseId: original.exerciseId!,
        replacementExerciseId,
        scope: 'future_after_current' as const,
      };
      const pending: PendingWorkoutSwap = {
        ownerId: draft.ownerId,
        draftId: draft.draftId,
        slotId: slot.slotId,
        request,
        original,
        replacement,
        currentSavedAt: new Date().toISOString(),
        lastError: null,
      };
      await workoutSwapOperationStore.save(pending);
      setPendingSwap(pending);
      try {
        const futureOutcome = await swapExercise({
          exerciseId: original?.id ?? exerciseId,
          replacement,
          scope: 'rest_of_program',
          startedWorkout: true,
        });
        if (!futureOutcome) throw new Error('The program update was not confirmed.');
        setSyncMessage('Saved remotely for this workout and later uncompleted occurrences.');
        await workoutSwapOperationStore.remove(draft.ownerId, draft.draftId);
        setPendingSwap(null);
        return { currentDraft: 'saved', futureProgram: 'revised' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The future program revision was not updated.';
        const failedPending = { ...pending, lastError: message };
        await workoutSwapOperationStore.save(failedPending);
        setPendingSwap(failedPending);
        setSyncMessage(`Saved for this workout on this device. Program update pending: ${message}`);
        return { currentDraft: 'saved', futureProgram: 'failed', futureMessage: message };
      }
    }
    return { currentDraft: 'saved', futureProgram: 'not_requested' };
  };

  const retryPendingSwap = async () => {
    if (!pendingSwap || !ownerId || pendingSwap.ownerId !== ownerId) return;
    setSaving(true);
    const outcome = await reviseProgramExercise(programRepository, ownerId, pendingSwap.request);
    if ('receipt' in outcome) {
      await workoutSwapOperationStore.remove(pendingSwap.ownerId, pendingSwap.draftId);
      setPendingSwap(null);
      setSyncMessage('Program update confirmed saved remotely.');
      await refresh();
    } else {
      const message = outcome.status === 'validation' ? outcome.errors.join(' ') : outcome.message;
      const next = { ...pendingSwap, lastError: message };
      await workoutSwapOperationStore.save(next);
      setPendingSwap(next);
      setSyncMessage(`Program update still pending: ${message}`);
    }
    setSaving(false);
  };

  const keepThisWorkoutOnly = async () => {
    if (!pendingSwap || !ownerId || pendingSwap.ownerId !== ownerId) return;
    setSaving(true);
    const reconciled = await reviseProgramExercise(programRepository, ownerId, pendingSwap.request);
    if (reconciled.status === 'validation') {
      await workoutSwapOperationStore.remove(pendingSwap.ownerId, pendingSwap.draftId);
      setPendingSwap(null);
      setSyncMessage('Kept for this workout only. No later prescriptions changed.');
      setSaving(false);
      return;
    }
    if (!('receipt' in reconciled)) {
      const message = reconciled.message;
      setSyncMessage(`Could not safely keep this workout only until the server result is known: ${message}`);
      setSaving(false);
      return;
    }
    const reverseRequest = {
      ...pendingSwap.request,
      expectedRevision: reconciled.receipt.revision,
      expectedRevisionId: reconciled.receipt.revisionId,
      originalExerciseId: pendingSwap.request.replacementExerciseId,
      replacementExerciseId: pendingSwap.request.originalExerciseId,
    };
    const reversePending = { ...pendingSwap, request: reverseRequest, lastError: null };
    await workoutSwapOperationStore.save(reversePending);
    setPendingSwap(reversePending);
    const reversed = await reviseProgramExercise(programRepository, ownerId, reverseRequest);
    if ('receipt' in reversed) {
      await workoutSwapOperationStore.remove(pendingSwap.ownerId, pendingSwap.draftId);
      setPendingSwap(null);
      setSyncMessage('Kept for this workout only. Later prescriptions are unchanged.');
      await refresh();
    } else {
      const message = reversed.status === 'validation' ? reversed.errors.join(' ') : reversed.message;
      const failed = { ...reversePending, lastError: message };
      await workoutSwapOperationStore.save(failed);
      setPendingSwap(failed);
      setSyncMessage(`Current workout remains saved. Restoring later prescriptions is pending: ${message}`);
    }
    setSaving(false);
  };

  const handleFinish = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowFinishModal(false);
    setSaving(true);

    try {
      const {
        data: { session },
        error: authErr,
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (authErr || !user) throw new Error("Not signed in");
      if (!draft || draft.ownerId !== user.id) throw new Error('Workout draft is unavailable for this account.');
      await persistQueueRef.current;
      const outcome = await finalizeWorkout(
        workoutRepository,
        workoutDraftStore,
        draft,
        new Date().toISOString(),
      );
      const submittedDraft = await workoutDraftStore.load(draft.ownerId, draft.programDayId);
      if (submittedDraft?.draftId === draft.draftId) setDraft(submittedDraft);
      if (outcome.status === 'validation') {
        setSaving(false);
        setSyncMessage(outcome.errors.join(' '));
        Alert.alert('Check your workout', outcome.errors.join('\n'));
        return;
      }
      if (outcome.status === 'pending' || outcome.status === 'conflict' || outcome.status === 'unavailable') {
        setSaving(false);
        setSyncMessage(outcome.message);
        Alert.alert(
          outcome.status === 'pending' ? 'Workout awaiting sync' : 'Workout needs attention',
          outcome.message,
        );
        return;
      }
      const receipt = outcome.receipt;
      setDraft({ ...draft, lifecycle: 'finalized', finalizedReceipt: receipt });
      setSyncMessage(
        receipt.completionClass === 'partial'
          ? 'Workout finalized as partial. It will not count as full prescription fulfillment.'
          : 'Workout synchronized and finalized.',
      );

      // ── PR Detection ──────────────────────────────────────────────────────
      // For each exercise, find the best weight×reps set just saved and compare
      // against the user's all-time best for that exercise.
      const newPrNames: string[] = [];
      const newPrs: { name: string; weight: number; reps: number }[] = [];
      try {
        for (const ex of outcome.status === 'finalized' ? exercises : []) {
          if (!ex.exerciseId) continue;
          const loggedSets = externalActualSets(draft, ex.exerciseId);
          if (loggedSets.length === 0) continue;

          // Best set from this workout (highest weight, tiebreak by reps)
          let bestWeight = 0;
          let bestReps = 0;
          for (const s of loggedSets) {
            const w = s.weightLb;
            const r = s.reps;
            if (w > bestWeight || (w === bestWeight && r > bestReps)) {
              bestWeight = w;
              bestReps = r;
            }
          }
          if (bestWeight <= 0) continue;

          // Check previous best from personal_records
          const { data: prevBest } = await supabase
            .from("personal_records")
            .select("weight_lb, reps")
            .eq("user_id", user.id)
            .eq("exercise_id", ex.exerciseId)
            .order("weight_lb", { ascending: false })
            .order("reps", { ascending: false })
            .limit(1);

          const prev = prevBest?.[0];
          const isNewPr =
            !prev ||
            bestWeight > (prev.weight_lb ?? 0) ||
            (bestWeight === (prev.weight_lb ?? 0) && bestReps > (prev.reps ?? 0));

          if (isNewPr) {
            const { error: prInsertErr } = await supabase.from("personal_records").insert({
              user_id: user.id,
              exercise_id: ex.exerciseId,
              weight_lb: bestWeight,
              reps: bestReps,
              achieved_at: new Date().toISOString(),
              session_id: receipt.sessionId,
            });
            if (prInsertErr) {
              console.warn(`[PR] Insert failed for ${ex.name}:`, prInsertErr.message);
            } else {
              newPrNames.push(ex.name);
              newPrs.push({ name: ex.name, weight: bestWeight, reps: bestReps });
            }
          }
        }
      } catch (prErr) {
        console.warn("[handleFinish] PR detection failed:", prErr);
      }

      if (newPrs.length > 0) {
        void notifyPRCelebration(newPrs);
      }

      // PR/progression/analytics work is queued from the durable receipt and cannot roll back capture.

      setSaving(false);

      void haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

      if (newPrNames.length > 0) {
        setPrExercises(newPrNames);
        setShowPrModal(true);
      } else {
        router.back();
      }
    } catch (err) {
      reportSupabaseFailure('workout.finish', err);
      setSaving(false);
      Alert.alert(
        "Save Failed",
        "Could not save your workout. Please try again.",
        [
          { text: "Retry", onPress: () => handleFinish() },
          { text: "Keep draft", onPress: () => router.back() },
        ],
      );
    }
  };

  if (availability === 'unavailable') {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.unavailableTitle}>Workout unavailable</Text>
          <Text style={styles.unavailableText}>
            {resolutionError ?? 'This requested workout is stale or malformed. It was not replaced with a different workout.'}
          </Text>
          <View style={styles.unavailableActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setDraftLoading(true);
                setResolutionError(null);
                void refresh().finally(() => setResolutionAttempt((attempt) => attempt + 1));
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry requested workout"
            >
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
            <Pressable style={styles.finishButton} onPress={() => router.replace('/plan')} accessibilityRole="button">
              <Text style={styles.finishButtonText}>Return to Plan</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (availability === 'loading' && exercises.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{workoutName}</Text>
            <Text style={styles.headerSubtitle}>
              {completedCount}/{exercises.length} done
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${
                  exercises.length > 0
                    ? (completedCount / exercises.length) * 100
                    : 0
                }%`,
              },
            ]}
          />
        </View>

        {/* Exercise list */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {syncMessage && (
            <View style={styles.syncBanner} accessibilityLiveRegion="polite">
              <Text style={styles.syncBannerText}>{syncMessage}</Text>
            </View>
          )}
          {pendingSwap ? (
            <View style={styles.pendingSwapActions} accessibilityRole="summary">
              <Text style={styles.syncBannerText}>This workout is saved locally. The rest-of-program update is not yet confirmed.</Text>
              <View style={styles.unavailableActions}>
                <Pressable style={styles.secondaryButton} onPress={() => void retryPendingSwap()} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Retry</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void keepThisWorkoutOnly()} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Keep this workout only</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onUpdateSet={(setId, field, value) =>
                updateSet(exercise.id, setId, field, value)
              }
              onToggleComplete={() => toggleExerciseComplete(exercise.id)}
              onPressHistory={() => {
                setHistoryExerciseId(exercise.exerciseId ?? null);
                setHistoryExerciseName(exercise.name);
              }}
              onPressSwap={() => setSwapTargetId(exercise.id)}
            />
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.finishButton,
              !canFinishWorkout && draft?.lifecycle !== 'finalized' && styles.finishButtonDisabled,
              pressed && (canFinishWorkout || draft?.lifecycle === 'finalized') && { opacity: 0.85 },
            ]}
            onPress={() => {
              if (draft?.lifecycle === 'finalized' && draft.finalizedReceipt?.sessionId) {
                router.push({ pathname: '/edit-workout', params: { sessionId: draft.finalizedReceipt.sessionId } });
              } else if (canFinishWorkout) setShowFinishModal(true);
            }}
            disabled={!canFinishWorkout && draft?.lifecycle !== 'finalized'}
            accessibilityRole="button"
            accessibilityLabel={draft?.lifecycle === 'finalized' ? 'Edit completed workout' : 'Finish workout'}
          >
            <Text style={styles.finishButtonText}>
              {draft?.lifecycle === 'finalized' ? 'Edit workout' : draft?.finalizationEndedAt ? 'Retry Sync' : 'Finish Workout'}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Floating timer */}
        <View style={styles.timerBubble} pointerEvents="none">
          <Ionicons name="timer-outline" size={14} color={theme.text} />
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>
      </KeyboardAvoidingView>

      <FinishModal
        visible={showFinishModal}
        elapsed={elapsed}
        completedCount={completedCount}
        totalCount={exercises.length}
        saving={saving}
        onConfirm={handleFinish}
        onCancel={() => setShowFinishModal(false)}
        styles={styles}
      />

      {/* PR Celebration Modal */}
      <Modal visible={showPrModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>🏆</Text>
            <Text style={styles.modalTitle}>
              {prExercises.length === 1 ? "New PR!" : `${prExercises.length} New PRs!`}
            </Text>
            <View style={{ gap: 4, marginBottom: 20 }}>
              {prExercises.map((name) => (
                <Text key={name} style={[styles.modalBody, { textAlign: "center", marginBottom: 0 }]}>
                  {name}
                </Text>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [{
                backgroundColor: theme.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }, pressed && { opacity: 0.8 }]}
              onPress={() => { setShowPrModal(false); router.back(); }}
            >
              <Text style={styles.modalConfirmText}>Nice!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Swap Exercise Modal */}
      <Modal visible={swapTargetId !== null} transparent animationType="slide">
        {swapTargetId !== null && programForSwap !== null && (
          <SwapExerciseModal
            program={programForSwap}
            exerciseId={swapTargetId}
            context="workout"
            onClose={() => setSwapTargetId(null)}
            onSwap={async (swapArgs) => {
                void haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
                const outcome = await applyWorkoutSwap(swapArgs);
                return outcome !== null;
            }}
          />
        )}
      </Modal>

      {/* Exercise History Modal */}
      <Modal
        visible={historyExerciseId !== null}
        transparent
        animationType="slide"
      >
        {historyExerciseId !== null && historyExerciseName !== null && (
          <ExerciseHistoryModal
            exerciseId={historyExerciseId}
            exerciseName={historyExerciseName}
            onClose={() => {
              setHistoryExerciseId(null);
              setHistoryExerciseName(null);
            }}
          />
        )}
      </Modal>

      {/* Saving overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.savingText}>Saving workout…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundDark,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "500",
    },
    unavailableTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: "700" },
    unavailableText: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      maxWidth: 360,
      paddingHorizontal: 20,
    },
    unavailableActions: {
      width: '100%',
      maxWidth: 360,
      paddingHorizontal: 20,
      gap: 10,
    },
    secondaryButton: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.mutedBg,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 2,
    },
    headerRight: {
      width: 36,
    },
    progressBarTrack: {
      height: 3,
      backgroundColor: theme.border,
      marginHorizontal: 16,
      borderRadius: 2,
      marginBottom: 8,
    },
    progressBarFill: {
      height: 3,
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 120,
    },
    syncBanner: {
      backgroundColor: theme.cardBg,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    syncBannerText: { color: theme.text, fontSize: 13, lineHeight: 18 },
    pendingSwapActions: {
      backgroundColor: theme.cardBg,
      borderColor: theme.secondaryLight,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 10,
      marginBottom: 10,
    },
    finishButton: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    finishButtonDisabled: {
      backgroundColor: theme.buttonDisabled,
      opacity: 0.7,
    },
    finishButtonText: {
      color: theme.white,
      fontSize: 17,
      fontWeight: "700",
    },
    timerBubble: {
      position: "absolute",
      bottom: 32,
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.cardBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
    timerText: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalContainer: {
      backgroundColor: theme.cardBg,
      borderRadius: 24,
      padding: 28,
      width: "100%",
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalTitle: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    modalBody: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: 28,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      backgroundColor: theme.mutedBg,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalCancelText: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    modalConfirm: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalConfirmText: {
      color: theme.white,
      fontSize: 16,
      fontWeight: "700",
    },
    savingOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      zIndex: 999,
    },
    savingText: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
}
