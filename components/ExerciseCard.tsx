import { exerciseLoadLabel, loadUnitLabel } from '@/features/workouts/loadPresentation';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '@/contexts/ThemeContext';
import type { MuscleGroup } from '@/types/program';
import { ExerciseInfoPanel } from './ExerciseInfoPanel';

export interface WorkoutSet {
    outcome?: 'performed' | 'skipped' | 'not_attempted';
    loadUnit?: string;
    loadKind?: string;
    id: string;
    weight: string;
    reps: string;
    rpe: string;
    logged: boolean;
    exerciseName?: string;
}

export interface Exercise {
    id: string;
    exerciseId?: string;
    name: string;
    prescription: string;
    sets: WorkoutSet[];
    completed: boolean;
    muscleGroup?: MuscleGroup;
    imageUrl?: string;
    description?: string;
    readOnly?: boolean;
    editingCompleted?: boolean;
    loadLabel?: string;
    loadSuggestion?: string;
}


interface ExerciseCardProps {
  exercise: Exercise;
  onUpdateSet: (setId: string, field: keyof WorkoutSet, value: string | boolean) => void;
  onToggleComplete: () => void;
  onPressHistory?: () => void;
  onPressSwap: () => void;
  onSetExercise?: (setId: string) => void;
  onRemoveSet?: (setId: string) => void;
  onRemoveExercise?: () => void;
  onAddSet?: () => void;
}
let openRow: SwipeableMethods | null = null;
function SetRow({ set, index, exercise, onUpdateSet, onSettings, onRemove }: {
  set: WorkoutSet; index: number; exercise: Exercise; onUpdateSet: ExerciseCardProps['onUpdateSet']; onSettings: () => void; onRemove?: () => void;
}) {
  const { theme } = useTheme();
  const swipe = useRef<SwipeableMethods>(null);
  const swiping = useRef(false);
  const [revealed, setRevealed] = useState(false);
  // Focusing a numeric input must not disable the entire row's pan gesture.
  // Swipeable's horizontal threshold separates a swipe from a tap to type.
  const canSwipe = Boolean(onRemove) && !exercise.readOnly;
  useEffect(() => { if (!canSwipe) swipe.current?.close(); }, [canSwipe]);
  useEffect(() => { const row = swipe.current; return () => { if (openRow === row) openRow = null; }; }, []);
  const open = () => { if (openRow !== swipe.current) openRow?.close(); openRow = swipe.current; };
  return <ReanimatedSwipeable ref={swipe} enabled={canSwipe}
    hitSlop={{ left: -24 }} dragOffsetFromRightEdge={24} rightThreshold={40} overshootRight={false} overshootLeft={false}
    enableTrackpadTwoFingerGesture onSwipeableOpenStartDrag={() => { swiping.current = true; open(); }} onSwipeableWillOpen={open}
    onSwipeableOpen={() => setRevealed(true)} onSwipeableClose={() => { swiping.current = false; setRevealed(false); }}
    renderRightActions={() => onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={'Remove set ' + (index + 1)}
      accessible={revealed} aria-hidden={!revealed} focusable={revealed} disabled={!revealed || exercise.readOnly} style={[styles.trash, { backgroundColor: theme.mutedBg }]}
      onPress={() => { swipe.current?.close(); onRemove(); }}><Ionicons name="trash-outline" size={22} color={theme.textPrimary} /></Pressable> : null}>
    <View style={{ backgroundColor: theme.cardBg }}>
      {set.exerciseName && set.exerciseName !== exercise.name ? <Pressable disabled={exercise.readOnly} onPress={onSettings} accessibilityRole="button"><Text style={{ color: theme.text, fontSize: 12 }}>{set.exerciseName}</Text></Pressable> : null}
      <View style={styles.row}>
        <Pressable style={styles.number} disabled={exercise.readOnly} onPress={onSettings} accessibilityRole="button"
          accessibilityLabel={'Set ' + (index + 1) + ' options'} accessibilityHint="Load settings, exercise correction and removal"
          accessibilityActions={onRemove ? [{ name: 'remove', label: 'Remove set' }] : []}
          onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'remove' && !exercise.readOnly) onRemove?.(); }}>
          <Text style={{ color: theme.text }}>{index + 1}</Text>
        </Pressable>
        {(['weight', 'reps', 'rpe'] as const).map(field => <View key={field} style={[styles.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.mutedBg, borderColor: theme.border }]}><TextInput
          style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 15, color: theme.textPrimary, minHeight: 34, padding: 0 }}
          accessibilityLabel={exercise.name + ', set ' + (index + 1) + ', ' + (field === 'weight' ? (set.loadKind ?? 'external') + ' load in ' + loadUnitLabel(set) : field)}
          editable={!exercise.readOnly && !(field === 'weight' && set.loadKind === 'bodyweight')}
          value={set[field]} onChangeText={value => onUpdateSet(set.id, field, value)} selectTextOnFocus
          onFocus={() => { openRow?.close(); }}
          keyboardType={field === 'reps' ? 'number-pad' : 'decimal-pad'} placeholder={field === 'weight' && set.loadKind === 'bodyweight' ? 'BW' : '—'} placeholderTextColor={theme.placeholder} />{field === 'weight' && set.loadKind !== 'bodyweight' ? <Text style={{ fontSize: 10, color: theme.text }}>{loadUnitLabel(set)}</Text> : null}</View>)}
        <Pressable style={[styles.check, { backgroundColor: set.logged ? theme.primary : theme.mutedBg, borderColor: theme.border }]}
          accessibilityRole="checkbox" aria-checked={set.logged} accessibilityLabel={exercise.name + ', set ' + (index + 1) + ' logged'} accessibilityState={{ checked: set.logged, disabled: exercise.readOnly }}
          disabled={exercise.readOnly} onPress={() => { if (!swiping.current) onUpdateSet(set.id, 'logged', !set.logged); }}>
          <Ionicons name="checkmark" size={18} color={set.logged ? theme.white : theme.placeholder} />
        </Pressable>
      </View>
    </View>
  </ReanimatedSwipeable>;
}
export default function ExerciseCard({ exercise, onUpdateSet, onPressHistory, onPressSwap, onSetExercise, onRemoveSet, onRemoveExercise, onAddSet }: ExerciseCardProps) {
  const { theme } = useTheme();
  const [menu, setMenu] = useState<string | null>(null);
  const selected = exercise.sets.find(set => set.id === menu);
  useEffect(() => { if (exercise.readOnly) void Promise.resolve().then(() => setMenu(null)); }, [exercise.readOnly]);
  const closeThen = (action?: () => void) => { setMenu(null); action?.(); };
  const button = (label: string, action: () => void) => <Pressable key={label} accessibilityRole="button" style={styles.menuAction} onPress={action}><Text style={{ color: theme.primary }}>{label}</Text></Pressable>;
  return <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
    <View style={styles.header}>
      <View style={{ flex: 1 }}><Text style={[styles.title, { color: theme.textPrimary }]}>{exercise.name}</Text><Text style={{ color: theme.text }}>{exercise.prescription}</Text>
        {exercise.loadSuggestion ? <Text style={{ color: theme.text, fontSize: 12 }}>{exercise.loadSuggestion}</Text> : null}</View>
      {!exercise.readOnly && onRemoveExercise ? <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={'Remove ' + exercise.name} onPress={onRemoveExercise}><Ionicons name="trash-outline" size={20} color={theme.text} /></Pressable> : null}
      <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={exercise.name + ' options'} onPress={() => setMenu('header')}><Ionicons name="ellipsis-horizontal" size={22} color={theme.text} /></Pressable>
    </View>
    <View style={styles.row}><View style={styles.number}><Text style={[styles.column, { color: theme.placeholder }]}>SET</Text></View>
      <Pressable style={{ flex: 1 }} disabled={exercise.readOnly} onPress={() => setMenu('loads')} accessibilityRole="button" accessibilityLabel="Load and unit settings"><Text style={[styles.column, { color: theme.placeholder }]}>{exerciseLoadLabel(exercise.sets)}</Text></Pressable>
      {['REPS', 'RPE'].map(label => <Text key={label} style={[styles.column, { flex: 1, color: theme.placeholder }]}>{label}</Text>)}<View style={{ width: 44 }} /></View>
    {exercise.sets.map((set, index) => <SetRow key={set.id} {...{ set, index, exercise, onUpdateSet }} onSettings={() => setMenu(set.id)} onRemove={onRemoveSet ? () => onRemoveSet(set.id) : undefined} />)}
    {!exercise.readOnly && onAddSet ? button('Add set', onAddSet) : null}
    <Modal visible={menu !== null} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => setMenu(null)}>
      <View style={styles.backdrop} accessibilityViewIsModal aria-modal role="dialog"><Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
        <View style={[styles.sheet, { backgroundColor: theme.surfaceBg, borderColor: theme.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{selected ? 'Set ' + (exercise.sets.indexOf(selected) + 1) : exercise.name}</Text>
            {menu === 'header' ? <>{onPressHistory ? button('History', () => closeThen(onPressHistory)) : null}
              {!exercise.readOnly ? button('Swap exercise', () => closeThen(onPressSwap)) : null}
              {(exercise.imageUrl || exercise.description) ? <ExerciseInfoPanel imageUrl={exercise.imageUrl} description={exercise.description} /> : null}</> : menu === 'loads' ?
              exercise.sets.map((set, i) => button('Set ' + (i + 1) + ' · ' + (set.loadKind ?? 'external') + ' · ' + (set.loadUnit ?? 'lb'), () => setMenu(set.id))) : selected ? <>
                <Text style={{ color: theme.text }}>Load type</Text>
                {(['external', 'assistance', 'bodyweight'] as const).map(kind => button((kind === selected.loadKind ? '✓ ' : '') + kind, () => onUpdateSet(selected.id, 'loadKind', kind)))}
                {selected.loadKind !== 'bodyweight' ? <><Text style={{ color: theme.text }}>Measurement unit</Text>{(['lb','kg'] as const).map(unit => button((selected.loadUnit === unit ? '✓ ' : '') + unit, () => onUpdateSet(selected.id, 'loadUnit', unit)))}</> : null}
                {onSetExercise ? button('Change performed exercise', () => closeThen(() => onSetExercise(selected.id))) : null}
                {onRemoveSet ? button('Remove set', () => closeThen(() => onRemoveSet(selected.id))) : null}
              </> : null}
            {button('Close', () => setMenu(null))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12 }, header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 4 }, number: { width: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  column: { fontSize: 11, textAlign: 'center', fontWeight: '700', textAlignVertical: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderRadius: 10, textAlign: 'center', fontSize: 15, padding: 4 },
  check: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  trash: { width: 64, justifyContent: 'center', alignItems: 'center' }, menuAction: { minHeight: 48, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }, sheet: { borderWidth: 1, borderRadius: 22, maxHeight: '85%', padding: 24, paddingBottom: 36, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' },
});
