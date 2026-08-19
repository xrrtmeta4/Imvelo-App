import { createSupabaseClient, resolveConfig, FALLBACK_URL, FALLBACK_KEY, SUPABASE_URL, SUPABASE_KEY } from './supabaseConfig';

// Start on the known-good project immediately; resolveConfig() swaps to a
// deployment-supplied project only once we've confirmed it is reachable.
export let supabase = createSupabaseClient(FALLBACK_URL, FALLBACK_KEY);
export { SUPABASE_URL, SUPABASE_KEY };

resolveConfig().then((cfg) => {
  if (cfg.url !== FALLBACK_URL || cfg.key !== FALLBACK_KEY) {
    supabase.auth.stopAutoRefresh();
    supabase = createSupabaseClient(cfg.url, cfg.key);
  }
  console.info(`[supabase] active project: ${cfg.url}`);
});
