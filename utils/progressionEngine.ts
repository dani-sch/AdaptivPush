import type { ProgressionContext, ProgressionResult } from '@/types/progression';

export interface ReadinessModifier {
  weightMultiplier: number;
  rpeDelta: number;
  label: string;
  description: string;
  isNeutral: boolean;
}

export function getReadinessModifier(score: number): ReadinessModifier {
  if (score <= 3) {
    return {
      weightMultiplier: 0.90,
      rpeDelta: -1.0,
      label: 'Very Low',
      description: 'Significant fatigue detected. Reducing weights by 10% to protect recovery.',
      isNeutral: false,
    };
  } else if (score <= 5) {
    return {
      weightMultiplier: 0.95,
      rpeDelta: -0.5,
      label: 'Low',
      description: 'Below-average recovery. Reducing weights by 5% to train conservatively.',
      isNeutral: false,
    };
  } else if (score <= 7) {
    return {
      weightMultiplier: 1.0,
      rpeDelta: 0.0,
      label: 'Moderate',
      description: 'Normal recovery. No weight adjustment needed.',
      isNeutral: true,
    };
  } else if (score <= 9) {
    return {
      weightMultiplier: 1.025,
      rpeDelta: 0.5,
      label: 'Good',
      description: 'Well-recovered. Increasing weights by 2.5% — ready to push harder.',
      isNeutral: false,
    };
  } else {
    return {
      weightMultiplier: 1.05,
      rpeDelta: 1.0,
      label: 'Excellent',
      description: 'Peak readiness. Increasing weights by 5% — green light for a PR attempt.',
      isNeutral: false,
    };
  }
}

export function computeProgression(ctx: ProgressionContext): ProgressionResult {
  const { lastSessionSets, experienceLevel, readinessScore,
          currentWeightLb, currentRepMin, currentRepMax, currentTargetRPE } = ctx;

  // Edge case: no data
  if (lastSessionSets.length === 0) {
    return {
      suggestedWeightLb: currentWeightLb,
      repRangeMin: currentRepMin,
      repRangeMax: currentRepMax,
      suggestedRPE: currentTargetRPE,
      action: 'hold',
      reason: 'No logged sets found for this exercise. Holding current weight.',
    };
  }

  // Step 1: Compute averages
  const avgReps = lastSessionSets.reduce((s, x) => s + x.reps, 0) / lastSessionSets.length;
  const rpeValues = lastSessionSets.filter(x => x.rpe !== null).map(x => x.rpe!);
  const avgRPE = rpeValues.length > 0
    ? rpeValues.reduce((s, x) => s + x, 0) / rpeValues.length
    : 7.0;

  // Step 2: Performance signal
  type Signal = 'crush' | 'solid' | 'struggle';
  let signal: Signal;

  if (avgReps >= currentRepMax && avgRPE <= 7.5) {
    signal = 'crush';
  } else if (avgReps < currentRepMin || avgRPE >= 9.0) {
    signal = 'struggle';
  } else {
    signal = 'solid';
  }

  // Step 3: Weight increment by experience
  const incrementLb: Record<typeof experienceLevel, number> = {
    beginner:     5.0,
    intermediate: 2.5,
    advanced:     1.25,
  };
  const increment = incrementLb[experienceLevel];

  // Step 4: New weight by signal
  let newWeight: number;
  let action: ProgressionResult['action'];
  let reason: string;

  switch (signal) {
    case 'crush':
      newWeight = currentWeightLb + increment;
      action = 'increase';
      reason = `Averaged ${avgReps.toFixed(1)} reps @ RPE ${avgRPE.toFixed(1)} — above target range with low effort. Adding ${increment} lb.`;
      break;
    case 'struggle':
      newWeight = currentWeightLb * 0.95;
      action = 'decrease';
      reason = `Averaged ${avgReps.toFixed(1)} reps @ RPE ${avgRPE.toFixed(1)} — below target range or too heavy. Reducing by 5%.`;
      break;
    default:
      newWeight = currentWeightLb;
      action = 'hold';
      reason = `Averaged ${avgReps.toFixed(1)} reps @ RPE ${avgRPE.toFixed(1)} — on target. Holding weight.`;
  }

  // Step 5: Graduated readiness modifier
  // Readiness score (0–10) affects both weight intensity and RPE target.
  // Low scores signal poor recovery (reduce load); high scores signal peak readiness (can push harder).
  let readinessWeightMultiplier = 1.0;
  let readinessRPEDelta = 0.0;
  let readinessReason = '';

  if (readinessScore !== null) {
    if (readinessScore <= 3) {
      // Very low — significant fatigue or poor sleep/stress; reduce intensity to avoid injury
      readinessWeightMultiplier = 0.90;
      readinessRPEDelta = -1.0;
      readinessReason = ` Readiness ${readinessScore}/10 (very low) — reducing weight 10% and easing RPE target by 1.`;
    } else if (readinessScore <= 5) {
      // Low — below-average recovery; train conservatively
      readinessWeightMultiplier = 0.95;
      readinessRPEDelta = -0.5;
      readinessReason = ` Readiness ${readinessScore}/10 (low) — reducing weight 5% and easing RPE target by 0.5.`;
    } else if (readinessScore <= 7) {
      // Moderate — normal recovery; no adjustment
      readinessWeightMultiplier = 1.0;
      readinessRPEDelta = 0.0;
    } else if (readinessScore <= 9) {
      // Good — well-recovered; capacity to push slightly harder
      readinessWeightMultiplier = 1.025;
      readinessRPEDelta = 0.5;
      readinessReason = ` Readiness ${readinessScore}/10 (good) — adding 2.5% to weight and raising RPE target by 0.5.`;
    } else {
      // Excellent (10) — peak readiness; green light to push
      readinessWeightMultiplier = 1.05;
      readinessRPEDelta = 1.0;
      readinessReason = ` Readiness ${readinessScore}/10 (excellent) — adding 5% to weight and raising RPE target by 1.`;
    }
  }

  newWeight *= readinessWeightMultiplier;

  // Compute adjusted RPE (null-safe; clamp to [5, 10])
  const suggestedRPE: number | null = currentTargetRPE !== null
    ? Math.min(10, Math.max(5, currentTargetRPE + readinessRPEDelta))
    : null;

  // Step 6: Round to nearest 2.5 lb, floor at 0
  newWeight = Math.max(0, Math.round(newWeight / 2.5) * 2.5);

  return {
    suggestedWeightLb: newWeight,
    repRangeMin: currentRepMin,
    repRangeMax: currentRepMax,
    suggestedRPE,
    action,
    reason: reason + readinessReason,
  };
}
