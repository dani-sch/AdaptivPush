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
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SupportActionProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

const SupportAction = ({ icon, title, description }: SupportActionProps) => {
  return (
    <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
      <View style={styles.actionLeft}>
        <View style={styles.iconShell}>{icon}</View>
        <View style={styles.actionTextWrap}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </View>
      <ChevronRight color="#6f758a" size={18} />
    </Pressable>
  );
};

type FaqItemProps = {
  question: string;
  answer: string;
};

const FaqItem = ({ question, answer }: FaqItemProps) => {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
};

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={['#181c29', '#12141b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <LifeBuoy color="#dce4ff" size={23} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>We’ve Got You</Text>
            <Text style={styles.heroSubtitle}>
              Reach support, report issues, or browse common answers in one place.
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Get In Touch</Text>
        <View style={styles.sectionCard}>
          <SupportAction
            icon={<MessageCircle color="#9ba3b9" size={18} />}
            title="Contact Support"
            description="Chat with the team about account or training issues"
          />
          <SupportAction
            icon={<Bug color="#9ba3b9" size={18} />}
            title="Report a Bug"
            description="Share a screenshot and reproduction steps"
          />
          <SupportAction
            icon={<Lightbulb color="#9ba3b9" size={18} />}
            title="Feature Request"
            description="Tell us what would improve your workflow"
          />
        </View>

        <Text style={styles.sectionTitle}>Support Hours</Text>
        <View style={styles.hoursCard}>
          <View style={styles.hoursRow}>
            <Clock3 color="#96c0ff" size={18} />
            <Text style={styles.hoursText}>Mon to Fri, 9:00 AM to 6:00 PM ET</Text>
          </View>
          <Text style={styles.hoursCaption}>Typical first response: under 24 hours.</Text>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
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
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#242a3b',
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
    backgroundColor: '#25304a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: '#eff3ff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  heroSubtitle: {
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
  actionRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95, 103, 124, 0.24)',
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
    backgroundColor: '#1a2133',
    marginRight: 10,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    color: '#e7ebf8',
    fontSize: 15,
    fontWeight: '500',
  },
  actionDescription: {
    color: '#8d95ac',
    fontSize: 12,
    marginTop: 2,
  },
  hoursCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#264e88',
    backgroundColor: '#11213f',
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
    color: '#d7e6ff',
    fontSize: 14,
    fontWeight: '500',
  },
  hoursCaption: {
    color: '#9cb8e4',
    fontSize: 12,
  },
  faqItem: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95, 103, 124, 0.24)',
  },
  faqQuestion: {
    color: '#e7ebf8',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  faqAnswer: {
    color: '#8d95ac',
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.85,
  },
});
