import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Known-good project (see supabase/config.toml -> project_id).
// Used as the default and as a safe fallback when a deployment-supplied
// VITE_SUPABASE_URL points to an unreachable project (the usual cause of
// "Failed to fetch" on login after deploy).
const FALLBACK_URL_CONST = 'https://ufoketygwxdlusngppef.supabase.co';
const FALLBACK_KEY_CONST =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk';

function resolveEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const fromImportMeta = (import.meta as any).env?.[key];
  if (fromImportMeta) return fromImportMeta as string;
  const fromProcess = (process?.env as any)?.[key];
  if (fromProcess) return fromProcess as string;
  return '';
}

export const FALLBACK_URL = FALLBACK_URL_CONST;
export const FALLBACK_KEY = FALLBACK_KEY_CONST;
export const SUPABASE_URL = resolveEnv('VITE_SUPABASE_URL') || FALLBACK_URL_CONST;
export const SUPABASE_KEY = resolveEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || FALLBACK_KEY_CONST;

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // "Failed to fetch"
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const message = String((error as any)?.message || '').toLowerCase();
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
 * Fetch wrapper that enforces a request timeout (Supabase has none by default)
 * and retries transient network failures ("Failed to fetch"), which are the
 * usual cause of logins failing on flaky mobile / public connections.
 */
function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const run = async (attempt: number): Promise<Response> => {
    const signal = mergeSignals(REQUEST_TIMEOUT_MS, init?.signal);
    try {
      return await fetch(input as any, { ...init, signal } as RequestInit);
    } catch (err) {
      if (isNetworkError(err) && attempt < MAX_RETRIES) {
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

export interface SupabaseConfig {
  url: string;
  key: string;
}

async function isReachable(url: string, timeoutMs = 6000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`${url}/auth/v1/health`, { signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Decide which project to use.
 *
 * Starts from the known-good FALLBACK project. If a deployment supplies a
 * different VITE_SUPABASE_URL, we only switch to it when it is actually
 * reachable — otherwise we keep the known-good project so login doesn't fail
 * with a raw "Failed to fetch". This makes a misconfigured deploy self-heal.
 */
export async function resolveConfig(): Promise<SupabaseConfig> {
  const envUrl = resolveEnv('VITE_SUPABASE_URL');
  const envKey = resolveEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (envUrl && envUrl !== FALLBACK_URL) {
    const ok = await isReachable(envUrl);
    if (ok) {
      console.info(`[supabase] using deployment project ${envUrl}`);
      return { url: envUrl, key: envKey || FALLBACK_KEY };
    }
    const fbOk = await isReachable(FALLBACK_URL);
    console.warn(
      `[supabase] VITE_SUPABASE_URL (${envUrl}) is unreachable; ` +
        `falling back to ${FALLBACK_URL}${fbOk ? '' : ' (also unreachable — check network)'}`,
    );
    return { url: FALLBACK_URL, key: FALLBACK_KEY };
  }

  return { url: envUrl || FALLBACK_URL, key: envKey || FALLBACK_KEY };
}

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
