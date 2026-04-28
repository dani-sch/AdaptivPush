import { router } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Phone,
  Save,
  UserRound,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseDateInput } from '@/utils/conversions';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import { mergeUserMetadata } from '@/utils/profilePreferences';
import { supabase } from '@/utils/supabase';

type FieldProps = {
  label: string;
  icon: ReactNode;
  value: string;
  onChangeText?: (next: string) => void;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
};

const ProfileField = ({
  label,
  icon,
  value,
  onChangeText,
  editable = true,
  keyboardType = 'default',
}: FieldProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, !editable && styles.inputShellReadOnly]}>
        <View style={styles.inputIconWrap}>{icon}</View>
        <TextInput
          style={[styles.input, !editable && styles.inputReadOnly]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize="none"
          placeholderTextColor={theme.placeholder}
        />
      </View>
    </View>
  );
};

const isMissingUserProfileSchemaError = (error: {
  code?: string | null;
  message?: string | null;
}): boolean => {
  if (error.code === 'PGRST205' || error.code === 'PGRST204') {
    return true;
  }

  const normalized = error.message?.toLowerCase() ?? '';
  return (
    normalized.includes("could not find the table 'public.user_profile'") ||
    normalized.includes("could not find the 'date_of_birth' column")
  );
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatBirthdayForInput = (value: string): string => {
  const trimmed = value.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const [year, month, day] = trimmed.split('-');
  return `${month}/${day}/${year}`;
};

const normalizeBirthdayForStorage = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return parseDateInput(trimmed);
};

export default function PersonalInformationScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadPersonalInformation = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        setSaveMessage('');

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setErrorMessage('Unable to load personal information.');
          return;
        }

        const metadata = mergeUserMetadata(user.user_metadata, {});
        setEmail(user.email ?? '');
        setFullName(typeof metadata.full_name === 'string' ? metadata.full_name : '');
        setPreferredName(typeof metadata.preferred_name === 'string' ? metadata.preferred_name : '');
        setPhone(typeof metadata.phone === 'string' ? metadata.phone : '');

        const { data: profileData, error: profileError } = await supabase
          .from('user_profile')
          .select('date_of_birth')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError && !isMissingUserProfileSchemaError(profileError)) {
          setErrorMessage(profileError.message);
          return;
        }

        setBirthday(profileData?.date_of_birth ? formatBirthdayForInput(profileData.date_of_birth) : '');
      } catch (loadError) {
        console.error('Failed to load personal information screen:', loadError);
        setErrorMessage('Failed to load personal information.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPersonalInformation();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSaveMessage('');

      const trimmedBirthday = birthday.trim();
      const parsedBirthday = normalizeBirthdayForStorage(trimmedBirthday);

      if (trimmedBirthday.length > 0 && !parsedBirthday) {
        setErrorMessage('Use MM/DD/YYYY for birthday.');
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage('Unable to save changes right now.');
        return;
      }

      const metadataPayload = mergeUserMetadata(user.user_metadata, {
        full_name: fullName.trim(),
        preferred_name: preferredName.trim(),
        phone: phone.trim(),
      });

      const { error: metadataError } = await supabase.auth.updateUser({
        data: metadataPayload,
      });

      if (metadataError) {
        setErrorMessage(metadataError.message);
        return;
      }

      const { error: profileError } = await supabase.from('user_profile').upsert(
        {
          user_id: user.id,
          date_of_birth: parsedBirthday,
        },
        { onConflict: 'user_id' },
      );

      if (profileError && !isMissingUserProfileSchemaError(profileError)) {
        setErrorMessage(profileError.message);
        return;
      }

      setBirthday(parsedBirthday ? formatBirthdayForInput(parsedBirthday) : '');
      setSaveMessage('Changes saved to backend.');
    } catch (saveError) {
      console.error('Failed to save personal information:', saveError);
      setErrorMessage('Failed to save personal information.');
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
          <Text style={styles.headerTitle}>Personal Information</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.sectionCard}>
            <ProfileField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              icon={<UserRound color={theme.placeholder} size={18} />}
            />
            <ProfileField
              label="Preferred Name"
              value={preferredName}
              onChangeText={setPreferredName}
              icon={<UserRound color={theme.placeholder} size={18} />}
            />
            <ProfileField
              label="Email"
              value={email}
              editable={false}
              keyboardType="email-address"
              icon={<Mail color={theme.placeholder} size={18} />}
            />
            <ProfileField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              icon={<Phone color={theme.placeholder} size={18} />}
            />
            <ProfileField
              label="Birthday"
              value={birthday}
              onChangeText={setBirthday}
              icon={<CalendarDays color={theme.placeholder} size={18} />}
            />
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Your email is managed by authentication and cannot be changed on this screen.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
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
          <Save color={theme.white} size={18} />
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </ScrollView>
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
  sectionWrap: {
    marginBottom: 16,
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
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: theme.text,
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.mutedBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputShellReadOnly: {
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  inputIconWrap: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 16,
    paddingVertical: 10,
  },
  inputReadOnly: {
    color: theme.text,
  },
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noticeText: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
});
}
