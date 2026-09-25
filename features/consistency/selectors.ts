export const CONSISTENCY_POLICY_VERSION = 'weekly-adherence-v1' as const;

export interface EligibleOccurrence {
  occurrenceId: string;
  localDate: string;
  kind: 'workout' | 'rest';
  state: 'planned' | 'skipped' | 'pending' | 'finalized';
  completionClass?: 'complete' | 'reduced' | 'partial' | 'abandoned' | 'legacy_unknown';
  acceptedReductionId?: string | null;
}

export interface ConsistencyWindow {
  weekStart: string;
  weekEndExclusive: string;
  timezone: string;
  scheduleRevision: number;
  sourceWatermark: string;
  correctionWatermark: string;
  paused: boolean;
  sourceCoverage: 'complete' | 'partial' | 'unavailable';
}

export interface WeeklyAdherence {
  policyVersion: typeof CONSISTENCY_POLICY_VERSION;
  scheduleRevision: number;
  sourceWatermark: string;
  correctionWatermark: string;
  timezone: string;
  weekStart: string;
  eligibleWorkouts: number;
  fulfilledWorkouts: number;
  complete: number;
  acceptedReduced: number;
  partial: number;
  pending: number;
  unresolved: number;
  restDays: number;
  paused: boolean;
  fraction: number | null;
  sourceCoverage: ConsistencyWindow['sourceCoverage'];
}

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function selectWeeklyAdherence(
  window: ConsistencyWindow,
  occurrences: readonly EligibleOccurrence[],
): WeeklyAdherence {
  if (
    !localDatePattern.test(window.weekStart) ||
    !localDatePattern.test(window.weekEndExclusive) ||
    window.weekStart >= window.weekEndExclusive ||
    !Number.isSafeInteger(window.scheduleRevision) ||
    window.scheduleRevision < 0
  ) {
    throw new Error('Invalid consistency window');
  }

  const result: WeeklyAdherence = {
    policyVersion: CONSISTENCY_POLICY_VERSION,
    scheduleRevision: window.scheduleRevision,
    sourceWatermark: window.sourceWatermark,
    correctionWatermark: window.correctionWatermark,
    timezone: window.timezone,
    weekStart: window.weekStart,
    eligibleWorkouts: 0,
    fulfilledWorkouts: 0,
    complete: 0,
    acceptedReduced: 0,
    partial: 0,
    pending: 0,
    unresolved: 0,
    restDays: 0,
    paused: window.paused,
    fraction: null,
    sourceCoverage: window.sourceCoverage,
  };
  const seen = new Set<string>();
  for (const occurrence of occurrences) {
    if (
      !localDatePattern.test(occurrence.localDate) ||
      occurrence.localDate < window.weekStart ||
      occurrence.localDate >= window.weekEndExclusive
    ) continue;
    if (seen.has(occurrence.occurrenceId)) {
      throw new Error('Duplicate scheduled occurrence');
    }
    seen.add(occurrence.occurrenceId);
    if (occurrence.kind === 'rest') {
      result.restDays++;
      continue;
    }
    if (occurrence.state === 'skipped') continue;
    result.eligibleWorkouts++;
    if (occurrence.state === 'pending') {
      result.pending++;
    } else if (occurrence.state === 'finalized' && occurrence.completionClass === 'complete') {
      result.complete++;
      result.fulfilledWorkouts++;
    } else if (
      occurrence.state === 'finalized' &&
      occurrence.completionClass === 'reduced' &&
      occurrence.acceptedReductionId
    ) {
      result.acceptedReduced++;
      result.fulfilledWorkouts++;
    } else if (occurrence.state === 'finalized') {
      result.partial++;
    } else {
      result.unresolved++;
    }
  }
  if (window.sourceCoverage === 'complete' && !window.paused && result.pending === 0 && result.eligibleWorkouts > 0) {
    result.fraction = result.fulfilledWorkouts / result.eligibleWorkouts;
  }
  return result;
}

export function weeksOnPlan(
  periods: readonly WeeklyAdherence[],
  hidden: boolean,
): number | null {
  if (hidden) return null;
  let count = 0;
  for (const period of periods) {
    if (period.paused) continue;
    if (period.sourceCoverage !== 'complete' || period.fraction === null) break;
    if (period.fraction < 1) break;
    count++;
  }
  return count;
}
