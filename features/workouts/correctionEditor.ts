import type { LoadUnit } from './contracts';
import type { OccurrenceSet } from './effectiveOccurrence';

export type EditableCorrectionSet = OccurrenceSet & { loadText: string; repsText: string; rpeText: string };

/** Selecting a mass unit preserves assistance; bodyweight clears external load. */
export function correctionLoadSelection(set: EditableCorrectionSet, selection: LoadUnit | 'assistance' | 'external'): Partial<EditableCorrectionSet> {
  if (selection === 'none') return { loadKind: 'bodyweight', loadUnit: 'none', loadText: '', loadValue: null, loadSide: 'unknown' };
  if (selection === 'assistance' || selection === 'external') return {
    loadKind: selection, loadUnit: set.loadUnit === 'none' ? 'lb' : set.loadUnit,
  };
  return { loadUnit: selection, loadKind: set.loadKind === 'assistance' ? 'assistance' : 'external' };
}
