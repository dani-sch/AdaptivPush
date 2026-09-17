import { classifySupabaseError, supabaseUserMessage, type SupabaseFailure } from '../../utils/supabaseResilience';

export type RemovalCapability =
  | { status: 'available'; message: null }
  | { status: 'checking' | 'unsupported' | 'failed'; message: string; failure?: SupabaseFailure };
export const checkingRemovals: RemovalCapability = { status: 'checking', message: 'Checking workout removal support…' };
export async function checkRemovalCapability(read: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<RemovalCapability> {
  try {
    const { data, error } = await read();
    if (error) throw error;
    if (data === 1) return { status: 'available', message: null };
  } catch (error) {
    if (classifySupabaseError(error).category !== 'schema_unavailable') {
      return { status: 'failed', failure: classifySupabaseError(error), message: `Removal support could not be checked. ${supabaseUserMessage(error)} Retry the check when connected.` };
    }
  }
  return { status: 'unsupported', message: 'Set and exercise removal need a server update. The connected server has not enabled durable removals yet.' };
}
