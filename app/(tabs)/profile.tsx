import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Heart,
  LogOut,
  Shield,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/utils/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
}

interface WorkoutHistoryRow {
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

type MenuIcon = 'user' | 'bell' | 'heart' | 'shield' | 'help';

interface MenuSection {
  title: string;
  items: {
    label: string;
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
      .map((row) => row.completed_at ?? row.created_at ?? '')
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

const renderMenuIcon = (icon: MenuIcon) => {
  switch (icon) {
    case 'user':
      return <UserRound color="#747a8f" size={24} />;
    case 'bell':
      return <Bell color="#747a8f" size={24} />;
    case 'heart':
      return <Heart color="#747a8f" size={24} />;
    case 'shield':
      return <Shield color="#747a8f" size={24} />;
    case 'help':
      return <CircleHelp color="#747a8f" size={24} />;
    default:
      return null;
  }
};

const isMissingWorkoutHistoryTableError = (error: { code?: string | null; message?: string | null } | null | undefined): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === 'PGRST205') {
    return true;
  }

  return Boolean(
    error.message?.toLowerCase().includes("could not find the table 'public.workout_history'"),
  );
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressSummary>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
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

      const { data: historyRows, error: historyError } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (historyError) {
        if (isMissingWorkoutHistoryTableError(historyError)) {
          setProgress(DEFAULT_PROGRESS);
          setError(null);
          return;
        }

        setError(historyError.message);
        setProgress(DEFAULT_PROGRESS);
        return;
      }

      const rows = (historyRows ?? []) as WorkoutHistoryRow[];
      setProgress({
        workouts: rows.length,
        weekStreak: computeWeekStreak(rows),
        prs: rows.reduce((total, row) => total + parsePrCount(row), 0),
      });
    } catch (fetchError) {
      console.error('Failed to load profile screen:', fetchError);
      setError('Failed to load profile data.');
      setProgress(DEFAULT_PROGRESS);
    } finally {
      setLoading(false);
    }
  };

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

  const displayName = useMemo(() => profile?.full_name?.trim() || 'User', [profile?.full_name]);
  const avatarLabel = displayName.slice(0, 1).toUpperCase();

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2f7cff" />
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
        <View style={styles.headerRow}>
          <LinearGradient colors={['#2c81ff', '#8626ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLabel}</Text>
          </LinearGradient>

          <View style={styles.userMeta}>
            <Text numberOfLines={1} style={styles.nameText}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={styles.emailText}>
              {profile?.email || 'No email address'}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={['#181b26', '#12141b']}
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

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <LinearGradient
              colors={['#171a24', '#12141b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.groupCard}
            >
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;

                return (
                  <Pressable
                    key={item.label}
                    onPress={() => undefined}
                    style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  >
                    <View style={styles.menuRowLeft}>
                      {renderMenuIcon(item.icon)}
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </View>
                    <ChevronRight color="#4d5265" size={24} />
                    {!isLast ? <View style={styles.rowDivider} /> : null}
                  </Pressable>
                );
              })}
            </LinearGradient>
          </View>
        ))}

        <LinearGradient
          colors={['#171a24', '#12141b']}
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#83889a',
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
    marginRight: 16,
  },
  avatarText: {
    color: '#e9edff',
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 22,
  },
  userMeta: {
    flex: 1,
  },
  nameText: {
    color: '#f4f6ff',
    fontSize: 21,
    fontWeight: '500',
  },
  emailText: {
    color: '#6f7485',
    fontSize: 14,
    marginTop: 4,
  },
  progressCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202433',
    paddingHorizontal: 18,
    paddingVertical: 24,
    marginBottom: 22,
  },
  progressTitle: {
    color: '#8f95a8',
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
    color: '#f4f6ff',
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '500',
  },
  progressLabel: {
    color: '#6f7485',
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
    color: '#696f82',
    fontSize: 15,
    letterSpacing: 1.2,
    marginBottom: 11,
  },
  groupCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202433',
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
    color: '#e8ebf5',
    fontSize: 17,
    fontWeight: '500',
  },
  rowDivider: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(93, 100, 121, 0.28)',
  },
  logoutCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#202433',
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
});
