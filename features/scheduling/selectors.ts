/* Pure selectors for scheduling placements and occurrences. */

import { Placement, isAvailable, LocalDate } from './contracts';

export function isPlacementAvailable(p: Placement): boolean {
  return isAvailable(p) && !p.preview;
}

export function placementSummary(p: Placement): string {
  return `${p.identity.occurrenceId}:${p.currentDate}(${p.kind})${p.fixed ? ':fixed' : ''}${p.preview ? ':preview' : ''}`;
}

export function cloneWithNewDate(p: Placement, date: LocalDate): Placement {
  return { ...p, currentDate: date };
}

export function isToday(p: Placement, today: LocalDate): boolean {
  if (p.unplaced) return false;
  return p.currentDate === today;
}

export function selectPreviews(all: readonly Placement[]): Placement[] {
  return all.filter((p) => !!p.preview);
}

export function selectToday(all: readonly Placement[], today: LocalDate): Placement[] {
  return all.filter((p) => !p.preview && !p.unplaced && p.currentDate === today);
}
