import type { LoadKind, LoadUnit } from './contracts';

/** Defaults are input metadata only: never infer a measured amount or log a set. */
export function entryLoadDefaults(kind?: LoadKind, unit?: LoadUnit, preferredUnit: 'lb' | 'kg' = 'lb'): { loadKind: LoadKind; loadUnit: LoadUnit } {
  if (kind === 'bodyweight') return { loadKind: 'bodyweight', loadUnit: 'none' };
  return { loadKind: kind === 'assistance' ? 'assistance' : 'external', loadUnit: unit === 'kg' || unit === 'lb' ? unit : preferredUnit };
}

/** A historical unknown measurement stays unknown, even in a pound-based workout. */
export function loadUnitLabel(set: { loadKind?: string; loadUnit?: string; weight: string; logged: boolean }, preferredUnit: 'lb' | 'kg' = 'lb'): string {
  if (set.loadKind === 'bodyweight') return 'BW';
  const unit = set.loadUnit === 'kg' || set.loadUnit === 'lb' ? set.loadUnit
    : !set.logged && !set.weight.trim() ? preferredUnit : null;
  return unit ? `${set.loadKind === 'assistance' ? '−' : ''}${unit.toUpperCase()}` : 'UNIT?';
}
export function exerciseLoadLabel(sets: Parameters<typeof loadUnitLabel>[0][]): string {
  const labels = [...new Set(sets.map(set => loadUnitLabel(set)))];
  return labels.length === 1 ? `LOAD (${labels[0]})` : 'LOAD';
}
