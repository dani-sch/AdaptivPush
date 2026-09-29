export function restTimeRemaining(endAt: string, now: number): number {
  const deadline = Date.parse(endAt);
  if (!Number.isFinite(deadline)) throw new Error('Rest timer deadline is invalid.');
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function extendRestSeconds(remaining: number, extension: number): number {
  if (!Number.isInteger(remaining) || remaining < 0
    || !Number.isInteger(extension) || extension <= 0) {
    throw new Error('Rest timer extension must be positive.');
  }
  return remaining + extension;
}
