import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Heart,
  LogOut,
  Shield,
  UserRound,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mergeUserMetadata, parseReadinessPreferences } from '@/utils/profilePreferences';
import { supabase } from '@/utils/supabase';
import { uploadAvatar } from '@/utils/uploadAvatar';
import type { TrainingExperience } from '@/types/database';
import { useTheme, type AppearancePreference } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { PALETTES, type PaletteKey } from '@/constants/palettes';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPERIENCE_LABELS: Record<TrainingExperience, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
}

interface WorkoutHistoryRow {
  ended_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  pr_count?: number | string | null;
  prs?: number | string | null;
  personal_records?: number | string | null;
  personal_record_count?: number | string | null;
  prs_hit?: number | string | null;
  is_pr?: boolean | null;
  notes?: string | null;
}

interface ProgressSummary {
  workouts: number;
  weekStreak: number;
  prs: number;
}

type WorkoutHistoryTable = 'workout_sessions' | 'workout_history';

type ReadinessSource = 'apple' | 'manual';
type ReadinessQuestionKey = 'sleep' | 'stress' | 'menstrualCycle';
type MenuIcon = 'user' | 'bell' | 'heart' | 'shield' | 'help';
type MenuLabel =
  | 'Personal Information'
  | 'Notifications'
  | 'Readiness Settings'
  | 'Privacy & Data'
  | 'Help & Support';

interface MenuSection {
  title: string;
  items: {
    label: MenuLabel;
    icon: MenuIcon;
  }[];
}

const DEFAULT_PROGRESS: ProgressSummary = {
  workouts: 0,
  weekStreak: 0,
  prs: 0,
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'ACCOUNT',
    items: [
      { label: 'Personal Information', icon: 'user' },
      { label: 'Notifications', icon: 'bell' },
    ],
  },
  {
    title: 'HEALTH & DATA',
    items: [
      { label: 'Readiness Settings', icon: 'heart' },
      { label: 'Privacy & Data', icon: 'shield' },
    ],
  },
  {
    title: 'SUPPORT',
    items: [{ label: 'Help & Support', icon: 'help' }],
  },
];

const MENU_ITEM_ROUTES: Partial<Record<MenuLabel, Href>> = {
  'Personal Information': '/(tabs)/profile/personal-information',
  Notifications: '/(tabs)/profile/notifications',
  'Privacy & Data': '/(tabs)/profile/privacy-data',
  'Help & Support': '/(tabs)/profile/help-support',
};

const READINESS_QUESTIONS: { key: ReadinessQuestionKey; label: string }[] = [
  { key: 'sleep', label: 'Sleep' },
  { key: 'stress', label: 'Stress' },
  { key: 'menstrualCycle', label: 'Menstrual Cycle' },
];

const parseNumericValue = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (cleaned.length === 0) {
      return null;
    }

    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
};

const parsePrCount = (row: WorkoutHistoryRow): number => {
  const directCount =
    parseNumericValue(row.pr_count) ??
    parseNumericValue(row.prs) ??
    parseNumericValue(row.personal_records) ??
    parseNumericValue(row.personal_record_count) ??
    parseNumericValue(row.prs_hit);

  if (directCount !== null) {
    return Math.max(0, Math.round(directCount));
  }

  if (row.is_pr) {
    return 1;
  }

  if (!row.notes) {
    return 0;
  }

  const explicitMatch = row.notes.match(/(\d+)\s*PR/i);
  if (explicitMatch) {
    return Number(explicitMatch[1]);
  }

  return /\bPR\b/i.test(row.notes) ? 1 : 0;
};

const getWeekKey = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setHours(0, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);

  return date.toISOString().slice(0, 10);
};

const computeWeekStreak = (rows: WorkoutHistoryRow[]): number => {
  const weekKeys = new Set(
    rows
      .map((row) => row.ended_at ?? row.completed_at ?? row.created_at ?? '')
      .map(getWeekKey)
      .filter(Boolean),
  );

  if (weekKeys.size === 0) {
    return 0;
  }

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const mondayOffset = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - mondayOffset);

  let streak = 0;
  while (weekKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
};

const renderMenuIcon = (icon: MenuIcon, iconColor: string) => {
  switch (icon) {
    case 'user':
      return <UserRound color={iconColor} size={24} />;
    case 'bell':
      return <Bell color={iconColor} size={24} />;
    case 'heart':
      return <Heart color={iconColor} size={24} />;
    case 'shield':
      return <Shield color={iconColor} size={24} />;
    case 'help':
      return <CircleHelp color={iconColor} size={24} />;
    default:
      return null;
  }
};

