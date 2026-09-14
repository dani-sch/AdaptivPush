export type SupabaseFailureCategory =
  | 'feature_disabled'
  | 'conflict'
  | 'validation'
  | 'retryable_service_unavailable'
  | 'timeout'
  | 'offline'
  | 'project_unavailable'
  | 'authentication_required'
  | 'forbidden'
  | 'schema_unavailable'
  | 'cancelled'
  | 'unknown';

export interface SupabaseFailure {
  category: SupabaseFailureCategory;
  retryable: boolean;
  status?: number;
  code?: string;
}

/** Carries a sanitized domain outcome through callers that use exceptions. */
export class OperationFailureError extends Error {
  readonly name = 'OperationFailureError';
  constructor(readonly failure: SupabaseFailure, message: string) {
    super(message);
  }
}

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
};

export const SUPABASE_TIMEOUTS = {
  readMs: 12_000,
  authMs: 15_000,
  writeMs: 18_000,
  storageMs: 30_000,
} as const;

export const SUPABASE_READ_RETRY_POLICY = {
  maxAttempts: 2,
  baseDelayMs: 350,
  maxJitterMs: 250,
} as const;

const SERVICE_UNAVAILABLE_MESSAGE =
  "AdaptivPush's data service is temporarily unavailable. Your data is safe. Try again shortly.";

export class SupabaseRequestTimeoutError extends Error {
  readonly code = 'SUPABASE_REQUEST_TIMEOUT';

  constructor(readonly timeoutMs: number) {
    super(`Supabase request exceeded its ${timeoutMs}ms deadline`);
    this.name = 'SupabaseRequestTimeoutError';
  }
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

function numericStatus(error: ErrorLike): number | undefined {
  const candidate = error.status ?? error.statusCode;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === 'string' && /^\d{3}$/.test(candidate)) return Number(candidate);
  return undefined;
}

function safeCode(error: ErrorLike): string | undefined {
  return typeof error.code === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(error.code)
    ? error.code
    : undefined;
}

export function classifySupabaseError(error: unknown): SupabaseFailure {
  if (error instanceof OperationFailureError) return error.failure;
  const source = asErrorLike(error);
  const status = numericStatus(source);
  const code = safeCode(source);
  const name = typeof source.name === 'string' ? source.name.toLowerCase() : '';
  const message = typeof source.message === 'string' ? source.message.toLowerCase() : '';
  const combined = `${name} ${code?.toLowerCase() ?? ''} ${message}`;

  if (code === 'ROLLOUT_DISABLED') return { category: 'feature_disabled', retryable: false, code };
  if (code === 'AP_AUTHENTICATION_REQUIRED') return { category: 'authentication_required', retryable: false, code };
  if (combined.includes('stale_revision') || combined.includes('idempotency_conflict') || combined.includes('operation_payload_mismatch') || combined.includes('target_unavailable')) {
    return { category: 'conflict', retryable: false, status, code };
  }
  if (code === '22023' || code === '23514' || code === 'AP_VALIDATION' || combined.includes('invalid_input')) {
    return { category: 'validation', retryable: false, status, code };
  }

  if (
    code === 'SUPABASE_REQUEST_CANCELLED' ||
    (name === 'aborterror' && !combined.includes('timeout')) ||
    combined.includes('request cancelled') ||
    combined.includes('request canceled')
  ) {
    return { category: 'cancelled', retryable: false, status, code };
  }

  if (
    code === 'SUPABASE_REQUEST_TIMEOUT'
  ) {
    return { category: 'timeout', retryable: true, status, code };
  }

  if (
    combined.includes('project paused') ||
    combined.includes('project is paused') ||
    combined.includes('project is not active') ||
    combined.includes('project has been paused') ||
    combined.includes('project is restricted')
  ) {
    return { category: 'project_unavailable', retryable: false, status, code };
  }

  if (
    combined.includes('failed to get project config') ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return { category: 'retryable_service_unavailable', retryable: true, status, code };
  }

  if (
    name.includes('timeout') ||
    combined.includes('timed out') ||
    combined.includes('timeout') ||
    combined.includes('deadline exceeded')
  ) {
    return { category: 'timeout', retryable: true, status, code };
  }

  if (
    status === 401 ||
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'invalid_jwt' ||
    combined.includes('jwt expired') ||
    combined.includes('session missing') ||
    combined.includes('not signed in') || combined.includes('unauthenticated')
  ) {
    return { category: 'authentication_required', retryable: false, status, code };
  }

  if (
    status === 403 ||
    code === '42501' ||
    combined.includes('row-level security') ||
    combined.includes('row level security') ||
    combined.includes('permission denied') ||
    combined.includes('not authorized') || message === 'forbidden'
  ) {
    return { category: 'forbidden', retryable: false, status, code };
  }

  if (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    code === '42703' ||
    combined.includes('schema cache') || combined.includes('unsupported_schema') ||
    combined.includes('could not find the table') ||
    combined.includes('could not find the column') ||
    combined.includes('does not exist')
  ) {
    return { category: 'schema_unavailable', retryable: false, status, code };
  }

  if (
    combined.includes('network request failed') ||
    combined.includes('network unavailable') ||
    combined.includes('failed to fetch') ||
    combined.includes('network is offline') ||
    combined.includes('internet connection') ||
    combined.includes('enotfound') ||
    combined.includes('eai_again') ||
    combined.includes('dns')
  ) {
    return { category: 'offline', retryable: true, status, code };
  }

  if (status !== undefined && status >= 500) {
    return { category: 'retryable_service_unavailable', retryable: true, status, code };
  }

  return { category: 'unknown', retryable: false, status, code };
}

