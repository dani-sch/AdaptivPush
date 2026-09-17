import { classifySupabaseError, supabaseUserMessage } from '../../utils/supabaseResilience';

export interface LocalSession { user: { id: string }; expires_at?: number }
export interface AuthRecoveryState {
  phase: 'hydrating' | 'ready' | 'recovering' | 'signed_out';
  ownerId: string | null;
  expiresAt: number | null;
  issue: string | null;
}
export const initialAuthState: AuthRecoveryState = { phase: 'hydrating', ownerId: null, expiresAt: null, issue: null };

/** Stored ownership permits local recovery only. It never authorizes a request. */
export function createSessionRecovery(deps: {
  getSession: () => Promise<{ data: { session: LocalSession | null }; error: unknown }>;
  persistedOwner: () => Promise<string | null>;
  changed: (state: AuthRecoveryState) => void;
  now?: () => number;
}) {
  let state = initialAuthState;
  let generation = 0;
  const now = deps.now ?? Date.now;
  const publish = (next: AuthRecoveryState) => { state = next; deps.changed(next); };
  const accept = (session: LocalSession) => {
    const valid = typeof session.expires_at === 'number' && session.expires_at * 1000 > now();
    publish({ ownerId: session.user.id, expiresAt: session.expires_at ?? null,
      phase: valid ? 'ready' : 'recovering', issue: valid ? null : 'Reconnect to verify your session. Your workout drafts are still on this device.' });
  };
  return {
    snapshot: () => state,
    async retry() {
      const request = ++generation;
      // Stop protected actions while credentials are being recovered/refreshed.
      publish({ ...state, phase: state.phase === 'hydrating' ? 'hydrating' : 'recovering' });
      try {
        const persisted = await deps.persistedOwner();
        if (request !== generation) return;
        if (!state.ownerId && persisted) publish({ ...state, ownerId: persisted });
        const { data, error } = await deps.getSession();
        if (request !== generation) return;
        if (error) throw error;
        if (data.session) accept(data.session);
        else publish({ phase: 'signed_out', ownerId: null, expiresAt: null, issue: null });
      } catch (error) {
        if (request !== generation) return;
        if (classifySupabaseError(error).category === 'authentication_required') {
          publish({ phase: 'signed_out', ownerId: null, expiresAt: null, issue: 'Sign in again to restore your workout drafts.' });
        } else {
          publish({ ...state, phase: 'recovering', issue: supabaseUserMessage(error) });
        }
      }
    },
    event(event: string, session: LocalSession | null) {
      // auth-js emits INITIAL_SESSION(null) when hydration/refresh fails. Only
      // SIGNED_OUT is definitive; getSession's error-bearing result owns recovery.
      if (event === 'SIGNED_OUT') {
        generation++;
        publish({ phase: 'signed_out', ownerId: null, expiresAt: null, issue: null });
      } else if (session) {
        generation++;
        accept(session);
      }
    },
    dispose() { generation++; },
  };
}