const isMissingTableError = (
  error: { code?: string | null; message?: string | null } | null | undefined,
  tableName: WorkoutHistoryTable,
): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === 'PGRST205') {
    return true;
  }

  return Boolean(
    error.message?.toLowerCase().includes(`could not find the table 'public.${tableName}'`),
  );
};

const fetchRowsFromTable = async (
  tableName: WorkoutHistoryTable,
  userId: string,
): Promise<{
  rows: WorkoutHistoryRow[];
  error: { code?: string | null; message?: string | null } | null;
}> => {
  const orderColumn = tableName === 'workout_sessions' ? 'ended_at' : 'completed_at';

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .order(orderColumn, { ascending: false });

  return {
    rows: (data ?? []) as WorkoutHistoryRow[],
    error,
  };
};

const isMissingUserProfileSchemaError = (error: {
  code?: string | null;
  message?: string | null;
} | null | undefined): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === 'PGRST205' || error.code === 'PGRST204') {
    return true;
  }

  const normalized = error.message?.toLowerCase() ?? '';
  return (
    normalized.includes("could not find the table 'public.user_profile'") ||
    normalized.includes("could not find the 'healthkit_enabled' column")
  );
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme, preference, setPreference, palette, setPalette } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [progress, setProgress] = useState<ProgressSummary>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReadinessModalVisible, setIsReadinessModalVisible] = useState(false);
  const [isAppleHealthConnected, setIsAppleHealthConnected] = useState(false);
  const [readinessSource, setReadinessSource] = useState<ReadinessSource>('manual');
  const [isReadinessPromptsEnabled, setIsReadinessPromptsEnabled] = useState(true);
  const [readinessQuestions, setReadinessQuestions] = useState<Record<ReadinessQuestionKey, boolean>>({
    sleep: true,
    stress: true,
    menstrualCycle: true,
  });
  const [isReadinessSaving, setIsReadinessSaving] = useState(false);
  const [readinessStatusMessage, setReadinessStatusMessage] = useState<string | null>(null);
  const [readinessStatusType, setReadinessStatusType] = useState<'success' | 'error'>('success');
  const [experienceLevel, setExperienceLevel] = useState<TrainingExperience | null>(null);
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [daysSincePeriod, setDaysSincePeriod] = useState<string>('');
  const [avgCycleLength, setAvgCycleLength] = useState<string>('28');
  const [cycleSaving, setCycleSaving] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Load haptics preference on mount
  useEffect(() => {
    AsyncStorage.getItem('haptics_enabled').then((val) => {
      if (val === 'false') setHapticsEnabled(false);
    }).catch(() => {});
  }, []);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Unable to load profile.');
        setProfile(null);
        setProgress(DEFAULT_PROGRESS);
        return;
      }

      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      });

      // Load avatar from user_profile table
      const { data: profileRow } = await supabase
        .from('user_profile')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      setAvatarUrl(profileRow?.avatar_url ?? null);

      const readinessPreferences = parseReadinessPreferences(
        user.user_metadata?.readiness_preferences,
      );
      setReadinessSource(readinessPreferences.source);
      setIsReadinessPromptsEnabled(readinessPreferences.promptsEnabled);
      setReadinessQuestions({
        sleep: readinessPreferences.questions.sleep,
        stress: readinessPreferences.questions.stress,
        menstrualCycle: readinessPreferences.questions.menstrualCycle,
      });

      let nextError: string | null = null;

      const { data: userProfileData, error: userProfileError } = await supabase
        .from('user_profile')
        .select('healthkit_enabled, experience_level, cycle_enabled, last_period_start_date, avg_cycle_length_days')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userProfileError) {
        if (!isMissingUserProfileSchemaError(userProfileError)) {
          nextError = userProfileError.message;
        }
        setIsAppleHealthConnected(readinessPreferences.source === 'apple');
      } else {
        const healthkitEnabled =
          typeof userProfileData?.healthkit_enabled === 'boolean'
            ? userProfileData.healthkit_enabled
            : readinessPreferences.source === 'apple';

        setIsAppleHealthConnected(healthkitEnabled);
        if (!healthkitEnabled && readinessPreferences.source === 'apple') {
          setReadinessSource('manual');
        }
        if (userProfileData?.experience_level) {
          setExperienceLevel(userProfileData.experience_level as TrainingExperience);
        }
        setCycleEnabled(userProfileData?.cycle_enabled ?? false);
        setAvgCycleLength(String(userProfileData?.avg_cycle_length_days ?? 28));
        if (userProfileData?.last_period_start_date) {
          const { daysSincePeriod: dsp } = await import('@/utils/cyclePhase');
          setDaysSincePeriod(String(dsp(userProfileData.last_period_start_date)));
        }
      }

      const sessionsResult = await fetchRowsFromTable('workout_sessions', user.id);
      const sessionsMissing = isMissingTableError(sessionsResult.error, 'workout_sessions');
      if (sessionsResult.error && !sessionsMissing) {
        setError(sessionsResult.error.message ?? 'Failed to load workout progress.');
        setProgress(DEFAULT_PROGRESS);
        return;
      }

      let rows = sessionsResult.rows;
      const shouldTryLegacyHistory = sessionsMissing || sessionsResult.rows.length === 0;
      if (shouldTryLegacyHistory) {
        const historyResult = await fetchRowsFromTable('workout_history', user.id);
        const historyMissing = isMissingTableError(historyResult.error, 'workout_history');

        if (historyResult.error && !historyMissing) {
          setError(historyResult.error.message ?? 'Failed to load workout progress.');
          setProgress(DEFAULT_PROGRESS);
          return;
        }

        if (historyResult.rows.length > 0) {
          rows = historyResult.rows;
        }
      }

      const { count: prTotal } = await supabase
        .from('personal_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setProgress({
        workouts: rows.length,
        weekStreak: computeWeekStreak(rows),
        prs: prTotal ?? 0,
      });
      setError(nextError);
    } catch (fetchError) {
      console.error('Failed to load profile screen:', fetchError);
      setError('Failed to load profile data.');
      setProgress(DEFAULT_PROGRESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfileData();
  }, [fetchProfileData]);

  useFocusEffect(
    useCallback(() => {
      void fetchProfileData();
    }, [fetchProfileData]),
  );

  const handleLogout = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      router.replace('/');
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
      setError('Unable to log out right now.');
    }
  };

  const toggleAppleHealthConnection = () => {
    setIsAppleHealthConnected((current) => {
      const next = !current;
      if (!next && readinessSource === 'apple') {
        setReadinessSource('manual');
      }
      if (next) {
        setReadinessSource('apple');
      }
      return next;
    });
  };

  const toggleReadinessQuestion = (key: ReadinessQuestionKey) => {
    setReadinessQuestions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSaveReadinessSettings = async () => {
    try {
      setIsReadinessSaving(true);
      setReadinessStatusMessage(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setReadinessStatusType('error');
        setReadinessStatusMessage('Unable to save readiness settings right now.');
        return;
      }

      const normalizedSource: ReadinessSource = isAppleHealthConnected ? readinessSource : 'manual';

      const { error: profileError } = await supabase.from('user_profile').upsert(
        {
          user_id: user.id,
          healthkit_enabled: isAppleHealthConnected,
        },
        { onConflict: 'user_id' },
      );

      if (profileError && !isMissingUserProfileSchemaError(profileError)) {
        setReadinessStatusType('error');
        setReadinessStatusMessage(profileError.message);
        return;
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: mergeUserMetadata(user.user_metadata, {
          readiness_preferences: {
            source: normalizedSource,
            promptsEnabled: isReadinessPromptsEnabled,
            questions: {
              sleep: readinessQuestions.sleep,
              stress: readinessQuestions.stress,
              menstrualCycle: readinessQuestions.menstrualCycle,
            },
          },
        }),
      });

      if (metadataError) {
        setReadinessStatusType('error');
        setReadinessStatusMessage(metadataError.message);
        return;
      }

      setReadinessSource(normalizedSource);
      setReadinessStatusType('success');
      setReadinessStatusMessage('Readiness settings saved to backend.');
    } catch (saveError) {
      console.error('Failed to save readiness settings:', saveError);
      setReadinessStatusType('error');
      setReadinessStatusMessage('Failed to save readiness settings.');
    } finally {
      setIsReadinessSaving(false);
    }
  };

  const handleEditExperienceLevel = () => {
    const options: TrainingExperience[] = ['beginner', 'intermediate', 'advanced'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Beginner', 'Intermediate', 'Advanced'],
          cancelButtonIndex: 0,
          title: 'Experience Level',
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          const selected = options[buttonIndex - 1];
          await saveExperienceLevel(selected);
        },
      );
    } else {
      Alert.alert(
        'Experience Level',
        'Select your training experience',
        [
          ...options.map((opt) => ({
            text: EXPERIENCE_LABELS[opt],
            onPress: () => saveExperienceLevel(opt),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  };

  const saveExperienceLevel = async (level: TrainingExperience) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setExperienceLevel(level);
    await supabase
      .from('user_profile')
      .update({ experience_level: level, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  };

  const saveCycleSettings = async () => {
    try {
      setCycleSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { dateFromDaysAgo } = await import('@/utils/cyclePhase');
      const daysNum = parseInt(daysSincePeriod, 10);
      const periodDate = !isNaN(daysNum) && daysNum >= 0 ? dateFromDaysAgo(daysNum) : null;
      const cycleLen = parseInt(avgCycleLength, 10);

      await supabase.from('user_profile').update({
        cycle_enabled: cycleEnabled,
        last_period_start_date: cycleEnabled ? periodDate : null,
        avg_cycle_length_days: !isNaN(cycleLen) && cycleLen > 0 ? cycleLen : 28,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    } finally {
      setCycleSaving(false);
    }
  };

  const handleMenuItemPress = (label: MenuLabel) => {
    if (label === 'Readiness Settings') {
      setReadinessStatusMessage(null);
      setIsReadinessModalVisible(true);
      return;
    }

    const route = MENU_ITEM_ROUTES[label];
    if (route) {
      router.push(route);
    }
  };

  const displayName = useMemo(() => profile?.full_name?.trim() || 'User', [profile?.full_name]);
  const avatarLabel = displayName.slice(0, 1).toUpperCase();

  const handleAvatarPress = useCallback(async () => {
    if (!profile?.id || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(profile.id);
      if (url) {
        const { error: upsertError } = await supabase
          .from('user_profile')
          .update({ avatar_url: url })
          .eq('user_id', profile.id);
        if (upsertError) {
          console.error('Profile upsert failed:', upsertError.message);
          Alert.alert('Error', 'Photo uploaded but failed to save. Please try again.');
          return;
        }
        setAvatarUrl(url);
      } else {
        Alert.alert('Photo', 'No photo was selected or permission was denied.');
      }
    } catch {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }, [profile?.id, avatarUploading]);

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 124 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <LinearGradient colors={['#2c81ff', '#8626ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLabel}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarCameraBtn}>
              {avatarUploading
                ? <ActivityIndicator size={10} color={theme.white} />
                : <Camera size={12} color={theme.white} />
              }
            </View>
          </Pressable>

          <View style={styles.userMeta}>
            <Text numberOfLines={1} style={styles.nameText}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={styles.emailText}>
              {profile?.email || 'No email address'}
            </Text>
          </View>
        </View>

        {/* ── Progress card ── */}
        <LinearGradient
          colors={[theme.cardBg, theme.backgroundDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          <Text style={styles.progressTitle}>Your Progress</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{progress.workouts}</Text>
              <Text style={styles.progressLabel}>Workouts</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{progress.weekStreak}</Text>
              <Text style={styles.progressLabel}>Week Streak</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{progress.prs}</Text>
              <Text style={styles.progressLabel}>PRs</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Training section ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>TRAINING</Text>
          <LinearGradient
            colors={[theme.cardBg, theme.backgroundDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.groupCard}
          >
            <Pressable
              onPress={handleEditExperienceLevel}
              style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            >
              <View style={styles.menuRowLeft}>
                <ChevronRight color={theme.placeholder} size={24} style={{ transform: [{ rotate: '0deg' }] }} />
                <Text style={styles.menuLabel}>Experience Level</Text>
              </View>
              <View style={styles.experienceBadge}>
                <Text style={styles.experienceBadgeText}>
                  {experienceLevel ? EXPERIENCE_LABELS[experienceLevel] : 'Not set'}
                </Text>
                <ChevronRight color={theme.placeholder} size={20} />
              </View>
            </Pressable>
          </LinearGradient>
        </View>

        {/* ── Cycle Tracking section ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>CYCLE TRACKING</Text>
          <LinearGradient
            colors={[theme.cardBg, theme.backgroundDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.groupCard, { overflow: 'visible', borderRadius: 22, padding: 16 }]}
          >
            <View style={styles.cycleToggleRow}>
              <Text style={styles.menuLabel}>Enable Cycle Tracking</Text>
              <Switch
                value={cycleEnabled}
                onValueChange={(val) => { setCycleEnabled(val); }}
                trackColor={{ false: theme.buttonDisabled, true: theme.primary }}
                thumbColor={theme.white}
                ios_backgroundColor={theme.buttonDisabled}
              />
            </View>

            {cycleEnabled && (
              <View style={styles.cycleFields}>
                <View style={styles.cycleField}>
                  <Text style={styles.cycleFieldLabel}>Days since period started</Text>
                  <TextInput
                    value={daysSincePeriod}
                    onChangeText={setDaysSincePeriod}
                    keyboardType="number-pad"
                    placeholder="e.g. 5"
                    placeholderTextColor={theme.placeholder}
                    style={styles.cycleInput}
                    maxLength={2}
                  />
                </View>
                <View style={styles.cycleField}>
                  <Text style={styles.cycleFieldLabel}>Average cycle length (days)</Text>
                  <TextInput
                    value={avgCycleLength}
                    onChangeText={setAvgCycleLength}
                    keyboardType="number-pad"
                    placeholder="28"
                    placeholderTextColor={theme.placeholder}
                    style={styles.cycleInput}
                    maxLength={2}
                  />
                </View>
                <Pressable
                  onPress={saveCycleSettings}
                  disabled={cycleSaving}
                  style={({ pressed }) => [styles.cycleSaveBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.cycleSaveBtnText}>{cycleSaving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            )}

            {!cycleEnabled && (
              <Pressable
                onPress={saveCycleSettings}
                disabled={cycleSaving}
                style={({ pressed }) => [styles.cycleSaveBtn, { marginTop: 12 }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.cycleSaveBtnText}>{cycleSaving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            )}
          </LinearGradient>
        </View>

        {/* ── Appearance section ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <LinearGradient
            colors={[theme.cardBg, theme.backgroundDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.groupCard, { padding: 16 }]}
          >
            {/* Light / Dark / System picker */}
            <View style={styles.appearanceRow}>
              {(['system', 'light', 'dark'] as AppearancePreference[]).map(pref => {
                const active = preference === pref;
                return (
                  <Pressable
                    key={pref}
                    onPress={() => setPreference(pref)}
                    accessibilityLabel={pref}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.appearanceBtn,
                      active
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: 'transparent', borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.appearanceBtnText, { color: active ? theme.white : theme.text }]}>
                      {pref.charAt(0).toUpperCase() + pref.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Colour palette swatches */}
            <View style={styles.paletteDivider} />
            <Text style={styles.paletteLabel}>Colour</Text>
            <View style={styles.paletteRow}>
              {(Object.entries(PALETTES) as [PaletteKey, typeof PALETTES[PaletteKey]][]).map(([key, p]) => {
                const active = palette === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setPalette(key)}
                    accessibilityLabel={p.label}
                    accessibilityState={{ selected: active }}
                    style={styles.swatchWrap}
                  >
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: p.swatch },
                        active && styles.swatchActive,
                      ]}
                    >
                      {active && (
                        <Check size={14} color="#fff" strokeWidth={3} />
                      )}
                    </View>
                    <Text style={[styles.swatchText, active && { color: theme.textPrimary }]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Haptic feedback toggle */}
            <View style={styles.paletteDivider} />
            <View style={styles.cycleToggleRow}>
              <Text style={styles.menuLabel}>Haptic Feedback</Text>
              <Switch
                value={hapticsEnabled}
                onValueChange={(val) => {
                  setHapticsEnabled(val);
                  void AsyncStorage.setItem('haptics_enabled', val ? 'true' : 'false');
                }}
                trackColor={{ false: theme.buttonDisabled, true: theme.primary }}
                thumbColor={theme.white}
                ios_backgroundColor={theme.buttonDisabled}
              />
            </View>
          </LinearGradient>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Menu sections ── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <LinearGradient
              colors={[theme.cardBg, theme.backgroundDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.groupCard}
            >
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;

                return (
                  <Pressable
                    key={item.label}
                    onPress={() => handleMenuItemPress(item.label)}
                    style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  >
                    <View style={styles.menuRowLeft}>
                      {renderMenuIcon(item.icon, theme.placeholder)}
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </View>
                    <ChevronRight color={theme.placeholder} size={24} />
                    {!isLast ? <View style={styles.rowDivider} /> : null}
                  </Pressable>
                );
              })}
            </LinearGradient>
          </View>
        ))}

        {/* ── Logout ── */}
        <LinearGradient
          colors={[theme.cardBg, theme.backgroundDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoutCard}
        >
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutInner, pressed && styles.logoutPressed]}
          >
            <LogOut color="#ff3c46" size={24} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>

      {/* ── Readiness modal ── */}
      <Modal
        visible={isReadinessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReadinessModalVisible(false)}
      >
        <View style={styles.readinessOverlay}>
          <LinearGradient
            colors={[theme.surfaceBg, theme.backgroundDark]}
            start={{ x: 0.08, y: 0.04 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.readinessModal,
              {
                marginTop: insets.top + 18,
                marginBottom: insets.bottom + 18,
              },
            ]}
          >
            <View style={styles.readinessHeader}>
              <Text style={styles.readinessHeaderTitle}>Readiness Settings</Text>
              <Pressable
                onPress={() => setIsReadinessModalVisible(false)}
                style={({ pressed }) => [styles.readinessCloseButton, pressed && styles.readinessCloseButtonPressed]}
              >
                <X color={theme.textPrimary} size={24} />
              </Pressable>
            </View>

            <View style={styles.readinessHeaderDivider} />

            <ScrollView
              style={styles.readinessBodyScroll}
              contentContainerStyle={styles.readinessBodyContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.readinessSectionLabel}>Apple Health Integration</Text>
              <Pressable
                onPress={toggleAppleHealthConnection}
                style={({ pressed }) => [
                  styles.appleHealthCard,
                  isAppleHealthConnected ? styles.appleHealthCardConnected : styles.appleHealthCardDisconnected,
                  pressed && styles.readinessPressablePressed,
                ]}
              >
                <View
                  style={[
                    styles.appleHealthIconWrap,
                    isAppleHealthConnected ? styles.appleHealthIconWrapConnected : styles.appleHealthIconWrapDisconnected,
                  ]}
                >
                  <Heart
                    color={isAppleHealthConnected ? '#f5fff9' : '#f0f2f9'}
                    size={26}
                    strokeWidth={2.2}
                  />
                </View>

                <View style={styles.appleHealthTextWrap}>
                  <View style={styles.appleHealthTitleRow}>
                    <Text style={styles.appleHealthTitle}>Apple Health</Text>
                    {isAppleHealthConnected ? (
                      <Text style={styles.appleHealthConnectedText}>✓ Connected</Text>
                    ) : null}
                  </View>
                  <Text style={styles.appleHealthSubtitle}>
                    {isAppleHealthConnected
                      ? 'Automatically sync sleep and activity data'
                      : 'Connect to auto-fill readiness data'}
                  </Text>
                </View>
              </Pressable>

              {isAppleHealthConnected ? (
                <View style={styles.permissionsCard}>
                  <Text style={styles.permissionsTitle}>Permissions Granted:</Text>
                  <Text style={styles.permissionsItem}>• Sleep Analysis</Text>
                  <Text style={styles.permissionsItem}>• Heart Rate Data</Text>
                  <Text style={styles.permissionsItem}>• Activity Data</Text>
                </View>
              ) : null}

              <Text style={styles.readinessSectionLabel}>Readiness Source</Text>
              <Pressable
                onPress={() => setReadinessSource('apple')}
                style={({ pressed }) => [styles.readinessSourceRow, pressed && styles.readinessPressablePressed]}
              >
                <View style={[styles.radioOuter, readinessSource === 'apple' && styles.radioOuterSelected]}>
                  {readinessSource === 'apple' ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={styles.readinessSourceTextWrap}>
                  <Text style={styles.readinessSourceTitle}>Apple Health Auto-fill</Text>
                  <Text style={styles.readinessSourceSubtitle}>Automatically sync data (editable)</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setReadinessSource('manual')}
                style={({ pressed }) => [styles.readinessSourceRow, pressed && styles.readinessPressablePressed]}
              >
                <View style={[styles.radioOuter, readinessSource === 'manual' && styles.radioOuterSelected]}>
                  {readinessSource === 'manual' ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={styles.readinessSourceTextWrap}>
                  <Text style={styles.readinessSourceTitle}>Manual Check-in</Text>
                  <Text style={styles.readinessSourceSubtitle}>Enter data manually each time</Text>
                </View>
              </Pressable>

              <Text style={styles.readinessSectionLabel}>Readiness Prompts</Text>
              <View style={styles.promptsToggleRow}>
                <View style={styles.promptsToggleTextWrap}>
                  <Text style={styles.promptsToggleTitle}>Enable Prompts</Text>
                  <Text style={styles.promptsToggleSubtitle}>Show readiness check-in on home screen</Text>
                </View>
                <Switch
                  value={isReadinessPromptsEnabled}
                  onValueChange={setIsReadinessPromptsEnabled}
                  trackColor={{ false: theme.buttonDisabled, true: theme.primary }}
                  thumbColor={theme.white}
                  ios_backgroundColor={theme.buttonDisabled}
                />
              </View>

              <Text style={styles.readinessSectionLabel}>Questions to Include</Text>
              {READINESS_QUESTIONS.map((question) => {
                const isChecked = readinessQuestions[question.key];

                return (
                  <Pressable
                    key={question.key}
                    onPress={() => toggleReadinessQuestion(question.key)}
                    style={({ pressed }) => [styles.questionRow, pressed && styles.readinessPressablePressed]}
                  >
                    <Text style={styles.questionLabel}>{question.label}</Text>
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked ? <Check color={theme.white} size={16} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}

              <View style={styles.privacyCard}>
                <Text style={styles.privacyText}>
                  <Text style={styles.privacyLabel}>Privacy:</Text> All health data is stored locally on your
                  device and encrypted. We never share your personal health information with third parties.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.readinessFooter}>
              {readinessStatusMessage ? (
                <Text
                  style={[
                    styles.readinessStatusText,
                    readinessStatusType === 'error'
                      ? styles.readinessStatusError
                      : styles.readinessStatusSuccess,
                  ]}
                >
                  {readinessStatusMessage}
                </Text>
              ) : null}
              <Pressable
                disabled={isReadinessSaving}
                onPress={handleSaveReadinessSettings}
                style={({ pressed }) => [
                  styles.readinessSaveButton,
                  isReadinessSaving && styles.readinessSaveButtonDisabled,
                  pressed && !isReadinessSaving && styles.readinessSaveButtonPressed,
                ]}
              >
                <Text style={styles.readinessSaveButtonText}>
                  {isReadinessSaving ? 'Saving...' : 'Save Settings'}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
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
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      color: theme.text,
      fontSize: 15,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarWrap: {
      width: 76,
      height: 76,
      marginRight: 16,
    },
    avatarCameraBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.backgroundDark,
    },
    avatarText: {
      color: theme.white,
      fontSize: 21,
      fontWeight: '500',
      lineHeight: 22,
    },
    userMeta: {
      flex: 1,
    },
    nameText: {
      color: theme.textPrimary,
      fontSize: 21,
      fontWeight: '500',
    },
    emailText: {
      color: theme.placeholder,
      fontSize: 14,
      marginTop: 4,
    },
    progressCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 18,
      paddingVertical: 24,
      marginBottom: 22,
    },
    progressTitle: {
      color: theme.text,
      fontSize: 16,
      marginBottom: 18,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressItem: {
      flex: 1,
      alignItems: 'center',
    },
    progressValue: {
      color: theme.textPrimary,
      fontSize: 44,
      lineHeight: 48,
      fontWeight: '500',
    },
    progressLabel: {
      color: theme.placeholder,
      fontSize: 14,
      marginTop: 4,
    },
    errorBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 59, 69, 0.35)',
      backgroundColor: 'rgba(255, 59, 69, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    errorText: {
      color: '#ff747c',
      fontSize: 13,
    },
    sectionWrap: {
      marginBottom: 20,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 15,
      letterSpacing: 1.2,
      marginBottom: 11,
    },
    groupCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    menuRow: {
      minHeight: 84,
      paddingHorizontal: 20,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      position: 'relative',
    },
    menuRowPressed: {
      opacity: 0.84,
    },
    menuRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    menuLabel: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '500',
    },
    rowDivider: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 0,
      height: 1,
      backgroundColor: theme.border,
    },
    cycleToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    cycleFields: {
      marginTop: 16,
      gap: 14,
    },
    cycleField: {
      gap: 6,
    },
    cycleFieldLabel: {
      color: theme.text,
      fontSize: 13,
    },
    cycleInput: {
      backgroundColor: theme.mutedBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '500',
      borderWidth: 1,
      borderColor: theme.border,
    },
    cycleSaveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    cycleSaveBtnText: {
      color: theme.white,
      fontSize: 15,
      fontWeight: '600',
    },
    experienceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    experienceBadgeText: {
      color: theme.placeholder,
      fontSize: 15,
      fontWeight: '500',
    },
    // ── Appearance ────────────────────────────────────────────────────────────
    appearanceRow: {
      flexDirection: 'row',
      gap: 10,
    },
    appearanceBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    appearanceBtnText: {
      fontSize: 15,
      fontWeight: '600',
    },
    paletteDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 14,
    },
    paletteLabel: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    paletteRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    swatchWrap: {
      alignItems: 'center',
      gap: 6,
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchActive: {
      borderWidth: 3,
      borderColor: theme.white,
    },
    swatchText: {
      color: theme.placeholder,
      fontSize: 12,
      fontWeight: '500',
    },
    // ── Logout ────────────────────────────────────────────────────────────────
    logoutCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 96,
      justifyContent: 'center',
    },
    logoutInner: {
      minHeight: 96,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    logoutPressed: {
      opacity: 0.84,
    },
    logoutText: {
      color: '#ff3c46',
      fontSize: 17,
      fontWeight: '500',
    },
    // ── Readiness modal ───────────────────────────────────────────────────────
    readinessOverlay: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      paddingHorizontal: 18,
    },
    readinessModal: {
      width: '100%',
      maxWidth: 520,
      height: '86%',
      alignSelf: 'center',
      borderRadius: 30,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    readinessHeader: {
      minHeight: 84,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    readinessHeaderTitle: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: '500',
    },
    readinessCloseButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(95, 102, 120, 0.3)',
    },
    readinessCloseButtonPressed: {
      opacity: 0.82,
    },
    readinessHeaderDivider: {
      height: 1,
      backgroundColor: theme.border,
    },
    readinessBodyScroll: {
      flex: 1,
    },
    readinessBodyContent: {
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 18,
    },
    readinessSectionLabel: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 12,
      marginTop: 2,
    },
    appleHealthCard: {
      borderRadius: 22,
      borderWidth: 2,
      paddingHorizontal: 18,
      paddingVertical: 17,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    appleHealthCardDisconnected: {
      borderColor: theme.border,
      backgroundColor: theme.mutedBg,
    },
    appleHealthCardConnected: {
      borderColor: '#00bc57',
      backgroundColor: 'rgba(6, 134, 73, 0.2)',
    },
    appleHealthIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    appleHealthIconWrapDisconnected: {
      backgroundColor: 'rgba(146, 151, 169, 0.22)',
    },
    appleHealthIconWrapConnected: {
      backgroundColor: '#16ba5f',
    },
    appleHealthTextWrap: {
      flex: 1,
    },
    appleHealthTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: 9,
      marginBottom: 6,
    },
    appleHealthTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '500',
    },
    appleHealthConnectedText: {
      color: '#08cf61',
      fontSize: 13,
      fontWeight: '600',
    },
    appleHealthSubtitle: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
    },
    permissionsCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#1445a4',
      backgroundColor: 'rgba(31, 60, 119, 0.26)',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
    },
    permissionsTitle: {
      color: '#7dc4ff',
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 5,
    },
    permissionsItem: {
      color: '#c4d6ff',
      fontSize: 15,
      lineHeight: 23,
    },
    readinessSourceRow: {
      borderRadius: 20,
      minHeight: 94,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.mutedBg,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    radioOuter: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 3,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      backgroundColor: theme.surfaceBg,
    },
    radioOuterSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.white,
    },
    readinessSourceTextWrap: {
      flex: 1,
    },
    readinessSourceTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '500',
    },
    readinessSourceSubtitle: {
      color: theme.text,
      fontSize: 14,
      marginTop: 2,
    },
    promptsToggleRow: {
      borderRadius: 20,
      minHeight: 104,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.mutedBg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    promptsToggleTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    promptsToggleTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '500',
    },
    promptsToggleSubtitle: {
      color: theme.text,
      fontSize: 14,
      marginTop: 3,
    },
    questionRow: {
      borderRadius: 20,
      minHeight: 88,
      paddingHorizontal: 16,
      backgroundColor: theme.mutedBg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    questionLabel: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '500',
    },
    checkbox: {
      width: 34,
      height: 34,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mutedBg,
    },
    checkboxChecked: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    privacyCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedBg,
      paddingHorizontal: 15,
      paddingVertical: 14,
      marginTop: 10,
    },
    privacyText: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
    },
    privacyLabel: {
      color: theme.textPrimary,
      fontWeight: '500',
    },
    readinessFooter: {
      paddingHorizontal: 24,
      paddingTop: 14,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surfaceBg,
    },
    readinessStatusText: {
      fontSize: 13,
      marginBottom: 10,
      marginLeft: 2,
    },
    readinessStatusSuccess: {
      color: theme.success,
    },
    readinessStatusError: {
      color: theme.errorLight,
    },
    readinessSaveButton: {
      minHeight: 78,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readinessSaveButtonDisabled: {
      opacity: 0.65,
    },
    readinessSaveButtonPressed: {
      opacity: 0.85,
    },
    readinessSaveButtonText: {
      color: theme.white,
      fontSize: 18,
      fontWeight: '500',
    },
    readinessPressablePressed: {
      opacity: 0.9,
    },
  });
}