export function supabaseUserMessage(
  errorOrFailure: unknown | SupabaseFailure,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (errorOrFailure instanceof OperationFailureError) return errorOrFailure.message;
  const failure =
    typeof errorOrFailure === 'object' &&
    errorOrFailure !== null &&
    'category' in errorOrFailure
      ? (errorOrFailure as SupabaseFailure)
      : classifySupabaseError(errorOrFailure);

  switch (failure.category) {
    case 'feature_disabled':
      return 'Saving changes is not enabled in this build. Use an updated build when this feature is released. Your changes are still here.';
    case 'conflict':
      return 'Your program changed. Return to Plan and refresh before submitting again. Your unsaved changes are still here.';
    case 'validation':
      return 'Check the program or workout inputs before saving. Your unsaved changes are still here.';
    case 'retryable_service_unavailable':
    case 'project_unavailable':
      return SERVICE_UNAVAILABLE_MESSAGE;
    case 'timeout':
      return "AdaptivPush's data service took too long to respond. Your data is safe. Try again.";
    case 'offline':
      return 'You appear to be offline. Check your connection and try again.';
    case 'authentication_required':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return "You don't have permission to make this change.";
    case 'schema_unavailable':
      return 'This service needs an update before programs and workouts can be saved. Your changes are still here. Try again after the service update.';
    case 'cancelled':
      return 'The request was cancelled. Your changes are still here.';
    default:
      return fallback;
  }
}

export function loginErrorMessage(error: unknown): string {
  const source = asErrorLike(error);
  const code = safeCode(source)?.toLowerCase();
  const message = typeof source.message === 'string' ? source.message.toLowerCase() : '';

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'The email or password is incorrect.';
  }

  return supabaseUserMessage(error, 'Unable to sign in right now. Please try again.');
}

export function supabaseSaveFailureMessage(error: unknown, completedSteps = 0): string {
  const base = supabaseUserMessage(error, 'Unable to save your changes. Please try again.');
  return completedSteps > 0
    ? `${base} Some settings may already have saved; retry to reconcile them.`
    : `${base} Your unsaved changes are still here.`;
}

export interface SupabaseDiagnostic {
  operation: string;
  category: SupabaseFailureCategory;
  retryable: boolean;
  status?: number;
  code?: string;
  occurredAt: string;
}

export function sanitizedSupabaseDiagnostic(
  operation: string,
  error: unknown,
  now = new Date(),
): SupabaseDiagnostic {
  const failure = classifySupabaseError(error);
  return {
    operation,
    ...failure,
    occurredAt: now.toISOString(),
  };
}

