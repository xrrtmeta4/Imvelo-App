import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Single, known-good project (see supabase/config.toml -> project_id).
// URL and key are kept as an immutable, matched pair on purpose: reading them
// from separate env vars is the #1 cause of "invalid api key" on login,
// because a deployment can set VITE_SUPABASE_URL without a matching key (or
// vice-versa), producing a mismatched pair.
export const SUPABASE_URL = 'https://ufoketygwxdlusngppef.supabase.co';
export const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk';
export const FALLBACK_URL = SUPABASE_URL;
export const FALLBACK_KEY = SUPABASE_KEY;

// One-time diagnostic: confirm the configured project/key actually work.
if (typeof window !== 'undefined') {
  fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_KEY } })
    .then((r) =>
      console.info(`[supabase] config OK at ${SUPABASE_URL} (HTTP ${r.status})`),
    )
    .catch((e: unknown) =>
      console.error(`[supabase] config UNREACHABLE at ${SUPABASE_URL}:`, e),
    );
}

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // "Failed to fetch"
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('timeout')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeSignals(timeoutMs: number, original?: AbortSignal): AbortSignal {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const signals = [timeout.signal];
  if (original) signals.push(original);

  const combined: AbortSignal =
    typeof (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal })?.any === 'function'
      ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any(signals)
      : timeout.signal;

  combined.addEventListener('abort', () => {
    clearTimeout(timer);
    if (original && !original.aborted) original.dispatchEvent(new Event('abort'));
  });
  return combined;
}

/**
 * Fetch wrapper that enforces a request timeout (Supabase has none) and
 * retries transient network failures ("Failed to fetch") on flaky connections.
 */
function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const run = async (attempt: number): Promise<Response> => {
    const signal = mergeSignals(REQUEST_TIMEOUT_MS, init?.signal);
    try {
      return await fetch(input, { ...init, signal });
    } catch (err) {
      if (isNetworkError(err) && attempt < MAX_RETRIES) {
        console.warn(`[supabase] network error (attempt ${attempt}), retrying...`, err as unknown);
        await sleep(attempt * 500);
        return run(attempt + 1);
      }
      throw err;
    }
  };
  return run(1);
}

/**
 * Storage that works everywhere: prefers localStorage and falls back to an
 * in-memory store so the SDK never throws when storage is unavailable.
 */
const safeStorage = (() => {
  const memory = new Map<string, string>();
  let backend: Storage | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__sb_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      backend = localStorage;
    }
  } catch {
    backend = null;
  }
  if (backend) return backend;
  return {
    getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  } as Storage;
})();

export interface SupabaseConfig {
  url: string;
  key: string;
}

export const SUPABASE_CONFIG: SupabaseConfig = { url: SUPABASE_URL, key: SUPABASE_KEY };

export function createSupabaseClient(url: string = SUPABASE_URL, key: string = SUPABASE_KEY): SupabaseClient {
  return createClient(url, key, {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      fetch: resilientFetch,
    },
  });
}
