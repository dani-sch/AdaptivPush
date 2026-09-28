import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { restTimerStore, type RestTimerPreferences } from '@/features/workouts/restTimerStore';
import { requestNotificationPermission } from '@/utils/notifications';

const DURATIONS = [30, 60, 90, 120, 180] as const;

export default function NotificationsScreen() {
  const ownerId = useAuth().ownerId;
  return <OwnerNotifications key={ownerId ?? 'signed-out'} ownerId={ownerId} />;
}

function OwnerNotifications({ ownerId }: { ownerId: string | null }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [preferences, setPreferences] = useState<RestTimerPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!ownerId) return () => { active = false; };
    restTimerStore.getPreferences(ownerId).then(value => {
      if (active) setPreferences(value);
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Rest-timer settings are unavailable.');
    });
    return () => { active = false; };
  }, [ownerId]);

  const update = async (next: RestTimerPreferences) => {
    if (!ownerId || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (next.alertEnabled && !preferences?.alertEnabled && !(await requestNotificationPermission())) {
        setError('Notification permission was denied. The rest timer still works without an alert.');
        return;
      }
      await restTimerStore.savePreferences(ownerId, next);
      setPreferences(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save rest-timer settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 20 }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button"
        style={{ paddingVertical: 12 }}>
        <Text style={{ color: theme.primary }}>Back</Text>
      </Pressable>
      <Text style={{ color: theme.text, fontSize: 26, fontWeight: '700' }}>Workout alerts</Text>
      <Text style={{ color: theme.text }}>
        An active workout can receive one inactivity nudge after five minutes without a logged set.
        There are no planned-workout, record, deload, or test alerts.
      </Text>
      {!ownerId && <Text style={{ color: theme.text }}>Sign in to change rest-timer settings.</Text>}
      {ownerId && !preferences && !error && <ActivityIndicator />}
      {preferences && (
        <>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>Rest timer duration</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {DURATIONS.map(seconds => (
              <Pressable key={seconds} onPress={() => void update({ ...preferences, seconds })}
                disabled={saving} accessibilityRole="button"
                accessibilityState={{ selected: preferences.seconds === seconds }}
                style={{ padding: 12, borderRadius: 8, backgroundColor: theme.cardBg }}>
                <Text style={{ color: theme.text }}>{seconds} sec</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, flex: 1 }}>Optional rest-timer completion alert</Text>
            <Switch value={preferences.alertEnabled} disabled={saving}
              onValueChange={alertEnabled => void update({ ...preferences, alertEnabled })} />
          </View>
        </>
      )}
      {error && <Text accessibilityRole="alert" style={{ color: theme.text }}>{error}</Text>}
    </ScrollView>
  );
}
