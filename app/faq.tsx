import { router } from 'expo-router';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

/* ─── FAQ Data ─────────────────────────────────────────────────────── */

type FaqCategory = {
  title: string;
  items: { q: string; a: string }[];
};

const FAQ_DATA: FaqCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'How do I create my first program?',
        a: 'Tap "Generate Program" on the home screen. Choose your goal, training days, duration, and session length — the app builds a personalized plan for you.',
      },
      {
        q: 'What does the readiness check-in do?',
        a: 'Before each workout the app asks about sleep, stress, soreness, and motivation. It adjusts your target weights for the day so you train at the right intensity.',
      },
      {
        q: 'Can I skip the readiness check-in?',
        a: 'Yes. If you skip it your programmed weights are used as-is with no adjustment.',
      },
    ],
  },
  {
    title: 'Programs & Workouts',
    items: [
      {
        q: 'How do I reset my workout plan?',
        a: 'Open Program Setup and generate a new plan. Your past workout history stays intact.',
      },
      {
        q: 'What training goals are available?',
        a: 'Strength, Hypertrophy, Endurance, Fat Loss, and General Fitness. Each goal uses different rep ranges, RPE targets, and exercise selection.',
      },
      {
        q: 'How does session length work?',
        a: 'You pick a target duration (30–90+ min) during program generation. The app selects the right number of exercises to fit your time while keeping all compound lifts.',
      },
      {
        q: 'Why does my RPE change week to week?',
        a: 'The app uses linear periodization — RPE starts lower and gradually increases across the program so you peak at the right time. Deload weeks are automatically lighter.',
      },
      {
        q: 'How do I swap an exercise?',
        a: 'In your workout or program overview, tap the swap icon next to any exercise. The app suggests alternatives that target the same muscle group.',
      },
    ],
  },
  {
    title: 'Tracking & Progress',
    items: [
      {
        q: 'How does weight progression work?',
        a: 'The app tracks each set individually. If all sets hit the target reps and RPE, weight increases next week. Sets that miss targets may decrease while successful sets hold steady.',
      },
      {
        q: 'What counts as a Personal Record?',
        a: 'Any time you lift more weight for the same or more reps on an exercise. PRs are detected automatically when you finish a workout.',
      },
      {
        q: 'Where can I see my PR history?',
        a: 'Go to the History tab and tap the "Personal Records" card at the top. It shows your all-time best for every exercise.',
      },
      {
        q: 'Can I export my training history?',
        a: 'Yes. Use Privacy & Data to request an export file from your account settings.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      {
        q: 'How do I change my password?',
        a: 'Go to Profile → Account Settings. Passwords must be at least 8 characters with an uppercase letter, number, and special character.',
      },
      {
        q: 'Why am I not seeing reminders?',
        a: 'Check that push notifications are enabled in both this app and your device settings.',
      },
      {
        q: 'How is my data stored?',
        a: 'Your data is stored securely in the cloud. You can delete your account and all associated data from Profile → Privacy & Data.',
      },
    ],
  },
];

/* ─── Components ───────────────────────────────────────────────────── */

const AccordionItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable onPress={() => setOpen((p) => !p)} style={styles.faqItem}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <Animated.View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown color="#6f758a" size={18} />
        </Animated.View>
      </View>
      {open && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Text style={styles.faqAnswer}>{a}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
};

/* ─── Screen ───────────────────────────────────────────────────────── */

export default function FaqScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ArrowLeft color={theme.textPrimary} size={22} />
          </Pressable>
          <Text style={styles.screenTitle}>FAQs</Text>
        </View>

        {FAQ_DATA.map((cat) => (
          <View key={cat.title} style={styles.categoryWrap}>
            <Text style={styles.categoryTitle}>{cat.title.toUpperCase()}</Text>
            <View style={styles.sectionCard}>
              {cat.items.map((item, i) => (
                <View key={item.q}>
                  {i > 0 && <View style={styles.divider} />}
                  <AccordionItem q={item.q} a={item.a} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────── */

function createStyles(theme: Theme) {
  return StyleSheet.create({
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
      gap: 14,
      marginBottom: 24,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: '#242a3b',
      alignItems: 'center',
      justifyContent: 'center',
    },
    screenTitle: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: '700',
    },
    categoryWrap: {
      marginBottom: 20,
    },
    categoryTitle: {
      color: '#696f82',
      fontSize: 13,
      letterSpacing: 1.2,
      fontWeight: '600',
      marginBottom: 10,
    },
    sectionCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#242a3b',
      backgroundColor: '#121621',
      overflow: 'hidden',
    },
    divider: {
      height: 1,
      backgroundColor: '#242a3b',
      marginHorizontal: 14,
    },
    faqItem: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    faqQuestion: {
      color: '#e7ebf8',
      fontSize: 15,
      fontWeight: '500',
      flex: 1,
    },
    faqAnswer: {
      color: '#8d95ac',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 10,
    },
  });
}
