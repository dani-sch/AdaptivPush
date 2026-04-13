import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Database,
  Download,
  EyeOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DEFAULT_PRIVACY_PREFERENCES,
  mergeUserMetadata,
  parsePrivacyPreferences,
} from '@/utils/profilePreferences';
import { supabase } from '@/utils/supabase';

type PrivacyToggleRowProps = {
  label: string;
  hint: string;
  icon: ReactNode;
  value: boolean;
  onValueChange: (next: boolean) => void;
};

const PrivacyToggleRow = ({
  label,
  hint,
  icon,
  value,
  onValueChange,
}: PrivacyToggleRowProps) => {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconShell}>{icon}</View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowHint}>{hint}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#4f5568', true: '#2f7cff' }}
        thumbColor="#f4f6ff"
        ios_backgroundColor="#4f5568"
      />
    </View>
  );
};

type DataActionCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  buttonText: string;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

const DataActionCard = ({
  title,
  description,
  icon,
  buttonText,
  destructive = false,
  disabled = false,
  loading = false,
  onPress,
}: DataActionCardProps) => {
  return (
    <View style={styles.dataActionCard}>
      <View style={styles.dataActionHeader}>
        <View style={[styles.iconShell, destructive && styles.iconShellDanger]}>{icon}</View>
        <View style={styles.dataActionHeaderText}>
          <Text style={[styles.dataActionTitle, destructive && styles.dataActionTitleDanger]}>{title}</Text>
          <Text style={styles.dataActionDescription}>{description}</Text>
        </View>
      </View>

      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.dataActionButton,
          destructive ? styles.dataActionButtonDanger : styles.dataActionButtonPrimary,
          disabled && styles.dataActionButtonDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.dataActionButtonText,
            destructive ? styles.dataActionButtonTextDanger : styles.dataActionButtonTextPrimary,
          ]}
        >
          {loading ? 'Submitting...' : buttonText}
        </Text>
      </Pressable>
    </View>
  );
};

