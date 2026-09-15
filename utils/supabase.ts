
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

import { persistedSessionOwnerId } from '@/features/auth/persistedSession'
import { resilientSupabaseFetch } from '@/utils/supabaseResilience'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAuthStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
const supabaseAuthStorage = typeof window === 'undefined'
  ? {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    }
  : AsyncStorage

export const supabase = createClient(
  supabaseUrl,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    global: {
      fetch: resilientSupabaseFetch,
    },
    auth: {
      storage: supabaseAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

export async function getPersistedSessionOwnerId(): Promise<string | null> {
  return persistedSessionOwnerId(await AsyncStorage.getItem(supabaseAuthStorageKey))
}
