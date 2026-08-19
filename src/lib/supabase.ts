import { createSupabaseClient, SUPABASE_URL, SUPABASE_KEY } from './supabaseConfig';

// URL + key are a fixed, matched pair (see supabaseConfig.ts). No swapping.
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
export { SUPABASE_URL, SUPABASE_KEY };

console.info(`[supabase] active project: ${SUPABASE_URL}`);
