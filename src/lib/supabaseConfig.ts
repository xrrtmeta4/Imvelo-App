import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ufoketygwxdlusngppef.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk';

function resolveEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const fromImportMeta = (import.meta as any).env?.[key];
  if (fromImportMeta) return fromImportMeta as string;
  const fromProcess = (process?.env as any)?.[key];
  if (fromProcess) return fromProcess as string;
  return '';
}

export const SUPABASE_URL = resolveEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
export const SUPABASE_KEY = resolveEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || FALLBACK_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Authentication will fail.',
  );
}

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // "Failed to fetch"
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return false;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeSignals(timeoutMs: number, original?: AbortSignal): AbortSignal {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const signals = [timeout.signal];
  if (original) signals.push(original);

  // AbortSignal.any is available in modern browsers/Node 20+. Fall back gracefully.
  const combined: AbortSignal =
    typeof (AbortSignal as any)?.any === 'function'
      ? (AbortSignal as any).any(signals)
      : timeout.signal;

  combined.addEventListener('abort', () => {
    clearTimeout(timer);
    if (original && !original.aborted) original.dispatchEvent(new Event('abort'));
  });
  return combined;
}

/**
 * Fetch wrapper that:
 *  - enforces a request timeout (Supabase has no default),
 *  - retries transient network failures ("Failed to fetch"), which are the
 *    usual cause of logins failing on flaky mobile / public connections.
 */
function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const run = async (attempt: number): Promise<Response> => {
    const signal = mergeSignals(REQUEST_TIMEOUT_MS, init?.signal);
    try {
      return await fetch(input as any, { ...init, signal } as RequestInit);
    } catch (err) {
      const transient = isNetworkError(err);
      if (transient && attempt < MAX_RETRIES) {
        console.warn(`[supabase] network error (attempt ${attempt}), retrying...`, err);
        await sleep(attempt * 500);
        return run(attempt + 1);
      }
      throw err;
    }
  };
  return run(1);
}

/**
 * Storage that works everywhere: prefers localStorage (browser / Capacitor
 * webview) and falls back to an in-memory store so the SDK never throws when
 * storage is unavailable (private mode, SSR, some webviews).
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

export function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
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
