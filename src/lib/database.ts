import { supabase } from './supabase';

export { supabase };

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
