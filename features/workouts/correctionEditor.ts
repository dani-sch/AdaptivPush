import type { LoadUnit } from './contracts';
import type { OccurrenceSet } from './effectiveOccurrence';

export type EditableCorrectionSet = OccurrenceSet & { loadText: string; repsText: string; rpeText: string };

export function correctionEntryErrors(exercises: { name: string; sets: EditableCorrectionSet[] }[]): string[] {
  const errors: string[] = [];
  for (const exercise of exercises) for (const set of exercise.sets) {
    if (set.outcome !== 'performed') continue;
    const label = `${exercise.name}, set ${set.order}`;
    if (!/^\d+$/.test(set.repsText.trim()) || Number(set.repsText) < 1) errors.push(`${label}: enter positive whole-number reps.`);
    const mass = set.loadKind === 'external' || set.loadKind === 'assistance';
    if (mass && !/^\d+(?:\.\d*)?$/.test(set.loadText.trim())) errors.push(`${label}: enter a nonnegative load.`);
    if (set.rpeText.trim() && (!/^\d+(?:\.\d*)?$/.test(set.rpeText.trim()) || Number(set.rpeText) > 10)) errors.push(`${label}: RPE must be between 0 and 10, or blank.`);
  }
  return errors;
}

/** Selecting a mass unit preserves assistance; bodyweight clears external load. */
export function correctionLoadSelection(set: EditableCorrectionSet, selection: LoadUnit | 'assistance' | 'external'): Partial<EditableCorrectionSet> {
  if (selection === 'none') return { loadKind: 'bodyweight', loadUnit: 'none', loadText: '', loadValue: null, loadSide: 'unknown' };
  if (selection === 'assistance' || selection === 'external') return {
    loadKind: selection, loadUnit: set.loadUnit === 'none' ? 'lb' : set.loadUnit,
  };
  return { loadUnit: selection, loadKind: set.loadKind === 'assistance' ? 'assistance' : 'external' };
}
