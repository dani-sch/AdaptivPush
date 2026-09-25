import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { createOperationId } from '@/features/kernel/operationId';
import { createScheduleCommand } from '@/features/scheduling/createSchedule';
import { scheduleOperationStore } from '@/features/scheduling/operationStore';
import {
  buildCreateProgramSchedulePayload,
  isLegacyEmptyWorkout,
  UnsupportedEmptyWorkoutError,
  type ExplicitPlacement,
  type ProgramDayIdentity,
} from '@/features/scheduling/placementPreview';
import {
  createScheduleRepository, scheduleWriterEnabled,
  type EligibleScheduleDays,
} from '@/features/scheduling/repository';
import { supabase } from '@/utils/supabase';
import { reportSupabaseFailure } from '@/utils/supabaseResilience';

const repository = createScheduleRepository(supabase);
const command = createScheduleCommand(repository, scheduleOperationStore);

interface DateSelection {
  occurrenceId: string;
  programDayId: string;
  localDate?: string;
  unplacedReason?: string;
}

interface ExtraRest {
  occurrenceId: string;
  localDate: string;
  week: string;
}

interface Props {
  ownerId: string;
  programId: string;
  revisionId: string;
  scheduleConfirmedAbsent: boolean;
  onAccepted(): void;
  onRecoveryNeeded(): void;
}

function title(day: ProgramDayIdentity): string {
  return `Week ${day.week_number} · Day ${day.day_index} · ${day.is_rest_day ? 'Rest' : day.workout_name || 'Workout'}`;
}