export function reportSupabaseFailure(operation: string, error: unknown): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const diagnostic = sanitizedSupabaseDiagnostic(operation, error);
  if (
    diagnostic.category !== 'unknown' ||
    diagnostic.code?.toLowerCase() === 'invalid_credentials'
  ) {
    console.warn('[Supabase availability]', diagnostic);
    return;
  }
  console.error('[Supabase failure]', diagnostic);
}

type ResultWithError = { error?: unknown | null };

export interface SupabaseOperationOptions {
  kind: 'read' | 'auth' | 'write' | 'storage';
  operation: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  random?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

function defaultTimeout(kind: SupabaseOperationOptions['kind']): number {
  switch (kind) {
    case 'read':
      return SUPABASE_TIMEOUTS.readMs;
    case 'auth':
      return SUPABASE_TIMEOUTS.authMs;
    case 'storage':
      return SUPABASE_TIMEOUTS.storageMs;
    default:
      return SUPABASE_TIMEOUTS.writeMs;
  }
}

function abortError(): Error {
  const error = new Error('Supabase request cancelled') as Error & { code: string };
  error.name = 'AbortError';
  error.code = 'SUPABASE_REQUEST_CANCELLED';
  return error;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

async function oneAttempt<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  if (externalSignal?.aborted) throw abortError();

  const controller = new AbortController();
  let timedOut = false;
  let rejectCancellation: ((error: Error) => void) | undefined;
  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
  });
  const forwardAbort = () => {
    controller.abort();
    rejectCancellation?.(abortError());
  };
  externalSignal?.addEventListener('abort', forwardAbort, { once: true });
  let rejectDeadline: ((error: Error) => void) | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectDeadline?.(new SupabaseRequestTimeoutError(timeoutMs));
  }, timeoutMs);

  try {
    return await Promise.race([
      Promise.resolve(operation(controller.signal)),
      deadline,
      cancellation,
    ]);
  } catch (error) {
    if (timedOut) throw new SupabaseRequestTimeoutError(timeoutMs);
    if (externalSignal?.aborted) throw abortError();
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
  }
}

export async function runSupabaseOperation<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  options: SupabaseOperationOptions,
): Promise<T> {
  const canRetry = options.kind === 'read';
  const maxAttempts = canRetry
    ? Math.max(1, options.maxAttempts ?? SUPABASE_READ_RETRY_POLICY.maxAttempts)
    : 1;
  const timeoutMs = options.timeoutMs ?? defaultTimeout(options.kind);
  const baseDelayMs = options.baseDelayMs ?? SUPABASE_READ_RETRY_POLICY.baseDelayMs;
  const maxJitterMs = options.maxJitterMs ?? SUPABASE_READ_RETRY_POLICY.maxJitterMs;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await oneAttempt(operation, timeoutMs, options.signal);
      const resultError = (result as ResultWithError).error;
      if (!resultError || !classifySupabaseError(resultError).retryable || attempt === maxAttempts) {
        return result;
      }
      reportSupabaseFailure(`${options.operation}:attempt-${attempt}`, resultError);
    } catch (error) {
      const failure = classifySupabaseError(error);
      if (!canRetry || !failure.retryable || attempt === maxAttempts) throw error;
      reportSupabaseFailure(`${options.operation}:attempt-${attempt}`, error);
    }

    const jitter = Math.floor(random() * (maxJitterMs + 1));
    await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter, options.signal);
  }

  throw new Error('Supabase operation exhausted without a result');
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function fetchTimeout(input: RequestInfo | URL, init?: RequestInit): number {
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  if (url.includes('/storage/v1/')) return SUPABASE_TIMEOUTS.storageMs;
  if (url.includes('/auth/v1/')) return SUPABASE_TIMEOUTS.authMs;
  if (method === 'GET' || method === 'HEAD') return SUPABASE_TIMEOUTS.readMs;
  return SUPABASE_TIMEOUTS.writeMs;
}

export async function resilientSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const timeoutMs = fetchTimeout(input, init);
  const controller = new AbortController();
  let timedOut = false;
  const inputSignal =
    typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined;
  const externalSignal = init?.signal ?? inputSignal;
  const forwardAbort = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new SupabaseRequestTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
  }
}
