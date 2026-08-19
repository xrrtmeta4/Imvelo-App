import { createSupabaseClient, SUPABASE_URL, SUPABASE_KEY } from './supabaseConfig';

export const supabase = createSupabaseClient();
export { SUPABASE_URL, SUPABASE_KEY };
