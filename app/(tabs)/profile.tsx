import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';
import { Calendar, ChevronRight, LogOut, RefreshCw } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Failed to fetch user');
        return;
      }

      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'User',
        created_at: user.created_at,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('An error occurred while loading your profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        return;
      }
      router.replace('/');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    }
  };

  const goToWorkoutHistory = () => {
    router.push('/workout-history');
  };

  const today = useMemo(() => {
    const now = new Date();
    return {
      day: now.toLocaleDateString(undefined, { weekday: 'long' }),
      date: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  }, []);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const accountStatus = profile?.email ? 'Verified' : 'Missing';
  const profileScore = profile?.full_name && profile?.email ? '2/2' : '1/2';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { paddingTop: insets.top + 18 }]}>
          <Text style={styles.dayText}>{today.day}</Text>
          <Text style={styles.dateText}>{today.date}</Text>

          <View style={styles.primaryCard}>
            <View style={styles.primaryHeaderRow}>
              <View>
                <Text style={styles.primaryLabel}>Your Profile</Text>
                <Text style={styles.primaryTitle}>{profile?.full_name || 'User'}</Text>
                <Text style={styles.primarySub}>{profile?.email || 'No email found'}</Text>
              </View>
              <View style={styles.primaryIconWrap}>
                <Calendar color="#dbeafe" size={18} />
              </View>
            </View>

            <View style={styles.primaryDetailRow}>
              <Text style={styles.primaryDetailKey}>Email</Text>
              <Text style={styles.primaryDetailValue} numberOfLines={1}>
                {profile?.email || 'N/A'}
              </Text>
            </View>
            <View style={styles.primaryDetailRow}>
              <Text style={styles.primaryDetailKey}>Member since</Text>
              <Text style={styles.primaryDetailValue}>{memberSince}</Text>
            </View>

            <Pressable
              style={styles.primaryActionButton}
              onPress={handleRefresh}
              android_ripple={{ color: 'rgba(37, 99, 235, 0.15)' }}
              disabled={refreshing}
            >
              <RefreshCw color="#2563eb" size={16} />
              <Text style={styles.primaryActionButtonText}>{refreshing ? 'Refreshing...' : 'Refresh Profile'}</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Member Since</Text>
              <Text style={styles.statValue}>{memberSince}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Account</Text>
              <Text style={styles.statValueAccent}>{accountStatus}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Profile</Text>
              <Text style={styles.statValue}>{profileScore}</Text>
            </View>
          </View>

          <Pressable
            style={styles.workoutHistoryButton}
            onPress={goToWorkoutHistory}
            android_ripple={{ color: 'rgba(37, 99, 235, 0.15)' }}
          >
            <View>
              <Text style={styles.workoutHistoryLabel}>Training</Text>
              <Text style={styles.workoutHistoryTitle}>Workout History</Text>
            </View>
            <ChevronRight color="#dbeafe" size={18} />
          </Pressable>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            android_ripple={{ color: 'rgba(239, 68, 68, 0.18)' }}
          >
            <LogOut color="#ef4444" size={16} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#a1a1aa',
    marginTop: 12,
    fontSize: 16,
  },
  dayText: {
    color: '#f4f4f5',
    fontSize: 40,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateText: {
    color: '#71717a',
    fontSize: 30,
    fontWeight: '500',
    marginBottom: 18,
  },
  primaryCard: {
    backgroundColor: '#2154f4',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  primaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  primaryLabel: {
    color: '#bfdbfe',
    fontSize: 18,
    marginBottom: 6,
  },
  primaryTitle: {
    color: 'white',
    fontSize: 46,
    fontWeight: '600',
    marginBottom: 6,
  },
  primarySub: {
    color: '#dbeafe',
    fontSize: 16,
  },
  primaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryDetailKey: {
    color: '#dbeafe',
    fontSize: 15,
    maxWidth: '48%',
  },
  primaryDetailValue: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
    maxWidth: '50%',
    textAlign: 'right',
  },
  primaryActionButton: {
    marginTop: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 18,
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionButtonText: {
    color: '#2563eb',
    fontSize: 20,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#12141b',
    borderColor: '#232734',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 92,
  },
  statLabel: {
    color: '#71717a',
    fontSize: 13,
    marginBottom: 8,
  },
  statValue: {
    color: '#f4f4f5',
    fontSize: 23,
    fontWeight: '500',
  },
  statValueAccent: {
    color: '#4ade80',
    fontSize: 23,
    fontWeight: '600',
  },
  workoutHistoryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  workoutHistoryLabel: {
    color: '#bfdbfe',
    fontSize: 13,
    marginBottom: 4,
  },
  workoutHistoryTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    minHeight: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '600',
  },
});
