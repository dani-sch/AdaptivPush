import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Dumbbell, LogOut, Mail, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    BACKGROUND_COLOR, BACKGROUND_COLOR_DARK, BORDER_COLOR,
    BUTTON_PICKED, ERROR_COLOR,
    ERROR_COLOR_LIGHT, PLACEHOLDER_TEXT, PRIMARY_COLOR,
    SECONDARY_COLOR,
    SECONDARY_COLOR_LIGHT,
    TEXT_COLOR,
    WHITE
} from "@/constants/colors";
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Failed to fetch user');
        return;
      }

      // Fetch user metadata
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
    }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BUTTON_PICKED}/>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[BUTTON_PICKED, SECONDARY_COLOR_LIGHT]} style={styles.headerGradient}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <User color={WHITE} size={48} />
            </View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
          </View>
        </LinearGradient>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          {/* Email */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Mail color={BUTTON_PICKED} size={20} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          {/* Member Since */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Dumbbell color={SECONDARY_COLOR} size={20} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {/* Refresh Button */}
          <Pressable
            style={styles.actionButton}
            onPress={fetchUserProfile}
            android_ripple={{ color: 'rgba(91, 124, 255, 0.2)' }}
          >
            <Text style={styles.actionButtonText}>Refresh Profile</Text>
          </Pressable>

          {/* Logout Button */}
          <Pressable
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOut color={ERROR_COLOR_LIGHT} size={18} />
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR_DARK,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: TEXT_COLOR,
    marginTop: 12,
    fontSize: 16,
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    color: WHITE,
    fontSize: 14,
    marginBottom: 4,
  },
  profileName: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: PLACEHOLDER_TEXT,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: ERROR_COLOR_LIGHT,
  },
  logoutButtonText: {
    color: ERROR_COLOR_LIGHT,
    marginLeft: 8,
  },
  errorContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: ERROR_COLOR,
  },
  errorText: {
    color: ERROR_COLOR_LIGHT,
    fontSize: 14,
    fontWeight: '500',
  },
});
