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
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

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

const ToggleRow = ({ label, hint, icon, value, onValueChange, disabled }: ToggleRowProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
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
        trackColor={{ false: theme.buttonDisabled, true: theme.primary }}
        thumbColor={theme.textPrimary}
        ios_backgroundColor={theme.buttonDisabled}
      />
    </View>
  );
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
            <ArrowLeft color={theme.textPrimary} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={[theme.cardBg, theme.backgroundDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headlineCard}
        >
          <View style={styles.headlineIconWrap}>
            <Bell color={theme.textPrimary} size={22} />
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
            icon={<Smartphone color={theme.placeholder} size={18} />}
            value={pushEnabled}
            onValueChange={handlePushToggle}
          />
          <ToggleRow
            label="Email Summaries"
            hint="Weekly highlights and milestone recaps"
            icon={<Mail color={theme.placeholder} size={18} />}
            value={emailEnabled}
            onValueChange={setEmailEnabled}
          />
          <ToggleRow
            label="SMS Reminders"
            hint="Text reminders for training sessions"
            icon={<CalendarClock color={theme.placeholder} size={18} />}
            value={smsEnabled}
            onValueChange={setSmsEnabled}
          />
        </View>

        <Text style={styles.sectionTitle}>Training Alerts</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            label="Workout Reminder"
            hint="Heads-up before your planned session"
            icon={<Bell color={theme.placeholder} size={18} />}
            value={workoutReminder}
            onValueChange={setWorkoutReminder}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="Deload Week Reminder"
            hint="Reminder when recovery week begins"
            icon={<MoonStar color={theme.placeholder} size={18} />}
            value={deloadReminder}
            onValueChange={setDeloadReminder}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="PR Celebrations"
            hint="Celebrate new best lifts and streaks"
            icon={<Sparkles color={theme.placeholder} size={18} />}
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
            icon={<MoonStar color={theme.placeholder} size={18} />}
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
               <ChevronRight color={theme.placeholder} size={18} />
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
               <ChevronRight color={theme.placeholder} size={18} />
            </View>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
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
                    {isSelected && <Check color={theme.primary} size={18} />}
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundDark,
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
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardBg,
    },
    headerTitle: {
      color: theme.textPrimary,
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
      borderColor: theme.border,
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
      backgroundColor: theme.mutedBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headlineTextWrap: {
      flex: 1,
    },
    headlineTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 2,
    },
    headlineSubtitle: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 19,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 14,
      letterSpacing: 1,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    sectionCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardBg,
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
      borderBottomColor: theme.border,
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
      backgroundColor: theme.mutedBg,
      marginRight: 10,
    },
    toggleTextWrap: {
      flex: 1,
    },
    toggleLabel: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    toggleHint: {
      color: theme.text,
      fontSize: 12,
      marginTop: 2,
    },
    timeRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    timeLabel: {
      color: theme.textPrimary,
      fontSize: 15,
    },
    timeLabelDisabled: {
      color: theme.placeholder,
    },
    timeValueWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeValue: {
      color: theme.text,
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
      color: theme.text,
      fontSize: 13,
    },
    errorFeedback: {
      color: theme.errorLight,
      fontSize: 13,
      marginBottom: 10,
      marginLeft: 2,
    },
    saveFeedback: {
      color: theme.success,
      fontSize: 13,
      marginBottom: 10,
      marginLeft: 2,
    },
    saveButton: {
      minHeight: 62,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.65,
    },
    saveButtonText: {
      color: theme.white,
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
      backgroundColor: theme.surfaceBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: 440,
      paddingBottom: 24,
    },
    pickerHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.buttonDisabled,
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
      borderBottomColor: theme.border,
    },
    pickerTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '600',
    },
    pickerDoneBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: theme.mutedBg,
    },
    pickerDoneText: {
      color: theme.primary,
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
      borderBottomColor: theme.border,
    },
    timeOptionSelected: {
      backgroundColor: theme.mutedBg,
    },
    timeOptionText: {
      color: theme.text,
      fontSize: 16,
    },
    timeOptionTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
  });
}
