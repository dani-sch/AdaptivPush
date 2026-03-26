import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Mail,
  Phone,
  Save,
  UserRound,
} from 'lucide-react-native';
import { type ReactNode, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
          placeholderTextColor="#697086"
        />
      </View>
    </View>
  );
};

export default function PersonalInformationScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const avatarLabel = useMemo(() => {
    const clean = preferredName.trim() || fullName.trim() || 'A';
    return clean.slice(0, 1).toUpperCase();
  }, [fullName, preferredName]);

  const handleSave = () => {
    setSaveMessage('Changes saved locally.');
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
          <Text style={styles.headerTitle}>Personal Information</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={['#181c29', '#12141b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarCard}
        >
          <LinearGradient
            colors={['#2c81ff', '#8626ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarLabel}>{avatarLabel}</Text>
          </LinearGradient>

          <View style={styles.avatarMeta}>
            <Text style={styles.avatarTitle}>Profile Photo</Text>
            <Text style={styles.avatarSubtitle}>Square image works best</Text>
          </View>

          <Pressable style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}>
            <Camera color="#d6dbed" size={18} />
            <Text style={styles.photoActionText}>Edit</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.sectionCard}>
            <ProfileField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              icon={<UserRound color="#8f97ad" size={18} />}
            />
            <ProfileField
              label="Preferred Name"
              value={preferredName}
              onChangeText={setPreferredName}
              icon={<UserRound color="#8f97ad" size={18} />}
            />
            <ProfileField
              label="Email"
              value={email}
              editable={false}
              keyboardType="email-address"
              icon={<Mail color="#8f97ad" size={18} />}
            />
            <ProfileField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              icon={<Phone color="#8f97ad" size={18} />}
            />
            <ProfileField
              label="Birthday"
              value={birthday}
              onChangeText={setBirthday}
              icon={<CalendarDays color="#8f97ad" size={18} />}
            />
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Your email is managed by authentication and cannot be changed on this screen.
          </Text>
        </View>

        {saveMessage ? <Text style={styles.saveFeedback}>{saveMessage}</Text> : null}

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Save color="#eef2ff" size={18} />
          <Text style={styles.saveButtonText}>Save Changes</Text>
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
  avatarCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#242a3b',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLabel: {
    color: '#edf2ff',
    fontSize: 24,
    fontWeight: '600',
  },
  avatarMeta: {
    flex: 1,
    paddingRight: 10,
  },
  avatarTitle: {
    color: '#eff3ff',
    fontSize: 17,
    fontWeight: '500',
  },
  avatarSubtitle: {
    color: '#8890a7',
    fontSize: 13,
    marginTop: 2,
  },
  photoAction: {
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#353d52',
    backgroundColor: '#181d2a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoActionText: {
    color: '#d8ddef',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionWrap: {
    marginBottom: 16,
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
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#959cb1',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30384e',
    backgroundColor: '#151b2a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputShellReadOnly: {
    borderColor: '#272f41',
    backgroundColor: '#121722',
  },
  inputIconWrap: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f0f3ff',
    fontSize: 16,
    paddingVertical: 10,
  },
  inputReadOnly: {
    color: '#9ea6bb',
  },
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30384a',
    backgroundColor: '#121723',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noticeText: {
    color: '#98a1b8',
    fontSize: 13,
    lineHeight: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
