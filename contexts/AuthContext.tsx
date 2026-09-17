import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { createSessionRecovery, initialAuthState, type AuthRecoveryState } from '@/features/auth/sessionRecovery';
import { getPersistedSessionOwnerId, supabase } from '@/utils/supabase';
import { runSupabaseOperation } from '@/utils/supabaseResilience';

const AuthContext = createContext<AuthRecoveryState & { retry: () => void; canRequest: boolean }>({
  ...initialAuthState, retry: () => undefined, canRequest: false,
});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initialAuthState);
  const recovery = useRef<ReturnType<typeof createSessionRecovery> | null>(null);
  const retry = useCallback(() => { void recovery.current?.retry(); }, []);
  useEffect(() => {
    const controller = createSessionRecovery({
      persistedOwner: getPersistedSessionOwnerId,
      getSession: () => runSupabaseOperation(() => supabase.auth.getSession(), { kind: 'auth', operation: 'auth.hydrate' }),
      changed: setState,
    });
    recovery.current = controller;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => controller.event(event, session));
    const foreground = (status: string) => {
      if (Platform.OS !== 'web') {
        if (status === 'active') void supabase.auth.startAutoRefresh();
        else void supabase.auth.stopAutoRefresh();
      }
      if (status === 'active') void controller.retry();
    };
    foreground(AppState.currentState ?? 'active');
    const listener = AppState.addEventListener('change', foreground);
    return () => {
      controller.dispose(); recovery.current = null; subscription.unsubscribe(); listener.remove();
      if (Platform.OS !== 'web') void supabase.auth.stopAutoRefresh();
    };
  }, []);
  useEffect(() => {
    if (state.phase !== 'ready' || !state.expiresAt) return;
    const timer = setTimeout(retry, Math.max(0, state.expiresAt * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [state.phase, state.expiresAt, retry]);
  return <AuthContext.Provider value={{ ...state, retry, canRequest: state.phase === 'ready' && Boolean(state.expiresAt && state.expiresAt * 1000 > Date.now()) }}>{children}</AuthContext.Provider>;
}
