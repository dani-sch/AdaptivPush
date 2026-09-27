import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { buildScheduleRevision, createScheduleRevisionCommand, type ScheduleRevisionPayload } from '@/features/scheduling/reviseSchedule';
import { scheduleOperationStore } from '@/features/scheduling/operationStore';
import { createScheduleRepository, scheduleWriterEnabled, type ScheduleRead, type ScheduledDay } from '@/features/scheduling/repository';
import { supabase } from '@/utils/supabase';
import { reportSupabaseFailure } from '@/utils/supabaseResilience';

const repository = createScheduleRepository(supabase);
const command = createScheduleRevisionCommand(repository, scheduleOperationStore);

type Action = 'move' | 'skip' | 'replace_with_rest';

interface Props {
  ownerId: string;
  programId: string;
  programRevisionId: string;
  schedule: Extract<ScheduleRead, { state: 'ready' }>;
  onAccepted(): void;
  onRecoveryNeeded(): void;
}

function label(day: ScheduledDay): string {
  return `${day.localDate ?? 'No date'} · ${day.kind} · ${day.status}`;
}

export function ProgramScheduleDeviationControls({
  ownerId, programId, programRevisionId, schedule, onAccepted, onRecoveryNeeded,
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<Action>('move');
  const [targetDate, setTargetDate] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<ScheduleRevisionPayload | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectable = useMemo(() => schedule.days.filter((day) =>
    day.kind === 'workout' && day.status === 'planned' && day.localDate !== null), [schedule.days]);
  const selected = selectable.find((day) => day.id === selectedId) ?? null;
  const canSave = scheduleWriterEnabled && Boolean(selected) && Boolean(preview);
  const text = { color: theme.text };
  const input = {
    borderColor: theme.border, borderWidth: 1, borderRadius: 10, minHeight: 44,
    paddingHorizontal: 12, color: theme.text, marginTop: 6,
  };
  const button = { minHeight: 44, justifyContent: 'center' as const, paddingVertical: 8 };

  function reset(): void {
    setSelectedId(null);
    setAction('move');
    setTargetDate('');
    setReason('');
    setPreview(null);
    setIssue(null);
  }

  function showPreview(): void {
    if (!selected) {
      setIssue('Choose one planned workout before previewing a change.');
      return;
    }
    try {
      const next = buildScheduleRevision(programId, schedule.revision, programRevisionId, schedule.days,
        action === 'move'
          ? { type: action, occurrence: selected, targetDate }
          : { type: action, occurrence: selected, reason });
      setPreview(next);
      setIssue(null);
    } catch (error) {
      setPreview(null);
      setIssue(error instanceof Error ? error.message : 'Check this schedule change before previewing it.');
    }
  }

  async function confirm(): Promise<void> {
    if (!preview || busy || !canSave) return;
    setBusy(true);
    setIssue(null);
    try {
      const outcome = await command.revise(ownerId, preview);
      if (outcome.status === 'revised' || outcome.status === 'replayed') {
        setOpen(false);
        reset();
        onAccepted();
      } else {
        if (!('message' in outcome)) throw new Error('Schedule revision outcome is incomplete.');
        setIssue(outcome.message);
        if (await scheduleOperationStore.load(ownerId, programId)) onRecoveryNeeded();
      }
    } catch (error) {
      reportSupabaseFailure('schedule.deviation.confirm', error);
      setIssue('This schedule change could not be confirmed. Its exact saved request can be retried.');
      onRecoveryNeeded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ backgroundColor: theme.mutedBg, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 17 }}>Adjust dated schedule</Text>
      <Text style={text}>Move, skip, or explicitly replace one planned workout. Completed and active workouts stay fixed.</Text>
      {!open ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={button}>
          <Text style={{ color: theme.primaryLight, fontWeight: '700' }}>Preview a schedule change</Text>
        </Pressable>
      ) : (
        <>
          {selectable.length === 0 ? <Text style={[text, { marginTop: 10 }]}>There are no planned dated workouts available to change.</Text> : selectable.map((day) => (
            <Pressable key={day.id} accessibilityRole="button"
              accessibilityState={{ selected: selectedId === day.id }}
              accessibilityLabel={`Select ${label(day)}`}
              onPress={() => { setSelectedId(day.id); setPreview(null); }}
              style={{ borderWidth: 1, borderColor: selectedId === day.id ? theme.primary : theme.border,
                borderRadius: 10, padding: 10, marginTop: 8 }}>
              <Text style={text}>{label(day)}</Text>
            </Pressable>
          ))}
          <Text style={[text, { marginTop: 12 }]}>Change type</Text>
          {([
            ['move', 'Move to a different date'],
            ['skip', 'Skip this workout'],
            ['replace_with_rest', 'Replace this workout with rest'],
          ] as const).map(([value, title]) => (
            <Pressable key={value} accessibilityRole="radio"
              accessibilityState={{ selected: action === value }}
              onPress={() => { setAction(value); setPreview(null); }}
              style={button}>
              <Text style={{ color: action === value ? theme.primaryLight : theme.text }}>{action === value ? 'Selected: ' : ''}{title}</Text>
            </Pressable>
          ))}
          {action === 'move' ? (
            <>
              <Text style={text}>New date (YYYY-MM-DD)</Text>
              <TextInput value={targetDate} onChangeText={(value) => { setTargetDate(value); setPreview(null); }}
                style={input} accessibilityLabel="New schedule date" placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.placeholder} />
            </>
          ) : (
            <>
              <Text style={text}>Why is this change needed?</Text>
              <TextInput value={reason} onChangeText={(value) => { setReason(value); setPreview(null); }}
                style={input} accessibilityLabel="Schedule change reason" placeholder="For example, illness or travel"
                placeholderTextColor={theme.placeholder} />
            </>
          )}
          <Pressable accessibilityRole="button" onPress={showPreview} style={button}>
            <Text style={{ color: theme.primaryLight }}>Preview change</Text>
          </Pressable>
          {preview ? (
            <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 10 }}>
              <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Confirm this schedule change</Text>
              <Text style={text}>{action === 'move'
                ? `Move this workout to ${targetDate}.`
                : action === 'skip' ? 'Mark this workout skipped without creating catch-up work.'
                  : 'Replace this workout with a rest day; its original prescription remains in history.'}</Text>
              <Text style={text}>This creates one revision. If connection is lost after sending, only this exact request can be retried.</Text>
              {!scheduleWriterEnabled ? <Text style={text}>Saving is disabled in this build.</Text> : null}
              <Pressable accessibilityRole="button" disabled={!canSave || busy}
                accessibilityState={{ disabled: !canSave || busy }} onPress={() => void confirm()} style={button}>
                <Text style={{ color: canSave ? theme.primaryLight : theme.placeholder, fontWeight: '700' }}>
                  {busy ? 'Confirming…' : 'Confirm schedule change'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {issue ? <Text style={{ color: theme.errorLight, marginTop: 8 }}>{issue}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => { setOpen(false); reset(); }} style={button}>
            <Text style={text}>Cancel (no schedule change saved)</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
