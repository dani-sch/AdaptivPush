import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import {
  BACKGROUND_COLOR_DARK,
  BORDER_COLOR,
  BUTTON_DISABLED,
  PLACEHOLDER_TEXT,
  PRIMARY_COLOR,
  TEXT_COLOR,
  WHITE,
} from "../../constants/colors";
import { useCurrentProgram } from "../../hooks/useCurrentProgram";
import { getReadinessModifier } from "../../utils/progressionEngine";
import { supabase } from "../../utils/supabase";

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

const HeaderDateBlock: React.FC = () => {
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
}> = ({ label, value, showUpArrow }) => {
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

const StatsRow: React.FC<{ readiness: string }> = ({ readiness }) => {
  return (
    <View style={styles.statsRow}>
      <StatCard label="Last Workout" value="Jan 21" />
      <StatCard label="Readiness" value={readiness} showUpArrow />
      <StatCard label="Week" value="4/12" />
    </View>
  );
};

// readiness card and modal components

const ReadinessPromptCard: React.FC<{ onPress: () => void }> = ({
  onPress,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.readinessPromptCard,
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.readinessPromptTitle}>
        How are you feeling today?
      </Text>
      <Text style={styles.readinessPromptSubtitle}>
        Quick readiness check-in
      </Text>
    </Pressable>
  );
};

const ModalHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>Readiness Check-in</Text>
      <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
        <Ionicons name="close" size={24} color={TEXT_COLOR} />
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
          maximumTrackTintColor={PLACEHOLDER_TEXT}
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
}> = ({ selectedPhase, onSelectPhase }) => {
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
}> = ({ onContinue, onSkip }) => {
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

const computeReadinessScore = (
  sleepHours: number,
  stressLevel: number,
): number => {
  const sleepScore = computeSleepScore(sleepHours);
  const stressScore = ((10 - stressLevel) / 10) * 5; // inverted: low stress = high score
  return Math.round((sleepScore + stressScore) * 10) / 10;
};

// readiness check-in modal

const ReadinessCheckInModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSaved: (score: number) => void;
}> = ({ visible, onClose, onSaved }) => {
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>("N/A");

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

      await supabase.from("readiness_logs").insert({
        user_id: user.id,
        log_date: new Date().toISOString().split("T")[0],
        sleep_score: computeSleepScore(sleepHours) * 2,
        stress: stressLevel,
        readiness_score: computeReadinessScore(sleepHours, stressLevel),
      });

      onSaved(computeReadinessScore(sleepHours, stressLevel));
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
            <ModalHeader onClose={onClose} />

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
            />

            <CycleSelector
              selectedPhase={cyclePhase}
              onSelectPhase={setCyclePhase}
            />

            <ModalFooterButtons
              onContinue={handleContinue}
              onSkip={handleSkip}
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
}> = ({ visible, score, onApply, onDismiss }) => {
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
            Apply this adjustment to your next workout?
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
            <Text style={styles.adjApplyButtonText}>Apply Adjustment</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.adjKeepButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.adjKeepButtonText}>Keep Weights As-Is</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// main screen

export default function HomeScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [readinessScore, setReadinessScore] = useState<string>("--");
  const [pendingAdjustmentScore, setPendingAdjustmentScore] = useState<
    number | null
  >(null);

  const { program, applyReadinessAdjustmentOnly } = useCurrentProgram();

  // Build the next workout summary from the first workout in the current week
  const nextWorkout = program?.workouts[0];
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

  useEffect(() => {
    const fetchHomeData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("readiness_logs")
        .select("readiness_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].readiness_score != null) {
        setReadinessScore(Number(data[0].readiness_score).toFixed(1));
      }
    };

    fetchHomeData();
  }, []);

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

  const handleReadinessSaved = (score: number) => {
    setReadinessScore(score.toFixed(1));
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
        <HeaderDateBlock />
        <NextWorkoutSection
          workout={nextWorkoutSummary}
          onPressStart={handleStartWorkout}
        />
        <StatsRow readiness={readinessScore} />
        <ReadinessPromptCard onPress={handleOpenReadinessModal} />
      </ScrollView>

      <ReadinessCheckInModal
        visible={isModalVisible}
        onClose={handleCloseReadinessModal}
        onSaved={handleReadinessSaved}
      />

      {pendingAdjustmentScore !== null && (
        <ReadinessAdjustmentModal
          visible
          score={pendingAdjustmentScore}
          onApply={handleApplyAdjustment}
          onDismiss={handleDismissAdjustment}
        />
      )}
    </SafeAreaView>
  );
}

// stylesheet

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR_DARK,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  headerDateBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  dayOfWeek: {
    color: WHITE,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 2,
  },
  date: {
    color: TEXT_COLOR,
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
    backgroundColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 16,
    paddingVertical: 18,
  },
  statLabel: {
    color: TEXT_COLOR,
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
    color: WHITE,
    fontSize: 20,
    fontWeight: "700",
  },
  upArrow: {
    color: "#16a34a",
    fontSize: 16,
    fontWeight: "700",
  },

  readinessPromptCard: {
    backgroundColor: BORDER_COLOR,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 8,
  },
  readinessPromptTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  readinessPromptSubtitle: {
    color: TEXT_COLOR,
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
    backgroundColor: BACKGROUND_COLOR_DARK,
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
    color: WHITE,
    fontSize: 22,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BUTTON_DISABLED,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDivider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
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
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  sliderRowValue: {
    color: WHITE,
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
    color: TEXT_COLOR,
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
    color: WHITE,
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
    backgroundColor: BUTTON_DISABLED,
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
    color: TEXT_COLOR,
    fontSize: 14,
    fontWeight: "600",
  },
  cyclePhaseButtonTextSelected: {
    color: WHITE,
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
    color: WHITE,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  modalFooter: {
    marginTop: 8,
    gap: 16,
  },
  continueButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: WHITE,
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
    color: TEXT_COLOR,
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
    backgroundColor: BACKGROUND_COLOR_DARK,
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
    color: WHITE,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  adjDescription: {
    color: TEXT_COLOR,
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
    color: PLACEHOLDER_TEXT,
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
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
  adjKeepButton: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
  },
  adjKeepButtonText: {
    color: TEXT_COLOR,
    fontSize: 15,
    fontWeight: "600",
  },
});