export default function PrivacyDataScreen() {
  const insets = useSafeAreaInsets();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    DEFAULT_PRIVACY_PREFERENCES.analyticsEnabled,
  );
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(
    DEFAULT_PRIVACY_PREFERENCES.crashReportsEnabled,
  );
  const [sensitiveDataMasking, setSensitiveDataMasking] = useState(
    DEFAULT_PRIVACY_PREFERENCES.sensitiveDataMasking,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeRequest, setActiveRequest] = useState<'export' | 'deletion' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        setSaveMessage('');

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setErrorMessage('Unable to load privacy settings.');
          return;
        }

        const preferences = parsePrivacyPreferences(user.user_metadata?.privacy_preferences);
        setAnalyticsEnabled(preferences.analyticsEnabled);
        setCrashReportsEnabled(preferences.crashReportsEnabled);
        setSensitiveDataMasking(preferences.sensitiveDataMasking);
      } catch (loadError) {
        console.error('Failed to load privacy settings:', loadError);
        setErrorMessage('Failed to load privacy settings.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPrivacySettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSaveMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage('Unable to save privacy settings.');
        return;
      }

      const nextPreferences = {
        analyticsEnabled,
        crashReportsEnabled,
        sensitiveDataMasking,
      };

      const { error: saveError } = await supabase.auth.updateUser({
        data: mergeUserMetadata(user.user_metadata, {
          privacy_preferences: nextPreferences,
        }),
      });

      if (saveError) {
        setErrorMessage(saveError.message);
        return;
      }

      setSaveMessage('Privacy controls saved to backend.');
    } catch (saveError) {
      console.error('Failed to save privacy settings:', saveError);
      setErrorMessage('Failed to save privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataRequest = async (requestType: 'export' | 'deletion') => {
    try {
      setActiveRequest(requestType);
      setErrorMessage('');
      setSaveMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage('Unable to submit data request right now.');
        return;
      }

      const existingMetadata = mergeUserMetadata(user.user_metadata, {});
      const existingRequests =
        typeof existingMetadata.privacy_data_requests === 'object' &&
        existingMetadata.privacy_data_requests !== null &&
        !Array.isArray(existingMetadata.privacy_data_requests)
          ? (existingMetadata.privacy_data_requests as Record<string, unknown>)
          : {};

      const nextRequests = {
        ...existingRequests,
        [requestType === 'export' ? 'exportRequestedAt' : 'deletionRequestedAt']: new Date().toISOString(),
      };

      const { error: requestError } = await supabase.auth.updateUser({
        data: mergeUserMetadata(user.user_metadata, {
          privacy_data_requests: nextRequests,
        }),
      });

      if (requestError) {
        setErrorMessage(requestError.message);
        return;
      }

      setSaveMessage(
        requestType === 'export'
          ? 'Export request submitted to backend.'
          : 'Account deletion request submitted to backend.',
      );
    } catch (requestError) {
      console.error('Failed to submit data request:', requestError);
      setErrorMessage('Failed to submit data request.');
    } finally {
      setActiveRequest(null);
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
          <Text style={styles.headerTitle}>Privacy & Data</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={['#181c29', '#12141b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headlineCard}
        >
          <View style={styles.headlineIconWrap}>
            <ShieldCheck color="#e6ebfc" size={22} />
          </View>
          <View style={styles.headlineTextWrap}>
            <Text style={styles.headlineTitle}>You Control Your Data</Text>
            <Text style={styles.headlineSubtitle}>
              Tune telemetry, export your records, or request deletion whenever you need.
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Privacy Controls</Text>
        <View style={styles.sectionCard}>
          <PrivacyToggleRow
            label="Analytics"
            hint="Share anonymous usage events to improve features"
            icon={<Activity color="#9ba3b9" size={18} />}
            value={analyticsEnabled}
            onValueChange={setAnalyticsEnabled}
          />
          <PrivacyToggleRow
            label="Crash Reports"
            hint="Send error traces so we can fix reliability issues"
            icon={<Database color="#9ba3b9" size={18} />}
            value={crashReportsEnabled}
            onValueChange={setCrashReportsEnabled}
          />
          <PrivacyToggleRow
            label="Sensitive Data Masking"
            hint="Hide health metrics in previews and widgets"
            icon={<EyeOff color="#9ba3b9" size={18} />}
            value={sensitiveDataMasking}
            onValueChange={setSensitiveDataMasking}
          />
        </View>

        <Text style={styles.sectionTitle}>Data Requests</Text>
        <DataActionCard
          title="Export Your Data"
          description="Generate a downloadable file of your account and training records."
          icon={<Download color="#8fc4ff" size={18} />}
          buttonText="Create Export"
          disabled={activeRequest !== null}
          loading={activeRequest === 'export'}
          onPress={() => void handleDataRequest('export')}
        />

        <DataActionCard
          title="Delete Account"
          description="Permanently remove account data after a short safety verification period."
          icon={<Trash2 color="#ff8f96" size={18} />}
          buttonText="Request Deletion"
          destructive
          disabled={activeRequest !== null}
          loading={activeRequest === 'deletion'}
          onPress={() => void handleDataRequest('deletion')}
        />

        <Pressable style={({ pressed }) => [styles.learnMoreRow, pressed && styles.pressed]}>
          <Text style={styles.learnMoreText}>Read Full Data Policy</Text>
          <ChevronRight color="#6f758a" size={18} />
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#7aa0ff" />
            <Text style={styles.loadingText}>Loading from backend...</Text>
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
            {isSaving ? 'Saving...' : 'Save Privacy Settings'}
          </Text>
        </Pressable>
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
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95, 103, 124, 0.24)',
  },
  rowLeft: {
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
  iconShellDanger: {
    backgroundColor: '#341a20',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    color: '#e7ebf8',
    fontSize: 15,
    fontWeight: '500',
  },
  rowHint: {
    color: '#8d95ac',
    fontSize: 12,
    marginTop: 2,
  },
  dataActionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#242a3b',
    backgroundColor: '#121621',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  dataActionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dataActionHeaderText: {
    flex: 1,
  },
  dataActionTitle: {
    color: '#e8ecf9',
    fontSize: 16,
    fontWeight: '600',
  },
  dataActionTitleDanger: {
    color: '#ffb2b8',
  },
  dataActionDescription: {
    color: '#8d95ac',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  dataActionButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dataActionButtonDisabled: {
    opacity: 0.65,
  },
  dataActionButtonPrimary: {
    borderColor: '#325ec2',
    backgroundColor: '#1d376f',
  },
  dataActionButtonDanger: {
    borderColor: '#6f2832',
    backgroundColor: '#3c1a21',
  },
  dataActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dataActionButtonTextPrimary: {
    color: '#c4ddff',
  },
  dataActionButtonTextDanger: {
    color: '#ff9ea7',
  },
  learnMoreRow: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b3245',
    backgroundColor: '#121722',
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  learnMoreText: {
    color: '#c7cedf',
    fontSize: 15,
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
});
