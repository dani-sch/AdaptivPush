import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NextWorkoutCard, {
  WorkoutSummary,
} from "../../components/NextWorkoutCard";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/constants/themes";
import { useCurrentProgram } from "../../hooks/useCurrentProgram";
import { getReadinessModifier } from "../../utils/progressionEngine";
import { supabase } from "../../utils/supabase";
import { computeCyclePhase } from "../../utils/cyclePhase";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const PINK_ACCENT = "#ec4899";

type CyclePhase =
  | "Follicular"
  | "Ovulation"
  | "Luteal"
  | "Menstruation"
  | "N/A";

// mock data removed — card now uses real program data from useCurrentProgram

// header component

const HeaderDateBlock: React.FC<{ styles: ReturnType<typeof createStyles> }> = ({ styles }) => {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.headerDateBlock}>
      <Text style={styles.dayOfWeek}>{dayOfWeek}</Text>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
};

// next workout card section

const NextWorkoutSection: React.FC<{
  workout?: WorkoutSummary;
  onPressStart?: () => void;
}> = ({ workout, onPressStart }) => {
  return (
    <NextWorkoutCard
      workout={workout}
      onPressStart={onPressStart}
      onPressCalendar={() => console.log("Calendar pressed")}
    />
  );
};

// stats row section

const StatCard: React.FC<{
  label: string;
  value: string;
  showUpArrow?: boolean;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, showUpArrow, styles }) => {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        {showUpArrow && <Text style={styles.upArrow}>↗</Text>}
      </View>
    </View>
  );
};

const StatsRow: React.FC<{
  readiness: string;
  lastWorkout: string | null;
  week: string | null;
  styles: ReturnType<typeof createStyles>;
}> = ({ readiness, lastWorkout, week, styles }) => {
  return (
    <View style={styles.statsRow}>
      <StatCard label="Last Workout" value={lastWorkout ?? '—'} styles={styles} />
      <StatCard label="Readiness" value={readiness} showUpArrow styles={styles} />
      <StatCard label="Week" value={week ?? '—'} styles={styles} />
    </View>
  );
};

// readiness card and modal components

const ReadinessPromptCard: React.FC<{
  todayScore: string | null;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}> = ({
  todayScore,
  onPress,
  styles,
}) => {
  const hasScore = todayScore !== null;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.readinessPromptCard,
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.readinessPromptTitle}>
        {hasScore ? `Today's Readiness: ${todayScore}` : "How are you feeling today?"}
      </Text>
      <Text style={styles.readinessPromptSubtitle}>
        {hasScore ? "Tap to update your check-in" : "Quick readiness check-in"}
      </Text>
    </Pressable>
  );
};

const ModalHeader: React.FC<{
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}> = ({ onClose, styles, theme }) => {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>Readiness Check-in</Text>
      <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
        <Ionicons name="close" size={24} color={theme.text} />
      </Pressable>
    </View>
  );
};

const SliderRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  minLabel: string;
  maxLabel: string;
  sliderValue: number;
  sliderMin: number;
  sliderMax: number;
  onSliderChange: (value: number) => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}> = ({
  icon,
  label,
  value,
  minLabel,
  maxLabel,
  sliderValue,
  sliderMin,
  sliderMax,
  onSliderChange,
  styles,
  theme,
}) => {
  return (
    <View style={styles.sliderRowContainer}>
      <View style={styles.sliderRowHeader}>
        <View style={styles.sliderRowLeft}>
          {icon}
          <Text style={styles.sliderRowLabel}>{label}</Text>
        </View>
        <Text style={styles.sliderRowValue}>{value}</Text>
      </View>
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          value={sliderValue}
          minimumValue={sliderMin}
          maximumValue={sliderMax}
          step={1}
          onValueChange={onSliderChange}
          minimumTrackTintColor={PINK_ACCENT}
          maximumTrackTintColor={theme.placeholder}
          thumbTintColor={PINK_ACCENT}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>{minLabel}</Text>
          <Text style={styles.sliderLabelText}>{maxLabel}</Text>
        </View>
      </View>
    </View>
  );
};

