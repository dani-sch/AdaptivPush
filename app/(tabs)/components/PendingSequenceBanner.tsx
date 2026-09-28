import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { sequenceOperationStore } from '@/features/programs/sequenceOperationStore';
import sequenceService from '@/features/programs/sequenceService';
import { useTheme } from '@/contexts/ThemeContext';

export const PendingSequenceBanner: React.FC<{ ownerId: string | null | undefined; refreshProgram?: () => void }> = ({ ownerId, refreshProgram }) => {
  const { theme } = useTheme();
  const [pending, setPending] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ownerId) return setPending([]);
      const list = await sequenceOperationStore.listPendingForOwner(ownerId);
      if (mounted) setPending(list);
    })();
    return () => { mounted = false; };
  }, [ownerId]);

  if (!ownerId || pending.length === 0) return null;
  return (
    <View style={{ backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <Text style={{ color: theme.text, marginBottom: 8 }}>You have {pending.length} pending program operation(s) that need confirmation on the server.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={async () => {
          for (const p of pending) {
            try {
              if (p.kind === 'finalize_ad_hoc') {
                await sequenceService.finalizeAdHoc(p.ownerId, p.programId, p.payload as Record<string, unknown>);
              } else if (p.kind === 'initialize') {
                await sequenceService.initialize(p.ownerId, p.payload as Record<string, unknown>);
              } else {
                await sequenceService.change(p.ownerId, p.programId, p.payload as Record<string, unknown>);
              }
            } catch (e) {
              // individual failures left in store for later retry
            }
          }
          if (refreshProgram) refreshProgram();
          const list = await sequenceOperationStore.listPendingForOwner(ownerId);
          setPending(list);
        }} style={{ backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
          <Text style={{ color: theme.white, fontWeight: '700' }}>Retry pending</Text>
        </Pressable>
        <Pressable onPress={async () => {
          for (const p of pending) await sequenceOperationStore.removePending(p.ownerId, p.operationId);
          setPending([]);
        }} style={{ backgroundColor: theme.mutedBg, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PendingSequenceBanner;
