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

/**
 * Resolve the URL + key as an inseparable PAIR from the same project.
 * A partial override (URL without key, or key without URL) points at a
 * mismatched project and causes "invalid api key" on login, so we only honour
 * the deployment values when BOTH are present.
 */
function resolvePairedConfig(): SupabaseConfig {
  const envUrl = resolveEnv('VITE_SUPABASE_URL');
  const envKey = resolveEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  if (envUrl || envKey) {
    console.warn(
      '[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must both be set ' +
        '(same project). Only one was found; using the default project to avoid an "invalid api key" error.',
    );
  }
  return { url: FALLBACK_URL_CONST, key: FALLBACK_KEY_CONST };
}

export const SUPABASE_URL = resolvePairedConfig().url;
export const SUPABASE_KEY = resolvePairedConfig().key;

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
 * Verify that `key` is a valid API key for the given Supabase `url`.
 * A valid key returns 200 on /auth/v1/health; a mismatched/stale/invalid key
 * returns 401 {"message":"Invalid API key"}. This catches the "invalid api key"
 * login error caused by pairing a URL with a key from a different project.
 */
async function isKeyValid(url: string, key: string, timeoutMs = 6000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      signal: ctrl.signal,
      headers: { apikey: key },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Decide which (url, key) PROJECT PAIR to use.
 *
 * Always keeps URL + key from the same project (a mismatch causes
 * "invalid api key" on login). If a deployment-supplied project is set but
 * unreachable, we fall back to the known-good default (as a pair).
 */
export async function resolveConfig(): Promise<SupabaseConfig> {
  const cfg = resolvePairedConfig();

  // If a non-default project is configured, only keep it if the key is valid
  // for that project (this also implies reachability — an unreachable URL
  // makes isKeyValid reject). A mismatched/stale key would otherwise cause
  // "invalid api key" on login, so we fall back to the known-good project.
  if (cfg.url !== FALLBACK_URL_CONST) {
    const keyValid = await isKeyValid(cfg.url, cfg.key);
    if (keyValid) {
      console.info(`[supabase] using deployment project ${cfg.url}`);
      return cfg;
    }
    console.warn(
      `[supabase] ${cfg.url} has no valid API key for this project (or is unreachable); ` +
        `falling back to ${FALLBACK_URL_CONST}. Verify VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY match.`,
    );
    return { url: FALLBACK_URL_CONST, key: FALLBACK_KEY_CONST };
  }

  return cfg;
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
