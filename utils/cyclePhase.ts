export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface CycleModifier {
  weightMultiplier: number;
  rpeDelta: number;
}

/** Returns a training modifier for reduced-intensity cycle phases, null otherwise. */
export function getCycleModifier(phase: CyclePhase | null | undefined): CycleModifier | null {
  if (phase === 'menstrual' || phase === 'luteal') {
    return { weightMultiplier: 0.95, rpeDelta: -0.5 };
  }
  return null;
}

/**
 * Compute the current menstrual cycle phase from the last period start date.
 * Day 1 = first day of period. Phases approximate the standard 28-day model
 * scaled to the user's actual cycle length.
 */
export function computeCyclePhase(
  lastPeriodStartDate: string | Date,
  avgCycleLengthDays = 28,
): CyclePhase {
  const start = new Date(lastPeriodStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const dayOfCycle = (Math.floor(diffMs / (1000 * 60 * 60 * 24)) % avgCycleLengthDays) + 1;

  if (dayOfCycle <= 5)  return 'menstrual';
  if (dayOfCycle <= 13) return 'follicular';
  if (dayOfCycle <= 16) return 'ovulatory';
  return 'luteal';
}

/**
 * Returns how many days ago the period started, clamped to 0–90.
 * Used to display / initialise the "days since period" input.
 */
export function daysSincePeriod(lastPeriodStartDate: string | Date): number {
  const start = new Date(lastPeriodStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(diff, 90));
}

/**
 * Compute a date string (YYYY-MM-DD) for N days ago — used when saving
 * "days since period" back as an actual date.
 */
export function dateFromDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}
