import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { sequenceOperationStore } from '@/features/programs/sequenceOperationStore';
import sequenceOperations from '@/features/programs/sequenceService';
import { useTheme } from '@/contexts/ThemeContext';
import type { PendingSequenceOperation } from '@/features/programs/sequenceOperationStore';

export const PendingSequenceBanner: React.FC<{ ownerId: string | null | undefined; refreshProgram?: () => void }> = ({ ownerId, refreshProgram }) => {
  const { theme } = useTheme();
  const [pendingState, setPendingState] = useState<{ ownerId: string | null; operations: PendingSequenceOperation[] }>({
    ownerId: null, operations: [],
  });
  const [failureState, setFailureState] = useState<{ ownerId: string | null; message: string | null }>({
    ownerId: null, message: null,
  });
  const pending = pendingState.ownerId === ownerId ? pendingState.operations : [];
  const failure = failureState.ownerId === ownerId ? failureState.message : null;
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ownerId) return;
      try {
        const list = await sequenceOperationStore.listPendingForOwner(ownerId);
        if (mounted) setPendingState({ ownerId, operations: list });
      } catch (error) {
        if (mounted) setFailureState({ ownerId, message: error instanceof Error ? error.message : 'Pending operation recovery failed.' });
      }
    })();
    return () => { mounted = false; };
  }, [ownerId]);

  if (!ownerId || (pending.length === 0 && !failure)) return null;
  return (
    <View style={{ backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <Text style={{ color: theme.text, marginBottom: 8 }}>You have {pending.length} pending program operation(s) that need confirmation on the server.</Text>
      {pending.some(operation => operation.kind === 'finalize_day' || operation.kind === 'finalize_ad_hoc') && (
        <Text style={{ color: theme.text, marginBottom: 8 }}>
          A workout Finish may already have succeeded. Reopen its exact draft to verify and retry; do not start a replacement workout.
        </Text>
      )}
      {failure && <Text style={{ color: theme.text, marginBottom: 8 }}>{failure}</Text>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={async () => {
          setFailureState({ ownerId, message: null });
          for (const p of pending) {
            if (p.kind === 'finalize_day' || p.kind === 'finalize_ad_hoc') continue;
            try {
              if (p.kind === 'initialize') {
                await sequenceOperations.initialize(p.ownerId, p.payload);
              } else {
                await sequenceOperations.change(p.ownerId, p.programId, p.payload);
              }
            } catch (error) {
              setFailureState({ ownerId, message: error instanceof Error ? error.message : 'Program operation could not be confirmed.' });
            }
          }
          if (refreshProgram) refreshProgram();
          try {
            setPendingState({ ownerId, operations: await sequenceOperationStore.listPendingForOwner(ownerId) });
          } catch (error) {
            setFailureState({ ownerId, message: error instanceof Error ? error.message : 'Pending operation recovery failed.' });
          }
        }} style={{ backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
          <Text style={{ color: theme.white, fontWeight: '700' }}>Retry pending</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PendingSequenceBanner;
