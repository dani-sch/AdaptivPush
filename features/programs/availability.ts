import type { SupabaseFailureCategory } from '@/utils/supabaseResilience';

export interface ProgramAvailabilityState<T> {
  program: T | null;
  unavailable: boolean;
  failureCategory: SupabaseFailureCategory | null;
}

export function programStateAfterSuccess<T>(program: T | null): ProgramAvailabilityState<T> {
  return { program, unavailable: false, failureCategory: null };
}

export function programStateAfterFailure<T>(
  previousProgram: T | null,
  failureCategory: SupabaseFailureCategory,
): ProgramAvailabilityState<T> {
  return {
    program: previousProgram,
    unavailable: true,
    failureCategory,
  };
}

export function canApplyOwnerScopedResult(
  requestOwnerId: string,
  currentOwnerId: string | null,
  aborted: boolean,
): boolean {
  return !aborted && requestOwnerId === currentOwnerId;
}