const CycleSelector: React.FC<{
  selectedPhase: CyclePhase;
  onSelectPhase: (phase: CyclePhase) => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ selectedPhase, onSelectPhase, styles }) => {
  const phases: Exclude<CyclePhase, "N/A">[] = [
    "Follicular",
    "Ovulation",
    "Luteal",
    "Menstruation",
  ];

  return (
    <View style={styles.cycleSelectorContainer}>
      <View style={styles.cycleSelectorHeader}>
        <Ionicons name="pulse" size={20} color={PINK_ACCENT} />
        <Text style={styles.cycleSelectorLabel}>Menstrual Cycle</Text>
      </View>
      <View style={styles.cycleButtonsGrid}>
        {phases.map((phase) => (
          <Pressable
            key={phase}
            style={({ pressed }) => [
              styles.cyclePhaseButton,
              selectedPhase === phase && styles.cyclePhaseButtonSelected,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onSelectPhase(phase)}
          >
            <Text
              style={[
                styles.cyclePhaseButtonText,
                selectedPhase === phase && styles.cyclePhaseButtonTextSelected,
              ]}
            >
              {phase}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.naButton,
          selectedPhase === "N/A" && styles.naButtonSelected,
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => onSelectPhase("N/A")}
      >
        <Text style={styles.naButtonText}>N/A</Text>
      </Pressable>
    </View>
  );
};

const ModalFooterButtons: React.FC<{
  onContinue: () => void;
  onSkip: () => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ onContinue, onSkip, styles }) => {
  return (
    <View style={styles.modalFooter}>
      <Pressable
        style={({ pressed }) => [
          styles.continueButton,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onContinue}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.skipButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={onSkip}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </Pressable>
    </View>
  );
};

// readiness scoring

const computeSleepScore = (hours: number): number => {
  if (hours >= 8 && hours <= 9) return 5; // optimal range
  if (hours === 10) return 4;
  if (hours === 11) return 3;
  if (hours >= 12) return 2;
  return Math.max(0, hours - 3); // under 8h scales down from 3h baseline
};

/**
 * 4-factor readiness score (0–10):
 *   Sleep     35% — hours converted to 0-5 score
 *   Stress    25% — inverted (low stress = high score)
 *   Soreness  25% — inverted (low soreness = high score)
 *   Motivation 15% — direct (high motivation = high score)
 */
const computeReadinessScore = (
  sleepHours: number,
  stressLevel: number,
  soreness: number,
  motivation: number,
): number => {
  const sleepNorm = (computeSleepScore(sleepHours) / 5) * 10;
  const stressNorm = 10 - stressLevel;
  const sorenessNorm = 10 - soreness;
  const motivationNorm = motivation;
  const score = sleepNorm * 0.35 + stressNorm * 0.25 + sorenessNorm * 0.25 + motivationNorm * 0.15;
  return Math.round(score * 10) / 10;
};

// readiness check-in modal

const ReadinessCheckInModal: React.FC<{
  visible: boolean;
  initialSleepHours?: number;
  initialStressLevel?: number;
  initialSoreness?: number;
  initialMotivation?: number;
  initialCyclePhase?: CyclePhase;
  onClose: () => void;
  onSaved: (score: number, cyclePhase: CyclePhase) => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}> = ({ visible, initialSleepHours = 7, initialStressLevel = 5, initialSoreness = 3, initialMotivation = 7, initialCyclePhase = "N/A", onClose, onSaved, styles, theme }) => {
  const [sleepHours, setSleepHours] = useState<number>(initialSleepHours);
  const [stressLevel, setStressLevel] = useState<number>(initialStressLevel);
  const [soreness, setSoreness] = useState<number>(initialSoreness);
  const [motivation, setMotivation] = useState<number>(initialMotivation);
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>(initialCyclePhase);

  // Sync initial values when modal opens with pre-filled data
  useEffect(() => {
    if (visible) {
      setSleepHours(initialSleepHours);
      setStressLevel(initialStressLevel);
      setSoreness(initialSoreness);
      setMotivation(initialMotivation);
      setCyclePhase(initialCyclePhase);
    }
  }, [visible, initialSleepHours, initialStressLevel, initialSoreness, initialMotivation, initialCyclePhase]);

  const handleContinue = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("[Readiness] No authenticated user");
        onClose();
        return;
      }

      const score = computeReadinessScore(sleepHours, stressLevel, soreness, motivation);

      await supabase.from("readiness_logs").upsert(
        {
          user_id: user.id,
          log_date: new Date().toISOString().split("T")[0],
          sleep_hours: sleepHours,
          sleep_score: computeSleepScore(sleepHours) * 2,
          stress: stressLevel,
          soreness,
          motivation,
          readiness_score: score,
          cycle_phase: cyclePhase !== "N/A" ? cyclePhase : null,
        },
        { onConflict: "user_id,log_date" }
      );

      onSaved(score, cyclePhase);
    } catch (e) {
      console.log("[Readiness] Error saving check-in:", e);
    }

    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <ModalHeader onClose={onClose} styles={styles} theme={theme} />

            <View style={styles.modalDivider} />

            <SliderRow
              icon={<Ionicons name="moon" size={20} color="#60a5fa" />}
              label="Sleep Quality"
              value={`${sleepHours}h`}
              minLabel="3h"
              maxLabel="12h"
              sliderValue={sleepHours}
              sliderMin={3}
              sliderMax={12}
              onSliderChange={setSleepHours}
              styles={styles}
              theme={theme}
            />

            <SliderRow
              icon={<Ionicons name="analytics" size={20} color="#a855f7" />}
              label="Stress Level"
              value={`${stressLevel}/10`}
              minLabel="Low"
              maxLabel="High"
              sliderValue={stressLevel}
              sliderMin={0}
              sliderMax={10}
              onSliderChange={setStressLevel}
              styles={styles}
              theme={theme}
            />

            <SliderRow
              icon={<Ionicons name="body" size={20} color="#f97316" />}
              label="Muscle Soreness"
              value={`${soreness}/10`}
              minLabel="None"
              maxLabel="Very Sore"
              sliderValue={soreness}
              sliderMin={0}
              sliderMax={10}
              onSliderChange={setSoreness}
              styles={styles}
              theme={theme}
            />

            <SliderRow
              icon={<Ionicons name="flash" size={20} color="#eab308" />}
              label="Motivation"
              value={`${motivation}/10`}
              minLabel="Low"
              maxLabel="High"
              sliderValue={motivation}
              sliderMin={0}
              sliderMax={10}
              onSliderChange={setMotivation}
              styles={styles}
              theme={theme}
            />

            <CycleSelector
              selectedPhase={cyclePhase}
              onSelectPhase={setCyclePhase}
              styles={styles}
            />

            <ModalFooterButtons
              onContinue={handleContinue}
              onSkip={handleSkip}
              styles={styles}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// readiness adjustment confirmation popup

const ReadinessAdjustmentModal: React.FC<{
  visible: boolean;
  score: number;
  onApply: () => void;
  onDismiss: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}> = ({ visible, score, onApply, onDismiss, styles, theme }) => {
  const modifier = getReadinessModifier(score);
  const isIncrease = modifier.weightMultiplier > 1.0;
  const isDecrease = modifier.weightMultiplier < 1.0;
  const accentColor = isIncrease ? "#16a34a" : "#f59e0b";
  const iconName = isIncrease ? "trending-up" : "trending-down";
  const pctLabel = isIncrease
    ? `+${Math.round((modifier.weightMultiplier - 1) * 100)}%`
    : `${Math.round((modifier.weightMultiplier - 1) * 100)}%`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.adjOverlay}>
        <View style={styles.adjContainer}>
          {/* Score badge */}
          <View
            style={[
              styles.adjScoreBadge,
              { backgroundColor: accentColor + "22", borderColor: accentColor },
            ]}
          >
            <Ionicons name={iconName as any} size={22} color={accentColor} />
            <Text style={[styles.adjScoreText, { color: accentColor }]}>
              {score.toFixed(1)}/10 — {modifier.label}
            </Text>
          </View>

          <Text style={styles.adjTitle}>Readiness Adjustment</Text>

          <Text style={styles.adjDescription}>{modifier.description}</Text>

          {/* Adjustment pill */}
          <View style={[styles.adjPill, { borderColor: accentColor }]}>
            <Text style={[styles.adjPillLabel, { color: accentColor }]}>
              Weight {pctLabel}
            </Text>
          </View>

          <Text style={styles.adjSubtext}>
            This adjustment will be applied when you start your next workout.
          </Text>

          {/* Buttons */}
          <Pressable
            style={({ pressed }) => [
              styles.adjApplyButton,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.85 },
            ]}
            onPress={onApply}
          >
            <Text style={styles.adjApplyButtonText}>Got It</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.adjKeepButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.adjKeepButtonText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// main screen

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [readinessScore, setReadinessScore] = useState<string | null>(null);
  const [todaySleepHours, setTodaySleepHours] = useState<number>(7);
  const [todayStressLevel, setTodayStressLevel] = useState<number>(5);
  const [todaySoreness, setTodaySoreness] = useState<number>(3);
  const [todayMotivation, setTodayMotivation] = useState<number>(7);
  const [todayCyclePhase, setTodayCyclePhase] = useState<CyclePhase>("N/A");
  const [pendingAdjustmentScore, setPendingAdjustmentScore] = useState<
    number | null
  >(null);
  const [swapNudgeDismissed, setSwapNudgeDismissed] = useState(false);

  const [lastWorkoutDate, setLastWorkoutDate] = useState<string | null>(null);

  const { program, refresh, applyReadinessAdjustmentOnly, advanceToNextWeek } = useCurrentProgram();

  const fetchLastWorkout = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('workout_sessions')
      .select('ended_at')
      .eq('user_id', user.id)
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.ended_at) {
      const formatted = new Date(data.ended_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
      });
      setLastWorkoutDate(formatted);
    } else {
      setLastWorkoutDate(null);
    }
  }, []);

  const fetchHomeData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("readiness_logs")
      .select("readiness_score, sleep_hours, stress, soreness, motivation, cycle_phase")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .maybeSingle();

    if (data?.readiness_score != null) {
      setReadinessScore(Number(data.readiness_score).toFixed(1));
      if (data.sleep_hours != null) setTodaySleepHours(Number(data.sleep_hours));
      if (data.stress != null) setTodayStressLevel(Number(data.stress));
      if (data.soreness != null) setTodaySoreness(Number(data.soreness));
      if (data.motivation != null) setTodayMotivation(Number(data.motivation));
      if (data.cycle_phase) setTodayCyclePhase(data.cycle_phase as CyclePhase);
    }

    // Auto-compute cycle phase from stored profile data if no manual selection today
    if (!data?.cycle_phase) {
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('cycle_enabled, last_period_start_date, avg_cycle_length_days')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData?.cycle_enabled && profileData?.last_period_start_date) {
        const phase = computeCyclePhase(
          profileData.last_period_start_date,
          profileData.avg_cycle_length_days ?? 28,
        );
        const phaseMap: Record<string, CyclePhase> = {
          menstrual:  'Menstruation',
          follicular: 'Follicular',
          ovulatory:  'Ovulation',
          luteal:     'Luteal',
        };
        setTodayCyclePhase(phaseMap[phase] ?? 'N/A');
      }
    }
  }, []);

  // Refresh all home data every time the tab comes into focus
  useFocusEffect(useCallback(() => {
    refresh();
    fetchLastWorkout();
    fetchHomeData();
  }, [refresh, fetchLastWorkout, fetchHomeData]));

  // workouts[0] is always the next uncompleted workout (hook sorts completed last)
  const nextWorkout = program?.workouts.find((w) => !w.isCompleted);
  const nextWorkoutSummary: WorkoutSummary | undefined = nextWorkout
    ? {
        name: nextWorkout.name,
        durationMinutes: nextWorkout.estimatedTime || 60,
        exercises: nextWorkout.exercises.map((ex) => ({
          name: ex.name,
          prescription: `${ex.sets ?? 3}×${(ex.reps ?? "8-12").replace("-", "–")}`,
        })),
      }
    : undefined;

  const handleStartWorkout = () => {
    const workoutId = nextWorkout?.id;
    if (workoutId) {
      router.push({ pathname: "/next-workout", params: { workoutId } });
    } else {
      router.push("/next-workout");
    }
  };

  const handleOpenReadinessModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseReadinessModal = () => {
    setIsModalVisible(false);
  };

  const handleReadinessSaved = (score: number, cyclePhase: CyclePhase) => {
    setReadinessScore(score.toFixed(1));
    setTodayCyclePhase(cyclePhase);
    const modifier = getReadinessModifier(score);
    if (!modifier.isNeutral) {
      setPendingAdjustmentScore(score);
    }
  };

  const handleApplyAdjustment = async () => {
    if (pendingAdjustmentScore !== null) {
      await applyReadinessAdjustmentOnly(pendingAdjustmentScore);
    }
    setPendingAdjustmentScore(null);
  };

  const handleDismissAdjustment = () => {
    setPendingAdjustmentScore(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderDateBlock styles={styles} />
        {program && program.workouts.every((w) => w.isCompleted) && program.workouts.length > 0 ? (
          <>
            <View style={styles.weekCompleteCard}>
              <Ionicons name="checkmark-circle" size={32} color={theme.primary} />
              <Text style={styles.weekCompleteTitle}>Week Complete!</Text>
              <Text style={styles.weekCompleteSubtitle}>
                All workouts this week are done. Rest up — next week&apos;s plan is ready.
              </Text>
            </View>
            {program.currentWeek < program.totalWeeks && (
              <Pressable
                style={({ pressed }) => [
                  styles.startNextWeekBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={advanceToNextWeek}
                accessibilityRole="button"
              >
                <Text style={styles.startNextWeekBtnText}>
                  Start Week {program.currentWeek + 1}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <NextWorkoutSection
            workout={nextWorkoutSummary}
            onPressStart={handleStartWorkout}
          />
        )}
        <StatsRow
          readiness={readinessScore ?? '--'}
          lastWorkout={lastWorkoutDate}
          week={program ? `${program.currentWeek}/${program.totalWeeks}` : null}
          styles={styles}
        />
        <ReadinessPromptCard todayScore={readinessScore} onPress={handleOpenReadinessModal} styles={styles} />

        {/* Accessory Swap Nudge — hidden on deload weeks (every 4th) */}
        {program && !swapNudgeDismissed && program.swapIntervalWeeks &&
          program.currentWeek > 0 &&
          program.currentWeek % 4 !== 0 &&
          program.currentWeek % (program.swapIntervalWeeks ?? 4) === 0 && (
          <View style={{
            borderRadius: 20, backgroundColor: theme.border,
            padding: 20, marginTop: 14, marginHorizontal: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>🔄</Text>
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 }}>
                Time to swap accessories
              </Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
              You&apos;ve been on the same accessory exercises for {program.swapIntervalWeeks} weeks. Swapping helps avoid plateaus and keeps training fresh.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => { setSwapNudgeDismissed(true); router.push('/(tabs)/plan'); }}
                style={{ flex: 1, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: theme.white, fontSize: 14, fontWeight: '600' }}>Go to Plan</Text>
              </Pressable>
              <Pressable
                onPress={() => setSwapNudgeDismissed(true)}
                style={{ flex: 1, borderRadius: 12, backgroundColor: theme.mutedBg, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Menstrual Cycle Phase Recommendation */}
        {todayCyclePhase && todayCyclePhase !== "N/A" &&
          (todayCyclePhase === "Menstruation" || todayCyclePhase === "Luteal") && (
          <View style={{
            borderRadius: 20,
            borderColor: todayCyclePhase === "Menstruation" ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)',
            borderWidth: 1,
            backgroundColor: todayCyclePhase === "Menstruation" ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
            padding: 20, marginTop: 14, marginHorizontal: 16,
          }}>
            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
              {todayCyclePhase === "Menstruation" ? "🩸 Menstruation Phase" : "🌙 Luteal Phase"}
            </Text>
            <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
              {todayCyclePhase === "Menstruation"
                ? "Energy may be lower. Consider reducing intensity, prioritising mobility work, and listening to your body. It's okay to take it easy."
                : "You may feel more fatigued than usual. Focus on maintaining form over pushing intensity. Prioritise sleep and recovery."}
            </Text>
          </View>
        )}

        {/* Recovery & Mobility shortcut */}
        <Pressable
          onPress={() => router.push('/recovery-library')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.border,
            borderRadius: 20,
            padding: 20,
            marginTop: 14,
            marginHorizontal: 16,
            gap: 14,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 24 }}>🧘</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>Recovery & Mobility</Text>
            <Text style={{ color: theme.text, fontSize: 13, marginTop: 3 }}>Stretches, foam rolling & active recovery</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </Pressable>
      </ScrollView>

      <ReadinessCheckInModal
        visible={isModalVisible}
        initialSleepHours={todaySleepHours}
        initialStressLevel={todayStressLevel}
        initialSoreness={todaySoreness}
        initialMotivation={todayMotivation}
        initialCyclePhase={todayCyclePhase}
        onClose={handleCloseReadinessModal}
        onSaved={handleReadinessSaved}
        styles={styles}
        theme={theme}
      />

      {pendingAdjustmentScore !== null && (
        <ReadinessAdjustmentModal
          visible
          score={pendingAdjustmentScore}
          onApply={handleApplyAdjustment}
          onDismiss={handleDismissAdjustment}
          styles={styles}
          theme={theme}
        />
      )}
    </SafeAreaView>
  );
}

// stylesheet

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundDark,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    weekCompleteCard: {
      margin: 16,
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.backgroundDark,
      borderWidth: 1,
      borderColor: theme.primary + "44",
      alignItems: "center",
      gap: 8,
    },
    weekCompleteTitle: {
      color: theme.primary,
      fontSize: 20,
      fontWeight: "700",
    },
    weekCompleteSubtitle: {
      color: theme.placeholder,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    startNextWeekBtn: {
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 4,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    startNextWeekBtnText: {
      color: theme.white,
      fontSize: 16,
      fontWeight: "700",
    },

    headerDateBlock: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
    },
    dayOfWeek: {
      color: theme.textPrimary,
      fontSize: 32,
      fontWeight: "700",
      marginBottom: 2,
    },
    date: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "500",
    },

    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 12,
      marginTop: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.border,
      borderRadius: 16,
      padding: 16,
      paddingVertical: 18,
    },
    statLabel: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "500",
      marginBottom: 8,
    },
    statValueContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    upArrow: {
      color: "#16a34a",
      fontSize: 16,
      fontWeight: "700",
    },

    readinessPromptCard: {
      backgroundColor: theme.border,
      borderRadius: 20,
      padding: 24,
      marginHorizontal: 16,
      marginTop: 8,
    },
    readinessPromptTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 6,
    },
    readinessPromptSubtitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "500",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalContainer: {
      backgroundColor: theme.backgroundDark,
      borderRadius: 24,
      width: "100%",
      maxWidth: 500,
      maxHeight: SCREEN_HEIGHT * 0.75,
    },
    modalContent: {
      padding: 24,
      paddingBottom: 32,
    },

    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: "700",
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.buttonDisabled,
      alignItems: "center",
      justifyContent: "center",
    },
    modalDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginBottom: 24,
    },

    sliderRowContainer: {
      marginBottom: 28,
    },
    sliderRowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    sliderRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sliderRowLabel: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    sliderRowValue: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    sliderWrapper: {
      marginTop: 4,
    },
    slider: {
      width: "100%",
      height: 40,
    },
    sliderLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
    },
    sliderLabelText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "500",
    },

    cycleSelectorContainer: {
      marginBottom: 24,
    },
    cycleSelectorHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cycleSelectorLabel: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    cycleButtonsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 12,
      gap: 12,
    },
    cyclePhaseButton: {
      width: "48%",
      backgroundColor: theme.buttonDisabled,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "transparent",
    },
    cyclePhaseButtonSelected: {
      backgroundColor: "rgba(236, 72, 153, 0.2)",
      borderColor: PINK_ACCENT,
    },
    cyclePhaseButtonText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    cyclePhaseButtonTextSelected: {
      color: theme.textPrimary,
    },
    naButton: {
      width: "100%",
      backgroundColor: PINK_ACCENT,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    naButtonSelected: {
      borderColor: "#f9a8d4",
      shadowColor: PINK_ACCENT,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    naButtonText: {
      color: theme.white,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.5,
    },

    modalFooter: {
      marginTop: 8,
      gap: 16,
    },
    continueButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    continueButtonText: {
      color: theme.white,
      fontSize: 17,
      fontWeight: "700",
    },
    skipButton: {
      backgroundColor: "transparent",
      paddingVertical: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    skipButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },

    // readiness adjustment popup
    adjOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.88)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    adjContainer: {
      backgroundColor: theme.backgroundDark,
      borderRadius: 24,
      width: "100%",
      maxWidth: 380,
      padding: 28,
      alignItems: "center",
    },
    adjScoreBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1.5,
      borderRadius: 100,
      paddingHorizontal: 14,
      paddingVertical: 7,
      marginBottom: 20,
    },
    adjScoreText: {
      fontSize: 14,
      fontWeight: "700",
    },
    adjTitle: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 12,
      textAlign: "center",
    },
    adjDescription: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 20,
    },
    adjPill: {
      borderWidth: 1.5,
      borderRadius: 100,
      paddingHorizontal: 18,
      paddingVertical: 8,
      marginBottom: 20,
    },
    adjPillLabel: {
      fontSize: 15,
      fontWeight: "700",
    },
    adjSubtext: {
      color: theme.placeholder,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: 24,
    },
    adjApplyButton: {
      width: "100%",
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginBottom: 12,
    },
    adjApplyButtonText: {
      color: theme.white,
      fontSize: 16,
      fontWeight: "700",
    },
    adjKeepButton: {
      width: "100%",
      paddingVertical: 10,
      alignItems: "center",
    },
    adjKeepButtonText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
