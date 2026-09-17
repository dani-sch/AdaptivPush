import React, { useEffect, useSyncExternalStore } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type AlertButton, type AlertOptions } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useTheme } from '@/contexts/ThemeContext';

export const MODAL_BACKDROP = 'transparent';
type Dialog = { title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions };
let queue: Dialog[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    queue = [...queue, { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options }]; emit();
  },
};
export function AppDialogHost() {
  const { theme } = useTheme();
  useEffect(() => {
    let owner: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (owner !== undefined && next !== owner) { queue = []; emit(); }
      owner = next;
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const dialog = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => queue[0], () => undefined);
  const close = (button?: AlertButton) => { queue = queue.slice(1); emit(); button?.onPress?.(); };
  const dismiss = () => { if (dialog?.options?.cancelable) { close(); dialog.options.onDismiss?.(); } };
  return <Modal visible={Boolean(dialog)} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={dismiss}>
    <View style={styles.backdrop} accessibilityViewIsModal aria-modal role="dialog">
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Dismiss dialog" accessible={false} />
      <View style={[styles.dialog, { backgroundColor: theme.surfaceBg, borderColor: theme.border }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{dialog?.title}</Text>
        {dialog?.message ? <Text style={{ color: theme.text }}>{dialog.message}</Text> : null}
        <ScrollView keyboardShouldPersistTaps="handled">{dialog?.buttons.map((button, index) => <Pressable key={index} accessibilityRole="button" onPress={() => close(button)} style={styles.button}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>{button.text}</Text>
        </Pressable>)}</ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: MODAL_BACKDROP, justifyContent: 'center', padding: 24 },
  dialog: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 14, maxHeight: '85%', boxShadow: '0 6px 24px rgba(0,0,0,0.2)' },
  title: { fontSize: 20, fontWeight: '700' }, button: { minHeight: 48, justifyContent: 'center' },
});
