import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  Mail,
  MoonStar,
  Smartphone,
  Sparkles,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  applyNotificationPreferences,
  getDevicePushToken,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendTestNotification,
} from '@/utils/notifications';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeUserMetadata,
  parseNotificationPreferences,
} from '@/utils/profilePreferences';
import { supabase } from '@/utils/supabase';

// 48 half-hour slots: "12:00 AM" … "11:30 PM"
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${period}`;
});

const ITEM_HEIGHT = 52;

type ToggleRowProps = {
  label: string;
  hint: string;
  icon: ReactNode;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

const ToggleRow = ({ label, hint, icon, value, onValueChange, disabled }: ToggleRowProps) => (
  <View style={[styles.toggleRow, disabled && styles.rowDisabled]}>
    <View style={styles.toggleLeft}>
      <View style={styles.iconShell}>{icon}</View>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={disabled ? undefined : onValueChange}
      disabled={disabled}
      trackColor={{ false: '#4f5568', true: '#2f7cff' }}
      thumbColor="#f4f6ff"
      ios_backgroundColor="#4f5568"
    />
  </View>
);

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [pushEnabled, setPushEnabled] = useState(DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled);
  const [emailEnabled, setEmailEnabled] = useState(DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled);
  const [smsEnabled, setSmsEnabled] = useState(DEFAULT_NOTIFICATION_PREFERENCES.smsEnabled);
  const [workoutReminder, setWorkoutReminder] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES.workoutReminder,
  );
  const [deloadReminder, setDeloadReminder] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES.deloadReminder,
  );
  const [prCelebrations, setPrCelebrations] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES.prCelebrations,
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Time picker modal
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);
  const pickerValue = timePickerTarget === 'start' ? quietHoursStart : quietHoursEnd;

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        // Use cached session — no network call needed for reading prefs
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          // Not authenticated yet; defaults are already set
          return;
        }

        const preferences = parseNotificationPreferences(
          session.user.user_metadata?.notification_preferences,
        );

        setPushEnabled(preferences.pushEnabled);
        setEmailEnabled(preferences.emailEnabled);
        setSmsEnabled(preferences.smsEnabled);
        setWorkoutReminder(preferences.workoutReminder);
        setDeloadReminder(preferences.deloadReminder);
        setPrCelebrations(preferences.prCelebrations);
        setQuietHoursEnabled(preferences.quietHoursEnabled);
        setQuietHoursStart(preferences.quietHoursStart);
        setQuietHoursEnd(preferences.quietHoursEnd);
      } catch {
        // Silently fall back to defaults
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  // Scroll to the selected time when the picker opens
  useEffect(() => {
    if (timePickerTarget === null) return;
    const index = TIME_OPTIONS.indexOf(pickerValue);
    if (index < 0) return;
    // Brief delay so the FlatList has rendered
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.4 });
    }, 80);
    return () => clearTimeout(timer);
  }, [timePickerTarget, pickerValue]);

  const handlePushToggle = async (next: boolean) => {
    if (!next) {
      setPushEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      setPushEnabled(true);
      setErrorMessage('');
    } else {
      const status = await getNotificationPermissionStatus();
      setErrorMessage(
        status === 'denied'
          ? 'Notifications are blocked. Enable them in your device Settings.'
          : 'Notification permission was not granted.',
      );
      setPushEnabled(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (timePickerTarget === 'start') setQuietHoursStart(time);
    else if (timePickerTarget === 'end') setQuietHoursEnd(time);
    setTimePickerTarget(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSaveMessage('');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setErrorMessage('Unable to save — no active session.');
        return;
      }

      const nextPreferences = {
        pushEnabled,
        emailEnabled,
        smsEnabled,
        workoutReminder,
        deloadReminder,
        prCelebrations,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
      };

      // Persist push token alongside preferences
      let pushToken: string | null = null;
      if (pushEnabled) {
        pushToken = await getDevicePushToken();
      }

      const { error: saveError } = await supabase.auth.updateUser({
        data: mergeUserMetadata(session.user.user_metadata, {
          notification_preferences: nextPreferences,
          ...(pushToken ? { push_token: pushToken } : {}),
        }),
      });

      if (saveError) {
        setErrorMessage(saveError.message);
        return;
      }

      // Schedule / cancel local notifications
      await applyNotificationPreferences(nextPreferences);

      if (nextPreferences.pushEnabled) {
        await sendTestNotification();
        setSaveMessage('Settings saved — background the app to see a test notification.');
      } else {
        setSaveMessage('Notification settings saved.');
      }
    } catch {
      setErrorMessage('Failed to save notification settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 124 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color="#e6e9f4" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={['#181c29', '#12141b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headlineCard}
        >
          <View style={styles.headlineIconWrap}>
            <Bell color="#e6ebfc" size={22} />
          </View>
          <View style={styles.headlineTextWrap}>
            <Text style={styles.headlineTitle}>Stay in Sync</Text>
            <Text style={styles.headlineSubtitle}>
              Choose what updates you want so reminders feel useful, not noisy.
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Delivery Channels</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            label="Push Notifications"
            hint="Real-time updates on your device"
            icon={<Smartphone color="#9ba3b9" size={18} />}
            value={pushEnabled}
            onValueChange={handlePushToggle}
          />
          <ToggleRow
            label="Email Summaries"
            hint="Weekly highlights and milestone recaps"
            icon={<Mail color="#9ba3b9" size={18} />}
            value={emailEnabled}
            onValueChange={setEmailEnabled}
          />
          <ToggleRow
            label="SMS Reminders"
            hint="Text reminders for training sessions"
            icon={<CalendarClock color="#9ba3b9" size={18} />}
            value={smsEnabled}
            onValueChange={setSmsEnabled}
          />
        </View>

        <Text style={styles.sectionTitle}>Training Alerts</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            label="Workout Reminder"
            hint="Heads-up before your planned session"
            icon={<Bell color="#9ba3b9" size={18} />}
            value={workoutReminder}
            onValueChange={setWorkoutReminder}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="Deload Week Reminder"
            hint="Reminder when recovery week begins"
            icon={<MoonStar color="#9ba3b9" size={18} />}
            value={deloadReminder}
            onValueChange={setDeloadReminder}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="PR Celebrations"
            hint="Celebrate new best lifts and streaks"
            icon={<Sparkles color="#9ba3b9" size={18} />}
            value={prCelebrations}
            onValueChange={setPrCelebrations}
            disabled={!pushEnabled}
          />
        </View>

        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            label="Enable Quiet Hours"
            hint="Pause non-critical notifications overnight"
            icon={<MoonStar color="#9ba3b9" size={18} />}
            value={quietHoursEnabled}
            onValueChange={setQuietHoursEnabled}
          />

          <Pressable
            style={({ pressed }) => [
              styles.timeRow,
              !quietHoursEnabled && styles.rowDisabled,
              pressed && quietHoursEnabled && styles.pressed,
            ]}
            onPress={() => quietHoursEnabled && setTimePickerTarget('start')}
          >
            <Text style={[styles.timeLabel, !quietHoursEnabled && styles.timeLabelDisabled]}>
              Start Time
            </Text>
            <View style={styles.timeValueWrap}>
              <Text style={styles.timeValue}>{quietHoursStart}</Text>
              <ChevronRight color="#6f758a" size={18} />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.timeRow,
              !quietHoursEnabled && styles.rowDisabled,
              pressed && quietHoursEnabled && styles.pressed,
            ]}
            onPress={() => quietHoursEnabled && setTimePickerTarget('end')}
          >
            <Text style={[styles.timeLabel, !quietHoursEnabled && styles.timeLabelDisabled]}>
              End Time
            </Text>
            <View style={styles.timeValueWrap}>
              <Text style={styles.timeValue}>{quietHoursEnd}</Text>
              <ChevronRight color="#6f758a" size={18} />
            </View>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#7aa0ff" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : null}
        {errorMessage ? <Text style={styles.errorFeedback}>{errorMessage}</Text> : null}
        {saveMessage ? <Text style={styles.saveFeedback}>{saveMessage}</Text> : null}

        <Pressable
          disabled={isSaving || isLoading}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            (isSaving || isLoading) && styles.saveButtonDisabled,
            pressed && !isSaving && !isLoading && styles.pressed,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Notification Settings'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Time picker modal */}
      <Modal
        visible={timePickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTimePickerTarget(null)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {timePickerTarget === 'start' ? 'Start Time' : 'End Time'}
              </Text>
              <Pressable
                onPress={() => setTimePickerTarget(null)}
                style={({ pressed }) => [styles.pickerDoneBtn, pressed && styles.pressed]}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            </View>

            <FlatList
              ref={flatListRef}
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={({ index }) => {
                // Retry after layout settles
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.4 });
                }, 100);
              }}
              renderItem={({ item }) => {
                const isSelected = item === pickerValue;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.timeOption,
                      isSelected && styles.timeOptionSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleTimeSelect(item)}
                  >
                    <Text
                      style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}
                    >
                      {item}
                    </Text>
                    {isSelected && <Check color="#2b68f0" size={18} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03040b',
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2a2f41',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131722',
  },
  headerTitle: {
    color: '#f3f6ff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headlineCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#242a3b',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  headlineIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#25304a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headlineTextWrap: {
    flex: 1,
  },
  headlineTitle: {
    color: '#eff3ff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  headlineSubtitle: {
    color: '#8f97ad',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    color: '#8b91a4',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#242a3b',
    backgroundColor: '#121621',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  toggleRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95, 103, 124, 0.24)',
  },
  rowDisabled: {
    opacity: 0.45,
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2133',
    marginRight: 10,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    color: '#e7ebf8',
    fontSize: 15,
    fontWeight: '500',
  },
  toggleHint: {
    color: '#8d95ac',
    fontSize: 12,
    marginTop: 2,
  },
  timeRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95, 103, 124, 0.24)',
  },
  timeLabel: {
    color: '#d6dbec',
    fontSize: 15,
  },
  timeLabelDisabled: {
    color: '#555b6e',
  },
  timeValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeValue: {
    color: '#8d95ac',
    fontSize: 14,
  },
  loadingRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingText: {
    color: '#98a1b8',
    fontSize: 13,
  },
  errorFeedback: {
    color: '#ff8088',
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 2,
  },
  saveFeedback: {
    color: '#7ae4a7',
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 2,
  },
  saveButton: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#336de8',
    backgroundColor: '#2b68f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#eef2ff',
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  // Time picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#0e1119',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#242a3b',
    maxHeight: 440,
    paddingBottom: 24,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3a4156',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2434',
  },
  pickerTitle: {
    color: '#e6ebfc',
    fontSize: 17,
    fontWeight: '600',
  },
  pickerDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1b3a8a',
  },
  pickerDoneText: {
    color: '#7aaeff',
    fontSize: 15,
    fontWeight: '600',
  },
  timeOption: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60,70,95,0.3)',
  },
  timeOptionSelected: {
    backgroundColor: 'rgba(43,104,240,0.10)',
  },
  timeOptionText: {
    color: '#9ba5c0',
    fontSize: 16,
  },
  timeOptionTextSelected: {
    color: '#5b9bff',
    fontWeight: '600',
  },
});
