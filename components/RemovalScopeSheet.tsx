import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MODAL_BACKDROP } from './ui/AppDialog';

export interface RemovalSelection {
  slotId: string;
  setId?: string;
  order?: number;
  label: string;
  recorded: boolean;
  futureCount: number;
  unavailableReason?: string;
}
export function RemovalScopeSheet({ selection, busy, onCancel, onConfirm }: {
  selection: RemovalSelection | null; busy?: boolean; onCancel: () => void; onConfirm: (wholeProgram: boolean) => void;
}) {
  const { theme } = useTheme();
  return <Modal visible={selection !== null} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={styles.backdrop} accessibilityViewIsModal aria-modal role="dialog">
      <Pressable accessible={false} style={StyleSheet.absoluteFill} disabled={busy} onPress={onCancel} />
      <View style={[styles.sheet, { backgroundColor: theme.surfaceBg, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>Remove {selection?.label}?</Text>
        {selection?.recorded ? <Text style={{ color: theme.text }}>Its recorded result will also be removed.</Text> : null}
        <Pressable accessibilityRole="button" style={styles.action} disabled={busy} onPress={() => onConfirm(false)}><Text style={{ color: theme.primary }}>This workout only</Text></Pressable>
        {(selection?.futureCount ?? 0) > 0 ? <Pressable accessibilityRole="button" style={styles.action} disabled={busy} onPress={() => onConfirm(true)}>
          <Text style={{ color: theme.primary }}>Whole program</Text>
          <Text style={{ color: theme.text }}>This workout and matching future workouts. Past workouts stay unchanged.</Text>
          <Text style={{ color: theme.text }}>{selection?.futureCount} future exercise prescriptions</Text>
        </Pressable> : <Text style={{ color: theme.text }}>{selection?.unavailableReason ?? 'No eligible future matches. Only this workout will change.'}</Text>}
        <Pressable accessibilityRole="button" style={styles.action} disabled={busy} onPress={onCancel}><Text style={{ color: theme.text }}>Cancel</Text></Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: MODAL_BACKDROP },
  sheet: { borderWidth: 1, borderRadius: 22, padding: 24, paddingBottom: 36, gap: 12, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' },
  title: { fontWeight: '700', fontSize: 20 }, action: { minHeight: 48, justifyContent: 'center', gap: 6 } });
