import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bug,
  ChevronRight,
  Clock3,
  Lightbulb,
  LifeBuoy,
  MessageCircle,
} from 'lucide-react-native';
import { type ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mergeUserMetadata } from '@/utils/profilePreferences';
import { supabase } from '@/utils/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

type SupportActionProps = {
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onPress: () => void;
};

const SupportAction = ({
  icon,
  title,
  description,
  disabled = false,
  onPress,
}: SupportActionProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, disabled && styles.actionRowDisabled, pressed && !disabled && styles.pressed]}
    >
      <View style={styles.actionLeft}>
        <View style={styles.iconShell}>{icon}</View>
        <View style={styles.actionTextWrap}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </View>
      <ChevronRight color={theme.placeholder} size={18} />
    </Pressable>
  );
};

type FaqItemProps = {
  question: string;
  answer: string;
};

const FaqItem = ({ question, answer }: FaqItemProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
};

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeRequest, setActiveRequest] = useState<'contact' | 'bug' | 'feature' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSupportAction = async (requestType: 'contact' | 'bug' | 'feature') => {
    try {
      setActiveRequest(requestType);
      setErrorMessage('');
      setSuccessMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage('Unable to submit support request right now.');
        return;
      }

      const baseMetadata = mergeUserMetadata(user.user_metadata, {});
      const existingRequests =
        typeof baseMetadata.support_requests === 'object' &&
        baseMetadata.support_requests !== null &&
        !Array.isArray(baseMetadata.support_requests)
          ? (baseMetadata.support_requests as Record<string, unknown>)
          : {};

      const nextRequests = {
        ...existingRequests,
        [requestType === 'contact'
          ? 'contactRequestedAt'
          : requestType === 'bug'
            ? 'bugReportRequestedAt'
            : 'featureRequestRequestedAt']: new Date().toISOString(),
      };

      const { error: saveError } = await supabase.auth.updateUser({
        data: mergeUserMetadata(user.user_metadata, {
          support_requests: nextRequests,
        }),
      });

      if (saveError) {
        setErrorMessage(saveError.message);
        return;
      }

      setSuccessMessage('Support request submitted to backend.');
    } catch (requestError) {
      console.error('Failed to submit support request:', requestError);
      setErrorMessage('Failed to submit support request.');
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
            <ArrowLeft color={theme.textPrimary} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={[theme.cardBg, theme.backgroundDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <LifeBuoy color={theme.textPrimary} size={23} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>We&apos;ve Got You</Text>
            <Text style={styles.heroSubtitle}>
              Reach support, report issues, or browse common answers in one place.
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Get In Touch</Text>
        <View style={styles.sectionCard}>
          <SupportAction
            disabled={activeRequest !== null}
            icon={<MessageCircle color={theme.placeholder} size={18} />}
            title="Contact Support"
            description="Chat with the team about account or training issues"
            onPress={() => void handleSupportAction('contact')}
          />
          <SupportAction
            disabled={activeRequest !== null}
            icon={<Bug color={theme.placeholder} size={18} />}
            title="Report a Bug"
            description="Share a screenshot and reproduction steps"
            onPress={() => void handleSupportAction('bug')}
          />
          <SupportAction
            disabled={activeRequest !== null}
            icon={<Lightbulb color={theme.placeholder} size={18} />}
            title="Feature Request"
            description="Tell us what would improve your workflow"
            onPress={() => void handleSupportAction('feature')}
          />
        </View>

        {activeRequest ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loadingText}>Submitting to backend...</Text>
          </View>
        ) : null}
        {errorMessage ? <Text style={styles.errorFeedback}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successFeedback}>{successMessage}</Text> : null}

        <Text style={styles.sectionTitle}>Support Hours</Text>
        <View style={styles.hoursCard}>
          <View style={styles.hoursRow}>
            <Clock3 color={theme.primaryLight} size={18} />
            <Text style={styles.hoursText}>Mon to Fri, 9:00 AM to 6:00 PM ET</Text>
          </View>
          <Text style={styles.hoursCaption}>Typical first response: under 24 hours.</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Pressable onPress={() => router.push('/faq')} hitSlop={8}>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>View all →</Text>
          </Pressable>
        </View>
        <View style={styles.sectionCard}>
          <FaqItem
            question="How do I reset my workout plan?"
            answer="Open Program Setup and generate a new plan. Your past workout history stays intact."
          />
          <FaqItem
            question="Can I export my training history?"
            answer="Yes. Use Privacy & Data to request an export file from your account settings."
          />
          <FaqItem
            question="Why am I not seeing reminders?"
            answer="Check that push notifications are enabled in both this app and your device settings."
          />
        </View>
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
    heroCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    heroIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.mutedBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    heroTextWrap: {
      flex: 1,
    },
    heroTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 2,
    },
    heroSubtitle: {
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
    actionRow: {
      minHeight: 74,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    actionRowDisabled: {
      opacity: 0.65,
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
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
    actionTextWrap: {
      flex: 1,
    },
    actionTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    actionDescription: {
      color: theme.text,
      fontSize: 12,
      marginTop: 2,
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
      marginBottom: 8,
      marginLeft: 2,
    },
    successFeedback: {
      color: theme.success,
      fontSize: 13,
      marginBottom: 12,
      marginLeft: 2,
    },
    hoursCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.cardBg,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 16,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    hoursText: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    hoursCaption: {
      color: theme.text,
      fontSize: 12,
    },
    faqItem: {
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    faqQuestion: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '500',
      marginBottom: 4,
    },
    faqAnswer: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 19,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
