import type { WorkoutDraft } from './contracts';

/** Synchronous authority for event bursts; hydration may only fill an empty target. */
export function createWorkoutEditingState() {
  let target = '';
  let current: WorkoutDraft | null = null;
  return {
    select(key: string) { if (target !== key) { target = key; current = null; } },
    read: () => current,
    replace(value: WorkoutDraft | null) { current = value; return value; },
    hydrate(key: string, value: WorkoutDraft): boolean {
      if (target !== key || current !== null) return false;
      current = value; return true;
    },
  };
}

export function parseEntry(text: string): number | null {
  // Partial text stays in the draft, never NaN (which JSON would turn into null).
  if (!/^\d+(?:\.\d*)?$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