export function ProgramSchedulePlacement({
  ownerId, programId, revisionId, scheduleConfirmedAbsent, onAccepted, onRecoveryNeeded,
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<EligibleScheduleDays | null>(null);
  const [dates, setDates] = useState<DateSelection[]>([]);
  const [extraRest, setExtraRest] = useState<ExtraRest[]>([]);
  const [timezone, setTimezone] = useState('');
  const [preview, setPreview] = useState<ExplicitPlacement[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const canSave = scheduleWriterEnabled && scheduleConfirmedAbsent;

  useEffect(() => {
    if (!open) return;
    let active = true;
    void repository.loadEligibleDays(ownerId, programId).then((data) => {
      if (!active) return;
      if (data.revisionId !== revisionId) {
        setIssue('The active program changed. Refresh Plan before choosing dates.');
        return;
      }
      setSnapshot(data);
      setDates(data.days.map((day) => isLegacyEmptyWorkout(day)
        ? {
          occurrenceId: createOperationId(), programDayId: day.id,
          unplacedReason: 'Legacy workout has no recorded prescription; original date is unknown.',
        }
        : { occurrenceId: createOperationId(), programDayId: day.id, localDate: '' }));
      setIssue(data.days.length ? null : 'There are no uncompleted program days to place.');
    }).catch((error) => {
      if (!active) return;
      reportSupabaseFailure('schedule.preview_days', error);
      setSnapshot(null);
      setDates([]);
      setPreview(null);
      setIssue(error instanceof UnsupportedEmptyWorkoutError
        ? error.message : 'Program days could not be loaded. Retry when connected.');
    });
    return () => { active = false; };
  }, [open, ownerId, programId, revisionId]);

  function choices(): ExplicitPlacement[] {
    return [
      ...dates.map((selection) => selection.unplacedReason
        ? {
          occurrenceId: selection.occurrenceId, programDayId: selection.programDayId,
          kind: 'workout' as const, status: 'unplaced' as const, reason: selection.unplacedReason,
        }
        : {
          occurrenceId: selection.occurrenceId, programDayId: selection.programDayId,
          localDate: selection.localDate ?? '',
        }),
      ...extraRest.map((rest) => ({
        occurrenceId: rest.occurrenceId, kind: 'rest' as const,
        cycleWeek: Number(rest.week), localDate: rest.localDate,
      })),
    ];
  }

  function showPreview() {
    if (!snapshot) return;
    try {
      const selected = choices();
      buildCreateProgramSchedulePayload({
        programId, expectedProgramRevisionId: snapshot.revisionId,
        durationWeeks: snapshot.durationWeeks, uncompletedProgramDays: snapshot.days,
        explicitPlacements: selected, timezone,
      });
      setPreview(selected);
      setIssue(null);
    } catch (error) {
      setPreview(null);
      setIssue(error instanceof Error ? error.message : 'Check every date and timezone before previewing.');
    }
  }

  async function confirm() {
    if (!snapshot || !preview || busy || !canSave) return;
    setBusy(true);
    setIssue(null);
    try {
      const outcome = await command.create(ownerId, {
        programId, expectedProgramRevisionId: snapshot.revisionId,
        durationWeeks: snapshot.durationWeeks, uncompletedProgramDays: snapshot.days,
        explicitPlacements: preview, timezone,
      });
      if (outcome.status === 'created' || outcome.status === 'replayed') {
        setOpen(false);
        onAccepted();
      } else if ('message' in outcome) {
        setIssue(outcome.message);
        if (await scheduleOperationStore.load(ownerId, programId)) onRecoveryNeeded();
      }
    } catch (error) {
      reportSupabaseFailure('schedule.confirm', error);
      setIssue('Placement could not be confirmed. If a request was sent, retry its saved operation.');
      onRecoveryNeeded();
    } finally {
      setBusy(false);
    }
  }

  const text = { color: theme.text };
  const input = {
    borderColor: theme.border, borderWidth: 1, borderRadius: 10, minHeight: 44,
    paddingHorizontal: 12, color: theme.text, marginTop: 6,
  };
  const button = { minHeight: 44, justifyContent: 'center' as const, paddingVertical: 8 };

  return (
    <View style={{ backgroundColor: theme.mutedBg, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 17 }}>Place your program on dates</Text>
      <Text style={text}>Dates are not inferred from program start or past workouts. Your existing workout draft stays unchanged.</Text>
      {!open ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={button}>
          <Text style={{ color: theme.primaryLight, fontWeight: '700' }}>Choose dates and preview</Text>
        </Pressable>
      ) : (
        <>
          <Text style={[text, { marginTop: 12 }]}>IANA timezone (for example, America/New_York)</Text>
          <TextInput
            value={timezone} onChangeText={(value) => { setTimezone(value); setPreview(null); }}
            style={input} autoCapitalize="none" autoCorrect={false}
            accessibilityLabel="Schedule timezone"
            placeholder="Region/City" placeholderTextColor={theme.placeholder}
          />
          {deviceZone ? (
            <Pressable accessibilityRole="button" onPress={() => { setTimezone(deviceZone); setPreview(null); }} style={button}>
              <Text style={{ color: theme.primaryLight }}>Use device timezone: {deviceZone}</Text>
            </Pressable>
          ) : null}
          {snapshot?.days.map((day) => {
            const selection = dates.find((item) => item.programDayId === day.id);
            return (
              <View key={day.id} style={{ marginTop: 12 }}>
                <Text style={text}>{title(day)}</Text>
                {selection?.unplacedReason ? (
                  <Text style={[text, { marginTop: 6 }]}>
                    Original date is unknown because this legacy workout has no exercises. It will remain explicitly unplaced, not be treated as rest, and cannot be started.
                  </Text>
                ) : (
                  <TextInput
                    value={selection?.localDate ?? ''}
                    onChangeText={(value) => {
                      setDates((current) => current.map((item) =>
                        item.programDayId === day.id ? { ...item, localDate: value } : item));
                      setPreview(null);
                    }}
                    style={input} accessibilityLabel={`Date for ${title(day)}`}
                    placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder}
                  />
                )}
              </View>
            );
          })}
          {extraRest.map((rest, index) => (
            <View key={rest.occurrenceId} style={{ marginTop: 12 }}>
              <Text style={text}>Extra rest {index + 1} · explicitly added</Text>
              <TextInput value={rest.week} onChangeText={(value) => {
                setExtraRest((current) => current.map((item) =>
                  item.occurrenceId === rest.occurrenceId ? { ...item, week: value } : item));
                setPreview(null);
              }} keyboardType="number-pad" style={input} accessibilityLabel={`Cycle week for extra rest ${index + 1}`}
                placeholder="Cycle week" placeholderTextColor={theme.placeholder} />
              <TextInput value={rest.localDate} onChangeText={(value) => {
                setExtraRest((current) => current.map((item) =>
                  item.occurrenceId === rest.occurrenceId ? { ...item, localDate: value } : item));
                setPreview(null);
              }} style={input} accessibilityLabel={`Date for extra rest ${index + 1}`}
                placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} />
              <Pressable accessibilityRole="button" onPress={() => {
                setExtraRest((current) => current.filter((item) => item.occurrenceId !== rest.occurrenceId));
                setPreview(null);
              }} style={button}>
                <Text style={{ color: theme.errorLight }}>Remove extra rest</Text>
              </Pressable>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => {
            setExtraRest((current) => [...current, { occurrenceId: createOperationId(), week: '', localDate: '' }]);
            setPreview(null);
          }} style={button}>
            <Text style={{ color: theme.primaryLight }}>Add an explicit rest day</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={showPreview} disabled={!snapshot?.days.length} style={button}>
            <Text style={{ color: theme.primaryLight }}>Preview placement</Text>
          </Pressable>
          {preview ? (
            <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 10 }}>
              <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Confirm these dates · {timezone}</Text>
              {preview.map((item) => (
                <Text key={item.occurrenceId} style={text}>
                  {'localDate' in item
                    ? `${item.localDate} · ${'programDayId' in item ? 'Program day' : `Extra rest · week ${item.cycleWeek}`}`
                    : 'Original date unknown · legacy workout remains unplaced'}
                </Text>
              ))}
              <Text style={text}>Only uncompleted days are placed. Historical sessions and dates are not changed. Starting a scheduled workout remains unavailable in this client.</Text>
              {!canSave ? (
                <Text style={text}>Saving is unavailable until this build and the authenticated server support dated schedules.</Text>
              ) : null}
              <Pressable accessibilityRole="button" disabled={!canSave || busy}
                accessibilityState={{ disabled: !canSave || busy }} onPress={() => void confirm()} style={button}>
                <Text style={{ color: canSave ? theme.primaryLight : theme.placeholder, fontWeight: '700' }}>
                  {busy ? 'Confirming…' : 'Confirm and save dated placement'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {issue ? <Text style={{ color: theme.errorLight, marginTop: 8 }}>{issue}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => { setOpen(false); setPreview(null); }}
            style={button}>
            <Text style={text}>Close preview (no schedule saved)</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
