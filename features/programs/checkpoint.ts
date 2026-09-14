// Resume placement without rewriting the original program start date.
export function checkpointWeek(
  startDate: string | null,
  totalWeeks: number,
  checkpoint: Record<string, unknown> | null | undefined,
  today: string,
): number {
  const resumedOn = typeof checkpoint?.resumedOn === 'string' ? checkpoint.resumedOn : null;
  const frozenDays = typeof checkpoint?.elapsedDays === 'number' && Number.isInteger(checkpoint.elapsedDays)
    && checkpoint.elapsedDays >= 0 ? checkpoint.elapsedDays : null;
  const anchor = resumedOn && frozenDays !== null ? resumedOn : startDate;
  if (!anchor) return 1;
  const elapsed = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / 86_400_000;
  if (!Number.isFinite(elapsed)) return 1;
  const days = Math.max(0, elapsed + (resumedOn && frozenDays !== null ? frozenDays : 0));
  return Math.max(1, Math.min(totalWeeks, Math.floor(days / 7) + 1));
}
