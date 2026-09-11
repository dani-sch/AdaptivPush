interface PersistedAuthSession {
  access_token?: unknown;
  refresh_token?: unknown;
  user?: {
    id?: unknown;
  } | null;
}

export function persistedSessionOwnerId(serialized: string | null): string | null {
  if (!serialized) return null;
  try {
    const session = JSON.parse(serialized) as PersistedAuthSession;
    if (typeof session.access_token !== 'string' || !session.access_token) return null;
    if (typeof session.refresh_token !== 'string' || !session.refresh_token) return null;
    return typeof session.user?.id === 'string' && session.user.id
      ? session.user.id
      : null;
  } catch {
    return null;
  }
}
