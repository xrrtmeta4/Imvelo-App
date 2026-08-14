import { createClient } from '@supabase/supabase-js';
import { checkSupabaseHealth } from '@/lib/database';

const FALLBACK_URL = 'https://ufoketygwxdlusngppef.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function getActiveClient() {
  const healthy = await checkSupabaseHealth();
  if (!healthy) {
    const { getDb } = await import('@/lib/database');
    const db = await getDb();
    if (db && typeof db === 'object' && 'query' in db) {
      return { isPostgres: true as const, db: db as any };
    }
  }
  return { isPostgres: false as const, db: supabase };
}
