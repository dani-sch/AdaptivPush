export interface InactivityNudge {
  ownerId: string;
  draftId: string;
  lastActivityAt: string;
  deadlineAt: string;
  notified: boolean;
}

export const INACTIVITY_INTERVAL_MS = 5 * 60 * 1000;

export function updateInactivityNudge(
  previous: InactivityNudge | null,
  ownerId: string,
  draftId: string,
  lastActivityAt: string,
): InactivityNudge {
  const time = Date.parse(lastActivityAt);
  if (!Number.isFinite(time) || !ownerId || !draftId) {
    throw new Error('An owned workout draft and valid activity time are required.');
  }
  if (previous && (previous.ownerId !== ownerId || previous.draftId !== draftId)) {
    throw new Error('Inactivity state belongs to another workout draft.');
  }
  if (previous?.notified || (previous && Date.parse(previous.lastActivityAt) >= time)) {
    return previous;
  }
  return {
    ownerId, draftId, lastActivityAt,
    deadlineAt: new Date(time + INACTIVITY_INTERVAL_MS).toISOString(),
    notified: false,
  };
}
